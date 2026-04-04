"use client";
export const dynamic = "force-dynamic";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type Lease = {
  lease_id: string; tenant_id: string; unit_id: string | null; account_id: string;
  start_date: string | null; end_date: string | null; rent_amount: number | null;
  deposit_amount: number | null; status: string; document_url: string | null;
  signed_by_tenant: boolean; signed_by_client: boolean;
  tenant_signed_at: string | null; client_signed_at: string | null;
  ai_generated: boolean; invite_sent: boolean; state: string | null;
  created_at: string;
};

const STATUS_COLOR: Record<string, string> = {
  active: "bg-green-50 text-green-700 border-green-200",
  expired: "bg-neutral-100 text-neutral-500 border-neutral-200",
  terminated: "bg-red-50 text-red-600 border-red-200",
  draft: "bg-yellow-50 text-yellow-700 border-yellow-200",
};

export default function LeaseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [lease, setLease] = useState<Lease | null>(null);
  const [tenantName, setTenantName] = useState("");
  const [tenantEmail, setTenantEmail] = useState("");
  const [tenantId, setTenantId] = useState("");
  const [unitLabel, setUnitLabel] = useState("");
  const [propertyName, setPropertyName] = useState("");
  const [accountId, setAccountId] = useState("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [toast, setToast] = useState("");
  const [uploading, setUploading] = useState(false);
  const [sendingInvite, setSendingInvite] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      const { data: ud } = await supabase.auth.getUser();
      if (!ud.user) { location.href = "/login"; return; }
      const { data: au } = await supabase.from("app_users").select("account_id").eq("user_id", ud.user.id).maybeSingle();
      if (!au) return;
      setAccountId(au.account_id);
      const { data: l, error } = await supabase.from("leases").select("*").eq("lease_id", id).single();
      if (error || !l) { setErr("Lease not found."); setLoading(false); return; }
      setLease(l);
      const { data: t } = await supabase.from("tenants").select("first_name,last_name,email,tenant_id").eq("tenant_id", l.tenant_id).maybeSingle();
      if (t) { setTenantName(`${t.first_name} ${t.last_name}`); setTenantEmail(t.email || ""); setTenantId(t.tenant_id); }
      if (l.unit_id) {
        const { data: u } = await supabase.from("units").select("unit_number,property_id").eq("unit_id", l.unit_id).maybeSingle();
        if (u) { setUnitLabel(u.unit_number ? `Unit ${u.unit_number}` : "Unit");
          const { data: p } = await supabase.from("properties").select("nickname,address").eq("property_id", u.property_id).maybeSingle();
          setPropertyName(p?.nickname || p?.address || "");
        }
      }
      setLoading(false);
    })();
  }, [id]);

  async function uploadSignedLease(file: File) {
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `leases/${accountId}/${id}/${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("documents").upload(path, file, { upsert: true });
    if (upErr) { setErr(upErr.message); setUploading(false); return; }
    const { data: urlData } = supabase.storage.from("documents").getPublicUrl(path);
    await supabase.from("leases").update({
      document_url: urlData.publicUrl,
      signed_by_client: true,
      client_signed_at: new Date().toISOString(),
      status: lease?.signed_by_tenant ? "active" : lease?.status,
    }).eq("lease_id", id);
    // Also save to documents table
    await supabase.from("documents").insert({
      account_id: accountId, tenant_id: tenantId, file_url: urlData.publicUrl,
      file_name: file.name, doc_type: "lease", category: "Lease", subcategory: "Signed Lease",
    });
    setLease(prev => prev ? { ...prev, document_url: urlData.publicUrl, signed_by_client: true } : prev);
    showToast("Lease uploaded ✓");
    setUploading(false);

    // Auto-send invite if not sent yet
    if (!lease?.invite_sent && tenantEmail) {
      await triggerInvite();
    }
  }

  async function triggerInvite() {
    setSendingInvite(true);
    await supabase.from("tenant_invites").update({ status: "expired" }).eq("tenant_id", tenantId).eq("status", "pending");
    const { data: inv } = await supabase.from("tenant_invites").insert({ tenant_id: tenantId, account_id: accountId, email: tenantEmail }).select("token").single();
    await supabase.from("leases").update({ invite_sent: true }).eq("lease_id", id);
    setLease(prev => prev ? { ...prev, invite_sent: true } : prev);
    if (inv) { console.log("Invite token:", inv.token); }
    showToast(`Invite sent to ${tenantEmail} ✓`);
    setSendingInvite(false);
  }

  async function markSigned(by: "tenant" | "client") {
    const updates = by === "tenant"
      ? { signed_by_tenant: true, tenant_signed_at: new Date().toISOString() }
      : { signed_by_client: true, client_signed_at: new Date().toISOString() };
    await supabase.from("leases").update(updates).eq("lease_id", id);
    setLease(prev => prev ? { ...prev, ...updates } : prev);
    showToast(`Marked as signed by ${by} ✓`);
    // If both signed, set active and send invite
    const updatedLease = { ...lease!, ...updates };
    if (updatedLease.signed_by_tenant && updatedLease.signed_by_client && !updatedLease.invite_sent) {
      await supabase.from("leases").update({ status: "active" }).eq("lease_id", id);
      setLease(prev => prev ? { ...prev, status: "active" } : prev);
      if (!lease?.invite_sent && tenantEmail) await triggerInvite();
    }
  }

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(""), 4000); }

  const daysUntilExpiry = lease?.end_date ? Math.ceil((new Date(lease.end_date).getTime() - Date.now()) / 86400000) : null;

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" /></div>;
  if (!lease) return <div className="p-4 bg-red-50 rounded-xl text-red-700 text-sm">{err}</div>;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/client/leases"><button className="w-9 h-9 flex items-center justify-center rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg></button></Link>
        <div className="text-sm text-neutral-500">Leases</div>
      </div>

      {/* Header */}
      <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-6 mb-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-bold text-neutral-900 text-lg">{tenantName}</span>
                <span className={`text-xs font-medium border px-2 py-0.5 rounded-full ${STATUS_COLOR[lease.status]}`}>{lease.status}</span>
                {lease.ai_generated && <span className="text-xs bg-purple-50 text-purple-600 border border-purple-200 px-2 py-0.5 rounded-full">✨ AI Generated</span>}
              </div>
              <div className="text-sm text-neutral-500">{propertyName}{unitLabel ? ` · ${unitLabel}` : ""}</div>
              {daysUntilExpiry !== null && daysUntilExpiry <= 60 && daysUntilExpiry > 0 && (
                <div className={`mt-1 text-xs font-semibold ${daysUntilExpiry <= 30 ? "text-red-600" : "text-yellow-700"}`}>⚠ Expires in {daysUntilExpiry} days</div>
              )}
            </div>
          </div>
          {lease.rent_amount && <div className="text-right shrink-0"><div className="text-xs text-neutral-500">Monthly Rent</div><div className="text-2xl font-bold text-green-600">${lease.rent_amount.toLocaleString()}</div></div>}
        </div>

        {/* Lease details */}
        <div className="grid grid-cols-4 gap-3 mt-5">
          {[
            { label: "Start Date", value: lease.start_date ? new Date(lease.start_date).toLocaleDateString() : "—" },
            { label: "End Date", value: lease.end_date ? new Date(lease.end_date).toLocaleDateString() : "—" },
            { label: "Deposit", value: lease.deposit_amount ? `$${lease.deposit_amount.toLocaleString()}` : "—" },
            { label: "State", value: lease.state || "—" },
          ].map(s => (
            <div key={s.label} className="bg-neutral-50 rounded-xl p-3 border border-neutral-100 text-center">
              <div className="text-xs text-neutral-500">{s.label}</div>
              <div className="text-sm font-semibold text-neutral-900 mt-0.5">{s.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Signatures */}
      <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-5 mb-4">
        <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-4">Signatures</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className={`p-4 rounded-xl border ${lease.signed_by_client ? "bg-green-50 border-green-200" : "bg-neutral-50 border-neutral-200"}`}>
            <div className="flex items-center justify-between">
              <div><div className="text-xs font-semibold text-neutral-600">Client / Manager</div>{lease.signed_by_client ? <div className="text-xs text-green-600 mt-0.5">✓ Signed {lease.client_signed_at ? new Date(lease.client_signed_at).toLocaleDateString() : ""}</div> : <div className="text-xs text-neutral-400 mt-0.5">Not signed yet</div>}</div>
              {!lease.signed_by_client && <button onClick={() => markSigned("client")} className="text-xs text-blue-600 font-semibold border border-blue-200 bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100">Mark Signed</button>}
            </div>
          </div>
          <div className={`p-4 rounded-xl border ${lease.signed_by_tenant ? "bg-green-50 border-green-200" : "bg-neutral-50 border-neutral-200"}`}>
            <div className="flex items-center justify-between">
              <div><div className="text-xs font-semibold text-neutral-600">Tenant — {tenantName}</div>{lease.signed_by_tenant ? <div className="text-xs text-green-600 mt-0.5">✓ Signed {lease.tenant_signed_at ? new Date(lease.tenant_signed_at).toLocaleDateString() : ""}</div> : <div className="text-xs text-neutral-400 mt-0.5">Not signed yet</div>}</div>
              {!lease.signed_by_tenant && <button onClick={() => markSigned("tenant")} className="text-xs text-blue-600 font-semibold border border-blue-200 bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100">Mark Signed</button>}
            </div>
          </div>
        </div>
        {lease.signed_by_client && lease.signed_by_tenant && (
          <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-xl text-xs text-green-800 font-medium text-center">✓ Fully executed — lease is active</div>
        )}
      </div>

      {/* Document */}
      <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-5 mb-4">
        <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-3">Lease Document</h3>
        {lease.document_url ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3"><div className="w-9 h-9 bg-red-50 rounded-xl flex items-center justify-center text-red-500">📄</div><div><div className="text-sm font-medium text-neutral-900">Signed Lease Document</div><div className="text-xs text-neutral-400">Uploaded</div></div></div>
            <div className="flex gap-2"><a href={lease.document_url} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-blue-600 border border-blue-200 bg-blue-50 px-3 py-1.5 rounded-xl">View</a><a href={lease.document_url} download className="text-xs font-semibold text-neutral-600 border border-neutral-200 bg-white px-3 py-1.5 rounded-xl">Download</a></div>
          </div>
        ) : (
          <div>
            <div className="border-2 border-dashed border-neutral-200 rounded-xl p-5 text-center cursor-pointer hover:border-blue-400 transition-colors" onClick={() => fileRef.current?.click()}>
              <div className="text-2xl mb-1">📄</div><div className="text-sm text-neutral-500">Upload signed lease PDF</div>
              <div className="text-xs text-neutral-400 mt-0.5">Uploading a signed lease automatically triggers the tenant invite</div>
            </div>
            <input ref={fileRef} type="file" accept="application/pdf,image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) uploadSignedLease(f); }} />
          </div>
        )}
      </div>

      {/* Invite status */}
      <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-5 mb-4">
        <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-3">Tenant Portal Invite</h3>
        {lease.invite_sent ? (
          <div className="flex items-center justify-between">
            <div className="text-sm text-green-700 flex items-center gap-2"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>Invite sent to {tenantEmail}</div>
            <button onClick={triggerInvite} disabled={sendingInvite} className="text-xs text-neutral-600 border border-neutral-200 px-3 py-1.5 rounded-xl hover:bg-neutral-50">Resend</button>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div className="text-sm text-neutral-600">No invite sent yet to {tenantEmail || "tenant"}</div>
            <button onClick={triggerInvite} disabled={sendingInvite || !tenantEmail} className="text-xs font-semibold bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 disabled:opacity-50">{sendingInvite ? "Sending..." : "Send Invite"}</button>
          </div>
        )}
        <div className="text-xs text-neutral-400 mt-2">The invite lets the tenant create their iTenant account to pay rent, submit maintenance requests, and access documents.</div>
      </div>

      {toast && <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-neutral-900 text-white text-sm font-medium px-5 py-3 rounded-xl shadow-lg z-50">{toast}</div>}
    </div>
  );
}
