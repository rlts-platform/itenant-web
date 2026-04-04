"use client";
export const dynamic = "force-dynamic";
"use client";
export const dynamic = "force-dynamic";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

const ic = "w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all";
const AMENITIES_LIST = ["Air Conditioning","Dishwasher","In-unit Laundry","Balcony","Hardwood Floors","Garage Parking","Storage","Pool Access","Gym Access","Pet Door"];
const UTILITIES_LIST = ["Water","Gas","Electric","Internet","Trash","Sewer"];

export default function NewUnitPage() {
  const router = useRouter();
  const params = useSearchParams();
  const prefillProperty = params.get("property") || "";
  const editId = params.get("edit") || "";
  const [properties, setProperties] = useState<{property_id:string;nickname:string|null;address:string}[]>([]);
  const [accountId, setAccountId] = useState("");
  const [saving, setSaving] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [err, setErr] = useState("");
  const [form, setForm] = useState({
    property_id: prefillProperty, unit_number:"", bedrooms:"", bathrooms:"", sqft:"",
    rent_amount:"", deposit_amount:"", status:"vacant", pet_friendly:false as boolean,
    parking_spaces:"0", available_date:"", notes:"",
    amenities:[] as string[], utilities_included:[] as string[],
  });
  const set = (k:string,v:string|boolean|string[]) => setForm(p=>({...p,[k]:v}));
  const toggleArr = (k:"amenities"|"utilities_included", val:string) => setForm(p=>({...p,[k]:p[k].includes(val)?p[k].filter(x=>x!==val):[...p[k],val]}));

  useEffect(()=>{
    (async()=>{
      const {data:ud} = await supabase.auth.getUser();
      if(!ud.user){location.href="/login";return;}
      const {data:au} = await supabase.from("app_users").select("account_id").eq("user_id",ud.user.id).maybeSingle();
      if(!au)return;
      setAccountId(au.account_id);
      const {data:props} = await supabase.from("properties").select("property_id,nickname,address").eq("account_id",au.account_id).order("created_at");
      setProperties(props||[]);
      if(editId){
        setIsEdit(true);
        const {data:unit} = await supabase.from("units").select("*").eq("unit_id",editId).single();
        if(unit) setForm({
          property_id:unit.property_id, unit_number:unit.unit_number||"",
          bedrooms:unit.bedrooms?.toString()||"", bathrooms:unit.bathrooms?.toString()||"",
          sqft:unit.sqft?.toString()||"", rent_amount:unit.rent_amount?.toString()||"",
          deposit_amount:unit.deposit_amount?.toString()||"", status:unit.status||"vacant",
          pet_friendly:unit.pet_friendly||false, parking_spaces:unit.parking_spaces?.toString()||"0",
          available_date:unit.available_date||"", notes:unit.notes||"",
          amenities:unit.amenities||[], utilities_included:unit.utilities_included||[],
        });
      }
    })();
  },[editId]);

  async function handleSubmit() {
    setErr("");
    if(!form.property_id){setErr("Please select a property.");return;}
    setSaving(true);
    const payload = {
      property_id:form.property_id, account_id:accountId,
      unit_number:form.unit_number||null,
      bedrooms:form.bedrooms?parseInt(form.bedrooms):null,
      bathrooms:form.bathrooms?parseFloat(form.bathrooms):null,
      sqft:form.sqft?parseInt(form.sqft):null,
      rent_amount:form.rent_amount?parseFloat(form.rent_amount):null,
      deposit_amount:form.deposit_amount?parseFloat(form.deposit_amount):null,
      status:form.status, pet_friendly:form.pet_friendly,
      parking_spaces:parseInt(form.parking_spaces)||0,
      available_date:form.available_date||null, notes:form.notes||null,
      amenities:form.amenities, utilities_included:form.utilities_included,
    };
    if(isEdit) await supabase.from("units").update(payload).eq("unit_id",editId);
    else await supabase.from("units").insert(payload);
    router.push("/client/units");
  }

  return (
    <div>
      <div className="flex items-center gap-4 mb-8">
        <Link href="/client/units"><button className="w-9 h-9 flex items-center justify-center rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg></button></Link>
        <div><h1 className="text-3xl font-bold text-neutral-900">{isEdit?"Edit Unit":"Add Unit"}</h1><p className="text-neutral-500 mt-0.5">Configure unit details, pricing and amenities</p></div>
      </div>
      <div className="max-w-2xl">
        {err&&<div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{err}</div>}
        <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-neutral-100 bg-neutral-50"><h2 className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Basic Info</h2></div>
          <div className="px-6 py-5 grid gap-4">
            <div><label className="block text-xs font-semibold text-neutral-600 mb-1.5">Property *</label>
              <select className={ic+" cursor-pointer"} value={form.property_id} onChange={e=>set("property_id",e.target.value)}>
                <option value="">Select a property...</option>
                {properties.map(p=><option key={p.property_id} value={p.property_id}>{p.nickname||p.address}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-xs font-semibold text-neutral-600 mb-1.5">Unit Number / Name</label><input className={ic} placeholder="e.g. 1A, 101, Upstairs" value={form.unit_number} onChange={e=>set("unit_number",e.target.value)}/></div>
              <div><label className="block text-xs font-semibold text-neutral-600 mb-1.5">Status</label>
                <select className={ic+" cursor-pointer"} value={form.status} onChange={e=>set("status",e.target.value)}>
                  <option value="vacant">Vacant</option><option value="occupied">Occupied</option><option value="maintenance">Maintenance</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><label className="block text-xs font-semibold text-neutral-600 mb-1.5">Bedrooms</label><input type="number" min="0" className={ic} placeholder="3" value={form.bedrooms} onChange={e=>set("bedrooms",e.target.value)}/></div>
              <div><label className="block text-xs font-semibold text-neutral-600 mb-1.5">Bathrooms</label><input type="number" min="0" step="0.5" className={ic} placeholder="2.5" value={form.bathrooms} onChange={e=>set("bathrooms",e.target.value)}/></div>
              <div><label className="block text-xs font-semibold text-neutral-600 mb-1.5">Sq Ft</label><input type="number" className={ic} placeholder="1200" value={form.sqft} onChange={e=>set("sqft",e.target.value)}/></div>
            </div>
          </div>
          <div className="px-6 py-4 border-t border-neutral-100 bg-neutral-50"><h2 className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Pricing</h2></div>
          <div className="px-6 py-5 grid grid-cols-2 gap-4">
            <div><label className="block text-xs font-semibold text-neutral-600 mb-1.5">Monthly Rent ($)</label><input type="number" className={ic} placeholder="2100.00" value={form.rent_amount} onChange={e=>set("rent_amount",e.target.value)}/></div>
            <div><label className="block text-xs font-semibold text-neutral-600 mb-1.5">Security Deposit ($)</label><input type="number" className={ic} placeholder="2100.00" value={form.deposit_amount} onChange={e=>set("deposit_amount",e.target.value)}/></div>
            <div><label className="block text-xs font-semibold text-neutral-600 mb-1.5">Available Date</label><input type="date" className={ic} value={form.available_date} onChange={e=>set("available_date",e.target.value)}/></div>
            <div><label className="block text-xs font-semibold text-neutral-600 mb-1.5">Parking Spaces</label><input type="number" min="0" className={ic} value={form.parking_spaces} onChange={e=>set("parking_spaces",e.target.value)}/></div>
          </div>
          <div className="px-6 py-4 border-t border-neutral-100 bg-neutral-50"><h2 className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Features & Amenities</h2></div>
          <div className="px-6 py-5 grid gap-4">
            <div className="flex items-center justify-between p-3 bg-neutral-50 border border-neutral-200 rounded-xl">
              <span className="text-sm font-medium text-neutral-900">🐾 Pet Friendly</span>
              <button type="button" onClick={()=>set("pet_friendly",!form.pet_friendly)} className={`w-11 h-6 rounded-full transition-colors relative ${form.pet_friendly?"bg-blue-600":"bg-neutral-200"}`}>
                <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-all ${form.pet_friendly?"left-5":"left-0.5"}`}/>
              </button>
            </div>
            <div><div className="text-xs font-semibold text-neutral-600 mb-2">Utilities Included</div>
              <div className="flex flex-wrap gap-2">{UTILITIES_LIST.map(u=><button key={u} type="button" onClick={()=>toggleArr("utilities_included",u)} className={`text-xs px-3 py-1.5 rounded-xl border font-medium transition-all ${form.utilities_included.includes(u)?"bg-blue-600 text-white border-blue-600":"bg-white text-neutral-600 border-neutral-200 hover:border-blue-300"}`}>{u}</button>)}</div>
            </div>
            <div><div className="text-xs font-semibold text-neutral-600 mb-2">Amenities</div>
              <div className="flex flex-wrap gap-2">{AMENITIES_LIST.map(a=><button key={a} type="button" onClick={()=>toggleArr("amenities",a)} className={`text-xs px-3 py-1.5 rounded-xl border font-medium transition-all ${form.amenities.includes(a)?"bg-blue-600 text-white border-blue-600":"bg-white text-neutral-600 border-neutral-200 hover:border-blue-300"}`}>{a}</button>)}</div>
            </div>
            <div><label className="block text-xs font-semibold text-neutral-600 mb-1.5">Notes</label><textarea className={ic+" resize-none"} rows={2} value={form.notes} onChange={e=>set("notes",e.target.value)} placeholder="Any additional notes..."/></div>
          </div>
          <div className="px-6 py-4 border-t border-neutral-100 bg-neutral-50 flex items-center justify-between">
            <Link href="/client/units"><button className="border border-neutral-200 bg-white text-neutral-700 px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-neutral-50">Cancel</button></Link>
            <button onClick={handleSubmit} disabled={saving} className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50">
              {saving?<><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"/>{isEdit?"Saving...":"Adding..."}</>:isEdit?"Save Changes":"Add Unit"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
