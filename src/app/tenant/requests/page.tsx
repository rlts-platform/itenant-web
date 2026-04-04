"use client";
export const dynamic = "force-dynamic";
import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { PageHeader } from "@/components/ui/PageHeader";
import { TenantNav } from "@/components/ui/TenantNav";

type Row = {
  id: string;
  category: string;
  status: string;
  urgency: string;
  summary: string;
  created_at: string;
};

function toneForUrgency(u: string) {
  if (u === "emergency") return "red";
  if (u === "urgent") return "yellow";
  return "neutral";
}

export default function TenantRequests() {
  const [rows, setRows] = useState<Row[]>([]);
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return (location.href = "/login");

      const { data: appUser, error: appErr } = await supabase
        .from("app_users")
        .select("user_type, tenant_id")
        .eq("user_id", userData.user.id)
        .single();

      if (appErr) return setErr(appErr.message);
      if (appUser?.user_type !== "tenant") return setErr("Not authorized.");

      const { data, error } = await supabase
        .from("work_orders")
        .select("id, category, status, urgency, summary, created_at")
        .eq("tenant_id", appUser.tenant_id)
        .order("created_at", { ascending: false });

      if (error) return setErr(error.message);
      setRows((data || []) as Row[]);
    })();
  }, []);

  return (
    <div className="pb-24">
      <div className="mx-auto max-w-3xl px-6 pt-10">
        <PageHeader
          title="Service Requests"
          subtitle="View and submit maintenance requests"
          right={
            <Link href="/tenant/requests/new">
              <Button>+ Add new request</Button>
            </Link>
          }
        />
        {err ? <div className="mt-4 text-sm text-red-600">{err}</div> : null}

        <div className="mt-6 grid gap-4">
          {rows.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-sm text-neutral-600">
                No requests yet.
              </CardContent>
            </Card>
          ) : (
            rows.map((r) => (
              <Card key={r.id}>
                <CardHeader className="items-center justify-between">
                  <CardTitle className="flex flex-wrap items-center gap-2">
                    {r.category}
                    <Badge tone={toneForUrgency(r.urgency)}>{r.urgency}</Badge>
                    <Badge tone="blue">{r.status}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-neutral-700">{r.summary}</div>
                  <div className="mt-2 text-xs text-neutral-500">
                    {new Date(r.created_at).toLocaleString()}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      <TenantNav />
    </div>
  );
}
