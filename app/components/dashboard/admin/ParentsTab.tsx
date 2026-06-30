"use client";
import UserManagementTab from "./UserManagementTab";

export default function ParentsTab() {
	return <UserManagementTab title="Parents" listPath="/admin/parents" inviteRole="parent" />;
}
