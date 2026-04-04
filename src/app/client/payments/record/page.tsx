"use client";
export const dynamic = "force-dynamic";
import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

const ic = "w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all";

type Tenant = { tenant_id: string; first_name: string; last_name: string; unit_label: string; property_name: string; rent_amount: number | null; };

export default function LogPaymentPage() {
  const router = useRouter();
  const params = useSearchParams();
  const prefillTenant = params.get("tenant") || "";

  const [accountId, setAccountId] = useState("");
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const [form, setForm] = useState({
    tenant_id: prefillTenant,
    amount: "",
    method: "check",
    check_number: "",
    status: "confirmed",
    obtained_date: "",
    submitted_date: new Date().toISOString().split("T")[0],
    payment_period_start: "",
    payment_period_end: "",
    notes: "",
  });
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  useEffect(() => {
    (async () => {
      const { data: ud } = await supabase.auth.getUser();
      if (!ud.user) { location.href = "/login"; return; }
      const { data: au } = await supabase.from("app_users").select("account_id").eq("user_id", ud.user.id).maybeSingle();
      if (!au) return;
      setAccountId(au.account_id);

      // Load all active tenants with unit info
      const { data: raw } = await supabase.from("tenants").select("tenant_id,first_name,last_name,unit_id").eq("account_id", au.account_id).eq("status", "active").order("last_name");
      const enriched: Tenant[] = await Promise.all((raw || []).map(async t => {
        let unit_label = "", property_name = "", rent_amount = null;
        if (t.unit_id) {
          const { data: u } = await supabase.from("units").select("unit_number,rent_amount,property_id").eq("unit_id", t.unit_id).maybeSingle();
          if (u) {
            unit_label = u.unit_number ? `Unit ${u.unit_number}` : "";
            rent_amount = u.rent_amount;
            const { data: p } = await supabase.from("properties").select("nickname,address").eq("property_id", u.property_id).maybeSingle();
            property_name = p?.nickname || p?.address || "";
          }
        }
        return { ...t, unit_label, property_name, rent_amount };
      }));
      setTenants(enriched);

      // Auto-fill rent amount when tenant selected
      if (prefillTenant) {
        const tenant = enriched.find(t => t.tenant_id === prefillTenant);
        if (tenant?.rent_amount) set("amount", tenant.rent_amount.toString());
      }
    })();
  }, []);

  // Auto-fill rent amount when tenant changes
  function handleTenantChange(tenantId: string) {
    set("tenant_id", tenantId);
    const tenant = tenants.find(t => t.tenant_id === tenantId);
    if (tenant?.rent_amount) set("amount", tenant.rent_amount.toString());
  }

  async function handleSubmit() {
    setErr("");
    if (!form.tenant_id) { setErr("Please select a tenant."); return; }
    if (!form.amount) { setErr("Amount is required."); return; }
    setSaving(true);

    // Get tenant's unit + account info
    const tenant = tenants.find(t => t.tenant_id === form.tenant_id);
    const { data: tenantRecord } = await supabase.from("tenants").select("unit_id").eq("tenant_id", form.tenant_id).maybeSingle();

    let proof_image_url: string | null = null;
    if (proofFile) {
      const ext = proofFile.name.split(".").pop();
      const path = `receipts/${accountId}/${form.tenant_id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("documents").upload(path, proofFile, { upsert: true });
      if (!upErr) {
        const { data: u } = supabase.storage.from("documents").getPublicUrl(path);
        proof_image_url = u.publicUrl;
      }
    }

    const { error } = await supabase.from("payment_records").insert({
      account_id: accountId,
      tenant_id: form.tenant_id,
      unit_id: tenantRecord?.unit_id || null,
      amount: parseFloat(form.amount),
      method: form.method,
      check_number: form.check_number || null,
      status: form.status,
      obtained_date: form.obtained_date || null,
      submitted_date: form.submitted_date || null,
      payment_period_start: form.payment_period_start || null,
      payment_period_end: form.payment_period_end || null,
      notes: form.notes || null,
      proof_image_url,
    });

    if (error) { setErr(error.message); setSaving(false); return; }
    router.push("/client/payments");
  }

  const selectedTenant = tenants.find(t => t.tenant_id === form.tenant_id);

  return (
    <div>
      <div className="flex items-center gap-4 mb-8">
        <Link href="/client/payments">
          <button className="w-9 h-9 flex items-center justify-center rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50 transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>
          </button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-neutral-900">Log Payment</h1>
          <p className="text-neutral-500 mt-0.5">Record a rent payment received from a tenant</p>
        </div>
      </div>

      <div className="max-w-2xl">
        {err && <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{err}</div>}

        <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
          {/* Tenant */}
          <div className="px-6 py-4 border-b border-neutral-100 bg-neutral-50">
            <h2 className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Tenant</h2>
          </div>
          <div className="px-6 py-5 grid gap-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-600 mb-1.5">Select Tenant *</label>
              <select className={ic + " cursor-pointer"} value={form.tenant_id} onChange={e => handleTenantChange(e.target.value)}>
                <option value="">Choose tenant...</option>
                {tenants.map(t => (
                  <option key={t.tenant_id} value={t.tenant_id}>
                    {t.first_name} {t.last_name}{t.unit_label ? ` — ${t.unit_label}` : ""}{t.property_name ? ` · ${t.property_name}` : ""}
                  </option>
                ))}
              </select>
            </div>
            {selectedTenant && (
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-800 flex items-center justify-between">
                <span><strong>{selectedTenant.first_name} {selectedTenant.last_name}</strong>{selectedTenant.unit_label ? ` · ${selectedTenant.unit_label}` : ""} · {selectedTenant.property_name}</span>
                {selectedTenant.rent_amount && <span className="font-bold text-blue-700">${selectedTenant.rent_amount.toLocaleString()}/mo</span>}
              </div>
            )}
          </div>

          {/* Payment Details */}
          <div className="px-6 py-4 border-t border-neutral-100 bg-neutral-50">
            <h2 className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Payment Details</h2>
          </div>
          <div className="px-6 py-5 grid gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-neutral-600 mb-1.5">Amount ($) *</label>
                <input type="number" className={ic} placeholder="0.00" value={form.amount} onChange={e => set("amount", e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-neutral-600 mb-1.5">Status</label>
                <select className={ic + " cursor-pointer"} value={form.status} onChange={e => set("status", e.target.value)}>
                  <option value="confirmed">Confirmed</option>
                  <option value="pending">Pending</option>
                  <option value="partial">Partial</option>
                  <option value="late">Late</option>
                  <option value="failed">Failed</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-neutral-600 mb-1.5">Payment Method</label>
                <select className={ic + " cursor-pointer"} value={form.method} onChange={e => set("method", e.target.value)}>
                  <option value="check">Check</option>
                  <option value="money_order">Money Order</option>
                  <option value="cashiers_check">Cashier's Check</option>
                  <option value="bank_transfer">Bank Transfer / ACH</option>
                  <option value="cash">Cash</option>
                  <option value="zelle">Zelle</option>
                  <option value="venmo">Venmo</option>
                  <option value="cashapp">CashApp</option>
                  <option value="stripe">Stripe (Online)</option>
                  <option value="other">Other</option>
                </select>
              </div>
              {(form.method === "check" || form.method === "cashiers_check") && (
                <div>
                  <label className="block text-xs font-semibold text-neutral-600 mb-1.5">Check Number</label>
                  <input className={ic} placeholder="e.g. 1042" value={form.check_number} onChange={e => set("check_number", e.target.value)} />
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-neutral-600 mb-1.5">Date Submitted</label>
                <input type="date" className={ic} value={form.submitted_date} onChange={e => set("submitted_date", e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-neutral-600 mb-1.5">
                  Date MO/Check Obtained
                  <span className="text-neutral-400 font-normal ml-1">(if different)</span>
                </label>
                <input type="date" className={ic} value={form.obtained_date} onChange={e => set("obtained_date", e.target.value)} />
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800">
              <strong>💡 Tip:</strong> If the tenant obtained a money order before the due date but submitted it late, record the obtained date here. This timestamps when payment was secured, protecting both parties.
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-neutral-600 mb-1.5">Period Start</label>
                <input type="date" className={ic} value={form.payment_period_start} onChange={e => set("payment_period_start", e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-neutral-600 mb-1.5">Period End</label>
                <input type="date" className={ic} value={form.payment_period_end} onChange={e => set("payment_period_end", e.target.value)} />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-600 mb-1.5">Notes (optional)</label>
              <textarea className={ic + " resize-none"} rows={2} placeholder="Any notes about this payment..." value={form.notes} onChange={e => set("notes", e.target.value)} />
            </div>
          </div>

          {/* Proof Upload */}
          <div className="px-6 py-4 border-t border-neutral-100 bg-neutral-50">
            <h2 className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Proof / Receipt</h2>
          </div>
          <div className="px-6 py-5">
            <div
              className="border-2 border-dashed border-neutral-200 rounded-xl p-5 text-center cursor-pointer hover:border-blue-400 transition-colors"
              onClick={() => fileRef.current?.click()}
            >
              {proofFile ? (
                <div className="text-sm text-green-600 font-medium">✓ {proofFile.name}</div>
              ) : (
                <>
                  <div className="text-3xl mb-2">📸</div>
                  <div className="text-sm text-neutral-600 font-medium">Upload check, MO, or receipt photo</div>
                  <div className="text-xs text-neutral-400 mt-1">JPG, PNG, PDF — tap to browse or take photo</div>
                </>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*,application/pdf" capture="environment" className="hidden" onChange={e => setProofFile(e.target.files?.[0] ?? null)} />
          </div>

          {/* Actions */}
          <div className="px-6 py-4 bg-neutral-50 border-t border-neutral-100 flex items-center justify-between">
            <Link href="/client/payments">
              <button className="border border-neutral-200 bg-white text-neutral-700 px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-neutral-50 transition-colors">Cancel</button>
            </Link>
            <button onClick={handleSubmit} disabled={saving} className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50">
              {saving ? (
                <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />Saving...</>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                  Log Payment
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
