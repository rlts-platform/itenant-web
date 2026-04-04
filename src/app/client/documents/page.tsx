"use client";
export const dynamic = "force-dynamic";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type Doc = { id:string; file_name:string; category:string; subcategory:string|null; doc_type:string|null; file_url:string; is_draft:boolean; exported_at:string|null; created_at:string; property_id:string|null; tenant_id:string|null; property_name?:string; tenant_name?:string; };
const CATEGORIES = ["lease","lease_renewal","notice","receipt","maintenance","inspection","legal","correspondence","other"];
const CAT_ICON:Record<string,string> = { lease:"📄", lease_renewal:"🔄", notice:"📢", receipt:"🧾", maintenance:"🔧", inspection:"🔍", legal:"⚖️", correspondence:"✉️", other:"📁" };

export default function DocumentsPage() {
  const params = useSearchParams();
  const filterProperty = params.get("property");
  const [docs, setDocs] = useState<Doc[]>([]);
  const [accountId, setAccountId] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState("");
  const [toast, setToast] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [showUpload, setShowUpload] = useState(false);
  const [uploadForm, setUploadForm] = useState({category:"lease",doc_type:"",property_id:filterProperty||""});
  const [uploadFile, setUploadFile] = useState<File|null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [properties, setProperties] = useState<{property_id:string;nickname:string|null;address:string}[]>([]);

  useEffect(()=>{
    (async()=>{
      const {data:ud} = await supabase.auth.getUser();
      if(!ud.user){location.href="/login";return;}
      const {data:au} = await supabase.from("app_users").select("account_id").eq("user_id",ud.user.id).maybeSingle();
      if(!au){setErr("Not authorized.");setLoading(false);return;}
      setAccountId(au.account_id);
      const {data:props} = await supabase.from("properties").select("property_id,nickname,address").eq("account_id",au.account_id);
      setProperties(props||[]);
      await loadDocs(au.account_id);
      setLoading(false);
    })();
  },[]);

  async function loadDocs(acctId:string) {
    let q = supabase.from("documents").select("*").eq("account_id",acctId).order("created_at",{ascending:false});
    if(filterProperty) q = q.eq("property_id",filterProperty);
    const {data:raw} = await q;
    const enriched:Doc[] = await Promise.all((raw||[]).map(async d=>{
      const {data:p} = d.property_id ? await supabase.from("properties").select("nickname,address").eq("property_id",d.property_id).maybeSingle() : {data:null};
      const {data:t} = d.tenant_id ? await supabase.from("tenants").select("first_name,last_name").eq("tenant_id",d.tenant_id).maybeSingle() : {data:null};
      return {...d, property_name:p?.nickname||p?.address, tenant_name:t?`${t.first_name} ${t.last_name}`:undefined};
    }));
    setDocs(enriched);
  }

  async function handleUpload() {
    if(!uploadFile){setErr("Please select a file.");return;}
    setUploading(true);setErr("");
    const ext = uploadFile.name.split(".").pop();
    const path = `docs/${accountId}/${uploadForm.category}/${Date.now()}-${uploadFile.name}`;
    const {error:upErr} = await supabase.storage.from("documents").upload(path,uploadFile,{upsert:true});
    if(upErr){setErr(upErr.message);setUploading(false);return;}
    const {data:urlData} = supabase.storage.from("documents").getPublicUrl(path);
    await supabase.from("documents").insert({
      account_id:accountId, property_id:uploadForm.property_id||null,
      category:uploadForm.category, doc_type:uploadForm.doc_type||null,
      file_url:urlData.publicUrl, file_name:uploadFile.name,
      file_size:uploadFile.size, is_draft:false,
    });
    await loadDocs(accountId);
    setShowUpload(false);setUploadFile(null);
    setToast("Document uploaded and categorized ✓");
    setTimeout(()=>setToast(""),3000);
    setUploading(false);
  }

  const filtered = activeCategory==="all" ? docs : docs.filter(d=>d.category===activeCategory);
  const counts = CATEGORIES.reduce((acc,c)=>({...acc,[c]:docs.filter(d=>d.category===c).length}),{} as Record<string,number>);

  if(loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full"/></div>;
  const ic = "w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500/20";

  return (
    <div>
      <div className="flex items-start justify-between mb-8">
        <div><h1 className="text-3xl font-bold text-neutral-900">Documents</h1><p className="text-neutral-500 mt-1">All documents auto-organized by type. Nothing is ever deleted without export.</p></div>
        <button onClick={()=>setShowUpload(true)} className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 shadow-sm">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Upload Document
        </button>
      </div>
      {err && <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{err}</div>}

      {/* Category folders */}
      <div className="grid grid-cols-5 gap-3 mb-6">
        <button onClick={()=>setActiveCategory("all")} className={`bg-white rounded-2xl border p-4 text-center shadow-sm hover:shadow-md transition-all ${activeCategory==="all"?"border-blue-400 bg-blue-50":""}`}>
          <div className="text-2xl mb-1">🗂️</div>
          <div className="text-xs font-semibold text-neutral-700">All</div>
          <div className="text-lg font-bold text-neutral-900">{docs.length}</div>
        </button>
        {CATEGORIES.map(c=>(
          <button key={c} onClick={()=>setActiveCategory(c)} className={`bg-white rounded-2xl border p-4 text-center shadow-sm hover:shadow-md transition-all ${activeCategory===c?"border-blue-400 bg-blue-50":""}`}>
            <div className="text-2xl mb-1">{CAT_ICON[c]}</div>
            <div className="text-xs font-semibold text-neutral-700 capitalize">{c.replace("_"," ")}</div>
            <div className="text-lg font-bold text-neutral-900">{counts[c]||0}</div>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-neutral-200 p-10 text-center shadow-sm">
          <div className="text-4xl mb-3">{activeCategory==="all"?"📁":CAT_ICON[activeCategory]}</div>
          <p className="text-neutral-500 text-sm">No documents in this category yet.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map(d=>(
            <div key={d.id} className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-4 flex items-center gap-4">
              <div className="text-2xl shrink-0">{CAT_ICON[d.category]||"📄"}</div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-neutral-900 truncate">{d.file_name}</div>
                <div className="text-xs text-neutral-500 mt-0.5 flex gap-3">
                  <span className="capitalize">{d.category.replace("_"," ")}</span>
                  {d.property_name && <span>· {d.property_name}</span>}
                  {d.tenant_name && <span>· {d.tenant_name}</span>}
                  <span>· {new Date(d.created_at).toLocaleDateString()}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <a href={d.file_url} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-blue-600 border border-blue-200 bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100">View</a>
                <a href={d.file_url} download={d.file_name} className="text-xs font-semibold text-neutral-600 border border-neutral-200 px-3 py-1.5 rounded-lg hover:bg-neutral-50">Download</a>
              </div>
            </div>
          ))}
        </div>
      )}

      {showUpload && (
        <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 px-4 pb-4 sm:pb-0">
          <div className="bg-white rounded-2xl border border-neutral-200 w-full max-w-md shadow-xl">
            <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between">
              <h3 className="font-bold text-neutral-900">Upload Document</h3>
              <button onClick={()=>setShowUpload(false)} className="text-neutral-400 hover:text-neutral-700"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
            </div>
            <div className="px-6 py-5 grid gap-4">
              <div className="border-2 border-dashed border-neutral-200 rounded-xl p-5 text-center cursor-pointer hover:border-blue-400" onClick={()=>fileRef.current?.click()}>
                {uploadFile ? <div className="text-sm text-green-600 font-semibold">✓ {uploadFile.name}</div> : <>
                  <div className="text-3xl mb-2">📤</div>
                  <div className="text-sm text-neutral-600 font-medium">Tap to upload or take a photo</div>
                  <div className="text-xs text-neutral-400 mt-1">PDF, JPG, PNG supported</div>
                </>}
                <input ref={fileRef} type="file" accept=".pdf,image/*" capture="environment" className="hidden" onChange={e=>setUploadFile(e.target.files?.[0]??null)}/>
              </div>
              <div><label className="block text-xs font-semibold text-neutral-600 mb-1.5">Category (auto-assigns folder)</label>
                <select className={ic} value={uploadForm.category} onChange={e=>setUploadForm(p=>({...p,category:e.target.value}))}>
                  {CATEGORIES.map(c=><option key={c} value={c}>{CAT_ICON[c]} {c.replace("_"," ")}</option>)}
                </select></div>
              <div><label className="block text-xs font-semibold text-neutral-600 mb-1.5">Property (optional)</label>
                <select className={ic} value={uploadForm.property_id} onChange={e=>setUploadForm(p=>({...p,property_id:e.target.value}))}>
                  <option value="">General / All Properties</option>
                  {properties.map(p=><option key={p.property_id} value={p.property_id}>{p.nickname||p.address}</option>)}
                </select></div>
            </div>
            <div className="px-6 py-4 border-t border-neutral-100 flex gap-3">
              <button onClick={()=>setShowUpload(false)} className="flex-1 border border-neutral-200 text-neutral-700 px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-neutral-50">Cancel</button>
              <button onClick={handleUpload} disabled={uploading} className="flex-1 bg-blue-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50">{uploading?"Uploading...":"Upload"}</button>
            </div>
          </div>
        </div>
      )}
      {toast && <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-neutral-900 text-white text-sm font-medium px-5 py-3 rounded-xl shadow-lg z-50">{toast}</div>}
    </div>
  );
}
