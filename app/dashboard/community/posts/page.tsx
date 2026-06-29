"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRequireAuth } from "@/app/hooks/useRequireAuth";
import { useApiFetch } from "@/app/hooks/useApiFetch";
import { ApiError } from "@/app/lib/api";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

interface Post {
	id: number;
	title: string;
	created_at: string;
}

interface MyComment {
	id: number;
	post_id: number;
	post_title: string;
	content: string;
	created_at: string;
}

type ActivityItem =
	| { kind: "post"; id: number; title: string; created_at: string }
	| { kind: "comment"; id: number; post_id: number; post_title: string; content: string; created_at: string };

type Filter = "all" | "posts" | "comments";

function formatDate(iso: string): string {
	return new Date(iso).toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
	});
}

function SkeletonRow() {
	return (
		<div className="flex items-start gap-3 px-5 py-4 bg-white animate-pulse">
			<div className="mt-0.5 h-4 w-14 bg-[var(--line)] rounded shrink-0" />
			<div className="flex-1 flex flex-col gap-1.5">
				<div className="h-3.5 w-2/3 bg-[var(--line)] rounded" />
				<div className="h-3 w-32 bg-[var(--line)] rounded" />
			</div>
			<div className="h-3 w-10 bg-[var(--line)] rounded shrink-0 mt-1" />
		</div>
	);
}

