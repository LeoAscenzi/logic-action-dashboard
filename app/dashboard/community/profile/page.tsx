"use client";
import Image from "next/image";
import { FormEvent, useEffect, useRef, useState } from "react";
import { useRequireAuth } from "@/app/hooks/useRequireAuth";
import { useApiFetch } from "@/app/hooks/useApiFetch";
import { useAuth } from "@/app/context/AuthContext";

const inputCls =
	"w-full rounded-lg border border-[var(--line)] bg-white px-4 py-2.5 text-sm text-[var(--ink)] " +
	"placeholder:text-[var(--ink-soft)] focus:outline-none focus:ring-1 focus:ring-[var(--navy)]";
const readOnlyCls =
	"w-full rounded-lg border border-[var(--line)] bg-[var(--cream)] px-4 py-2.5 text-sm text-[var(--ink-soft)] cursor-not-allowed";
const labelCls = "block text-xs font-semibold text-[var(--navy)] mb-1 uppercase tracking-wide";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export default function ProfilePage() {
	const { user, isAuthorized } = useRequireAuth();
	const { updateUser, accessToken } = useAuth();
	const apiFetch = useApiFetch();
	const apiFetchRef = useRef(apiFetch);
	apiFetchRef.current = apiFetch;
	const tokenRef = useRef(accessToken);
	tokenRef.current = accessToken;

	const [fname, setFname]             = useState("");
	const [lname, setLname]             = useState("");
	const [avatarUrl, setAvatarUrl]     = useState<string>("");
	const [emailGrades, setEmailGrades]         = useState(true);
	const [emailAnnouncements, setEmailAnnouncements] = useState(true);
	const [emailEvents, setEmailEvents]         = useState(true);
	const [saving, setSaving]           = useState(false);
	const [uploadingAvatar, setUploadingAvatar] = useState(false);
	const [success, setSuccess]         = useState(false);
	const [error, setError]             = useState("");

	useEffect(() => {
		if (!user) return;
		setFname(user.fname);
		setLname(user.lname);
		setAvatarUrl(user.avatar_url ?? "");
		setEmailGrades(user.email_grades ?? true);
		setEmailAnnouncements(user.email_announcements ?? true);
		setEmailEvents(user.email_events ?? true);
	}, [user]);

	async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
		const file = e.target.files?.[0];
		if (!file) return;
		setUploadingAvatar(true);
		setError("");
		try {
			const fd = new FormData();
			fd.append("file", file);
			const res = await fetch(`${API}/upload`, {
				method: "POST",
				headers: { Authorization: `Bearer ${tokenRef.current}` },
				body: fd,
			});
			if (!res.ok) throw new Error("Upload failed");
			const { url } = await res.json();
			setAvatarUrl(url);
			await apiFetchRef.current("/me", {
				method: "PATCH",
				body: JSON.stringify({ avatar_url: url }),
			});
			updateUser({ avatar_url: url });
		} catch {
			setError("Avatar upload failed. Please try again.");
		} finally {
			setUploadingAvatar(false);
		}
	}

	async function handleRemoveAvatar() {
		if (!avatarUrl) return;
		if (!confirm("Remove your profile photo?")) return;
		setUploadingAvatar(true);
		setError("");
		try {
			await apiFetchRef.current("/me/avatar", { method: "DELETE" });
			setAvatarUrl("");
			updateUser({ avatar_url: null });
		} catch {
			setError("Failed to remove photo. Please try again.");
		} finally {
			setUploadingAvatar(false);
		}
	}

	const handleSubmit = async (e: FormEvent) => {
		e.preventDefault();
		setSaving(true);
		setSuccess(false);
		setError("");
		try {
			await apiFetchRef.current("/me", {
				method: "PATCH",
				body: JSON.stringify({
					fname: fname.trim(),
					lname: lname.trim(),
					email_grades: emailGrades,
					email_announcements: emailAnnouncements,
					email_events: emailEvents,
				}),
			});
			updateUser({ fname: fname.trim(), lname: lname.trim(), email_grades: emailGrades, email_announcements: emailAnnouncements, email_events: emailEvents });
			setSuccess(true);
		} catch {
			setError("Failed to save changes. Please try again.");
		} finally {
			setSaving(false);
		}
	};

	if (!isAuthorized || !user) return null;

	const initials = `${user.fname[0] ?? ""}${user.lname[0] ?? ""}`.toUpperCase();

	return (
		<div className="max-w-lg mx-auto px-8 py-10">
			<h1 className="font-playfair text-2xl font-semibold text-[var(--ink)] mb-8">Profile</h1>

			{/* Avatar */}
			<div className="flex items-center gap-5 mb-8 pb-8 border-b border-[var(--line)]">
				<div className="relative shrink-0">
					<div className="w-20 h-20 rounded-full overflow-hidden border-2 border-[var(--line)] bg-[var(--navy)] flex items-center justify-center text-[var(--cream)] text-2xl font-semibold select-none">
						{avatarUrl ? (
							<Image src={avatarUrl} alt="Avatar" fill className="object-cover" unoptimized />
						) : (
							initials
						)}
					</div>
					{uploadingAvatar && (
						<div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center">
							<div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
						</div>
					)}
				</div>
				<div className="flex flex-col gap-1.5">
					<div className="flex items-center gap-2">
						<label className="inline-flex items-center gap-2 cursor-pointer rounded-lg border border-[var(--line)] px-4 py-2 text-sm text-[var(--ink-soft)] hover:bg-[var(--cream)] transition-colors">
							<input type="file" accept="image/jpeg,image/png,image/gif,image/webp" className="hidden" onChange={handleAvatarChange} disabled={uploadingAvatar} />
							{uploadingAvatar ? "Uploading…" : avatarUrl ? "Change Photo" : "Upload Photo"}
						</label>
						{avatarUrl && (
							<button
								type="button"
								onClick={handleRemoveAvatar}
								disabled={uploadingAvatar}
								className="rounded-lg border border-red-300 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
							>
								Remove
							</button>
						)}
					</div>
					<p className="text-xs text-[var(--ink-soft)]">JPG, PNG, GIF or WEBP · Max 5MB</p>
				</div>
			</div>

			<form onSubmit={handleSubmit} className="flex flex-col gap-5">
				<div className="grid grid-cols-2 gap-4">
					<div>
						<label className={labelCls}>First Name</label>
						<input
							className={inputCls}
							value={fname}
							onChange={(e) => { setFname(e.target.value); setSuccess(false); }}
							required
						/>
					</div>
					<div>
						<label className={labelCls}>Last Name</label>
						<input
							className={inputCls}
							value={lname}
							onChange={(e) => { setLname(e.target.value); setSuccess(false); }}
							required
						/>
					</div>
				</div>

				<div>
					<label className={labelCls}>Email</label>
					<input className={readOnlyCls} value={user.email ?? ""} readOnly tabIndex={-1} />
				</div>

				<div>
					<label className={labelCls}>Role</label>
					<input className={`${readOnlyCls} capitalize`} value={user.role} readOnly tabIndex={-1} />
				</div>

				{/* Notification preferences */}
				<div className="pt-4 border-t border-[var(--line)]">
					<p className={labelCls + " mb-3"}>Email notifications</p>
					<div className="flex flex-col gap-3">
						{([
							["New grades posted", emailGrades, setEmailGrades],
							["Announcements", emailAnnouncements, setEmailAnnouncements],
							["Upcoming events", emailEvents, setEmailEvents],
						] as [string, boolean, (v: boolean) => void][]).map(([label, checked, setter]) => (
							<label key={label} className="flex items-center gap-3 cursor-pointer select-none group">
								<button
									type="button"
									role="switch"
									aria-checked={checked}
									onClick={() => { setter(!checked); setSuccess(false); }}
									className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors focus:outline-none ${
										checked ? "bg-[var(--navy)]" : "bg-[var(--line)]"
									}`}
								>
									<span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-4" : "translate-x-0"}`} />
								</button>
								<span className="text-sm text-[var(--ink)]">{label}</span>
							</label>
						))}
					</div>
				</div>

				{error && <p className="text-red-500 text-sm">{error}</p>}
				{success && <p className="text-green-600 text-sm">Changes saved.</p>}

				<button
					type="submit"
					disabled={saving}
					className="self-start rounded-lg bg-[var(--navy)] text-[var(--cream)] px-6 py-2.5 text-sm font-semibold hover:bg-[var(--navy-mid)] transition-colors disabled:opacity-50"
				>
					{saving ? "Saving…" : "Save Changes"}
				</button>
			</form>
		</div>
	);
}
