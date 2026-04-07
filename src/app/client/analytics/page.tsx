"use client";
export const dynamic = "force-dynamic";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type KPI = { label: string; value: string; sub: string; color: string; };

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [kpis, setKpis] = useState<KPI[]>([]);
  const [occupancy, setOccupancy] = useState(0);
  const [monthlyData, setMonthlyData] = useState<{ month: string; income: number; expenses: number }[]>([]);
  const [topProperties, setTopProperties] = useState<{ name: string; units: number; occupied: number; revenue: number }[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const { data: ud } = await supabase.auth.getUser();
        if (!ud.user) { location.href = "/login"; return; }
        const { data: au } = await supabase.from("app_users").select("account_id").eq("user_id", ud.user.id).maybeSingle();
        if (!au) { setErr("Not authorized."); setLoading(false); return; }
        const acct = au.account_id;

        const [{ data: props }, { data: units }, { data: tenants }, { data: leases }, { data: payments }, { data: txs }] = await Promise.all([
          supabase.from("properties").select("property_id,nickname,address").eq("account_id", acct),
          supabase.from("units").select("unit_id,property_id,status").eq("account_id", acct),
          supabase.from("tenants").select("tenant_id").eq("account_id", acct),
          supabase.from("leases").select("lease_id,status,rent_amount").eq("account_id", acct).eq("status", "active"),
          supabase.from("payment_records").select("amount,status,created_at").eq("account_id", acct),
          supabase.from("transactions").select("type,amount,date").eq("account_id", acct),
        ]);

        const totalUnits = (units || []).length;
        const occupiedUnits = (units || []).filter(u => u.status === "occupied").length;
        const occupancyRate = totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0;
        setOccupancy(occupancyRate);

        const confirmedPayments = (payments || []).filter(p => p.status === "confirmed");
        const totalRevenue = confirmedPayments.reduce((s, p) => s + Number(p.amount), 0);
        const pendingAmount = (payments || []).filter(p => ["pending", "late"].includes(p.status)).reduce((s, p) => s + Number(p.amount), 0);
        const totalExpenses = (txs || []).filter(t => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);
        const netIncome = totalRevenue - totalExpenses;
        const mrr = (leases || []).reduce((s, l) => s + Number(l.rent_amount || 0), 0);

        setKpis([
          { label: "Total Revenue (YTD)", value: `$${totalRevenue.toLocaleString()}`, sub: `${confirmedPayments.length} payments confirmed`, color: "#059669" },
          { label: "Monthly Recurring Revenue", value: `$${mrr.toLocaleString()}`, sub: `${(leases || []).length} active leases`, color: "#7C6FCD" },
          { label: "Outstanding Rent", value: `$${pendingAmount.toLocaleString()}`, sub: "Pending + late payments", color: "#DC2626" },
          { label: "Net Income (YTD)", value: `$${netIncome.toLocaleString()}`, sub: "Revenue minus expenses", color: "#0369A1" },
          { label: "Occupancy Rate", value: `${occupancyRate}%`, sub: `${occupiedUnits} of ${totalUnits} units occupied`, color: occupancyRate >= 90 ? "#059669" : occupancyRate >= 70 ? "#B45309" : "#DC2626" },
          { label: "Total Tenants", value: String((tenants || []).length), sub: `Across ${(props || []).length} properties`, color: "#0F766E" },
        ]);

        // Monthly data — last 6 months
        const now = new Date();
        const monthly = Array.from({ length: 6 }, (_, i) => {
          const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
          const label = d.toLocaleDateString("en", { month: "short", year: "2-digit" });
          const monthInc = (txs || []).filter(t => {
            const td = new Date(t.date);
            return t.type === "income" && td.getMonth() === d.getMonth() && td.getFullYear() === d.getFullYear();
          }).reduce((s, t) => s + Number(t.amount), 0);
          const monthExp = (txs || []).filter(t => {
            const td = new Date(t.date);
            return t.type === "expense" && td.getMonth() === d.getMonth() && td.getFullYear() === d.getFullYear();
          }).reduce((s, t) => s + Number(t.amount), 0);
          // also count confirmed payments as income if no transactions
          const payInc = (payments || []).filter(p => {
            const pd = new Date(p.created_at);
            return p.status === "confirmed" && pd.getMonth() === d.getMonth() && pd.getFullYear() === d.getFullYear();
          }).reduce((s, p) => s + Number(p.amount), 0);
          return { month: label, income: monthInc || payInc, expenses: monthExp };
        });
        setMonthlyData(monthly);

        // Top properties by revenue
        const propRevenue = await Promise.all((props || []).map(async p => {
          const propUnits = (units || []).filter(u => u.property_id === p.property_id);
          const occupied = propUnits.filter(u => u.status === "occupied").length;
          const { data: propLeases } = await supabase.from("leases").select("rent_amount").eq("account_id", acct).eq("status", "active");
          const revenue = (propLeases || []).reduce((s, l) => s + Number(l.rent_amount || 0), 0);
          return { name: p.nickname || p.address || "Property", units: propUnits.length, occupied, revenue };
        }));
        setTopProperties(propRevenue.sort((a, b) => b.revenue - a.revenue).slice(0, 5));

        setLoading(false);
      } catch (e) {
        setErr("Failed to load analytics. Please try refreshing.");
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-64 gap-4">
      <div className="animate-spin w-10 h-10 border-2 border-purple-500 border-t-transparent rounded-full" />
      <div className="text-sm text-neutral-500">Loading your analytics...</div>
    </div>
  );

  if (err) return (
    <div className="flex flex-col items-center justify-center h-64 gap-4">
      <div className="text-4xl">⚠️</div>
      <div className="text-sm text-red-600 font-medium">{err}</div>
      <button onClick={() => location.reload()} className="text-sm font-semibold text-purple-600 border border-purple-200 px-4 py-2 rounded-xl hover:bg-purple-50">Try Again</button>
    </div>
  );

  const maxVal = Math.max(...monthlyData.map(m => Math.max(m.income, m.expenses)), 1);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-neutral-900">Analytics</h1>
        <p className="text-neutral-500 mt-1">Your portfolio performance at a glance</p>
      </div>

      {/* KPI GRID */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        {kpis.map(k => (
          <div key={k.label} className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-5">
            <div className="text-xs text-neutral-500 font-medium mb-1">{k.label}</div>
            <div className="text-2xl font-bold" style={{ color: k.color }}>{k.value}</div>
            <div className="text-xs text-neutral-400 mt-1">{k.sub}</div>
          </div>
        ))}
      </div>

      {/* OCCUPANCY BAR */}
      <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-6 mb-6">
        <div className="flex items-center justify-between mb-3">
          <div className="font-bold text-neutral-800">Occupancy Rate</div>
          <div className="text-2xl font-bold" style={{ color: occupancy >= 90 ? "#059669" : occupancy >= 70 ? "#B45309" : "#DC2626" }}>{occupancy}%</div>
        </div>
        <div className="h-4 bg-neutral-100 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-700" style={{
            width: `${occupancy}%`,
            background: occupancy >= 90 ? "#059669" : occupancy >= 70 ? "#B45309" : "#DC2626"
          }} />
        </div>
        <div className="flex justify-between text-xs text-neutral-400 mt-1.5">
          <span>0%</span><span>Target: 90%</span><span>100%</span>
        </div>
      </div>

      {/* REVENUE vs EXPENSES CHART */}
      <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <div className="font-bold text-neutral-800">Revenue vs Expenses (Last 6 Months)</div>
          <div className="flex items-center gap-4 text-xs font-semibold">
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-green-500" />Revenue</div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-red-400" />Expenses</div>
          </div>
        </div>
        <div className="flex items-end gap-3 h-48">
          {monthlyData.map((m, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full flex items-end gap-1 h-40">
                <div className="flex-1 rounded-t-md bg-green-500 transition-all duration-500 min-h-[2px]"
                  style={{ height: `${maxVal > 0 ? (m.income / maxVal) * 100 : 2}%`, opacity: 0.85 }}
                  title={`Revenue: $${m.income.toLocaleString()}`}
                />
                <div className="flex-1 rounded-t-md bg-red-400 transition-all duration-500 min-h-[2px]"
                  style={{ height: `${maxVal > 0 ? (m.expenses / maxVal) * 100 : 2}%`, opacity: 0.85 }}
                  title={`Expenses: $${m.expenses.toLocaleString()}`}
                />
              </div>
              <div className="text-xs text-neutral-400 font-medium">{m.month}</div>
            </div>
          ))}
        </div>
        {monthlyData.every(m => m.income === 0 && m.expenses === 0) && (
          <div className="text-center text-sm text-neutral-400 mt-4">Add transactions in Financial Hub to see data here</div>
        )}
      </div>

      {/* TOP PROPERTIES */}
      {topProperties.length > 0 && (
        <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden mb-6">
          <div className="px-6 py-4 border-b border-neutral-100">
            <div className="font-bold text-neutral-800">Properties Overview</div>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-neutral-50 text-xs text-neutral-500 uppercase tracking-wider">
                <th className="px-5 py-3 text-left">Property</th>
                <th className="px-5 py-3 text-center">Units</th>
                <th className="px-5 py-3 text-center">Occupied</th>
                <th className="px-5 py-3 text-center">Occupancy</th>
                <th className="px-5 py-3 text-right">Monthly Revenue</th>
              </tr>
            </thead>
            <tbody>
              {topProperties.map((p, i) => (
                <tr key={i} className="border-t border-neutral-50 hover:bg-neutral-50">
                  <td className="px-5 py-3 font-medium">{p.name}</td>
                  <td className="px-5 py-3 text-center text-neutral-500">{p.units}</td>
                  <td className="px-5 py-3 text-center text-neutral-500">{p.occupied}</td>
                  <td className="px-5 py-3 text-center">
                    <span className={`text-xs px-2 py-1 rounded-full font-semibold ${
                      p.units === 0 ? "bg-neutral-100 text-neutral-500" :
                      (p.occupied / p.units) >= 0.9 ? "bg-green-50 text-green-700" :
                      (p.occupied / p.units) >= 0.7 ? "bg-yellow-50 text-yellow-700" : "bg-red-50 text-red-600"
                    }`}>
                      {p.units > 0 ? `${Math.round((p.occupied / p.units) * 100)}%` : "—"}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right font-semibold text-green-600">${p.revenue.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {topProperties.length === 0 && (
        <div className="bg-white rounded-2xl border border-neutral-200 p-10 text-center shadow-sm">
          <div className="text-4xl mb-3">📊</div>
          <p className="text-neutral-500 text-sm">Add properties and tenants to see your analytics populate here.</p>
        </div>
      )}
    </div>
  );
}
