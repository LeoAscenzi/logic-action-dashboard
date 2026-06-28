"use client";
import { useEffect, useState } from "react";
import { useRequireAuth } from "@/app/hooks/useRequireAuth";
import { useApiFetch } from "@/app/hooks/useApiFetch";
import { ApiError } from "@/app/lib/api";

// ── Types ──────────────────────────────────────────────────────────────────────

interface Class      { id: number; class_name: string; total_sessions: number; start_date: string; end_date: string; capacity: number; }
interface Session    { id: number; class_id: number; class_duration: number; class_date: string; }
interface Student    { id: number; fname: string; lname: string; }
interface Attendance { id: number; class_session_id: number; student_id: number; participation_score: number | null; }

type View = "classes" | "class-detail" | "session";
type ClassTab = "sessions" | "students";

// ── Sub-views ──────────────────────────────────────────────────────────────────

const inputCls = "rounded-lg border border-[#D4AF37]/60 bg-white/70 px-3 py-2 text-sm text-[#0D0F14] placeholder:text-[#0D0F14]/40 focus:outline-none focus:ring-1 focus:ring-[#D4AF37]";
const btnCls   = "rounded-lg bg-[#D4AF37] px-4 py-2 text-sm font-semibold text-[#0D0F14] hover:bg-[#c4a230] transition-colors";
const backBtn  = "flex items-center gap-1.5 text-sm text-[#D4AF37] hover:text-[#c4a230] transition-colors mb-4";

// ── Classes list view ──────────────────────────────────────────────────────────

function ClassesView({ classes, onSelect }: { classes: Class[]; onSelect: (c: Class) => void }) {
	if (classes.length === 0) return <p className="text-[#0D0F14]/50 text-sm p-6">No classes assigned to you yet.</p>;
	return (
		<div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
			{classes.map(c => (
				<button
					key={c.id}
					onClick={() => onSelect(c)}
					className="text-left bg-white rounded-2xl border border-[#D4AF37]/30 p-5 hover:border-[#D4AF37] hover:shadow-md transition-all flex flex-col gap-2"
				>
					<span className="font-semibold text-[#0D0F14]">{c.class_name}</span>
					<span className="text-xs text-[#0D0F14]/50">{c.total_sessions} sessions · cap {c.capacity}</span>
					<span className="text-xs text-[#0D0F14]/40">{c.start_date} → {c.end_date}</span>
				</button>
			))}
		</div>
	);
}

// ── Class detail view ──────────────────────────────────────────────────────────

