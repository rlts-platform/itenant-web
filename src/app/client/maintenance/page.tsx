"use client";
export const dynamic = "force-dynamic";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

type WO = {
  id:string; category:string; summary:string; status:string; urgency:string;
  created_at:string; tenant_id:string|null; property_id:string|null; unit_id:string|null;
  assigned_to:string|null; cost:number|null; receipt_url:string|null;
  tenant_name:string; property_name:string; unit_label:string;
};
const URGENCY_COLOR:Record<string,string> = {emergency:"bg-red-50 text-red-700 border-red-200",urgent:"bg-yellow-50 text-yellow-800 border-yellow-200",normal:"bg-neutral-100 text-neutral-600 border-neutral-200"};
const STATUS_COLOR:Record<string,string> = {new:"bg-blue-50 text-blue-700 border-blue-200",in_progress:"bg-orange-50 text-orange-700 border-orange-200",on_hold:"bg-yellow-50 text-yellow-700 border-yellow-200",closed:"bg-neutral-100 text-neutral-500 border-neutral-200"};

export default function MaintenancePage() {
  const [wos, setWos] = useState<WO[]>([]);
  const [accountId, setAccountId] = useState("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all"|"new"|"in_progress"|"on_hold"|"closed">("all");
  const [urgencyFilter, setUrgencyFilter] = useState<"all"|"emergency"|"urgent"|"normal">("all");

  useEffect(()=>{
    (async()=>{
      const {data:ud} = await supabase.auth.getUser();
      if(!ud.user){location.href="/login";return;}
      const {data:au} = await supabase.from("app_users").select("account_id").eq("user_id",ud.user.id).maybeSingle();
      if(!au){setErr("Not authorized.");setLoading(false);return;}
      setAccountId(au.account_id);
      const {data:raw} = await supabase.from("work_orders").select("*").eq("account_id",au.account_id).order("created_at",{ascending:false});
      const enriched:WO[] = await Promise.all((raw||[]).map(async w=>{
        const {data:t} = w.tenant_id ? await supabase.from("tenants").select("first_name,last_name").eq("tenant_id",w.tenant_id).maybeSingle() : {data:null};
        const {data:p} = w.property_id ? await supabase.from("properties").select("nickname,address").eq("property_id",w.property_id).maybeSingle() : {data:null};
        const {data:u} = w.unit_id ? await supabase.from("units").select("unit_number").eq("unit_id",w.unit_id).maybeSingle() : {data:null};
        return {...w, tenant_name:t?`${t.first_name} ${t.last_name}`:"", property_name:p?.nickname||p?.address||"", unit_label:u?.unit_number?`Unit ${u.unit_number}`:""};
      }));
      setWos(enriched);
      setLoading(false);
    })();
  },[]);

  const filtered = useMemo(()=>wos.filter(w=>{
    const sOk = statusFilter==="all"||w.status===statusFilter;
    const uOk = urgencyFilter==="all"||w.urgency===urgencyFilter;
    const s = q.trim().toLowerCase();
    const qOk = !s||w.summary.toLowerCase().includes(s)||w.category.toLowerCase().includes(s)||(w.tenant_name||"").toLowerCase().includes(s);
    return sOk && uOk && qOk;
  }),[wos,statusFilter,urgencyFilter,q]);

  async function updateStatus(id:string, status:string) {
    await supabase.from("work_orders").update({status}).eq("id",id);
    setWos(p=>p.map(w=>w.id===id?{...w,status}:w));
  }

  if(loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full"/></div>;

  return (
    <div>
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900">Maintenance Requests</h1>
          <p className="text-neutral-500 mt-1">Manage property maintenance and work orders</p>
        </div>
        <Link href="/client/maintenance/new">
          <button className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 shadow-sm">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            New Request
          </button>
        </Link>
      </div>
      {err && <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{err}</div>}

      {/* Stats */}
      {wos.length > 0 && (
        <div className="grid grid-cols-4 gap-3 mb-6">
          {[
            {label:"Open",value:wos.filter(w=>["new","in_progress","on_hold"].includes(w.status)).length,color:"text-orange-500"},
            {label:"New",value:wos.filter(w=>w.status==="new").length,color:"text-blue-600"},
            {label:"Emergency",value:wos.filter(w=>w.urgency==="emergency").length,color:"text-red-600"},
            {label:"Closed This Month",value:wos.filter(w=>w.status==="closed"&&new Date(w.created_at).getMonth()===new Date().getMonth()).length,color:"text-green-600"},
          ].map(s=>(
            <div key={s.label} className="bg-white rounded-2xl border border-neutral-200 p-4 text-center shadow-sm">
              <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-xs text-neutral-500 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-48">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-neutral-200 bg-white text-sm outline-none focus:ring-2 focus:ring-blue-500/20" placeholder="Search..." value={q} onChange={e=>setQ(e.target.value)}/>
        </div>
        <div className="flex gap-1 bg-white border border-neutral-200 rounded-xl p-1">
          {(["all","new","in_progress","on_hold","closed"] as const).map(f=>(
            <button key={f} onClick={()=>setStatusFilter(f)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize ${statusFilter===f?"bg-blue-600 text-white":"text-neutral-600 hover:bg-neutral-50"}`}>{f.replace("_"," ")}</button>
          ))}
        </div>
        <div className="flex gap-1 bg-white border border-neutral-200 rounded-xl p-1">
          {(["all","emergency","urgent","normal"] as const).map(f=>(
            <button key={f} onClick={()=>setUrgencyFilter(f)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize ${urgencyFilter===f?"bg-red-600 text-white":"text-neutral-600 hover:bg-neutral-50"}`}>{f}</button>
          ))}
        </div>
      </div>

      {wos.length === 0 ? (
        <div className="bg-white rounded-2xl border border-neutral-200 p-12 text-center shadow-sm">
          <div className="w-16 h-16 bg-orange-50 rounded-2xl flex items-center justify-center text-orange-500 mx-auto mb-4">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
          </div>
          <h2 className="text-lg font-bold text-neutral-900">No work orders yet</h2>
          <p className="text-neutral-500 text-sm mt-1 mb-6">Tenants can submit requests or you can create them manually.</p>
          <Link href="/client/maintenance/new"><button className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 mx-auto">+ New Request</button></Link>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-neutral-200 p-8 text-center shadow-sm"><p className="text-neutral-500 text-sm">No matching requests.</p></div>
      ) : (
        <div className="grid gap-4">
          {filtered.map(w=>(
            <div key={w.id} className="bg-white rounded-2xl border border-neutral-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
              <div className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className={`text-xs font-semibold border px-2.5 py-0.5 rounded-full ${URGENCY_COLOR[w.urgency]||URGENCY_COLOR.normal}`}>{w.urgency}</span>
                      <span className={`text-xs font-semibold border px-2.5 py-0.5 rounded-full ${STATUS_COLOR[w.status]||STATUS_COLOR.new}`}>{w.status.replace("_"," ")}</span>
                      <span className="text-xs text-neutral-400">{w.category}</span>
                    </div>
                    <div className="font-semibold text-neutral-900">{w.summary}</div>
                    <div className="text-xs text-neutral-500 mt-1 flex flex-wrap gap-2">
                      {w.tenant_name && <span>👤 {w.tenant_name}</span>}
                      {w.property_name && <span>🏠 {w.property_name}</span>}
                      {w.unit_label && <span>· {w.unit_label}</span>}
                      <span>· {new Date(w.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  {w.cost && <div className="text-sm font-bold text-red-500 shrink-0">-${w.cost.toLocaleString()}</div>}
                </div>
              </div>
              <div className="flex items-center gap-2 px-5 py-3 border-t border-neutral-100 bg-neutral-50">
                {w.status==="new" && <button onClick={()=>updateStatus(w.id,"in_progress")} className="text-xs font-semibold text-orange-600 border border-orange-200 bg-orange-50 px-3 py-1.5 rounded-lg hover:bg-orange-100">Mark In Progress</button>}
                {w.status==="in_progress" && <button onClick={()=>updateStatus(w.id,"closed")} className="text-xs font-semibold text-green-600 border border-green-200 bg-green-50 px-3 py-1.5 rounded-lg hover:bg-green-100">Mark Complete</button>}
                {w.status==="on_hold" && <button onClick={()=>updateStatus(w.id,"in_progress")} className="text-xs font-semibold text-blue-600 border border-blue-200 bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100">Resume</button>}
                {w.status!=="closed" && <button onClick={()=>updateStatus(w.id,"on_hold")} className="text-xs font-semibold text-neutral-600 border border-neutral-200 px-3 py-1.5 rounded-lg hover:bg-neutral-100">Hold</button>}
                {w.receipt_url && <a href={w.receipt_url} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-blue-600 border border-blue-200 bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100">View Receipt</a>}
                <Link href={`/client/maintenance/${w.id}`}><button className="text-xs font-semibold text-neutral-600 border border-neutral-200 px-3 py-1.5 rounded-lg hover:bg-neutral-100 ml-auto">View Details</button></Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
