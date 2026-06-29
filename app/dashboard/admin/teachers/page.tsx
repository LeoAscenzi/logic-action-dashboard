"use client";
import { useRequireAuth } from "@/app/hooks/useRequireAuth";
import TeachersTab from "@/app/components/dashboard/admin/TeachersTab";

export default function TeachersPage() {
	const { isAuthorized } = useRequireAuth("admin");
	if (!isAuthorized) return null;
	return <TeachersTab />;
}
