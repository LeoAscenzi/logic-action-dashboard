"use client";
import { useEffect, useRef, useState } from "react";
import { useApiFetch } from "@/app/hooks/useApiFetch";
import { useAdminSection } from "@/app/context/AdminSectionContext";
import { ApiError } from "@/app/lib/api";

interface Student { id: number; fname: string; lname: string; parent_id: number | null; }
interface Parent  { id: number; fname: string; lname: string; username: string; }
interface EnrolledClass { id: number; class_name: string; }
interface StudentDetail {
	id: number; fname: string; lname: string;
	parent_id: number | null; parent_fname: string | null; parent_lname: string | null;
	enrolled_classes: EnrolledClass[];
	exam_count: number;
}

type Action = "create-student" | "assign-parent" | null;

const inputCls = "rounded-lg border border-[#D4AF37]/60 bg-white/70 px-3 py-2 text-sm text-[#0D0F14] placeholder:text-[#0D0F14]/40 focus:outline-none focus:ring-1 focus:ring-[#D4AF37]";
const btnCls   = "rounded-lg bg-[#D4AF37] px-4 py-2 text-sm font-semibold text-[#0D0F14] hover:bg-[#c4a230] transition-colors";

function StudentDetailPanel({ studentId, onBack }: { studentId: number; onBack: () => void }) {
	const apiFetch = useApiFetch();
	const [detail,  setDetail]  = useState<StudentDetail | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		apiFetch<StudentDetail>(`/admin/students/${studentId}`)
			.then(setDetail)
			.finally(() => setLoading(false));
	}, [studentId]);  // eslint-disable-line react-hooks/exhaustive-deps

	if (loading) return <p className="p-6 text-[#0D0F14]/50">Loading…</p>;
	if (!detail)  return <p className="p-6 text-[#0D0F14]/50">Student not found.</p>;

	return (
		<div className="flex flex-col min-h-[calc(100vh-56px)] md:min-h-screen">
			<div className="border-b border-[#d4c9b0] bg-[#ede8df] px-6 py-3 flex items-center gap-3 shrink-0">
				<button onClick={onBack} className="text-[#5b6072] hover:text-[#0D0F14] transition-colors text-sm">← All Students</button>
			</div>
			<div className="flex-1 p-6 overflow-auto flex flex-col gap-6">
				<nav className="flex items-center gap-1.5 text-sm text-[#0D0F14]/50">
					<button onClick={onBack} className="hover:text-[#D4AF37] transition-colors">All Students</button>
					<span>/</span>
					<span className="text-[#0D0F14] font-medium">{detail.fname} {detail.lname}</span>
				</nav>

				<div className="bg-white rounded-xl border border-[#D4AF37]/30 p-5 max-w-md flex flex-col gap-2">
					<h2 className="text-lg font-semibold text-[#0D0F14]">{detail.fname} {detail.lname}</h2>
					<p className="text-sm text-[#0D0F14]/60">
						Parent: {detail.parent_fname ? `${detail.parent_fname} ${detail.parent_lname}` : <span className="text-[#0D0F14]/30">None assigned</span>}
					</p>
					<p className="text-sm text-[#0D0F14]/60">Exams on record: {detail.exam_count}</p>
				</div>

				<div>
					<h3 className="font-semibold text-[#D4AF37] tracking-wide text-sm uppercase mb-3">Enrolled Classes</h3>
					{detail.enrolled_classes.length === 0 ? (
						<p className="text-[#0D0F14]/50 text-sm">Not enrolled in any classes.</p>
					) : (
						<ul className="flex flex-col gap-2 max-w-sm">
							{detail.enrolled_classes.map(c => (
								<li key={c.id} className="bg-white rounded-lg border border-[#D4AF37]/20 px-4 py-2.5 text-sm font-medium text-[#0D0F14]">{c.class_name}</li>
							))}
						</ul>
					)}
				</div>
			</div>
		</div>
	);
}

