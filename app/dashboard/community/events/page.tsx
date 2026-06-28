"use client";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { useApiFetch } from "@/app/hooks/useApiFetch";
import { useAuth } from "@/app/context/AuthContext";
import { useRequireAuth } from "@/app/hooks/useRequireAuth";
import { ApiError } from "@/app/lib/api";

const inputCls =
	"w-full rounded-lg border border-[var(--line)] bg-white px-4 py-2.5 text-sm text-[var(--ink)] " +
	"placeholder:text-[var(--ink-soft)] focus:outline-none focus:ring-1 focus:ring-[var(--navy)]";
const labelCls = "block text-xs font-semibold text-[var(--navy)] mb-1 uppercase tracking-wide";
const selectCls = inputCls + " cursor-pointer";

const TIMEZONES = [
	{ label: "Eastern (ET)",  value: "America/New_York"    },
	{ label: "Central (CT)",  value: "America/Chicago"     },
	{ label: "Mountain (MT)", value: "America/Denver"      },
	{ label: "Pacific (PT)",  value: "America/Los_Angeles" },
	{ label: "UTC",           value: "UTC"                 },
];

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

interface Event {
	id: number;
	title: string;
	event_date: string;
	event_time: string | null;
	event_timezone: string | null;
	location: string | null;
	description: string | null;
	image_url: string | null;
	current_capacity: number | null;
}

const emptyForm = {
	title: "",
	event_date: "",
	event_time: "",
	event_timezone: "America/New_York",
	location: "",
	description: "",
	image_url: "",
	current_capacity: "",
};

