"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type WO = {
  id: string; category: string; summary: string; status: string; urgency: string;
  permission_to_enter: string | null; entry_notes: string | null; internal_notes: string | null;
  receipt_url: string | null; cost: number | null; assigned_to: string | null;
  scheduled_date: string | null; completed_date: string | null;
  ai_triage_category: string | null; ai_triage_urgency: string | null; ai_suggested_vendor: string | null;
  created_at: string; property_id: string | null; unit_id: string | null; tenant_id: string | null;
};

const URGENCY_COLOR: Record<string, string> = {
  emergency: "bg-red-50 text-red-700 border-red-200",
  urgent: "bg-yellow-50 text-yellow-800 border-yellow-200",
  normal: "bg-neutral-100 text-neutral-600 border-neutral-200",
};
const STATUS_COLOR: Record<string, string> = {
  new: "bg-blue-50 text-blue-700 border-blue-200",
  in_progress: "bg-orange-50 text-orange-700 border-orange-200",
  on_hold: "bg-yellow-50 text-yellow-700 border-yellow-200",
  closed: "bg-green-50 text-green-700 border-green-200",
};

export default function WorkOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [wo, setWo] = useState<WO | null>(null);
  const [propertyName, setPropertyName] = useState("");
  const [unitLabel, setUnitLabel] = useState("");
  const [tenantName, setTenantName] = useState("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");
  const [editCost, setEditCost] = useState("");
  const [editNotes, setEditNotes] = useState("");

  useEffect(() => {
    (async () => {
      const { data: ud } = await supabase.auth.getUser();
      if (!ud.user) { location.href = "/login"; return; }
      const { data: wo, error } = await supabase.from("work_orders").select("*").eq("id", id).single();
      if (error || !wo) { setErr("Work order not found."); setLoading(false); return; }
      setWo(wo); setEditCost(wo.cost?.toString() || ""); setEditNotes(wo.internal_notes || "");
      if (wo.property_id) {
        const { data: p } = await supabase.from("properties").select("nickname,address").eq("property_id", wo.property_id).maybeSingle();
        setPropertyName(p?.nickname || p?.address || "");
      }
      if (wo.unit_id) {
        const { data: u } = await supabase.from("units").select("unit_number").eq("unit_id", wo.unit_id).maybeSingle();
        setUnitLabel(u?.unit_number ? `Unit ${u.unit_number}` : "");
      }
      if (wo.tenant_id) {
        const { data: t } = await supabase.from("tenants").select("first_name,last_name").eq("tenant_id", wo.tenant_id).maybeSingle();
        setTenantName(t ? `${t.first_name} ${t.last_name}` : "");
      }
      setLoading(false);
    })();
  }, [id]);

  async function updateStatus(status: string) {
    setSaving(true);
    const updates: Record<string, string | null> = { status };
    if (status === "closed") updates.completed_date = new Date().toISOString().split("T")[0];
    const { error } = await supabase.from("work_orders").update(updates).eq("id", id);
    if (!error) { setWo(prev => prev ? { ...prev, ...updates } : prev); showToast(`Status updated to ${status.replace("_", " ")} ✓`); }
    setSaving(false);
  }

  async function saveCostAndNotes() {
    setSaving(true);
    await supabase.from("work_orders").update({ cost: editCost ? parseFloat(editCost) : null, internal_notes: editNotes || null }).eq("id", id);
    setWo(prev => prev ? { ...prev, cost: editCost ? parseFloat(editCost) : null, internal_notes: editNotes } : prev);
    showToast("Saved ✓"); setSaving(false);
  }

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(""), 3000); }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" /></div>;
  if (!wo) return <div className="p-4 bg-red-50 rounded-xl text-red-700 text-sm">{err}</div>;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/client/maintenance"><button className="w-9 h-9 flex items-center justify-center rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg></button></Link>
        <div className="text-sm text-neutral-500">Maintenance</div>
      </div>

      {/* Header */}
      <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-6 mb-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600 shrink-0">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="font-bold text-neutral-900 text-lg">{wo.category}</span>
                <span className={`text-xs font-medium border px-2 py-0.5 rounded-full ${URGENCY_COLOR[wo.urgency]}`}>{wo.urgency}</span>
                <span className={`text-xs font-medium border px-2 py-0.5 rounded-full ${STATUS_COLOR[wo.status]}`}>{wo.status.replace("_", " ")}</span>
              </div>
              <div className="text-sm text-neutral-700 leading-relaxed">{wo.summary}</div>
              <div className="flex items-center gap-3 mt-2 text-xs text-neutral-400">
                {propertyName && <span>{propertyName}</span>}
                {unitLabel && <span>· {unitLabel}</span>}
                {tenantName && <span>· {tenantName}</span>}
                <span>· {new Date(wo.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
          {wo.cost && <div className="text-right shrink-0"><div className="text-xs text-neutral-500">Cost</div><div className="text-xl font-bold text-red-500">${wo.cost.toLocaleString()}</div></div>}
        </div>

        {/* AI triage badge */}
        {(wo.ai_triage_category || wo.ai_triage_urgency) && (
          <div className="mt-4 flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-xl px-4 py-2.5 text-xs text-blue-800">
            <span>✨ AI triage:</span>
            {wo.ai_triage_category && <span className="font-semibold">{wo.ai_triage_category}</span>}
            {wo.ai_triage_urgency && <span>· {wo.ai_triage_urgency}</span>}
          </div>
        )}
      </div>

      {/* Status actions */}
      <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-5 mb-4">
        <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-3">Update Status</h3>
        <div className="flex gap-2 flex-wrap">
          {[
            { status: "new", label: "New" },
            { status: "in_progress", label: "In Progress" },
            { status: "on_hold", label: "On Hold" },
            { status: "closed", label: "✓ Close" },
          ].map(s => (
            <button key={s.status} onClick={() => updateStatus(s.status)} disabled={wo.status === s.status || saving}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${wo.status === s.status ? "bg-blue-600 text-white" : "border border-neutral-200 text-neutral-700 hover:bg-neutral-50"} disabled:opacity-50`}>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Details grid */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-5">
          <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-3">Entry Info</h3>
          <div className="grid gap-2 text-sm">
            <div className="flex justify-between"><span className="text-neutral-500">Permission</span><span className="font-medium text-neutral-900 capitalize">{wo.permission_to_enter || "—"}</span></div>
            {wo.entry_notes && <div><span className="text-neutral-500 text-xs">Notes:</span><div className="text-neutral-700 text-xs mt-0.5">{wo.entry_notes}</div></div>}
            {wo.scheduled_date && <div className="flex justify-between"><span className="text-neutral-500">Scheduled</span><span className="font-medium text-neutral-900">{new Date(wo.scheduled_date).toLocaleDateString()}</span></div>}
            {wo.completed_date && <div className="flex justify-between"><span className="text-neutral-500">Completed</span><span className="font-medium text-green-600">{new Date(wo.completed_date).toLocaleDateString()}</span></div>}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-5">
          <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-3">Cost & Receipt</h3>
          <div><label className="block text-xs font-semibold text-neutral-600 mb-1">Cost ($)</label>
            <input type="number" className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/20" value={editCost} onChange={e => setEditCost(e.target.value)} placeholder="0.00" />
          </div>
          {wo.receipt_url && <a href={wo.receipt_url} target="_blank" rel="noopener noreferrer" className="mt-3 flex items-center gap-1.5 text-xs text-blue-600 hover:underline"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>View Receipt</a>}
        </div>
      </div>

      {/* Internal notes */}
      <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-5 mb-4">
        <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-3">Internal Notes</h3>
        <textarea className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 resize-none" rows={3} value={editNotes} onChange={e => setEditNotes(e.target.value)} placeholder="Notes for your team..." />
        <div className="flex justify-end mt-3">
          <button onClick={saveCostAndNotes} disabled={saving} className="bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-semibold hover:bg-blue-700 disabled:opacity-50">{saving ? "Saving..." : "Save"}</button>
        </div>
      </div>

      {toast && <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-neutral-900 text-white text-sm font-medium px-5 py-3 rounded-xl shadow-lg z-50">{toast}</div>}
    </div>
  );
}
