"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRequireAuth } from "@/app/hooks/useRequireAuth";
import { useApiFetch } from "@/app/hooks/useApiFetch";
import { ApiError } from "@/app/lib/api";

interface Post {
	id: number;
	title: string;
	created_at: string;
}

function formatDate(iso: string): string {
	return new Date(iso).toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
	});
}

export default function MyPostsPage() {
	const { user, isAuthorized } = useRequireAuth();
	const apiFetch = useApiFetch();

	const [posts, setPosts] = useState<Post[]>([]);
	const [loading, setLoading] = useState(true);
	const [deleting, setDeleting] = useState<number | null>(null);
	const [error, setError] = useState("");

	useEffect(() => {
		if (!isAuthorized) return;
		apiFetch<Post[]>("/community/my-posts")
			.then(setPosts)
			.catch(() => setError("Failed to load posts."))
			.finally(() => setLoading(false));
	}, [isAuthorized]); // eslint-disable-line react-hooks/exhaustive-deps

	const handleDelete = async (id: number) => {
		if (!confirm("Delete this post? This cannot be undone.")) return;
		setDeleting(id);
		try {
			await apiFetch(`/community/posts/${id}`, { method: "DELETE" });
			setPosts((prev) => prev.filter((p) => p.id !== id));
		} catch (err) {
			setError(err instanceof ApiError ? "Failed to delete post." : "An error occurred.");
		} finally {
			setDeleting(null);
		}
	};

	if (!isAuthorized) return null;

	const backHref = user ? `/dashboard/${user.role}` : "/dashboard";

	function PostSkeleton() {
		return (
			<div className="flex items-center justify-between px-5 py-4 bg-white animate-pulse">
				<div className="flex-1 mr-4 flex flex-col gap-1.5">
					<div className="h-3.5 w-2/3 bg-[var(--line)] rounded" />
					<div className="h-3 w-24 bg-[var(--line)] rounded" />
				</div>
				<div className="h-3 w-12 bg-[var(--line)] rounded shrink-0" />
			</div>
		);
	}

	return (
		<div className="max-w-3xl mx-auto px-8 py-10">
			<Link
				href={backHref}
				className="inline-flex items-center gap-1 text-sm text-[var(--ink-soft)] hover:text-[var(--ink)] transition-colors mb-6"
			>
				← Back
			</Link>

			<h1 className="font-playfair text-2xl font-semibold text-[var(--ink)] mb-8">My Posts</h1>

			{error && (
				<p className="text-red-500 text-sm mb-4">{error}</p>
			)}

			{loading ? (
				<div className="flex flex-col divide-y divide-[var(--line)] border border-[var(--line)] rounded-xl overflow-hidden">
					{Array.from({ length: 4 }).map((_, i) => <PostSkeleton key={i} />)}
				</div>
			) : posts.length === 0 ? (
				<p className="text-[var(--ink-soft)] text-sm py-16 text-center">
					You haven&apos;t posted yet.
				</p>
			) : (
				<div className="flex flex-col divide-y divide-[var(--line)] border border-[var(--line)] rounded-xl overflow-hidden">
					{posts.map((post) => (
						<div key={post.id} className="flex items-center justify-between px-5 py-4 bg-white">
							<div className="flex-1 min-w-0 mr-4">
								<p className="font-medium text-[var(--ink)] text-sm truncate">{post.title}</p>
								<p className="text-xs text-[var(--ink-soft)] mt-0.5">{formatDate(post.created_at)}</p>
							</div>
							<button
								onClick={() => handleDelete(post.id)}
								disabled={deleting === post.id}
								className="shrink-0 text-xs font-semibold text-red-500 hover:text-red-700 transition-colors disabled:opacity-40"
							>
								{deleting === post.id ? "Deleting…" : "Delete"}
							</button>
						</div>
					))}
				</div>
			)}
		</div>
	);
}
