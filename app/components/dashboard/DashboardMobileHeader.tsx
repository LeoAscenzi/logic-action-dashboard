"use client";
import Image from "next/image";
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";
import { useAdminSection } from "@/app/context/AdminSectionContext";

const ADMIN_SECTIONS = [
	{ key: "students" as const, label: "Students" },
	{ key: "classes"  as const, label: "Classes"  },
	{ key: "grades"   as const, label: "Grades"   },
];

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export default function DashboardMobileHeader() {
	const [open, setOpen]       = useState(false);
	const [mounted, setMounted] = useState(false);
	const pathname              = usePathname();
	const { user, logout }      = useAuth();
	const { section, setSection } = useAdminSection();

	const isAdminPage = pathname.includes("/dashboard/admin");

	useEffect(() => { setMounted(true); }, []);  // eslint-disable-line react-hooks/set-state-in-effect
	useEffect(() => { setOpen(false); }, [pathname]);  // eslint-disable-line react-hooks/set-state-in-effect
	useEffect(() => {
		document.body.style.overflow = open ? "hidden" : "";
		return () => { document.body.style.overflow = ""; };
	}, [open]);

	const handleLogout = async () => {
		await logout();
		window.location.href = `${SITE_URL}/community`;
	};

	const overlay = open ? (
		<div className="fixed inset-0 z-[200] bg-[#0D0F14] flex flex-col">
			<div className="flex items-center justify-between h-14 px-4 border-b border-[#D4AF37]/30 shrink-0">
				<a href={SITE_URL}>
					<Image src="/logo-light-main.png" alt="Logic Action" width={32} height={32} className="max-h-8 w-auto" priority />
				</a>
				<button
					onClick={() => setOpen(false)}
					className="p-1 text-[#f5f0e8]/60 hover:text-white transition-colors"
					aria-label="Close menu"
				>
					<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
						<line x1="4" y1="4" x2="20" y2="20" />
						<line x1="20" y1="4" x2="4" y2="20" />
					</svg>
				</button>
			</div>

			<div className="flex flex-col flex-1 overflow-y-auto p-6 gap-6">
				{user && (
					<div className="pb-4 border-b border-[#D4AF37]/20">
						<p className="font-semibold text-[#D4AF37]">{user.fname} {user.lname}</p>
						<p className="text-xs text-[#f5f0e8]/50 capitalize tracking-wide mt-0.5">{user.role}</p>
					</div>
				)}

				<nav className="flex flex-col gap-1">
					{user?.role === "admin" && isAdminPage && ADMIN_SECTIONS.map(({ key, label }) => (
						<button
							key={key}
							onClick={() => { setSection(key); setOpen(false); }}
							className={`text-left rounded-lg px-3 py-3 text-base border-b border-[#D4AF37]/10 transition-colors ${
								section === key
									? "text-[#D4AF37] font-medium"
									: "text-[#f5f0e8]/80 hover:text-[#D4AF37]"
							}`}
						>
							{label}
						</button>
					))}
					{user?.role === "parent" && (
						<Link
							href="/dashboard/parent"
							className="rounded-lg px-3 py-3 text-base text-[#f5f0e8]/80 hover:text-[#D4AF37] border-b border-[#D4AF37]/10"
						>
							My Students
						</Link>
					)}
				</nav>
			</div>

			<div className="p-6 shrink-0">
				<button
					onClick={handleLogout}
					className="w-full rounded-lg border border-[#D4AF37]/50 px-3 py-3 text-[#D4AF37] hover:bg-[#D4AF37] hover:text-[#0D0F14] transition-colors font-medium"
				>
					Log Out
				</button>
			</div>
		</div>
	) : null;

	return (
		<>
			<div className="md:hidden fixed top-0 inset-x-0 z-50 h-14 bg-[#0D0F14] border-b border-[#D4AF37]/30 flex items-center justify-between px-4 shrink-0">
				<a href={SITE_URL}>
					<Image src="/logo-light-main.png" alt="Logic Action" width={32} height={32} className="max-h-8 w-auto" priority />
				</a>
				<button
					onClick={() => setOpen(true)}
					className="p-1 text-[#f5f0e8]/60 hover:text-white transition-colors"
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
