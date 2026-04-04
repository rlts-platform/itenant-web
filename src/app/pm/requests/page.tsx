"use client";
export const dynamic = "force-dynamic";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";

type Row = {
  id: string;
  category: string;
  status: string;
  urgency: string;
  summary: string;
  created_at: string;
  tenant_id: string;
};

function toneForUrgency(u: string) {
  if (u === "emergency") return "red";
  if (u === "urgent") return "yellow";
  return "neutral";
}

export default function PMRequestsInbox() {
  const [rows, setRows] = useState<Row[]>([]);
  const [err, setErr] = useState("");
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "new" | "in_progress" | "on_hold" | "closed">("all");

  useEffect(() => {
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return (location.href = "/login");

      const { data: appUser, error: appErr } = await supabase
        .from("app_users")
        .select("user_type, account_id")
        .eq("user_id", userData.user.id)
        .single();

      if (appErr) return setErr(appErr.message);
      if (!["pm", "team"].includes(appUser?.user_type)) return setErr("Not authorized.");

      const { data, error } = await supabase
        .from("work_orders")
        .select("id, category, status, urgency, summary, created_at, tenant_id")
        .eq("account_id", appUser.account_id)
        .order("created_at", { ascending: false });

      if (error) return setErr(error.message);
      setRows((data || []) as Row[]);
    })();
  }, []);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    return rows.filter((r) => {
      const statusOk = filter === "all" ? true : r.status === filter;
      const qOk = !t
        ? true
        : (r.summary || "").toLowerCase().includes(t) ||
          (r.category || "").toLowerCase().includes(t) ||
          (r.urgency || "").toLowerCase().includes(t);
      return statusOk && qOk;
    });
  }, [rows, q, filter]);

  return (
    <div className="mx-auto max-w-4xl px-6 pt-10 pb-10">
      <PageHeader
        title="Requests Inbox"
        subtitle="All tenant maintenance requests for your account"
        right={<a href="/pm/settings"><Button variant="outline">Settings</Button></a>}
      />
      {err ? <div className="mt-4 text-sm text-red-600">{err}</div> : null}

      <div className="mt-6 grid gap-3">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search (category, urgency, summary)..." />

        <div className="flex flex-wrap gap-2">
          {(["all","new","in_progress","on_hold","closed"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={
                "rounded-xl px-3 py-2 text-xs font-semibold border " +
                (filter === s ? "bg-black text-white border-black" : "bg-white border-neutral-200 text-neutral-700 hover:bg-neutral-50")
              }
            >
              {s === "all" ? "All" : s.replace("_", " ")}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-sm text-neutral-600">
              No matching requests.
            </CardContent>
          </Card>
        ) : (
          filtered.map((r) => (
            <Card key={r.id}>
              <CardHeader className="items-center justify-between">
                <CardTitle className="flex flex-wrap items-center gap-2">
                  {r.category}
                  <Badge tone={toneForUrgency(r.urgency)}>{r.urgency}</Badge>
                  <Badge tone="blue">{r.status}</Badge>
                </CardTitle>
                <div className="text-xs text-neutral-500">{new Date(r.created_at).toLocaleString()}</div>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-neutral-800">{r.summary}</div>
                <div className="mt-3 flex gap-2">
                  <Button
                    variant="outline"
                    onClick={async () => {
                      const next = r.status === "new" ? "in_progress" : r.status;
                      const { error } = await supabase.from("work_orders").update({ status: next }).eq("id", r.id);
                      if (error) return setErr(error.message);
                      setRows((prev) => prev.map((x) => (x.id === r.id ? { ...x, status: next } : x)));
                    }}
                  >
                    Mark in progress
                  </Button>

                  <Button
                    variant="outline"
                    onClick={async () => {
                      const { error } = await supabase.from("work_orders").update({ status: "closed" }).eq("id", r.id);
                      if (error) return setErr(error.message);
                      setRows((prev) => prev.map((x) => (x.id === r.id ? { ...x, status: "closed" } : x)));
                    }}
                  >
                    Close
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
