"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

const CATEGORIES = ["Appliance","Doors and locks","Electrical and lighting","Flooring","General","Heating and cooling","Plumbing and bath","Safety equipment","Preventative maintenance","Pest control","Roofing","Windows"];
const inputClass = "w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all";

type Property = { property_id: string; nickname: string | null; address: string };
type Unit = { unit_id: string; unit_number: string | null };
type Tenant = { tenant_id: string; first_name: string; last_name: string };

export default function NewWorkOrderPage() {
  const router = useRouter();
  const params = useSearchParams();
  const [accountId, setAccountId] = useState("");
  const [properties, setProperties] = useState<Property[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [form, setForm] = useState({
    property_id: params.get("property") || "",
    unit_id: params.get("unit") || "",
    tenant_id: "",
    category: "General",
    summary: "",
    urgency: "normal",
    permission_to_enter: "yes",
    entry_notes: "",
    assigned_to: "",
    internal_notes: "",
    scheduled_date: "",
  });
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [aiSuggestion, setAiSuggestion] = useState<{ category: string; urgency: string; note: string } | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  function set(k: string, v: string) { setForm(p => ({ ...p, [k]: v })); }

  useEffect(() => {
    (async () => {
      const { data: ud } = await supabase.auth.getUser();
      if (!ud.user) { location.href = "/login"; return; }
      const { data: au } = await supabase.from("app_users").select("account_id").eq("user_id", ud.user.id).maybeSingle();
      if (!au) return;
      setAccountId(au.account_id);
      const { data: props } = await supabase.from("properties").select("property_id,nickname,address").eq("account_id", au.account_id).order("created_at");
      setProperties(props || []);
    })();
  }, []);

  useEffect(() => {
    if (!form.property_id) { setUnits([]); return; }
    (async () => {
      const { data } = await supabase.from("units").select("unit_id,unit_number").eq("property_id", form.property_id).order("unit_number");
      setUnits(data || []);
    })();
  }, [form.property_id]);

  useEffect(() => {
    if (!form.unit_id) { setTenants([]); return; }
    (async () => {
      const { data } = await supabase.from("tenants").select("tenant_id,first_name,last_name").eq("unit_id", form.unit_id).eq("status", "active");
      setTenants(data || []);
      if (data?.length === 1) set("tenant_id", data[0].tenant_id);
    })();
  }, [form.unit_id]);

  async function runAITriage() {
    if (!form.summary.trim()) return;
    setAiLoading(true);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 200,
          system: "You are a property maintenance expert. Given a maintenance issue description, respond with ONLY a JSON object: {\"category\": \"one of: Appliance|Doors and locks|Electrical and lighting|Flooring|General|Heating and cooling|Plumbing and bath|Safety equipment|Preventative maintenance|Pest control|Roofing|Windows\", \"urgency\": \"one of: normal|urgent|emergency\", \"note\": \"one sentence tip for the property manager\"}",
          messages: [{ role: "user", content: form.summary }]
        })
      });
      const data = await res.json();
      const text = data.content?.[0]?.text || "{}";
      const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
      setAiSuggestion(parsed);
      if (parsed.category) set("category", parsed.category);
      if (parsed.urgency) set("urgency", parsed.urgency);
    } catch { /* silent */ }
    setAiLoading(false);
  }

  async function handleSubmit() {
    setErr("");
    if (!form.property_id) { setErr("Please select a property."); return; }
    if (!form.summary.trim()) { setErr("Please describe the issue."); return; }
    setSaving(true);
    let receipt_url: string | null = null;
    if (receiptFile) {
      const ext = receiptFile.name.split(".").pop();
      const path = `receipts/${accountId}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("documents").upload(path, receiptFile, { upsert: true });
      if (!upErr) { const { data: u } = supabase.storage.from("documents").getPublicUrl(path); receipt_url = u.publicUrl; }
    }
    const { error } = await supabase.from("work_orders").insert({
      account_id: accountId,
      property_id: form.property_id || null,
      unit_id: form.unit_id || null,
      tenant_id: form.tenant_id || null,
      category: form.category,
      summary: form.summary.trim(),
      urgency: form.urgency,
      status: "new",
      permission_to_enter: form.permission_to_enter || null,
      entry_notes: form.entry_notes || null,
      internal_notes: form.internal_notes || null,
      scheduled_date: form.scheduled_date || null,
      receipt_url,
      ai_triage_category: aiSuggestion?.category || null,
      ai_triage_urgency: aiSuggestion?.urgency || null,
    });
    if (error) { setErr(error.message); setSaving(false); return; }
    router.push("/client/maintenance");
  }

  return (
    <div>
      <div className="flex items-center gap-4 mb-8">
        <Link href="/client/maintenance"><button className="w-9 h-9 flex items-center justify-center rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg></button></Link>
        <div><h1 className="text-3xl font-bold text-neutral-900">New Work Order</h1><p className="text-neutral-500 mt-0.5">Create a maintenance request or work order</p></div>
      </div>
      <div className="max-w-2xl">
        {err && <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{err}</div>}
        <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
          {/* Location */}
          <div className="px-6 py-4 border-b border-neutral-100 bg-neutral-50"><h2 className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Location</h2></div>
          <div className="px-6 py-5 grid gap-4">
            <div><label className="block text-xs font-semibold text-neutral-600 mb-1.5">Property</label>
              <select className={inputClass + " cursor-pointer"} value={form.property_id} onChange={e => { set("property_id", e.target.value); set("unit_id", ""); set("tenant_id", ""); }}>
                <option value="">Select property...</option>
                {properties.map(p => <option key={p.property_id} value={p.property_id}>{p.nickname || p.address}</option>)}
              </select>
            </div>
            {form.property_id && units.length > 0 && (
              <div><label className="block text-xs font-semibold text-neutral-600 mb-1.5">Unit (optional)</label>
                <select className={inputClass + " cursor-pointer"} value={form.unit_id} onChange={e => set("unit_id", e.target.value)}>
                  <option value="">All units / common area</option>
                  {units.map(u => <option key={u.unit_id} value={u.unit_id}>{u.unit_number ? `Unit ${u.unit_number}` : "Unnamed Unit"}</option>)}
                </select>
              </div>
            )}
            {tenants.length > 0 && (
              <div><label className="block text-xs font-semibold text-neutral-600 mb-1.5">Tenant (optional)</label>
                <select className={inputClass + " cursor-pointer"} value={form.tenant_id} onChange={e => set("tenant_id", e.target.value)}>
                  <option value="">No specific tenant</option>
                  {tenants.map(t => <option key={t.tenant_id} value={t.tenant_id}>{t.first_name} {t.last_name}</option>)}
                </select>
              </div>
            )}
          </div>

          {/* Issue */}
          <div className="px-6 py-4 border-t border-neutral-100 bg-neutral-50"><h2 className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Issue Details</h2></div>
          <div className="px-6 py-5 grid gap-4">
            <div><label className="block text-xs font-semibold text-neutral-600 mb-1.5">Describe the Issue *</label>
              <textarea className={inputClass + " resize-none"} rows={4} placeholder="Describe what's wrong in detail..." value={form.summary} onChange={e => set("summary", e.target.value)} onBlur={runAITriage} />
              <button type="button" onClick={runAITriage} disabled={!form.summary.trim() || aiLoading} className="mt-2 flex items-center gap-1.5 text-xs text-blue-600 font-semibold hover:text-blue-700 disabled:opacity-40">
                {aiLoading ? <><div className="w-3 h-3 border border-blue-400 border-t-transparent rounded-full animate-spin"/>Analyzing...</> : <>✨ AI Triage (auto-detect category & urgency)</>}
              </button>
            </div>

            {aiSuggestion && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-800">
                <div className="font-semibold mb-1">AI Suggestion applied:</div>
                <div>Category: <strong>{aiSuggestion.category}</strong> · Urgency: <strong>{aiSuggestion.urgency}</strong></div>
                <div className="mt-1 text-blue-600">{aiSuggestion.note}</div>
                <div className="text-blue-400 mt-1">You can change these below.</div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-xs font-semibold text-neutral-600 mb-1.5">Category</label>
                <select className={inputClass + " cursor-pointer"} value={form.category} onChange={e => set("category", e.target.value)}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div><label className="block text-xs font-semibold text-neutral-600 mb-1.5">Urgency</label>
                <select className={inputClass + " cursor-pointer"} value={form.urgency} onChange={e => set("urgency", e.target.value)}>
                  <option value="normal">Normal</option>
                  <option value="urgent">Urgent</option>
                  <option value="emergency">🚨 Emergency</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-xs font-semibold text-neutral-600 mb-1.5">Permission to Enter</label>
                <select className={inputClass + " cursor-pointer"} value={form.permission_to_enter} onChange={e => set("permission_to_enter", e.target.value)}>
                  <option value="yes">Yes</option>
                  <option value="call">Call to schedule</option>
                  <option value="no">Do not enter</option>
                </select>
              </div>
              <div><label className="block text-xs font-semibold text-neutral-600 mb-1.5">Scheduled Date</label>
                <input type="date" className={inputClass} value={form.scheduled_date} onChange={e => set("scheduled_date", e.target.value)} />
              </div>
            </div>

            <div><label className="block text-xs font-semibold text-neutral-600 mb-1.5">Entry Notes</label>
              <input className={inputClass} placeholder="Gate code, pets, best time to enter..." value={form.entry_notes} onChange={e => set("entry_notes", e.target.value)} />
            </div>
          </div>

          {/* Internal */}
          <div className="px-6 py-4 border-t border-neutral-100 bg-neutral-50"><h2 className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Internal (client/team only)</h2></div>
          <div className="px-6 py-5 grid gap-4">
            <div><label className="block text-xs font-semibold text-neutral-600 mb-1.5">Internal Notes</label>
              <textarea className={inputClass + " resize-none"} rows={2} placeholder="Notes for your team..." value={form.internal_notes} onChange={e => set("internal_notes", e.target.value)} />
            </div>
            <div><label className="block text-xs font-semibold text-neutral-600 mb-1.5">Receipt / Photo</label>
              <div className="border-2 border-dashed border-neutral-200 rounded-xl p-4 text-center cursor-pointer hover:border-blue-400 transition-colors" onClick={() => fileRef.current?.click()}>
                {receiptFile ? <div className="text-sm text-green-600 font-medium">✓ {receiptFile.name}</div> : <><div className="text-2xl mb-1">📸</div><div className="text-xs text-neutral-500">Upload photo or receipt</div></>}
              </div>
              <input ref={fileRef} type="file" accept="image/*,application/pdf" capture="environment" className="hidden" onChange={e => setReceiptFile(e.target.files?.[0] ?? null)} />
            </div>
          </div>

          <div className="px-6 py-4 border-t border-neutral-100 bg-neutral-50 flex items-center justify-between">
            <Link href="/client/maintenance"><button className="border border-neutral-200 bg-white text-neutral-700 px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-neutral-50">Cancel</button></Link>
            <button onClick={handleSubmit} disabled={saving} className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50">
              {saving ? <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"/>Creating...</> : <>Create Work Order</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
