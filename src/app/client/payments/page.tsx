"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

type Payment = {
  id:string; amount:number; method:string|null; status:string;
  proof_image_url:string|null; obtained_date:string|null;
  submitted_date:string|null; notes:string|null; created_at:string;
  tenant_name:string; unit_label:string; property_name:string;
};
const STATUS_COLOR:Record<string,string> = {
  confirmed:"bg-green-50 text-green-700 border-green-200",
  pending:"bg-yellow-50 text-yellow-700 border-yellow-200",
  late:"bg-red-50 text-red-700 border-red-200",
  failed:"bg-red-50 text-red-600 border-red-200",
  partial:"bg-orange-50 text-orange-700 border-orange-200",
};

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all"|"confirmed"|"pending"|"late">("all");

  useEffect(()=>{
    (async()=>{
      const {data:ud} = await supabase.auth.getUser();
      if(!ud.user){location.href="/login";return;}
      const {data:au} = await supabase.from("app_users").select("account_id").eq("user_id",ud.user.id).maybeSingle();
      if(!au){setErr("Not authorized.");setLoading(false);return;}
      const {data:raw} = await supabase.from("payment_records").select("*").eq("account_id",au.account_id).order("created_at",{ascending:false});
      const enriched:Payment[] = await Promise.all((raw||[]).map(async p=>{
        const {data:t} = await supabase.from("tenants").select("first_name,last_name,unit_id").eq("tenant_id",p.tenant_id).maybeSingle();
        const {data:u} = t?.unit_id ? await supabase.from("units").select("unit_number,property_id").eq("unit_id",t.unit_id).maybeSingle() : {data:null};
        const {data:prop} = u ? await supabase.from("properties").select("nickname,address").eq("property_id",u.property_id).maybeSingle() : {data:null};
        return {...p, tenant_name:t?`${t.first_name} ${t.last_name}`:"Unknown", unit_label:u?.unit_number?`Unit ${u.unit_number}`:"", property_name:prop?.nickname||prop?.address||""};
      }));
      setPayments(enriched);
      setLoading(false);
    })();
  },[]);

  const filtered = useMemo(()=>payments.filter(p=>{
    const fOk = filter==="all"||p.status===filter;
    const s = q.trim().toLowerCase();
    const qOk = !s||p.tenant_name.toLowerCase().includes(s)||p.property_name.toLowerCase().includes(s);
    return fOk && qOk;
  }),[payments,filter,q]);

  const totalCollected = payments.filter(p=>p.status==="confirmed").reduce((s,p)=>s+Number(p.amount),0);
  const totalOutstanding = payments.filter(p=>["pending","late"].includes(p.status)).reduce((s,p)=>s+Number(p.amount),0);
  const recentActivity = payments.filter(p=>new Date(p.created_at)>new Date(Date.now()-30*24*60*60*1000)).length;

  if(loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full"/></div>;

  return (
    <div>
      <div className="flex items-start justify-between mb-8">
        <div><h1 className="text-3xl font-bold text-neutral-900">Payments Dashboard</h1><p className="text-neutral-500 mt-1">Track rent collection and financial activity</p></div>
        <Link href="/client/payments/record"><button className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 shadow-sm">+ Log Payment</button></Link>
      </div>
      {err && <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{err}</div>}

      {/* Big stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-6">
          <div className="text-sm text-neutral-500 font-medium">Total Collected</div>
          <div className="text-4xl font-bold text-green-600 mt-1">${totalCollected.toLocaleString()}</div>
        </div>
        <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-6">
          <div className="text-sm text-neutral-500 font-medium">Outstanding</div>
          <div className="text-4xl font-bold text-orange-500 mt-1">${totalOutstanding.toLocaleString()}</div>
        </div>
        <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-6">
          <div className="text-sm text-neutral-500 font-medium">Recent Activity (30d)</div>
          <div className="text-4xl font-bold text-neutral-900 mt-1">{recentActivity}</div>
        </div>
      </div>

      {/* Link to Financial Hub */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-6 flex items-center justify-between">
        <div className="text-sm text-blue-800"><strong>Financial Hub</strong> — View full reports, cash flow, tax estimates and export data.</div>
        <Link href="/client/financials"><button className="text-sm font-semibold text-blue-600 hover:text-blue-700">View Hub →</button></Link>
      </div>

      {/* Search + filter */}
      <div className="flex gap-3 mb-6">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-neutral-200 bg-white text-sm outline-none focus:ring-2 focus:ring-blue-500/20" placeholder="Search by tenant or property..." value={q} onChange={e=>setQ(e.target.value)}/>
        </div>
        <div className="flex gap-1 bg-white border border-neutral-200 rounded-xl p-1">
          {(["all","confirmed","pending","late"] as const).map(f=>(
            <button key={f} onClick={()=>setFilter(f)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize ${filter===f?"bg-blue-600 text-white":"text-neutral-600 hover:bg-neutral-50"}`}>{f}</button>
          ))}
        </div>
      </div>

      {payments.length === 0 ? (
        <div className="bg-white rounded-2xl border border-neutral-200 p-12 text-center shadow-sm">
          <div className="w-16 h-16 bg-green-50 rounded-2xl flex items-center justify-center text-green-500 mx-auto mb-4">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
          </div>
          <h2 className="text-lg font-bold text-neutral-900">No payments yet</h2>
          <p className="text-neutral-500 text-sm mt-1 mb-6">Log your first payment or tenants can pay through their portal.</p>
          <Link href="/client/payments/record"><button className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 mx-auto">+ Log Payment</button></Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {filtered.map(p=>(
            <div key={p.id} className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="font-bold text-neutral-900 text-lg">${Number(p.amount).toLocaleString()}</div>
                    <span className={`text-xs font-medium border px-2.5 py-0.5 rounded-full ${STATUS_COLOR[p.status]||STATUS_COLOR.pending}`}>{p.status}</span>
                  </div>
                  <div className="text-sm text-neutral-500 mt-0.5">{p.tenant_name} · {p.unit_label} {p.property_name && `· ${p.property_name}`}</div>
                  <div className="text-xs text-neutral-400 mt-1 flex flex-wrap gap-3">
                    {p.method && <span>Via {p.method}</span>}
                    <span>{new Date(p.created_at).toLocaleDateString()}</span>
                    {p.obtained_date && <span className="text-blue-600">MO obtained: {new Date(p.obtained_date).toLocaleDateString()}</span>}
                  </div>
                  {p.notes && <div className="text-xs text-neutral-500 mt-1 italic">{p.notes}</div>}
                </div>
                <div className="flex flex-col items-end gap-2">
                  {p.proof_image_url && (
                    <a href={p.proof_image_url} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-blue-600 border border-blue-200 bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100">View Proof</a>
                  )}
                  {p.status==="pending" && (
                    <button onClick={async()=>{
                      await supabase.from("payment_records").update({status:"confirmed"}).eq("id",p.id);
                      setPayments(prev=>prev.map(x=>x.id===p.id?{...x,status:"confirmed"}:x));
                    }} className="text-xs font-semibold text-green-600 border border-green-200 bg-green-50 px-3 py-1.5 rounded-lg hover:bg-green-100">Confirm</button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
