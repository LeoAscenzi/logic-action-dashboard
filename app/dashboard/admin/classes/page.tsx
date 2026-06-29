"use client";
import { Suspense } from "react";
import { useRequireAuth } from "@/app/hooks/useRequireAuth";
import ClassesTab from "@/app/components/dashboard/admin/ClassesTab";

function Inner() {
	const { isAuthorized } = useRequireAuth("admin");
	if (!isAuthorized) return null;
	return <ClassesTab />;
}

export default function ClassesPage() {
	return <Suspense><Inner /></Suspense>;
}
