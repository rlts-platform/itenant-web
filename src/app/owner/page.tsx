"use client";
export const dynamic = "force-dynamic";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Row = {
  account_id: string;
  company_name: string;
  pm_owner_name: string;
  pm_owner_email: string;
  pm_owner_phone: string | null;
  plan_tier: string;
  status: string;
  property_count: number;
  unit_count: number;
  tenant_count: number;
  error_30d: number;
};

export default function OwnerDashboard() {
  const [rows, setRows] = useState<Row[]>([]);
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        location.href = "/login";
        return;
      }

      const { data: appUser, error: appErr } = await supabase
        .from("app_users")
        .select("user_type")
        .eq("user_id", userData.user.id)
        .maybeSingle();

      if (appErr) return setErr(appErr.message);
      if (appUser?.user_type !== "platform_owner") return setErr("Not authorized.");

      const { data, error } = await supabase
        .from("owner_account_directory")
        .select(
          "account_id,company_name,pm_owner_name,pm_owner_email,pm_owner_phone,plan_tier,status,property_count,unit_count,tenant_count,error_30d"
        )
        .order("company_name", { ascending: true });

      if (error) setErr(error.message);
      setRows((data as Row[]) ?? []);
    })();
  }, []);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-semibold">Owner Control Panel</h1>
      {err && <div className="mt-4 p-3 border rounded">{err}</div>}

      <div className="mt-6 grid gap-3">
        {rows.map((r) => (
          <div key={r.account_id} className="p-4 border rounded">
            <div className="font-semibold">{r.company_name}</div>
            <div className="text-sm opacity-80">
              Owner: {r.pm_owner_name} • {r.pm_owner_email}
              {r.pm_owner_phone ? ` • ${r.pm_owner_phone}` : ""}
            </div>
            <div className="mt-2 flex flex-wrap gap-2 text-sm">
              <span className="border rounded px-2 py-1">Plan: {r.plan_tier}</span>
              <span className="border rounded px-2 py-1">Status: {r.status}</span>
              <span className="border rounded px-2 py-1">Props: {r.property_count}</span>
              <span className="border rounded px-2 py-1">Units: {r.unit_count}</span>
              <span className="border rounded px-2 py-1">Tenants: {r.tenant_count}</span>
              <span className="border rounded px-2 py-1">Errors 30d: {r.error_30d}</span>
            </div>
          </div>
        ))}

        {rows.length === 0 && !err && (
          <div className="p-4 border rounded">No accounts yet. Seed a demo account next.</div>
        )}
      </div>
    </div>
  );
}
