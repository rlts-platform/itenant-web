"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type Unit = {
  unit_id: string;
  unit_number: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  sqft: number | null;
  rent_amount: number | null;
  deposit_amount: number | null;
  status: string;
  property_id: string;
  property_name: string;
  tenant_name?: string;
  tenant_id?: string;
  open_work_orders: number;
};

const STATUS_COLOR: Record<string, string> = {
  occupied: "bg-green-50 text-green-700 border-green-200",
  vacant: "bg-neutral-100 text-neutral-600 border-neutral-200",
  maintenance: "bg-orange-50 text-orange-700 border-orange-200",
};
const STATUS_DOT: Record<string, string> = {
  occupied: "bg-green-500", vacant: "bg-neutral-300", maintenance: "bg-orange-400",
};

export default function UnitsPage() {
  const params = useSearchParams();
  const filterProperty = params.get("property");
  const [units, setUnits] = useState<Unit[]>([]);
  const [accountId, setAccountId] = useState("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all"|"occupied"|"vacant"|"maintenance">("all");
  const [deleteConfirm, setDeleteConfirm] = useState<string|null>(null);

  useEffect(() => {
    (async () => {
      const { data: ud } = await supabase.auth.getUser();
      if (!ud.user) { location.href = "/login"; return; }
      const { data: au } = await supabase.from("app_users").select("account_id").eq("user_id", ud.user.id).maybeSingle();
      if (!au) { setErr("Not authorized."); setLoading(false); return; }
      setAccountId(au.account_id);

      let q = supabase.from("units").select("*").eq("account_id", au.account_id);
      if (filterProperty) q = q.eq("property_id", filterProperty);
      const { data: rawUnits } = await q.order("unit_number");

      const enriched: Unit[] = await Promise.all((rawUnits || []).map(async (u) => {
        const { data: prop } = await supabase.from("properties").select("nickname,address").eq("property_id", u.property_id).maybeSingle();
        const { data: tenant } = await supabase.from("tenants").select("tenant_id,first_name,last_name").eq("unit_id", u.unit_id).eq("status","active").maybeSingle();
        const { count: openWO } = await supabase.from("work_orders").select("id",{count:"exact",head:true}).eq("unit_id",u.unit_id).in("status",["new","in_progress","on_hold"]);
        return { ...u, property_name: prop?.nickname || prop?.address || "", tenant_name: tenant ? `${tenant.first_name} ${tenant.last_name}` : undefined, tenant_id: tenant?.tenant_id, open_work_orders: openWO ?? 0 };
      }));
      setUnits(enriched);
      setLoading(false);
    })();
  }, [filterProperty]);

  const filtered = useMemo(() => units.filter(u => {
    const sOk = statusFilter === "all" || u.status === statusFilter;
    const search = q.trim().toLowerCase();
    const qOk = !search || (u.unit_number||"").toLowerCase().includes(search) || u.property_name.toLowerCase().includes(search) || (u.tenant_name||"").toLowerCase().includes(search);
    return sOk && qOk;
  }), [units, statusFilter, q]);

  async function handleDelete(unitId: string) {
    await supabase.from("units").delete().eq("unit_id", unitId);
    setUnits(p => p.filter(u => u.unit_id !== unitId));
    setDeleteConfirm(null);
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full"/></div>;

  return (
    <div>
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900">Units</h1>
          <p className="text-neutral-500 mt-1">Manage rental units across your properties</p>
        </div>
        <Link href={`/client/units/new${filterProperty ? `?property=${filterProperty}` : ""}`}>
          <button className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add Unit
          </button>
        </Link>
      </div>
      {err && <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{err}</div>}

      {/* Summary */}
      {units.length > 0 && (
        <div className="grid grid-cols-4 gap-3 mb-6">
          {[
            {label:"Total Units", value: units.length, color:"text-neutral-900"},
            {label:"Occupied", value: units.filter(u=>u.status==="occupied").length, color:"text-green-600"},
            {label:"Vacant", value: units.filter(u=>u.status==="vacant").length, color:"text-orange-500"},
            {label:"Monthly Income", value: `$${units.filter(u=>u.status==="occupied").reduce((s,u)=>s+(u.rent_amount||0),0).toLocaleString()}`, color:"text-blue-600"},
          ].map(s=>(
            <div key={s.label} className="bg-white rounded-2xl border border-neutral-200 p-4 text-center shadow-sm">
              <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-xs text-neutral-500 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Search + filter */}
      {units.length > 0 && (
        <div className="flex gap-3 mb-6">
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-neutral-200 bg-white text-sm outline-none focus:ring-2 focus:ring-blue-500/20" placeholder="Search units..." value={q} onChange={e=>setQ(e.target.value)}/>
          </div>
          <div className="flex gap-1 bg-white border border-neutral-200 rounded-xl p-1">
            {(["all","occupied","vacant","maintenance"] as const).map(f=>(
              <button key={f} onClick={()=>setStatusFilter(f)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${statusFilter===f?"bg-blue-600 text-white":"text-neutral-600 hover:bg-neutral-50"}`}>{f}</button>
            ))}
          </div>
        </div>
      )}

      {units.length === 0 ? (
        <div className="bg-white rounded-2xl border border-neutral-200 p-12 text-center shadow-sm">
          <div className="w-16 h-16 bg-green-50 rounded-2xl flex items-center justify-center text-green-500 mx-auto mb-4">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
          </div>
          <h2 className="text-lg font-bold text-neutral-900">No units yet</h2>
          <p className="text-neutral-500 text-sm mt-1 mb-6">Add units to your properties to start managing tenants.</p>
          <Link href="/client/units/new"><button className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 mx-auto">+ Add Unit</button></Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {filtered.map(u => (
            <div key={u.unit_id} className="bg-white rounded-2xl border border-neutral-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
              <div className="p-5 flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-green-50 flex items-center justify-center text-green-600 shrink-0">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <div className="font-bold text-neutral-900">{u.unit_number ? `Unit ${u.unit_number}` : "Unnamed Unit"}</div>
                    <div className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[u.status]||"bg-neutral-300"}`}/>
                    <span className={`text-xs font-medium border px-2 py-0.5 rounded-full ${STATUS_COLOR[u.status]||STATUS_COLOR.vacant}`}>{u.status}</span>
                    {u.open_work_orders > 0 && <span className="text-xs bg-orange-50 text-orange-600 border border-orange-200 px-2 py-0.5 rounded-full">{u.open_work_orders} open</span>}
                  </div>
                  <div className="text-sm text-neutral-500 mt-0.5">{u.property_name}</div>
                  <div className="flex items-center gap-4 mt-1.5 text-xs text-neutral-500">
                    {u.bedrooms && <span>{u.bedrooms} bed</span>}
                    {u.bathrooms && <span>{u.bathrooms} bath</span>}
                    {u.sqft && <span>{u.sqft.toLocaleString()} sqft</span>}
                    {u.rent_amount && <span className="text-green-600 font-semibold">${u.rent_amount.toLocaleString()}/mo</span>}
                  </div>
                  {u.tenant_name && (
                    <div className="flex items-center gap-1.5 mt-1.5 text-xs text-blue-600">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                      <Link href={`/client/tenants/${u.tenant_id}`} className="hover:underline">{u.tenant_name}</Link>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Link href={`/client/units/${u.unit_id}`}><button className="text-xs border border-neutral-200 px-3 py-1.5 rounded-lg hover:bg-neutral-50 font-medium">View</button></Link>
                  <Link href={`/client/units/${u.unit_id}/edit`}><button className="text-xs border border-neutral-200 px-3 py-1.5 rounded-lg hover:bg-neutral-50 font-medium">Edit</button></Link>
                  <button onClick={()=>setDeleteConfirm(u.unit_id)} className="text-xs text-red-500 border border-red-100 px-3 py-1.5 rounded-lg hover:bg-red-50 font-medium">Delete</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl border border-neutral-200">
            <h3 className="font-bold text-neutral-900">Delete Unit?</h3>
            <p className="text-sm text-neutral-500 mt-2">This cannot be undone. Tenant and lease records will be preserved.</p>
            <div className="flex gap-3 mt-5">
              <button onClick={()=>setDeleteConfirm(null)} className="flex-1 border border-neutral-200 px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-neutral-50">Cancel</button>
              <button onClick={()=>handleDelete(deleteConfirm)} className="flex-1 bg-red-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-red-700">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
