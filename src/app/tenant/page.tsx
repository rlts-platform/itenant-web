"use client";
export const dynamic = "force-dynamic";
import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { TenantNav } from "@/components/ui/TenantNav";

export default function TenantDashboard() {
  const [balance, setBalance] = useState<number>(0);
  const [inProgress, setInProgress] = useState<number>(0);
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
        .select("user_type, tenant_id")
        .eq("user_id", userData.user.id)
        .single();

      if (appErr) return setErr(appErr.message);
      if (appUser?.user_type !== "tenant") return setErr("Not authorized.");

      const { count } = await supabase
        .from("work_orders")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", appUser.tenant_id)
        .in("status", ["new", "in_progress", "on_hold"]);

      setInProgress(count || 0);
      setBalance(0);
    })();
  }, []);

  return (
    <div className="pb-24">
      <div className="mx-auto max-w-3xl px-6 pt-10">
        <PageHeader title="My Dashboard" subtitle="Quick actions and current status" />
        {err ? <div className="mt-4 text-sm text-red-600">{err}</div> : null}

        <div className="mt-6 grid gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Current Balance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end justify-between gap-4">
                <div className="text-5xl font-semibold tracking-tight">${balance.toFixed(2)}</div>
                <Link href="/tenant/payments">
                  <Button variant="outline">Go to Payment Center</Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Work Orders</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end justify-between gap-4">
                <div>
                  <div className="text-sm text-neutral-600">In progress</div>
                  <div className="text-5xl font-semibold tracking-tight">{inProgress}</div>
                </div>
                <Link href="/tenant/requests">
                  <Button variant="outline">Go to Service Requests</Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Need something fixed?</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-between gap-4">
              <div className="text-sm text-neutral-600">
                Submit a request in under 60 seconds.
              </div>
              <Link href="/tenant/requests/new">
                <Button>New Request</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>

      <TenantNav />
    </div>
  );
}
