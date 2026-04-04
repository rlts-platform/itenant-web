"use client";
export const dynamic = "force-dynamic";
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

// ─── Types ──────────────────────────────────────────────────────────────────
type Stats = {
  properties: number;
  units: number;
  occupied: number;
  vacant: number;
  tenants: number;
  openWorkOrders: number;
  overdueRent: number;
  collectedThisMonth: number;
  expectedThisMonth: number;
  expensesThisMonth: number;
};

type AlertItem = {
  id: string;
  type: "overdue" | "lease_expiring" | "work_order" | "message";
  message: string;
  link: string;
};

type ActivityItem = {
  id: string;
  label: string;
  time: string;
  type: "payment" | "work_order" | "document" | "message" | "lease";
};

// ─── Onboarding steps ───────────────────────────────────────────────────────
const ONBOARDING_STEPS = [
  { key: "property", label: "Add your first property", href: "/client/properties", desc: "Start by adding the properties you manage" },
  { key: "unit", label: "Add your first unit", href: "/client/units", desc: "Break properties into individual rentable units" },
  { key: "tenant", label: "Add your first tenant", href: "/client/tenants", desc: "Add tenants — they'll get an invite automatically" },
  { key: "payment", label: "Set up payments", href: "/client/payments", desc: "Connect payment methods and configure rent collection" },
];

// ─── Stat Card ───────────────────────────────────────────────────────────────
function StatCard({
  label, value, icon, color, href,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  href?: string;
}) {
  const inner = (
    <div className="bg-white rounded-2xl border border-neutral-200 p-5 flex items-center justify-between shadow-sm hover:shadow-md transition-shadow">
      <div>
        <div className="text-sm text-neutral-500 font-medium mb-1">{label}</div>
        <div className="text-3xl font-bold text-neutral-900 tracking-tight">{value}</div>
      </div>
      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white shrink-0 ${color}`}>
        {icon}
      </div>
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

// ─── Alert Item ──────────────────────────────────────────────────────────────
function AlertBadge({ item }: { item: AlertItem }) {
  const colors: Record<string, string> = {
    overdue: "bg-red-50 border-red-200 text-red-700",
    lease_expiring: "bg-yellow-50 border-yellow-200 text-yellow-800",
    work_order: "bg-orange-50 border-orange-200 text-orange-700",
    message: "bg-blue-50 border-blue-200 text-blue-700",
  };
  return (
    <Link href={item.link}>
      <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium ${colors[item.type]}`}>
        <span className="w-2 h-2 rounded-full bg-current shrink-0" />
        {item.message}
      </div>
    </Link>
  );
}

