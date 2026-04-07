"use client";
export const dynamic = "force-dynamic";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type Tenant = {
  tenant_id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  status: string;
  move_in_date: string | null;
  move_out_date: string | null;
  unit_id: string | null;
};

type Lease = {
  lease_id: string;
  start_date: string | null;
  end_date: string | null;
  rent_amount: number | null;
  deposit_amount: number | null;
  status: string;
};

type Payment = {
  id: string;
  amount: number;
  method: string | null;
  status: string;
  obtained_date: string | null;
  submitted_date: string | null;
  proof_image_url: string | null;
  created_at: string;
};

type WorkOrder = {
  id: string;
  category: string;
  summary: string;
  status: string;
  urgency: string;
  created_at: string;
};

type InviteStatus = { status: string; expires_at: string; created_at: string } | null;

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-50 text-green-700 border-green-200",
  former: "bg-neutral-100 text-neutral-600 border-neutral-200",
  pending: "bg-yellow-50 text-yellow-700 border-yellow-200",
};

const PAYMENT_STATUS: Record<string, string> = {
  confirmed: "bg-green-50 text-green-700",
  pending: "bg-yellow-50 text-yellow-700",
  late: "bg-red-50 text-red-700",
  failed: "bg-red-50 text-red-700",
  partial: "bg-orange-50 text-orange-700",
};

const WO_STATUS: Record<string, string> = {
  new: "bg-blue-50 text-blue-700",
  in_progress: "bg-orange-50 text-orange-700",
  on_hold: "bg-yellow-50 text-yellow-700",
  closed: "bg-neutral-100 text-neutral-500",
};

type Tab = "profile" | "lease" | "payments" | "workorders";

