"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useApiFetch } from "@/app/hooks/useApiFetch";
import { ApiError } from "@/app/lib/api";
import { Button, StatusBadge, TableWrap, useToast } from "@/app/components/ui";

interface ManagedUser {
	id: number;
	fname: string;
	lname: string;
	username: string;
	email: string;
	is_active: boolean;
}

interface Props {
	title: string;          // e.g. "Teachers"
	listPath: string;       // e.g. "/admin/teachers"
	inviteRole: string;     // e.g. "teacher" — shown in the invite hint
}

export default function UserManagementTab({ title, listPath, inviteRole }: Props) {
	const apiFetch = useApiFetch();
	const apiFetchRef = useRef(apiFetch);
	apiFetchRef.current = apiFetch;

	const [users, setUsers]     = useState<ManagedUser[]>([]);
	const [loading, setLoading] = useState(true);
	const [busy, setBusy]       = useState<number | null>(null);
	const { node: toast, flash } = useToast();

	const refresh = async () => {
		const u = await apiFetchRef.current<ManagedUser[]>(listPath);
		setUsers(u);
	};

	useEffect(() => {
		refresh().catch(() => flash("Failed to load.", false)).finally(() => setLoading(false));
	}, []); // eslint-disable-line react-hooks/exhaustive-deps

	const toggleActive = async (u: ManagedUser) => {
		const verb = u.is_active ? "deactivate" : "reactivate";
		if (u.is_active && !confirm(`Deactivate ${u.fname} ${u.lname}? They will be signed out and unable to log in until reactivated.`)) return;
		setBusy(u.id);
		try {
			await apiFetchRef.current(`/admin/users/${u.id}/${verb}`, { method: "POST" });
			flash(u.is_active ? "Account deactivated." : "Account reactivated.");
			await refresh();
		} catch (err) {
			flash(err instanceof ApiError ? (err.data as { detail?: string })?.detail ?? "Action failed." : "Action failed.", false);
		} finally {
			setBusy(null);
		}
	};

	if (loading) return <p className="p-6 text-ink/50">Loading…</p>;

	return (
		<div className="flex flex-col min-h-[calc(100vh-56px)] md:min-h-screen">
			{toast}

			{/* Action bar */}
			<div className="border-b border-cream-dim bg-[#ede8df] px-6 py-3 flex items-center gap-3 flex-wrap shrink-0">
				<span className="text-xs font-semibold uppercase tracking-wider text-ink-soft mr-1">{title}</span>
				<div className="flex-1" />
				<Link href="/dashboard/admin/invites">
					<Button variant="ghost">+ Invite {inviteRole}</Button>
				</Link>
			</div>

			{/* Content */}
			<div className="flex-1 p-6 overflow-auto flex flex-col gap-6">
				<p className="text-sm text-ink-soft">
					{title} are added by email invitation. Use{" "}
					<Link href="/dashboard/admin/invites" className="text-gold hover:underline">Invites</Link>{" "}
					to send a sign-up link, then deactivate accounts here to revoke access.
				</p>

				<div>
					<h3 className="font-semibold text-gold tracking-wide text-sm uppercase mb-4">All {title}</h3>
					{users.length === 0 ? (
						<p className="text-ink/50 text-sm">No {title.toLowerCase()} yet.</p>
					) : (
						<TableWrap>
							<table className="w-full text-sm border-collapse">
								<thead>
									<tr className="border-b border-gold/40 text-left">
										<th className="py-2 pr-4 text-ink/50 font-medium">ID</th>
										<th className="py-2 pr-4 text-ink/50 font-medium">Name</th>
										<th className="py-2 pr-4 text-ink/50 font-medium">Username</th>
										<th className="py-2 pr-4 text-ink/50 font-medium">Email</th>
										<th className="py-2 pr-4 text-ink/50 font-medium">Status</th>
										<th className="py-2 text-ink/50 font-medium" />
									</tr>
								</thead>
								<tbody>
									{users.map(u => (
										<tr key={u.id} className="border-b border-ink/8 hover:bg-white/40 transition-colors">
											<td className="py-2.5 pr-4 text-ink/40 text-xs">{u.id}</td>
											<td className="py-2.5 pr-4 font-medium text-ink">{u.fname} {u.lname}</td>
											<td className="py-2.5 pr-4 text-ink/60">{u.username}</td>
											<td className="py-2.5 pr-4 text-ink/60">{u.email}</td>
											<td className="py-2.5 pr-4">
												<StatusBadge label={u.is_active ? "Active" : "Disabled"} tone={u.is_active ? "success" : "danger"} />
											</td>
											<td className="py-2.5 text-right whitespace-nowrap">
												<Button
													variant={u.is_active ? "danger" : "ghost"}
													disabled={busy === u.id}
													onClick={() => toggleActive(u)}
													className="!px-3 !py-1.5"
												>
													{busy === u.id ? "…" : u.is_active ? "Deactivate" : "Reactivate"}
												</Button>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</TableWrap>
					)}
				</div>
			</div>
		</div>
	);
}
