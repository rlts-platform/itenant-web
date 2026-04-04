"use client";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { TenantNav } from "@/components/ui/TenantNav";

type PaymentRecord = { id: string; amount: number; method: string | null; status: string; obtained_date: string | null; submitted_date: string | null; proof_image_url: string | null; created_at: string; notes: string | null; check_number: string | null; };
type BillReminder = { id: string; bill_name: string; due_date: string | null; amount: number | null; recurrence: string; };
type SavedMethod = { id: string; method_type: string; last4: string | null; nickname: string | null; is_default: boolean; };
type SplitConfig = { id: string; name: string; splits: { method_id: string; amount: number; nickname: string }[]; };

const STATUS_COLOR: Record<string, string> = { confirmed: "bg-green-50 text-green-700", pending: "bg-yellow-50 text-yellow-700", late: "bg-red-50 text-red-700", partial: "bg-orange-50 text-orange-700", failed: "bg-red-50 text-red-600" };

export default function TenantPaymentsPage() {
  const [tenantId, setTenantId] = useState("");
  const [accountId, setAccountId] = useState("");
  const [balance, setBalance] = useState(0);
  const [dueDate, setDueDate] = useState<string | null>(null);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [reminders, setReminders] = useState<BillReminder[]>([]);
  const [methods, setMethods] = useState<SavedMethod[]>([]);
  const [splits, setSplits] = useState<SplitConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "history" | "reminders" | "methods">("overview");
  const [showUpload, setShowUpload] = useState(false);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [obtainedDate, setObtainedDate] = useState(new Date().toISOString().split("T")[0]);
  const [paymentMethod, setPaymentMethod] = useState("money_order");
  const [checkNumber, setCheckNumber] = useState("");
  const [uploadAmount, setUploadAmount] = useState("");
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      const { data: ud } = await supabase.auth.getUser();
      if (!ud.user) { location.href = "/login"; return; }
      const { data: au } = await supabase.from("app_users").select("account_id,tenant_id,role").eq("user_id", ud.user.id).maybeSingle();
      if (!au || au.role !== "tenant" || !au.tenant_id) { location.href = "/tenant"; return; }
      setTenantId(au.tenant_id); setAccountId(au.account_id);

      const [{ data: pays }, { data: rems }, { data: meths }, { data: sps }, { data: lease }] = await Promise.all([
        supabase.from("payment_records").select("*").eq("tenant_id", au.tenant_id).order("created_at", { ascending: false }),
        supabase.from("bill_reminders").select("*").eq("tenant_id", au.tenant_id).order("due_date"),
        supabase.from("payment_methods").select("*").eq("tenant_id", au.tenant_id),
        supabase.from("split_payments").select("*").eq("tenant_id", au.tenant_id),
        supabase.from("leases").select("rent_amount,end_date").eq("tenant_id", au.tenant_id).eq("status", "active").maybeSingle(),
      ]);
      setPayments(pays || []); setReminders(rems || []); setMethods(meths || []); setSplits(sps || []);
      if (lease) { setBalance(lease.rent_amount || 0); }
      setLoading(false);
    })();
  }, []);

  async function uploadProof() {
    if (!proofFile || !uploadAmount) return;
    setUploading(true);
    let proof_image_url: string | null = null;
    const ext = proofFile.name.split(".").pop();
    const path = `proof/${accountId}/${tenantId}/${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("documents").upload(path, proofFile, { upsert: true });
    if (!upErr) { const { data: u } = supabase.storage.from("documents").getPublicUrl(path); proof_image_url = u.publicUrl; }
    await supabase.from("payment_records").insert({
      tenant_id: tenantId, account_id: accountId, amount: parseFloat(uploadAmount),
      method: paymentMethod, status: "pending", proof_image_url,
      obtained_date: obtainedDate, submitted_date: new Date().toISOString().split("T")[0],
      check_number: checkNumber || null, notes: `Uploaded via app. Obtained: ${obtainedDate}`,
    });
    setShowUpload(false); setProofFile(null); setCheckNumber(""); setUploadAmount("");
    setToast("Payment proof uploaded and submitted for review ✓");
    setTimeout(() => setToast(""), 4000);
    const { data: updated } = await supabase.from("payment_records").select("*").eq("tenant_id", tenantId).order("created_at", { ascending: false });
    setPayments(updated || []);
    setUploading(false);
  }

  const totalPaid = payments.filter(p => p.status === "confirmed").reduce((s, p) => s + p.amount, 0);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" /></div>;

  return (
    <div className="pb-24">
      <div className="mx-auto max-w-3xl px-6 pt-10">
        <div className="mb-8"><h1 className="text-3xl font-bold text-neutral-900">Payment Center</h1><p className="text-neutral-500 mt-1">Manage rent payments and bills</p></div>

        {/* Balance Card */}
        <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl p-6 text-white mb-6 shadow-lg">
          <div className="text-sm font-medium opacity-80 mb-1">Current Balance Due</div>
          <div className="text-5xl font-bold tracking-tight">${balance.toLocaleString()}</div>
          {dueDate && <div className="text-sm opacity-80 mt-2">Due: {new Date(dueDate).toLocaleDateString()}</div>}
          <div className="flex gap-3 mt-5">
            <button onClick={() => setShowUpload(true)} className="flex items-center gap-2 bg-white text-blue-700 px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-blue-50 transition-colors">📸 Upload MO/Check Proof</button>
            <button className="flex items-center gap-2 bg-white/20 text-white border border-white/30 px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-white/30 transition-colors">💳 Pay Online</button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-white rounded-2xl border border-neutral-200 p-4 text-center shadow-sm"><div className="text-xl font-bold text-green-600">${totalPaid.toLocaleString()}</div><div className="text-xs text-neutral-500">Total Paid</div></div>
          <div className="bg-white rounded-2xl border border-neutral-200 p-4 text-center shadow-sm"><div className="text-xl font-bold text-neutral-900">{payments.length}</div><div className="text-xs text-neutral-500">Transactions</div></div>
          <div className="bg-white rounded-2xl border border-neutral-200 p-4 text-center shadow-sm"><div className="text-xl font-bold text-blue-600">{reminders.length}</div><div className="text-xs text-neutral-500">Bill Reminders</div></div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white border border-neutral-200 rounded-2xl p-1.5 shadow-sm mb-6">
          {(["overview","history","reminders","methods"] as const).map(t => <button key={t} onClick={() => setActiveTab(t)} className={`flex-1 py-2.5 text-xs font-semibold rounded-xl capitalize transition-all ${activeTab===t?"bg-blue-600 text-white":"text-neutral-600 hover:bg-neutral-100"}`}>{t}</button>)}
        </div>

        {/* Overview */}
        {activeTab === "overview" && (
          <div className="grid gap-4">
            <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-5">
              <h3 className="text-sm font-bold text-neutral-700 mb-3">Recent Payments</h3>
              {payments.slice(0, 3).length === 0 ? <p className="text-sm text-neutral-400">No payments yet.</p> : payments.slice(0, 3).map(p => (
                <div key={p.id} className="flex items-center justify-between py-2 border-b border-neutral-50 last:border-0">
                  <div><div className="text-sm font-semibold text-neutral-900">${p.amount.toLocaleString()}</div><div className="text-xs text-neutral-400">{p.method} · {new Date(p.created_at).toLocaleDateString()}</div>{p.obtained_date && <div className="text-xs text-blue-600">MO obtained: {new Date(p.obtained_date).toLocaleDateString()}</div>}</div>
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${STATUS_COLOR[p.status]||"bg-neutral-100 text-neutral-600"}`}>{p.status}</span>
                </div>
              ))}
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-800">
              <strong>💡 Tip:</strong> If you have a money order or check but can't hand it in yet, upload a photo here to timestamp it. This protects you if rent appears late.
            </div>
          </div>
        )}

        {/* History */}
        {activeTab === "history" && (
          <div className="grid gap-3">
            {payments.length === 0 ? <div className="bg-white rounded-2xl border border-neutral-200 p-8 text-center"><p className="text-neutral-400 text-sm">No payment history yet.</p></div> :
              payments.map(p => (
                <div key={p.id} className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-bold text-neutral-900">${p.amount.toLocaleString()}</div>
                      <div className="text-xs text-neutral-500">{p.method || "Unknown"}{p.check_number ? ` #${p.check_number}` : ""} · {new Date(p.created_at).toLocaleDateString()}</div>
                      {p.obtained_date && <div className="text-xs text-blue-600 mt-0.5">📅 MO/Check obtained: {new Date(p.obtained_date).toLocaleDateString()}</div>}
                      {p.notes && <div className="text-xs text-neutral-400 mt-0.5">{p.notes}</div>}
                    </div>
                    <div className="flex items-center gap-2">
                      {p.proof_image_url && <a href={p.proof_image_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 border border-blue-200 bg-blue-50 px-2 py-1 rounded-lg">View Proof</a>}
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_COLOR[p.status]||"bg-neutral-100"}`}>{p.status}</span>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        )}

        {/* Reminders */}
        {activeTab === "reminders" && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-neutral-700">Bill Reminders</h3>
              <button className="bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-semibold hover:bg-blue-700">+ Add Reminder</button>
            </div>
            {reminders.length === 0 ? (
              <div className="bg-white rounded-2xl border border-neutral-200 p-8 text-center shadow-sm">
                <p className="text-neutral-400 text-sm mb-3">No bill reminders set up yet.</p>
                <p className="text-xs text-neutral-400">Add reminders for rent, utilities, insurance — anything you want to stay on top of.</p>
              </div>
            ) : reminders.map(r => (
              <div key={r.id} className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-4 mb-3">
                <div className="flex items-center justify-between">
                  <div><div className="font-semibold text-neutral-900 text-sm">{r.bill_name}</div><div className="text-xs text-neutral-500">{r.due_date ? `Due: ${new Date(r.due_date).toLocaleDateString()}` : "No date set"} · {r.recurrence}</div></div>
                  <div className="flex items-center gap-2">{r.amount && <span className="font-bold text-neutral-900">${r.amount.toLocaleString()}</span>}<button className="text-xs text-neutral-500 border border-neutral-200 px-2 py-1 rounded-lg hover:bg-neutral-50">Edit</button></div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Methods */}
        {activeTab === "methods" && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-neutral-700">Saved Payment Methods</h3>
              <button className="bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-semibold hover:bg-blue-700">+ Add Method</button>
            </div>
            {methods.length === 0 ? <div className="bg-white rounded-2xl border border-neutral-200 p-8 text-center shadow-sm"><p className="text-neutral-400 text-sm">No saved payment methods.</p></div> :
              methods.map(m => <div key={m.id} className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-4 mb-3 flex items-center justify-between"><div><div className="font-semibold text-neutral-900 text-sm">{m.nickname || m.method_type}</div>{m.last4 && <div className="text-xs text-neutral-500">·· {m.last4}</div>}</div>{m.is_default && <span className="text-xs bg-blue-50 text-blue-600 border border-blue-200 px-2 py-1 rounded-full">Default</span>}</div>)}

            <div className="mt-4 bg-white rounded-2xl border border-neutral-200 shadow-sm p-5">
              <h4 className="text-sm font-bold text-neutral-700 mb-3">Split Payment Configurations</h4>
              <p className="text-xs text-neutral-500 mb-3">Save a split setup to pay rent with multiple methods at once.</p>
              {splits.length === 0 ? <button className="text-xs text-blue-600 font-semibold hover:underline">+ Create split payment configuration</button> :
                splits.map(s => <div key={s.id} className="bg-neutral-50 border border-neutral-200 rounded-xl p-3 mb-2"><div className="text-sm font-semibold text-neutral-900">{s.name}</div><div className="text-xs text-neutral-500 mt-0.5">{s.splits.length} payment methods</div></div>)}
            </div>
          </div>
        )}
      </div>

      {/* Upload MO/Check Modal */}
      {showUpload && (
        <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 px-4 pb-4 sm:pb-0">
          <div className="bg-white rounded-2xl border border-neutral-200 w-full max-w-sm shadow-xl">
            <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between">
              <h3 className="font-bold text-neutral-900">Upload Payment Proof</h3>
              <button onClick={() => setShowUpload(false)} className="text-neutral-400 hover:text-neutral-700"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg></button>
            </div>
            <div className="px-5 py-4 grid gap-4">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-800"><strong>Why upload?</strong> Uploading a photo of your money order or check timestamps when you obtained it — protecting you if you can't hand it in immediately.</div>
              <div><label className="block text-xs font-semibold text-neutral-600 mb-1.5">Payment Type</label>
                <select className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none" value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}>
                  <option value="money_order">Money Order</option><option value="check">Personal Check</option><option value="cashiers_check">Cashier's Check</option>
                </select>
              </div>
              <div><label className="block text-xs font-semibold text-neutral-600 mb-1.5">Amount</label><input type="number" className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none" placeholder="0.00" value={uploadAmount} onChange={e => setUploadAmount(e.target.value)} /></div>
              {paymentMethod === "check" && <div><label className="block text-xs font-semibold text-neutral-600 mb-1.5">Check Number</label><input className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none" placeholder="1234" value={checkNumber} onChange={e => setCheckNumber(e.target.value)} /></div>}
              <div><label className="block text-xs font-semibold text-neutral-600 mb-1.5">Date Obtained</label><input type="date" className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none" value={obtainedDate} onChange={e => setObtainedDate(e.target.value)} /></div>
              <div><label className="block text-xs font-semibold text-neutral-600 mb-1.5">Photo of MO/Check *</label>
                <div className="border-2 border-dashed border-neutral-200 rounded-xl p-4 text-center cursor-pointer hover:border-blue-400 transition-colors" onClick={() => fileRef.current?.click()}>
                  {proofFile ? <div className="text-sm text-green-600 font-medium">✓ {proofFile.name}</div> : <><div className="text-2xl mb-1">📸</div><div className="text-sm text-neutral-500">Tap to take photo or upload</div></>}
                </div>
                <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={e => setProofFile(e.target.files?.[0] ?? null)} />
              </div>
            </div>
            <div className="px-5 py-4 border-t border-neutral-100 flex gap-3">
              <button onClick={() => setShowUpload(false)} className="flex-1 border border-neutral-200 text-neutral-700 px-4 py-2.5 rounded-xl text-sm font-semibold">Cancel</button>
              <button onClick={uploadProof} disabled={uploading || !proofFile || !uploadAmount} className="flex-1 bg-blue-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50">{uploading ? "Uploading..." : "Submit Proof"}</button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-neutral-900 text-white text-sm font-medium px-5 py-3 rounded-xl shadow-lg z-50">{toast}</div>}
      <TenantNav />
    </div>
  );
}
