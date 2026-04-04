"use client";
export const dynamic = "force-dynamic";
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

type Property = {
  property_id: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  nickname: string | null;
  property_type: string;
  status: string;
  photo_url: string | null;
  // computed
  unit_count: number;
  occupied: number;
  vacant: number;
  open_work_orders: number;
  overdue_rent: boolean;
};

const TYPE_LABELS: Record<string, string> = {
  single_family: "Single Family",
  multi_unit: "Multi-Unit",
  apartment: "Apartment",
  commercial: "Commercial",
};

function PropertyCard({ p, onDelete }: { p: Property; onDelete: (id: string) => void }) {
  const occupancyPct = p.unit_count > 0 ? Math.round((p.occupied / p.unit_count) * 100) : 0;

  return (
    <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
      <Link href={`/client/properties/${p.property_id}`}>
        <div className="p-5 cursor-pointer">
          <div className="flex items-start gap-4">
            {/* Icon */}
            <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="4" y="2" width="16" height="20" rx="2"/>
                <path d="M9 22V12h6v10"/>
                <path d="M8 7h.01M12 7h.01M16 7h.01M8 11h.01M12 11h.01M16 11h.01"/>
              </svg>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-bold text-neutral-900 text-base leading-tight">
                    {p.nickname || p.address}
                  </div>
                  {p.nickname && (
                    <div className="text-sm text-neutral-500 mt-0.5 flex items-center gap-1">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                      {p.address}, {p.city}, {p.state} {p.zip}
                    </div>
                  )}
                  {!p.nickname && (
                    <div className="text-sm text-neutral-500 mt-0.5">
                      {p.city}, {p.state} {p.zip}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {p.overdue_rent && (
                    <span className="text-xs bg-red-50 text-red-600 border border-red-200 px-2 py-1 rounded-full font-medium">
                      Overdue
                    </span>
                  )}
                  {p.open_work_orders > 0 && (
                    <span className="text-xs bg-orange-50 text-orange-600 border border-orange-200 px-2 py-1 rounded-full font-medium">
                      {p.open_work_orders} open
                    </span>
                  )}
                  <span className="text-xs bg-neutral-100 text-neutral-600 px-2 py-1 rounded-full font-medium">
                    {TYPE_LABELS[p.property_type] || p.property_type}
                  </span>
                </div>
              </div>

              {/* Occupancy bar */}
              <div className="mt-4">
                <div className="flex justify-between text-xs text-neutral-500 mb-1.5">
                  <span>{p.occupied}/{p.unit_count} units occupied</span>
                  <span className={occupancyPct === 100 ? "text-green-600 font-semibold" : occupancyPct === 0 ? "text-neutral-400" : "text-blue-600 font-semibold"}>
                    {occupancyPct}%
                  </span>
                </div>
                <div className="w-full bg-neutral-100 rounded-full h-1.5">
                  <div
                    className={`h-1.5 rounded-full transition-all ${occupancyPct === 100 ? "bg-green-500" : "bg-blue-500"}`}
                    style={{ width: `${occupancyPct}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </Link>

      {/* Actions */}
      <div className="flex items-center gap-2 px-5 py-3 border-t border-neutral-100 bg-neutral-50">
        <Link href={`/client/properties/${p.property_id}`}>
          <button className="flex items-center gap-1.5 text-sm font-medium text-neutral-600 hover:text-neutral-900 transition-colors px-3 py-1.5 rounded-lg hover:bg-neutral-100">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            View
          </button>
        </Link>
        <Link href={`/client/properties/${p.property_id}/edit`}>
          <button className="flex items-center gap-1.5 text-sm font-medium text-neutral-600 hover:text-neutral-900 transition-colors px-3 py-1.5 rounded-lg hover:bg-neutral-100">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            Edit
          </button>
        </Link>
        <Link href={`/client/units?property=${p.property_id}`}>
          <button className="flex items-center gap-1.5 text-sm font-medium text-neutral-600 hover:text-neutral-900 transition-colors px-3 py-1.5 rounded-lg hover:bg-neutral-100">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
            Units
          </button>
        </Link>
        <div className="flex-1" />
        <button
          onClick={() => onDelete(p.property_id)}
          className="flex items-center gap-1.5 text-sm font-medium text-red-500 hover:text-red-700 transition-colors px-3 py-1.5 rounded-lg hover:bg-red-50"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
          Delete
        </button>
      </div>
    </div>
  );
}

export default function PropertiesPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) { location.href = "/login"; return; }

      const { data: appUser, error: appErr } = await supabase
        .from("app_users")
        .select("account_id, role")
        .eq("user_id", userData.user.id)
        .maybeSingle();

      if (appErr || !appUser) { setErr("Account not found."); setLoading(false); return; }
      if (!["client", "team"].includes(appUser.role)) { setErr("Not authorized."); setLoading(false); return; }

      setAccountId(appUser.account_id);
      await loadProperties(appUser.account_id);
      setLoading(false);
    })();
  }, []);

  async function loadProperties(acctId: string) {
    const { data: props, error } = await supabase
      .from("properties")
      .select("property_id, address, city, state, zip, nickname, property_type, status, photo_url")
      .eq("account_id", acctId)
      .order("created_at", { ascending: true });

    if (error) { setErr(error.message); return; }

    // Enrich with unit stats + work order counts
    const enriched: Property[] = await Promise.all(
      (props || []).map(async (p) => {
        const { data: units } = await supabase
          .from("units")
          .select("unit_id, status")
          .eq("property_id", p.property_id);

        const unit_count = units?.length ?? 0;
        const occupied = units?.filter((u) => u.status === "occupied").length ?? 0;
        const vacant = units?.filter((u) => u.status === "vacant").length ?? 0;

        const { count: openWO } = await supabase
          .from("work_orders")
          .select("id", { count: "exact", head: true })
          .eq("property_id", p.property_id)
          .in("status", ["new", "in_progress", "on_hold"]);

        const { count: overdueCount } = await supabase
          .from("payment_records")
          .select("id", { count: "exact", head: true })
          .eq("account_id", acctId)
          .eq("status", "late");

        return {
          ...p,
          unit_count,
          occupied,
          vacant,
          open_work_orders: openWO ?? 0,
          overdue_rent: (overdueCount ?? 0) > 0,
        };
      })
    );

    setProperties(enriched);
  }

  async function handleDelete(propertyId: string) {
    setDeleting(true);
    const { error } = await supabase
      .from("properties")
      .delete()
      .eq("property_id", propertyId);

    if (error) { setErr(error.message); setDeleting(false); return; }
    setProperties((prev) => prev.filter((p) => p.property_id !== propertyId));
    setDeleteConfirm(null);
    setDeleting(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900">Properties</h1>
          <p className="text-neutral-500 mt-1">Manage your rental properties</p>
        </div>
        <Link href="/client/properties/new">
          <button className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Add Property
          </button>
        </Link>
      </div>

      {err && <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{err}</div>}

      {/* Portfolio summary */}
      {properties.length > 0 && (
        <div className="grid grid-cols-4 gap-3 mb-6">
          {[
            { label: "Total Properties", value: properties.length, color: "text-blue-600" },
            { label: "Total Units", value: properties.reduce((s, p) => s + p.unit_count, 0), color: "text-neutral-900" },
            { label: "Occupied", value: properties.reduce((s, p) => s + p.occupied, 0), color: "text-green-600" },
            { label: "Vacant", value: properties.reduce((s, p) => s + p.vacant, 0), color: "text-orange-500" },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-2xl border border-neutral-200 p-4 text-center shadow-sm">
              <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-xs text-neutral-500 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {properties.length === 0 ? (
        <div className="bg-white rounded-2xl border border-neutral-200 p-12 text-center shadow-sm">
          <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-500 mx-auto mb-4">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="4" y="2" width="16" height="20" rx="2"/>
              <path d="M9 22V12h6v10"/>
              <path d="M8 7h.01M12 7h.01M16 7h.01M8 11h.01M12 11h.01M16 11h.01"/>
            </svg>
          </div>
          <h2 className="text-lg font-bold text-neutral-900">No properties yet</h2>
          <p className="text-neutral-500 text-sm mt-1 mb-6">Add your first property to get started managing your portfolio.</p>
          <Link href="/client/properties/new">
            <button className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors mx-auto">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Add Your First Property
            </button>
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {properties.map((p) => (
            <PropertyCard
              key={p.property_id}
              p={p}
              onDelete={(id) => setDeleteConfirm(id)}
            />
          ))}
        </div>
      )}

      {/* Delete confirm modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl border border-neutral-200 p-6 max-w-sm w-full shadow-xl">
            <h3 className="text-lg font-bold text-neutral-900">Delete Property?</h3>
            <p className="text-sm text-neutral-500 mt-2">
              This will permanently delete the property and all associated units. Tenant records and documents will be preserved. This cannot be undone.
            </p>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 border border-neutral-200 text-neutral-700 px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-neutral-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                disabled={deleting}
                className="flex-1 bg-red-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
