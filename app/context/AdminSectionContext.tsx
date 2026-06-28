"use client";
import { createContext, useContext, useState } from "react";

type AdminSection = "students" | "classes" | "grades" | "teachers";

interface AdminSectionContextValue {
	section: AdminSection;
	setSection: (s: AdminSection) => void;
	selectedId: number | null;
	navigateTo: (s: AdminSection, id?: number) => void;
}

const AdminSectionContext = createContext<AdminSectionContextValue>({
	section: "students",
	setSection: () => {},
	selectedId: null,
	navigateTo: () => {},
});

export function AdminSectionProvider({ children }: { children: React.ReactNode }) {
	const [section, setSection] = useState<AdminSection>("students");
	const [selectedId, setSelectedId] = useState<number | null>(null);

	const navigateTo = (s: AdminSection, id?: number) => {
		setSection(s);
		setSelectedId(id ?? null);
	};

	const handleSetSection = (s: AdminSection) => {
		setSection(s);
		setSelectedId(null);
	};

	return (
		<AdminSectionContext.Provider value={{ section, setSection: handleSetSection, selectedId, navigateTo }}>
			{children}
		</AdminSectionContext.Provider>
	);
}

export function useAdminSection() {
	return useContext(AdminSectionContext);
}
