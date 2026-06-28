"use client";
import { useAuth } from "@/app/context/AuthContext";
import { apiFetch } from "@/app/lib/api";

export function useApiFetch() {
	const { accessToken, refreshTokens, logout } = useAuth();

	return async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
		return apiFetch<T>(path, init, accessToken, async () => {
			try {
				return await refreshTokens();
			} catch {
				await logout();
				return null;
			}
		});
	};
}