// ─── Quick Action ────────────────────────────────────────────────────────────
function QuickAction({ label, href, icon, color }: { label: string; href: string; icon: React.ReactNode; color: string }) {
  return (
    <Link href={href}>
      <div className="bg-white border border-neutral-200 rounded-2xl p-4 flex flex-col items-center gap-2 text-center hover:shadow-md transition-shadow cursor-pointer">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-white ${color}`}>
          {icon}
        </div>
        <span className="text-xs font-semibold text-neutral-700">{label}</span>
      </div>
    </Link>
  );
}

// ─── Main Dashboard ──────────────────────────────────────────────────────────
export default function ClientDashboard() {
  const [userName, setUserName] = useState("there");
  const [accountName, setAccountName] = useState("");
  const [stats, setStats] = useState<Stats | null>(null);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [isNewAccount, setIsNewAccount] = useState(false);
  const [onboardingDone, setOnboardingDone] = useState<Record<string, boolean>>({});
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) { location.href = "/login"; return; }

      const name = userData.user.user_metadata?.full_name || userData.user.email?.split("@")[0] || "there";
      setUserName(name);

      // Get account
      const { data: appUser, error: appErr } = await supabase
        .from("app_users")
        .select("account_id, role")
        .eq("user_id", userData.user.id)
        .maybeSingle();

      if (appErr) { setErr(appErr.message); setLoading(false); return; }
      if (!appUser || !["client", "team"].includes(appUser.role)) {
        setErr("Not authorized."); setLoading(false); return;
      }

      const accountId = appUser.account_id;

      // Account name
      const { data: acct } = await supabase
        .from("accounts")
        .select("company_name")
        .eq("account_id", accountId)
        .maybeSingle();
      setAccountName(acct?.company_name || "");

      // Properties
      const { data: props } = await supabase
        .from("properties")
        .select("property_id")
        .eq("account_id", accountId);

      const propCount = props?.length ?? 0;

      if (propCount === 0) {
        setIsNewAccount(true);
        setLoading(false);
        return;
      }

      // Units
      const { data: units } = await supabase
        .from("units")
        .select("unit_id, status")
        .eq("account_id", accountId);

      const unitCount = units?.length ?? 0;
      const occupied = units?.filter((u) => u.status === "occupied").length ?? 0;
      const vacant = units?.filter((u) => u.status === "vacant").length ?? 0;

      // Tenants
      const { count: tenantCount } = await supabase
        .from("tenants")
        .select("tenant_id", { count: "exact", head: true })
        .eq("account_id", accountId)
        .eq("status", "active");

      // Work orders
      const { count: openWO } = await supabase
        .from("work_orders")
        .select("id", { count: "exact", head: true })
        .eq("account_id", accountId)
        .in("status", ["new", "in_progress", "on_hold"]);

      // Payments this month
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);

      const { data: payments } = await supabase
        .from("payment_records")
        .select("amount, status")
        .eq("account_id", accountId)
        .gte("created_at", monthStart.toISOString());

      const collected = payments?.filter((p) => p.status === "confirmed")
        .reduce((sum, p) => sum + Number(p.amount), 0) ?? 0;
      const overdue = payments?.filter((p) => p.status === "late").length ?? 0;

      // Expected = sum of all active lease rent amounts
      const { data: leases } = await supabase
        .from("leases")
        .select("rent_amount")
        .eq("account_id", accountId)
        .eq("status", "active");
      const expected = leases?.reduce((sum, l) => sum + Number(l.rent_amount), 0) ?? 0;

      // Expenses this month
      const { data: expenses } = await supabase
        .from("transactions")
        .select("amount")
        .eq("account_id", accountId)
        .eq("type", "expense")
        .gte("date", monthStart.toISOString().split("T")[0]);
      const totalExpenses = expenses?.reduce((sum, e) => sum + Number(e.amount), 0) ?? 0;

      setStats({
        properties: propCount,
        units: unitCount,
        occupied,
        vacant,
        tenants: tenantCount ?? 0,
        openWorkOrders: openWO ?? 0,
        overdueRent: overdue,
        collectedThisMonth: collected,
        expectedThisMonth: expected,
        expensesThisMonth: totalExpenses,
      });

      // Alerts: leases expiring in 30 days
      const in30 = new Date();
      in30.setDate(in30.getDate() + 30);
      const { data: expiringLeases } = await supabase
        .from("leases")
        .select("lease_id, tenant_id")
        .eq("account_id", accountId)
        .eq("status", "active")
        .lte("end_date", in30.toISOString().split("T")[0]);

      const builtAlerts: AlertItem[] = [];
      if (overdue > 0) builtAlerts.push({ id: "overdue", type: "overdue", message: `${overdue} overdue rent payment${overdue > 1 ? "s" : ""}`, link: "/client/payments" });
      if ((expiringLeases?.length ?? 0) > 0) builtAlerts.push({ id: "leases", type: "lease_expiring", message: `${expiringLeases!.length} lease${expiringLeases!.length > 1 ? "s" : ""} expiring within 30 days`, link: "/client/leases" });
      if ((openWO ?? 0) > 0) builtAlerts.push({ id: "wo", type: "work_order", message: `${openWO} open maintenance request${(openWO ?? 0) > 1 ? "s" : ""}`, link: "/client/maintenance" });
      setAlerts(builtAlerts);

      // Onboarding check for existing accounts
      setOnboardingDone({
        property: propCount > 0,
        unit: unitCount > 0,
        tenant: (tenantCount ?? 0) > 0,
        payment: collected > 0,
      });

      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (err) {
    return <div className="mt-8 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{err}</div>;
  }

  const netCashFlow = (stats?.collectedThisMonth ?? 0) - (stats?.expensesThisMonth ?? 0);
  const collectionRate = stats && stats.expectedThisMonth > 0
    ? Math.round((stats.collectedThisMonth / stats.expectedThisMonth) * 100)
    : 0;

  // ── ONBOARDING VIEW (new account) ──────────────────────────────────────────
  if (isNewAccount) {
    return (
      <div>
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-neutral-900">Welcome to iTenant{accountName ? `, ${accountName}` : ""}! 👋</h1>
          <p className="text-neutral-500 mt-1">Let's get your account set up. Follow the steps below to get started.</p>
        </div>

        <div className="grid gap-4">
          {ONBOARDING_STEPS.map((step, i) => (
            <Link key={step.key} href={step.href}>
              <div className="bg-white border border-neutral-200 rounded-2xl p-5 flex items-center gap-4 hover:shadow-md transition-shadow">
                <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm shrink-0">
                  {i + 1}
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-neutral-900">{step.label}</div>
                  <div className="text-sm text-neutral-500 mt-0.5">{step.desc}</div>
                </div>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-neutral-400 shrink-0">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-2xl p-5 text-sm text-blue-800">
          <strong>Tip:</strong> When you add a tenant and create their lease, iTenant automatically sends them an invite to set up their account. No manual steps needed.
        </div>
      </div>
    );
  }

  // ── LIVE DASHBOARD VIEW ────────────────────────────────────────────────────
  return (
    <div>
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900">Welcome back, {userName} 👋</h1>
          <p className="text-neutral-500 mt-1">Here's what's happening with your properties today</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/client/maintenance/new">
            <button className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              New Work Order
            </button>
          </Link>
        </div>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="mb-6 grid gap-2">
          {alerts.map((a) => <AlertBadge key={a.id} item={a} />)}
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <StatCard
          label="Properties"
          value={stats!.properties}
          href="/client/properties"
          color="bg-blue-500"
          icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="4" y="2" width="16" height="20" rx="2"/><path d="M9 22V12h6v10"/><path d="M8 7h.01M12 7h.01M16 7h.01"/></svg>}
        />
        <StatCard
          label="Units"
          value={stats!.units}
          href="/client/units"
          color="bg-green-500"
          icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>}
        />
        <StatCard
          label="Tenants"
          value={stats!.tenants}
          href="/client/tenants"
          color="bg-purple-500"
          icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>}
        />
        <StatCard
          label="Open Maintenance"
          value={stats!.openWorkOrders}
          href="/client/maintenance"
          color="bg-orange-500"
          icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>}
        />
      </div>

      {/* Occupancy + Financial Row */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {/* Occupancy */}
        <div className="bg-white rounded-2xl border border-neutral-200 p-5 shadow-sm">
          <div className="text-sm font-semibold text-neutral-500 mb-3">Occupancy</div>
          <div className="flex items-end gap-1 mb-3">
            <span className="text-3xl font-bold text-neutral-900">{stats!.occupied}</span>
            <span className="text-neutral-400 text-sm mb-1">/ {stats!.units} units</span>
          </div>
          <div className="w-full bg-neutral-100 rounded-full h-2">
            <div
              className="bg-green-500 h-2 rounded-full transition-all"
              style={{ width: stats!.units > 0 ? `${(stats!.occupied / stats!.units) * 100}%` : "0%" }}
            />
          </div>
          <div className="flex justify-between text-xs text-neutral-500 mt-2">
            <span className="text-green-600 font-medium">{stats!.occupied} occupied</span>
            <span className="text-neutral-400">{stats!.vacant} vacant</span>
          </div>
        </div>

        {/* Rent Collection */}
        <div className="bg-white rounded-2xl border border-neutral-200 p-5 shadow-sm">
          <div className="text-sm font-semibold text-neutral-500 mb-3">Rent Collection</div>
          <div className="flex items-end gap-1 mb-1">
            <span className="text-3xl font-bold text-green-600">${stats!.collectedThisMonth.toLocaleString()}</span>
          </div>
          <div className="text-xs text-neutral-400 mb-3">of ${stats!.expectedThisMonth.toLocaleString()} expected</div>
          <div className="w-full bg-neutral-100 rounded-full h-2">
            <div
              className="bg-green-500 h-2 rounded-full transition-all"
              style={{ width: `${Math.min(collectionRate, 100)}%` }}
            />
          </div>
          <div className="text-xs text-neutral-500 mt-2">{collectionRate}% collected this month</div>
        </div>
      </div>

      {/* Financial Snapshot */}
      <div className="bg-white rounded-2xl border border-neutral-200 p-5 shadow-sm mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="text-sm font-semibold text-neutral-700">Financial Snapshot — This Month</div>
          <Link href="/client/financials" className="text-xs text-blue-600 font-semibold hover:underline">View Full Hub →</Link>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-xs text-neutral-500 mb-1">Income</div>
            <div className="text-xl font-bold text-green-600">${stats!.collectedThisMonth.toLocaleString()}</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-neutral-500 mb-1">Expenses</div>
            <div className="text-xl font-bold text-red-500">${stats!.expensesThisMonth.toLocaleString()}</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-neutral-500 mb-1">Net Cash Flow</div>
            <div className={`text-xl font-bold ${netCashFlow >= 0 ? "text-green-600" : "text-red-500"}`}>
              {netCashFlow >= 0 ? "+" : ""}${netCashFlow.toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mb-6">
        <div className="text-sm font-semibold text-neutral-700 mb-3">Quick Actions</div>
        <div className="grid grid-cols-4 gap-3">
          <QuickAction label="Add Property" href="/client/properties/new" color="bg-blue-500"
            icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>}
          />
          <QuickAction label="Add Tenant" href="/client/tenants/new" color="bg-purple-500"
            icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>}
          />
          <QuickAction label="Work Order" href="/client/maintenance/new" color="bg-orange-500"
            icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>}
          />
          <QuickAction label="Send Message" href="/client/messages" color="bg-green-500"
            icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>}
          />
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-2xl border border-neutral-200 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="text-sm font-semibold text-neutral-700">Recent Activity</div>
        </div>
        {activity.length === 0 ? (
          <div className="text-sm text-neutral-400 py-6 text-center">Activity will appear here as things happen across your account.</div>
        ) : (
          <div className="grid gap-3">
            {activity.map((a) => (
              <div key={a.id} className="flex items-center gap-3 text-sm">
                <span className="w-2 h-2 rounded-full bg-blue-400 shrink-0" />
                <span className="text-neutral-700 flex-1">{a.label}</span>
                <span className="text-neutral-400 text-xs shrink-0">{a.time}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
