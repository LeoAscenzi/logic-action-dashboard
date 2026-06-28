"use client";
import { useEffect, useRef, useState } from "react";
import { useApiFetch } from "@/app/hooks/useApiFetch";
import { useRouter } from "next/navigation";
import { ApiError } from "@/app/lib/api";

interface Student { id: number; fname: string; lname: string; }
interface Class   { id: number; class_name: string; }
interface Exam    { id: number; student_id: number; class_id: number | null; score: number; max_score: number; type: string; exam_date: string; }

const EXAM_TYPES = ["SAT", "SSAT", "AP"];

type Action = "add-grade" | "edit-grade" | null;

const inputCls  = "rounded-lg border border-[#D4AF37]/60 bg-white/70 px-3 py-2 text-sm text-[#0D0F14] placeholder:text-[#0D0F14]/40 focus:outline-none focus:ring-1 focus:ring-[#D4AF37]";
const btnCls    = "rounded-lg bg-[#D4AF37] px-4 py-2 text-sm font-semibold text-[#0D0F14] hover:bg-[#c4a230] transition-colors";
const emptyAdd  = { student_id: "", class_id: "", score: "", max_score: "", type: "SAT", exam_date: "" };
const emptyEdit = { score: "", max_score: "", type: "SAT", exam_date: "" };

