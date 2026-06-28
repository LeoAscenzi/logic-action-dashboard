"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";

export default function RootPage() {
	const { user, isLoading } = useAuth();
	const router = useRouter();

	useEffect(() => {
		if (isLoading) return;
		if (user) {
			router.replace(`/dashboard/${user.role}`);
		}
		// No cookie → middleware already redirected to site login before this renders
	}, [user, isLoading, router]);

	return null;
}