export default function MyActivityPage() {
	const { user, isAuthorized } = useRequireAuth();
	const apiFetch = useApiFetch();

	const [items, setItems]       = useState<ActivityItem[]>([]);
	const [loading, setLoading]   = useState(true);
	const [filter, setFilter]     = useState<Filter>("all");
	const [deleting, setDeleting] = useState<number | null>(null);
	const [error, setError]       = useState("");

	useEffect(() => {
		if (!isAuthorized) return;
		Promise.all([
			apiFetch<Post[]>("/community/my-posts"),
			apiFetch<MyComment[]>("/community/my-comments"),
		])
			.then(([posts, comments]) => {
				const postItems: ActivityItem[] = posts.map((p) => ({
					kind: "post",
					id: p.id,
					title: p.title,
					created_at: p.created_at,
				}));
				const commentItems: ActivityItem[] = comments.map((c) => ({
					kind: "comment",
					id: c.id,
					post_id: c.post_id,
					post_title: c.post_title,
					content: c.content,
					created_at: c.created_at,
				}));
				const combined = [...postItems, ...commentItems].sort(
					(a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
				);
				setItems(combined);
			})
			.catch(() => setError("Failed to load activity."))
			.finally(() => setLoading(false));
	}, [isAuthorized]); // eslint-disable-line react-hooks/exhaustive-deps

	const handleDeletePost = async (id: number) => {
		if (!confirm("Delete this post? This cannot be undone.")) return;
		setDeleting(id);
		try {
			await apiFetch(`/community/posts/${id}`, { method: "DELETE" });
			setItems((prev) => prev.filter((item) => {
				if (item.kind === "post" && item.id === id) return false;
				if (item.kind === "comment" && item.post_id === id) return false;
				return true;
			}));
		} catch (err) {
			setError(err instanceof ApiError ? "Failed to delete post." : "An error occurred.");
		} finally {
			setDeleting(null);
		}
	};

	const handleDeleteComment = async (id: number) => {
		if (!confirm("Delete this comment? This cannot be undone.")) return;
		setDeleting(id * -1);
		try {
			await apiFetch(`/community/comments/${id}`, { method: "DELETE" });
			setItems((prev) => prev.filter((item) => !(item.kind === "comment" && item.id === id)));
		} catch (err) {
			setError(err instanceof ApiError ? "Failed to delete comment." : "An error occurred.");
		} finally {
			setDeleting(null);
		}
	};

	if (!isAuthorized) return null;

	const backHref = user ? `/dashboard/${user.role}` : "/dashboard";

	const visible = items.filter((item) => {
		if (filter === "posts") return item.kind === "post";
		if (filter === "comments") return item.kind === "comment";
		return true;
	});

	return (
		<div className="max-w-3xl mx-auto px-8 py-10">
			<Link
				href={backHref}
				className="inline-flex items-center gap-1 text-sm text-[var(--ink-soft)] hover:text-[var(--ink)] transition-colors mb-6"
			>
				← Back
			</Link>

			<div className="flex items-center justify-between mb-8">
				<h1 className="font-playfair text-2xl font-semibold text-[var(--ink)]">My Activity</h1>
				<select
					value={filter}
					onChange={(e) => setFilter(e.target.value as Filter)}
					className="text-sm rounded-lg border border-[var(--line)] bg-white px-3 py-1.5 text-[var(--ink)] focus:outline-none focus:ring-1 focus:ring-[var(--navy)]"
				>
					<option value="all">All Activity</option>
					<option value="posts">Posts Only</option>
					<option value="comments">Comments Only</option>
				</select>
			</div>

			{error && <p className="text-red-500 text-sm mb-4">{error}</p>}

			{loading ? (
				<div className="flex flex-col divide-y divide-[var(--line)] border border-[var(--line)] rounded-xl overflow-hidden">
					{Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)}
				</div>
			) : visible.length === 0 ? (
				<p className="text-[var(--ink-soft)] text-sm py-16 text-center">
					{filter === "all" ? "No activity yet." : filter === "posts" ? "No posts yet." : "No comments yet."}
				</p>
			) : (
				<div className="flex flex-col gap-2">
					{visible.map((item) => {
						if (item.kind === "post") {
							const href = `${SITE_URL}/community/post/${item.id}`;
							const isDeletingThis = deleting === item.id;
							return (
								<div key={`post-${item.id}`} className="relative flex items-start gap-3 px-5 py-5 bg-white border border-[var(--line)] rounded-xl hover:border-[var(--cream-dim)] hover:shadow-sm transition-all">
									<span className="relative z-[1] mt-0.5 text-[10px] font-semibold uppercase tracking-widest bg-[var(--navy)] text-[var(--cream)] px-2 py-0.5 rounded shrink-0">
										Post
									</span>
									<div className="flex-1 min-w-0">
										<a
											href={href}
											target="_blank"
											rel="noopener noreferrer"
											className="font-medium text-[var(--ink)] text-sm hover:text-[var(--navy)] after:absolute after:inset-0 after:rounded-xl after:content-['']"
										>
											{item.title}
										</a>
										<p className="text-xs text-[var(--ink-soft)] mt-0.5">{formatDate(item.created_at)}</p>
									</div>
									<button
										onClick={() => handleDeletePost(item.id)}
										disabled={isDeletingThis}
										className="relative z-[1] shrink-0 text-xs font-semibold text-red-500 hover:text-red-700 transition-colors disabled:opacity-40 mt-0.5"
									>
										{isDeletingThis ? "Deleting…" : "Delete"}
									</button>
								</div>
							);
						}

						// comment
						const href = `${SITE_URL}/community/post/${item.post_id}#comment-${item.id}`;
						const isDeletingThis = deleting === item.id * -1;
						return (
							<div key={`comment-${item.id}`} className="relative flex items-start gap-3 px-5 py-5 bg-white border border-[var(--line)] rounded-xl hover:border-[var(--cream-dim)] hover:shadow-sm transition-all">
								<span className="relative z-[1] mt-0.5 text-[10px] font-semibold uppercase tracking-widest bg-[var(--gold)] text-white px-2 py-0.5 rounded shrink-0">
									Comment
								</span>
								<div className="flex-1 min-w-0">
									<a
										href={href}
										target="_blank"
										rel="noopener noreferrer"
										className="font-medium text-[var(--ink)] text-sm hover:text-[var(--navy)] after:absolute after:inset-0 after:rounded-xl after:content-['']"
									>
										{item.post_title}
									</a>
									<p className="text-xs text-[var(--ink-soft)] mt-0.5 truncate">{item.content}</p>
									<p className="text-xs text-[var(--ink-soft)] mt-0.5">{formatDate(item.created_at)}</p>
								</div>
								<button
									onClick={() => handleDeleteComment(item.id)}
									disabled={isDeletingThis}
									className="relative z-[1] shrink-0 text-xs font-semibold text-red-500 hover:text-red-700 transition-colors disabled:opacity-40 mt-0.5"
								>
									{isDeletingThis ? "Deleting…" : "Delete"}
								</button>
							</div>
						);
					})}
				</div>
			)}
		</div>
	);
}
