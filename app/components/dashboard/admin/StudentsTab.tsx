"use client";
import { useEffect, useRef, useState } from "react";
import { useApiFetch } from "@/app/hooks/useApiFetch";
import { useRouter, useSearchParams } from "next/navigation";
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

const inputCls = "rounded-lg border border-gold/60 bg-white/70 px-3 py-2 text-sm text-ink placeholder:text-ink/40 focus:outline-none focus:ring-1 focus:ring-gold";
const btnCls   = "rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-ink hover:bg-gold-light transition-colors";

function StudentDetailPanel({ studentId, onBack }: { studentId: number; onBack: () => void }) {
	const apiFetch = useApiFetch();
	const router   = useRouter();
	const [detail,   setDetail]   = useState<StudentDetail | null>(null);
	const [parents,  setParents]  = useState<Parent[]>([]);
	const [loading,  setLoading]  = useState(true);
	const [assignPid, setAssignPid] = useState("");
	const [assigning, setAssigning] = useState(false);
	const [deleting,  setDeleting]  = useState(false);
	const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

	const toast = (text: string, ok = true) => {
		setMsg({ text, ok });
		setTimeout(() => setMsg(null), 3000);
	};

	useEffect(() => {
		Promise.all([
			apiFetch<StudentDetail>(`/admin/students/${studentId}`),
			apiFetch<Parent[]>("/admin/parents"),
		]).then(([d, p]) => { setDetail(d); setParents(p); })
			.finally(() => setLoading(false));
	}, [studentId]);  // eslint-disable-line react-hooks/exhaustive-deps

	const handleAssign = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!assignPid) return;
		setAssigning(true);
		try {
			await apiFetch(`/admin/assign-student/${studentId}`, {
				method: "PATCH",
				body: JSON.stringify({ parent_id: parseInt(assignPid) }),
			});
			const updated = await apiFetch<StudentDetail>(`/admin/students/${studentId}`);
			setDetail(updated);
			setAssignPid("");
			toast("Parent assigned.");
		} catch (err) {
			toast(err instanceof ApiError ? "Failed to assign parent." : "Error", false);
		} finally {
			setAssigning(false);
		}
	};

	const handleDelete = async () => {
		if (!confirm(`Delete ${detail?.fname} ${detail?.lname}? This cannot be undone.`)) return;
		setDeleting(true);
		try {
			await apiFetch("/admin/delete-students", {
				method: "DELETE",
				body: JSON.stringify({ ids: [studentId] }),
			});
			onBack();
		} catch {
			toast("Failed to delete student.", false);
			setDeleting(false);
		}
	};

	if (loading) return <p className="p-6 text-ink/50">Loading…</p>;
	if (!detail)  return <p className="p-6 text-ink/50">Student not found.</p>;

	const currentParent = parents.find(p => p.id === detail.parent_id);

	return (
		<div className="flex flex-col min-h-[calc(100vh-56px)] md:min-h-screen">
			<div className="border-b border-cream-dim bg-[#ede8df] px-6 py-3 flex items-center gap-3 shrink-0">
				<button onClick={onBack} className="text-ink-soft hover:text-ink transition-colors text-sm">← All Students</button>
				<div className="flex-1" />
				<button
					onClick={handleDelete}
					disabled={deleting}
					className="rounded-lg px-3 py-1.5 text-sm font-medium border border-red-400/70 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-40"
				>
					{deleting ? "Deleting…" : "Delete Student"}
				</button>
			</div>
			<div className="flex-1 p-6 overflow-auto flex flex-col gap-6">
				<nav className="flex items-center gap-1.5 text-sm text-ink/50">
					<button onClick={onBack} className="hover:text-gold transition-colors">All Students</button>
					<span>/</span>
					<span className="text-ink font-medium">{detail.fname} {detail.lname}</span>
				</nav>

				{msg && (
					<p className={`text-sm font-medium ${msg.ok ? "text-green-700" : "text-red-600"}`}>{msg.text}</p>
				)}

				<div className="bg-white rounded-xl border border-gold/30 p-5 max-w-md flex flex-col gap-3">
					<h2 className="text-lg font-semibold text-ink">{detail.fname} {detail.lname}</h2>
					<p className="text-sm text-ink/60">
						Parent:{" "}
						{currentParent
							? <span className="text-ink">{currentParent.fname} {currentParent.lname}</span>
							: <span className="text-ink/30">None assigned</span>
						}
					</p>
					<p className="text-sm text-ink/60">Exams on record: {detail.exam_count}</p>

					<form onSubmit={handleAssign} className="flex gap-2 pt-1 border-t border-gold/20">
						<select
							className={`${inputCls} flex-1`}
							value={assignPid}
							onChange={e => setAssignPid(e.target.value)}
							required
						>
							<option value="">Assign parent…</option>
							{parents.map(p => (
								<option key={p.id} value={p.id}>{p.fname} {p.lname}</option>
							))}
						</select>
						<button
							type="submit"
							disabled={assigning || !assignPid}
							className="rounded-lg bg-gold px-3 py-2 text-sm font-semibold text-ink hover:bg-gold-light transition-colors disabled:opacity-40"
						>
							{assigning ? "…" : "Assign"}
						</button>
					</form>
				</div>

				<div>
					<h3 className="font-semibold text-gold tracking-wide text-sm uppercase mb-3">Enrolled Classes</h3>
					{detail.enrolled_classes.length === 0 ? (
						<p className="text-ink/50 text-sm">Not enrolled in any classes.</p>
					) : (
						<ul className="flex flex-col gap-2 max-w-sm">
							{detail.enrolled_classes.map(c => (
								<li key={c.id}>
									<button
										onClick={() => router.push(`/dashboard/admin/classes?class=${c.id}`)}
										className="w-full text-left bg-white rounded-lg border border-gold/20 px-4 py-2.5 text-sm font-medium text-ink hover:border-gold/60 hover:bg-gold/5 transition-colors"
									>
										{c.class_name} <span className="text-gold ml-1">→</span>
									</button>
								</li>
							))}
						</ul>
					)}
				</div>
			</div>
		</div>
	);
}

