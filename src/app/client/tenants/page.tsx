"use client";
export const dynamic = "force-dynamic";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

type Tenant = {
  tenant_id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  status: string;
  move_in_date: string | null;
  unit_number: string | null;
  property_nickname: string | null;
  property_address: string | null;
  invite_status: "accepted" | "pending" | "expired" | "none";
};

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-50 text-green-700 border-green-200",
  former: "bg-neutral-100 text-neutral-500 border-neutral-200",
  pending: "bg-yellow-50 text-yellow-700 border-yellow-200",
};

const INVITE_COLORS: Record<string, string> = {
  accepted: "text-green-600",
  pending: "text-yellow-600",
  expired: "text-red-500",
  none: "text-neutral-400",
};

const INVITE_LABELS: Record<string, string> = {
  accepted: "✓ Joined",
  pending: "⏳ Invite sent",
  expired: "⚠ Invite expired",
  none: "Not invited",
};

function TenantCard({ t, onResend }: { t: Tenant; onResend: (id: string) => void }) {
  return (
    <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
      <Link href={`/client/tenants/${t.tenant_id}`}>
        <div className="p-5 cursor-pointer">
          <div className="flex items-start gap-4">
            {/* Avatar */}
            <div className="w-11 h-11 rounded-xl bg-purple-100 flex items-center justify-center text-purple-600 font-bold text-sm shrink-0">
              {t.first_name[0]}{t.last_name[0]}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <div className="font-bold text-neutral-900">{t.first_name} {t.last_name}</div>
                <span className={`text-xs font-medium border px-2 py-0.5 rounded-full ${STATUS_COLORS[t.status] || STATUS_COLORS.pending}`}>
                  {t.status}
                </span>
              </div>

              {/* Unit */}
              {(t.unit_number || t.property_nickname || t.property_address) && (
                <div className="flex items-center gap-1.5 text-sm text-neutral-500 mt-1">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                  </svg>
                  {t.unit_number ? `Unit ${t.unit_number} · ` : ""}
                  {t.property_nickname || t.property_address}
                </div>
              )}

              {/* Contact */}
              <div className="flex items-center gap-4 mt-2">
                {t.email && (
                  <div className="flex items-center gap-1 text-xs text-neutral-500">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                      <polyline points="22,6 12,13 2,6"/>
                    </svg>
                    {t.email}
                  </div>
                )}
                {t.phone && (
                  <div className="flex items-center gap-1 text-xs text-neutral-500">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.99 12 19.79 19.79 0 0 1 1.86 3.45 2 2 0 0 1 3.84 1.27h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9a16 16 0 0 0 6.91 6.91l1-1a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
                    </svg>
                    {t.phone}
                  </div>
                )}
              </div>

              {/* Move in */}
              {t.move_in_date && (
                <div className="text-xs text-neutral-400 mt-1.5">
                  Moved in {new Date(t.move_in_date).toLocaleDateString()}
                </div>
              )}
            </div>
          </div>
        </div>
      </Link>

      {/* Actions */}
      <div className="flex items-center gap-2 px-5 py-3 border-t border-neutral-100 bg-neutral-50">
        <span className={`text-xs font-medium ${INVITE_COLORS[t.invite_status]}`}>
          {INVITE_LABELS[t.invite_status]}
        </span>
        <div className="flex-1" />
        {(t.invite_status === "none" || t.invite_status === "expired") && t.email && (
          <button
            onClick={() => onResend(t.tenant_id)}
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors"
          >
            Send Invite
          </button>
        )}
        {t.invite_status === "pending" && (
          <button
            onClick={() => onResend(t.tenant_id)}
            className="text-xs font-semibold text-neutral-600 hover:text-neutral-900 px-3 py-1.5 rounded-lg hover:bg-neutral-100 transition-colors"
          >
            Resend
          </button>
        )}
        <Link href={`/client/tenants/${t.tenant_id}`}>
          <button className="text-xs font-semibold text-neutral-600 hover:text-neutral-900 px-3 py-1.5 rounded-lg hover:bg-neutral-100 transition-colors">
            View Profile
          </button>
        </Link>
      </div>
    </div>
  );
}

