"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

const PROPERTY_TYPES = [
  { value: "single_family", label: "Single Family Home" },
  { value: "multi_unit", label: "Multi-Unit Building" },
  { value: "apartment", label: "Apartment Complex" },
  { value: "commercial", label: "Commercial" },
];

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
  "VA","WA","WV","WI","WY","DC",
];

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-neutral-600 mb-1.5">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

const inputClass = "w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all";
const selectClass = inputClass + " cursor-pointer";

export default function NewPropertyPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    nickname: "",
    address: "",
    city: "",
    state: "DE",
    zip: "",
    property_type: "single_family",
    notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  function set(key: string, val: string) {
    setForm((prev) => ({ ...prev, [key]: val }));
  }

  async function handleSubmit() {
    setErr("");
    if (!form.address.trim()) { setErr("Address is required."); return; }
    if (!form.city.trim()) { setErr("City is required."); return; }
    if (!form.zip.trim()) { setErr("ZIP code is required."); return; }

    setSaving(true);

    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) { location.href = "/login"; return; }

    const { data: appUser, error: appErr } = await supabase
      .from("app_users")
      .select("account_id")
      .eq("user_id", userData.user.id)
      .maybeSingle();

    if (appErr || !appUser) { setErr("Account not found."); setSaving(false); return; }

    const { data: newProp, error } = await supabase
      .from("properties")
      .insert({
        account_id: appUser.account_id,
        address: form.address.trim(),
        city: form.city.trim(),
        state: form.state,
        zip: form.zip.trim(),
        nickname: form.nickname.trim() || null,
        property_type: form.property_type,
        notes: form.notes.trim() || null,
        status: "active",
      })
      .select("property_id")
      .single();

    if (error) { setErr(error.message); setSaving(false); return; }

    router.push(`/client/properties/${newProp.property_id}`);
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link href="/client/properties">
          <button className="w-9 h-9 flex items-center justify-center rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50 transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-neutral-900">Add Property</h1>
          <p className="text-neutral-500 mt-0.5">Add a new rental property to your portfolio</p>
        </div>
      </div>

      <div className="max-w-2xl">
        {err && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
            {err}
          </div>
        )}

        <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
          {/* Section: Basic Info */}
          <div className="px-6 py-5 border-b border-neutral-100">
            <h2 className="text-sm font-bold text-neutral-700 uppercase tracking-wider">Property Info</h2>
          </div>
          <div className="px-6 py-5 grid gap-4">
            <Field label="Property Nickname (optional)">
              <input
                className={inputClass}
                placeholder="e.g. Kings Court Townhomes"
                value={form.nickname}
                onChange={(e) => set("nickname", e.target.value)}
              />
            </Field>

            <Field label="Property Type" required>
              <select
                className={selectClass}
                value={form.property_type}
                onChange={(e) => set("property_type", e.target.value)}
              >
                {PROPERTY_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </Field>
          </div>

          {/* Section: Address */}
          <div className="px-6 py-5 border-t border-neutral-100">
            <div className="px-0 pb-4">
              <h2 className="text-sm font-bold text-neutral-700 uppercase tracking-wider">Address</h2>
            </div>
            <div className="grid gap-4">
              <Field label="Street Address" required>
                <input
                  className={inputClass}
                  placeholder="1120 Crown Blvd"
                  value={form.address}
                  onChange={(e) => set("address", e.target.value)}
                />
              </Field>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <Field label="City" required>
                    <input
                      className={inputClass}
                      placeholder="Dover"
                      value={form.city}
                      onChange={(e) => set("city", e.target.value)}
                    />
                  </Field>
                </div>
                <div>
                  <Field label="State" required>
                    <select
                      className={selectClass}
                      value={form.state}
                      onChange={(e) => set("state", e.target.value)}
                    >
                      {US_STATES.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </Field>
                </div>
                <div>
                  <Field label="ZIP Code" required>
                    <input
                      className={inputClass}
                      placeholder="19901"
                      value={form.zip}
                      onChange={(e) => set("zip", e.target.value)}
                      maxLength={10}
                    />
                  </Field>
                </div>
              </div>
            </div>
          </div>

          {/* Section: Notes */}
          <div className="px-6 py-5 border-t border-neutral-100">
            <div className="pb-4">
              <h2 className="text-sm font-bold text-neutral-700 uppercase tracking-wider">Notes</h2>
            </div>
            <Field label="Internal Notes (optional)">
              <textarea
                className={inputClass + " resize-none"}
                rows={3}
                placeholder="Any notes about this property..."
                value={form.notes}
                onChange={(e) => set("notes", e.target.value)}
              />
            </Field>
          </div>

          {/* Actions */}
          <div className="px-6 py-4 bg-neutral-50 border-t border-neutral-100 flex items-center justify-between gap-3">
            <Link href="/client/properties">
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
                <>
                  <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
                  Add Property
                </>
              )}
            </button>
          </div>
        </div>

        <p className="text-xs text-neutral-400 text-center mt-4">
          After adding the property, you can add units, upload documents, and track maintenance history.
        </p>
      </div>
    </div>
  );
}
