"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function AuthCallback() {
  const [msg, setMsg] = useState("Signing you in…");

  useEffect(() => {
    (async () => {
      await supabase.auth.getSession();
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        setMsg("No user session. Returning to login…");
        setTimeout(() => window.location.replace("/login"), 800);
        return;
      }
      const user = userData.user;
      const { data: existing } = await supabase.from("app_users").select("role, account_id").eq("user_id", user.id).maybeSingle();
      if (existing) { routeByRole(existing.role); return; }
      const isOwner = user.email === "jarivera43019@gmail.com";
      const role = isOwner ? "platform_owner" : "client";
      const { data: account, error: accErr } = await supabase.from("accounts").insert({
        owner_user_id: user.id,
        company_name: user.user_metadata?.full_name || user.email?.split("@")[0] || "My Company",
        plan_tier: isOwner ? "enterprise" : "basic",
        subscription_status: isOwner ? "active" : "trial",
      }).select("account_id").single();
      if (accErr || !account) { setMsg("Setup error. Please try again."); setTimeout(() => window.location.replace("/login"), 1500); return; }
      await supabase.from("app_users").insert({ user_id: user.id, account_id: account.account_id, role });
      routeByRole(role);
    })();
  }, []);

  function routeByRole(role: string) {
    if (role === "platform_owner") window.location.replace("/owner");
    else if (role === "client" || role === "team") window.location.replace("/client");
    else window.location.replace("/tenant");
  }

  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", fontFamily: "system-ui" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 40, height: 40, border: "3px solid #e5e7eb", borderTopColor: "#2563eb", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 16px" }} />
        <p style={{ color: "#6b7280", fontSize: 15 }}>{msg}</p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </main>
  );
}
