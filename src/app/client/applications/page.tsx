"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

type App = {
  id: string; first_name: string; last_name: string; email: string; phone: string | null;
  monthly_income: number | null; status: string; source: string; ai_score: number | null;
  ai_summary: string | null; created_at: string; property_name: string; unit_label: string;
  property_id: string | null; unit_id: string | null;
};

const STATUS_COLORS: Record<string, string> = {
  new: "bg-blue-50 text-blue-700 border-blue-200",
  reviewing: "bg-yellow-50 text-yellow-700 border-yellow-200",
  approved: "bg-green-50 text-green-700 border-green-200",
  denied: "bg-red-50 text-red-700 border-red-200",
  withdrawn: "bg-neutral-100 text-neutral-500 border-neutral-200",
};

const SOURCE_LABELS: Record<string, string> = {
  itenant_form: "iTenant Form", zillow: "Zillow", apartments_com: "Apartments.com",
  avail: "Avail", email_parse: "Email", pdf_upload: "PDF Upload", manual: "Manual",
};

function ScoreBadge({ score }: { score: number | null }) {
  if (!score) return <span className="text-xs text-neutral-400">No score</span>;
  const color = score >= 75 ? "text-green-600 bg-green-50 border-green-200" : score >= 50 ? "text-yellow-700 bg-yellow-50 border-yellow-200" : "text-red-600 bg-red-50 border-red-200";
  return <span className={`text-xs font-bold border px-2 py-0.5 rounded-full ${color}`}>Score: {score}</span>;
}

