"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type InviteData = {
  status: string;
  expires_at: string;
  tenant_id: string;
  email: string;
  tenant: {
    first_name: string;
    last_name: string;
    email: string;
    unit_id: string | null;
  };
  account: {
    company_name: string;
  };
  unit: {
    unit_number: string | null;
    property: {
      address: string;
      nickname: string | null;
    } | null;
  } | null;
};

type Step = "loading" | "invalid" | "expired" | "already_accepted" | "welcome" | "creating" | "done" | "error";

export default function InvitePage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();

  const [step, setStep] = useState<Step>("loading");
  const [invite, setInvite] = useState<InviteData | null>(null);
  const [err, setErr] = useState("");
  const [authMethod, setAuthMethod] = useState<"google" | null>(null);

  useEffect(() => {
    (async () => {
      if (!token) { setStep("invalid"); return; }

      // Look up the invite
      const { data: inv, error } = await supabase
        .from("tenant_invites")
        .select(`
          status, expires_at, tenant_id, email,
          tenant:tenants (first_name, last_name, email, unit_id),
          account:accounts (company_name)
        `)
        .eq("token", token)
        .maybeSingle();

      if (error || !inv) { setStep("invalid"); return; }
      if (inv.status === "accepted") { setStep("already_accepted"); return; }
      if (new Date(inv.expires_at) < new Date()) { setStep("expired"); return; }

      // Load unit + property info
      let unit = null;
      const tenantData = Array.isArray(inv.tenant) ? inv.tenant[0] : inv.tenant;
      if (tenantData?.unit_id) {
        const { data: u } = await supabase
          .from("units")
          .select("unit_number, property_id")
          .eq("unit_id", tenantData.unit_id)
          .maybeSingle();
        if (u) {
          const { data: p } = await supabase
            .from("properties")
            .select("address, nickname")
            .eq("property_id", u.property_id)
            .maybeSingle();
          unit = { unit_number: u.unit_number, property: p };
        }
      }

      const accountData = Array.isArray(inv.account) ? inv.account[0] : inv.account;

      setInvite({
        ...inv,
        tenant: tenantData,
        account: accountData,
        unit,
      });
      setStep("welcome");
    })();
  }, [token]);

  async function signInWithGoogle() {
    if (!invite) return;
    setAuthMethod("google");
    setStep("creating");

    const redirectTo = `${window.location.origin}/invite/${token}/complete`;

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
        queryParams: { login_hint: invite.email },
      },
    });

    if (error) { setErr(error.message); setStep("welcome"); }
  }

  async function completeInvite() {
    // This is called after OAuth completes (via /invite/[token]/complete page)
    // Mark invite as accepted, update tenant status, link user_id
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;

    // Update tenant user_id and status
    await supabase
      .from("tenants")
      .update({ user_id: userData.user.id, status: "active" })
      .eq("tenant_id", invite!.tenant_id);

    // Create app_users entry
    await supabase
      .from("app_users")
      .upsert({
        user_id: userData.user.id,
        account_id: invite!.account ? (invite!.account as { company_name: string } & { account_id?: string } as { account_id?: string }).account_id : null,
        role: "tenant",
        tenant_id: invite!.tenant_id,
      }, { onConflict: "user_id" });

    // Mark invite accepted
    await supabase
      .from("tenant_invites")
      .update({ status: "accepted", accepted_at: new Date().toISOString() })
      .eq("token", token);

    setStep("done");
    setTimeout(() => router.push("/tenant"), 2000);
  }

  // ─── RENDER STATES ────────────────────────────────────────────────────────
  if (step === "loading") {
    return (
      <main className="min-h-screen bg-[#f5f6fa] flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
      </main>
    );
  }

  if (step === "invalid") {
    return (
      <main className="min-h-screen bg-[#f5f6fa] flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-8 max-w-sm w-full text-center">
          <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center text-red-500 mx-auto mb-4">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
          </div>
          <h1 className="text-xl font-bold text-neutral-900">Invalid Invite</h1>
          <p className="text-neutral-500 text-sm mt-2">This invite link is invalid or has already been used. Contact your property manager for a new invite.</p>
        </div>
      </main>
    );
  }

  if (step === "expired") {
    return (
      <main className="min-h-screen bg-[#f5f6fa] flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-8 max-w-sm w-full text-center">
          <div className="w-14 h-14 bg-yellow-50 rounded-2xl flex items-center justify-center text-yellow-500 mx-auto mb-4">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          </div>
          <h1 className="text-xl font-bold text-neutral-900">Invite Expired</h1>
          <p className="text-neutral-500 text-sm mt-2">This invite link has expired (14 business days). Please contact your property manager to request a new one.</p>
        </div>
      </main>
    );
  }

  if (step === "already_accepted") {
    return (
      <main className="min-h-screen bg-[#f5f6fa] flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-8 max-w-sm w-full text-center">
          <div className="w-14 h-14 bg-green-50 rounded-2xl flex items-center justify-center text-green-500 mx-auto mb-4">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <h1 className="text-xl font-bold text-neutral-900">Already Set Up!</h1>
          <p className="text-neutral-500 text-sm mt-2">You've already accepted this invite and set up your account.</p>
          <a href="/login">
            <button className="mt-5 w-full bg-blue-600 text-white px-5 py-3 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors">
              Go to Login
            </button>
          </a>
        </div>
      </main>
    );
  }

  if (step === "done") {
    return (
      <main className="min-h-screen bg-[#f5f6fa] flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-8 max-w-sm w-full text-center">
          <div className="w-14 h-14 bg-green-50 rounded-2xl flex items-center justify-center text-green-500 mx-auto mb-4">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <h1 className="text-xl font-bold text-neutral-900">You're all set!</h1>
          <p className="text-neutral-500 text-sm mt-2">Taking you to your dashboard...</p>
        </div>
      </main>
    );
  }

  // WELCOME + SIGN IN
  if (step === "welcome" || step === "creating") {
    const propertyName = invite?.unit?.property?.nickname || invite?.unit?.property?.address || "";
    const unitLabel = invite?.unit?.unit_number ? `Unit ${invite.unit.unit_number}` : "";

    return (
      <main className="min-h-screen bg-[#f5f6fa] flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm w-full max-w-sm overflow-hidden">
          {/* Top color bar */}
          <div className="h-2 bg-blue-600 rounded-t-2xl" />

          <div className="p-8">
            {/* Logo */}
            <div className="flex items-center gap-2 mb-6">
              <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="4" y="2" width="16" height="20" rx="2"/>
                  <path d="M9 22V12h6v10"/><path d="M8 7h.01M12 7h.01M16 7h.01"/>
                </svg>
              </div>
              <span className="font-bold text-neutral-900">iTenant</span>
            </div>

            {/* Welcome text */}
            <h1 className="text-2xl font-bold text-neutral-900">
              Welcome, {invite?.tenant?.first_name}! 👋
            </h1>
            <p className="text-neutral-500 text-sm mt-1">
              <strong>{invite?.account?.company_name}</strong> has invited you to manage your tenancy online.
            </p>

            {/* Unit info */}
            {(propertyName || unitLabel) && (
              <div className="mt-4 bg-blue-50 border border-blue-100 rounded-xl p-3 text-sm text-blue-800">
                <div className="font-semibold">{propertyName}</div>
                {unitLabel && <div className="text-blue-600">{unitLabel}</div>}
              </div>
            )}

            {/* What they get */}
            <div className="mt-5 grid gap-2">
              {[
                "View and pay rent online",
                "Submit maintenance requests",
                "Access your lease documents",
                "Message your property manager",
                "See all your bills in one place",
              ].map((item) => (
                <div key={item} className="flex items-center gap-2 text-sm text-neutral-700">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-blue-500 shrink-0">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                  {item}
                </div>
              ))}
            </div>

            {/* Sign in button */}
            <button
              onClick={signInWithGoogle}
              disabled={step === "creating"}
              className="mt-6 w-full flex items-center justify-center gap-3 border border-neutral-200 bg-white text-neutral-900 px-5 py-3 rounded-xl text-sm font-semibold hover:bg-neutral-50 transition-colors disabled:opacity-50 shadow-sm"
            >
              {step === "creating" ? (
                <div className="w-4 h-4 border-2 border-neutral-300 border-t-neutral-700 rounded-full animate-spin" />
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
              )}
              {step === "creating" ? "Redirecting..." : "Continue with Google"}
            </button>

            {err && <div className="mt-3 text-xs text-red-600 text-center">{err}</div>}

            <p className="text-xs text-neutral-400 text-center mt-4">
              By continuing, you agree to use this account for your tenancy at {propertyName}.
              This invite expires {invite ? new Date(invite.expires_at).toLocaleDateString() : ""}.
            </p>
          </div>
        </div>
      </main>
    );
  }

  return null;
}