function formatDate(d: string) {
	return new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatTime(t: string | null, tz: string | null) {
	if (!t) return "";
	const [h, m] = t.split(":");
	const hour = parseInt(h);
	const suffix = hour >= 12 ? "PM" : "AM";
	const display = `${hour % 12 || 12}:${m} ${suffix}`;
	const tzLabel = TIMEZONES.find(z => z.value === tz)?.label.match(/\((\w+)\)/)?.[1] ?? tz ?? "";
	return tzLabel ? `${display} ${tzLabel}` : display;
}

export default function EventsPage() {
	const { isAuthorized } = useRequireAuth("admin");
	const apiFetch = useApiFetch();
	const { accessToken } = useAuth();
	const apiFetchRef = useRef(apiFetch);
	apiFetchRef.current = apiFetch;
	const tokenRef = useRef(accessToken);
	tokenRef.current = accessToken;

	const [events, setEvents] = useState<Event[]>([]);
	const [loading, setLoading] = useState(true);
	const [showForm, setShowForm] = useState(false);
	const [editing, setEditing] = useState<Event | null>(null);
	const [form, setForm] = useState(emptyForm);
	const [saving, setSaving] = useState(false);
	const [uploadingImage, setUploadingImage] = useState(false);
	const [imagePreview, setImagePreview] = useState<string>("");
	const [error, setError] = useState("");
	const [deleteId, setDeleteId] = useState<number | null>(null);
	const [expandedRsvps, setExpandedRsvps] = useState<number | null>(null);
	const [rsvpCache, setRsvpCache] = useState<Record<number, { name: string; email: string; created_at: string }[]>>({});
	const [rsvpLoading, setRsvpLoading] = useState(false);

	const loadEvents = useCallback(async () => {
		setLoading(true);
		try {
			const data = await apiFetchRef.current<Event[]>("/community/events");
			const all = data ?? [];
			const today = new Date().toISOString().slice(0, 10);
			const upcoming = all.filter(e => e.event_date >= today).sort((a, b) => a.event_date.localeCompare(b.event_date));
			const past     = all.filter(e => e.event_date <  today).sort((a, b) => b.event_date.localeCompare(a.event_date));
			setEvents([...upcoming, ...past]);
		} catch {
			setEvents([]);
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => { loadEvents(); }, [loadEvents]);

	async function toggleRsvps(eventId: number) {
		if (expandedRsvps === eventId) { setExpandedRsvps(null); return; }
		setExpandedRsvps(eventId);
		if (rsvpCache[eventId]) return;
		setRsvpLoading(true);
		try {
			const data = await apiFetchRef.current<{ name: string; email: string; created_at: string }[]>(
				`/admin/events/${eventId}/registrations`
			);
			setRsvpCache(c => ({ ...c, [eventId]: data ?? [] }));
		} finally {
			setRsvpLoading(false);
		}
	}

	function openCreate() {
		setEditing(null);
		setForm(emptyForm);
		setImagePreview("");
		setError("");
		setShowForm(true);
	}

	function openEdit(ev: Event) {
		setEditing(ev);
		setForm({
			title: ev.title,
			event_date: ev.event_date,
			event_time: ev.event_time ?? "",
			event_timezone: ev.event_timezone ?? "America/New_York",
			location: ev.location ?? "",
			description: ev.description ?? "",
			image_url: ev.image_url ?? "",
			current_capacity: ev.current_capacity?.toString() ?? "",
		});
		setImagePreview(ev.image_url ?? "");
		setError("");
		setShowForm(true);
	}

	async function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
		const file = e.target.files?.[0];
		if (!file) return;
		setUploadingImage(true);
		try {
			const fd = new FormData();
			fd.append("file", file);
			const res = await fetch(`${API}/admin/upload`, {
				method: "POST",
				headers: { Authorization: `Bearer ${tokenRef.current}` },
				body: fd,
			});
			if (!res.ok) throw new Error("Upload failed");
			const { url } = await res.json();
			setForm(f => ({ ...f, image_url: url }));
			setImagePreview(url);
		} catch {
			setError("Image upload failed.");
		} finally {
			setUploadingImage(false);
		}
	}

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		if (!form.title || !form.event_date) { setError("Title and date are required."); return; }
		setSaving(true);
		setError("");
		const body = {
			title: form.title,
			event_date: form.event_date,
			event_time: form.event_time || null,
			event_timezone: form.event_time ? form.event_timezone : null,
			location: form.location || null,
			description: form.description || null,
			image_url: form.image_url || null,
			current_capacity: form.current_capacity ? parseInt(form.current_capacity) : null,
		};
		try {
			if (editing) {
				await apiFetchRef.current(`/admin/events/${editing.id}`, { method: "PATCH", body: JSON.stringify(body) });
			} else {
				await apiFetchRef.current("/admin/events", { method: "POST", body: JSON.stringify(body) });
			}
			setShowForm(false);
			await loadEvents();
		} catch (err) {
			setError(err instanceof ApiError ? JSON.stringify(err.data) : "Save failed.");
		} finally {
			setSaving(false);
		}
	}

	async function handleDelete(id: number) {
		try {
			await apiFetchRef.current(`/admin/events/${id}`, { method: "DELETE" });
			setDeleteId(null);
			await loadEvents();
		} catch {
			setError("Delete failed.");
		}
	}

	if (!isAuthorized) return null;

	return (
		<div className="p-6 max-w-4xl mx-auto">
			<div className="flex items-center justify-between mb-6">
				<h1 className="text-2xl font-bold text-[var(--ink)]">Events</h1>
				<button
					onClick={openCreate}
					className="rounded-lg bg-[var(--navy)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
				>
					+ New Event
				</button>
			</div>

			{/* Form */}
			{showForm && (
				<div className="mb-8 rounded-xl border border-[var(--line)] bg-white p-6 shadow-sm">
					<h2 className="text-lg font-semibold text-[var(--ink)] mb-4">
						{editing ? "Edit Event" : "New Event"}
					</h2>
					<form onSubmit={handleSubmit} className="flex flex-col gap-4">
						{/* Title */}
						<div>
							<label className={labelCls}>Title *</label>
							<input className={inputCls} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Event title" />
						</div>

						{/* Date + Time row */}
						<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
							<div>
								<label className={labelCls}>Date *</label>
								<input type="date" className={inputCls} value={form.event_date} onChange={e => setForm(f => ({ ...f, event_date: e.target.value }))} />
							</div>
							<div>
								<label className={labelCls}>Time</label>
								<input type="time" className={inputCls} value={form.event_time} onChange={e => setForm(f => ({ ...f, event_time: e.target.value }))} />
							</div>
							<div>
								<label className={labelCls}>Timezone</label>
								<select className={selectCls} value={form.event_timezone} onChange={e => setForm(f => ({ ...f, event_timezone: e.target.value }))}>
									{TIMEZONES.map(z => <option key={z.value} value={z.value}>{z.label}</option>)}
								</select>
							</div>
						</div>

						{/* Location */}
						<div>
							<label className={labelCls}>Location</label>
							<input className={inputCls} value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="123 Main St, New York, NY" />
						</div>

						{/* Description */}
						<div>
							<label className={labelCls}>Description</label>
							<textarea rows={4} className={inputCls} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Event details..." />
						</div>

						{/* Image upload */}
						<div>
							<label className={labelCls}>Event Image</label>
							<input type="file" accept="image/*" onChange={handleImageChange} className="text-sm text-[var(--ink-soft)]" />
							{uploadingImage && <p className="text-xs text-[var(--ink-soft)] mt-1">Uploading…</p>}
							{imagePreview && (
								<div className="mt-2 relative w-full max-w-xs h-40 rounded-lg overflow-hidden border border-[var(--line)]">
									<Image src={imagePreview} alt="Preview" fill className="object-cover" unoptimized />
								</div>
							)}
						</div>

						{/* Capacity */}
						<div className="w-40">
							<label className={labelCls}>Capacity</label>
							<input type="number" min="0" className={inputCls} value={form.current_capacity} onChange={e => setForm(f => ({ ...f, current_capacity: e.target.value }))} placeholder="Optional" />
						</div>

						{error && <p className="text-sm text-red-600">{error}</p>}

						<div className="flex gap-3 mt-2">
							<button type="submit" disabled={saving || uploadingImage} className="rounded-lg bg-[var(--navy)] px-5 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 transition-opacity">
								{saving ? "Saving…" : editing ? "Save Changes" : "Create Event"}
							</button>
							<button type="button" onClick={() => setShowForm(false)} className="rounded-lg border border-[var(--line)] px-5 py-2 text-sm text-[var(--ink-soft)] hover:bg-[var(--cream)] transition-colors">
								Cancel
							</button>
						</div>
					</form>
				</div>
			)}

			{/* Delete confirmation */}
			{deleteId !== null && (
				<div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 flex items-center justify-between gap-4">
					<p className="text-sm text-red-700">Delete this event? This cannot be undone.</p>
					<div className="flex gap-2 shrink-0">
						<button onClick={() => handleDelete(deleteId)} className="rounded-lg bg-red-600 px-4 py-1.5 text-sm text-white hover:bg-red-700 transition-colors">Delete</button>
						<button onClick={() => setDeleteId(null)} className="rounded-lg border border-red-300 px-4 py-1.5 text-sm text-red-600 hover:bg-red-100 transition-colors">Cancel</button>
					</div>
				</div>
			)}

			{/* Event list */}
			{loading ? (
				<div className="flex flex-col gap-3">
					{[0,1,2].map(i => <div key={i} className="h-24 rounded-xl bg-[var(--cream)] animate-pulse" />)}
				</div>
			) : events.length === 0 ? (
				<div className="rounded-xl border border-dashed border-[var(--line)] p-12 text-center text-[var(--ink-soft)]">
					No events yet. Create your first one.
				</div>
			) : (() => {
				const today = new Date().toISOString().slice(0, 10);
				const upcoming = events.filter(e => e.event_date >= today);
				const past     = events.filter(e => e.event_date <  today);
				const renderCard = (ev: Event) => {
					const isExpanded = expandedRsvps === ev.id;
					const registrations = rsvpCache[ev.id];
					return (
						<div key={ev.id} className="rounded-xl border border-[var(--line)] bg-white shadow-sm overflow-hidden">
							<div className="flex items-start gap-4 p-4">
								{ev.image_url && (
									<div className="relative shrink-0 w-20 h-20 rounded-lg overflow-hidden border border-[var(--line)]">
										<Image src={ev.image_url} alt={ev.title} fill className="object-cover" unoptimized />
									</div>
								)}
								<div className="flex-1 min-w-0">
									<p className="font-semibold text-[var(--ink)] truncate">{ev.title}</p>
									<p className="text-sm text-[var(--ink-soft)] mt-0.5">
										{formatDate(ev.event_date)}
										{ev.event_time && <> · {formatTime(ev.event_time, ev.event_timezone)}</>}
									</p>
									{ev.location && <p className="text-sm text-[var(--ink-soft)] truncate">{ev.location}</p>}
									{ev.description && <p className="text-xs text-[var(--ink-soft)] mt-1 line-clamp-2">{ev.description}</p>}
								</div>
								<div className="flex gap-2 shrink-0">
									<button onClick={() => toggleRsvps(ev.id)} className={`rounded-lg border px-3 py-1.5 text-xs transition-colors ${isExpanded ? "border-[var(--navy)] bg-[var(--navy)] text-white" : "border-[var(--line)] text-[var(--ink-soft)] hover:bg-[var(--cream)]"}`}>
										RSVPs{registrations ? ` (${registrations.length})` : ""}
									</button>
									<button onClick={() => openEdit(ev)} className="rounded-lg border border-[var(--line)] px-3 py-1.5 text-xs text-[var(--ink-soft)] hover:bg-[var(--cream)] transition-colors">Edit</button>
									<button onClick={() => setDeleteId(ev.id)} className="rounded-lg border border-red-200 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 transition-colors">Delete</button>
								</div>
							</div>

							{isExpanded && (
								<div className="border-t border-[var(--line)] bg-[var(--cream)] px-4 py-3">
									{rsvpLoading && !registrations ? (
										<p className="text-xs text-[var(--ink-soft)] py-2">Loading…</p>
									) : !registrations || registrations.length === 0 ? (
										<p className="text-xs text-[var(--ink-soft)] py-2">No RSVPs yet.</p>
									) : (
										<>
											<p className="text-xs font-semibold uppercase tracking-widest text-[var(--ink-soft)] mb-2">
												{registrations.length} attendee{registrations.length !== 1 ? "s" : ""}
											</p>
											<div className="flex flex-col gap-1">
												{registrations.map((r, i) => (
													<div key={i} className="flex items-center gap-3 text-sm">
														<span className="font-medium text-[var(--ink)] min-w-[140px]">{r.name}</span>
														<a href={`mailto:${r.email}`} className="text-[var(--navy)] hover:underline">{r.email}</a>
													</div>
												))}
											</div>
										</>
									)}
								</div>
							)}
						</div>
					);
				};
				return (
					<div className="flex flex-col gap-3">
						{upcoming.length > 0 && (
							<>
								<div className="flex items-center gap-3 mt-1">
									<span className="text-xs font-semibold uppercase tracking-widest text-[var(--ink-soft)] shrink-0">Upcoming</span>
									<div className="flex-1 h-px bg-[var(--line)]" />
								</div>
								{upcoming.map(renderCard)}
							</>
						)}
						{past.length > 0 && (
							<>
								<div className="flex items-center gap-3 mt-3">
									<span className="text-xs font-semibold uppercase tracking-widest text-[var(--ink-soft)] shrink-0">Past</span>
									<div className="flex-1 h-px bg-[var(--line)]" />
								</div>
								{past.map(renderCard)}
							</>
						)}
					</div>
				);
			})()}
		</div>
	);
}
