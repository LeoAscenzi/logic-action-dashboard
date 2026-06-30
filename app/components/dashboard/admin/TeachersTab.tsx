"use client";
import UserManagementTab from "./UserManagementTab";

export default function TeachersTab() {
	return <UserManagementTab title="Teachers" listPath="/admin/teachers" inviteRole="teacher" />;
}
