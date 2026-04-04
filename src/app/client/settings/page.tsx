"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type Tab = "account" | "integrations" | "notifications" | "billing";

type Integration = {
  platform: string; label: string; description: string; icon: string;
  category: string; status: "connected" | "disconnected" | "coming_soon";
  connectUrl?: string;
};

const INTEGRATIONS: Integration[] = [
  // Applications
  { platform: "zillow", label: "Zillow Rental Manager", description: "Sync rental applications directly from Zillow listings", icon: "🏠", category: "Applications", status: "coming_soon" },
  { platform: "apartments_com", label: "Apartments.com", description: "Import applications from Apartments.com listings", icon: "🏢", category: "Applications", status: "coming_soon" },
  { platform: "avail", label: "Avail", description: "Connect your Avail account to sync applications and leases", icon: "📋", category: "Applications", status: "coming_soon" },
  { platform: "hotpads", label: "HotPads", description: "Import leads and applications from HotPads listings", icon: "🗺️", category: "Applications", status: "coming_soon" },
  { platform: "trulia", label: "Trulia", description: "Sync rental inquiries and applications from Trulia", icon: "🔑", category: "Applications", status: "coming_soon" },
  // Payments
  { platform: "stripe", label: "Stripe", description: "Accept online rent payments via credit card, ACH, and bank transfer", icon: "💳", category: "Payments", status: "coming_soon" },
  { platform: "plaid", label: "Plaid", description: "Connect tenant bank accounts for ACH rent payments and income verification", icon: "🏦", category: "Payments", status: "coming_soon" },
  // Accounting
  { platform: "quickbooks", label: "QuickBooks Online", description: "Sync income, expenses, and financial reports to QuickBooks automatically", icon: "📊", category: "Accounting", status: "coming_soon" },
  // Documents & Storage
  { platform: "google_drive", label: "Google Drive", description: "Sync documents, leases, and receipts to your Google Drive automatically", icon: "📁", category: "Storage", status: "coming_soon" },
  { platform: "dropbox", label: "Dropbox", description: "Backup and sync all property documents to Dropbox", icon: "💧", category: "Storage", status: "coming_soon" },
  { platform: "onedrive", label: "OneDrive", description: "Sync documents to Microsoft OneDrive for Business", icon: "☁️", category: "Storage", status: "coming_soon" },
  // Signatures
  { platform: "docusign", label: "DocuSign", description: "Send leases for e-signature directly from iTenant", icon: "✍️", category: "Signatures", status: "coming_soon" },
  { platform: "hellosign", label: "HelloSign (Dropbox Sign)", description: "Legally binding e-signatures for leases and documents", icon: "📝", category: "Signatures", status: "coming_soon" },
  // Marketplace
  { platform: "amazon", label: "Amazon Business", description: "Order maintenance supplies and repairs materials directly from iTenant", icon: "📦", category: "Marketplace", status: "coming_soon" },
  { platform: "home_depot", label: "Home Depot Pro", description: "Purchase supplies and materials for repairs with pro pricing", icon: "🔨", category: "Marketplace", status: "coming_soon" },
  { platform: "lowes", label: "Lowe's for Pros", description: "Order building materials and supplies directly from work orders", icon: "🔧", category: "Marketplace", status: "coming_soon" },
  // Communications
  { platform: "twilio", label: "Twilio", description: "SMS and voice calls for your dedicated property phone number", icon: "📱", category: "Communications", status: "coming_soon" },
  { platform: "resend", label: "Resend", description: "Automated email delivery for notifications, reminders, and invites", icon: "📧", category: "Communications", status: "coming_soon" },
  // Calendar
  { platform: "google_calendar", label: "Google Calendar", description: "Sync lease dates, maintenance appointments, and rent due dates", icon: "📅", category: "Calendar", status: "coming_soon" },
  { platform: "outlook", label: "Outlook Calendar", description: "Sync property events and reminders to Microsoft Outlook", icon: "📆", category: "Calendar", status: "coming_soon" },
];

const CATEGORIES = [...new Set(INTEGRATIONS.map(i => i.category))];

