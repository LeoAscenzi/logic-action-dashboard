"use client";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

type UserRole = "admin" | "parent" | "teacher";

export interface AuthUser {
	id: number;
	role: UserRole;
	fname: string;
	lname: string;
	email: string;
	avatar_url?: string | null;
	email_grades?: boolean;
	email_announcements?: boolean;
	email_events?: boolean;
}

interface AuthContextValue {
	user: AuthUser | null;
	accessToken: string | null;
	isLoading: boolean;
	login: (username: string, password: string) => Promise<AuthUser>;
	logout: () => Promise<void>;
	refreshTokens: () => Promise<string | null>;
	updateUser: (patch: Partial<AuthUser>) => void;
}

const AuthContext = createContext<AuthContextValue>({
	user: null,
	accessToken: null,
	isLoading: true,
	login: async () => ({ id: 0, role: "parent" as const, fname: "", lname: "", email: "" }),
	logout: async () => {},
	refreshTokens: async () => null,
	updateUser: () => {},
});

type TabMessage =
	| { type: "TOKEN"; token: string; user: AuthUser }
	| { type: "REQUEST_TOKEN" }
	| { type: "LOGOUT" };

async function fetchMe(token: string): Promise<AuthUser> {
	const res = await fetch(`${API}/me`, {
		headers: { Authorization: `Bearer ${token}` },
	});
	if (!res.ok) throw new Error("Failed to fetch profile");
	return res.json();
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
	const [user, setUser] = useState<AuthUser | null>(null);
	const [accessToken, setAccessToken] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(true);

	const tokenRef = useRef<string | null>(null);
	const userRef = useRef<AuthUser | null>(null);
	const channelRef = useRef<BroadcastChannel | null>(null);
	const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const refreshingRef = useRef(false);

	useEffect(() => { tokenRef.current = accessToken; }, [accessToken]);
	useEffect(() => { userRef.current = user; }, [user]);

	const broadcast = useCallback((msg: TabMessage) => {
		channelRef.current?.postMessage(msg);
	}, []);

	const refreshTokens = useCallback(async (): Promise<string | null> => {
		if (refreshingRef.current) return tokenRef.current;
		refreshingRef.current = true;
		try {
			const res = await fetch(`${API}/refresh`, {
				method: "POST",
				credentials: "include",
			});
			if (!res.ok) return null;
			const { access_token } = await res.json();
			setAccessToken(access_token);
			return access_token;
		} catch {
			return null;
		} finally {
			refreshingRef.current = false;
		}
	}, []);

	useEffect(() => {
		const channel = new BroadcastChannel("auth");
		channelRef.current = channel;

		channel.onmessage = (evt: MessageEvent<TabMessage>) => {
			const msg = evt.data;

			if (msg.type === "REQUEST_TOKEN") {
				if (tokenRef.current && userRef.current) {
					broadcast({ type: "TOKEN", token: tokenRef.current, user: userRef.current });
				}
				return;
			}

			if (msg.type === "TOKEN") {
				if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
				setAccessToken(msg.token);
				setUser(msg.user);
				setIsLoading(false);
				return;
			}

			if (msg.type === "LOGOUT") {
				setAccessToken(null);
				setUser(null);
			}
		};

		broadcast({ type: "REQUEST_TOKEN" });

		refreshTimerRef.current = setTimeout(async () => {
			if (tokenRef.current) return;

			// Token handoff from site when navigating cross-domain (no shared cookie)
			const params = new URLSearchParams(window.location.search);
			const handoffToken = params.get("token");
			if (handoffToken) {
				const url = new URL(window.location.href);
				url.searchParams.delete("token");
				window.history.replaceState({}, "", url.toString());
				try {
					const profile = await fetchMe(handoffToken);
					setAccessToken(handoffToken);
					setUser(profile);
					broadcast({ type: "TOKEN", token: handoffToken, user: profile });
				} catch { /* invalid token, fall through unauthenticated */ } finally {
					setIsLoading(false);
				}
				return;
			}

			try {
				const token = await refreshTokens();
				if (token) {
					const profile = await fetchMe(token);
					setUser(profile);
					broadcast({ type: "TOKEN", token, user: profile });
				}
			} finally {
				setIsLoading(false);
			}
		}, 150);

		return () => {
			if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
			channel.close();
		};
	}, []); // eslint-disable-line react-hooks/exhaustive-deps

	const login = async (username: string, password: string): Promise<AuthUser> => {
		let res: Response;
		try {
			res = await fetch(`${API}/login`, {
				method: "POST",
				credentials: "include",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ username, password }),
			});
		} catch {
			throw new Error("Unable to reach the server. Please try again later.");
		}
		if (!res.ok) {
			const fallback = res.status >= 500
				? "Service unavailable. Please try again later."
				: "Login failed. Please check your credentials.";
			let detail = fallback;
			try { detail = (await res.json()).detail ?? fallback; } catch { /* non-JSON error body */ }
			throw new Error(detail);
		}
		const { access_token } = await res.json();
		const profile = await fetchMe(access_token);
		setAccessToken(access_token);
		setUser(profile);
		broadcast({ type: "TOKEN", token: access_token, user: profile });
		return profile;
	};

	const logout = async () => {
		try {
			await fetch(`${API}/logout`, { method: "POST", credentials: "include" });
		} finally {
			setUser(null);
			setAccessToken(null);
			broadcast({ type: "LOGOUT" });
		}
	};

	const updateUser = (patch: Partial<AuthUser>) => {
		setUser((prev) => {
			if (!prev) return prev;
			const updated = { ...prev, ...patch };
			if (tokenRef.current) broadcast({ type: "TOKEN", token: tokenRef.current, user: updated });
			return updated;
		});
	};

	return (
		<AuthContext.Provider value={{ user, accessToken, isLoading, login, logout, refreshTokens, updateUser }}>
			{children}
		</AuthContext.Provider>
	);
}

export const useAuth = () => useContext(AuthContext);
