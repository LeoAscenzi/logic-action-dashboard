"use client";
import { FormEvent, useEffect, useState } from "react";
import { useRequireAuth } from "@/app/hooks/useRequireAuth";
import { useApiFetch } from "@/app/hooks/useApiFetch";
import { useAuth } from "@/app/context/AuthContext";

const inputCls =
	"w-full rounded-lg border border-[var(--line)] bg-white px-4 py-2.5 text-sm text-[var(--ink)] " +
	"placeholder:text-[var(--ink-soft)] focus:outline-none focus:ring-1 focus:ring-[var(--navy)]";
const readOnlyCls =
	"w-full rounded-lg border border-[var(--line)] bg-[var(--cream)] px-4 py-2.5 text-sm text-[var(--ink-soft)] cursor-not-allowed";
const labelCls = "block text-xs font-semibold text-[var(--navy)] mb-1 uppercase tracking-wide";

export default function ProfilePage() {
	const { user, isAuthorized } = useRequireAuth();
	const { updateUser } = useAuth();
	const apiFetch = useApiFetch();

	const [fname, setFname]         = useState("");
	const [lname, setLname]         = useState("");
	const [saving, setSaving]       = useState(false);
	const [success, setSuccess]     = useState(false);
	const [error, setError]         = useState("");

	useEffect(() => {
		if (!user) return;
		setFname(user.fname);
		setLname(user.lname);
	}, [user]);

	const handleSubmit = async (e: FormEvent) => {
		e.preventDefault();
		setSaving(true);
		setSuccess(false);
		setError("");
		try {
			await apiFetch("/me", {
				method: "PATCH",
				body: JSON.stringify({ fname: fname.trim(), lname: lname.trim() }),
			});
			updateUser({ fname: fname.trim(), lname: lname.trim() });
			setSuccess(true);
		} catch {
			setError("Failed to save changes. Please try again.");
		} finally {
			setSaving(false);
		}
	};

	if (!isAuthorized || !user) return null;

	return (
		<div className="max-w-lg mx-auto px-8 py-10">
			<h1 className="font-playfair text-2xl font-semibold text-[var(--ink)] mb-8">Profile</h1>

			<form onSubmit={handleSubmit} className="flex flex-col gap-5">
				<div className="grid grid-cols-2 gap-4">
					<div>
						<label className={labelCls}>First Name</label>
						<input
							className={inputCls}
							value={fname}
							onChange={(e) => { setFname(e.target.value); setSuccess(false); }}
							required
						/>
					</div>
					<div>
						<label className={labelCls}>Last Name</label>
						<input
							className={inputCls}
							value={lname}
							onChange={(e) => { setLname(e.target.value); setSuccess(false); }}
							required
						/>
					</div>
				</div>

				<div>
					<label className={labelCls}>Email</label>
					<input className={readOnlyCls} value={user.email ?? ""} readOnly tabIndex={-1} />
				</div>

				<div>
					<label className={labelCls}>Role</label>
					<input className={`${readOnlyCls} capitalize`} value={user.role} readOnly tabIndex={-1} />
				</div>

				{error && <p className="text-red-500 text-sm">{error}</p>}
				{success && <p className="text-green-600 text-sm">Changes saved.</p>}

				<button
					type="submit"
					disabled={saving}
					className="self-start rounded-lg bg-[var(--navy)] text-[var(--cream)] px-6 py-2.5 text-sm font-semibold hover:bg-[var(--navy-mid)] transition-colors disabled:opacity-50"
				>
					{saving ? "Saving…" : "Save Changes"}
				</button>
			</form>
		</div>
	);
}
