"use client";
import Image from "next/image";
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";

const SectionLabel = ({ children }: { children: string }) => (
	<div className="text-[10px] font-semibold uppercase tracking-widest text-cream/40 px-3 mt-5 mb-1">
		{children}
	</div>
);

const navCls = (active: boolean) =>
	`rounded-lg px-3 py-3 text-base border-b border-gold/10 transition-colors ${
		active ? "text-gold font-medium" : "text-cream/80 hover:text-gold"
	}`;

export default function DashboardMobileHeader() {
	const [open, setOpen]           = useState(false);
	const [mounted, setMounted]     = useState(false);
	const [siteUrl, setSiteUrl]     = useState("http://localhost:3000");
	const pathname                  = usePathname();
	const { user, logout }          = useAuth();

	const is = (prefix: string) => pathname.startsWith(prefix);

	useEffect(() => { setMounted(true); }, []);  // eslint-disable-line react-hooks/set-state-in-effect
	useEffect(() => { setOpen(false); }, [pathname]);  // eslint-disable-line react-hooks/set-state-in-effect
	useEffect(() => {
		document.body.style.overflow = open ? "hidden" : "";
		return () => { document.body.style.overflow = ""; };
	}, [open]);
	useEffect(() => {
		setSiteUrl(
			process.env.NEXT_PUBLIC_SITE_URL ??
			(window.location.hostname === "localhost" ? "http://localhost:3000" : "")
		);
	}, []);

	const handleLogout = async () => {
		await logout();
		window.location.href = `${siteUrl}/community`;
	};

	const overlay = open ? (
		<div className="fixed inset-0 z-[200] bg-navy flex flex-col">
			<div className="flex items-center justify-between h-14 px-4 border-b border-gold/30 shrink-0">
				<a href={siteUrl}>
					<Image src="/logo-light-main.png" alt="Logic Action" width={32} height={32} className="max-h-8 w-auto" priority />
				</a>
				<button
					onClick={() => setOpen(false)}
					className="p-1 text-cream/60 hover:text-white transition-colors"
					aria-label="Close menu"
				>
					<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
						<line x1="4" y1="4" x2="20" y2="20" />
						<line x1="20" y1="4" x2="4" y2="20" />
					</svg>
				</button>
			</div>

			<div className="flex flex-col flex-1 overflow-y-auto p-6 gap-2">
				{user && (
					<div className="pb-4 border-b border-gold/20 mb-2">
						<p className="font-semibold text-gold">{user.fname} {user.lname}</p>
						<p className="text-xs text-cream/50 capitalize tracking-wide mt-0.5">{user.role}</p>
					</div>
				)}

				<SectionLabel>Community</SectionLabel>
				<Link href="/dashboard/community/profile" className={navCls(is("/dashboard/community/profile"))}>Profile</Link>
				<Link href="/dashboard/community/posts" className={navCls(is("/dashboard/community/posts"))}>Activity</Link>
				{user?.role === "admin" && (
					<Link href="/dashboard/community/events" className={navCls(is("/dashboard/community/events"))}>Events</Link>
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
					<Link href="/dashboard/parent" className={navCls(is("/dashboard/parent"))}>My Students</Link>
				)}
				{user?.role === "teacher" && (
					<Link href="/dashboard/teacher" className={navCls(is("/dashboard/teacher"))}>My Classes</Link>
				)}
			</div>

			<div className="p-6 shrink-0">
				<button
					onClick={handleLogout}
					className="w-full rounded-lg border border-gold/50 px-3 py-3 text-gold hover:bg-gold hover:text-ink transition-colors font-medium"
				>
					Log Out
				</button>
			</div>
		</div>
	) : null;

	return (
		<>
			<div className="md:hidden fixed top-0 inset-x-0 z-50 h-14 bg-navy border-b border-gold/30 flex items-center justify-between px-4 shrink-0">
				<a href={siteUrl}>
					<Image src="/logo-light-main.png" alt="Logic Action" width={32} height={32} className="max-h-8 w-auto" priority />
				</a>
				<button
					onClick={() => setOpen(true)}
					className="p-1 text-cream/60 hover:text-white transition-colors"
					aria-label="Open menu"
				>
					<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
						<line x1="3" y1="6"  x2="21" y2="6"  />
						<line x1="3" y1="12" x2="21" y2="12" />
						<line x1="3" y1="18" x2="21" y2="18" />
					</svg>
				</button>
			</div>
			{mounted && createPortal(overlay, document.body)}
		</>
	);
}