export default function StudentsTab() {
	const apiFetch = useApiFetch();
	const { selectedId, navigateTo } = useAdminSection();
	const [students, setStudents] = useState<Student[]>([]);
	const [parents,  setParents]  = useState<Parent[]>([]);
	const [loading,  setLoading]  = useState(true);
	const [action,   setAction]   = useState<Action>(null);
	const [selected, setSelected] = useState<Set<number>>(new Set());
	const [msg,      setMsg]      = useState<{ text: string; ok: boolean } | null>(null);

	const [createForm, setCreateForm] = useState({ fname: "", lname: "", parent_id: "" });
	const [assignForm, setAssignForm] = useState({ student_id: "", parent_id: "" });

	const headerCheckRef = useRef<HTMLInputElement>(null);

	const refresh = async () => {
		const [s, p] = await Promise.all([
			apiFetch<Student[]>("/admin/students"),
			apiFetch<Parent[]>("/admin/parents"),
		]);
		setStudents(s);
		setParents(p);
		setSelected(new Set());
	};

	useEffect(() => {
		refresh().finally(() => setLoading(false));  // eslint-disable-line react-hooks/set-state-in-effect
	}, []);  // eslint-disable-line react-hooks/exhaustive-deps

	useEffect(() => {
		if (headerCheckRef.current) {
			headerCheckRef.current.indeterminate = selected.size > 0 && selected.size < students.length;
		}
	}, [selected, students]);

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
			prev.size === students.length
				? new Set()
				: new Set(students.map(s => s.id))
		);
	};

	const handleCreate = async (e: React.FormEvent) => {
		e.preventDefault();
		try {
			await apiFetch("/admin/create-student", {
				method: "POST",
				body: JSON.stringify({
					fname:     createForm.fname,
					lname:     createForm.lname,
					parent_id: createForm.parent_id ? parseInt(createForm.parent_id) : null,
				}),
			});
			setCreateForm({ fname: "", lname: "", parent_id: "" });
			toast("Student created.");
			await refresh();
		} catch (err) {
			toast(err instanceof ApiError ? JSON.stringify(err.data) : "Error", false);
		}
	};

	const handleAssign = async (e: React.FormEvent) => {
		e.preventDefault();
		try {
			await apiFetch(`/admin/assign-student/${assignForm.student_id}`, {
				method: "PATCH",
				body: JSON.stringify({ parent_id: parseInt(assignForm.parent_id) }),
			});
			setAssignForm({ student_id: "", parent_id: "" });
			toast("Parent assigned.");
			await refresh();
		} catch (err) {
			toast(err instanceof ApiError ? JSON.stringify(err.data) : "Error", false);
		}
	};

	const handleDeleteSelected = async () => {
		if (selected.size === 0) return;
		const plural = selected.size > 1 ? "s" : "";
		if (!confirm(`Delete ${selected.size} student${plural}?`)) return;
		try {
			await apiFetch("/admin/delete-students", {
				method: "DELETE",
				body: JSON.stringify({ ids: Array.from(selected) }),
			});
			toast(`Deleted ${selected.size} student${plural}.`);
			await refresh();
		} catch (err) {
			toast(err instanceof ApiError ? JSON.stringify(err.data) : "Error", false);
		}
	};

	if (selectedId) return <StudentDetailPanel studentId={selectedId} onBack={() => navigateTo("students")} />;

	if (loading) return <p className="p-6 text-[#0D0F14]/50">Loading…</p>;

	return (
		<div className="flex flex-col min-h-[calc(100vh-56px)] md:min-h-screen">

			{/* Action bar */}
			<div className="border-b border-[#d4c9b0] bg-[#ede8df] px-6 py-3 flex items-center gap-3 flex-wrap shrink-0">
				<span className="text-xs font-semibold uppercase tracking-wider text-[#5b6072] mr-1">Students</span>
				{(["create-student", "assign-parent"] as const).map(key => (
					<button
						key={key}
						onClick={() => toggle(key)}
						className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors border ${
							action === key
								? "bg-[#D4AF37] border-[#D4AF37] text-[#0D0F14]"
								: "border-[#D4AF37]/70 text-[#D4AF37] hover:bg-[#D4AF37]/10"
						}`}
					>
						{key === "create-student" ? "Create Student" : "Assign Parent"}
					</button>
				))}
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

				{action === "create-student" && (
					<div className="bg-white rounded-xl border border-[#D4AF37]/30 p-5 max-w-md">
						<form onSubmit={handleCreate} className="flex flex-col gap-3">
							<input className={inputCls} placeholder="First name" value={createForm.fname} onChange={e => setCreateForm(f => ({ ...f, fname: e.target.value }))} required />
							<input className={inputCls} placeholder="Last name"  value={createForm.lname} onChange={e => setCreateForm(f => ({ ...f, lname: e.target.value }))} required />
							<select className={inputCls} value={createForm.parent_id} onChange={e => setCreateForm(f => ({ ...f, parent_id: e.target.value }))}>
								<option value="">No parent (optional)</option>
								{parents.map(p => <option key={p.id} value={p.id}>{p.fname} {p.lname}</option>)}
							</select>
							<button className={btnCls} type="submit">Create</button>
						</form>
					</div>
				)}

				{action === "assign-parent" && (
					<div className="bg-white rounded-xl border border-[#D4AF37]/30 p-5 max-w-md">
						<form onSubmit={handleAssign} className="flex flex-col gap-3">
							<select className={inputCls} value={assignForm.student_id} onChange={e => setAssignForm(f => ({ ...f, student_id: e.target.value }))} required>
								<option value="">Select student</option>
								{students.map(s => <option key={s.id} value={s.id}>{s.fname} {s.lname}</option>)}
							</select>
							<select className={inputCls} value={assignForm.parent_id} onChange={e => setAssignForm(f => ({ ...f, parent_id: e.target.value }))} required>
								<option value="">Select parent</option>
								{parents.map(p => <option key={p.id} value={p.id}>{p.fname} {p.lname}</option>)}
							</select>
							<button className={btnCls} type="submit">Assign</button>
						</form>
					</div>
				)}

				{/* Students table */}
				<div>
					<h3 className="font-semibold text-[#D4AF37] tracking-wide text-sm uppercase mb-4">All Students</h3>
					{students.length === 0 ? (
						<p className="text-[#0D0F14]/50 text-sm">No students yet.</p>
					) : (
						<table className="w-full text-sm border-collapse">
							<thead>
								<tr className="border-b border-[#D4AF37]/40 text-left">
									<th className="py-2 pr-3 w-8">
										<input
											ref={headerCheckRef}
											type="checkbox"
											checked={selected.size === students.length && students.length > 0}
											onChange={toggleAll}
											className="cursor-pointer accent-[#D4AF37]"
										/>
									</th>
									<th className="py-2 pr-4 text-[#0D0F14]/50 font-medium">ID</th>
									<th className="py-2 pr-4 text-[#0D0F14]/50 font-medium">Name</th>
									<th className="py-2 pr-4 text-[#0D0F14]/50 font-medium">Parent</th>
									<th className="py-2 text-[#0D0F14]/50 font-medium"></th>
								</tr>
							</thead>
							<tbody>
								{students.map(s => {
									const parent = parents.find(p => p.id === s.parent_id);
									const isSel  = selected.has(s.id);
									return (
										<tr
											key={s.id}
											onClick={() => toggleRow(s.id)}
											className={`border-b border-[#0D0F14]/8 cursor-pointer transition-colors ${
												isSel ? "bg-[#D4AF37]/10" : "hover:bg-white/40"
											}`}
										>
											<td className="py-2.5 pr-3">
												<input
													type="checkbox"
													checked={isSel}
													onChange={() => toggleRow(s.id)}
													onClick={e => e.stopPropagation()}
													className="cursor-pointer accent-[#D4AF37]"
												/>
											</td>
											<td className="py-2.5 pr-4 text-[#0D0F14]/40 text-xs">{s.id}</td>
											<td className="py-2.5 pr-4 font-medium text-[#0D0F14]">{s.fname} {s.lname}</td>
											<td className="py-2.5 pr-4 text-[#0D0F14]/60">{parent ? `${parent.fname} ${parent.lname}` : "—"}</td>
											<td className="py-2.5">
												<button onClick={e => { e.stopPropagation(); navigateTo("students", s.id); }} className="text-xs text-[#D4AF37] hover:underline font-medium">View →</button>
											</td>
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