function TenantProfilePageInner() {
  const { id } = useParams<{ id: string }>();
  const params = useSearchParams();
  const justInvited = params.get("invited") === "true";

  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [lease, setLease] = useState<Lease | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [invite, setInvite] = useState<InviteStatus>(null);
  const [unitInfo, setUnitInfo] = useState<{ unit_number: string | null; property_name: string } | null>(null);
  const [accountId, setAccountId] = useState("");
  const [tab, setTab] = useState<Tab>("profile");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [toast, setToast] = useState(justInvited ? "Tenant added and invite sent! ✓" : "");
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (toast) { const t = setTimeout(() => setToast(""), 4000); return () => clearTimeout(t); }
  }, [toast]);

  useEffect(() => {
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) { location.href = "/login"; return; }

      const { data: appUser } = await supabase
        .from("app_users").select("account_id").eq("user_id", userData.user.id).maybeSingle();
      if (!appUser) { setErr("Not authorized."); setLoading(false); return; }
      setAccountId(appUser.account_id);

      // Tenant
      const { data: t, error: tErr } = await supabase
        .from("tenants").select("*").eq("tenant_id", id).eq("account_id", appUser.account_id).single();
      if (tErr || !t) { setErr("Tenant not found."); setLoading(false); return; }
      setTenant(t);

      // Unit + property
      if (t.unit_id) {
        const { data: unit } = await supabase
          .from("units").select("unit_number, property_id").eq("unit_id", t.unit_id).maybeSingle();
        if (unit) {
          const { data: prop } = await supabase
            .from("properties").select("nickname, address").eq("property_id", unit.property_id).maybeSingle();
          setUnitInfo({ unit_number: unit.unit_number, property_name: prop?.nickname || prop?.address || "" });
        }
      }

      // Lease
      const { data: leases } = await supabase
        .from("leases").select("*").eq("tenant_id", id).order("created_at", { ascending: false }).limit(1);
      setLease(leases?.[0] || null);

      // Payments
      const { data: pays } = await supabase
        .from("payment_records").select("*").eq("tenant_id", id).order("created_at", { ascending: false });
      setPayments(pays || []);

      // Work orders
      const { data: wos } = await supabase
        .from("work_orders").select("*").eq("tenant_id", id).order("created_at", { ascending: false });
      setWorkOrders(wos || []);

      // Latest invite
      const { data: inv } = await supabase
        .from("tenant_invites").select("status, expires_at, created_at").eq("tenant_id", id)
        .order("created_at", { ascending: false }).limit(1).maybeSingle();
      setInvite(inv);

      setLoading(false);
    })();
  }, [id]);

  async function resendInvite() {
    if (!tenant?.email || resending) return;
    setResending(true);
    await supabase.from("tenant_invites").update({ status: "expired" }).eq("tenant_id", id).eq("status", "pending");
    const { data: inv, error } = await supabase
      .from("tenant_invites")
      .insert({ tenant_id: id, account_id: accountId, email: tenant.email })
      .select("token, expires_at, status, created_at").single();
    if (!error && inv) {
      setInvite({ status: inv.status, expires_at: inv.expires_at, created_at: inv.created_at });
      setToast(`Invite resent to ${tenant.email} ✓`);
      console.log("New invite token:", inv.token);
    }
    setResending(false);
  }

  function TabBtn({ label, t }: { label: string; t: Tab }) {
    return (
      <button onClick={() => setTab(t)}
        className={`px-4 py-2.5 text-sm font-semibold rounded-xl transition-all ${tab === t ? "bg-blue-600 text-white" : "text-neutral-600 hover:bg-neutral-100"}`}>
        {label}
      </button>
    );
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" /></div>;
  if (err || !tenant) return <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{err || "Tenant not found."}</div>;

  const inviteActive = invite?.status === "pending" && new Date(invite.expires_at) > new Date();
  const inviteAccepted = invite?.status === "accepted";
  const inviteExpired = invite && !inviteActive && !inviteAccepted;

  return (
    <div>
      {/* Back */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/client/tenants">
          <button className="w-9 h-9 flex items-center justify-center rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50 transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
        </Link>
        <div className="text-sm text-neutral-500">Tenants</div>
      </div>

      {/* Tenant Header */}
      <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-6 mb-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-purple-100 flex items-center justify-center text-purple-600 text-xl font-bold shrink-0">
              {tenant.first_name[0]}{tenant.last_name[0]}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-neutral-900">{tenant.first_name} {tenant.last_name}</h1>
                <span className={`text-xs font-medium border px-2 py-0.5 rounded-full ${STATUS_COLORS[tenant.status] || STATUS_COLORS.pending}`}>
                  {tenant.status}
                </span>
              </div>
              {unitInfo && (
                <div className="text-sm text-neutral-500 mt-1 flex items-center gap-1.5">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
                  {unitInfo.unit_number ? `Unit ${unitInfo.unit_number} · ` : ""}{unitInfo.property_name}
                </div>
              )}
              {tenant.email && <div className="text-sm text-neutral-500 mt-0.5">{tenant.email}</div>}
              {tenant.phone && <div className="text-sm text-neutral-500">{tenant.phone}</div>}
            </div>
          </div>
          <Link href={`/client/tenants/${id}/edit`}>
            <button className="flex items-center gap-1.5 border border-neutral-200 text-neutral-700 px-4 py-2 rounded-xl text-sm font-medium hover:bg-neutral-50 transition-colors">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              Edit
            </button>
          </Link>
        </div>

        {/* Invite status banner */}
        <div className="mt-5 pt-5 border-t border-neutral-100">
          {inviteAccepted && (
            <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-xl px-4 py-2.5">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
              Tenant has joined iTenant and set up their account.
            </div>
          )}
          {inviteActive && (
            <div className="flex items-center justify-between gap-3 bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-2.5">
              <div className="text-sm text-yellow-800">
                <span className="font-semibold">Invite pending</span> — sent to {tenant.email}. Expires {new Date(invite!.expires_at).toLocaleDateString()}.
              </div>
              <button onClick={resendInvite} disabled={resending}
                className="text-xs font-semibold text-yellow-800 hover:text-yellow-900 underline shrink-0">
                {resending ? "Resending..." : "Resend"}
              </button>
            </div>
          )}
          {(inviteExpired || !invite) && tenant.email && (
            <div className="flex items-center justify-between gap-3 bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-2.5">
              <div className="text-sm text-neutral-600">
                {inviteExpired ? "Invite expired. " : "No invite sent yet. "}
                Tenant has not joined the app.
              </div>
              <button onClick={resendInvite} disabled={resending}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 shrink-0">
                {resending ? "Sending..." : "Send Invite"}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-6 bg-white border border-neutral-200 rounded-2xl p-1.5 shadow-sm">
        <TabBtn label="Profile" t="profile" />
        <TabBtn label="Lease" t="lease" />
        <TabBtn label="Payments" t="payments" />
        <TabBtn label="Work Orders" t="workorders" />
      </div>

      {/* ── PROFILE TAB ───────────────────────────────────────────────── */}
      {tab === "profile" && (
        <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-6">
          <h2 className="text-sm font-bold text-neutral-700 mb-4">Tenant Details</h2>
          <div className="grid gap-4">
            {[
              { label: "Full Name", value: `${tenant.first_name} ${tenant.last_name}` },
              { label: "Email", value: tenant.email || "—" },
              { label: "Phone", value: tenant.phone || "—" },
              { label: "Status", value: tenant.status },
              { label: "Move-in Date", value: tenant.move_in_date ? new Date(tenant.move_in_date).toLocaleDateString() : "—" },
              { label: "Move-out Date", value: tenant.move_out_date ? new Date(tenant.move_out_date).toLocaleDateString() : "—" },
            ].map((r) => (
              <div key={r.label} className="flex items-center justify-between py-2 border-b border-neutral-50 last:border-0">
                <span className="text-sm text-neutral-500">{r.label}</span>
                <span className="text-sm font-medium text-neutral-900">{r.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── LEASE TAB ─────────────────────────────────────────────────── */}
      {tab === "lease" && (
        <div>
          {!lease ? (
            <div className="bg-white rounded-2xl border border-neutral-200 p-10 text-center shadow-sm">
              <p className="text-neutral-500 text-sm mb-4">No lease on file yet.</p>
              <Link href={`/client/leases/new?tenant=${id}`}>
                <button className="bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors">
                  Create Lease
                </button>
              </Link>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold text-neutral-700">Active Lease</h2>
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${lease.status === "active" ? "bg-green-50 text-green-700" : "bg-neutral-100 text-neutral-600"}`}>
                  {lease.status}
                </span>
              </div>
              <div className="grid gap-3">
                {[
                  { label: "Rent", value: lease.rent_amount ? `$${lease.rent_amount.toLocaleString()}/mo` : "—" },
                  { label: "Deposit", value: lease.deposit_amount ? `$${lease.deposit_amount.toLocaleString()}` : "—" },
                  { label: "Start Date", value: lease.start_date ? new Date(lease.start_date).toLocaleDateString() : "—" },
                  { label: "End Date", value: lease.end_date ? new Date(lease.end_date).toLocaleDateString() : "—" },
                ].map((r) => (
                  <div key={r.label} className="flex items-center justify-between py-2 border-b border-neutral-50 last:border-0">
                    <span className="text-sm text-neutral-500">{r.label}</span>
                    <span className="text-sm font-semibold text-neutral-900">{r.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── PAYMENTS TAB ──────────────────────────────────────────────── */}
      {tab === "payments" && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm text-neutral-500">{payments.length} payment record{payments.length !== 1 ? "s" : ""}</div>
            <Link href={`/client/payments/record?tenant=${id}`}>
              <button className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors">
                + Log Payment
              </button>
            </Link>
          </div>
          {payments.length === 0 ? (
            <div className="bg-white rounded-2xl border border-neutral-200 p-8 text-center shadow-sm">
              <p className="text-neutral-500 text-sm">No payment records yet.</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {payments.map((p) => (
                <div key={p.id} className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-bold text-neutral-900">${p.amount.toLocaleString()}</div>
                      <div className="text-xs text-neutral-500 mt-0.5">
                        {p.method || "Unknown method"} · {new Date(p.created_at).toLocaleDateString()}
                      </div>
                      {p.obtained_date && (
                        <div className="text-xs text-blue-600 mt-0.5">
                          MO/Check obtained: {new Date(p.obtained_date).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {p.proof_image_url && (
                        <a href={p.proof_image_url} target="_blank" rel="noopener noreferrer"
                          className="text-xs text-blue-600 border border-blue-200 bg-blue-50 px-2 py-1 rounded-lg hover:bg-blue-100">
                          View Proof
                        </a>
                      )}
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${PAYMENT_STATUS[p.status] || "bg-neutral-100 text-neutral-600"}`}>
                        {p.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── WORK ORDERS TAB ───────────────────────────────────────────── */}
      {tab === "workorders" && (
        <div>
          {workOrders.length === 0 ? (
            <div className="bg-white rounded-2xl border border-neutral-200 p-8 text-center shadow-sm">
              <p className="text-neutral-500 text-sm">No work orders for this tenant.</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {workOrders.map((w) => (
                <div key={w.id} className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-semibold text-neutral-900 text-sm">{w.summary}</div>
                      <div className="text-xs text-neutral-500 mt-0.5">{w.category} · {new Date(w.created_at).toLocaleDateString()}</div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${w.urgency === "emergency" ? "bg-red-50 text-red-600" : w.urgency === "urgent" ? "bg-yellow-50 text-yellow-700" : "bg-neutral-100 text-neutral-600"}`}>
                        {w.urgency}
                      </span>
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${WO_STATUS[w.status] || "bg-neutral-100 text-neutral-600"}`}>
                        {w.status.replace("_", " ")}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-neutral-900 text-white text-sm font-medium px-5 py-3 rounded-xl shadow-lg z-50">
          {toast}
        </div>
      )}
    </div>
  );
}

export default function TenantProfilePage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full"/></div>}>
      <TenantProfilePageInner />
    </Suspense>
  );
}
