"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useApiFetch } from "@/app/hooks/useApiFetch";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Student {
	id: number;
	fname: string;
	lname: string;
}

interface LineItem {
	id: number;
	description: string;
	amount: number;
}

interface Invoice {
	id: number;
	student_id: number | null;
	due_date: string;
	status: "unpaid" | "partial" | "paid" | "void";
	memo: string | null;
	created_at: string;
	line_items: LineItem[];
	total: number;
	amount_paid: number;
}

interface Payment {
	id: number;
	student_id: number | null;
	invoice_id: number | null;
	amount: number;
	method: string;
	status: "completed" | "refunded";
	received_at: string;
	memo: string | null;
	external_reference: string | null;
	created_at: string;
}

interface Balance {
	student_id: number;
	fname: string;
	lname: string;
	total_invoiced: number;
	total_paid: number;
	balance: number;
}

type View = "balances" | "invoices" | "payments";

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
	n.toLocaleString("en-US", { style: "currency", currency: "USD" });

const statusBadge = (s: Invoice["status"]) => {
	const map: Record<Invoice["status"], string> = {
		unpaid:  "bg-red-100 text-red-700",
		partial: "bg-yellow-100 text-yellow-700",
		paid:    "bg-green-100 text-green-700",
		void:    "bg-navy/10 text-ink/40",
	};
	return (
		<span className={`inline-block text-[10px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded ${map[s]}`}>
			{s}
		</span>
	);
};

const paymentStatusBadge = (s: Payment["status"]) => (
	<span className={`inline-block text-[10px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded ${
		s === "completed" ? "bg-green-100 text-green-700" : "bg-navy/10 text-ink/40"
	}`}>
		{s}
	</span>
);

const METHODS = ["cash", "venmo", "zelle", "check", "stripe", "other"] as const;
const inputCls = "w-full rounded-lg border border-gold/60 bg-white px-3 py-2 text-sm text-ink focus:outline-none focus:ring-1 focus:ring-gold";
const labelCls = "block text-xs font-semibold text-ink/60 mb-1 uppercase tracking-wider";

// ── Sub-components ────────────────────────────────────────────────────────────

