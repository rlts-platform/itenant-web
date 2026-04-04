"use client";
export const dynamic = "force-dynamic";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Preset = {
  id: string; name: string; description: string | null; category: string;
  trigger_event: string; trigger_offset_days: number; trigger_offset_direction: string;
  default_channels: string[]; default_subject: string | null; default_body: string | null;
  variables: string[]; sort_order: number;
};
type Rule = {
  id: string; name: string; category: string; trigger_event: string;
  trigger_offset_days: number; trigger_offset_direction: string;
  channels: string[]; subject: string | null; body: string | null;
  is_enabled: boolean; fire_count: number; last_fired_at: string | null; preset_id: string | null;
};
const CAT_COLOR: Record<string,string> = {
  rent_payments:"bg-green-50 text-green-700 border-green-200",
  maintenance:"bg-orange-50 text-orange-700 border-orange-200",
  leases:"bg-blue-50 text-blue-700 border-blue-200",
  onboarding:"bg-purple-50 text-purple-700 border-purple-200",
};
const CAT_ICON: Record<string,string> = { rent_payments:"💰", maintenance:"🔧", leases:"📄", onboarding:"👋" };
const CAT_LABEL: Record<string,string> = { rent_payments:"Rent & Payments", maintenance:"Maintenance", leases:"Leases", onboarding:"Onboarding" };

