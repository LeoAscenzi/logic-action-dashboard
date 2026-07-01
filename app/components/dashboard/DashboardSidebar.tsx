"use client";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";

const SectionLabel = ({ children }: { children: string }) => (
	<div className="text-[10px] font-semibold uppercase tracking-widest text-cream/40 px-3 mt-5 mb-1">
		{children}
	</div>
);

const navCls = (active: boolean) =>
	`rounded-lg px-3 py-2 text-sm transition-colors ${
		active
			? "bg-gold/15 text-gold font-medium"
			: "text-cream/80 hover:text-gold hover:bg-white/5"
	}`;

export default function DashboardSidebar() {
	const { user, logout } = useAuth();
	const pathname         = usePathname();
	const [siteUrl, setSiteUrl] = useState("http://localhost:3000");

	useEffect(() => {
		setSiteUrl(
			process.env.NEXT_PUBLIC_SITE_URL ??
			(window.location.hostname === "localhost" ? "http://localhost:3000" : "")
		);
	}, []);

	const is = (prefix: string) => pathname.startsWith(prefix);

	const handleLogout = async () => {
		await logout();
		window.location.href = `${siteUrl}/community`;
	};

	return (
		<aside className="hidden md:flex flex-col w-56 min-h-screen bg-navy border-r border-gold/30 p-6 gap-6">
			<a href={siteUrl} className="mb-2">
				<Image src="/logo-light-main.png" alt="Ivy Bridge Society" width={64} height={64} className="max-h-16 w-auto" priority />
			</a>

			{user && (
				<div className="flex flex-col gap-1 pb-4 border-b border-gold/20">
					<span className="font-semibold text-gold">{user.fname} {user.lname}</span>
					<span className="text-xs text-cream/50 capitalize tracking-wide">{user.role}</span>
				</div>
			)}

			<nav className="flex flex-col flex-1 text-sm">
				<SectionLabel>Community</SectionLabel>
				<Link href="/dashboard/community/profile" className={navCls(is("/dashboard/community/profile"))}>
					Profile
				</Link>
				<Link href="/dashboard/community/posts" className={navCls(is("/dashboard/community/posts"))}>
					Activity
				</Link>
				{user?.role === "admin" && (
					<Link href="/dashboard/community/events" className={navCls(is("/dashboard/community/events"))}>
						Events
					</Link>
				)}

				<SectionLabel>Academics</SectionLabel>
				{user?.role === "admin" && (
					<>
						<Link href="/dashboard/admin/students" className={navCls(is("/dashboard/admin/students"))}>Students</Link>
						<Link href="/dashboard/admin/classes"  className={navCls(is("/dashboard/admin/classes"))}>Classes</Link>
						<Link href="/dashboard/admin/grades"   className={navCls(is("/dashboard/admin/grades"))}>Grades</Link>
						<Link href="/dashboard/admin/teachers" className={navCls(is("/dashboard/admin/teachers"))}>Teachers</Link>
						<Link href="/dashboard/admin/parents"  className={navCls(is("/dashboard/admin/parents"))}>Parents</Link>
						<Link href="/dashboard/admin/invites"  className={navCls(is("/dashboard/admin/invites"))}>Invites</Link>
					</>
				)}
				{user?.role === "admin" && (
					<>
						<SectionLabel>Payments</SectionLabel>
						<Link href="/dashboard/admin/payments" className={navCls(is("/dashboard/admin/payments"))}>Payments</Link>
					</>
				)}
				{user?.role === "parent" && (
					<Link href="/dashboard/parent" className={navCls(is("/dashboard/parent"))}>
						My Students
					</Link>
				)}
				{user?.role === "teacher" && (
					<Link href="/dashboard/teacher" className={navCls(is("/dashboard/teacher"))}>
						My Classes
					</Link>
				)}
			</nav>

			<button
				onClick={handleLogout}
				className="rounded-lg border border-gold/50 px-3 py-2 text-sm text-gold hover:bg-gold hover:text-ink transition-colors font-medium"
			>
				Log Out
			</button>
		</aside>
	);
}
