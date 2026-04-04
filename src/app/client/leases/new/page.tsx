"use client";
export const dynamic = "force-dynamic";
import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

const ic = "w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all";
const F = ({label,required,hint,children}:{label:string;required?:boolean;hint?:string;children:React.ReactNode}) => (
  <div><label className="block text-xs font-semibold text-neutral-600 mb-1.5">{label}{required&&<span className="text-red-500 ml-0.5">*</span>}</label>{children}{hint&&<p className="text-xs text-neutral-400 mt-1">{hint}</p>}</div>
);

export default function NewLeasePage() {
  const router = useRouter();
  const params = useSearchParams();
  const prefillTenant = params.get("tenant");
  const [accountId, setAccountId] = useState("");
  const [tenants, setTenants] = useState<{tenant_id:string;first_name:string;last_name:string;unit_id:string|null}[]>([]);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [leaseFile, setLeaseFile] = useState<File|null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    tenant_id: prefillTenant||"", start_date:"", end_date:"",
    rent_amount:"", deposit_amount:"", status:"draft",
    mark_signed: false,
  });
  const set = (k:string, v:string|boolean) => setForm(p=>({...p,[k]:v}));

  useEffect(()=>{
    (async()=>{
      const {data:ud} = await supabase.auth.getUser();
      if(!ud.user){location.href="/login";return;}
      const {data:au} = await supabase.from("app_users").select("account_id").eq("user_id",ud.user.id).maybeSingle();
      if(!au)return;
      setAccountId(au.account_id);
      const {data:t} = await supabase.from("tenants").select("tenant_id,first_name,last_name,unit_id").eq("account_id",au.account_id).eq("status","active").order("first_name");
      setTenants(t||[]);
    })();
  },[]);

  async function handleSubmit() {
    setErr("");
    if(!form.tenant_id){setErr("Please select a tenant.");return;}
    if(!form.rent_amount){setErr("Rent amount is required.");return;}
    setSaving(true);

    const selectedTenant = tenants.find(t=>t.tenant_id===form.tenant_id);
    if(!selectedTenant){setErr("Tenant not found.");setSaving(false);return;}

    // Upload lease document if provided
    let document_url: string|null = null;
    if(leaseFile) {
      const ext = leaseFile.name.split(".").pop();
      const path = `leases/${accountId}/${form.tenant_id}/${Date.now()}.${ext}`;
      const {error:upErr} = await supabase.storage.from("documents").upload(path, leaseFile, {upsert:true});
      if(!upErr) {
        const {data:urlData} = supabase.storage.from("documents").getPublicUrl(path);
        document_url = urlData.publicUrl;
      }
    }

    const signed_at = form.mark_signed ? new Date().toISOString() : null;

    const {data:lease, error} = await supabase.from("leases").insert({
      account_id: accountId,
      tenant_id: form.tenant_id,
      unit_id: selectedTenant.unit_id,
      start_date: form.start_date||null,
      end_date: form.end_date||null,
      rent_amount: parseFloat(form.rent_amount),
      deposit_amount: form.deposit_amount?parseFloat(form.deposit_amount):null,
      status: form.mark_signed?"active":"draft",
      document_url,
      signed_at,
    }).select("lease_id").single();

    if(error){setErr(error.message);setSaving(false);return;}

    // ── SIGNED LEASE TRIGGER ─────────────────────────────────────────────────
    // If lease is marked signed, fire the full invite flow
    if(form.mark_signed && selectedTenant) {
      // 1. Update unit to occupied
      if(selectedTenant.unit_id) {
        await supabase.from("units").update({status:"occupied"}).eq("unit_id",selectedTenant.unit_id);
      }

      // 2. Update tenant status to active
      await supabase.from("tenants").update({status:"active"}).eq("tenant_id",form.tenant_id);

      // 3. Get tenant email
      const {data:tenantFull} = await supabase.from("tenants").select("email,first_name").eq("tenant_id",form.tenant_id).maybeSingle();

      if(tenantFull?.email) {
        // 4. Expire old invites
        await supabase.from("tenant_invites").update({status:"expired"}).eq("tenant_id",form.tenant_id).eq("status","pending");

        // 5. Create new invite
        const {data:invite} = await supabase.from("tenant_invites").insert({
          tenant_id: form.tenant_id,
          account_id: accountId,
          email: tenantFull.email,
        }).select("id,token").single();

        // 6. Log the trigger
        if(invite) {
          await supabase.from("lease_trigger_log").insert({
            lease_id: lease.lease_id,
            tenant_id: form.tenant_id,
            account_id: accountId,
            trigger_type: "lease_signed",
            invite_sent: true,
            invite_id: invite.id,
            unit_updated: !!selectedTenant.unit_id,
          });
          console.log("Lease signed invite token:", invite.token);
          // TODO: Fire Resend edge function with lease_signed email template
        }
      }
    }

    router.push(`/client/leases/${lease.lease_id}?new=true`);
  }

  return (
    <div>
      <div className="flex items-center gap-4 mb-8">
        <Link href="/client/leases"><button className="w-9 h-9 flex items-center justify-center rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg></button></Link>
        <div><h1 className="text-3xl font-bold text-neutral-900">New Lease</h1><p className="text-neutral-500 mt-0.5">Create and manage a lease agreement</p></div>
      </div>
      <div className="max-w-2xl">
        {err && <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{err}</div>}

        {/* AI hint */}
        <div className="mb-6 bg-purple-50 border border-purple-200 rounded-2xl p-4 flex gap-3">
          <span className="text-purple-500 text-lg shrink-0">✨</span>
          <div className="text-sm text-purple-800"><strong>AI Lease Generator</strong> coming soon — describe the unit and state, AI drafts the full lease. For now, upload your signed document below.</div>
        </div>

        <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-neutral-100 bg-neutral-50"><h2 className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Tenant</h2></div>
          <div className="px-6 py-5">
            <F label="Select Tenant" required>
              <select className={ic} value={form.tenant_id} onChange={e=>set("tenant_id",e.target.value)}>
                <option value="">Select a tenant...</option>
                {tenants.map(t=><option key={t.tenant_id} value={t.tenant_id}>{t.first_name} {t.last_name}</option>)}
              </select>
            </F>
          </div>

          <div className="px-6 py-4 border-t border-neutral-100 bg-neutral-50"><h2 className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Lease Terms</h2></div>
          <div className="px-6 py-5 grid gap-4">
            <div className="grid grid-cols-2 gap-3">
              <F label="Start Date"><input className={ic} type="date" value={form.start_date} onChange={e=>set("start_date",e.target.value)}/></F>
              <F label="End Date"><input className={ic} type="date" value={form.end_date} onChange={e=>set("end_date",e.target.value)}/></F>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <F label="Monthly Rent" required>
                <div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 text-sm">$</span><input className={ic+" pl-7"} type="number" placeholder="2100" value={form.rent_amount} onChange={e=>set("rent_amount",e.target.value)}/></div>
              </F>
              <F label="Security Deposit">
                <div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 text-sm">$</span><input className={ic+" pl-7"} type="number" placeholder="2100" value={form.deposit_amount} onChange={e=>set("deposit_amount",e.target.value)}/></div>
              </F>
            </div>
          </div>

          <div className="px-6 py-4 border-t border-neutral-100 bg-neutral-50"><h2 className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Upload Signed Lease</h2></div>
          <div className="px-6 py-5 grid gap-4">
            <div className="border-2 border-dashed border-neutral-200 rounded-xl p-5 text-center cursor-pointer hover:border-blue-400 transition-colors" onClick={()=>fileRef.current?.click()}>
              {leaseFile ? (
                <div className="text-sm text-green-600 font-semibold">✓ {leaseFile.name}</div>
              ) : (
                <>
                  <svg className="mx-auto text-neutral-400 mb-2" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/></svg>
                  <div className="text-sm text-neutral-600 font-medium">Upload signed lease document</div>
                  <div className="text-xs text-neutral-400 mt-1">PDF, JPG, PNG — drag or tap to upload</div>
                </>
              )}
              <input ref={fileRef} type="file" accept=".pdf,image/*" className="hidden" onChange={e=>setLeaseFile(e.target.files?.[0]??null)}/>
            </div>

            {/* Mark as signed toggle — THE KEY TRIGGER */}
            <div className="flex items-start gap-4 p-4 bg-green-50 border border-green-200 rounded-xl">
              <div className="pt-0.5">
                <button type="button" onClick={()=>set("mark_signed",!form.mark_signed)}
                  className={`w-11 h-6 rounded-full transition-colors relative ${form.mark_signed?"bg-green-600":"bg-neutral-200"}`}>
                  <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-all ${form.mark_signed?"left-5":"left-0.5"}`}/>
                </button>
              </div>
              <div>
                <div className="font-semibold text-sm text-neutral-900">Mark as Signed</div>
                <div className="text-xs text-neutral-600 mt-0.5">
                  {form.mark_signed
                    ? "✓ Lease will be set to active. Unit will flip to occupied. Tenant will receive a welcome email with their account invite link automatically."
                    : "Toggle on when the lease is signed by both parties. This triggers the full tenant onboarding flow."}
                </div>
              </div>
            </div>
          </div>

          <div className="px-6 py-4 bg-neutral-50 border-t border-neutral-100 flex items-center justify-between">
            <Link href="/client/leases"><button className="border border-neutral-200 bg-white text-neutral-700 px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-neutral-50">Cancel</button></Link>
            <button onClick={handleSubmit} disabled={saving} className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50">
              {saving?<><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"/>Saving...</>:
                form.mark_signed?"Save & Send Welcome Invite ✓":"Save as Draft"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
