"use client";
export const dynamic = "force-dynamic";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

// ─── Types ───────────────────────────────────────────────────────────────────
type Property = {
  property_id: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  nickname: string | null;
  property_type: string;
  status: string;
  notes: string | null;
  created_at: string;
};

type Unit = {
  unit_id: string;
  unit_number: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  sqft: number | null;
  rent_amount: number | null;
  deposit_amount: number | null;
  status: string;
  tenant_name?: string;
};

type HistoryEvent = {
  id: string;
  event_type: string;
  description: string | null;
  cost: number | null;
  receipt_url: string | null;
  performed_by: string | null;
  event_date: string | null;
  created_at: string;
};

// ─── Tab types ────────────────────────────────────────────────────────────────
type Tab = "overview" | "units" | "history" | "documents";

const EVENT_COLORS: Record<string, string> = {
  repair: "bg-red-100 text-red-700",
  maintenance: "bg-orange-100 text-orange-700",
  inspection: "bg-blue-100 text-blue-700",
  upgrade: "bg-purple-100 text-purple-700",
  purchase: "bg-green-100 text-green-700",
  note: "bg-neutral-100 text-neutral-700",
};

const STATUS_COLORS: Record<string, string> = {
  occupied: "bg-green-100 text-green-700",
  vacant: "bg-neutral-100 text-neutral-600",
  maintenance: "bg-orange-100 text-orange-700",
};

