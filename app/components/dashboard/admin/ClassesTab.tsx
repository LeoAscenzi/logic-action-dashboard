"use client";
import { useEffect, useRef, useState } from "react";
import { useApiFetch } from "@/app/hooks/useApiFetch";
import { useAdminSection } from "@/app/context/AdminSectionContext";
import { ApiError } from "@/app/lib/api";

interface Class    { id: number; class_name: string; total_sessions: number; start_date: string; end_date: string; capacity: number; teacher_id: number | null; }
interface Teacher  { id: number; fname: string; lname: string; }
interface Student  { id: number; fname: string; lname: string; parent_id: number | null; }
interface Session  { id: number; class_id: number; class_date: string; class_duration: number; }
interface Attendance { id: number; class_session_id: number; student_id: number; participation_score: number | null; }

const inputCls = "rounded-lg border border-[#D4AF37]/60 bg-white/70 px-3 py-2 text-sm text-[#0D0F14] placeholder:text-[#0D0F14]/40 focus:outline-none focus:ring-1 focus:ring-[#D4AF37]";
const btnCls   = "rounded-lg bg-[#D4AF37] px-4 py-2 text-sm font-semibold text-[#0D0F14] hover:bg-[#c4a230] transition-colors";
const ghostBtn = "rounded-lg px-4 py-1.5 text-sm font-medium transition-colors border border-[#D4AF37]/70 text-[#D4AF37] hover:bg-[#D4AF37]/10";

function Breadcrumb({ parts }: { parts: { label: string; onClick?: () => void }[] }) {
	return (
		<nav className="flex items-center gap-1.5 text-sm text-[#0D0F14]/50 mb-4">
			{parts.map((p, i) => (
				<span key={i} className="flex items-center gap-1.5">
					{i > 0 && <span>/</span>}
					{p.onClick
						? <button onClick={p.onClick} className="hover:text-[#D4AF37] transition-colors">{p.label}</button>
						: <span className="text-[#0D0F14] font-medium">{p.label}</span>
					}
				</span>
			))}
		</nav>
	);
}