function Toast({ msg, ok }: { msg: string; ok: boolean }) {
	return (
		<div className={`fixed bottom-6 right-6 z-50 rounded-xl px-5 py-3 text-sm font-medium shadow-lg ${
			ok ? "bg-green-600 text-white" : "bg-red-600 text-white"
		}`}>
			{msg}
		</div>
	);
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function PaymentsTab() {
	const apiFetch = useApiFetch();
	const apiFetchRef = useRef(apiFetch);
	apiFetchRef.current = apiFetch;

	const [view, setView]             = useState<View>("balances");
	const [balances, setBalances]     = useState<Balance[]>([]);
	const [invoices, setInvoices]     = useState<Invoice[]>([]);
	const [payments, setPayments]     = useState<Payment[]>([]);
	const [students, setStudents]     = useState<Student[]>([]);
	const [loading, setLoading]       = useState(true);
	const [toast, setToast]           = useState<{ msg: string; ok: boolean } | null>(null);

	// Student finance panel
	const [selStudent, setSelStudent] = useState<Balance | null>(null);
	const [stuInvoices, setStuInvoices] = useState<Invoice[]>([]);
	const [stuPayments, setStuPayments] = useState<Payment[]>([]);
	const [stuLoading, setStuLoading]   = useState(false);

	// Forms
	const [showInvoiceForm, setShowInvoiceForm]   = useState(false);
	const [showPaymentForm, setShowPaymentForm]   = useState(false);

	const emptyInvoice = { student_id: "", due_date: "", memo: "", line_items: [{ description: "", amount: "" }] };
	const emptyPayment = { student_id: "", invoice_id: "", amount: "", method: "cash" as typeof METHODS[number], received_at: "", memo: "", external_reference: "" };

	const [invoiceForm, setInvoiceForm] = useState(emptyInvoice);
	const [paymentForm, setPaymentForm] = useState(emptyPayment);
	const [submitting, setSubmitting]   = useState(false);

	// ── Data fetching ─────────────────────────────────────────────────────

	const flash = (msg: string, ok = true) => {
		setToast({ msg, ok });
		setTimeout(() => setToast(null), 3000);
	};

	const loadAll = useCallback(async () => {
		setLoading(true);
		try {
			const fetch = apiFetchRef.current;
			const [b, inv, pay, stu] = await Promise.all([
				fetch<Balance[]>("/admin/balances"),
				fetch<Invoice[]>("/admin/invoices"),
				fetch<Payment[]>("/admin/payments"),
				fetch<Student[]>("/admin/students"),
			]);
			setBalances(b);
			setInvoices(inv);
			setPayments(pay);
			setStudents(stu);
		} catch {
			flash("Failed to load data.", false);
		} finally {
			setLoading(false);
		}
	}, []); // eslint-disable-line react-hooks/exhaustive-deps

	useEffect(() => { loadAll(); }, [loadAll]);

	const loadStudentData = useCallback(async (studentId: number) => {
		setStuLoading(true);
		try {
			const fetch = apiFetchRef.current;
			const [inv, pay] = await Promise.all([
				fetch<Invoice[]>(`/admin/invoices?student_id=${studentId}`),
				fetch<Payment[]>(`/admin/payments?student_id=${studentId}`),
			]);
			setStuInvoices(inv);
			setStuPayments(pay);
		} finally {
			setStuLoading(false);
		}
	}, []); // eslint-disable-line react-hooks/exhaustive-deps

	const openStudent = (b: Balance) => {
		setSelStudent(b);
		loadStudentData(b.student_id);
		setShowInvoiceForm(false);
		setShowPaymentForm(false);
	};

	// ── Invoice actions ───────────────────────────────────────────────────

	const handleVoidInvoice = async (id: number) => {
		if (!confirm("Void this invoice? This cannot be undone.")) return;
		try {
			await apiFetchRef.current(`/admin/invoices/${id}/void`, { method: "POST" });
			flash("Invoice voided.");
			await loadAll();
			if (selStudent) await loadStudentData(selStudent.student_id);
		} catch {
			flash("Failed to void invoice.", false);
		}
	};

	const handleSubmitInvoice = async (e: React.FormEvent) => {
		e.preventDefault();
		const items = invoiceForm.line_items.filter(i => i.description && i.amount);
		if (!items.length) { flash("Add at least one line item.", false); return; }
		setSubmitting(true);
		try {
			await apiFetchRef.current("/admin/invoices", {
				method: "POST",
				body: JSON.stringify({
					student_id: invoiceForm.student_id ? parseInt(invoiceForm.student_id) : null,
					due_date: invoiceForm.due_date,
					memo: invoiceForm.memo || null,
					line_items: items.map(i => ({ description: i.description, amount: parseFloat(i.amount) })),
				}),
			});
			flash("Invoice created.");
			setShowInvoiceForm(false);
			setInvoiceForm(emptyInvoice);
			await loadAll();
			if (selStudent) await loadStudentData(selStudent.student_id);
		} catch {
			flash("Failed to create invoice.", false);
		} finally {
			setSubmitting(false);
		}
	};

	// ── Payment actions ───────────────────────────────────────────────────

	const handleRefundPayment = async (id: number) => {
		if (!confirm("Mark this payment as refunded?")) return;
		try {
			await apiFetchRef.current(`/admin/payments/${id}/refund`, { method: "POST" });
			flash("Payment refunded.");
			await loadAll();
			if (selStudent) await loadStudentData(selStudent.student_id);
		} catch {
			flash("Failed to refund payment.", false);
		}
	};

	const handleSubmitPayment = async (e: React.FormEvent) => {
		e.preventDefault();
		setSubmitting(true);
		try {
			await apiFetchRef.current("/admin/payments", {
				method: "POST",
				body: JSON.stringify({
					student_id: paymentForm.student_id ? parseInt(paymentForm.student_id) : null,
					invoice_id: paymentForm.invoice_id ? parseInt(paymentForm.invoice_id) : null,
					amount: parseFloat(paymentForm.amount),
					method: paymentForm.method,
					received_at: paymentForm.received_at,
					memo: paymentForm.memo || null,
					external_reference: paymentForm.external_reference || null,
				}),
			});
			flash("Payment recorded.");
			setShowPaymentForm(false);
			setPaymentForm(emptyPayment);
			await loadAll();
			if (selStudent) await loadStudentData(selStudent.student_id);
		} catch {
			flash("Failed to record payment.", false);
		} finally {
			setSubmitting(false);
		}
	};

	// ── Line item helpers ─────────────────────────────────────────────────

	const addLineItem = () =>
		setInvoiceForm(f => ({ ...f, line_items: [...f.line_items, { description: "", amount: "" }] }));

	const removeLineItem = (i: number) =>
		setInvoiceForm(f => ({ ...f, line_items: f.line_items.filter((_, idx) => idx !== i) }));

	const setLineItem = (i: number, field: "description" | "amount", val: string) =>
		setInvoiceForm(f => ({
			...f,
			line_items: f.line_items.map((item, idx) => idx === i ? { ...item, [field]: val } : item),
		}));

	const invoiceTotal = invoiceForm.line_items.reduce((s, i) => s + (parseFloat(i.amount) || 0), 0);

	// ── Render ────────────────────────────────────────────────────────────

	const viewBtn = (v: View, label: string) => (
		<button
			onClick={() => { setView(v); setSelStudent(null); }}
			className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
				view === v
					? "bg-gold text-ink"
					: "text-ink/60 hover:text-ink border border-gold/30 hover:border-gold"
			}`}
		>
			{label}
		</button>
	);

	// ── Invoice form ──────────────────────────────────────────────────────

	const InvoiceForm = () => (
		<form onSubmit={handleSubmitInvoice} className="border border-gold/30 rounded-xl p-5 bg-white mb-6">
			<h3 className="text-sm font-semibold text-gold mb-4">New Invoice</h3>
			<div className="grid grid-cols-2 gap-4 mb-4">
				<div>
					<label className={labelCls}>Student (optional)</label>
					<select
						className={inputCls}
						value={invoiceForm.student_id}
						onChange={e => setInvoiceForm(f => ({ ...f, student_id: e.target.value }))}
					>
						<option value="">— Misc / No Student —</option>
						{students.map(s => <option key={s.id} value={s.id}>{s.fname} {s.lname}</option>)}
					</select>
				</div>
				<div>
					<label className={labelCls}>Due Date</label>
					<input
						type="date" required className={inputCls}
						value={invoiceForm.due_date}
						onChange={e => setInvoiceForm(f => ({ ...f, due_date: e.target.value }))}
					/>
				</div>
			</div>
			<div className="mb-4">
				<label className={labelCls}>Memo</label>
				<input
					type="text" className={inputCls} placeholder="e.g. Fall SAT tutoring package"
					value={invoiceForm.memo}
					onChange={e => setInvoiceForm(f => ({ ...f, memo: e.target.value }))}
				/>
			</div>

			<div className="mb-3">
				<div className="flex items-center justify-between mb-2">
					<label className={labelCls}>Line Items</label>
					<button type="button" onClick={addLineItem} className="text-xs text-gold hover:underline">+ Add item</button>
				</div>
				{invoiceForm.line_items.map((item, i) => (
					<div key={i} className="flex flex-col sm:flex-row gap-2 mb-2">
						<input
							type="text" className={`${inputCls} flex-1`} placeholder="Description"
							value={item.description}
							onChange={e => setLineItem(i, "description", e.target.value)}
						/>
						<div className="flex gap-2">
							<input
								type="number" step="0.01" min="0" className={`${inputCls} flex-1 sm:w-32 sm:flex-none`} placeholder="0.00"
								value={item.amount}
								onChange={e => setLineItem(i, "amount", e.target.value)}
							/>
							{invoiceForm.line_items.length > 1 && (
								<button type="button" onClick={() => removeLineItem(i)} className="text-red-400 hover:text-red-600 text-xs px-2 shrink-0">✕</button>
							)}
						</div>
					</div>
				))}
				<div className="text-right text-sm font-semibold text-gold mt-1">
					Total: {fmt(invoiceTotal)}
				</div>
			</div>

			<div className="flex gap-2 justify-end">
				<button type="button" onClick={() => setShowInvoiceForm(false)} className="px-4 py-2 text-sm text-ink/50 hover:text-ink">Cancel</button>
				<button type="submit" disabled={submitting} className="px-5 py-2 rounded-lg bg-gold text-ink text-sm font-semibold hover:bg-gold disabled:opacity-50 transition-colors">
					{submitting ? "Creating…" : "Create Invoice"}
				</button>
			</div>
		</form>
	);

	// ── Payment form ──────────────────────────────────────────────────────

	const openInvoicesForStudent = selStudent
		? stuInvoices.filter(i => i.status === "unpaid" || i.status === "partial")
		: invoices.filter(i => i.status === "unpaid" || i.status === "partial");

	const PaymentForm = () => (
		<form onSubmit={handleSubmitPayment} className="border border-gold/30 rounded-xl p-5 bg-white mb-6">
			<h3 className="text-sm font-semibold text-gold mb-4">Record Payment</h3>
			<div className="grid grid-cols-2 gap-4 mb-4">
				<div>
					<label className={labelCls}>Student (optional)</label>
					<select
						className={inputCls}
						value={paymentForm.student_id}
						onChange={e => setPaymentForm(f => ({ ...f, student_id: e.target.value, invoice_id: "" }))}
					>
						<option value="">— Misc / No Student —</option>
						{students.map(s => <option key={s.id} value={s.id}>{s.fname} {s.lname}</option>)}
					</select>
				</div>
				<div>
					<label className={labelCls}>Apply to Invoice (optional)</label>
					<select
						className={inputCls}
						value={paymentForm.invoice_id}
						onChange={e => setPaymentForm(f => ({ ...f, invoice_id: e.target.value }))}
					>
						<option value="">— Unallocated —</option>
						{openInvoicesForStudent
							.filter(i => !paymentForm.student_id || i.student_id === parseInt(paymentForm.student_id))
							.map(i => (
								<option key={i.id} value={i.id}>
									#{i.id} — {fmt(i.total - i.amount_paid)} remaining {i.memo ? `(${i.memo})` : ""}
								</option>
							))
						}
					</select>
				</div>
				<div>
					<label className={labelCls}>Amount</label>
					<input
						type="number" step="0.01" min="0" required className={inputCls}
						value={paymentForm.amount}
						onChange={e => setPaymentForm(f => ({ ...f, amount: e.target.value }))}
					/>
				</div>
				<div>
					<label className={labelCls}>Method</label>
					<select
						className={inputCls}
						value={paymentForm.method}
						onChange={e => setPaymentForm(f => ({ ...f, method: e.target.value as typeof METHODS[number] }))}
					>
						{METHODS.map(m => <option key={m} value={m} className="capitalize">{m}</option>)}
					</select>
				</div>
				<div>
					<label className={labelCls}>Date Received</label>
					<input
						type="date" required className={inputCls}
						value={paymentForm.received_at}
						onChange={e => setPaymentForm(f => ({ ...f, received_at: e.target.value }))}
					/>
				</div>
				<div>
					<label className={labelCls}>External Reference</label>
					<input
						type="text" className={inputCls} placeholder="Venmo/Stripe ID (optional)"
						value={paymentForm.external_reference}
						onChange={e => setPaymentForm(f => ({ ...f, external_reference: e.target.value }))}
					/>
				</div>
			</div>
			<div className="mb-4">
				<label className={labelCls}>Memo</label>
				<input
					type="text" className={inputCls} placeholder="Optional note"
					value={paymentForm.memo}
					onChange={e => setPaymentForm(f => ({ ...f, memo: e.target.value }))}
				/>
			</div>
			<div className="flex gap-2 justify-end">
				<button type="button" onClick={() => setShowPaymentForm(false)} className="px-4 py-2 text-sm text-ink/50 hover:text-ink">Cancel</button>
				<button type="submit" disabled={submitting} className="px-5 py-2 rounded-lg bg-gold text-ink text-sm font-semibold hover:bg-gold disabled:opacity-50 transition-colors">
					{submitting ? "Recording…" : "Record Payment"}
				</button>
			</div>
		</form>
	);

	// ── Student finance panel ─────────────────────────────────────────────

	if (selStudent) {
		return (
			<div className="p-8 max-w-4xl">
				{toast && <Toast msg={toast.msg} ok={toast.ok} />}

				<button onClick={() => setSelStudent(null)} className="text-sm text-ink/50 hover:text-gold mb-6 transition-colors">
					← Back to Balances
				</button>

				<div className="flex items-start justify-between mb-6">
					<div>
						<h2 className="text-xl font-semibold text-gold">{selStudent.fname} {selStudent.lname}</h2>
						<p className="text-sm text-ink/50 mt-1">
							Invoiced: {fmt(selStudent.total_invoiced)} · Paid: {fmt(selStudent.total_paid)} · Balance: <span className={selStudent.balance > 0 ? "text-red-600 font-semibold" : "text-green-600 font-semibold"}>{fmt(selStudent.balance)}</span>
						</p>
					</div>
					<div className="flex gap-2">
						<button
							onClick={() => { setShowPaymentForm(p => !p); setShowInvoiceForm(false); setPaymentForm({ ...emptyPayment, student_id: String(selStudent.student_id) }); }}
							className="px-3 py-1.5 rounded-lg border border-gold/50 text-sm text-gold hover:bg-gold hover:text-ink transition-colors"
						>
							+ Record Payment
						</button>
						<button
							onClick={() => { setShowInvoiceForm(p => !p); setShowPaymentForm(false); setInvoiceForm({ ...emptyInvoice, student_id: String(selStudent.student_id) }); }}
							className="px-3 py-1.5 rounded-lg bg-gold text-ink text-sm font-semibold hover:bg-gold transition-colors"
						>
							+ New Invoice
						</button>
					</div>
				</div>

				{showInvoiceForm && InvoiceForm()}
				{showPaymentForm && PaymentForm()}

				{stuLoading ? (
					<p className="text-ink/40 text-sm">Loading…</p>
				) : (
					<>
						{/* Invoices */}
						<section className="mb-8">
							<h3 className="text-sm font-semibold uppercase tracking-widest text-ink/50 mb-3">Invoices</h3>
							{stuInvoices.length === 0 ? (
								<p className="text-sm text-ink/40">No invoices yet.</p>
							) : (
								<div className="border border-gold/20 rounded-xl overflow-x-auto">
									<table className="w-full text-sm">
										<thead>
											<tr className="border-b border-gold/20 bg-gold/5">
												<th className="py-2 px-4 text-left text-xs font-semibold text-ink/50">#</th>
												<th className="py-2 px-4 text-left text-xs font-semibold text-ink/50">Status</th>
												<th className="py-2 px-4 text-left text-xs font-semibold text-ink/50">Total</th>
												<th className="py-2 px-4 text-left text-xs font-semibold text-ink/50">Paid</th>
												<th className="py-2 px-4 text-left text-xs font-semibold text-ink/50">Due</th>
												<th className="py-2 px-4 text-left text-xs font-semibold text-ink/50">Memo</th>
												<th className="py-2 px-4" />
											</tr>
										</thead>
										<tbody>
											{stuInvoices.map(inv => (
												<tr key={inv.id} className="border-b border-gold/10 last:border-0 hover:bg-gold/5 transition-colors">
													<td className="py-2.5 px-4 text-ink/50">{inv.id}</td>
													<td className="py-2.5 px-4">{statusBadge(inv.status)}</td>
													<td className="py-2.5 px-4 font-medium text-ink">{fmt(inv.total)}</td>
													<td className="py-2.5 px-4 text-ink/70">{fmt(inv.amount_paid)}</td>
													<td className="py-2.5 px-4 text-ink/60">{inv.due_date}</td>
													<td className="py-2.5 px-4 text-ink/50 max-w-xs truncate">{inv.memo || "—"}</td>
													<td className="py-2.5 px-4 text-right">
														{inv.status !== "void" && (
															<button onClick={() => handleVoidInvoice(inv.id)} className="text-xs text-ink/30 hover:text-red-500 transition-colors">
																Void
															</button>
														)}
													</td>
												</tr>
											))}
										</tbody>
									</table>
								</div>
							)}
						</section>

						{/* Payments */}
						<section>
							<h3 className="text-sm font-semibold uppercase tracking-widest text-ink/50 mb-3">Payments</h3>
							{stuPayments.length === 0 ? (
								<p className="text-sm text-ink/40">No payments yet.</p>
							) : (
								<div className="border border-gold/20 rounded-xl overflow-x-auto">
									<table className="w-full text-sm">
										<thead>
											<tr className="border-b border-gold/20 bg-gold/5">
												<th className="py-2 px-4 text-left text-xs font-semibold text-ink/50">#</th>
												<th className="py-2 px-4 text-left text-xs font-semibold text-ink/50">Status</th>
												<th className="py-2 px-4 text-left text-xs font-semibold text-ink/50">Amount</th>
												<th className="py-2 px-4 text-left text-xs font-semibold text-ink/50">Method</th>
												<th className="py-2 px-4 text-left text-xs font-semibold text-ink/50">Date</th>
												<th className="py-2 px-4 text-left text-xs font-semibold text-ink/50">Memo</th>
												<th className="py-2 px-4 text-left text-xs font-semibold text-ink/50">Invoice</th>
												<th className="py-2 px-4" />
											</tr>
										</thead>
										<tbody>
											{stuPayments.map(pay => (
												<tr key={pay.id} className="border-b border-gold/10 last:border-0 hover:bg-gold/5 transition-colors">
													<td className="py-2.5 px-4 text-ink/50">{pay.id}</td>
													<td className="py-2.5 px-4">{paymentStatusBadge(pay.status)}</td>
													<td className="py-2.5 px-4 font-medium text-ink">{fmt(pay.amount)}</td>
													<td className="py-2.5 px-4 capitalize text-ink/70">{pay.method}</td>
													<td className="py-2.5 px-4 text-ink/60">{pay.received_at}</td>
													<td className="py-2.5 px-4 text-ink/50 max-w-xs truncate">{pay.memo || "—"}</td>
													<td className="py-2.5 px-4 text-ink/50">{pay.invoice_id ? `#${pay.invoice_id}` : "—"}</td>
													<td className="py-2.5 px-4 text-right">
														{pay.status === "completed" && (
															<button onClick={() => handleRefundPayment(pay.id)} className="text-xs text-ink/30 hover:text-red-500 transition-colors">
																Refund
															</button>
														)}
													</td>
												</tr>
											))}
										</tbody>
									</table>
								</div>
							)}
						</section>
					</>
				)}
			</div>
		);
	}

	// ── Global views ──────────────────────────────────────────────────────

	return (
		<div className="p-8 max-w-5xl">
			{toast && <Toast msg={toast.msg} ok={toast.ok} />}

			<div className="flex items-center justify-between mb-6">
				<h1 className="text-2xl font-semibold text-gold">Payments</h1>
				<div className="flex gap-2">
					{viewBtn("balances", "Balances")}
					{viewBtn("invoices", "All Invoices")}
					{viewBtn("payments", "All Payments")}
				</div>
			</div>

			{view === "balances" && (
				<>
					<div className="flex justify-end gap-2 mb-4">
						<button
							onClick={() => { setShowPaymentForm(p => !p); setShowInvoiceForm(false); setPaymentForm(emptyPayment); }}
							className="px-3 py-1.5 rounded-lg border border-gold/50 text-sm text-gold hover:bg-gold hover:text-ink transition-colors"
						>
							+ Record Payment
						</button>
						<button
							onClick={() => { setShowInvoiceForm(p => !p); setShowPaymentForm(false); setInvoiceForm(emptyInvoice); }}
							className="px-3 py-1.5 rounded-lg bg-gold text-ink text-sm font-semibold hover:bg-gold transition-colors"
						>
							+ New Invoice
						</button>
					</div>

					{showInvoiceForm && InvoiceForm()}
					{showPaymentForm && PaymentForm()}

					{loading ? (
						<p className="text-ink/40 text-sm">Loading…</p>
					) : balances.length === 0 ? (
						<p className="text-ink/40 text-sm py-12 text-center">No students yet.</p>
					) : (
						<div className="border border-gold/20 rounded-xl overflow-x-auto">
							<table className="w-full text-sm">
								<thead>
									<tr className="border-b border-gold/20 bg-gold/5">
										<th className="py-2.5 px-4 text-left text-xs font-semibold text-ink/50">Student</th>
										<th className="py-2.5 px-4 text-right text-xs font-semibold text-ink/50">Invoiced</th>
										<th className="py-2.5 px-4 text-right text-xs font-semibold text-ink/50">Paid</th>
										<th className="py-2.5 px-4 text-right text-xs font-semibold text-ink/50">Balance</th>
									</tr>
								</thead>
								<tbody>
									{balances.map(b => (
										<tr
											key={b.student_id}
											onClick={() => openStudent(b)}
											className="border-b border-gold/10 last:border-0 hover:bg-gold/5 cursor-pointer transition-colors"
										>
											<td className="py-2.5 px-4 font-medium text-gold hover:underline">
												{b.fname} {b.lname}
											</td>
											<td className="py-2.5 px-4 text-right text-ink/70">{fmt(b.total_invoiced)}</td>
											<td className="py-2.5 px-4 text-right text-ink/70">{fmt(b.total_paid)}</td>
											<td className={`py-2.5 px-4 text-right font-semibold ${b.balance > 0 ? "text-red-600" : "text-green-600"}`}>
												{fmt(b.balance)}
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					)}
				</>
			)}

			{view === "invoices" && (
				<>
					<div className="flex justify-end mb-4">
						<button
							onClick={() => { setShowInvoiceForm(p => !p); setInvoiceForm(emptyInvoice); }}
							className="px-3 py-1.5 rounded-lg bg-gold text-ink text-sm font-semibold hover:bg-gold transition-colors"
						>
							+ New Invoice
						</button>
					</div>
					{showInvoiceForm && InvoiceForm()}
					{loading ? (
						<p className="text-ink/40 text-sm">Loading…</p>
					) : invoices.length === 0 ? (
						<p className="text-ink/40 text-sm py-12 text-center">No invoices yet.</p>
					) : (
						<div className="border border-gold/20 rounded-xl overflow-x-auto">
							<table className="w-full text-sm">
								<thead>
									<tr className="border-b border-gold/20 bg-gold/5">
										<th className="py-2 px-4 text-left text-xs font-semibold text-ink/50">#</th>
										<th className="py-2 px-4 text-left text-xs font-semibold text-ink/50">Student</th>
										<th className="py-2 px-4 text-left text-xs font-semibold text-ink/50">Status</th>
										<th className="py-2 px-4 text-right text-xs font-semibold text-ink/50">Total</th>
										<th className="py-2 px-4 text-right text-xs font-semibold text-ink/50">Paid</th>
										<th className="py-2 px-4 text-left text-xs font-semibold text-ink/50">Due</th>
										<th className="py-2 px-4 text-left text-xs font-semibold text-ink/50">Memo</th>
										<th className="py-2 px-4" />
									</tr>
								</thead>
								<tbody>
									{invoices.map(inv => {
										const stu = students.find(s => s.id === inv.student_id);
										return (
											<tr key={inv.id} className="border-b border-gold/10 last:border-0 hover:bg-gold/5 transition-colors">
												<td className="py-2.5 px-4 text-ink/50">{inv.id}</td>
												<td className="py-2.5 px-4 text-ink/70">{stu ? `${stu.fname} ${stu.lname}` : "—"}</td>
												<td className="py-2.5 px-4">{statusBadge(inv.status)}</td>
												<td className="py-2.5 px-4 text-right font-medium text-ink">{fmt(inv.total)}</td>
												<td className="py-2.5 px-4 text-right text-ink/70">{fmt(inv.amount_paid)}</td>
												<td className="py-2.5 px-4 text-ink/60">{inv.due_date}</td>
												<td className="py-2.5 px-4 text-ink/50 max-w-xs truncate">{inv.memo || "—"}</td>
												<td className="py-2.5 px-4 text-right">
													{inv.status !== "void" && (
														<button onClick={() => handleVoidInvoice(inv.id)} className="text-xs text-ink/30 hover:text-red-500 transition-colors">
															Void
														</button>
													)}
												</td>
											</tr>
										);
									})}
								</tbody>
							</table>
						</div>
					)}
				</>
			)}

			{view === "payments" && (
				<>
					<div className="flex justify-end mb-4">
						<button
							onClick={() => { setShowPaymentForm(p => !p); setPaymentForm(emptyPayment); }}
							className="px-3 py-1.5 rounded-lg bg-gold text-ink text-sm font-semibold hover:bg-gold transition-colors"
						>
							+ Record Payment
						</button>
					</div>
					{showPaymentForm && PaymentForm()}
					{loading ? (
						<p className="text-ink/40 text-sm">Loading…</p>
					) : payments.length === 0 ? (
						<p className="text-ink/40 text-sm py-12 text-center">No payments yet.</p>
					) : (
						<div className="border border-gold/20 rounded-xl overflow-x-auto">
							<table className="w-full text-sm">
								<thead>
									<tr className="border-b border-gold/20 bg-gold/5">
										<th className="py-2 px-4 text-left text-xs font-semibold text-ink/50">#</th>
										<th className="py-2 px-4 text-left text-xs font-semibold text-ink/50">Student</th>
										<th className="py-2 px-4 text-left text-xs font-semibold text-ink/50">Status</th>
										<th className="py-2 px-4 text-right text-xs font-semibold text-ink/50">Amount</th>
										<th className="py-2 px-4 text-left text-xs font-semibold text-ink/50">Method</th>
										<th className="py-2 px-4 text-left text-xs font-semibold text-ink/50">Date</th>
										<th className="py-2 px-4 text-left text-xs font-semibold text-ink/50">Invoice</th>
										<th className="py-2 px-4 text-left text-xs font-semibold text-ink/50">Memo</th>
										<th className="py-2 px-4" />
									</tr>
								</thead>
								<tbody>
									{payments.map(pay => {
										const stu = students.find(s => s.id === pay.student_id);
										return (
											<tr key={pay.id} className="border-b border-gold/10 last:border-0 hover:bg-gold/5 transition-colors">
												<td className="py-2.5 px-4 text-ink/50">{pay.id}</td>
												<td className="py-2.5 px-4 text-ink/70">{stu ? `${stu.fname} ${stu.lname}` : "—"}</td>
												<td className="py-2.5 px-4">{paymentStatusBadge(pay.status)}</td>
												<td className="py-2.5 px-4 text-right font-medium text-ink">{fmt(pay.amount)}</td>
												<td className="py-2.5 px-4 capitalize text-ink/70">{pay.method}</td>
												<td className="py-2.5 px-4 text-ink/60">{pay.received_at}</td>
												<td className="py-2.5 px-4 text-ink/50">{pay.invoice_id ? `#${pay.invoice_id}` : "—"}</td>
												<td className="py-2.5 px-4 text-ink/50 max-w-xs truncate">{pay.memo || "—"}</td>
												<td className="py-2.5 px-4 text-right">
													{pay.status === "completed" && (
														<button onClick={() => handleRefundPayment(pay.id)} className="text-xs text-ink/30 hover:text-red-500 transition-colors">
															Refund
														</button>
													)}
												</td>
											</tr>
										);
									})}
								</tbody>
							</table>
						</div>
					)}
				</>
			)}
		</div>
	);
}