export default function TenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [accountId, setAccountId] = useState("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [toast, setToast] = useState("");
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "former" | "pending">("all");

  useEffect(() => {
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) { location.href = "/login"; return; }

      const { data: appUser } = await supabase
        .from("app_users")
        .select("account_id, role")
        .eq("user_id", userData.user.id)
        .maybeSingle();

      if (!appUser || !["client", "team"].includes(appUser.role)) {
        setErr("Not authorized."); setLoading(false); return;
      }
      setAccountId(appUser.account_id);
      await load(appUser.account_id);
      setLoading(false);
    })();
  }, []);

  async function load(acctId: string) {
    const { data: rows, error } = await supabase
      .from("tenants")
      .select("tenant_id, first_name, last_name, email, phone, status, move_in_date, unit_id")
      .eq("account_id", acctId)
      .order("created_at", { ascending: false });

    if (error) { setErr(error.message); return; }

    const enriched: Tenant[] = await Promise.all(
      (rows || []).map(async (t) => {
        // Get unit + property info
        let unit_number = null, property_nickname = null, property_address = null;
        if (t.unit_id) {
          const { data: unit } = await supabase
            .from("units")
            .select("unit_number, property_id")
            .eq("unit_id", t.unit_id)
            .maybeSingle();
          if (unit) {
            unit_number = unit.unit_number;
            const { data: prop } = await supabase
              .from("properties")
              .select("nickname, address")
              .eq("property_id", unit.property_id)
              .maybeSingle();
            property_nickname = prop?.nickname || null;
            property_address = prop?.address || null;
          }
        }

        // Get latest invite status
        const { data: invite } = await supabase
          .from("tenant_invites")
          .select("status, expires_at")
          .eq("tenant_id", t.tenant_id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        let invite_status: Tenant["invite_status"] = "none";
        if (invite) {
          if (invite.status === "accepted") invite_status = "accepted";
          else if (invite.status === "pending" && new Date(invite.expires_at) > new Date()) invite_status = "pending";
          else invite_status = "expired";
        }

        return { ...t, unit_number, property_nickname, property_address, invite_status };
      })
    );

    setTenants(enriched);
  }

  async function sendInvite(tenantId: string) {
    const tenant = tenants.find((t) => t.tenant_id === tenantId);
    if (!tenant?.email) return;

    // Expire old pending invites
    await supabase
      .from("tenant_invites")
      .update({ status: "expired" })
      .eq("tenant_id", tenantId)
      .eq("status", "pending");

    // Create new invite
    const { data: invite, error } = await supabase
      .from("tenant_invites")
      .insert({ tenant_id: tenantId, account_id: accountId, email: tenant.email })
      .select("token")
      .single();

    if (error) { setErr(error.message); return; }

    // Update local state
    setTenants((prev) =>
      prev.map((t) => t.tenant_id === tenantId ? { ...t, invite_status: "pending" } : t)
    );

    showToast(`Invite sent to ${tenant.email}`);

    // TODO: Trigger Resend email with invite.token
    console.log("Invite token:", invite.token);
  }

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 3500);
  }

  const filtered = useMemo(() => {
    return tenants.filter((t) => {
      const statusOk = filter === "all" || t.status === filter;
      const search = q.trim().toLowerCase();
      const searchOk = !search ||
        `${t.first_name} ${t.last_name}`.toLowerCase().includes(search) ||
        (t.email || "").toLowerCase().includes(search) ||
        (t.phone || "").includes(search) ||
        (t.unit_number || "").toLowerCase().includes(search);
      return statusOk && searchOk;
    });
  }, [tenants, filter, q]);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
    </div>
  );

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900">Tenants</h1>
          <p className="text-neutral-500 mt-1">Manage your tenants and their information</p>
        </div>
        <Link href="/client/tenants/new">
          <button className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Add Tenant
          </button>
        </Link>
      </div>

      {err && <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{err}</div>}

      {/* Stats row */}
      {tenants.length > 0 && (
        <div className="grid grid-cols-4 gap-3 mb-6">
          {[
            { label: "Total", value: tenants.length, color: "text-neutral-900" },
            { label: "Active", value: tenants.filter(t => t.status === "active").length, color: "text-green-600" },
            { label: "Joined App", value: tenants.filter(t => t.invite_status === "accepted").length, color: "text-blue-600" },
            { label: "Invite Pending", value: tenants.filter(t => t.invite_status === "pending").length, color: "text-yellow-600" },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-2xl border border-neutral-200 p-4 text-center shadow-sm">
              <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-xs text-neutral-500 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Search + Filter */}
      {tenants.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-neutral-200 bg-white text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
              placeholder="Search by name, email, phone, unit..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <div className="flex gap-1.5 bg-white border border-neutral-200 rounded-xl p-1">
            {(["all", "active", "former", "pending"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all capitalize ${
                  filter === f ? "bg-blue-600 text-white" : "text-neutral-600 hover:bg-neutral-50"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {tenants.length === 0 ? (
        <div className="bg-white rounded-2xl border border-neutral-200 p-12 text-center shadow-sm">
          <div className="w-16 h-16 bg-purple-50 rounded-2xl flex items-center justify-center text-purple-500 mx-auto mb-4">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          </div>
          <h2 className="text-lg font-bold text-neutral-900">No tenants yet</h2>
          <p className="text-neutral-500 text-sm mt-1 mb-6 max-w-sm mx-auto">
            Add your first tenant. When you add them and create their lease, they automatically receive an invite to set up their account.
          </p>
          <Link href="/client/tenants/new">
            <button className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors mx-auto">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Add First Tenant
            </button>
          </Link>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-neutral-200 p-8 text-center shadow-sm">
          <p className="text-neutral-500 text-sm">No tenants match your search.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filtered.map((t) => (
            <TenantCard key={t.tenant_id} t={t} onResend={sendInvite} />
          ))}
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-neutral-900 text-white text-sm font-medium px-5 py-3 rounded-xl shadow-lg z-50 animate-in">
          {toast}
        </div>
      )}
    </div>
  );
}
