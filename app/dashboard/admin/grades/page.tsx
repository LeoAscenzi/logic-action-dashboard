"use client";
import { useRequireAuth } from "@/app/hooks/useRequireAuth";
import GradesTab from "@/app/components/dashboard/admin/GradesTab";

export default function GradesPage() {
	const { isAuthorized } = useRequireAuth("admin");
	if (!isAuthorized) return null;
	return <GradesTab />;
}
