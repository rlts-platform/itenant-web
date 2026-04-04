"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function LoginPage() {
  const [err, setErr] = useState("");

  async function signInWithGoogle() {
    setErr("");
    const redirectTo = `${window.location.origin}/auth/callback`;

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });

    if (error) setErr(error.message);
  }

  return (
    <main style={{ minHeight:"100vh", display:"grid", placeItems:"center" }}>
      <div style={{ width: 420, padding: 20, border: "1px solid #333", borderRadius: 12 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>Login</h1>
        <p style={{ opacity: 0.85, marginTop: 6 }}>Continue with Google.</p>

        <button
          onClick={signInWithGoogle}
          style={{
            width:"100%",
            marginTop: 14,
            padding: 12,
            borderRadius: 10,
            background: "#111",
            border: "1px solid #555",
            color: "white",
            cursor: "pointer",
            fontWeight: 700,
          }}
        >
          Continue with Google
        </button>

        {err ? <div style={{ marginTop: 12, color: "#feb2b2", fontSize: 12 }}>{err}</div> : null}

        <div style={{ marginTop: 14, fontSize: 12, opacity: 0.8 }}>
          Magic links disabled. Google OAuth only.
        </div>
      </div>
    </main>
  );
}