export default function StudentsTab() {
	const apiFetch    = useApiFetch();
	const router      = useRouter();
	const searchParams = useSearchParams();
	const selectedId  = Number(searchParams.get("student")) || null;
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

	if (selectedId) return <StudentDetailPanel studentId={selectedId} onBack={() => router.push("/dashboard/admin/students")} />;

	if (loading) return <p className="p-6 text-ink/50">Loading…</p>;

	return (
		<div className="flex flex-col min-h-[calc(100vh-56px)] md:min-h-screen">

			{/* Action bar */}
			<div className="border-b border-cream-dim bg-[#ede8df] px-6 py-3 flex items-center gap-3 flex-wrap shrink-0">
				<span className="text-xs font-semibold uppercase tracking-wider text-ink-soft mr-1">Students</span>
				{(["create-student", "assign-parent"] as const).map(key => (
					<button
						key={key}
						onClick={() => toggle(key)}
						className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors border ${
							action === key
								? "bg-gold border-gold text-ink"
								: "border-gold/70 text-gold hover:bg-gold/10"
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
					<div className="bg-white rounded-xl border border-gold/30 p-5 max-w-md">
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
					<div className="bg-white rounded-xl border border-gold/30 p-5 max-w-md">
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
					<h3 className="font-semibold text-gold tracking-wide text-sm uppercase mb-4">All Students</h3>
					{students.length === 0 ? (
						<p className="text-ink/50 text-sm">No students yet.</p>
					) : (
						<div className="overflow-x-auto"><table className="w-full text-sm border-collapse">
							<thead>
								<tr className="border-b border-gold/40 text-left">
									<th className="py-2 pr-3 w-8">
										<input
											ref={headerCheckRef}
											type="checkbox"
											checked={selected.size === students.length && students.length > 0}
											onChange={toggleAll}
											className="cursor-pointer accent-gold"
										/>
									</th>
									<th className="py-2 pr-4 text-ink/50 font-medium">ID</th>
									<th className="py-2 pr-4 text-ink/50 font-medium">Name</th>
									<th className="py-2 pr-4 text-ink/50 font-medium">Parent</th>
									<th className="py-2 text-ink/50 font-medium"></th>
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
											className={`border-b border-ink/8 cursor-pointer transition-colors ${
												isSel ? "bg-gold/10" : "hover:bg-white/40"
											}`}
										>
											<td className="py-2.5 pr-3">
												<input
													type="checkbox"
													checked={isSel}
													onChange={() => toggleRow(s.id)}
													onClick={e => e.stopPropagation()}
													className="cursor-pointer accent-gold"
												/>
											</td>
											<td className="py-2.5 pr-4 text-ink/40 text-xs">{s.id}</td>
											<td className="py-2.5 pr-4 font-medium text-ink">{s.fname} {s.lname}</td>
											<td className="py-2.5 pr-4 text-ink/60">{parent ? `${parent.fname} ${parent.lname}` : "—"}</td>
											<td className="py-2.5">
												<button onClick={e => { e.stopPropagation(); router.push(`/dashboard/admin/students?student=${s.id}`); }} className="text-xs text-gold hover:underline font-medium">View →</button>
											</td>
										</tr>
									);
								})}
							</tbody>
						</table></div>
					)}
				</div>

			</div>
		</div>
	);
}