// ─── Components ───────────────────────────────────────────────────────────────
function TabBtn({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2.5 text-sm font-semibold rounded-xl transition-all ${
        active ? "bg-blue-600 text-white" : "text-neutral-600 hover:bg-neutral-100"
      }`}
    >
      {label}
    </button>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function PropertyProfilePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [property, setProperty] = useState<Property | null>(null);
  const [units, setUnits] = useState<Unit[]>([]);
  const [history, setHistory] = useState<HistoryEvent[]>([]);
  const [tab, setTab] = useState<Tab>("overview");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [accountId, setAccountId] = useState("");

  // Add history event
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [eventForm, setEventForm] = useState({
    event_type: "repair",
    description: "",
    cost: "",
    performed_by: "",
    event_date: new Date().toISOString().split("T")[0],
  });
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [savingEvent, setSavingEvent] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) { location.href = "/login"; return; }

      const { data: appUser } = await supabase
        .from("app_users")
        .select("account_id, role")
        .eq("user_id", userData.user.id)
        .maybeSingle();

      if (!appUser || !["client", "team"].includes(appUser.role)) {
        setErr("Not authorized."); setLoading(false); return;
      }
      setAccountId(appUser.account_id);

      // Load property
      const { data: prop, error: propErr } = await supabase
        .from("properties")
        .select("*")
        .eq("property_id", id)
        .eq("account_id", appUser.account_id)
        .single();

      if (propErr || !prop) { setErr("Property not found."); setLoading(false); return; }
      setProperty(prop);

      // Load units with tenant names
      const { data: rawUnits } = await supabase
        .from("units")
        .select("unit_id, unit_number, bedrooms, bathrooms, sqft, rent_amount, deposit_amount, status")
        .eq("property_id", id)
        .order("unit_number");

      const enrichedUnits: Unit[] = await Promise.all(
        (rawUnits || []).map(async (u) => {
          if (u.status === "occupied") {
            const { data: tenant } = await supabase
              .from("tenants")
              .select("first_name, last_name")
              .eq("unit_id", u.unit_id)
              .eq("status", "active")
              .maybeSingle();
            return { ...u, tenant_name: tenant ? `${tenant.first_name} ${tenant.last_name}` : undefined };
          }
          return u;
        })
      );
      setUnits(enrichedUnits);

      // Load history
      const { data: hist } = await supabase
        .from("property_history")
        .select("*")
        .eq("property_id", id)
        .order("event_date", { ascending: false });
      setHistory(hist || []);

      setLoading(false);
    })();
  }, [id]);

  async function handleAddEvent() {
    if (!eventForm.description.trim()) { setErr("Description is required."); return; }
    setSavingEvent(true);
    setErr("");

    let receipt_url: string | null = null;

    // Upload receipt photo if provided
    if (receiptFile) {
      const ext = receiptFile.name.split(".").pop();
      const path = `receipts/${accountId}/${id}/${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from("documents")
        .upload(path, receiptFile, { upsert: true });
      if (!uploadErr) {
        const { data: urlData } = supabase.storage.from("documents").getPublicUrl(path);
        receipt_url = urlData.publicUrl;
      }
    }

    const { data: inserted, error } = await supabase
      .from("property_history")
      .insert({
        property_id: id,
        account_id: accountId,
        event_type: eventForm.event_type,
        description: eventForm.description.trim(),
        cost: eventForm.cost ? parseFloat(eventForm.cost) : null,
        performed_by: eventForm.performed_by.trim() || null,
        event_date: eventForm.event_date || null,
        receipt_url,
      })
      .select()
      .single();

    if (error) { setErr(error.message); setSavingEvent(false); return; }
    setHistory((prev) => [inserted, ...prev]);
    setShowAddEvent(false);
    setEventForm({ event_type: "repair", description: "", cost: "", performed_by: "", event_date: new Date().toISOString().split("T")[0] });
    setReceiptFile(null);
    setSavingEvent(false);
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" /></div>;
  }

  if (err && !property) {
    return <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{err}</div>;
  }

  const occupiedCount = units.filter((u) => u.status === "occupied").length;
  const totalRent = units.filter((u) => u.status === "occupied").reduce((s, u) => s + (u.rent_amount ?? 0), 0);
  const historyTotalCost = history.reduce((s, h) => s + (h.cost ?? 0), 0);

  return (
    <div>
      {/* Back */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/client/properties">
          <button className="w-9 h-9 flex items-center justify-center rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50 transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
        </Link>
        <div className="text-sm text-neutral-500">Properties</div>
      </div>

      {/* Property Header */}
      <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-6 mb-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="4" y="2" width="16" height="20" rx="2"/>
                <path d="M9 22V12h6v10"/>
                <path d="M8 7h.01M12 7h.01M16 7h.01M8 11h.01M12 11h.01M16 11h.01"/>
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-neutral-900">
                {property!.nickname || property!.address}
              </h1>
              <div className="flex items-center gap-1.5 text-neutral-500 text-sm mt-1">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                {property!.address}, {property!.city}, {property!.state} {property!.zip}
              </div>
              {property!.notes && (
                <p className="text-sm text-neutral-500 mt-2 max-w-lg">{property!.notes}</p>
              )}
            </div>
          </div>
          <Link href={`/client/properties/${id}/edit`}>
            <button className="flex items-center gap-1.5 border border-neutral-200 text-neutral-700 px-4 py-2 rounded-xl text-sm font-medium hover:bg-neutral-50 transition-colors">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              Edit
            </button>
          </Link>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-4 gap-3 mt-6">
          {[
            { label: "Total Units", value: units.length, color: "text-neutral-900" },
            { label: "Occupied", value: occupiedCount, color: "text-green-600" },
            { label: "Rent/Month", value: `$${totalRent.toLocaleString()}`, color: "text-blue-600" },
            { label: "Maintenance Spend", value: `$${historyTotalCost.toLocaleString()}`, color: "text-orange-600" },
          ].map((s) => (
            <div key={s.label} className="bg-neutral-50 rounded-xl p-3 text-center border border-neutral-100">
              <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-xs text-neutral-500 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {err && <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{err}</div>}

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-6 bg-white border border-neutral-200 rounded-2xl p-1.5 shadow-sm">
        {(["overview", "units", "history", "documents"] as Tab[]).map((t) => (
          <TabBtn key={t} label={t.charAt(0).toUpperCase() + t.slice(1)} active={tab === t} onClick={() => setTab(t)} />
        ))}
      </div>

      {/* ── OVERVIEW TAB ─────────────────────────────────────────────────────── */}
      {tab === "overview" && (
        <div className="grid gap-4">
          <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-6">
            <h2 className="text-sm font-bold text-neutral-700 mb-4">Unit Summary</h2>
            {units.length === 0 ? (
              <div className="text-sm text-neutral-400 text-center py-6">
                No units added yet.{" "}
                <Link href={`/client/units/new?property=${id}`} className="text-blue-600 font-semibold hover:underline">Add a unit</Link>
              </div>
            ) : (
              <div className="grid gap-2">
                {units.map((u) => (
                  <div key={u.unit_id} className="flex items-center justify-between p-3 rounded-xl bg-neutral-50 border border-neutral-100">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-neutral-900">
                          {u.unit_number ? `Unit ${u.unit_number}` : "Unit"}
                        </div>
                        {u.tenant_name && <div className="text-xs text-neutral-500">{u.tenant_name}</div>}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {u.rent_amount && (
                        <span className="text-sm font-semibold text-green-600">${u.rent_amount.toLocaleString()}/mo</span>
                      )}
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${STATUS_COLORS[u.status] || "bg-neutral-100 text-neutral-600"}`}>
                        {u.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick links */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Add Unit", href: `/client/units/new?property=${id}`, icon: "home", color: "bg-blue-500" },
              { label: "Work Order", href: `/client/maintenance/new?property=${id}`, icon: "wrench", color: "bg-orange-500" },
              { label: "Upload Doc", href: `/client/documents?property=${id}`, icon: "folder", color: "bg-purple-500" },
            ].map((a) => (
              <Link key={a.label} href={a.href}>
                <div className="bg-white border border-neutral-200 rounded-2xl p-4 flex flex-col items-center gap-2 text-center hover:shadow-md transition-shadow cursor-pointer">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white ${a.color}`}>
                    {a.icon === "home" && <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>}
                    {a.icon === "wrench" && <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>}
                    {a.icon === "folder" && <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>}
                  </div>
                  <span className="text-xs font-semibold text-neutral-700">{a.label}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* ── UNITS TAB ─────────────────────────────────────────────────────────── */}
      {tab === "units" && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm text-neutral-500">{units.length} unit{units.length !== 1 ? "s" : ""}</div>
            <Link href={`/client/units/new?property=${id}`}>
              <button className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Add Unit
              </button>
            </Link>
          </div>

          {units.length === 0 ? (
            <div className="bg-white rounded-2xl border border-neutral-200 p-10 text-center shadow-sm">
              <p className="text-neutral-500 text-sm">No units yet for this property.</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {units.map((u) => (
                <div key={u.unit_id} className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center text-green-600">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                      </div>
                      <div>
                        <div className="font-bold text-neutral-900">{u.unit_number ? `Unit ${u.unit_number}` : "Unnamed Unit"}</div>
                        <div className="text-xs text-neutral-500 mt-0.5">
                          {[u.bedrooms && `${u.bedrooms} bed`, u.bathrooms && `${u.bathrooms} bath`, u.sqft && `${u.sqft} sqft`].filter(Boolean).join(" · ")}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {u.rent_amount && <span className="text-sm font-bold text-green-600">${u.rent_amount.toLocaleString()}/mo</span>}
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_COLORS[u.status] || "bg-neutral-100 text-neutral-600"}`}>{u.status}</span>
                    </div>
                  </div>
                  {u.tenant_name && (
                    <div className="mt-3 pt-3 border-t border-neutral-100 text-sm text-neutral-600 flex items-center gap-2">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                      {u.tenant_name}
                    </div>
                  )}
                  {u.deposit_amount && (
                    <div className="mt-2 text-xs text-neutral-400">Deposit: ${u.deposit_amount.toLocaleString()}</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── HISTORY TAB ───────────────────────────────────────────────────────── */}
      {tab === "history" && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm text-neutral-500">
              {history.length} event{history.length !== 1 ? "s" : ""} · Total cost: ${historyTotalCost.toLocaleString()}
            </div>
            <button
              onClick={() => setShowAddEvent(true)}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Log Event
            </button>
          </div>

          {history.length === 0 ? (
            <div className="bg-white rounded-2xl border border-neutral-200 p-10 text-center shadow-sm">
              <p className="text-neutral-500 text-sm">No history logged yet. Start tracking repairs, inspections, and maintenance.</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {history.map((h) => (
                <div key={h.id} className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${EVENT_COLORS[h.event_type] || "bg-neutral-100 text-neutral-700"}`}>
                        {h.event_type}
                      </span>
                      <div>
                        <div className="text-sm font-semibold text-neutral-900">{h.description}</div>
                        {h.performed_by && <div className="text-xs text-neutral-500 mt-0.5">By: {h.performed_by}</div>}
                        <div className="text-xs text-neutral-400 mt-1">
                          {h.event_date ? new Date(h.event_date).toLocaleDateString() : new Date(h.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      {h.cost && <span className="text-sm font-bold text-red-500">-${h.cost.toLocaleString()}</span>}
                      {h.receipt_url && (
                        <a href={h.receipt_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-700">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── DOCUMENTS TAB ─────────────────────────────────────────────────────── */}
      {tab === "documents" && (
        <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-6 text-center">
          <div className="w-12 h-12 bg-purple-50 rounded-2xl flex items-center justify-center text-purple-500 mx-auto mb-3">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
          </div>
          <p className="text-neutral-500 text-sm">Property documents will live here.</p>
          <Link href={`/client/documents?property=${id}`} className="text-blue-600 text-sm font-semibold hover:underline mt-1 inline-block">
            Go to Document Center →
          </Link>
        </div>
      )}

      {/* ── ADD EVENT MODAL ───────────────────────────────────────────────────── */}
      {showAddEvent && (
        <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 px-4 pb-4 sm:pb-0">
          <div className="bg-white rounded-2xl border border-neutral-200 w-full max-w-md shadow-xl">
            <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between">
              <h3 className="font-bold text-neutral-900">Log Property Event</h3>
              <button onClick={() => setShowAddEvent(false)} className="text-neutral-400 hover:text-neutral-700">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className="px-6 py-5 grid gap-4">
              {/* Type */}
              <div>
                <label className="block text-xs font-semibold text-neutral-600 mb-1.5">Event Type</label>
                <select
                  className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
                  value={eventForm.event_type}
                  onChange={(e) => setEventForm((p) => ({ ...p, event_type: e.target.value }))}
                >
                  {["repair","maintenance","inspection","upgrade","purchase","note"].map((t) => (
                    <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                  ))}
                </select>
              </div>
              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-neutral-600 mb-1.5">Description *</label>
                <textarea
                  className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 resize-none"
                  rows={3}
                  placeholder="What was done?"
                  value={eventForm.description}
                  onChange={(e) => setEventForm((p) => ({ ...p, description: e.target.value }))}
                />
              </div>
              {/* Cost + Date row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-600 mb-1.5">Cost ($)</label>
                  <input
                    type="number"
                    className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
                    placeholder="0.00"
                    value={eventForm.cost}
                    onChange={(e) => setEventForm((p) => ({ ...p, cost: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-600 mb-1.5">Date</label>
                  <input
                    type="date"
                    className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
                    value={eventForm.event_date}
                    onChange={(e) => setEventForm((p) => ({ ...p, event_date: e.target.value }))}
                  />
                </div>
              </div>
              {/* Performed by */}
              <div>
                <label className="block text-xs font-semibold text-neutral-600 mb-1.5">Performed By</label>
                <input
                  className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
                  placeholder="Vendor name or team member"
                  value={eventForm.performed_by}
                  onChange={(e) => setEventForm((p) => ({ ...p, performed_by: e.target.value }))}
                />
              </div>
              {/* Receipt upload */}
              <div>
                <label className="block text-xs font-semibold text-neutral-600 mb-1.5">Receipt / Photo (optional)</label>
                <div
                  className="border-2 border-dashed border-neutral-200 rounded-xl p-4 text-center cursor-pointer hover:border-blue-400 transition-colors"
                  onClick={() => fileRef.current?.click()}
                >
                  {receiptFile ? (
                    <div className="text-sm text-green-600 font-medium">✓ {receiptFile.name}</div>
                  ) : (
                    <>
                      <svg className="mx-auto text-neutral-400 mb-1" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                      <div className="text-sm text-neutral-500">Tap to upload photo or PDF</div>
                      <div className="text-xs text-neutral-400 mt-0.5">Snap a receipt with your camera</div>
                    </>
                  )}
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*,application/pdf"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => setReceiptFile(e.target.files?.[0] ?? null)}
                />
              </div>

              {err && <div className="text-sm text-red-600">{err}</div>}
            </div>
            <div className="px-6 py-4 border-t border-neutral-100 flex gap-3">
              <button
                onClick={() => setShowAddEvent(false)}
                className="flex-1 border border-neutral-200 text-neutral-700 px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-neutral-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAddEvent}
                disabled={savingEvent}
                className="flex-1 bg-blue-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
              >
                {savingEvent ? "Saving..." : "Log Event"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
