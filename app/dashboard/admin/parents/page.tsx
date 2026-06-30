"use client";
import { useRequireAuth } from "@/app/hooks/useRequireAuth";
import ParentsTab from "@/app/components/dashboard/admin/ParentsTab";

export default function ParentsPage() {
	const { isAuthorized } = useRequireAuth("admin");
	if (!isAuthorized) return null;
	return <ParentsTab />;
}
