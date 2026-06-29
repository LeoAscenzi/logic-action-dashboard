"use client";
import { Suspense } from "react";
import { useRequireAuth } from "@/app/hooks/useRequireAuth";
import StudentsTab from "@/app/components/dashboard/admin/StudentsTab";

function Inner() {
	const { isAuthorized } = useRequireAuth("admin");
	if (!isAuthorized) return null;
	return <StudentsTab />;
}

export default function StudentsPage() {
	return <Suspense><Inner /></Suspense>;
}
