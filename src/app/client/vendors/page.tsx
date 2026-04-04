"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Vendor = { id:string; name:string; category:string; contact:string|null; email:string|null; phone:string|null; notes:string|null; rating:number|null; created_at:string; };
const CATS = ["plumber","electrician","hvac","general_contractor","painter","landscaper","pest_control","locksmith","appliance","cleaner","inspector","other"];
const CAT_ICON:Record<string,string> = { plumber:"🔧", electrician:"⚡", hvac:"❄️", general_contractor:"🏗️", painter:"🎨", landscaper:"🌿", pest_control:"🐛", locksmith:"🔐", appliance:"🫙", cleaner:"🧹", inspector:"🔍", other:"🔨" };

export default function VendorsPage() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [accountId, setAccountId] = useState("");
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({name:"",category:"plumber",contact:"",email:"",phone:"",notes:"",rating:""});
  const set = (k:string,v:string) => setForm(p=>({...p,[k]:v}));
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState("all");
  const [toast, setToast] = useState("");

  useEffect(()=>{
    (async()=>{
      const {data:ud} = await supabase.auth.getUser();
      if(!ud.user){location.href="/login";return;}
      const {data:au} = await supabase.from("app_users").select("account_id").eq("user_id",ud.user.id).maybeSingle();
      if(!au){setLoading(false);return;}
      setAccountId(au.account_id);
      const {data:v} = await supabase.from("vendors").select("*").eq("account_id",au.account_id).order("name");
      setVendors(v||[]);
      setLoading(false);
    })();
  },[]);

  async function save() {
    if(!form.name){return;}
    setSaving(true);
    const {data:v} = await supabase.from("vendors").insert({account_id:accountId,...form,rating:form.rating?parseInt(form.rating):null,contact:form.contact||null,email:form.email||null,phone:form.phone||null,notes:form.notes||null}).select().single();
    if(v) setVendors(p=>[...p,v as Vendor]);
    setShowAdd(false);setForm({name:"",category:"plumber",contact:"",email:"",phone:"",notes:"",rating:""});
    setToast("Vendor saved ✓");setTimeout(()=>setToast(""),3000);
    setSaving(false);
  }

  const filtered = filter==="all" ? vendors : vendors.filter(v=>v.category===filter);
  const ic = "w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500/20";

  if(loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full"/></div>;

  return (
    <div>
      <div className="flex items-start justify-between mb-8">
        <div><h1 className="text-3xl font-bold text-neutral-900">Vendors</h1><p className="text-neutral-500 mt-1">Manage your trusted contractors and service providers</p></div>
        <button onClick={()=>setShowAdd(true)} className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 shadow-sm">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add Vendor
        </button>
      </div>

      {/* AI Local Search hint */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-2xl p-4 mb-6 flex items-center gap-3">
        <span className="text-2xl">📍</span>
        <div className="flex-1">
          <div className="font-semibold text-sm text-purple-900">Local Vendor Discovery</div>
          <div className="text-xs text-purple-700 mt-0.5">Your AI Assistant can find rated contractors within 25 miles of any property. Ask it "Find a licensed plumber near Kings Court Townhomes."</div>
        </div>
        <a href="/client/ai-assistant" className="text-xs font-semibold text-purple-600 border border-purple-200 px-3 py-1.5 rounded-lg hover:bg-purple-100 shrink-0">Ask AI →</a>
      </div>

      {/* Category filter */}
      <div className="flex gap-2 flex-wrap mb-6">
        <button onClick={()=>setFilter("all")} className={`px-3 py-1.5 rounded-xl text-xs font-semibold border ${filter==="all"?"bg-blue-600 text-white border-blue-600":"bg-white border-neutral-200 text-neutral-600 hover:bg-neutral-50"}`}>All ({vendors.length})</button>
        {CATS.filter(c=>vendors.some(v=>v.category===c)).map(c=>(
          <button key={c} onClick={()=>setFilter(c)} className={`px-3 py-1.5 rounded-xl text-xs font-semibold border capitalize ${filter===c?"bg-blue-600 text-white border-blue-600":"bg-white border-neutral-200 text-neutral-600 hover:bg-neutral-50"}`}>{CAT_ICON[c]} {c.replace("_"," ")}</button>
        ))}
      </div>

      {vendors.length === 0 ? (
        <div className="bg-white rounded-2xl border border-neutral-200 p-12 text-center shadow-sm">
          <div className="text-4xl mb-3">🔨</div>
          <h2 className="text-lg font-bold text-neutral-900">No vendors yet</h2>
          <p className="text-neutral-500 text-sm mt-1 mb-6">Add your trusted contractors, or use the AI Assistant to find local ones.</p>
          <button onClick={()=>setShowAdd(true)} className="bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 mx-auto flex items-center gap-2">+ Add Vendor</button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {filtered.map(v=>(
            <div key={v.id} className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-5">
              <div className="flex items-start gap-3 mb-3">
                <div className="text-2xl shrink-0">{CAT_ICON[v.category]||"🔨"}</div>
                <div>
                  <div className="font-bold text-neutral-900">{v.name}</div>
                  <div className="text-xs text-neutral-500 capitalize mt-0.5">{v.category.replace("_"," ")}</div>
                  {v.rating && <div className="flex items-center gap-0.5 mt-1">{"★".repeat(v.rating)+"☆".repeat(5-v.rating)}<span className="text-xs text-neutral-400 ml-1">{v.rating}/5</span></div>}
                </div>
              </div>
              <div className="grid gap-1 text-xs text-neutral-600">
                {v.phone && <div className="flex items-center gap-1.5"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.99 12 19.79 19.79 0 0 1 1.86 3.45 2 2 0 0 1 3.84 1.27h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9a16 16 0 0 0 6.91 6.91l1-1a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>{v.phone}</div>}
                {v.email && <div className="flex items-center gap-1.5"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>{v.email}</div>}
                {v.notes && <div className="text-neutral-400 mt-1 italic">{v.notes}</div>}
              </div>
            </div>
          ))}
        </div>
      )}

      {showAdd && (
        <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 px-4 pb-4 sm:pb-0">
          <div className="bg-white rounded-2xl border border-neutral-200 w-full max-w-md shadow-xl">
            <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between">
              <h3 className="font-bold text-neutral-900">Add Vendor</h3>
              <button onClick={()=>setShowAdd(false)} className="text-neutral-400 hover:text-neutral-700"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
            </div>
            <div className="px-6 py-5 grid gap-4">
              <div><label className="block text-xs font-semibold text-neutral-600 mb-1.5">Name *</label><input className={ic} value={form.name} onChange={e=>set("name",e.target.value)}/></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs font-semibold text-neutral-600 mb-1.5">Category</label>
                  <select className={ic} value={form.category} onChange={e=>set("category",e.target.value)}>{CATS.map(c=><option key={c} value={c}>{CAT_ICON[c]} {c.replace("_"," ")}</option>)}</select></div>
                <div><label className="block text-xs font-semibold text-neutral-600 mb-1.5">Rating</label>
                  <select className={ic} value={form.rating} onChange={e=>set("rating",e.target.value)}><option value="">No rating</option>{[1,2,3,4,5].map(r=><option key={r} value={r}>{"★".repeat(r)} {r}/5</option>)}</select></div>
              </div>
              <div><label className="block text-xs font-semibold text-neutral-600 mb-1.5">Phone</label><input className={ic} type="tel" value={form.phone} onChange={e=>set("phone",e.target.value)}/></div>
              <div><label className="block text-xs font-semibold text-neutral-600 mb-1.5">Email</label><input className={ic} type="email" value={form.email} onChange={e=>set("email",e.target.value)}/></div>
              <div><label className="block text-xs font-semibold text-neutral-600 mb-1.5">Notes</label><textarea className={ic+" resize-none"} rows={2} value={form.notes} onChange={e=>set("notes",e.target.value)}/></div>
            </div>
            <div className="px-6 py-4 border-t border-neutral-100 flex gap-3">
              <button onClick={()=>setShowAdd(false)} className="flex-1 border border-neutral-200 text-neutral-700 px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-neutral-50">Cancel</button>
              <button onClick={save} disabled={saving} className="flex-1 bg-blue-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50">{saving?"Saving...":"Save Vendor"}</button>
            </div>
          </div>
        </div>
      )}
      {toast && <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-neutral-900 text-white text-sm font-medium px-5 py-3 rounded-xl shadow-lg z-50">{toast}</div>}
    </div>
  );
}
