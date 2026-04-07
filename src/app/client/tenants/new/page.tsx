"use client";
export const dynamic = "force-dynamic";
import { useEffect, useState } from "react";
import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

const inputClass = "w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all";
const selectClass = inputClass + " cursor-pointer";

function Field({ label, required, hint, children }: { label: string; required?: boolean; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-neutral-600 mb-1.5">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-neutral-400 mt-1">{hint}</p>}
    </div>
  );
}

type Property = { property_id: string; nickname: string | null; address: string };
type Unit = { unit_id: string; unit_number: string | null; status: string; rent_amount: number | null };

function NewTenantPageInner() {
  const router = useRouter();
  const params = useSearchParams();
  const prefillUnit = params.get("unit");

  const [accountId, setAccountId] = useState("");
  const [properties, setProperties] = useState<Property[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    property_id: "",
    unit_id: prefillUnit || "",
    move_in_date: "",
    send_invite: true,
  });

  function set(key: string, val: string | boolean) {
    setForm((prev) => ({ ...prev, [key]: val }));
  }

  useEffect(() => {
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) { location.href = "/login"; return; }

      const { data: appUser } = await supabase
        .from("app_users")
        .select("account_id")
        .eq("user_id", userData.user.id)
        .maybeSingle();

      if (!appUser) return;
      setAccountId(appUser.account_id);

      const { data: props } = await supabase
        .from("properties")
        .select("property_id, nickname, address")
        .eq("account_id", appUser.account_id)
        .order("created_at");
      setProperties(props || []);
    })();
  }, []);

  // Load units when property changes
  useEffect(() => {
    if (!form.property_id) { setUnits([]); return; }
    (async () => {
      const { data } = await supabase
        .from("units")
        .select("unit_id, unit_number, status, rent_amount")
        .eq("property_id", form.property_id)
        .order("unit_number");
      setUnits(data || []);
    })();
  }, [form.property_id]);

  async function handleSubmit() {
    setErr("");
    if (!form.first_name.trim()) { setErr("First name is required."); return; }
    if (!form.last_name.trim()) { setErr("Last name is required."); return; }
    if (!form.email.trim()) { setErr("Email is required to send the invite."); return; }
    if (!form.unit_id) { setErr("Please select a unit."); return; }

    setSaving(true);

    // 1. Create tenant record
    const { data: tenant, error: tenantErr } = await supabase
      .from("tenants")
      .insert({
        account_id: accountId,
        unit_id: form.unit_id,
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim() || null,
        move_in_date: form.move_in_date || null,
        status: "pending",
      })
      .select("tenant_id")
      .single();

    if (tenantErr) { setErr(tenantErr.message); setSaving(false); return; }

    // 2. Flip unit to occupied
    await supabase
      .from("units")
      .update({ status: "occupied" })
      .eq("unit_id", form.unit_id);

    // 3. Create invite token
    if (form.send_invite) {
      const { data: invite, error: inviteErr } = await supabase
        .from("tenant_invites")
        .insert({
          tenant_id: tenant.tenant_id,
          account_id: accountId,
          email: form.email.trim().toLowerCase(),
        })
        .select("token")
        .single();

      if (!inviteErr && invite) {
        // TODO: Call Resend edge function to email invite
        // For now log token — edge function will handle email
        console.log("Invite link:", `${window.location.origin}/invite/${invite.token}`);
      }
    }

    router.push(`/client/tenants/${tenant.tenant_id}?invited=${form.send_invite}`);
  }

  const selectedUnit = units.find((u) => u.unit_id === form.unit_id);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link href="/client/tenants">
          <button className="w-9 h-9 flex items-center justify-center rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50 transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-neutral-900">Add Tenant</h1>
          <p className="text-neutral-500 mt-0.5">Create a tenant profile and send them an invite</p>
        </div>
      </div>

      <div className="max-w-2xl">
        {err && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{err}</div>
        )}

        {/* How it works banner */}
        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-2xl p-4 flex gap-3">
          <svg className="text-blue-500 shrink-0 mt-0.5" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <div className="text-sm text-blue-800">
            <strong>How it works:</strong> Fill in the tenant's info below. When you save, iTenant will automatically create their profile, mark the unit as occupied, and send them an invite link so they can create their login. The invite expires in 14 business days.
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">

          {/* Personal Info */}
          <div className="px-6 py-4 border-b border-neutral-100 bg-neutral-50">
            <h2 className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Personal Info</h2>
          </div>
          <div className="px-6 py-5 grid gap-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="First Name" required>
                <input className={inputClass} placeholder="Daniel" value={form.first_name} onChange={(e) => set("first_name", e.target.value)} />
              </Field>
              <Field label="Last Name" required>
                <input className={inputClass} placeholder="Carter" value={form.last_name} onChange={(e) => set("last_name", e.target.value)} />
              </Field>
            </div>
            <Field label="Email Address" required hint="The invite will be sent to this address">
              <input className={inputClass} type="email" placeholder="daniel.carter@email.com" value={form.email} onChange={(e) => set("email", e.target.value)} />
            </Field>
            <Field label="Phone Number">
              <input className={inputClass} type="tel" placeholder="302-555-0101" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
            </Field>
          </div>

          {/* Property + Unit */}
          <div className="px-6 py-4 border-t border-neutral-100 bg-neutral-50">
            <h2 className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Property & Unit</h2>
          </div>
          <div className="px-6 py-5 grid gap-4">
            <Field label="Property" required>
              <select
                className={selectClass}
                value={form.property_id}
                onChange={(e) => { set("property_id", e.target.value); set("unit_id", ""); }}
              >
                <option value="">Select a property...</option>
                {properties.map((p) => (
                  <option key={p.property_id} value={p.property_id}>
                    {p.nickname || p.address}
                  </option>
                ))}
              </select>
            </Field>

            {form.property_id && (
              <Field label="Unit" required>
                <select
                  className={selectClass}
                  value={form.unit_id}
                  onChange={(e) => set("unit_id", e.target.value)}
                >
                  <option value="">Select a unit...</option>
                  {units.map((u) => (
                    <option
                      key={u.unit_id}
                      value={u.unit_id}
                      disabled={u.status === "occupied"}
                    >
                      {u.unit_number ? `Unit ${u.unit_number}` : "Unnamed Unit"}
                      {u.rent_amount ? ` — $${u.rent_amount.toLocaleString()}/mo` : ""}
                      {u.status === "occupied" ? " (Occupied)" : ""}
                    </option>
                  ))}
                </select>
                {units.length === 0 && (
                  <p className="text-xs text-orange-600 mt-1">No units found for this property. <Link href={`/client/units/new?property=${form.property_id}`} className="underline">Add a unit first.</Link></p>
                )}
              </Field>
            )}

            {/* Selected unit preview */}
            {selectedUnit && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-sm text-green-800">
                ✓ Unit will be marked as <strong>occupied</strong> once the tenant is added.
                {selectedUnit.rent_amount && (
                  <span className="ml-1">Rent: <strong>${selectedUnit.rent_amount.toLocaleString()}/mo</strong></span>
                )}
              </div>
            )}

            <Field label="Move-in Date">
              <input className={inputClass} type="date" value={form.move_in_date} onChange={(e) => set("move_in_date", e.target.value)} />
            </Field>
          </div>

          {/* Invite Toggle */}
          <div className="px-6 py-4 border-t border-neutral-100 bg-neutral-50">
            <h2 className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Invite Settings</h2>
          </div>
          <div className="px-6 py-5">
            <div className="flex items-start gap-4 p-4 bg-white border border-neutral-200 rounded-xl">
              <div className="pt-0.5">
                <button
                  type="button"
                  onClick={() => set("send_invite", !form.send_invite)}
                  className={`w-11 h-6 rounded-full transition-colors relative ${form.send_invite ? "bg-blue-600" : "bg-neutral-200"}`}
                >
                  <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-all ${form.send_invite ? "left-5" : "left-0.5"}`} />
                </button>
              </div>
              <div>
                <div className="font-semibold text-sm text-neutral-900">Send invite email automatically</div>
                <div className="text-xs text-neutral-500 mt-0.5">
                  {form.send_invite
                    ? "An invite will be sent to the tenant's email right away. The link expires in 14 business days."
                    : "No invite will be sent now. You can send it later from the tenant's profile."}
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="px-6 py-4 bg-neutral-50 border-t border-neutral-100 flex items-center justify-between gap-3">
            <Link href="/client/tenants">
              <button className="border border-neutral-200 bg-white text-neutral-700 px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-neutral-50 transition-colors">
                Cancel
              </button>
            </Link>
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {saving ? (
                <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />Saving...</>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
                  {form.send_invite ? "Add Tenant & Send Invite" : "Add Tenant"}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function NewTenantPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full"/></div>}>
      <NewTenantPageInner />
    </Suspense>
  );
}