function ClassListView({ onViewClass }: { onViewClass: (id: number, name: string) => void }) {
	const apiFetch = useApiFetch();
	const [classes,  setClasses]  = useState<Class[]>([]);
	const [teachers, setTeachers] = useState<Teacher[]>([]);
	const [loading,  setLoading]  = useState(true);
	const [action,   setAction]   = useState<"create-class" | "add-session" | "edit-class" | null>(null);
	const [selected, setSelected] = useState<Set<number>>(new Set());
	const [msg,      setMsg]      = useState<{ text: string; ok: boolean } | null>(null);

	const emptyClassForm = { class_name: "", total_sessions: "", start_date: "", end_date: "", capacity: "", teacher_id: "" };
	const [classForm,   setClassForm]   = useState(emptyClassForm);
	const [sessionForm, setSessionForm] = useState({ class_id: "", class_duration: "", class_date: "" });
	const [editForm,    setEditForm]    = useState(emptyClassForm);

	const headerCheckRef = useRef<HTMLInputElement>(null);

	const refresh = async () => {
		const [c, t] = await Promise.all([
			apiFetch<Class[]>("/admin/classes"),
			apiFetch<Teacher[]>("/admin/teachers"),
		]);
		setClasses(c);
		setTeachers(t);
		setSelected(new Set());
	};

	useEffect(() => {
		refresh().finally(() => setLoading(false));  // eslint-disable-line react-hooks/set-state-in-effect
	}, []);  // eslint-disable-line react-hooks/exhaustive-deps

	useEffect(() => {
		if (headerCheckRef.current) {
			headerCheckRef.current.indeterminate = selected.size > 0 && selected.size < classes.length;
		}
	}, [selected, classes]);

	const toast = (text: string, ok = true) => { setMsg({ text, ok }); setTimeout(() => setMsg(null), 3000); };

	const toggle = (key: typeof action) => {
		if (key === "edit-class" && selected.size === 1) {
			const cls = classes.find(c => selected.has(c.id))!;
			setEditForm({
				class_name:     cls.class_name,
				total_sessions: String(cls.total_sessions),
				start_date:     cls.start_date,
				end_date:       cls.end_date,
				capacity:       String(cls.capacity),
				teacher_id:     cls.teacher_id ? String(cls.teacher_id) : "",
			});
		}
		setAction(a => a === key ? null : key);
	};

	const toggleRow = (id: number) => setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
	const toggleAll = () => setSelected(prev => prev.size === classes.length ? new Set() : new Set(classes.map(c => c.id)));

	const handleCreateClass = async (e: React.FormEvent) => {
		e.preventDefault();
		try {
			await apiFetch("/admin/create-class", { method: "POST", body: JSON.stringify({
				class_name:     classForm.class_name,
				total_sessions: parseInt(classForm.total_sessions),
				start_date:     classForm.start_date,
				end_date:       classForm.end_date,
				capacity:       parseInt(classForm.capacity),
			})});
			setClassForm(emptyClassForm);
			toast("Class created.");
			await refresh();
		} catch (err) { toast(err instanceof ApiError ? JSON.stringify(err.data) : "Error", false); }
	};

	const handleCreateSession = async (e: React.FormEvent) => {
		e.preventDefault();
		try {
			await apiFetch("/admin/create-session", { method: "POST", body: JSON.stringify({
				class_id:       parseInt(sessionForm.class_id),
				class_duration: parseInt(sessionForm.class_duration),
				class_date:     sessionForm.class_date,
			})});
			setSessionForm({ class_id: "", class_duration: "", class_date: "" });
			toast("Session added.");
		} catch (err) { toast(err instanceof ApiError ? JSON.stringify(err.data) : "Error", false); }
	};

	const handleEditClass = async (e: React.FormEvent) => {
		e.preventDefault();
		const [classId] = Array.from(selected);
		try {
			await apiFetch(`/admin/update-class/${classId}`, { method: "PATCH", body: JSON.stringify({
				class_name:     editForm.class_name,
				total_sessions: parseInt(editForm.total_sessions),
				start_date:     editForm.start_date,
				end_date:       editForm.end_date,
				capacity:       parseInt(editForm.capacity),
				teacher_id:     editForm.teacher_id ? parseInt(editForm.teacher_id) : null,
			})});
			setAction(null);
			toast("Class updated.");
			await refresh();
		} catch (err) { toast(err instanceof ApiError ? JSON.stringify(err.data) : "Error", false); }
	};

	const handleDeleteSelected = async () => {
		if (selected.size === 0) return;
		const plural = selected.size > 1 ? "es" : "";
		if (!confirm(`Delete ${selected.size} class${plural}? This will also remove all sessions and attendance records.`)) return;
		try {
			await apiFetch("/admin/delete-classes", { method: "DELETE", body: JSON.stringify({ ids: Array.from(selected) }) });
			setAction(null);
			toast(`Deleted ${selected.size} class${plural}.`);
			await refresh();
		} catch (err) { toast(err instanceof ApiError ? JSON.stringify(err.data) : "Error", false); }
	};

	if (loading) return <p className="p-6 text-[#0D0F14]/50">Loading…</p>;

	return (
		<div className="flex flex-col min-h-[calc(100vh-56px)] md:min-h-screen">
			<div className="border-b border-[#d4c9b0] bg-[#ede8df] px-6 py-3 flex items-center gap-3 flex-wrap shrink-0">
				<span className="text-xs font-semibold uppercase tracking-wider text-[#5b6072] mr-1">Classes</span>
				{(["create-class", "add-session"] as const).map(key => (
					<button key={key} onClick={() => toggle(key)} className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors border ${action === key ? "bg-[#D4AF37] border-[#D4AF37] text-[#0D0F14]" : "border-[#D4AF37]/70 text-[#D4AF37] hover:bg-[#D4AF37]/10"}`}>
						{key === "create-class" ? "Create Class" : "Add Session"}
					</button>
				))}
				<button onClick={() => toggle("edit-class")} disabled={selected.size !== 1} className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors border ${action === "edit-class" ? "bg-[#D4AF37] border-[#D4AF37] text-[#0D0F14]" : selected.size === 1 ? "border-[#D4AF37]/70 text-[#D4AF37] hover:bg-[#D4AF37]/10" : "border-[#0D0F14]/20 text-[#0D0F14]/30 cursor-not-allowed"}`}>Edit Class</button>
				<div className="flex-1" />
				{selected.size > 0 && (
					<button onClick={handleDeleteSelected} className="rounded-lg px-4 py-1.5 text-sm font-medium transition-colors border border-red-400/70 text-red-600 hover:bg-red-50">Delete ({selected.size})</button>
				)}
			</div>

			<div className="flex-1 p-6 overflow-auto flex flex-col gap-6">
				{msg && <p className={`text-sm font-medium ${msg.ok ? "text-green-700" : "text-red-600"}`}>{msg.text}</p>}

				{action === "create-class" && (
					<div className="bg-white rounded-xl border border-[#D4AF37]/30 p-5 max-w-md">
						<form onSubmit={handleCreateClass} className="flex flex-col gap-3">
							<input className={inputCls} placeholder="Class name" value={classForm.class_name} onChange={e => setClassForm(f => ({ ...f, class_name: e.target.value }))} required />
							<input className={inputCls} type="number" placeholder="Total sessions" value={classForm.total_sessions} onChange={e => setClassForm(f => ({ ...f, total_sessions: e.target.value }))} required />
							<div className="flex gap-3">
								<input className={inputCls + " flex-1"} type="date" value={classForm.start_date} onChange={e => setClassForm(f => ({ ...f, start_date: e.target.value }))} required />
								<input className={inputCls + " flex-1"} type="date" value={classForm.end_date}   onChange={e => setClassForm(f => ({ ...f, end_date: e.target.value }))} required />
							</div>
							<input className={inputCls} type="number" placeholder="Capacity" value={classForm.capacity} onChange={e => setClassForm(f => ({ ...f, capacity: e.target.value }))} required />
							<button className={btnCls} type="submit">Create Class</button>
						</form>
					</div>
				)}

				{action === "add-session" && (
					<div className="bg-white rounded-xl border border-[#D4AF37]/30 p-5 max-w-md">
						<form onSubmit={handleCreateSession} className="flex flex-col gap-3">
							<select className={inputCls} value={sessionForm.class_id} onChange={e => setSessionForm(f => ({ ...f, class_id: e.target.value }))} required>
								<option value="">Select class</option>
								{classes.map(c => <option key={c.id} value={c.id}>{c.class_name}</option>)}
							</select>
							<input className={inputCls} type="number" placeholder="Duration (minutes)" value={sessionForm.class_duration} onChange={e => setSessionForm(f => ({ ...f, class_duration: e.target.value }))} required />
							<input className={inputCls} type="date" value={sessionForm.class_date} onChange={e => setSessionForm(f => ({ ...f, class_date: e.target.value }))} required />
							<button className={btnCls} type="submit">Add Session</button>
						</form>
					</div>
				)}

				{action === "edit-class" && selected.size === 1 && (
					<div className="bg-white rounded-xl border border-[#D4AF37]/30 p-5 max-w-md">
						<form onSubmit={handleEditClass} className="flex flex-col gap-3">
							<input className={inputCls} placeholder="Class name" value={editForm.class_name} onChange={e => setEditForm(f => ({ ...f, class_name: e.target.value }))} required />
							<input className={inputCls} type="number" placeholder="Total sessions" value={editForm.total_sessions} onChange={e => setEditForm(f => ({ ...f, total_sessions: e.target.value }))} required />
							<div className="flex gap-3">
								<input className={inputCls + " flex-1"} type="date" value={editForm.start_date} onChange={e => setEditForm(f => ({ ...f, start_date: e.target.value }))} required />
								<input className={inputCls + " flex-1"} type="date" value={editForm.end_date}   onChange={e => setEditForm(f => ({ ...f, end_date: e.target.value }))} required />
							</div>
							<input className={inputCls} type="number" placeholder="Capacity" value={editForm.capacity} onChange={e => setEditForm(f => ({ ...f, capacity: e.target.value }))} required />
							<select className={inputCls} value={editForm.teacher_id} onChange={e => setEditForm(f => ({ ...f, teacher_id: e.target.value }))}>
								<option value="">No teacher assigned</option>
								{teachers.map(t => <option key={t.id} value={t.id}>{t.fname} {t.lname}</option>)}
							</select>
							<button className={btnCls} type="submit">Save Changes</button>
						</form>
					</div>
				)}

				<div>
					<h3 className="font-semibold text-[#D4AF37] tracking-wide text-sm uppercase mb-4">All Classes</h3>
					{classes.length === 0 ? (
						<p className="text-[#0D0F14]/50 text-sm">No classes yet.</p>
					) : (
						<table className="w-full text-sm border-collapse">
							<thead>
								<tr className="border-b border-[#D4AF37]/40 text-left">
									<th className="py-2 pr-3 w-8">
										<input ref={headerCheckRef} type="checkbox" checked={selected.size === classes.length && classes.length > 0} onChange={toggleAll} className="cursor-pointer accent-[#D4AF37]" />
									</th>
									<th className="py-2 pr-4 text-[#0D0F14]/50 font-medium">ID</th>
									<th className="py-2 pr-4 text-[#0D0F14]/50 font-medium">Name</th>
									<th className="py-2 pr-4 text-[#0D0F14]/50 font-medium">Sessions</th>
									<th className="py-2 pr-4 text-[#0D0F14]/50 font-medium">Start</th>
									<th className="py-2 pr-4 text-[#0D0F14]/50 font-medium">End</th>
									<th className="py-2 pr-4 text-[#0D0F14]/50 font-medium">Cap</th>
									<th className="py-2 pr-4 text-[#0D0F14]/50 font-medium">Teacher</th>
									<th className="py-2 text-[#0D0F14]/50 font-medium"></th>
								</tr>
							</thead>
							<tbody>
								{classes.map(c => {
									const isSel   = selected.has(c.id);
									const teacher = teachers.find(t => t.id === c.teacher_id);
									return (
										<tr key={c.id} onClick={() => toggleRow(c.id)} className={`border-b border-[#0D0F14]/8 cursor-pointer transition-colors ${isSel ? "bg-[#D4AF37]/10" : "hover:bg-white/40"}`}>
											<td className="py-2.5 pr-3">
												<input type="checkbox" checked={isSel} onChange={() => toggleRow(c.id)} onClick={e => e.stopPropagation()} className="cursor-pointer accent-[#D4AF37]" />
											</td>
											<td className="py-2.5 pr-4 text-[#0D0F14]/40 text-xs">{c.id}</td>
											<td className="py-2.5 pr-4 font-medium text-[#0D0F14]">{c.class_name}</td>
											<td className="py-2.5 pr-4 text-[#0D0F14]/60">{c.total_sessions}</td>
											<td className="py-2.5 pr-4 text-[#0D0F14]/60">{c.start_date}</td>
											<td className="py-2.5 pr-4 text-[#0D0F14]/60">{c.end_date}</td>
											<td className="py-2.5 pr-4 text-[#0D0F14]/60">{c.capacity}</td>
											<td className="py-2.5 pr-4 text-[#0D0F14]/60">{teacher ? `${teacher.fname} ${teacher.lname}` : <span className="text-[#0D0F14]/30">—</span>}</td>
											<td className="py-2.5">
												<button onClick={e => { e.stopPropagation(); onViewClass(c.id, c.class_name); }} className="text-xs text-[#D4AF37] hover:underline font-medium">View →</button>
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

function ClassDetailView({
	classId,
	className,
	onBack,
	onViewSession,
	onViewStudent,
}: {
	classId: number;
	className: string;
	onBack: () => void;
	onViewSession: (sessionId: number, sessionDate: string) => void;
	onViewStudent: (studentId: number) => void;
}) {
	const apiFetch = useApiFetch();
	const [cls,              setCls]              = useState<Class | null>(null);
	const [sessions,         setSessions]         = useState<Session[]>([]);
	const [enrolledStudents, setEnrolledStudents] = useState<Student[]>([]);
	const [allStudents,      setAllStudents]      = useState<Student[]>([]);
	const [teachers,         setTeachers]         = useState<Teacher[]>([]);
	const [loading,          setLoading]          = useState(true);
	const [showEdit,         setShowEdit]         = useState(false);
	const [msg,              setMsg]              = useState<{ text: string; ok: boolean } | null>(null);

	const emptyEdit = { class_name: "", total_sessions: "", start_date: "", end_date: "", capacity: "", teacher_id: "" };
	const [editForm,    setEditForm]    = useState(emptyEdit);
	const [enrollId,    setEnrollId]    = useState("");
	const [sessionForm, setSessionForm] = useState({ class_duration: "", class_date: "" });

	const toast = (text: string, ok = true) => { setMsg({ text, ok }); setTimeout(() => setMsg(null), 3000); };

	const refresh = async () => {
		const [classesAll, sessionsData, enrolledData, studentsAll, teachersAll] = await Promise.all([
			apiFetch<Class[]>("/admin/classes"),
			apiFetch<Session[]>(`/admin/classes/${classId}/sessions`),
			apiFetch<Student[]>(`/admin/classes/${classId}/students`),
			apiFetch<Student[]>("/admin/students"),
			apiFetch<Teacher[]>("/admin/teachers"),
		]);
		const found = classesAll.find(c => c.id === classId) ?? null;
		setCls(found);
		if (found) {
			setEditForm({
				class_name:     found.class_name,
				total_sessions: String(found.total_sessions),
				start_date:     found.start_date,
				end_date:       found.end_date,
				capacity:       String(found.capacity),
				teacher_id:     found.teacher_id ? String(found.teacher_id) : "",
			});
		}
		setSessions(sessionsData);
		setEnrolledStudents(enrolledData);
		setAllStudents(studentsAll);
		setTeachers(teachersAll);
	};

	useEffect(() => {
		refresh().finally(() => setLoading(false));  // eslint-disable-line react-hooks/set-state-in-effect
	}, [classId]);  // eslint-disable-line react-hooks/exhaustive-deps

	const handleEditClass = async (e: React.FormEvent) => {
		e.preventDefault();
		try {
			await apiFetch(`/admin/update-class/${classId}`, { method: "PATCH", body: JSON.stringify({
				class_name:     editForm.class_name,
				total_sessions: parseInt(editForm.total_sessions),
				start_date:     editForm.start_date,
				end_date:       editForm.end_date,
				capacity:       parseInt(editForm.capacity),
				teacher_id:     editForm.teacher_id ? parseInt(editForm.teacher_id) : null,
			})});
			setShowEdit(false);
			toast("Class updated.");
			await refresh();
		} catch (err) { toast(err instanceof ApiError ? JSON.stringify(err.data) : "Error", false); }
	};

	const handleEnroll = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!enrollId) return;
		try {
			await apiFetch(`/admin/classes/${classId}/students`, { method: "POST", body: JSON.stringify({ student_id: parseInt(enrollId) }) });
			setEnrollId("");
			toast("Student enrolled.");
			await refresh();
		} catch (err) { toast(err instanceof ApiError ? JSON.stringify(err.data) : "Error", false); }
	};

	const handleUnenroll = async (studentId: number) => {
		if (!confirm("Remove this student from the class?")) return;
		try {
			await apiFetch(`/admin/classes/${classId}/students/${studentId}`, { method: "DELETE" });
			toast("Student removed.");
			await refresh();
		} catch (err) { toast(err instanceof ApiError ? JSON.stringify(err.data) : "Error", false); }
	};

	const handleAddSession = async (e: React.FormEvent) => {
		e.preventDefault();
		try {
			await apiFetch("/admin/create-session", { method: "POST", body: JSON.stringify({
				class_id:       classId,
				class_duration: parseInt(sessionForm.class_duration),
				class_date:     sessionForm.class_date,
			})});
			setSessionForm({ class_duration: "", class_date: "" });
			toast("Session added.");
			await refresh();
		} catch (err) { toast(err instanceof ApiError ? JSON.stringify(err.data) : "Error", false); }
	};

	const handleDeleteSession = async (sessionId: number) => {
		if (!confirm("Delete this session and all its attendance records?")) return;
		try {
			await apiFetch(`/admin/sessions/${sessionId}`, { method: "DELETE" });
			toast("Session deleted.");
			await refresh();
		} catch (err) { toast(err instanceof ApiError ? JSON.stringify(err.data) : "Error", false); }
	};

	const enrolledIds = new Set(enrolledStudents.map(s => s.id));
	const unenrolledStudents = allStudents.filter(s => !enrolledIds.has(s.id));

	if (loading) return <p className="p-6 text-[#0D0F14]/50">Loading…</p>;
	if (!cls) return <p className="p-6 text-[#0D0F14]/50">Class not found.</p>;

	const teacher = teachers.find(t => t.id === cls.teacher_id);

	return (
		<div className="flex flex-col min-h-[calc(100vh-56px)] md:min-h-screen">
			<div className="border-b border-[#d4c9b0] bg-[#ede8df] px-6 py-3 flex items-center gap-3 shrink-0">
				<button onClick={onBack} className="text-[#5b6072] hover:text-[#0D0F14] transition-colors text-sm">← Back</button>
			</div>

			<div className="flex-1 p-6 overflow-auto flex flex-col gap-8">
				{msg && <p className={`text-sm font-medium ${msg.ok ? "text-green-700" : "text-red-600"}`}>{msg.text}</p>}

				<Breadcrumb parts={[{ label: "All Classes", onClick: onBack }, { label: cls.class_name }]} />

				<div>
					<div className="flex items-center gap-3 mb-3">
						<h2 className="text-lg font-semibold text-[#0D0F14]">{cls.class_name}</h2>
						<span className="text-[#0D0F14]/40 text-sm">{cls.start_date} – {cls.end_date}</span>
						{teacher && <span className="text-xs bg-[#D4AF37]/15 text-[#0D0F14]/70 px-2 py-0.5 rounded-full">{teacher.fname} {teacher.lname}</span>}
						<button onClick={() => setShowEdit(v => !v)} className={ghostBtn}>{showEdit ? "Cancel" : "Edit Class"}</button>
					</div>
					{showEdit && (
						<div className="bg-white rounded-xl border border-[#D4AF37]/30 p-5 max-w-md">
							<form onSubmit={handleEditClass} className="flex flex-col gap-3">
								<input className={inputCls} placeholder="Class name" value={editForm.class_name} onChange={e => setEditForm(f => ({ ...f, class_name: e.target.value }))} required />
								<input className={inputCls} type="number" placeholder="Total sessions" value={editForm.total_sessions} onChange={e => setEditForm(f => ({ ...f, total_sessions: e.target.value }))} required />
								<div className="flex gap-3">
									<input className={inputCls + " flex-1"} type="date" value={editForm.start_date} onChange={e => setEditForm(f => ({ ...f, start_date: e.target.value }))} required />
									<input className={inputCls + " flex-1"} type="date" value={editForm.end_date}   onChange={e => setEditForm(f => ({ ...f, end_date: e.target.value }))} required />
								</div>
								<input className={inputCls} type="number" placeholder="Capacity" value={editForm.capacity} onChange={e => setEditForm(f => ({ ...f, capacity: e.target.value }))} required />
								<select className={inputCls} value={editForm.teacher_id} onChange={e => setEditForm(f => ({ ...f, teacher_id: e.target.value }))}>
									<option value="">No teacher assigned</option>
									{teachers.map(t => <option key={t.id} value={t.id}>{t.fname} {t.lname}</option>)}
								</select>
								<button className={btnCls} type="submit">Save Changes</button>
							</form>
						</div>
					)}
				</div>

				<div>
					<h3 className="font-semibold text-[#D4AF37] tracking-wide text-sm uppercase mb-3">Enrolled Students</h3>
					<form onSubmit={handleEnroll} className="flex gap-2 mb-4 max-w-sm">
						<select className={inputCls + " flex-1"} value={enrollId} onChange={e => setEnrollId(e.target.value)} required>
							<option value="">Enroll a student…</option>
							{unenrolledStudents.map(s => <option key={s.id} value={s.id}>{s.fname} {s.lname}</option>)}
						</select>
						<button className={btnCls} type="submit">Enroll</button>
					</form>
					{enrolledStudents.length === 0 ? (
						<p className="text-[#0D0F14]/50 text-sm">No students enrolled yet.</p>
					) : (
						<table className="w-full text-sm border-collapse max-w-xl">
							<thead>
								<tr className="border-b border-[#D4AF37]/40 text-left">
									<th className="py-2 pr-4 text-[#0D0F14]/50 font-medium">Name</th>
									<th className="py-2 text-[#0D0F14]/50 font-medium"></th>
								</tr>
							</thead>
							<tbody>
								{enrolledStudents.map(s => (
									<tr key={s.id} className="border-b border-[#0D0F14]/8">
										<td className="py-2.5 pr-4 font-medium text-[#0D0F14]">{s.fname} {s.lname}</td>
										<td className="py-2.5 flex items-center gap-3">
											<button onClick={() => onViewStudent(s.id)} className="text-xs text-[#D4AF37] hover:underline font-medium">View →</button>
											<button onClick={() => handleUnenroll(s.id)} className="text-xs text-red-500 hover:underline">Remove</button>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					)}
				</div>

				<div>
					<h3 className="font-semibold text-[#D4AF37] tracking-wide text-sm uppercase mb-3">Sessions</h3>
					<form onSubmit={handleAddSession} className="flex gap-2 mb-4 max-w-sm flex-wrap">
						<input className={inputCls + " flex-1"} type="date" placeholder="Date" value={sessionForm.class_date} onChange={e => setSessionForm(f => ({ ...f, class_date: e.target.value }))} required />
						<input className={inputCls + " w-40"} type="number" placeholder="Duration (min)" value={sessionForm.class_duration} onChange={e => setSessionForm(f => ({ ...f, class_duration: e.target.value }))} required />
						<button className={btnCls} type="submit">Add Session</button>
					</form>
					{sessions.length === 0 ? (
						<p className="text-[#0D0F14]/50 text-sm">No sessions yet.</p>
					) : (
						<table className="w-full text-sm border-collapse max-w-xl">
							<thead>
								<tr className="border-b border-[#D4AF37]/40 text-left">
									<th className="py-2 pr-4 text-[#0D0F14]/50 font-medium">Date</th>
									<th className="py-2 pr-4 text-[#0D0F14]/50 font-medium">Duration</th>
									<th className="py-2 text-[#0D0F14]/50 font-medium"></th>
								</tr>
							</thead>
							<tbody>
								{sessions.map(s => (
									<tr key={s.id} className="border-b border-[#0D0F14]/8">
										<td className="py-2.5 pr-4 font-medium text-[#0D0F14]">{s.class_date}</td>
										<td className="py-2.5 pr-4 text-[#0D0F14]/60">{s.class_duration} min</td>
										<td className="py-2.5 flex items-center gap-3">
											<button onClick={() => onViewSession(s.id, s.class_date)} className="text-xs text-[#D4AF37] hover:underline font-medium">View →</button>
											<button onClick={() => handleDeleteSession(s.id)} className="text-xs text-red-500 hover:underline">Delete</button>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					)}
				</div>
			</div>
		</div>
	);
}

function SessionDetailView({
	classId,
	sessionId,
	className,
	sessionDate,
	onBack,
}: {
	classId: number;
	sessionId: number;
	className: string;
	sessionDate: string;
	onBack: () => void;
}) {
	const apiFetch = useApiFetch();
	const [attendance,       setAttendance]       = useState<Attendance[]>([]);
	const [enrolledStudents, setEnrolledStudents] = useState<Student[]>([]);
	const [loading,          setLoading]          = useState(true);
	const [msg,              setMsg]              = useState<{ text: string; ok: boolean } | null>(null);
	const [addStudentId,     setAddStudentId]     = useState("");
	const [addScore,         setAddScore]         = useState("");
	const [editingId,        setEditingId]        = useState<number | null>(null);
	const [editScore,        setEditScore]        = useState("");

	const toast = (text: string, ok = true) => { setMsg({ text, ok }); setTimeout(() => setMsg(null), 3000); };

	const refresh = async () => {
		const [att, students] = await Promise.all([
			apiFetch<Attendance[]>(`/admin/sessions/${sessionId}/attendance`),
			apiFetch<Student[]>(`/admin/classes/${classId}/students`),
		]);
		setAttendance(att);
		setEnrolledStudents(students);
	};

	useEffect(() => {
		refresh().finally(() => setLoading(false));  // eslint-disable-line react-hooks/set-state-in-effect
	}, [sessionId]);  // eslint-disable-line react-hooks/exhaustive-deps

	const handleAdd = async (e: React.FormEvent) => {
		e.preventDefault();
		try {
			await apiFetch(`/admin/sessions/${sessionId}/attendance`, { method: "POST", body: JSON.stringify({
				student_id:          parseInt(addStudentId),
				participation_score: addScore ? parseInt(addScore) : null,
			})});
			setAddStudentId("");
			setAddScore("");
			toast("Attendance added.");
			await refresh();
		} catch (err) { toast(err instanceof ApiError ? JSON.stringify(err.data) : "Error", false); }
	};

	const handleUpdateScore = async (attendanceId: number) => {
		try {
			await apiFetch(`/admin/attendance/${attendanceId}`, { method: "PATCH", body: JSON.stringify({ participation_score: editScore ? parseInt(editScore) : null }) });
			setEditingId(null);
			setEditScore("");
			toast("Score updated.");
			await refresh();
		} catch (err) { toast(err instanceof ApiError ? JSON.stringify(err.data) : "Error", false); }
	};

	const handleDelete = async (attendanceId: number) => {
		if (!confirm("Remove this attendance record?")) return;
		try {
			await apiFetch(`/admin/attendance/${attendanceId}`, { method: "DELETE" });
			toast("Attendance removed.");
			await refresh();
		} catch (err) { toast(err instanceof ApiError ? JSON.stringify(err.data) : "Error", false); }
	};

	const markedIds = new Set(attendance.map(a => a.student_id));
	const unmarkedStudents = enrolledStudents.filter(s => !markedIds.has(s.id));
	const studentMap = Object.fromEntries(enrolledStudents.map(s => [s.id, s]));

	if (loading) return <p className="p-6 text-[#0D0F14]/50">Loading…</p>;

	return (
		<div className="flex flex-col min-h-[calc(100vh-56px)] md:min-h-screen">
			<div className="border-b border-[#d4c9b0] bg-[#ede8df] px-6 py-3 flex items-center gap-3 shrink-0">
				<button onClick={onBack} className="text-[#5b6072] hover:text-[#0D0F14] transition-colors text-sm">← Back</button>
			</div>

			<div className="flex-1 p-6 overflow-auto flex flex-col gap-6">
				{msg && <p className={`text-sm font-medium ${msg.ok ? "text-green-700" : "text-red-600"}`}>{msg.text}</p>}

				<Breadcrumb parts={[
					{ label: "All Classes", onClick: () => { onBack(); onBack(); } },
					{ label: className, onClick: onBack },
					{ label: sessionDate },
				]} />

				{unmarkedStudents.length > 0 && (
					<div className="bg-white rounded-xl border border-[#D4AF37]/30 p-5 max-w-md">
						<h4 className="text-xs font-semibold uppercase tracking-wider text-[#5b6072] mb-3">Add Attendance</h4>
						<form onSubmit={handleAdd} className="flex flex-col gap-3">
							<select className={inputCls} value={addStudentId} onChange={e => setAddStudentId(e.target.value)} required>
								<option value="">Select student</option>
								{unmarkedStudents.map(s => <option key={s.id} value={s.id}>{s.fname} {s.lname}</option>)}
							</select>
							<input className={inputCls} type="number" placeholder="Participation score (optional)" value={addScore} onChange={e => setAddScore(e.target.value)} />
							<button className={btnCls} type="submit">Add</button>
						</form>
					</div>
				)}

				<div>
					<h3 className="font-semibold text-[#D4AF37] tracking-wide text-sm uppercase mb-3">Attendance</h3>
					{attendance.length === 0 ? (
						<p className="text-[#0D0F14]/50 text-sm">No attendance records yet.</p>
					) : (
						<table className="w-full text-sm border-collapse max-w-xl">
							<thead>
								<tr className="border-b border-[#D4AF37]/40 text-left">
									<th className="py-2 pr-4 text-[#0D0F14]/50 font-medium">Student</th>
									<th className="py-2 pr-4 text-[#0D0F14]/50 font-medium">Score</th>
									<th className="py-2 text-[#0D0F14]/50 font-medium"></th>
								</tr>
							</thead>
							<tbody>
								{attendance.map(a => {
									const student = studentMap[a.student_id];
									return (
										<tr key={a.id} className="border-b border-[#0D0F14]/8">
											<td className="py-2.5 pr-4 font-medium text-[#0D0F14]">
												{student ? `${student.fname} ${student.lname}` : `Student #${a.student_id}`}
											</td>
											<td className="py-2.5 pr-4 text-[#0D0F14]/60">
												{editingId === a.id ? (
													<input
														className={inputCls + " py-1 w-24"}
														type="number"
														value={editScore}
														autoFocus
														onChange={e => setEditScore(e.target.value)}
														onBlur={() => handleUpdateScore(a.id)}
														onKeyDown={e => { if (e.key === "Enter") handleUpdateScore(a.id); if (e.key === "Escape") { setEditingId(null); setEditScore(""); } }}
													/>
												) : (
													<button onClick={() => { setEditingId(a.id); setEditScore(String(a.participation_score ?? "")); }} className="hover:text-[#D4AF37] transition-colors">
														{a.participation_score ?? <span className="text-[#0D0F14]/30">—</span>}
													</button>
												)}
											</td>
											<td className="py-2.5">
												<button onClick={() => handleDelete(a.id)} className="text-xs text-red-500 hover:underline">Remove</button>
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

export default function ClassesTab() {
	const { selectedId, navigateTo } = useAdminSection();
	const [view,            setView]           = useState<"list" | "class" | "session">(selectedId ? "class" : "list");
	const [selectedClassId, setSelectedClassId] = useState<number | null>(selectedId ?? null);
	const [selectedSessId,  setSelectedSessId]  = useState<number | null>(null);
	const [className,       setClassName]       = useState("");
	const [sessionDate,     setSessionDate]     = useState("");

	useEffect(() => {
		if (selectedId) {
			setSelectedClassId(selectedId);
			setClassName("");
			setView("class");
		}
	}, [selectedId]);

	if (view === "session" && selectedClassId && selectedSessId) {
		return (
			<SessionDetailView
				classId={selectedClassId}
				sessionId={selectedSessId}
				className={className}
				sessionDate={sessionDate}
				onBack={() => setView("class")}
			/>
		);
	}

	if (view === "class" && selectedClassId) {
		return (
			<ClassDetailView
				classId={selectedClassId}
				className={className}
				onBack={() => { setView("list"); setSelectedClassId(null); }}
				onViewSession={(sid, date) => { setSelectedSessId(sid); setSessionDate(date); setView("session"); }}
				onViewStudent={(sid) => navigateTo("students", sid)}
			/>
		);
	}

	return (
		<ClassListView
			onViewClass={(id, name) => { setSelectedClassId(id); setClassName(name); setView("class"); }}
		/>
	);
}
