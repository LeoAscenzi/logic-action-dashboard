"use client";
import { useEffect, useRef, useState } from "react";
import { useApiFetch } from "@/app/hooks/useApiFetch";
import { ApiError } from "@/app/lib/api";

interface Teacher { id: number; fname: string; lname: string; username: string; email: string; }

type Action = "create-teacher" | null;

const inputCls = "rounded-lg border border-[#D4AF37]/60 bg-white/70 px-3 py-2 text-sm text-[#0D0F14] placeholder:text-[#0D0F14]/40 focus:outline-none focus:ring-1 focus:ring-[#D4AF37]";
const btnCls   = "rounded-lg bg-[#D4AF37] px-4 py-2 text-sm font-semibold text-[#0D0F14] hover:bg-[#c4a230] transition-colors";

const emptyForm = { username: "", fname: "", lname: "", email: "", password: "" };

export default function TeachersTab() {
	const apiFetch = useApiFetch();
	const [teachers, setTeachers] = useState<Teacher[]>([]);
	const [loading,  setLoading]  = useState(true);
	const [action,   setAction]   = useState<Action>(null);
	const [form,     setForm]     = useState(emptyForm);
	const [selected, setSelected] = useState<Set<number>>(new Set());
	const [msg,      setMsg]      = useState<{ text: string; ok: boolean } | null>(null);

	const headerCheckRef = useRef<HTMLInputElement>(null);

	const refresh = async () => {
		const t = await apiFetch<Teacher[]>("/admin/teachers");
		setTeachers(t);
		setSelected(new Set());
	};

	useEffect(() => {
		refresh().finally(() => setLoading(false));  // eslint-disable-line react-hooks/set-state-in-effect
	}, []);  // eslint-disable-line react-hooks/exhaustive-deps

	useEffect(() => {
		if (headerCheckRef.current) {
			headerCheckRef.current.indeterminate = selected.size > 0 && selected.size < teachers.length;
		}
	}, [selected, teachers]);

	const toast = (text: string, ok = true) => {
		setMsg({ text, ok });
		setTimeout(() => setMsg(null), 3000);
	};

	const toggle = (key: Action) => setAction(a => a === key ? null : key);

	const toggleRow = (id: number) => {
		setSelected(prev => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id); else next.add(id);
			return next;
		});
	};

	const toggleAll = () => {
		setSelected(prev =>
			prev.size === teachers.length
				? new Set()
				: new Set(teachers.map(t => t.id))
		);
	};

	const handleCreate = async (e: React.FormEvent) => {
		e.preventDefault();
		try {
			await apiFetch("/admin/create-teacher", {
				method: "POST",
				body: JSON.stringify(form),
			});
			setForm(emptyForm);
			setAction(null);
			toast("Teacher account created.");
			await refresh();
		} catch (err) {
			toast(err instanceof ApiError ? JSON.stringify(err.data) : "Error", false);
		}
	};

	const handleDeleteSelected = async () => {
		if (selected.size === 0) return;
		const plural = selected.size > 1 ? "s" : "";
		if (!confirm(`Delete ${selected.size} teacher${plural}? This cannot be undone.`)) return;
		try {
			await Promise.all(
				Array.from(selected).map(id =>
					apiFetch(`/admin/delete-teacher/${id}`, { method: "DELETE" })
				)
			);
			toast(`Deleted ${selected.size} teacher${plural}.`);
			await refresh();
		} catch (err) {
			toast(err instanceof ApiError ? "Failed to delete." : "Error", false);
		}
	};

	if (loading) return <p className="p-6 text-[#0D0F14]/50">Loading…</p>;

	return (
		<div className="flex flex-col min-h-[calc(100vh-56px)] md:min-h-screen">

			{/* Action bar */}
			<div className="border-b border-[#d4c9b0] bg-[#ede8df] px-6 py-3 flex items-center gap-3 flex-wrap shrink-0">
				<span className="text-xs font-semibold uppercase tracking-wider text-[#5b6072] mr-1">Teachers</span>
				<button
					onClick={() => toggle("create-teacher")}
					className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors border ${
						action === "create-teacher"
							? "bg-[#D4AF37] border-[#D4AF37] text-[#0D0F14]"
							: "border-[#D4AF37]/70 text-[#D4AF37] hover:bg-[#D4AF37]/10"
					}`}
				>
					Create Teacher
				</button>
				<div className="flex-1" />
				{selected.size > 0 && (
					<button
						onClick={handleDeleteSelected}
						className="rounded-lg px-4 py-1.5 text-sm font-medium transition-colors border border-red-400/70 text-red-600 hover:bg-red-50"
					>
						Delete ({selected.size})
					</button>
				)}
			</div>

			{/* Content */}
			<div className="flex-1 p-6 overflow-auto flex flex-col gap-6">

				{msg && (
					<p className={`text-sm font-medium ${msg.ok ? "text-green-700" : "text-red-600"}`}>{msg.text}</p>
				)}

				{action === "create-teacher" && (
					<div className="bg-white rounded-xl border border-[#D4AF37]/30 p-5 max-w-md">
						<form onSubmit={handleCreate} className="flex flex-col gap-3">
							<div className="flex gap-3">
								<input className={inputCls + " flex-1"} placeholder="First name" value={form.fname} onChange={e => setForm(f => ({ ...f, fname: e.target.value }))} required />
								<input className={inputCls + " flex-1"} placeholder="Last name"  value={form.lname} onChange={e => setForm(f => ({ ...f, lname: e.target.value }))} required />
							</div>
							<input className={inputCls} placeholder="Username" value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} required />
							<input className={inputCls} type="email" placeholder="Email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
							<input className={inputCls} type="password" placeholder="Password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required />
							<button className={btnCls} type="submit">Create Teacher</button>
						</form>
					</div>
				)}

				{/* Teachers table */}
				<div>
					<h3 className="font-semibold text-[#D4AF37] tracking-wide text-sm uppercase mb-4">All Teachers</h3>
					{teachers.length === 0 ? (
						<p className="text-[#0D0F14]/50 text-sm">No teacher accounts yet.</p>
					) : (
						<table className="w-full text-sm border-collapse">
							<thead>
								<tr className="border-b border-[#D4AF37]/40 text-left">
									<th className="py-2 pr-3 w-8">
										<input
											ref={headerCheckRef}
											type="checkbox"
											checked={selected.size === teachers.length && teachers.length > 0}
											onChange={toggleAll}
											className="cursor-pointer accent-[#D4AF37]"
										/>
									</th>
									<th className="py-2 pr-4 text-[#0D0F14]/50 font-medium">ID</th>
									<th className="py-2 pr-4 text-[#0D0F14]/50 font-medium">Name</th>
									<th className="py-2 pr-4 text-[#0D0F14]/50 font-medium">Username</th>
									<th className="py-2 text-[#0D0F14]/50 font-medium">Email</th>
								</tr>
							</thead>
							<tbody>
								{teachers.map(t => {
									const isSel = selected.has(t.id);
									return (
										<tr
											key={t.id}
											onClick={() => toggleRow(t.id)}
											className={`border-b border-[#0D0F14]/8 cursor-pointer transition-colors ${
												isSel ? "bg-[#D4AF37]/10" : "hover:bg-white/40"
											}`}
										>
											<td className="py-2.5 pr-3">
												<input
													type="checkbox"
													checked={isSel}
													onChange={() => toggleRow(t.id)}
													onClick={e => e.stopPropagation()}
													className="cursor-pointer accent-[#D4AF37]"
												/>
											</td>
											<td className="py-2.5 pr-4 text-[#0D0F14]/40 text-xs">{t.id}</td>
											<td className="py-2.5 pr-4 font-medium text-[#0D0F14]">{t.fname} {t.lname}</td>
											<td className="py-2.5 pr-4 text-[#0D0F14]/60">{t.username}</td>
											<td className="py-2.5 text-[#0D0F14]/60">{t.email}</td>
										</tr>
									);
								})}
							</tbody>
						</table>
					)}
				</div>
			</div>
		</div>
	);
}