export default function SettingsPage() {
  const params = useSearchParams();
  const [tab, setTab] = useState<Tab>((params.get("tab") as Tab) || "account");
  const [account, setAccount] = useState<{ company_name: string; state: string; plan_tier: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");
  const [form, setForm] = useState({ company_name: "", state: "" });
  const [categoryFilter, setCategoryFilter] = useState("All");

  useEffect(() => {
    (async () => {
      const { data: ud } = await supabase.auth.getUser();
      if (!ud.user) { location.href = "/login"; return; }
      const { data: au } = await supabase.from("app_users").select("account_id").eq("user_id", ud.user.id).maybeSingle();
      if (!au) return;
      const { data: acct } = await supabase.from("accounts").select("company_name,state,plan_tier").eq("account_id", au.account_id).maybeSingle();
      if (acct) { setAccount(acct); setForm({ company_name: acct.company_name || "", state: acct.state || "" }); }
    })();
  }, []);

  async function saveAccount() {
    setSaving(true);
    const { data: ud } = await supabase.auth.getUser();
    if (!ud.user) return;
    const { data: au } = await supabase.from("app_users").select("account_id").eq("user_id", ud.user.id).maybeSingle();
    if (!au) return;
    await supabase.from("accounts").update({ company_name: form.company_name, state: form.state }).eq("account_id", au.account_id);
    setToast("Settings saved ✓");
    setTimeout(() => setToast(""), 3000);
    setSaving(false);
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: "account", label: "Account" },
    { key: "integrations", label: "Integrations" },
    { key: "notifications", label: "Notifications" },
    { key: "billing", label: "Billing" },
  ];

  const filteredIntegrations = categoryFilter === "All" ? INTEGRATIONS : INTEGRATIONS.filter(i => i.category === categoryFilter);

  return (
    <div>
      <div className="mb-8"><h1 className="text-3xl font-bold text-neutral-900">Settings</h1><p className="text-neutral-500 mt-1">Manage your account and preferences</p></div>

      {/* Tab nav */}
      <div className="flex gap-1 bg-white border border-neutral-200 rounded-2xl p-1.5 shadow-sm mb-6 w-fit">
        {tabs.map(t => <button key={t.key} onClick={() => setTab(t.key)} className={`px-5 py-2.5 text-sm font-semibold rounded-xl transition-all ${tab === t.key ? "bg-blue-600 text-white" : "text-neutral-600 hover:bg-neutral-100"}`}>{t.label}</button>)}
      </div>

      {/* ── ACCOUNT TAB ── */}
      {tab === "account" && (
        <div className="max-w-2xl">
          <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-neutral-100 bg-neutral-50"><h2 className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Company Info</h2></div>
            <div className="px-6 py-5 grid gap-4">
              <div><label className="block text-xs font-semibold text-neutral-600 mb-1.5">Company Name</label><input className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500/20" value={form.company_name} onChange={e => setForm(p => ({ ...p, company_name: e.target.value }))} /></div>
              <div><label className="block text-xs font-semibold text-neutral-600 mb-1.5">Primary State</label><input className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500/20" placeholder="DE" maxLength={2} value={form.state} onChange={e => setForm(p => ({ ...p, state: e.target.value.toUpperCase() }))} /></div>
            </div>
            <div className="px-6 py-4 border-t border-neutral-100 bg-neutral-50 flex justify-between items-center">
              <span className="text-xs text-neutral-400">Plan: <strong>{account?.plan_tier || "basic"}</strong></span>
              <button onClick={saveAccount} disabled={saving} className="bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50">{saving ? "Saving..." : "Save Changes"}</button>
            </div>
          </div>

          <div className="mt-4 bg-white rounded-2xl border border-neutral-200 shadow-sm p-5">
            <h2 className="text-sm font-bold text-neutral-700 mb-3">Danger Zone</h2>
            <p className="text-xs text-neutral-500 mb-3">Actions here are permanent and cannot be undone.</p>
            <button className="border border-red-200 text-red-600 px-4 py-2 rounded-xl text-xs font-semibold hover:bg-red-50">Delete Account</button>
          </div>
        </div>
      )}

      {/* ── INTEGRATIONS TAB ── */}
      {tab === "integrations" && (
        <div>
          <div className="mb-5 p-4 bg-blue-50 border border-blue-200 rounded-2xl text-sm text-blue-800">
            <strong>Connections coming soon.</strong> All integrations below are in development. Click any to join the waitlist and be notified when they go live. Your data in iTenant is always yours — connections only sync, never lock you in.
          </div>

          {/* Category filter */}
          <div className="flex gap-2 mb-6 flex-wrap">
            {["All", ...CATEGORIES].map(c => <button key={c} onClick={() => setCategoryFilter(c)} className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${categoryFilter === c ? "bg-blue-600 text-white border-blue-600" : "bg-white text-neutral-600 border-neutral-200 hover:border-blue-300"}`}>{c}</button>)}
          </div>

          <div className="grid gap-3">
            {CATEGORIES.filter(c => categoryFilter === "All" || c === categoryFilter).map(cat => (
              <div key={cat}>
                <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2 mt-2">{cat}</h3>
                <div className="grid gap-2">
                  {filteredIntegrations.filter(i => i.category === cat).map(integration => (
                    <div key={integration.platform} className="bg-white border border-neutral-200 rounded-2xl p-4 flex items-center justify-between gap-4 shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-neutral-100 flex items-center justify-center text-xl shrink-0">{integration.icon}</div>
                        <div>
                          <div className="font-semibold text-neutral-900 text-sm">{integration.label}</div>
                          <div className="text-xs text-neutral-500 mt-0.5">{integration.description}</div>
                        </div>
                      </div>
                      <div className="shrink-0">
                        {integration.status === "connected" ? (
                          <span className="text-xs font-semibold text-green-600 bg-green-50 border border-green-200 px-3 py-1.5 rounded-xl">✓ Connected</span>
                        ) : (
                          <button className="text-xs font-semibold text-neutral-600 bg-neutral-100 border border-neutral-200 px-3 py-1.5 rounded-xl hover:bg-neutral-200 transition-colors">Coming Soon</button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── NOTIFICATIONS TAB ── */}
      {tab === "notifications" && (
        <div className="max-w-2xl bg-white rounded-2xl border border-neutral-200 shadow-sm p-6">
          <h2 className="text-sm font-bold text-neutral-700 mb-4">Notification Preferences</h2>
          <div className="grid gap-4">
            {[
              { label: "New maintenance request", desc: "Get notified when a tenant submits a work order" },
              { label: "Late rent payment", desc: "Alert when a tenant's rent goes past due" },
              { label: "Lease expiring soon", desc: "30-day warning before lease expiration" },
              { label: "New application", desc: "Alert when a new rental application is submitted" },
              { label: "Tenant joined app", desc: "Confirmation when tenant accepts invite and creates account" },
              { label: "New message", desc: "Alert when you receive a message from a tenant or team member" },
            ].map(n => (
              <div key={n.label} className="flex items-center justify-between py-3 border-b border-neutral-100 last:border-0">
                <div><div className="text-sm font-medium text-neutral-900">{n.label}</div><div className="text-xs text-neutral-500">{n.desc}</div></div>
                <div className="flex gap-2">
                  <label className="flex items-center gap-1.5 text-xs font-medium text-neutral-600"><input type="checkbox" defaultChecked className="rounded" />Email</label>
                  <label className="flex items-center gap-1.5 text-xs font-medium text-neutral-600"><input type="checkbox" defaultChecked className="rounded" />SMS</label>
                </div>
              </div>
            ))}
          </div>
          <button className="mt-4 bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700">Save Preferences</button>
        </div>
      )}

      {/* ── BILLING TAB ── */}
      {tab === "billing" && (
        <div className="max-w-2xl">
          <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-6 mb-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-neutral-700">Current Plan</h2>
              <span className="bg-blue-50 text-blue-700 border border-blue-200 text-xs font-semibold px-3 py-1 rounded-full capitalize">{account?.plan_tier || "Basic"}</span>
            </div>
            <div className="grid gap-3">
              {["Unlimited properties", "Up to 50 units", "Tenant invite flow", "AI lease generator", "Maintenance tracking", "Financial hub"].map(f => (
                <div key={f} className="flex items-center gap-2 text-sm text-neutral-700"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-green-500"><polyline points="20 6 9 17 4 12" /></svg>{f}</div>
              ))}
            </div>
          </div>
          <div className="bg-neutral-50 border border-neutral-200 rounded-2xl p-5 text-center">
            <h3 className="font-bold text-neutral-900 mb-1">Ready to scale?</h3>
            <p className="text-sm text-neutral-500 mb-4">Upgrade for unlimited units, advanced AI features, priority support, and all platform integrations.</p>
            <button className="bg-blue-600 text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700">Upgrade Plan</button>
          </div>
        </div>
      )}

      {toast && <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-neutral-900 text-white text-sm font-medium px-5 py-3 rounded-xl shadow-lg z-50">{toast}</div>}
    </div>
  );
}
