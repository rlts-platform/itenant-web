"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import { TenantNav } from "@/components/ui/TenantNav";

type AppUser = {
  user_type: string;
  tenant_id: string | null;
  account_id: string | null;
};

const CATEGORIES = [
  "Appliance",
  "Doors and locks",
  "Electrical and lighting",
  "Flooring",
  "General",
  "Heating and cooling",
  "Plumbing and bath",
  "Safety equipment",
  "Preventative maintenance",
];

export default function NewTenantRequest() {
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  // Chat-toggle (OFF by default; PM can enable later)
  const [chatEnabled, setChatEnabled] = useState(false);

  // Form mode
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [summary, setSummary] = useState("");
  const [permissionToEnter, setPermissionToEnter] = useState<"yes" | "call" | "">("");
  const [entryNotes, setEntryNotes] = useState("");

  // Chat mode
  const [messages, setMessages] = useState<{ role: "system" | "user"; text: string }[]>([
    { role: "system", text: "Tell me what’s wrong and where it is (example: kitchen sink leaking)." },
  ]);
  const [chatInput, setChatInput] = useState("");

  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const tenantId = useMemo(() => appUser?.tenant_id ?? null, [appUser]);
  const accountId = useMemo(() => appUser?.account_id ?? null, [appUser]);

  useEffect(() => {
    (async () => {
      setErr("");
      setOk("");

      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        location.href = "/login";
        return;
      }

      const { data: au, error: auErr } = await supabase
        .from("app_users")
        .select("user_type, tenant_id, account_id")
        .eq("user_id", userData.user.id)
        .maybeSingle();

      if (auErr) {
        setErr(auErr.message);
        return;
      }
      if (!au) {
        setErr("No app user record found for this login yet.");
        return;
      }
      if (au.user_type !== "tenant") {
        setErr("Not authorized (tenant only).");
        return;
      }

      setAppUser(au as AppUser);

      // OPTIONAL: load chat enabled flag (safe fallback OFF)
      // We’ll wire this to PM settings later. For now, keep it safe:
      try {
        // If you already created an RPC, put its name here.
        // Example: const { data } = await supabase.rpc("tenant_chat_intake_enabled", { p_account_id: au.account_id });
        // setChatEnabled(!!data);
        setChatEnabled(false);
      } catch {
        setChatEnabled(false);
      }
    })();
  }, []);

  async function submitRequest(payload: {
    category: string;
    summary: string;
    permission_to_enter: string | null;
    entry_notes: string | null;
  }) {
    setErr("");
    setOk("");

    if (!tenantId || !accountId) {
      setErr("Missing tenant/account link.");
      return;
    }
    if (!payload.summary.trim()) {
      setErr("Please describe the issue.");
      return;
    }

    const { error } = await supabase.from("work_orders").insert({
      account_id: accountId,
      tenant_id: tenantId,
      category: payload.category,
      summary: payload.summary.trim(),
      status: "new",
      urgency: "normal",
      permission_to_enter: payload.permission_to_enter,
      entry_notes: payload.entry_notes,
    });

    if (error) {
      setErr(error.message);
      return;
    }

    setOk("Request submitted.");
    setSummary("");
    setEntryNotes("");
    setPermissionToEnter("");
    setMessages([{ role: "system", text: "Submitted. If you have another issue, describe it." }]);
    setChatInput("");
  }

  return (
    <div className="pb-24">
      <div className="mx-auto max-w-3xl px-6 pt-10">
        <PageHeader
          title="New Request"
          subtitle={chatEnabled ? "Chat-style intake" : "Quick form"}
          right={
            <Link href="/tenant/requests">
              <Button variant="outline">Back</Button>
            </Link>
          }
        />

        {err ? <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{err}</div> : null}
        {ok ? <div className="mt-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">{ok}</div> : null}

        <div className="mt-6 grid gap-4">
          {chatEnabled ? (
            <Card>
              <CardHeader>
                <CardTitle>Chat Intake</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
                  <div className="space-y-3">
                    {messages.map((m, idx) => (
                      <div key={idx} className={m.role === "user" ? "text-right" : ""}>
                        <div
                          className={
                            "inline-block max-w-[90%] rounded-2xl px-4 py-3 text-sm " +
                            (m.role === "user"
                              ? "bg-black text-white"
                              : "bg-white border border-neutral-200 text-neutral-800")
                          }
                        >
                          {m.text}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 flex gap-2">
                    <Input
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder="Type details..."
                    />
                    <Button
                      onClick={() => {
                        const text = chatInput.trim();
                        if (!text) return;
                        setMessages((prev) => [...prev, { role: "user", text }]);
                        setChatInput("");
                        // Minimal “intake”: we just use the latest message as the summary
                        setSummary(text);
                      }}
                    >
                      Send
                    </Button>
                  </div>

                  <div className="mt-4">
                    <Button
                      className="w-full"
                      onClick={() =>
                        submitRequest({
                          category,
                          summary,
                          permission_to_enter: permissionToEnter || null,
                          entry_notes: entryNotes || null,
                        })
                      }
                    >
                      Submit Request
                    </Button>
                  </div>
                </div>

                <div className="mt-4 grid gap-3">
                  <div className="text-xs font-semibold text-neutral-600">Category</div>
                  <select
                    className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>

                  <div className="text-xs font-semibold text-neutral-600">Permission to enter</div>
                  <div className="flex gap-2">
                    <button
                      className={
                        "flex-1 rounded-xl border px-4 py-3 text-sm font-semibold " +
                        (permissionToEnter === "yes" ? "bg-black text-white border-black" : "bg-white border-neutral-200")
                      }
                      onClick={() => setPermissionToEnter("yes")}
                      type="button"
                    >
                      Yes
                    </button>
                    <button
                      className={
                        "flex-1 rounded-xl border px-4 py-3 text-sm font-semibold " +
                        (permissionToEnter === "call" ? "bg-black text-white border-black" : "bg-white border-neutral-200")
                      }
                      onClick={() => setPermissionToEnter("call")}
                      type="button"
                    >
                      Call to set appointment
                    </button>
                  </div>

                  <div className="text-xs font-semibold text-neutral-600">Entry notes</div>
                  <Textarea
                    value={entryNotes}
                    onChange={(e) => setEntryNotes(e.target.value)}
                    placeholder="Gate code, pets, best times, etc."
                  />
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Request Details</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div>
                  <div className="mb-2 text-xs font-semibold text-neutral-600">Category</div>
                  <select
                    className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="mb-2 text-xs font-semibold text-neutral-600">What’s wrong?</div>
                  <Textarea
                    value={summary}
                    onChange={(e) => setSummary(e.target.value)}
                    placeholder="Describe the issue..."
                  />
                </div>

                <div>
                  <div className="mb-2 text-xs font-semibold text-neutral-600">Permission to enter</div>
                  <div className="flex gap-2">
                    <button
                      className={
                        "flex-1 rounded-xl border px-4 py-3 text-sm font-semibold " +
                        (permissionToEnter === "yes" ? "bg-black text-white border-black" : "bg-white border-neutral-200")
                      }
                      onClick={() => setPermissionToEnter("yes")}
                      type="button"
                    >
                      Yes
                    </button>
                    <button
                      className={
                        "flex-1 rounded-xl border px-4 py-3 text-sm font-semibold " +
                        (permissionToEnter === "call" ? "bg-black text-white border-black" : "bg-white border-neutral-200")
                      }
                      onClick={() => setPermissionToEnter("call")}
                      type="button"
                    >
                      Call to set appointment
                    </button>
                  </div>
                </div>

                <div>
                  <div className="mb-2 text-xs font-semibold text-neutral-600">Entry notes</div>
                  <Textarea
                    value={entryNotes}
                    onChange={(e) => setEntryNotes(e.target.value)}
                    placeholder="Gate code, pets, best times, etc."
                  />
                </div>

                <Button
                  onClick={() =>
                    submitRequest({
                      category,
                      summary,
                      permission_to_enter: permissionToEnter || null,
                      entry_notes: entryNotes || null,
                    })
                  }
                >
                  Submit Request
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <TenantNav />
    </div>
  );
}
