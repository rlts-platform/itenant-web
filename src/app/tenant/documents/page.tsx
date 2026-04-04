"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { TenantNav } from "@/components/ui/TenantNav";

type Doc = { id: string; file_name: string; doc_type: string | null; category: string | null; subcategory: string | null; file_url: string; created_at: string; };

const CATEGORY_ICONS: Record<string, string> = { lease: "📄", "lease renewals": "🔄", notices: "📢", receipts: "🧾", general: "📁" };

export default function TenantDocumentsPage() {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("All");

  useEffect(() => {
    (async () => {
      const { data: ud } = await supabase.auth.getUser();
      if (!ud.user) { location.href = "/login"; return; }
      const { data: au } = await supabase.from("app_users").select("tenant_id,role").eq("user_id", ud.user.id).maybeSingle();
      if (!au || au.role !== "tenant" || !au.tenant_id) { location.href = "/tenant"; return; }
      const { data } = await supabase.from("documents").select("*").eq("tenant_id", au.tenant_id).order("created_at", { ascending: false });
      setDocs(data || []);
      setLoading(false);
    })();
  }, []);

  const categories = ["All", ...new Set(docs.map(d => d.category || "General"))];
  const filtered = filter === "All" ? docs : docs.filter(d => (d.category || "General") === filter);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" /></div>;

  return (
    <div className="pb-24">
      <div className="mx-auto max-w-3xl px-6 pt-10">
        <div className="mb-8"><h1 className="text-3xl font-bold text-neutral-900">My Documents</h1><p className="text-neutral-500 mt-1">Your lease, renewals, and documents from your property manager</p></div>
        {docs.length > 0 && (
          <div className="flex gap-2 mb-5 flex-wrap">
            {categories.map(c => <button key={c} onClick={() => setFilter(c)} className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${filter === c ? "bg-blue-600 text-white border-blue-600" : "bg-white text-neutral-600 border-neutral-200"}`}>{c}</button>)}
          </div>
        )}
        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-neutral-200 p-12 text-center shadow-sm">
            <div className="w-14 h-14 bg-purple-50 rounded-2xl flex items-center justify-center text-purple-500 mx-auto mb-4"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /></svg></div>
            <h2 className="text-lg font-bold text-neutral-900">No documents yet</h2>
            <p className="text-neutral-500 text-sm mt-1">Documents shared by your property manager will appear here.</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {filtered.map(d => (
              <div key={d.id} className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-xl shrink-0">{CATEGORY_ICONS[d.category?.toLowerCase() || "general"] || "📁"}</div>
                  <div><div className="font-semibold text-neutral-900 text-sm">{d.file_name}</div><div className="text-xs text-neutral-500 mt-0.5">{d.category || "General"}{d.subcategory ? ` · ${d.subcategory}` : ""} · {new Date(d.created_at).toLocaleDateString()}</div></div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <a href={d.file_url} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-blue-600 border border-blue-200 bg-blue-50 px-3 py-1.5 rounded-xl hover:bg-blue-100 transition-colors">View</a>
                  <a href={d.file_url} download className="text-xs font-semibold text-neutral-600 border border-neutral-200 bg-white px-3 py-1.5 rounded-xl hover:bg-neutral-50 transition-colors">Download</a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <TenantNav />
    </div>
  );
}
