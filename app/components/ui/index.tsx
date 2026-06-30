"use client";
import { useCallback, useState } from "react";

// ── Shared dashboard UI primitives ─────────────────────────────────────────────
// All built on the CSS-var design tokens defined in app/globals.css and exposed
// as Tailwind utilities via @theme inline (bg-gold, text-ink, border-line, …).
// Use these instead of re-defining per-file inputCls/btnCls/Toast/statusBadge.

type Cls = { className?: string };

// ── Input / Select / Label ──────────────────────────────────────────────────

const fieldCls =
	"w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink " +
	"placeholder:text-ink-soft focus:outline-none focus:ring-1 focus:ring-navy";

export function Input({ className = "", ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
	return <input {...props} className={`${fieldCls} ${className}`} />;
}

export function Select({ className = "", ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
	return <select {...props} className={`${fieldCls} ${className}`} />;
}

export function Label({ className = "", children }: Cls & { children: React.ReactNode }) {
	return (
		<label className={`block text-xs font-semibold text-navy mb-1 uppercase tracking-wide ${className}`}>
			{children}
		</label>
	);
}

// ── Button ────────────────────────────────────────────────────────────────────

type Variant = "primary" | "ghost" | "danger" | "navy";

const variants: Record<Variant, string> = {
	primary: "bg-gold text-ink hover:bg-gold-light",
	navy:    "bg-navy text-cream hover:bg-navy-mid",
	ghost:   "border border-gold/70 text-gold hover:bg-gold/10",
	danger:  "border border-red-400/70 text-red-600 hover:bg-red-50",
};

export function Button({
	variant = "primary",
	className = "",
	...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
	return (
		<button
			{...props}
			className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-50 ${variants[variant]} ${className}`}
		/>
	);
}

// ── StatusBadge ─────────────────────────────────────────────────────────────

type Tone = "success" | "warn" | "danger" | "neutral" | "gold";

const tones: Record<Tone, string> = {
	success: "bg-green-100 text-green-700",
	warn:    "bg-yellow-100 text-yellow-700",
	danger:  "bg-red-100 text-red-700",
	neutral: "bg-ink/10 text-ink/50",
	gold:    "bg-gold/15 text-gold",
};

export function StatusBadge({ label, tone = "neutral" }: { label: string; tone?: Tone }) {
	return (
		<span className={`inline-block text-[10px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded ${tones[tone]}`}>
			{label}
		</span>
	);
}

// ── TableWrap (horizontal scroll on mobile) ───────────────────────────────────

export function TableWrap({ className = "", children }: Cls & { children: React.ReactNode }) {
	return <div className={`overflow-x-auto ${className}`}>{children}</div>;
}

// ── Toast ─────────────────────────────────────────────────────────────────────

export function Toast({ msg, ok }: { msg: string; ok: boolean }) {
	return (
		<div className={`fixed bottom-6 right-6 z-50 rounded-xl px-5 py-3 text-sm font-medium shadow-lg ${
			ok ? "bg-green-600 text-white" : "bg-red-600 text-white"
		}`}>
			{msg}
		</div>
	);
}

/**
 * useToast — replaces the per-file `toast(text, ok)` + setTimeout pattern.
 * Returns the toast node to render and a `flash(msg, ok?)` trigger.
 */
export function useToast(timeoutMs = 3000) {
	const [state, setState] = useState<{ msg: string; ok: boolean } | null>(null);
	const flash = useCallback((msg: string, ok = true) => {
		setState({ msg, ok });
		setTimeout(() => setState(null), timeoutMs);
	}, [timeoutMs]);
	const node = state ? <Toast msg={state.msg} ok={state.ok} /> : null;
	return { node, flash };
}
