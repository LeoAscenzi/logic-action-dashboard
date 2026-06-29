"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRequireAuth } from "@/app/hooks/useRequireAuth";
import { useApiFetch } from "@/app/hooks/useApiFetch";

const inputCls =
	"w-full rounded-lg border border-[var(--line)] bg-white px-4 py-2.5 text-sm text-[var(--ink)] " +
	"placeholder:text-[var(--ink-soft)] focus:outline-none focus:ring-1 focus:ring-[var(--navy)]";
const labelCls = "block text-xs font-semibold text-[var(--navy)] mb-1 uppercase tracking-wide";
const selectCls = inputCls + " cursor-pointer";

const ROLES = ["parent", "teacher"] as const;

interface Invite {
	id: number;
	email: string;
	role: string;
	expires_at: string;
	is_used: boolean;
}

function formatExpiry(iso: string) {
	const d = new Date(iso);
	const now = new Date();
	if (d < now) return { label: "Expired", cls: "text-red-500" };
	const days = Math.ceil((d.getTime() - now.getTime()) / 86400000);
	return { label: `Expires in ${days}d`, cls: "text-[var(--ink-soft)]" };
}

export default function InvitesPage() {
	const { isAuthorized } = useRequireAuth("admin");
	const apiFetch = useApiFetch();
	const apiFetchRef = useRef(apiFetch);
	apiFetchRef.current = apiFetch;

	const [invites, setInvites]   = useState<Invite[]>([]);
	const [loading, setLoading]   = useState(true);
	const [email, setEmail]       = useState("");
	const [role, setRole]         = useState<typeof ROLES[number]>("parent");
	const [days, setDays]         = useState("7");
	const [sending, setSending]   = useState(false);
	const [success, setSuccess]   = useState("");
	const [error, setError]       = useState("");
	const [revokeId, setRevokeId] = useState<number | null>(null);

	const loadInvites = useCallback(async () => {
		setLoading(true);
		try {
			const data = await apiFetchRef.current<Invite[]>("/admin/invites");
			setInvites(data ?? []);
		} catch {
			setInvites([]);
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => { loadInvites(); }, [loadInvites]);

	async function handleSend(e: React.FormEvent) {
		e.preventDefault();
		setSending(true);
		setError("");
		setSuccess("");
		try {
			await apiFetchRef.current("/admin/invites", {
				method: "POST",
				body: JSON.stringify({ email: email.trim(), role, expires_days: parseInt(days) }),
			});
			setSuccess(`Invite sent to ${email.trim()}`);
			setEmail("");
			await loadInvites();
		} catch {
			setError("Failed to send invite. Check the email and try again.");
		} finally {
			setSending(false);
		}
	}

	async function handleRevoke(id: number) {
		try {
			await apiFetchRef.current(`/admin/invites/${id}`, { method: "DELETE" });
			setRevokeId(null);
			await loadInvites();
		} catch {
			setError("Revoke failed.");
		}
	}

	if (!isAuthorized) return null;

	return (
		<div className="p-6 max-w-3xl mx-auto">
			<h1 className="text-2xl font-bold text-[var(--ink)] mb-6">Invites</h1>

			{/* Send invite form */}
			<div className="rounded-xl border border-[var(--line)] bg-white p-6 shadow-sm mb-8">
				<h2 className="text-base font-semibold text-[var(--ink)] mb-4">Send a new invite</h2>
				<form onSubmit={handleSend} className="flex flex-col gap-4">
					<div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
						<div className="sm:col-span-2">
							<label className={labelCls}>Email *</label>
							<input
								required type="email"
								className={inputCls}
								placeholder="parent@email.com"
								value={email}
								onChange={e => { setEmail(e.target.value); setSuccess(""); setError(""); }}
							/>
						</div>
						<div>
							<label className={labelCls}>Role</label>
							<select className={selectCls} value={role} onChange={e => setRole(e.target.value as typeof ROLES[number])}>
								{ROLES.map(r => <option key={r} value={r} className="capitalize">{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
							</select>
						</div>
					</div>
					<div className="w-32">
						<label className={labelCls}>Expires in (days)</label>
						<input type="number" min="1" max="30" className={inputCls} value={days} onChange={e => setDays(e.target.value)} />
					</div>
					{error   && <p className="text-sm text-red-600">{error}</p>}
					{success && <p className="text-sm text-green-600">{success}</p>}
					<button
						type="submit"
						disabled={sending}
						className="self-start rounded-lg bg-[var(--navy)] px-5 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
					>
						{sending ? "Sending…" : "Send Invite"}
					</button>
				</form>
			</div>

			{/* Revoke confirmation */}
			{revokeId !== null && (
				<div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 flex items-center justify-between gap-4">
					<p className="text-sm text-red-700">Revoke this invite? The link will stop working.</p>
					<div className="flex gap-2 shrink-0">
						<button onClick={() => handleRevoke(revokeId)} className="rounded-lg bg-red-600 px-4 py-1.5 text-sm text-white hover:bg-red-700 transition-colors">Revoke</button>
						<button onClick={() => setRevokeId(null)} className="rounded-lg border border-red-300 px-4 py-1.5 text-sm text-red-600 hover:bg-red-100 transition-colors">Cancel</button>
					</div>
				</div>
			)}

			{/* Invite list */}
			<h2 className="text-base font-semibold text-[var(--ink)] mb-3">Sent invites</h2>
			{loading ? (
				<div className="flex flex-col gap-2">{[0,1,2].map(i => <div key={i} className="h-14 rounded-lg bg-[var(--cream)] animate-pulse" />)}</div>
			) : invites.length === 0 ? (
				<div className="rounded-xl border border-dashed border-[var(--line)] p-10 text-center text-sm text-[var(--ink-soft)]">No invites sent yet.</div>
			) : (
				<div className="flex flex-col gap-2">
					{invites.map(inv => {
						const expiry = formatExpiry(inv.expires_at);
						return (
							<div key={inv.id} className="flex items-center gap-3 rounded-lg border border-[var(--line)] bg-white px-4 py-3">
								<div className="flex-1 min-w-0">
									<p className="text-sm font-medium text-[var(--ink)] truncate">{inv.email}</p>
									<p className="text-xs text-[var(--ink-soft)] capitalize">{inv.role} · <span className={expiry.cls}>{expiry.label}</span></p>
								</div>
								{inv.is_used ? (
									<span className="shrink-0 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">Used</span>
								) : (
									<>
										<span className="shrink-0 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">Pending</span>
										<button
											onClick={() => setRevokeId(inv.id)}
											className="shrink-0 rounded-lg border border-red-200 px-3 py-1 text-xs text-red-600 hover:bg-red-50 transition-colors"
										>
											Revoke
										</button>
									</>
								)}
							</div>
						);
					})}
				</div>
			)}
		</div>
	);
}
