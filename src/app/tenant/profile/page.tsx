"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { TenantNav } from "@/components/ui/TenantNav";

export default function TenantProfilePage() {
  const [tenant, setTenant] = useState<{ first_name: string; last_name: string; email: string | null; phone: string | null; move_in_date: string | null; status: string } | null>(null);
  const [unit, setUnit] = useState<{ unit_number: string | null; rent_amount: number | null } | null>(null);
  const [property, setProperty] = useState<{ nickname: string | null; address: string; city: string; state: string } | null>(null);
  const [lease, setLease] = useState<{ start_date: string | null; end_date: string | null; rent_amount: number | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [tenantId, setTenantId] = useState("");

  useEffect(() => {
    (async () => {
      const { data: ud } = await supabase.auth.getUser();
      if (!ud.user) { location.href = "/login"; return; }
      const { data: au } = await supabase.from("app_users").select("tenant_id,role").eq("user_id", ud.user.id).maybeSingle();
      if (!au || au.role !== "tenant" || !au.tenant_id) { location.href = "/tenant"; return; }
      setTenantId(au.tenant_id);
      const { data: t } = await supabase.from("tenants").select("*").eq("tenant_id", au.tenant_id).single();
      if (t) { setTenant(t); setEditPhone(t.phone || ""); }
      if (t?.unit_id) {
        const { data: u } = await supabase.from("units").select("unit_number,rent_amount,property_id").eq("unit_id", t.unit_id).maybeSingle();
        if (u) { setUnit(u); const { data: p } = await supabase.from("properties").select("nickname,address,city,state").eq("property_id", u.property_id).maybeSingle(); if (p) setProperty(p); }
      }
      const { data: l } = await supabase.from("leases").select("start_date,end_date,rent_amount").eq("tenant_id", au.tenant_id).eq("status","active").maybeSingle();
      setLease(l);
      setLoading(false);
    })();
  }, []);

  async function savePhone() {
    setSaving(true);
    await supabase.from("tenants").update({ phone: editPhone }).eq("tenant_id", tenantId);
    setTenant(prev => prev ? { ...prev, phone: editPhone } : prev);
    setToast("Phone updated ✓"); setTimeout(() => setToast(""), 3000); setSaving(false);
  }

  async function signOut() { await supabase.auth.signOut(); location.href = "/login"; }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" /></div>;

  return (
    <div className="pb-24">
      <div className="mx-auto max-w-3xl px-6 pt-10">
        <div className="mb-8"><h1 className="text-3xl font-bold text-neutral-900">My Profile</h1><p className="text-neutral-500 mt-1">Your account and tenancy information</p></div>

        {/* Avatar + name */}
        <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-6 mb-4 flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-purple-100 flex items-center justify-center text-purple-600 font-bold text-xl shrink-0">{tenant?.first_name?.[0]}{tenant?.last_name?.[0]}</div>
          <div><h2 className="text-xl font-bold text-neutral-900">{tenant?.first_name} {tenant?.last_name}</h2><div className="text-sm text-neutral-500 mt-0.5">{tenant?.email}</div><span className="text-xs bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded-full font-medium mt-1 inline-block capitalize">{tenant?.status}</span></div>
        </div>

        {/* Unit info */}
        {(unit || property) && (
          <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-5 mb-4">
            <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-3">My Unit</h3>
            <div className="grid gap-2">
              {property && <div className="flex justify-between text-sm"><span className="text-neutral-500">Property</span><span className="font-medium text-neutral-900">{property.nickname || property.address}</span></div>}
              {property && <div className="flex justify-between text-sm"><span className="text-neutral-500">Address</span><span className="font-medium text-neutral-900">{property.address}, {property.city}, {property.state}</span></div>}
              {unit?.unit_number && <div className="flex justify-between text-sm"><span className="text-neutral-500">Unit</span><span className="font-medium text-neutral-900">{unit.unit_number}</span></div>}
              {tenant?.move_in_date && <div className="flex justify-between text-sm"><span className="text-neutral-500">Move-in</span><span className="font-medium text-neutral-900">{new Date(tenant.move_in_date).toLocaleDateString()}</span></div>}
            </div>
          </div>
        )}

        {/* Lease info */}
        {lease && (
          <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-5 mb-4">
            <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-3">My Lease</h3>
            <div className="grid gap-2">
              {lease.rent_amount && <div className="flex justify-between text-sm"><span className="text-neutral-500">Monthly Rent</span><span className="font-bold text-green-600">${lease.rent_amount.toLocaleString()}</span></div>}
              {lease.start_date && <div className="flex justify-between text-sm"><span className="text-neutral-500">Start Date</span><span className="font-medium text-neutral-900">{new Date(lease.start_date).toLocaleDateString()}</span></div>}
              {lease.end_date && <div className="flex justify-between text-sm"><span className="text-neutral-500">End Date</span><span className="font-medium text-neutral-900">{new Date(lease.end_date).toLocaleDateString()}</span></div>}
            </div>
          </div>
        )}

        {/* Editable info */}
        <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-5 mb-4">
          <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-3">Contact Info</h3>
          <div className="grid gap-3">
            <div className="flex justify-between text-sm py-2 border-b border-neutral-50"><span className="text-neutral-500">Email</span><span className="font-medium text-neutral-900">{tenant?.email}</span></div>
            <div>
              <label className="block text-xs font-semibold text-neutral-600 mb-1.5">Phone Number</label>
              <div className="flex gap-2"><input className="flex-1 rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/20" value={editPhone} onChange={e => setEditPhone(e.target.value)} placeholder="Your phone number" /><button onClick={savePhone} disabled={saving} className="bg-blue-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50">{saving ? "..." : "Save"}</button></div>
            </div>
          </div>
        </div>

        {/* Sign out */}
        <button onClick={signOut} className="w-full border border-red-200 text-red-600 px-5 py-3 rounded-2xl text-sm font-semibold hover:bg-red-50 transition-colors">Sign Out</button>
      </div>
      {toast && <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-neutral-900 text-white text-sm font-medium px-5 py-3 rounded-xl shadow-lg z-50">{toast}</div>}
      <TenantNav />
    </div>
  );
}
