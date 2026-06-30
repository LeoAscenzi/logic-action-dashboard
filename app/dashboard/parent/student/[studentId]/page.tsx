"use client";
import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRequireAuth } from "@/app/hooks/useRequireAuth";
import { useApiFetch } from "@/app/hooks/useApiFetch";

interface Exam {
	id: number;
	type: string;
	title: string;
	score: number;
	max_score: number;
	exam_date: string;
	class_id: number | null;
}

interface Attendance {
	id: number;
	class_session_id: number;
	participation_score: number | null;
}

interface Class {
	id: number;
	class_name: string;
}

export default function StudentDetailPage({ params }: { params: Promise<{ studentId: string }> }) {
	const { studentId } = use(params);
	const { isAuthorized } = useRequireAuth("parent");
	const apiFetch = useApiFetch();
	const [grades, setGrades] = useState<Exam[]>([]);
	const [classes, setClasses] = useState<Class[]>([]);
	const [attendance, setAttendance] = useState<Record<number, Attendance[]>>({});
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		if (!isAuthorized) return;
		const id = parseInt(studentId, 10);
		Promise.all([
			apiFetch<Exam[]>(`/parent/grades/${id}`),
			apiFetch<Class[]>("/parent/classes"),
		]).then(([g, cls]) => {
			setGrades(g);
			setClasses(cls);
			return Promise.all(
				cls.map((c) =>
					apiFetch<Attendance[]>(`/parent/class-progress/${c.id}/${id}`).then((a) => ({ id: c.id, a }))
				)
			);
		}).then((results) => {
			const map: Record<number, Attendance[]> = {};
			results.forEach(({ id, a }) => { map[id] = a; });
			setAttendance(map);
		}).finally(() => setLoading(false));
	}, [isAuthorized, studentId]);  // eslint-disable-line react-hooks/exhaustive-deps

	if (!isAuthorized) return null;

	return (
		<div className="max-w-3xl p-8">
			<Link href="/dashboard/parent" className="text-sm text-ink/50 hover:text-gold mb-4 inline-block transition-colors">
				← Back to students
			</Link>
			<h1 className="text-2xl font-semibold text-gold mb-8 tracking-wide">Student Progress</h1>

			{loading ? (
				<p className="text-ink/50">Loading…</p>
			) : (
				<>
					<section className="mb-10">
						<h2 className="text-base font-semibold uppercase tracking-widest text-ink/50 mb-4">Exam Grades</h2>
						{grades.length === 0 ? (
							<p className="text-ink/50">No grades recorded yet.</p>
						) : (
							<div className="overflow-x-auto"><table className="w-full text-sm border-collapse">
								<thead>
									<tr className="border-b border-gold/40 text-left">
										<th className="py-2 pr-4 text-ink/50 font-medium">Type</th>
										<th className="py-2 pr-4 text-ink/50 font-medium">Title</th>
										<th className="py-2 pr-4 text-ink/50 font-medium">Score</th>
										<th className="py-2 pr-4 text-ink/50 font-medium">Max</th>
										<th className="py-2 text-ink/50 font-medium">Date</th>
									</tr>
								</thead>
								<tbody>
									{grades.map((g) => (
										<tr key={g.id} className="border-b border-ink/8 hover:bg-white/40 transition-colors">
											<td className="py-2.5 pr-4 capitalize font-semibold text-ink">{g.type}</td>
											<td className="py-2.5 pr-4 text-ink">{g.title || <span className="text-ink/30">—</span>}</td>
											<td className="py-2.5 pr-4 text-ink">{g.score}</td>
											<td className="py-2.5 pr-4 text-ink/60">{g.max_score}</td>
											<td className="py-2.5 text-ink/60">{g.exam_date}</td>
										</tr>
									))}
								</tbody>
							</table></div>
						)}
					</section>

					<section>
						<h2 className="text-base font-semibold uppercase tracking-widest text-ink/50 mb-4">Class Attendance</h2>
						{classes.length === 0 ? (
							<p className="text-ink/50">No class progress recorded yet.</p>
						) : (
							classes.map((c) => {
								const sessions = attendance[c.id] ?? [];
								return (
									<div key={c.id} className="mb-6">
										<h3 className="font-semibold mb-2 text-gold">{c.class_name}</h3>
										{sessions.length === 0 ? (
											<p className="text-ink/50 text-sm">No attendance recorded.</p>
										) : (
											<div className="flex flex-wrap gap-2">
												{sessions.map((a) => (
													<span key={a.id} className="rounded-lg border border-gold/40 bg-white/60 px-3 py-1 text-sm text-ink">
														Session {a.class_session_id} — {a.participation_score ?? "—"}/10
													</span>
												))}
											</div>
										)}
									</div>
								);
							})
						)}
					</section>
				</>
			)}
		</div>
	);
}
