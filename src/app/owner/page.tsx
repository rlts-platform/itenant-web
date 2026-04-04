"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

export const dynamic = "force-dynamic";

export default function OwnerDashboard() {
  const [stats, setStats] = useState({ clients:0, activeClients:0, mrr:0, arr:0, properties:0, units:0, tenants:0, workOrders:0 });
  const [clients, setClients] = useState<{account_id:string;company_name:string;plan_tier:string;subscription_status:string;created_at:string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(()=>{
    (async()=>{
      const {data:ud} = await supabase.auth.getUser();
      if(!ud.user){location.href="/login";return;}
      const {data:au} = await supabase.from("app_users").select("role").eq("user_id",ud.user.id).maybeSingle();
      if(au?.role !== "platform_owner"){setErr("Not authorized.");setLoading(false);return;}
      const {data:accounts} = await supabase.from("accounts").select("*").order("created_at",{ascending:false});
      const list = accounts||[];
      setClients(list);
      const PLAN_MRR:Record<string,number> = {starter:29,growth:79,pro:149,enterprise:299,basic:0};
      const active = list.filter((a:any)=>a.subscription_status==="active");
      const totalMRR = active.reduce((s:number,a:any)=>s+(a.mrr||PLAN_MRR[a.plan_tier]||0),0);
      const [{count:props},{count:units},{count:tenants},{count:wos}] = await Promise.all([
        supabase.from("properties").select("property_id",{count:"exact",head:true}),
        supabase.from("units").select("unit_id",{count:"exact",head:true}),
        supabase.from("tenants").select("tenant_id",{count:"exact",head:true}).eq("status","active"),
        supabase.from("work_orders").select("id",{count:"exact",head:true}).in("status",["new","in_progress"]),
      ]);
      setStats({clients:list.length,activeClients:active.length,mrr:totalMRR,arr:totalMRR*12,properties:props||0,units:units||0,tenants:tenants||0,workOrders:wos||0});
      setLoading(false);
    })();
  },[]);

  const PLAN_COLOR:Record<string,string> = {starter:"bg-neutral-700 text-neutral-300",growth:"bg-blue-900 text-blue-300",pro:"bg-purple-900 text-purple-300",enterprise:"bg-yellow-900 text-yellow-300",basic:"bg-neutral-700 text-neutral-400"};
  const STATUS_COLOR:Record<string,string> = {active:"text-green-400",trial:"text-yellow-400",past_due:"text-red-400",cancelled:"text-neutral-500"};

  if(loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full"/></div>;
  if(err) return <div className="p-4 bg-red-900/30 border border-red-800 rounded-xl text-red-400 text-sm">{err}</div>;

  return (
    <div>
      <div className="flex items-start justify-between mb-8">
        <div><h1 className="text-3xl font-bold text-white">Owner Console</h1><p className="text-neutral-400 mt-1">{new Date().toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"})}</p></div>
        <div className="flex items-center gap-2 bg-green-900/40 border border-green-700 rounded-xl px-3 py-2"><div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"/><span className="text-xs font-semibold text-green-400">Platform Live</span></div>
      </div>
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[{label:"MRR",value:`$${stats.mrr.toLocaleString()}`,color:"text-green-400"},{label:"ARR",value:`$${stats.arr.toLocaleString()}`,color:"text-green-300"},{label:"Total Clients",value:stats.clients,color:"text-white"},{label:"Active Clients",value:stats.activeClients,color:"text-blue-400"}].map(s=>(
          <div key={s.label} className="bg-neutral-800 border border-neutral-700 rounded-2xl p-5"><div className="text-xs text-neutral-500 mb-1">{s.label}</div><div className={`text-3xl font-bold ${s.color}`}>{s.value}</div></div>
        ))}
      </div>
      <div className="grid grid-cols-4 gap-4 mb-8">
        {[{label:"Properties",value:stats.properties},{label:"Units",value:stats.units},{label:"Active Tenants",value:stats.tenants},{label:"Open Work Orders",value:stats.workOrders}].map(s=>(
          <div key={s.label} className="bg-neutral-800 border border-neutral-700 rounded-2xl p-5"><div className="text-xs text-neutral-500 mb-1">{s.label}</div><div className="text-3xl font-bold text-white">{s.value}</div></div>
        ))}
      </div>
      <div className="bg-neutral-800 border border-neutral-700 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-5"><h2 className="text-sm font-bold text-white">Client Base</h2><Link href="/owner/clients" className="text-xs text-blue-400 hover:underline">View all →</Link></div>
        {clients.length===0 ? <div className="text-neutral-500 text-sm text-center py-8">No clients yet.</div> : (
          <div className="grid gap-2">
            {clients.slice(0,10).map((c:any)=>(
              <div key={c.account_id} className="flex items-center gap-4 py-2.5 border-b border-neutral-700/50 last:border-0">
                <div className="w-8 h-8 rounded-lg bg-neutral-700 flex items-center justify-center text-neutral-300 font-bold text-xs shrink-0">{c.company_name?.[0]||"?"}</div>
                <div className="flex-1 min-w-0"><div className="text-sm font-semibold text-white truncate">{c.company_name}</div><div className="text-xs text-neutral-500">{new Date(c.created_at).toLocaleDateString()}</div></div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${PLAN_COLOR[c.plan_tier]||PLAN_COLOR.basic}`}>{c.plan_tier||"basic"}</span>
                  <span className={`text-xs font-semibold ${STATUS_COLOR[c.subscription_status]||"text-neutral-400"}`}>{c.subscription_status||"trial"}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
