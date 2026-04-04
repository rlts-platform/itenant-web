"use client";
export const dynamic = "force-dynamic";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function AuthCallback() {
  const [msg, setMsg] = useState("Signing you in…");

  useEffect(() => {
    (async () => {
      // Ensure session is captured from URL (code or hash)
      await supabase.auth.getSession();

      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        setMsg("No user session. Returning to login…");
        setTimeout(() => window.location.replace("/login"), 700);
        return;
      }

      // Ensure the app_users row exists (fallback for existing users)
      const { data: appUser, error: auErr } = await supabase
        .from("app_users")
        .select("user_type")
        .eq("user_id", userData.user.id)
        .maybeSingle();

      if (auErr) {
        setMsg("App user lookup error: " + auErr.message);
        return;
      }

      const role = appUser?.user_type || "tenant";

      if (role === "platform_owner") window.location.replace("/owner");
      else if (role === "client" || role === "team") window.location.replace("/client");
      else window.location.replace("/tenant");
    })();
  }, []);

  return (
    <main style={{ minHeight:"100vh", display:"grid", placeItems:"center" }}>
      <div>{msg}</div>
    </main>
  );
}