export default function ApplicationsPage() {
  const [apps, setApps] = useState<App[]>([]);
  const [accountId, setAccountId] = useState("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [toast, setToast] = useState("");
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all");
  const [approving, setApproving] = useState<string | null>(null);
  const [denying, setDenying] = useState<string | null>(null);
  const [denialReason, setDenialReason] = useState("");

  useEffect(() => {
    (async () => {
      const { data: ud } = await supabase.auth.getUser();
      if (!ud.user) { location.href = "/login"; return; }
      const { data: au } = await supabase.from("app_users").select("account_id,role").eq("user_id", ud.user.id).maybeSingle();
      if (!au || !["client", "team"].includes(au.role)) { setErr("Not authorized."); setLoading(false); return; }
      setAccountId(au.account_id);
      await load(au.account_id);
      setLoading(false);
    })();
  }, []);

  async function load(acctId: string) {
    const { data, error } = await supabase.from("rental_applications").select("*").eq("account_id", acctId).order("created_at", { ascending: false });
    if (error) { setErr(error.message); return; }
    const enriched: App[] = await Promise.all((data || []).map(async (a) => {
      let property_name = "No property", unit_label = "No unit";
      if (a.property_id) {
        const { data: p } = await supabase.from("properties").select("nickname,address").eq("property_id", a.property_id).maybeSingle();
        property_name = p?.nickname || p?.address || "Unknown";
      }
      if (a.unit_id) {
        const { data: u } = await supabase.from("units").select("unit_number").eq("unit_id", a.unit_id).maybeSingle();
        unit_label = u?.unit_number ? `Unit ${u.unit_number}` : "Unit";
      }
      return { ...a, property_name, unit_label };
    }));
    setApps(enriched);
  }

  async function approve(appId: string) {
    const app = apps.find(a => a.id === appId);
    if (!app) return;
    setApproving(appId);
    await supabase.from("rental_applications").update({ status: "approved" }).eq("id", appId);
    // Auto-create tenant from application
    if (app.unit_id && app.property_id) {
      const { data: tenant } = await supabase.from("tenants").insert({
        account_id: accountId, unit_id: app.unit_id,
        first_name: app.first_name, last_name: app.last_name,
        email: app.email, phone: app.phone, status: "pending",
      }).select("tenant_id").single();
      if (tenant) {
        await supabase.from("units").update({ status: "occupied" }).eq("unit_id", app.unit_id);
        await supabase.from("tenant_invites").insert({ tenant_id: tenant.tenant_id, account_id: accountId, email: app.email });
      }
    }
    setApps(prev => prev.map(a => a.id === appId ? { ...a, status: "approved" } : a));
    showToast("Application approved — tenant profile created and invite sent ✓");
    setApproving(null);
  }

  async function deny(appId: string) {
    await supabase.from("rental_applications").update({ status: "denied", denial_reason: denialReason }).eq("id", appId);
    setApps(prev => prev.map(a => a.id === appId ? { ...a, status: "denied" } : a));
    setDenying(null); setDenialReason("");
    showToast("Application denied and archived.");
  }

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(""), 4000); }

  const filtered = useMemo(() => apps.filter(a => {
    const sq = q.trim().toLowerCase();
    const searchOk = !sq || `${a.first_name} ${a.last_name}`.toLowerCase().includes(sq) || a.email.toLowerCase().includes(sq) || a.property_name.toLowerCase().includes(sq);
    const statusOk = filter === "all" || a.status === filter;
    return searchOk && statusOk;
  }), [apps, q, filter]);

  const counts = { all: apps.length, new: apps.filter(a => a.status === "new").length, reviewing: apps.filter(a => a.status === "reviewing").length, approved: apps.filter(a => a.status === "approved").length, denied: apps.filter(a => a.status === "denied").length };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" /></div>;

  return (
    <div>
      <div className="flex items-start justify-between mb-8">
        <div><h1 className="text-3xl font-bold text-neutral-900">Applications</h1><p className="text-neutral-500 mt-1">Review and manage rental applications</p></div>
        <div className="flex gap-2">
          <Link href="/client/applications/upload"><button className="flex items-center gap-2 border border-neutral-200 bg-white text-neutral-700 px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-neutral-50 transition-colors">Upload PDF</button></Link>
          <Link href="/client/settings?tab=integrations"><button className="flex items-center gap-2 border border-blue-200 bg-blue-50 text-blue-700 px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-100 transition-colors">🔌 Connect Platforms</button></Link>
        </div>
      </div>
      {err && <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{err}</div>}

      {/* Connected platform banner */}
      <div className="mb-6 bg-white border border-neutral-200 rounded-2xl p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold text-neutral-700">Connected Platforms</div>
          <Link href="/client/settings?tab=integrations" className="text-xs text-blue-600 font-semibold hover:underline">Manage →</Link>
        </div>
        <div className="flex gap-3 mt-3 flex-wrap">
          {[
            { name: "Zillow", logo: "🏠", status: "Connect" },
            { name: "Apartments.com", logo: "🏢", status: "Connect" },
            { name: "Avail", logo: "📋", status: "Connect" },
            { name: "HotPads", logo: "🗺️", status: "Connect" },
            { name: "Trulia", logo: "🔑", status: "Connect" },
          ].map(p => (
            <Link key={p.name} href="/client/settings?tab=integrations">
              <div className="flex items-center gap-2 border border-dashed border-neutral-300 rounded-xl px-3 py-2 text-xs text-neutral-500 hover:border-blue-400 hover:text-blue-600 cursor-pointer transition-colors">
                <span>{p.logo}</span><span>{p.name}</span><span className="text-blue-500 font-semibold">+ {p.status}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-3 mb-6">
        {[
          { label: "Total", value: counts.all, color: "text-neutral-900" },
          { label: "New", value: counts.new, color: "text-blue-600" },
          { label: "Reviewing", value: counts.reviewing, color: "text-yellow-600" },
          { label: "Approved", value: counts.approved, color: "text-green-600" },
          { label: "Denied", value: counts.denied, color: "text-red-500" },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-neutral-200 p-4 text-center shadow-sm">
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-neutral-500 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Search + Filter */}
      <div className="flex gap-3 mb-6">
        <div className="relative flex-1"><svg className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg><input className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-neutral-200 bg-white text-sm outline-none focus:ring-2 focus:ring-blue-500/20" placeholder="Search applicants..." value={q} onChange={e => setQ(e.target.value)} /></div>
        <div className="flex gap-1 bg-white border border-neutral-200 rounded-xl p-1">
          {["all", "new", "reviewing", "approved", "denied"].map(s => <button key={s} onClick={() => setFilter(s)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${filter === s ? "bg-blue-600 text-white" : "text-neutral-600 hover:bg-neutral-50"}`}>{s}</button>)}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-neutral-200 p-12 text-center shadow-sm">
          <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-500 mx-auto mb-4"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg></div>
          <h2 className="text-lg font-bold text-neutral-900">No applications yet</h2>
          <p className="text-neutral-500 text-sm mt-1 mb-5 max-w-sm mx-auto">Share your property's application link or connect Zillow/Apartments.com to start receiving applications.</p>
          <Link href="/client/settings?tab=integrations"><button className="bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 mx-auto flex items-center gap-2">Connect Platforms</button></Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {filtered.map(a => (
            <div key={a.id} className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
              <div className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm shrink-0">{a.first_name[0]}{a.last_name[0]}</div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-neutral-900">{a.first_name} {a.last_name}</span>
                        <span className={`text-xs font-medium border px-2 py-0.5 rounded-full ${STATUS_COLORS[a.status]}`}>{a.status}</span>
                        <ScoreBadge score={a.ai_score} />
                        <span className="text-xs text-neutral-400 bg-neutral-100 px-2 py-0.5 rounded-full">{SOURCE_LABELS[a.source] || a.source}</span>
                      </div>
                      <div className="text-sm text-neutral-500 mt-0.5">{a.email}{a.phone ? ` · ${a.phone}` : ""}</div>
                      <div className="text-sm text-neutral-500">{a.property_name} · {a.unit_label}</div>
                      {a.monthly_income && <div className="text-xs text-green-600 font-medium mt-1">Income: ${a.monthly_income.toLocaleString()}/mo</div>}
                    </div>
                  </div>
                  <div className="text-xs text-neutral-400 shrink-0">{new Date(a.created_at).toLocaleDateString()}</div>
                </div>
                {a.ai_summary && <div className="mt-3 p-3 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-800"><span className="font-semibold">AI Summary:</span> {a.ai_summary} <span className="text-blue-400 ml-1">— Guide only. All decisions made by you.</span></div>}
              </div>
              {["new", "reviewing"].includes(a.status) && (
                <div className="flex gap-2 px-5 py-3 border-t border-neutral-100 bg-neutral-50">
                  <button onClick={() => supabase.from("rental_applications").update({ status: "reviewing" }).eq("id", a.id).then(() => setApps(prev => prev.map(x => x.id === a.id ? { ...x, status: "reviewing" } : x)))} className="border border-neutral-200 bg-white text-neutral-700 px-3 py-2 rounded-xl text-xs font-semibold hover:bg-neutral-100 transition-colors">Mark Reviewing</button>
                  <button onClick={() => approve(a.id)} disabled={approving === a.id} className="bg-green-600 text-white px-4 py-2 rounded-xl text-xs font-semibold hover:bg-green-700 transition-colors disabled:opacity-50">{approving === a.id ? "Approving..." : "✓ Approve"}</button>
                  <button onClick={() => setDenying(a.id)} className="bg-red-50 border border-red-200 text-red-600 px-4 py-2 rounded-xl text-xs font-semibold hover:bg-red-100 transition-colors">✕ Deny</button>
                  <div className="flex-1" />
                  <span className="text-xs text-neutral-400 self-center">Approving creates tenant profile + sends invite automatically</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Deny Modal */}
      {denying && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl border border-neutral-200 p-6 max-w-sm w-full shadow-xl">
            <h3 className="font-bold text-neutral-900 mb-3">Deny Application</h3>
            <p className="text-sm text-neutral-500 mb-4">The application will be archived and a denial record will be saved. A denial letter can be generated from the applicant's record.</p>
            <textarea className="w-full rounded-xl border border-neutral-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 resize-none" rows={3} placeholder="Reason for denial (for your records)..." value={denialReason} onChange={e => setDenialReason(e.target.value)} />
            <div className="flex gap-3 mt-4">
              <button onClick={() => setDenying(null)} className="flex-1 border border-neutral-200 text-neutral-700 px-4 py-2.5 rounded-xl text-sm font-semibold">Cancel</button>
              <button onClick={() => deny(denying)} className="flex-1 bg-red-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-red-700">Confirm Deny</button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-neutral-900 text-white text-sm font-medium px-5 py-3 rounded-xl shadow-lg z-50">{toast}</div>}
    </div>
  );
}
