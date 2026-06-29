"use client";
import { useRequireAuth } from "@/app/hooks/useRequireAuth";
import PaymentsTab from "@/app/components/dashboard/admin/PaymentsTab";

export default function PaymentsPage() {
	const { isAuthorized } = useRequireAuth("admin");
	if (!isAuthorized) return null;
	return <PaymentsTab />;
}