function ClassDetailView({
	class_: cls,
	onBack,
	onSession,
}: {
	class_: Class;
	onBack: () => void;
	onSession: (s: Session) => void;
}) {
	const apiFetch = useApiFetch();
	const [tab,      setTab]      = useState<ClassTab>("sessions");
	const [sessions, setSessions] = useState<Session[]>([]);
	const [students, setStudents] = useState<Student[]>([]);
	const [loading,  setLoading]  = useState(true);

	useEffect(() => {
		Promise.all([
			apiFetch<Session[]>(`/teacher/classes/${cls.id}/sessions`),
			apiFetch<Student[]>(`/teacher/classes/${cls.id}/students`),
		]).then(([s, st]) => {
			setSessions(s);
			setStudents(st);
		}).finally(() => setLoading(false));
	}, [cls.id]);  // eslint-disable-line react-hooks/exhaustive-deps

	if (loading) return <p className="p-6 text-[#0D0F14]/50">Loading…</p>;

	return (
		<div className="p-6 flex flex-col gap-4">
			<button onClick={onBack} className={backBtn}>
				← Back to Classes
			</button>
			<h2 className="text-xl font-semibold text-[#0D0F14]">{cls.class_name}</h2>
			<p className="text-sm text-[#0D0F14]/50">{cls.start_date} → {cls.end_date} · {cls.total_sessions} sessions · cap {cls.capacity}</p>

			{/* Tabs */}
			<div className="flex gap-2 border-b border-[#D4AF37]/30 pb-0">
				{(["sessions", "students"] as const).map(t => (
					<button
						key={t}
						onClick={() => setTab(t)}
						className={`px-4 py-2 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
							tab === t
								? "border-[#D4AF37] text-[#D4AF37]"
								: "border-transparent text-[#0D0F14]/50 hover:text-[#0D0F14]"
						}`}
					>
						{t}
					</button>
				))}
			</div>

			{tab === "sessions" && (
				sessions.length === 0
					? <p className="text-[#0D0F14]/50 text-sm">No sessions yet.</p>
					: <table className="w-full text-sm border-collapse mt-2">
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
									<td className="py-2.5">
										<button
											onClick={() => onSession(s)}
											className="text-xs text-[#D4AF37] hover:text-[#c4a230] font-medium transition-colors"
										>
											Attendance →
										</button>
									</td>
								</tr>
							))}
						</tbody>
					</table>
			)}

			{tab === "students" && (
				students.length === 0
					? <p className="text-[#0D0F14]/50 text-sm">No students have attendance records for this class yet.</p>
					: <table className="w-full text-sm border-collapse mt-2">
						<thead>
							<tr className="border-b border-[#D4AF37]/40 text-left">
								<th className="py-2 pr-4 text-[#0D0F14]/50 font-medium">ID</th>
								<th className="py-2 text-[#0D0F14]/50 font-medium">Name</th>
							</tr>
						</thead>
						<tbody>
							{students.map(s => (
								<tr key={s.id} className="border-b border-[#0D0F14]/8">
									<td className="py-2.5 pr-4 text-[#0D0F14]/40 text-xs">{s.id}</td>
									<td className="py-2.5 font-medium text-[#0D0F14]">{s.fname} {s.lname}</td>
								</tr>
							))}
						</tbody>
					</table>
			)}
		</div>
	);
}

// ── Session attendance view ────────────────────────────────────────────────────

