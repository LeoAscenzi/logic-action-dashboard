"use client";
import { useRequireAuth } from "@/app/hooks/useRequireAuth";
import { useAdminSection } from "@/app/context/AdminSectionContext";
import StudentsTab  from "@/app/components/dashboard/admin/StudentsTab";
import ClassesTab   from "@/app/components/dashboard/admin/ClassesTab";
import GradesTab    from "@/app/components/dashboard/admin/GradesTab";
import TeachersTab  from "@/app/components/dashboard/admin/TeachersTab";

export default function AdminDashboard() {
	const { isAuthorized } = useRequireAuth("admin");
	const { section }      = useAdminSection();

	if (!isAuthorized) return null;

	return (
		<>
			{section === "students" && <StudentsTab  />}
			{section === "classes"  && <ClassesTab   />}
			{section === "grades"   && <GradesTab    />}
			{section === "teachers" && <TeachersTab  />}
		</>
	);
}
