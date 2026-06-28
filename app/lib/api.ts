const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export class ApiError extends Error {
	constructor(public status: number, public data: unknown) {
		super(`API error ${status}`);
	}
}

export async function apiFetch<T>(
	path: string,
	init: RequestInit = {},
	token?: string | null,
	onTokenExpired?: () => Promise<string | null>
): Promise<T> {
	const headers: Record<string, string> = {
		"Content-Type": "application/json",
		...(init.headers as Record<string, string> ?? {}),
	};
	if (token) headers["Authorization"] = `Bearer ${token}`;

	let res = await fetch(`${BASE}${path}`, { ...init, credentials: "include", headers });

	if (res.status === 401 && onTokenExpired) {
		const newToken = await onTokenExpired();
		if (newToken) {
			headers["Authorization"] = `Bearer ${newToken}`;
			res = await fetch(`${BASE}${path}`, { ...init, credentials: "include", headers });
		}
	}

	if (res.status === 204) return undefined as T;
	if (!res.ok) throw new ApiError(res.status, await res.json());
	return res.json() as Promise<T>;
}
