"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";

type Role = "admin" | "parent" | "teacher";

export function useRequireAuth(requiredRole?: Role) {
	const { user, isLoading } = useAuth();
	const router = useRouter();

	useEffect(() => {
		if (isLoading) return;
		if (!user) {
			const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
			window.location.href = `${siteUrl}/community`;
			return;
		}
		if (requiredRole && user.role !== requiredRole) {
			router.replace(`/dashboard/${user.role}`);
		}
	}, [user, isLoading, requiredRole, router]);

	const isAuthorized = !isLoading && !!user && (!requiredRole || user.role === requiredRole);
	return { user, isLoading, isAuthorized };
}