function SessionView({
	session,
	class_: cls,
	onBack,
}: {
	session: Session;
	class_: Class;
	onBack: () => void;
}) {
	const apiFetch   = useApiFetch();
	const [records,  setRecords]  = useState<Attendance[]>([]);
	const [students, setStudents] = useState<Student[]>([]);
	const [loading,  setLoading]  = useState(true);
	const [msg,      setMsg]      = useState<{ text: string; ok: boolean } | null>(null);

	const [addForm,  setAddForm]  = useState({ student_id: "", participation_score: "" });
	const [editingId, setEditingId] = useState<number | null>(null);
	const [editScore, setEditScore] = useState("");
	const [showAdd,   setShowAdd]   = useState(false);

	const toast = (text: string, ok = true) => {
		setMsg({ text, ok });
		setTimeout(() => setMsg(null), 3000);
	};

	const loadData = async () => {
		const [recs, studs] = await Promise.all([
			apiFetch<Attendance[]>(`/teacher/sessions/${session.id}/attendance`),
			apiFetch<Student[]>(`/teacher/classes/${session.class_id}/students`),
		]);
		setRecords(recs);
		setStudents(studs);
	};

	useEffect(() => {
		loadData().finally(() => setLoading(false));
	}, [session.id]);  // eslint-disable-line react-hooks/exhaustive-deps

	const attendedIds = new Set(records.map(r => r.student_id));
	const allStudentsForSession = students;
	const unattendedStudents = allStudentsForSession.filter(s => !attendedIds.has(s.id));

	const handleAdd = async (e: React.FormEvent) => {
		e.preventDefault();
		try {
			await apiFetch(`/teacher/sessions/${session.id}/attendance`, {
				method: "POST",
				body: JSON.stringify({
					student_id: parseInt(addForm.student_id),
					participation_score: addForm.participation_score !== "" ? parseInt(addForm.participation_score) : null,
				}),
			});
			setAddForm({ student_id: "", participation_score: "" });
			setShowAdd(false);
			toast("Attendance added.");
			await loadData();
		} catch (err) {
			toast(err instanceof ApiError ? JSON.stringify(err.data) : "Error", false);
		}
	};

	const handleSaveEdit = async (id: number) => {
		try {
			await apiFetch(`/teacher/attendance/${id}`, {
				method: "PATCH",
				body: JSON.stringify({
					participation_score: editScore !== "" ? parseInt(editScore) : null,
				}),
			});
			setEditingId(null);
			toast("Score updated.");
			await loadData();
		} catch (err) {
			toast(err instanceof ApiError ? JSON.stringify(err.data) : "Error", false);
		}
	};

	const handleDelete = async (id: number) => {
		if (!confirm("Remove this attendance record?")) return;
		try {
			await apiFetch(`/teacher/attendance/${id}`, { method: "DELETE" });
			toast("Record removed.");
			await loadData();
		} catch (err) {
			toast(err instanceof ApiError ? JSON.stringify(err.data) : "Error", false);
		}
	};

	if (loading) return <p className="p-6 text-[#0D0F14]/50">Loading…</p>;

	return (
		<div className="p-6 flex flex-col gap-4">
			<button onClick={onBack} className={backBtn}>
				← Back to {cls.class_name}
			</button>
			<h2 className="text-xl font-semibold text-[#0D0F14]">Session — {session.class_date}</h2>
			<p className="text-sm text-[#0D0F14]/50">{session.class_duration} min · {cls.class_name}</p>

			{msg && (
				<p className={`text-sm font-medium ${msg.ok ? "text-green-700" : "text-red-600"}`}>{msg.text}</p>
			)}

			{/* Add attendance */}
			<div>
				<button
					onClick={() => setShowAdd(v => !v)}
					className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors border ${
						showAdd
							? "bg-[#D4AF37] border-[#D4AF37] text-[#0D0F14]"
							: "border-[#D4AF37]/70 text-[#D4AF37] hover:bg-[#D4AF37]/10"
					}`}
				>
					Add Attendance
				</button>

				{showAdd && (
					<form onSubmit={handleAdd} className="mt-3 flex gap-3 flex-wrap items-end max-w-md">
						<div className="flex flex-col gap-1 flex-1 min-w-[160px]">
							<label className="text-xs text-[#0D0F14]/50">Student</label>
							<select
								className={inputCls}
								value={addForm.student_id}
								onChange={e => setAddForm(f => ({ ...f, student_id: e.target.value }))}
								required
							>
								<option value="">Select student</option>
								{unattendedStudents.length > 0 && (
									<optgroup label="Not yet recorded">
										{unattendedStudents.map(s => (
											<option key={s.id} value={s.id}>{s.fname} {s.lname}</option>
										))}
									</optgroup>
								)}
								{allStudentsForSession.filter(s => attendedIds.has(s.id)).length > 0 && (
									<optgroup label="Already recorded">
										{allStudentsForSession.filter(s => attendedIds.has(s.id)).map(s => (
											<option key={s.id} value={s.id}>{s.fname} {s.lname}</option>
										))}
									</optgroup>
								)}
							</select>
						</div>
						<div className="flex flex-col gap-1 w-32">
							<label className="text-xs text-[#0D0F14]/50">Score (optional)</label>
							<input
								className={inputCls}
								type="number"
								placeholder="0–100"
								value={addForm.participation_score}
								onChange={e => setAddForm(f => ({ ...f, participation_score: e.target.value }))}
							/>
						</div>
						<button className={btnCls} type="submit">Add</button>
					</form>
				)}
			</div>

			{/* Attendance table */}
			{records.length === 0 ? (
				<p className="text-[#0D0F14]/50 text-sm">No attendance recorded for this session yet.</p>
			) : (
				<table className="w-full text-sm border-collapse">
					<thead>
						<tr className="border-b border-[#D4AF37]/40 text-left">
							<th className="py-2 pr-4 text-[#0D0F14]/50 font-medium">Student</th>
							<th className="py-2 pr-4 text-[#0D0F14]/50 font-medium">Participation Score</th>
							<th className="py-2 text-[#0D0F14]/50 font-medium">Actions</th>
						</tr>
					</thead>
					<tbody>
						{records.map(r => {
							const student = students.find(s => s.id === r.student_id);
							const isEditing = editingId === r.id;
							return (
								<tr key={r.id} className="border-b border-[#0D0F14]/8">
									<td className="py-2.5 pr-4 font-medium text-[#0D0F14]">
										{student ? `${student.fname} ${student.lname}` : `Student ${r.student_id}`}
									</td>
									<td className="py-2.5 pr-4">
										{isEditing ? (
											<input
												className={inputCls + " w-24"}
												type="number"
												autoFocus
												value={editScore}
												onChange={e => setEditScore(e.target.value)}
												onKeyDown={e => {
													if (e.key === "Enter") handleSaveEdit(r.id);
													if (e.key === "Escape") setEditingId(null);
												}}
												onBlur={() => handleSaveEdit(r.id)}
											/>
										) : (
											<span
												onClick={() => { setEditingId(r.id); setEditScore(r.participation_score !== null ? String(r.participation_score) : ""); }}
												className="cursor-pointer text-[#0D0F14] hover:text-[#D4AF37] transition-colors"
												title="Click to edit"
											>
												{r.participation_score !== null ? r.participation_score : <span className="text-[#0D0F14]/30">—</span>}
											</span>
										)}
									</td>
									<td className="py-2.5">
										<button
											onClick={() => handleDelete(r.id)}
											className="text-xs text-red-500 hover:text-red-700 transition-colors"
										>
											Remove
										</button>
									</td>
								</tr>
							);
						})}
					</tbody>
				</table>
			)}
		</div>
	);
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function TeacherDashboard() {
	const { isAuthorized } = useRequireAuth("teacher");
	const apiFetch = useApiFetch();

	const [classes, setClasses] = useState<Class[]>([]);
	const [loading, setLoading] = useState(true);

	const [view,      setView]      = useState<View>("classes");
	const [selClass,  setSelClass]  = useState<Class | null>(null);
	const [selSession, setSelSession] = useState<Session | null>(null);

	useEffect(() => {
		if (!isAuthorized) return;
		apiFetch<Class[]>("/teacher/classes")
			.then(setClasses)
			.finally(() => setLoading(false));
	}, [isAuthorized]);  // eslint-disable-line react-hooks/exhaustive-deps

	if (!isAuthorized) return null;

	const goToClass = (c: Class) => {
		setSelClass(c);
		setView("class-detail");
	};

	const goToSession = (s: Session) => {
		setSelSession(s);
		setView("session");
	};

	const goBackToClasses = () => {
		setSelClass(null);
		setSelSession(null);
		setView("classes");
	};

	const goBackToClass = () => {
		setSelSession(null);
		setView("class-detail");
	};

	return (
		<div className="flex flex-col min-h-[calc(100vh-56px)] md:min-h-screen bg-[#f5f0e8]">
			{/* Header bar */}
			<div className="border-b border-[#d4c9b0] bg-[#ede8df] px-6 py-3 flex items-center gap-3 shrink-0">
				<span className="text-xs font-semibold uppercase tracking-wider text-[#5b6072]">
					{view === "classes"      && "My Classes"}
					{view === "class-detail" && (selClass?.class_name ?? "Class")}
					{view === "session"      && `Session — ${selSession?.class_date ?? ""}`}
				</span>
			</div>

			{/* Content */}
			{loading ? (
				<p className="p-6 text-[#0D0F14]/50">Loading…</p>
			) : view === "classes" ? (
				<ClassesView classes={classes} onSelect={goToClass} />
			) : view === "class-detail" && selClass ? (
				<ClassDetailView class_={selClass} onBack={goBackToClasses} onSession={goToSession} />
			) : view === "session" && selSession && selClass ? (
				<SessionView session={selSession} class_={selClass} onBack={goBackToClass} />
			) : null}
		</div>
	);
}
