"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type RentRollRow = { unit_label:string; property_name:string; tenant_name:string; rent_amount:number; status:string; last_payment:string|null; balance:number; };
type DelinqRow = { tenant_name:string; unit_label:string; property_name:string; amount_owed:number; days_late:number; };

export default function ReportsPage() {
  const [tab, setTab] = useState<"rent_roll"|"delinquency">("rent_roll");
  const [rentRoll, setRentRoll] = useState<RentRollRow[]>([]);
  const [delinq, setDelinq] = useState<DelinqRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [accountId, setAccountId] = useState("");

  useEffect(()=>{
    (async()=>{
      const {data:ud} = await supabase.auth.getUser();
      if(!ud.user){location.href="/login";return;}
      const {data:au} = await supabase.from("app_users").select("account_id").eq("user_id",ud.user.id).maybeSingle();
      if(!au){setLoading(false);return;}
      setAccountId(au.account_id);
      await buildReports(au.account_id);
      setLoading(false);
    })();
  },[]);

  async function buildReports(acctId:string) {
    const {data:leases} = await supabase.from("leases").select("*").eq("account_id",acctId).eq("status","active");
    const rows:RentRollRow[] = await Promise.all((leases||[]).map(async l=>{
      const {data:t} = await supabase.from("tenants").select("first_name,last_name,unit_id").eq("tenant_id",l.tenant_id).maybeSingle();
      const {data:u} = t?.unit_id ? await supabase.from("units").select("unit_number,property_id").eq("unit_id",t.unit_id).maybeSingle() : {data:null};
      const {data:p} = u ? await supabase.from("properties").select("nickname,address").eq("property_id",u.property_id).maybeSingle() : {data:null};
      const {data:pays} = await supabase.from("payment_records").select("amount,status,created_at").eq("tenant_id",l.tenant_id).order("created_at",{ascending:false}).limit(1);
      const last = pays?.[0];
      return { unit_label:u?.unit_number?`Unit ${u.unit_number}`:"", property_name:p?.nickname||p?.address||"", tenant_name:t?`${t.first_name} ${t.last_name}`:"", rent_amount:l.rent_amount||0, status:last?.status||"no_payment", last_payment:last?.created_at||null, balance:last?.status==="confirmed"?0:l.rent_amount||0 };
    }));
    setRentRoll(rows);
    setDelinq(rows.filter(r=>r.balance>0).map(r=>({...r, amount_owed:r.balance, days_late: r.last_payment ? Math.floor((Date.now()-new Date(r.last_payment).getTime())/(1000*60*60*24)) : 0})));
  }

  if(loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full"/></div>;

  return (
    <div>
      <div className="flex items-start justify-between mb-8">
        <div><h1 className="text-3xl font-bold text-neutral-900">Reports</h1><p className="text-neutral-500 mt-1">Financial reports and analytics</p></div>
        <button className="flex items-center gap-2 border border-neutral-200 bg-white text-neutral-700 px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-neutral-50">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          Export
        </button>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-2 mb-6">
        {(["rent_roll","delinquency"] as const).map(t=>(
          <button key={t} onClick={()=>setTab(t)} className={`px-5 py-2.5 rounded-xl text-sm font-semibold capitalize transition-all ${tab===t?"bg-blue-600 text-white":"bg-white border border-neutral-200 text-neutral-600 hover:bg-neutral-50"}`}>{t.replace("_"," ")}</button>
        ))}
      </div>

      {tab==="rent_roll" && (
        <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between">
            <div className="font-bold text-neutral-800">Rent Roll</div>
            <div className="text-xs text-neutral-400">Property · Unit · Tenant · Status</div>
          </div>
          {rentRoll.length === 0 ? (
            <div className="p-10 text-center text-sm text-neutral-400">No active leases to report.</div>
          ) : (
            <table className="w-full text-sm">
              <thead><tr className="bg-neutral-50 text-xs text-neutral-500 uppercase tracking-wider">
                <th className="px-5 py-3 text-left">Tenant</th><th className="px-5 py-3 text-left">Property / Unit</th>
                <th className="px-5 py-3 text-right">Rent</th><th className="px-5 py-3 text-right">Balance</th>
                <th className="px-5 py-3 text-center">Status</th><th className="px-5 py-3 text-left">Last Payment</th>
              </tr></thead>
              <tbody>{rentRoll.map((r,i)=>(
                <tr key={i} className="border-t border-neutral-50 hover:bg-neutral-50">
                  <td className="px-5 py-3 font-medium">{r.tenant_name}</td>
                  <td className="px-5 py-3 text-neutral-500">{r.property_name} {r.unit_label}</td>
                  <td className="px-5 py-3 text-right font-semibold">${r.rent_amount.toLocaleString()}</td>
                  <td className={`px-5 py-3 text-right font-bold ${r.balance>0?"text-red-500":"text-green-600"}`}>${r.balance.toLocaleString()}</td>
                  <td className="px-5 py-3 text-center"><span className={`text-xs px-2 py-1 rounded-full font-medium ${r.status==="confirmed"?"bg-green-50 text-green-700":r.status==="late"?"bg-red-50 text-red-600":"bg-yellow-50 text-yellow-700"}`}>{r.status.replace("_"," ")}</span></td>
                  <td className="px-5 py-3 text-neutral-400 text-xs">{r.last_payment?new Date(r.last_payment).toLocaleDateString():"Never"}</td>
                </tr>
              ))}</tbody>
            </table>
          )}
        </div>
      )}

      {tab==="delinquency" && (
        <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between">
            <div className="font-bold text-neutral-800">Delinquency Report</div>
            <div className="text-sm text-red-600 font-semibold">{delinq.length} tenant{delinq.length!==1?"s":""} with outstanding balance</div>
          </div>
          {delinq.length === 0 ? (
            <div className="p-10 text-center">
              <div className="text-4xl mb-3">🎉</div>
              <div className="text-sm text-neutral-500 font-medium">All caught up! No outstanding balances.</div>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead><tr className="bg-neutral-50 text-xs text-neutral-500 uppercase tracking-wider">
                <th className="px-5 py-3 text-left">Tenant</th><th className="px-5 py-3 text-left">Property / Unit</th>
                <th className="px-5 py-3 text-right">Amount Owed</th><th className="px-5 py-3 text-center">Days Late</th>
              </tr></thead>
              <tbody>{delinq.map((r,i)=>(
                <tr key={i} className="border-t border-neutral-50 hover:bg-red-50">
                  <td className="px-5 py-3 font-medium">{r.tenant_name}</td>
                  <td className="px-5 py-3 text-neutral-500">{r.property_name} {r.unit_label}</td>
                  <td className="px-5 py-3 text-right font-bold text-red-600">${r.amount_owed.toLocaleString()}</td>
                  <td className="px-5 py-3 text-center"><span className={`text-xs px-2 py-1 rounded-full font-bold ${r.days_late>30?"bg-red-100 text-red-700":r.days_late>7?"bg-orange-100 text-orange-700":"bg-yellow-100 text-yellow-700"}`}>{r.days_late}d</span></td>
                </tr>
              ))}</tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
