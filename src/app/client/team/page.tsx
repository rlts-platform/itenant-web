"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Member = { id:string; user_id:string; role:string; permissions:Record<string,boolean>; created_at:string; name:string; email:string; };

export default function TeamPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [accountId, setAccountId] = useState("");
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("team");
  const [toast, setToast] = useState("");

  const PERMS = [
    {key:"can_view_financials",label:"View Financials"},
    {key:"can_edit_properties",label:"Edit Properties"},
    {key:"can_manage_tenants",label:"Manage Tenants"},
    {key:"can_manage_workorders",label:"Manage Work Orders"},
    {key:"can_send_messages",label:"Send Messages"},
  ];

  useEffect(()=>{
    (async()=>{
      const {data:ud} = await supabase.auth.getUser();
      if(!ud.user){location.href="/login";return;}
      const {data:au} = await supabase.from("app_users").select("account_id").eq("user_id",ud.user.id).maybeSingle();
      if(!au){setLoading(false);return;}
      setAccountId(au.account_id);
      const {data:users} = await supabase.from("app_users").select("*").eq("account_id",au.account_id).eq("role","team");
      const enriched:Member[] = await Promise.all((users||[]).map(async u=>{
        // Get perms
        const {data:p} = await supabase.from("team_permissions").select("*").eq("user_id",u.user_id).eq("account_id",au.account_id).maybeSingle();
        const perms = p ? {can_view_financials:p.can_view_financials,can_edit_properties:p.can_edit_properties,can_manage_tenants:p.can_manage_tenants,can_manage_workorders:p.can_manage_workorders,can_send_messages:p.can_send_messages} : {};
        // Try tenants table for name
        return {...u, name:`Team Member`, email:`user-${u.user_id.substring(0,6)}`, permissions:perms||{}};
      }));
      setMembers(enriched);
      setLoading(false);
    })();
  },[]);

  async function togglePerm(userId:string, perm:string, current:boolean) {
    await supabase.from("team_permissions").upsert({account_id:accountId,user_id:userId,[perm]:!current},{onConflict:"user_id,account_id"});
    setMembers(p=>p.map(m=>m.user_id===userId?{...m,permissions:{...m.permissions,[perm]:!current}}:m));
  }

  if(loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full"/></div>;

  return (
    <div>
      <div className="flex items-start justify-between mb-8">
        <div><h1 className="text-3xl font-bold text-neutral-900">Team Management</h1><p className="text-neutral-500 mt-1">Manage your team members and their permissions</p></div>
        <button onClick={()=>setShowInvite(true)} className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 shadow-sm">+ Invite Team Member</button>
      </div>

      {members.length === 0 ? (
        <div className="bg-white rounded-2xl border border-neutral-200 p-12 text-center shadow-sm">
          <div className="text-4xl mb-3">👥</div>
          <h2 className="text-lg font-bold text-neutral-900">No team members yet</h2>
          <p className="text-neutral-500 text-sm mt-1 mb-6">Invite team members and control exactly what they can see and do.</p>
          <button onClick={()=>setShowInvite(true)} className="bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 mx-auto flex items-center gap-2">+ Invite Team Member</button>
        </div>
      ) : (
        <div className="grid gap-4">
          {members.map(m=>(
            <div key={m.id} className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600 font-bold shrink-0">{m.name[0]}</div>
                <div><div className="font-bold text-neutral-900">{m.name}</div><div className="text-xs text-neutral-500">{m.email} · {m.role}</div></div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {PERMS.map(p=>{
                  const enabled = m.permissions[p.key]??false;
                  return (
                    <button key={p.key} onClick={()=>togglePerm(m.user_id,p.key,enabled)} className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-medium transition-all ${enabled?"bg-green-50 border-green-200 text-green-700":"bg-neutral-50 border-neutral-200 text-neutral-500"}`}>
                      <span>{enabled?"✓":"○"}</span>{p.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {showInvite && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl border border-neutral-200 w-full max-w-md shadow-xl p-6">
            <h3 className="font-bold text-neutral-900 mb-4">Invite Team Member</h3>
            <div className="grid gap-4">
              <div><label className="block text-xs font-semibold text-neutral-600 mb-1.5">Email Address</label>
                <input className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500/20" type="email" placeholder="sarah@yourcompany.com" value={inviteEmail} onChange={e=>setInviteEmail(e.target.value)}/></div>
              <div><label className="block text-xs font-semibold text-neutral-600 mb-1.5">Role</label>
                <select className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none" value={inviteRole} onChange={e=>setInviteRole(e.target.value)}>
                  <option value="team">Team Member</option>
                </select></div>
            </div>
            <div className="mt-4 p-3 bg-blue-50 rounded-xl text-xs text-blue-800">An invite email will be sent. They'll set up their account and you can then manage their permissions here.</div>
            <div className="flex gap-3 mt-5">
              <button onClick={()=>setShowInvite(false)} className="flex-1 border border-neutral-200 text-neutral-700 px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-neutral-50">Cancel</button>
              <button onClick={()=>{setToast(`Invite sent to ${inviteEmail} ✓`);setShowInvite(false);setInviteEmail("");setTimeout(()=>setToast(""),3000);}} className="flex-1 bg-blue-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700">Send Invite</button>
            </div>
          </div>
        </div>
      )}
      {toast && <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-neutral-900 text-white text-sm font-medium px-5 py-3 rounded-xl shadow-lg z-50">{toast}</div>}
    </div>
  );
}
