"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRequireAuth } from "@/app/hooks/useRequireAuth";
import { useApiFetch } from "@/app/hooks/useApiFetch";

interface Student {
	id: number;
	fname: string;
	lname: string;
	parent_id: number | null;
}

export default function ParentDashboard() {
	const { isAuthorized } = useRequireAuth("parent");
	const apiFetch = useApiFetch();
	const [students, setStudents] = useState<Student[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		if (!isAuthorized) return;
		apiFetch<Student[]>("/parent/students")
			.then(setStudents)
			.finally(() => setLoading(false));
	}, [isAuthorized]);  // eslint-disable-line react-hooks/exhaustive-deps

	if (!isAuthorized) return null;

	return (
		<div className="p-8">
			<h1 className="text-2xl font-semibold text-[#D4AF37] mb-6 tracking-wide">My Students</h1>
			{loading ? (
				<p className="text-[#0D0F14]/50">Loading…</p>
			) : students.length === 0 ? (
				<div className="rounded-xl border border-[#D4AF37]/40 bg-white/40 p-8 text-center text-[#0D0F14]/60 max-w-md">
					You don&apos;t have a student registered yet. Please contact an admin.
				</div>
			) : (
				<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{students.map((s) => (
						<Link
							key={s.id}
							href={`/dashboard/parent/student/${s.id}`}
							className="rounded-xl border border-[#D4AF37]/40 bg-white/50 p-6 hover:bg-white/80 hover:border-[#D4AF37] transition-all"
						>
							<p className="font-semibold text-lg text-[#0D0F14]">{s.fname} {s.lname}</p>
							<p className="text-sm text-[#D4AF37] mt-1 font-medium">View progress →</p>
						</Link>
					))}
				</div>
			)}
		</div>
	);
}