export default function AutomationsPage() {
  const [presets, setPresets] = useState<Preset[]>([]);
  const [rules, setRules] = useState<Rule[]>([]);
  const [accountId, setAccountId] = useState("");
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"rules"|"presets">("rules");
  const [editingRule, setEditingRule] = useState<Rule|null>(null);
  const [selectedPreset, setSelectedPreset] = useState<Preset|null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(()=>{
    (async()=>{
      const {data:ud} = await supabase.auth.getUser();
      if(!ud.user){location.href="/login";return;}
      const {data:au} = await supabase.from("app_users").select("account_id").eq("user_id",ud.user.id).maybeSingle();
      if(!au){setLoading(false);return;}
      setAccountId(au.account_id);
      const {data:p} = await supabase.from("automation_presets").select("*").order("sort_order");
      setPresets((p||[]) as Preset[]);
      const {data:r} = await supabase.from("automation_rules").select("*").eq("account_id",au.account_id).order("created_at",{ascending:false});
      setRules((r||[]) as Rule[]);
      setLoading(false);
    })();
  },[]);

  async function activatePreset(preset:Preset) {
    setSaving(true);
    const {data:rule} = await supabase.from("automation_rules").insert({
      account_id:accountId, preset_id:preset.id, name:preset.name, category:preset.category,
      trigger_event:preset.trigger_event, trigger_offset_days:preset.trigger_offset_days,
      trigger_offset_direction:preset.trigger_offset_direction, channels:preset.default_channels,
      subject:preset.default_subject, body:preset.default_body, is_enabled:true,
    }).select().single();
    if(rule) setRules(p=>[rule as Rule,...p]);
    setSelectedPreset(null);
    showToast(`"${preset.name}" activated ✓`);
    setSaving(false);
  }

  async function saveRule(rule:Rule) {
    setSaving(true);
    await supabase.from("automation_rules").update({
      name:rule.name, channels:rule.channels, subject:rule.subject, body:rule.body,
      trigger_offset_days:rule.trigger_offset_days, trigger_offset_direction:rule.trigger_offset_direction,
    }).eq("id",rule.id);
    setRules(p=>p.map(r=>r.id===rule.id?rule:r));
    setEditingRule(null);
    showToast("Rule saved ✓");
    setSaving(false);
  }

  async function toggleRule(id:string, enabled:boolean) {
    await supabase.from("automation_rules").update({is_enabled:!enabled}).eq("id",id);
    setRules(p=>p.map(r=>r.id===id?{...r,is_enabled:!enabled}:r));
  }

  async function deleteRule(id:string) {
    await supabase.from("automation_rules").delete().eq("id",id);
    setRules(p=>p.filter(r=>r.id!==id));
    showToast("Rule deleted");
  }

  function showToast(msg:string){setToast(msg);setTimeout(()=>setToast(""),3000);}
  const grouped = presets.reduce((acc,p)=>{acc[p.category]=[...(acc[p.category]||[]),p];return acc;},{} as Record<string,Preset[]>);
  const activeEmail = rules.filter(r=>r.is_enabled&&r.channels?.includes("email")).length;
  const activeSMS = rules.filter(r=>r.is_enabled&&r.channels?.includes("sms")).length;

  if(loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full"/></div>;

  return (
    <div>
      <div className="flex items-start justify-between mb-8">
        <div><h1 className="text-3xl font-bold text-neutral-900">Automations</h1><p className="text-neutral-500 mt-1">Automate rent reminders, maintenance updates, and tenant communications</p></div>
        <button onClick={()=>setView(view==="rules"?"presets":"rules")} className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700">
          {view==="rules"?"⚡ Browse Presets":"← My Rules"}
        </button>
      </div>
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          {icon:"📧",label:"Email Rules Active",value:activeEmail,color:"bg-blue-50 border-blue-100 text-blue-600"},
          {icon:"💬",label:"SMS Rules Active",value:activeSMS,color:"bg-green-50 border-green-100 text-green-600"},
          {icon:"⚡",label:"Total Active",value:rules.filter(r=>r.is_enabled).length,color:"bg-purple-50 border-purple-100 text-purple-600"},
        ].map(s=>(
          <div key={s.label} className={`rounded-2xl border p-5 shadow-sm ${s.color}`}>
            <div className="text-2xl mb-1">{s.icon}</div>
            <div className="text-3xl font-bold">{s.value}</div>
            <div className="text-sm text-neutral-600 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {view==="rules" && (
        rules.length===0 ? (
          <div className="bg-white rounded-2xl border border-neutral-200 p-12 text-center shadow-sm">
            <div className="text-5xl mb-3">⚡</div>
            <h2 className="text-lg font-bold text-neutral-900">No automations yet</h2>
            <p className="text-neutral-500 text-sm mt-1 mb-6 max-w-sm mx-auto">Browse preset templates to set up automations in seconds.</p>
            <button onClick={()=>setView("presets")} className="bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 mx-auto flex items-center gap-2">⚡ Browse Presets</button>
          </div>
        ) : (
          <div className="grid gap-3">
            {rules.map(r=>(
              <div key={r.id} className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-5 flex items-center gap-4">
                <div className="text-xl shrink-0">{CAT_ICON[r.category]||"⚡"}</div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-neutral-900">{r.name}</div>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className={`text-xs border px-2 py-0.5 rounded-full ${CAT_COLOR[r.category]||"bg-neutral-100 text-neutral-600 border-neutral-200"}`}>{CAT_LABEL[r.category]||r.category}</span>
                    <span className="text-xs text-neutral-500">Trigger: {r.trigger_event.replace(/_/g," ")}{r.trigger_offset_days>0?` · ${r.trigger_offset_days}d ${r.trigger_offset_direction}`:""}</span>
                    {r.channels?.map(c=><span key={c} className={`text-xs border px-2 py-0.5 rounded-full capitalize ${c==="email"?"bg-blue-50 text-blue-600 border-blue-200":"bg-green-50 text-green-600 border-green-200"}`}>{c}</span>)}
                    {r.fire_count>0 && <span className="text-xs text-neutral-400">Fired {r.fire_count}×</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={()=>setEditingRule({...r})} className="text-xs font-semibold text-neutral-600 border border-neutral-200 px-3 py-1.5 rounded-lg hover:bg-neutral-50">Edit</button>
                  <button onClick={()=>toggleRule(r.id,r.is_enabled)} className={`w-11 h-6 rounded-full transition-colors relative ${r.is_enabled?"bg-green-500":"bg-neutral-200"}`}>
                    <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-all ${r.is_enabled?"left-5":"left-0.5"}`}/>
                  </button>
                  <button onClick={()=>deleteRule(r.id)} className="text-xs text-red-500 border border-red-100 px-2.5 py-1.5 rounded-lg hover:bg-red-50">✕</button>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {view==="presets" && (
        <div>
          <div className="mb-5 p-4 bg-blue-50 border border-blue-200 rounded-2xl text-sm text-blue-800">
            <strong>16 Preset Templates</strong> — Activate in one click. Use <code className="bg-blue-100 px-1 rounded">{"{{tenant_name}}"}</code> variables that auto-fill at send time. Fully customizable after activation.
          </div>
          {Object.entries(grouped).map(([cat,items])=>(
            <div key={cat} className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-xl">{CAT_ICON[cat]||"⚡"}</span>
                <h2 className="font-bold text-neutral-900">{CAT_LABEL[cat]||cat}</h2>
                <span className={`text-xs border px-2 py-0.5 rounded-full ${CAT_COLOR[cat]||"bg-neutral-100 text-neutral-600 border-neutral-200"}`}>{items.length} presets</span>
              </div>
              <div className="grid gap-3">
                {items.map(p=>{
                  const alreadyActive = rules.some(r=>r.preset_id===p.id&&r.is_enabled);
                  return (
                    <div key={p.id} className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-5 flex items-start gap-4">
                      <div className="flex-1">
                        <div className="font-semibold text-neutral-900">{p.name}</div>
                        {p.description&&<div className="text-xs text-neutral-500 mt-0.5">{p.description}</div>}
                        <div className="flex flex-wrap gap-2 mt-2">
                          {p.default_channels?.map(c=><span key={c} className={`text-xs border px-2 py-0.5 rounded-full capitalize ${c==="email"?"bg-blue-50 text-blue-600 border-blue-200":"bg-green-50 text-green-600 border-green-200"}`}>{c}</span>)}
                          <span className="text-xs text-neutral-400">Trigger: {p.trigger_event.replace(/_/g," ")}{p.trigger_offset_days>0?` · ${p.trigger_offset_days}d ${p.trigger_offset_direction}`:""}</span>
                        </div>
                      </div>
                      {alreadyActive ? <span className="text-xs text-green-600 font-semibold shrink-0 mt-1">✓ Active</span> :
                        <button onClick={()=>setSelectedPreset(p)} className="text-xs font-semibold bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 shrink-0">Activate</button>}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedPreset&&(
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl border border-neutral-200 w-full max-w-lg shadow-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between">
              <h3 className="font-bold text-neutral-900">Activate: {selectedPreset.name}</h3>
              <button onClick={()=>setSelectedPreset(null)} className="text-neutral-400 hover:text-neutral-700"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
            </div>
            <div className="px-6 py-5 grid gap-3">
              {selectedPreset.description&&<p className="text-sm text-neutral-500">{selectedPreset.description}</p>}
              {selectedPreset.default_subject&&<div className="bg-neutral-50 rounded-xl p-3"><div className="text-xs font-semibold text-neutral-500 mb-1">Subject:</div><div className="text-sm text-neutral-800">{selectedPreset.default_subject}</div></div>}
              {selectedPreset.default_body&&<div className="bg-neutral-50 rounded-xl p-3"><div className="text-xs font-semibold text-neutral-500 mb-1">Body:</div><div className="text-xs text-neutral-700 whitespace-pre-wrap">{selectedPreset.default_body}</div></div>}
              <p className="text-xs text-neutral-400">You can customize the message after activating by clicking "Edit" on the rule.</p>
            </div>
            <div className="px-6 py-4 border-t border-neutral-100 flex gap-3">
              <button onClick={()=>setSelectedPreset(null)} className="flex-1 border border-neutral-200 text-neutral-700 px-4 py-2.5 rounded-xl text-sm font-semibold">Cancel</button>
              <button onClick={()=>activatePreset(selectedPreset)} disabled={saving} className="flex-1 bg-blue-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50">{saving?"Activating...":"⚡ Activate"}</button>
            </div>
          </div>
        </div>
      )}

      {editingRule&&(
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl border border-neutral-200 w-full max-w-lg shadow-xl overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between">
              <h3 className="font-bold text-neutral-900">Edit Rule</h3>
              <button onClick={()=>setEditingRule(null)} className="text-neutral-400 hover:text-neutral-700"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
            </div>
            <div className="px-6 py-5 grid gap-4">
              <div><label className="block text-xs font-semibold text-neutral-600 mb-1.5">Rule Name</label><input className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500/20" value={editingRule.name} onChange={e=>setEditingRule(p=>p?{...p,name:e.target.value}:p)}/></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs font-semibold text-neutral-600 mb-1.5">Offset Days</label><input type="number" min="0" className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500/20" value={editingRule.trigger_offset_days} onChange={e=>setEditingRule(p=>p?{...p,trigger_offset_days:parseInt(e.target.value)||0}:p)}/></div>
                <div><label className="block text-xs font-semibold text-neutral-600 mb-1.5">Direction</label>
                  <select className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer" value={editingRule.trigger_offset_direction} onChange={e=>setEditingRule(p=>p?{...p,trigger_offset_direction:e.target.value}:p)}>
                    <option value="before">Before</option><option value="on">On the day</option><option value="after">After</option>
                  </select>
                </div>
              </div>
              <div><div className="text-xs font-semibold text-neutral-600 mb-2">Channels</div>
                <div className="flex gap-2">
                  {["email","sms"].map(c=>(
                    <button key={c} type="button" onClick={()=>setEditingRule(p=>p?{...p,channels:p.channels?.includes(c)?p.channels.filter(x=>x!==c):[...(p.channels||[]),c]}:p)}
                      className={`px-4 py-2 rounded-xl text-xs font-semibold border capitalize transition-all ${editingRule.channels?.includes(c)?"bg-blue-600 text-white border-blue-600":"bg-white text-neutral-600 border-neutral-200 hover:border-blue-300"}`}>{c}</button>
                  ))}
                </div>
              </div>
              {editingRule.channels?.includes("email")&&<div><label className="block text-xs font-semibold text-neutral-600 mb-1.5">Email Subject</label><input className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500/20" value={editingRule.subject||""} onChange={e=>setEditingRule(p=>p?{...p,subject:e.target.value}:p)}/></div>}
              <div><label className="block text-xs font-semibold text-neutral-600 mb-1.5">Message Body</label><textarea className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 resize-none" rows={5} value={editingRule.body||""} onChange={e=>setEditingRule(p=>p?{...p,body:e.target.value}:p)}/><p className="text-xs text-neutral-400 mt-1">Use {"{{tenant_name}}"}, {"{{property_name}}"}, {"{{due_date}}"}, {"{{rent_amount}}"} etc.</p></div>
            </div>
            <div className="px-6 py-4 border-t border-neutral-100 flex gap-3">
              <button onClick={()=>setEditingRule(null)} className="flex-1 border border-neutral-200 text-neutral-700 px-4 py-2.5 rounded-xl text-sm font-semibold">Cancel</button>
              <button onClick={()=>saveRule(editingRule)} disabled={saving} className="flex-1 bg-blue-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50">{saving?"Saving...":"Save Changes"}</button>
            </div>
          </div>
        </div>
      )}
      {toast&&<div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-neutral-900 text-white text-sm font-medium px-5 py-3 rounded-xl shadow-lg z-50">{toast}</div>}
    </div>
  );
}
