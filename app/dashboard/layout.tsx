"use client";
import { useAuth } from "@/app/context/AuthContext";
import { AdminSectionProvider } from "@/app/context/AdminSectionContext";
import DashboardSidebar from "@/app/components/dashboard/DashboardSidebar";
import DashboardMobileHeader from "@/app/components/dashboard/DashboardMobileHeader";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
	const { isLoading } = useAuth();

	if (isLoading) return null;

	return (
		<AdminSectionProvider>
			<div className="flex min-h-screen">
				<DashboardSidebar />
				<div className="flex-1 flex flex-col min-h-screen">
					<DashboardMobileHeader />
					<main className="flex-1 bg-cream text-ink pt-14 md:pt-0">
						{children}
					</main>
				</div>
			</div>
		</AdminSectionProvider>
	);
}