export default function GradesTab() {
	const apiFetch = useApiFetch();
	const router = useRouter();
	const [students,        setStudents]        = useState<Student[]>([]);
	const [classes,         setClasses]         = useState<Class[]>([]);
	const [loading,         setLoading]         = useState(true);
	const [filterClass,     setFilterClass]     = useState("");
	const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
	const [selectedStudent, setSelectedStudent] = useState("");
	const [grades,          setGrades]          = useState<Exam[]>([]);
	const [gradesLoading,   setGradesLoading]   = useState(false);
	const [action,          setAction]          = useState<Action>(null);
	const [selected,        setSelected]        = useState<Set<number>>(new Set());
	const [msg,             setMsg]             = useState<{ text: string; ok: boolean } | null>(null);

	const [addForm,  setAddForm]  = useState(emptyAdd);
	const [editForm, setEditForm] = useState(emptyEdit);

	const headerCheckRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		Promise.all([
			apiFetch<Student[]>("/admin/students"),
			apiFetch<Class[]>("/admin/classes"),
		]).then(([s, c]) => { setStudents(s); setClasses(c); setFilteredStudents(s); }).finally(() => setLoading(false));
	}, []);  // eslint-disable-line react-hooks/exhaustive-deps

	useEffect(() => {
		setSelectedStudent("");
		setGrades([]);
		setSelected(new Set());
		setAction(null);
		if (!filterClass) {
			setFilteredStudents(students);
			return;
		}
		apiFetch<Student[]>(`/admin/classes/${filterClass}/students`)
			.then(setFilteredStudents)
			.catch(() => setFilteredStudents([]));
	}, [filterClass]);  // eslint-disable-line react-hooks/exhaustive-deps

	useEffect(() => {
		if (!selectedStudent) {
			setGrades([]);  // eslint-disable-line react-hooks/set-state-in-effect
			return;
		}
		setGradesLoading(true);
		setSelected(new Set());
		setAction(null);
		apiFetch<Exam[]>(`/admin/grades/${selectedStudent}`)
			.then(setGrades)
			.catch(() => setGrades([]))
			.finally(() => setGradesLoading(false));
	}, [selectedStudent]);  // eslint-disable-line react-hooks/exhaustive-deps

	useEffect(() => {
		if (headerCheckRef.current) {
			headerCheckRef.current.indeterminate = selected.size > 0 && selected.size < grades.length;
		}
	}, [selected, grades]);

	const toast = (text: string, ok = true) => {
		setMsg({ text, ok });
		setTimeout(() => setMsg(null), 3000);
	};

	const toggle = (key: Action) => {
		if (key === "edit-grade" && selected.size === 1) {
			const exam = grades.find(g => selected.has(g.id))!;
			setEditForm({
				score:     String(exam.score),
				max_score: String(exam.max_score),
				type:      exam.type,
				exam_date: exam.exam_date,
			});
		}
		setAction(a => a === key ? null : key);
	};

	const toggleRow = (id: number) => {
		setSelected(prev => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id); else next.add(id);
			return next;
		});
	};

	const toggleAll = () => {
		setSelected(prev =>
			prev.size === grades.length
				? new Set()
				: new Set(grades.map(g => g.id))
		);
	};

	const refreshGrades = async () => {
		if (!selectedStudent) return;
		const g = await apiFetch<Exam[]>(`/admin/grades/${selectedStudent}`);
		setGrades(g);
		setSelected(new Set());
	};

	const handleAddGrade = async (e: React.FormEvent) => {
		e.preventDefault();
		try {
			await apiFetch("/admin/add-grade", {
				method: "POST",
				body: JSON.stringify({
					student_id: parseInt(addForm.student_id),
					class_id:   addForm.class_id ? parseInt(addForm.class_id) : null,
					score:      parseFloat(addForm.score),
					max_score:  parseFloat(addForm.max_score),
					type:       addForm.type,
					exam_date:  addForm.exam_date,
				}),
			});
			setAddForm(emptyAdd);
			toast("Grade recorded.");
			await refreshGrades();
		} catch (err) {
			toast(err instanceof ApiError ? JSON.stringify(err.data) : "Error", false);
		}
	};

	const handleEditGrade = async (e: React.FormEvent) => {
		e.preventDefault();
		const [examId] = Array.from(selected);
		try {
			await apiFetch(`/admin/update-grade/${examId}`, {
				method: "PATCH",
				body: JSON.stringify({
					score:     parseFloat(editForm.score),
					max_score: parseFloat(editForm.max_score),
					type:      editForm.type,
					exam_date: editForm.exam_date,
				}),
			});
			setAction(null);
			toast("Grade updated.");
			await refreshGrades();
		} catch (err) {
			toast(err instanceof ApiError ? JSON.stringify(err.data) : "Error", false);
		}
	};

	if (loading) return <p className="p-6 text-[#0D0F14]/50">Loading…</p>;

	return (
		<div className="flex flex-col min-h-[calc(100vh-56px)] md:min-h-screen">

			{/* Action bar */}
			<div className="border-b border-[#d4c9b0] bg-[#ede8df] px-6 py-3 flex items-center gap-3 flex-wrap shrink-0">
				<span className="text-xs font-semibold uppercase tracking-wider text-[#5b6072] mr-1">Grades</span>
				<button
					onClick={() => toggle("add-grade")}
					className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors border ${
						action === "add-grade"
							? "bg-[#D4AF37] border-[#D4AF37] text-[#0D0F14]"
							: "border-[#D4AF37]/70 text-[#D4AF37] hover:bg-[#D4AF37]/10"
					}`}
				>
					Add Grade
				</button>
				<button
					onClick={() => toggle("edit-grade")}
					disabled={selected.size !== 1}
					className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors border ${
						action === "edit-grade"
							? "bg-[#D4AF37] border-[#D4AF37] text-[#0D0F14]"
							: selected.size === 1
							? "border-[#D4AF37]/70 text-[#D4AF37] hover:bg-[#D4AF37]/10"
							: "border-[#0D0F14]/20 text-[#0D0F14]/30 cursor-not-allowed"
					}`}
				>
					Edit Grade
				</button>
			</div>

			{/* Content */}
			<div className="flex-1 p-6 overflow-auto flex flex-col gap-6">

				{msg && (
					<p className={`text-sm font-medium ${msg.ok ? "text-green-700" : "text-red-600"}`}>{msg.text}</p>
				)}

				{action === "add-grade" && (
					<div className="bg-white rounded-xl border border-[#D4AF37]/30 p-5 max-w-md">
						<form onSubmit={handleAddGrade} className="flex flex-col gap-3">
							<select className={inputCls} value={addForm.student_id} onChange={e => setAddForm(f => ({ ...f, student_id: e.target.value }))} required>
								<option value="">Select student</option>
								{students.map(s => <option key={s.id} value={s.id}>{s.fname} {s.lname}</option>)}
							</select>
							<select className={inputCls} value={addForm.class_id} onChange={e => setAddForm(f => ({ ...f, class_id: e.target.value }))}>
								<option value="">No class (optional)</option>
								{classes.map(c => <option key={c.id} value={c.id}>{c.class_name}</option>)}
							</select>
							<div className="flex gap-3">
								<input className={inputCls + " flex-1"} type="number" step="0.01" placeholder="Score"     value={addForm.score}     onChange={e => setAddForm(f => ({ ...f, score:     e.target.value }))} required />
								<input className={inputCls + " flex-1"} type="number" step="0.01" placeholder="Max score" value={addForm.max_score} onChange={e => setAddForm(f => ({ ...f, max_score: e.target.value }))} required />
							</div>
							<select className={inputCls} value={addForm.type} onChange={e => setAddForm(f => ({ ...f, type: e.target.value }))} required>
								{EXAM_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
							</select>
							<input className={inputCls} type="date" value={addForm.exam_date} onChange={e => setAddForm(f => ({ ...f, exam_date: e.target.value }))} required />
							<button className={btnCls} type="submit">Add Grade</button>
						</form>
					</div>
				)}

				{action === "edit-grade" && selected.size === 1 && (
					<div className="bg-white rounded-xl border border-[#D4AF37]/30 p-5 max-w-md">
						<form onSubmit={handleEditGrade} className="flex flex-col gap-3">
							<div className="flex gap-3">
								<input className={inputCls + " flex-1"} type="number" step="0.01" placeholder="Score"     value={editForm.score}     onChange={e => setEditForm(f => ({ ...f, score:     e.target.value }))} required />
								<input className={inputCls + " flex-1"} type="number" step="0.01" placeholder="Max score" value={editForm.max_score} onChange={e => setEditForm(f => ({ ...f, max_score: e.target.value }))} required />
							</div>
							<select className={inputCls} value={editForm.type} onChange={e => setEditForm(f => ({ ...f, type: e.target.value }))} required>
								{EXAM_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
							</select>
							<input className={inputCls} type="date" value={editForm.exam_date} onChange={e => setEditForm(f => ({ ...f, exam_date: e.target.value }))} required />
							<button className={btnCls} type="submit">Save Changes</button>
						</form>
					</div>
				)}

				{/* Filters + grades table */}
				<div className="flex flex-col gap-4">
					<div className="flex items-center gap-3 flex-wrap">
						<span className="text-xs font-semibold uppercase tracking-wider text-[#5b6072] shrink-0">View grades for</span>
						<select
							className={inputCls + " max-w-xs"}
							value={filterClass}
							onChange={e => setFilterClass(e.target.value)}
						>
							<option value="">All classes</option>
							{classes.map(c => <option key={c.id} value={c.id}>{c.class_name}</option>)}
						</select>
						<select
							className={inputCls + " max-w-xs"}
							value={selectedStudent}
							onChange={e => setSelectedStudent(e.target.value)}
						>
							<option value="">Select student…</option>
							{filteredStudents.map(s => <option key={s.id} value={s.id}>{s.fname} {s.lname}</option>)}
						</select>
					</div>

					{selectedStudent && (
						gradesLoading ? (
							<p className="text-[#0D0F14]/50 text-sm">Loading grades…</p>
						) : grades.length === 0 ? (
							<p className="text-[#0D0F14]/50 text-sm">No grades recorded for this student.</p>
						) : (
							<table className="w-full text-sm border-collapse">
								<thead>
									<tr className="border-b border-[#D4AF37]/40 text-left">
										<th className="py-2 pr-3 w-8">
											<input
												ref={headerCheckRef}
												type="checkbox"
												checked={selected.size === grades.length && grades.length > 0}
												onChange={toggleAll}
												className="cursor-pointer accent-[#D4AF37]"
											/>
										</th>
										<th className="py-2 pr-4 text-[#0D0F14]/50 font-medium">ID</th>
										<th className="py-2 pr-4 text-[#0D0F14]/50 font-medium">Type</th>
										<th className="py-2 pr-4 text-[#0D0F14]/50 font-medium">Score</th>
										<th className="py-2 pr-4 text-[#0D0F14]/50 font-medium">Max</th>
										<th className="py-2 pr-4 text-[#0D0F14]/50 font-medium">Date</th>
										<th className="py-2 text-[#0D0F14]/50 font-medium">Class</th>
									</tr>
								</thead>
								<tbody>
									{grades.map(g => {
										const cls   = classes.find(c => c.id === g.class_id);
										const isSel = selected.has(g.id);
										return (
											<tr
												key={g.id}
												onClick={() => toggleRow(g.id)}
												className={`border-b border-[#0D0F14]/8 cursor-pointer transition-colors ${
													isSel ? "bg-[#D4AF37]/10" : "hover:bg-white/40"
												}`}
											>
												<td className="py-2.5 pr-3">
													<input
														type="checkbox"
														checked={isSel}
														onChange={() => toggleRow(g.id)}
														onClick={e => e.stopPropagation()}
														className="cursor-pointer accent-[#D4AF37]"
													/>
												</td>
												<td className="py-2.5 pr-4 text-[#0D0F14]/40 text-xs">{g.id}</td>
												<td className="py-2.5 pr-4 font-medium text-[#0D0F14]">{g.type}</td>
												<td className="py-2.5 pr-4 text-[#0D0F14]">{g.score}</td>
												<td className="py-2.5 pr-4 text-[#0D0F14]/60">{g.max_score}</td>
												<td className="py-2.5 pr-4 text-[#0D0F14]/60">{g.exam_date}</td>
												<td className="py-2.5 text-[#0D0F14]/60" onClick={e => e.stopPropagation()}>
														{cls
															? <button onClick={() => router.push(`/dashboard/admin/classes?class=${cls.id}`)} className="text-[#D4AF37] hover:underline font-medium">{cls.class_name}</button>
															: "—"
														}
													</td>
											</tr>
										);
									})}
								</tbody>
							</table>
						)
					)}
				</div>

			</div>
		</div>
	);
}
