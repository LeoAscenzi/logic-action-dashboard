"use client";
import { useEffect, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { useRequireAuth } from "@/app/hooks/useRequireAuth";
import { useApiFetch } from "@/app/hooks/useApiFetch";
import { ApiError } from "@/app/lib/api";

// ── Types ──────────────────────────────────────────────────────────────────────

interface Class      { id: number; class_name: string; total_sessions: number; start_date: string; end_date: string; capacity: number; }
interface Session    { id: number; class_id: number; class_duration: number; class_date: string; }
interface Student    { id: number; fname: string; lname: string; }
interface Attendance { id: number; class_session_id: number; student_id: number; participation_score: number | null; }
interface Exam       { id: number; student_id: number; class_id: number | null; title: string; score: number; max_score: number; type: string; exam_date: string; }

type View = "classes" | "class-detail" | "session" | "student-detail";
type ClassTab = "sessions" | "students" | "grades";

const inputCls = "rounded-lg border border-[#D4AF37]/60 bg-white/70 px-3 py-2 text-sm text-[#0D0F14] placeholder:text-[#0D0F14]/40 focus:outline-none focus:ring-1 focus:ring-[#D4AF37]";
const btnCls   = "rounded-lg bg-[#D4AF37] px-4 py-2 text-sm font-semibold text-[#0D0F14] hover:bg-[#c4a230] transition-colors";
const ghostBtn = "rounded-lg px-4 py-1.5 text-sm font-medium transition-colors border border-[#D4AF37]/70 text-[#D4AF37] hover:bg-[#D4AF37]/10";
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

// ── Grades sub-tab ─────────────────────────────────────────────────────────────

function GradesView({ class_: cls, students }: { class_: Class; students: Student[] }) {
	const apiFetch = useApiFetch();
	const [grades,      setGrades]      = useState<Exam[]>([]);
	const [loading,     setLoading]     = useState(true);
	const [typeFilter,  setTypeFilter]  = useState<"all" | "homework" | "exam">("all");
	const [msg,         setMsg]         = useState<{ text: string; ok: boolean } | null>(null);
	const [showAdd,     setShowAdd]     = useState(false);
	const [editingId,   setEditingId]   = useState<number | null>(null);
	const [editScore,   setEditScore]   = useState("");
	const [addForm,     setAddForm]     = useState({ student_id: "", title: "", type: "exam", score: "", max_score: "", exam_date: "" });

	const toast = (text: string, ok = true) => { setMsg({ text, ok }); setTimeout(() => setMsg(null), 3000); };

	const load = async () => {
		const g = await apiFetch<Exam[]>(`/teacher/classes/${cls.id}/grades`);
		setGrades(g);
	};

	useEffect(() => {
		load().finally(() => setLoading(false));
	}, [cls.id]);  // eslint-disable-line react-hooks/exhaustive-deps

	const studentMap = Object.fromEntries(students.map(s => [s.id, s]));

	const visible = grades.filter(g => typeFilter === "all" || g.type === typeFilter);

	const handleAdd = async (e: React.FormEvent) => {
		e.preventDefault();
		try {
			await apiFetch(`/teacher/classes/${cls.id}/exams`, {
				method: "POST",
				body: JSON.stringify({
					student_id: parseInt(addForm.student_id),
					class_id:   cls.id,
					title:      addForm.title,
					type:       addForm.type,
					score:      parseFloat(addForm.score),
					max_score:  parseFloat(addForm.max_score),
					exam_date:  addForm.exam_date,
				}),
			});
			setAddForm({ student_id: "", title: "", type: "exam", score: "", max_score: "", exam_date: "" });
			setShowAdd(false);
			toast("Grade recorded.");
			await load();
		} catch (err) {
			toast(err instanceof ApiError ? JSON.stringify(err.data) : "Error", false);
		}
	};

	const handleSaveEdit = async (id: number) => {
		try {
			await apiFetch(`/teacher/exams/${id}`, {
				method: "PATCH",
				body: JSON.stringify({ score: parseFloat(editScore) }),
			});
			setEditingId(null);
			toast("Score updated.");
			await load();
		} catch (err) {
			toast(err instanceof ApiError ? JSON.stringify(err.data) : "Error", false);
		}
	};

	const handleDelete = async (id: number) => {
		if (!confirm("Delete this grade?")) return;
		try {
			await apiFetch(`/teacher/exams/${id}`, { method: "DELETE" });
			toast("Grade deleted.");
			await load();
		} catch (err) {
			toast(err instanceof ApiError ? JSON.stringify(err.data) : "Error", false);
		}
	};

	if (loading) return <p className="text-[#0D0F14]/50 text-sm pt-4">Loading grades…</p>;

	return (
		<div className="flex flex-col gap-4 mt-4">
			{msg && <p className={`text-sm font-medium ${msg.ok ? "text-green-700" : "text-red-600"}`}>{msg.text}</p>}

			<div className="flex items-center gap-3 flex-wrap">
				<button onClick={() => setShowAdd(v => !v)} className={showAdd ? btnCls : ghostBtn}>
					{showAdd ? "Cancel" : "+ Add Grade"}
				</button>
				<select className={inputCls} value={typeFilter} onChange={e => setTypeFilter(e.target.value as typeof typeFilter)}>
					<option value="all">All types</option>
					<option value="exam">Exam</option>
					<option value="homework">Homework</option>
				</select>
			</div>

			{showAdd && (
				<div className="bg-white rounded-xl border border-[#D4AF37]/30 p-5 max-w-md">
					<form onSubmit={handleAdd} className="flex flex-col gap-3">
						<select className={inputCls} value={addForm.student_id} onChange={e => setAddForm(f => ({ ...f, student_id: e.target.value }))} required>
							<option value="">Select student</option>
							{students.map(s => <option key={s.id} value={s.id}>{s.fname} {s.lname}</option>)}
						</select>
						<input className={inputCls} placeholder="Title (e.g. HW 3, Midterm)" value={addForm.title} onChange={e => setAddForm(f => ({ ...f, title: e.target.value }))} />
						<select className={inputCls} value={addForm.type} onChange={e => setAddForm(f => ({ ...f, type: e.target.value }))} required>
							<option value="exam">Exam</option>
							<option value="homework">Homework</option>
						</select>
						<div className="flex gap-3">
							<input className={inputCls + " flex-1"} type="number" step="0.01" placeholder="Score"     value={addForm.score}     onChange={e => setAddForm(f => ({ ...f, score:     e.target.value }))} required />
							<input className={inputCls + " flex-1"} type="number" step="0.01" placeholder="Max score" value={addForm.max_score} onChange={e => setAddForm(f => ({ ...f, max_score: e.target.value }))} required />
						</div>
						<input className={inputCls} type="date" value={addForm.exam_date} onChange={e => setAddForm(f => ({ ...f, exam_date: e.target.value }))} required />
						<button className={btnCls} type="submit">Add Grade</button>
					</form>
				</div>
			)}

			{visible.length === 0 ? (
				<p className="text-[#0D0F14]/50 text-sm">No grades recorded yet.</p>
			) : (
				<table className="w-full text-sm border-collapse">
					<thead>
						<tr className="border-b border-[#D4AF37]/40 text-left">
							<th className="py-2 pr-4 text-[#0D0F14]/50 font-medium">Student</th>
							<th className="py-2 pr-4 text-[#0D0F14]/50 font-medium">Type</th>
							<th className="py-2 pr-4 text-[#0D0F14]/50 font-medium">Title</th>
							<th className="py-2 pr-4 text-[#0D0F14]/50 font-medium">Score</th>
							<th className="py-2 pr-4 text-[#0D0F14]/50 font-medium">Max</th>
							<th className="py-2 pr-4 text-[#0D0F14]/50 font-medium">Date</th>
							<th className="py-2 text-[#0D0F14]/50 font-medium"></th>
						</tr>
					</thead>
					<tbody>
						{visible.map(g => {
							const student = studentMap[g.student_id];
							const isEditing = editingId === g.id;
							return (
								<tr key={g.id} className="border-b border-[#0D0F14]/8">
									<td className="py-2.5 pr-4 font-medium text-[#0D0F14]">
										{student ? `${student.fname} ${student.lname}` : `Student #${g.student_id}`}
									</td>
									<td className="py-2.5 pr-4 text-[#0D0F14]/60 capitalize">{g.type}</td>
									<td className="py-2.5 pr-4 text-[#0D0F14]">{g.title || <span className="text-[#0D0F14]/30">—</span>}</td>
									<td className="py-2.5 pr-4 text-[#0D0F14]">
										{isEditing ? (
											<input
												className={inputCls + " w-24 py-1"}
												type="number"
												step="0.01"
												autoFocus
												value={editScore}
												onChange={e => setEditScore(e.target.value)}
												onKeyDown={e => { if (e.key === "Enter") handleSaveEdit(g.id); if (e.key === "Escape") setEditingId(null); }}
												onBlur={() => handleSaveEdit(g.id)}
											/>
										) : (
											<span
												onClick={() => { setEditingId(g.id); setEditScore(String(g.score)); }}
												className="cursor-pointer hover:text-[#D4AF37] transition-colors"
												title="Click to edit score"
											>
												{g.score}
											</span>
										)}
									</td>
									<td className="py-2.5 pr-4 text-[#0D0F14]/60">{g.max_score}</td>
									<td className="py-2.5 pr-4 text-[#0D0F14]/60">{g.exam_date}</td>
									<td className="py-2.5">
										<button onClick={() => handleDelete(g.id)} className="text-xs text-red-500 hover:text-red-700 transition-colors">Delete</button>
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

// ── Class detail view ──────────────────────────────────────────────────────────

function ClassDetailView({
	class_: cls,
	onBack,
	onSession,
	onStudent,
}: {
	class_: Class;
	onBack: () => void;
	onSession: (s: Session) => void;
	onStudent: (s: Student) => void;
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
			<button onClick={onBack} className={backBtn}>← Back to Classes</button>
			<h2 className="text-xl font-semibold text-[#0D0F14]">{cls.class_name}</h2>
			<p className="text-sm text-[#0D0F14]/50">{cls.start_date} → {cls.end_date} · {cls.total_sessions} sessions · cap {cls.capacity}</p>

			<div className="flex gap-2 border-b border-[#D4AF37]/30 pb-0">
				{(["sessions", "students", "grades"] as const).map(t => (
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
										<button onClick={() => onSession(s)} className="text-xs text-[#D4AF37] hover:text-[#c4a230] font-medium transition-colors">
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
					? <p className="text-[#0D0F14]/50 text-sm">No students enrolled in this class yet.</p>
					: <table className="w-full text-sm border-collapse mt-2">
						<thead>
							<tr className="border-b border-[#D4AF37]/40 text-left">
								<th className="py-2 pr-4 text-[#0D0F14]/50 font-medium">Name</th>
								<th className="py-2 text-[#0D0F14]/50 font-medium"></th>
							</tr>
						</thead>
						<tbody>
							{students.map(s => (
								<tr key={s.id} className="border-b border-[#0D0F14]/8">
									<td className="py-2.5 pr-4 font-medium text-[#0D0F14]">{s.fname} {s.lname}</td>
									<td className="py-2.5">
										<button onClick={() => onStudent(s)} className="text-xs text-[#D4AF37] hover:text-[#c4a230] font-medium transition-colors">
											View →
										</button>
									</td>
								</tr>
							))}
						</tbody>
					</table>
			)}

			{tab === "grades" && <GradesView class_={cls} students={students} />}
		</div>
	);
}

// ── Student detail view (teacher) ──────────────────────────────────────────────

function StudentDetailView({
	student,
	onBack,
	onGoToClass,
}: {
	student: Student;
	onBack: () => void;
	onGoToClass: (c: Class) => void;
}) {
	const apiFetch = useApiFetch();
	const [sharedClasses, setSharedClasses] = useState<Class[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		apiFetch<Class[]>(`/teacher/students/${student.id}/shared-classes`)
			.then(setSharedClasses)
			.finally(() => setLoading(false));
	}, [student.id]);  // eslint-disable-line react-hooks/exhaustive-deps

	return (
		<div className="p-6 flex flex-col gap-4">
			<button onClick={onBack} className={backBtn}>← Back</button>
			<h2 className="text-xl font-semibold text-[#0D0F14]">{student.fname} {student.lname}</h2>

			<div>
				<h3 className="text-xs font-semibold uppercase tracking-widest text-[#5b6072] mb-3">Your Shared Classes</h3>
				{loading ? (
					<p className="text-[#0D0F14]/50 text-sm">Loading…</p>
				) : sharedClasses.length === 0 ? (
					<p className="text-[#0D0F14]/50 text-sm">No shared classes found.</p>
				) : (
					<div className="flex flex-col gap-2 max-w-md">
						{sharedClasses.map(c => (
							<button
								key={c.id}
								onClick={() => onGoToClass(c)}
								className="flex items-center justify-between bg-white rounded-xl border border-[#D4AF37]/30 px-5 py-3.5 hover:border-[#D4AF37] hover:shadow-sm transition-all text-left"
							>
								<div>
									<p className="font-medium text-[#0D0F14] text-sm">{c.class_name}</p>
									<p className="text-xs text-[#0D0F14]/50 mt-0.5">{c.start_date} → {c.end_date}</p>
								</div>
								<span className="text-[#D4AF37] text-sm">→</span>
							</button>
						))}
					</div>
				)}
			</div>
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

	const [addForm,    setAddForm]    = useState({ student_id: "", participation_score: "" });
	const [editingId,  setEditingId]  = useState<number | null>(null);
	const [editScore,  setEditScore]  = useState("");
	const [showAdd,    setShowAdd]    = useState(false);
	const [showImport, setShowImport] = useState(false);
	const [importRows, setImportRows] = useState<{ student_id: number; participation_score: number | null; _name: string }[]>([]);
	const [importing,  setImporting]  = useState(false);
	const fileInputRef = useRef<HTMLInputElement>(null);

	const toast = (text: string, ok = true) => { setMsg({ text, ok }); setTimeout(() => setMsg(null), 3000); };

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
	const unattendedStudents = students.filter(s => !attendedIds.has(s.id));

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
				body: JSON.stringify({ participation_score: editScore !== "" ? parseInt(editScore) : null }),
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

	const handleDownloadTemplate = () => {
		const rows: (string | number)[][] = [
			["student_id", "student_name", "participation_score"],
			...students.map(s => [s.id, `${s.fname} ${s.lname}`, ""]),
		];
		const ws = XLSX.utils.aoa_to_sheet(rows);
		ws["!cols"] = [{ wch: 12 }, { wch: 24 }, { wch: 20 }];
		const wb = XLSX.utils.book_new();
		XLSX.utils.book_append_sheet(wb, ws, "Attendance");
		XLSX.writeFile(wb, `attendance-session-${session.id}-${session.class_date}.xlsx`);
	};

	const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;
		const data = await file.arrayBuffer();
		const wb = XLSX.read(data);
		const ws = wb.Sheets[wb.SheetNames[0]];
		const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws);
		const parsed = rawRows
			.map(r => ({
				student_id:          Number(r["student_id"]),
				participation_score: r["participation_score"] !== undefined && r["participation_score"] !== ""
					? Number(r["participation_score"])
					: null,
				_name: String(r["student_name"] ?? ""),
			}))
			.filter(r => !isNaN(r.student_id) && r.student_id > 0);
		setImportRows(parsed);
	};

	const handleImport = async () => {
		if (!importRows.length) return;
		setImporting(true);
		try {
			await apiFetch(`/teacher/sessions/${session.id}/import-attendance`, {
				method: "POST",
				body: JSON.stringify({
					class_session_id: session.id,
					records: importRows.map(({ student_id, participation_score }) => ({ student_id, participation_score })),
				}),
			});
			const n = importRows.length;
			toast(`Imported ${n} record${n !== 1 ? "s" : ""}.`);
			setImportRows([]);
			setShowImport(false);
			if (fileInputRef.current) fileInputRef.current.value = "";
			await loadData();
		} catch (err) {
			toast(err instanceof ApiError ? JSON.stringify(err.data) : "Import failed.", false);
		} finally {
			setImporting(false);
		}
	};

	if (loading) return <p className="p-6 text-[#0D0F14]/50">Loading…</p>;

	const studentMap = Object.fromEntries(students.map(s => [s.id, s]));

	return (
		<div className="flex flex-col min-h-[calc(100vh-56px)] md:min-h-screen">
			<div className="border-b border-[#d4c9b0] bg-[#ede8df] px-6 py-3 flex items-center gap-3 shrink-0">
				<button onClick={onBack} className="text-[#5b6072] hover:text-[#0D0F14] transition-colors text-sm">← Back</button>
				<div className="flex-1" />
				<button
					onClick={() => { setShowImport(v => !v); setImportRows([]); if (fileInputRef.current) fileInputRef.current.value = ""; }}
					className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors border ${showImport ? "bg-[#D4AF37] border-[#D4AF37] text-[#0D0F14]" : "border-[#D4AF37]/70 text-[#D4AF37] hover:bg-[#D4AF37]/10"}`}
				>
					Import Attendance
				</button>
			</div>

			<div className="flex-1 p-6 overflow-auto flex flex-col gap-6">
				{msg && <p className={`text-sm font-medium ${msg.ok ? "text-green-700" : "text-red-600"}`}>{msg.text}</p>}

				<div>
					<button onClick={onBack} className={backBtn}>← Back to {cls.class_name}</button>
					<h2 className="text-xl font-semibold text-[#0D0F14]">Session — {session.class_date}</h2>
					<p className="text-sm text-[#0D0F14]/50">{session.class_duration} min · {cls.class_name}</p>
				</div>

				{showImport && (
					<div className="bg-white rounded-xl border border-[#D4AF37]/30 p-5 flex flex-col gap-4 max-w-xl">
						<div className="flex items-center justify-between">
							<h4 className="text-xs font-semibold uppercase tracking-wider text-[#5b6072]">Bulk Import Attendance</h4>
							<button onClick={handleDownloadTemplate} className="text-xs text-[#D4AF37] hover:underline font-medium flex items-center gap-1">
								↓ Download Template
							</button>
						</div>
						<div className="flex flex-col gap-1.5">
							<label className="text-xs font-semibold text-[#0D0F14]/60 uppercase tracking-wide">Upload filled sheet (.xlsx)</label>
							<input
								ref={fileInputRef}
								type="file"
								accept=".xlsx,.xls"
								onChange={handleFileChange}
								className="text-sm text-[#0D0F14] file:mr-3 file:rounded-lg file:border-0 file:bg-[#D4AF37]/10 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-[#0D0F14] hover:file:bg-[#D4AF37]/20 file:cursor-pointer cursor-pointer"
							/>
						</div>
						{importRows.length > 0 && (
							<>
								<div className="overflow-x-auto">
									<table className="w-full text-sm border-collapse">
										<thead>
											<tr className="border-b border-[#D4AF37]/40 text-left">
												<th className="py-1.5 pr-4 text-[#0D0F14]/50 font-medium">Student</th>
												<th className="py-1.5 pr-4 text-[#0D0F14]/50 font-medium">student_id</th>
												<th className="py-1.5 text-[#0D0F14]/50 font-medium">participation_score</th>
											</tr>
										</thead>
										<tbody>
											{importRows.map((r, i) => (
												<tr key={i} className="border-b border-[#0D0F14]/8">
													<td className="py-2 pr-4 text-[#0D0F14]">{r._name || <span className="text-[#0D0F14]/30">—</span>}</td>
													<td className="py-2 pr-4 text-[#0D0F14]/60 font-mono text-xs">{r.student_id}</td>
													<td className="py-2 text-[#0D0F14]/60">{r.participation_score ?? <span className="text-[#0D0F14]/30">—</span>}</td>
												</tr>
											))}
										</tbody>
									</table>
								</div>
								<button onClick={handleImport} disabled={importing} className={btnCls + " self-start disabled:opacity-50"}>
									{importing ? "Importing…" : `Import ${importRows.length} record${importRows.length !== 1 ? "s" : ""}`}
								</button>
							</>
						)}
					</div>
				)}

				<div>
					<button
						onClick={() => setShowAdd(v => !v)}
						className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors border ${showAdd ? "bg-[#D4AF37] border-[#D4AF37] text-[#0D0F14]" : "border-[#D4AF37]/70 text-[#D4AF37] hover:bg-[#D4AF37]/10"}`}
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
											{unattendedStudents.map(s => <option key={s.id} value={s.id}>{s.fname} {s.lname}</option>)}
										</optgroup>
									)}
									{students.filter(s => attendedIds.has(s.id)).length > 0 && (
										<optgroup label="Already recorded">
											{students.filter(s => attendedIds.has(s.id)).map(s => <option key={s.id} value={s.id}>{s.fname} {s.lname}</option>)}
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
								const student = studentMap[r.student_id];
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
													onKeyDown={e => { if (e.key === "Enter") handleSaveEdit(r.id); if (e.key === "Escape") setEditingId(null); }}
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
											<button onClick={() => handleDelete(r.id)} className="text-xs text-red-500 hover:text-red-700 transition-colors">
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
		</div>
	);
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function TeacherDashboard() {
	const { isAuthorized } = useRequireAuth("teacher");
	const apiFetch = useApiFetch();

	const [classes,    setClasses]    = useState<Class[]>([]);
	const [loading,    setLoading]    = useState(true);
	const [view,       setView]       = useState<View>("classes");
	const [selClass,   setSelClass]   = useState<Class | null>(null);
	const [selSession, setSelSession] = useState<Session | null>(null);
	const [selStudent, setSelStudent] = useState<Student | null>(null);

	useEffect(() => {
		if (!isAuthorized) return;
		apiFetch<Class[]>("/teacher/classes")
			.then(setClasses)
			.finally(() => setLoading(false));
	}, [isAuthorized]);  // eslint-disable-line react-hooks/exhaustive-deps

	if (!isAuthorized) return null;

	const goToClass = (c: Class) => { setSelClass(c); setView("class-detail"); };
	const goToSession = (s: Session) => { setSelSession(s); setView("session"); };
	const goToStudent = (s: Student) => { setSelStudent(s); setView("student-detail"); };

	const goBackToClasses = () => { setSelClass(null); setSelSession(null); setSelStudent(null); setView("classes"); };
	const goBackToClass   = () => { setSelSession(null); setSelStudent(null); setView("class-detail"); };

	const headerLabel =
		view === "classes"        ? "My Classes" :
		view === "class-detail"   ? (selClass?.class_name ?? "Class") :
		view === "session"        ? `Session — ${selSession?.class_date ?? ""}` :
		view === "student-detail" ? (selStudent ? `${selStudent.fname} ${selStudent.lname}` : "Student") :
		"";

	return (
		<div className="flex flex-col min-h-[calc(100vh-56px)] md:min-h-screen bg-[#f5f0e8]">
			<div className="border-b border-[#d4c9b0] bg-[#ede8df] px-6 py-3 flex items-center gap-3 shrink-0">
				<span className="text-xs font-semibold uppercase tracking-wider text-[#5b6072]">{headerLabel}</span>
			</div>

			{loading ? (
				<p className="p-6 text-[#0D0F14]/50">Loading…</p>
			) : view === "classes" ? (
				<ClassesView classes={classes} onSelect={goToClass} />
			) : view === "class-detail" && selClass ? (
				<ClassDetailView class_={selClass} onBack={goBackToClasses} onSession={goToSession} onStudent={goToStudent} />
			) : view === "session" && selSession && selClass ? (
				<SessionView session={selSession} class_={selClass} onBack={goBackToClass} />
			) : view === "student-detail" && selStudent ? (
				<StudentDetailView student={selStudent} onBack={goBackToClass} onGoToClass={goToClass} />
			) : null}
		</div>
	);
}
