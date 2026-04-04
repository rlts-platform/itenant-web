"use client";
export const dynamic = "force-dynamic";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

type Lease = {
  lease_id: string; tenant_id: string; unit_id: string; account_id: string;
  start_date: string|null; end_date: string|null;
  rent_amount: number|null; deposit_amount: number|null;
  status: string; document_url: string|null; signed_at: string|null; created_at: string;
  tenant_name: string; unit_label: string; property_name: string;
  days_until_expiry: number|null;
};

const STATUS_COLOR: Record<string,string> = {
  active: "bg-green-50 text-green-700 border-green-200",
  expired: "bg-neutral-100 text-neutral-500 border-neutral-200",
  terminated: "bg-red-50 text-red-600 border-red-200",
  draft: "bg-yellow-50 text-yellow-700 border-yellow-200",
};

export default function LeasesPage() {
  const [leases, setLeases] = useState<Lease[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all"|"active"|"expired"|"draft">("all");

  useEffect(()=>{
    (async()=>{
      const {data:ud} = await supabase.auth.getUser();
      if(!ud.user){location.href="/login";return;}
      const {data:au} = await supabase.from("app_users").select("account_id").eq("user_id",ud.user.id).maybeSingle();
      if(!au){setErr("Not authorized.");setLoading(false);return;}

      const {data:raw} = await supabase.from("leases").select("*").eq("account_id",au.account_id).order("created_at",{ascending:false});
      const enriched: Lease[] = await Promise.all((raw||[]).map(async l=>{
        const {data:t} = await supabase.from("tenants").select("first_name,last_name").eq("tenant_id",l.tenant_id).maybeSingle();
        const {data:u} = await supabase.from("units").select("unit_number,property_id").eq("unit_id",l.unit_id).maybeSingle();
        const {data:p} = u ? await supabase.from("properties").select("nickname,address").eq("property_id",u.property_id).maybeSingle() : {data:null};
        const days = l.end_date ? Math.ceil((new Date(l.end_date).getTime()-Date.now())/(1000*60*60*24)) : null;
        return { ...l, tenant_name: t?`${t.first_name} ${t.last_name}`:"Unknown", unit_label: u?.unit_number?`Unit ${u.unit_number}`:"Unit", property_name: p?.nickname||p?.address||"", days_until_expiry: days };
      }));
      setLeases(enriched);
      setLoading(false);
    })();
  },[]);

  const filtered = useMemo(()=>leases.filter(l=>{
    const fOk = filter==="all"||l.status===filter;
    const s = q.trim().toLowerCase();
    const qOk = !s||l.tenant_name.toLowerCase().includes(s)||l.property_name.toLowerCase().includes(s)||l.unit_label.toLowerCase().includes(s);
    return fOk && qOk;
  }),[leases,filter,q]);

  if(loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full"/></div>;

  return (
    <div>
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900">Leases</h1>
          <p className="text-neutral-500 mt-1">AI-powered lease management</p>
        </div>
        <Link href="/client/leases/new">
          <button className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 shadow-sm">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            New Lease
          </button>
        </Link>
      </div>
      {err && <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{err}</div>}

      {/* Stats */}
      {leases.length > 0 && (
        <div className="grid grid-cols-4 gap-3 mb-6">
          {[
            {label:"Total",value:leases.length,color:"text-neutral-900"},
            {label:"Active",value:leases.filter(l=>l.status==="active").length,color:"text-green-600"},
            {label:"Expiring Soon",value:leases.filter(l=>l.status==="active"&&(l.days_until_expiry??999)<=30).length,color:"text-orange-500"},
            {label:"Drafts",value:leases.filter(l=>l.status==="draft").length,color:"text-yellow-600"},
          ].map(s=>(
            <div key={s.label} className="bg-white rounded-2xl border border-neutral-200 p-4 text-center shadow-sm">
              <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-xs text-neutral-500 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Search + filter */}
      <div className="flex gap-3 mb-6">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-neutral-200 bg-white text-sm outline-none focus:ring-2 focus:ring-blue-500/20" placeholder="Search leases..." value={q} onChange={e=>setQ(e.target.value)}/>
        </div>
        <div className="flex gap-1 bg-white border border-neutral-200 rounded-xl p-1">
          {(["all","active","expired","draft"] as const).map(f=>(
            <button key={f} onClick={()=>setFilter(f)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize ${filter===f?"bg-blue-600 text-white":"text-neutral-600 hover:bg-neutral-50"}`}>{f}</button>
          ))}
        </div>
      </div>

      {leases.length === 0 ? (
        <div className="bg-white rounded-2xl border border-neutral-200 p-12 text-center shadow-sm">
          <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-500 mx-auto mb-4">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          </div>
          <h2 className="text-lg font-bold text-neutral-900">No leases yet</h2>
          <p className="text-neutral-500 text-sm mt-1 mb-6">Create your first lease. Signing it automatically invites the tenant to the app.</p>
          <Link href="/client/leases/new"><button className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 mx-auto">+ New Lease</button></Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {filtered.map(l=>(
            <Link key={l.lease_id} href={`/client/leases/${l.lease_id}`}>
              <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm hover:shadow-md transition-shadow p-5 cursor-pointer">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                    </div>
                    <div>
                      <div className="font-bold text-neutral-900">{l.tenant_name}</div>
                      <div className="text-sm text-neutral-500">{l.unit_label} · {l.property_name}</div>
                      <div className="text-sm text-neutral-500 mt-0.5">
                        {l.rent_amount ? `$${l.rent_amount.toLocaleString()}/mo` : "—"}
                        {l.start_date && ` · From ${new Date(l.start_date).toLocaleDateString()}`}
                        {l.end_date && ` to ${new Date(l.end_date).toLocaleDateString()}`}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <span className={`text-xs font-medium border px-2.5 py-1 rounded-full ${STATUS_COLOR[l.status]||STATUS_COLOR.draft}`}>{l.status}</span>
                    {l.status==="active" && l.days_until_expiry !== null && l.days_until_expiry <= 30 && l.days_until_expiry >= 0 && (
                      <span className="text-xs bg-orange-50 text-orange-600 border border-orange-200 px-2 py-0.5 rounded-full">Expires in {l.days_until_expiry}d</span>
                    )}
                    {l.signed_at && <span className="text-xs text-green-600">✓ Signed</span>}
                    {l.document_url && <span className="text-xs text-blue-600">📎 Doc</span>}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
