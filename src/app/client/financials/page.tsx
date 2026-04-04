"use client";
export const dynamic = "force-dynamic";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Transaction = { id:string; type:"income"|"expense"; category:string; amount:number; description:string|null; date:string; property_id:string|null; };
type Property = { property_id:string; nickname:string|null; address:string; };

export default function FinancialsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [accountId, setAccountId] = useState("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [selectedProperty, setSelectedProperty] = useState<"all"|string>("all");
  const [year, setYear] = useState(new Date().getFullYear());
  const [showAddTx, setShowAddTx] = useState(false);
  const [txForm, setTxForm] = useState({type:"income",category:"rent",amount:"",description:"",date:new Date().toISOString().split("T")[0],property_id:""});
  const setTx = (k:string,v:string) => setTxForm(p=>({...p,[k]:v}));
  const [saving, setSaving] = useState(false);

  useEffect(()=>{
    (async()=>{
      const {data:ud} = await supabase.auth.getUser();
      if(!ud.user){location.href="/login";return;}
      const {data:au} = await supabase.from("app_users").select("account_id").eq("user_id",ud.user.id).maybeSingle();
      if(!au){setErr("Not authorized.");setLoading(false);return;}
      setAccountId(au.account_id);
      const {data:props} = await supabase.from("properties").select("property_id,nickname,address").eq("account_id",au.account_id);
      setProperties(props||[]);
      const {data:txs} = await supabase.from("transactions").select("*").eq("account_id",au.account_id).order("date",{ascending:false});
      setTransactions((txs||[]) as Transaction[]);
      setLoading(false);
    })();
  },[]);

  const filtered = useMemo(()=>{
    return transactions.filter(t=>{
      const propOk = selectedProperty==="all"||(t.property_id===selectedProperty);
      const yearOk = new Date(t.date).getFullYear()===year;
      return propOk && yearOk;
    });
  },[transactions,selectedProperty,year]);

  const income = filtered.filter(t=>t.type==="income").reduce((s,t)=>s+Number(t.amount),0);
  const expenses = filtered.filter(t=>t.type==="expense").reduce((s,t)=>s+Number(t.amount),0);
  const net = income - expenses;

  // Monthly breakdown
  const months = Array.from({length:12},(_,i)=>{
    const m = filtered.filter(t=>new Date(t.date).getMonth()===i);
    return { month: new Date(year,i,1).toLocaleDateString("en",{month:"short"}), income:m.filter(t=>t.type==="income").reduce((s,t)=>s+Number(t.amount),0), expenses:m.filter(t=>t.type==="expense").reduce((s,t)=>s+Number(t.amount),0) };
  });

  // Tax estimate (simplified)
  const federalRate = income > 89075 ? 0.24 : income > 41775 ? 0.22 : income > 10275 ? 0.12 : 0.10;
  const stateRate = 0.05; // avg estimate
  const taxableIncome = Math.max(0, income - expenses);
  const estimatedFederal = taxableIncome * federalRate;
  const estimatedState = taxableIncome * stateRate;
  const totalTaxEstimate = estimatedFederal + estimatedState;

  async function saveTx() {
    if(!txForm.amount){setErr("Amount is required.");return;}
    setSaving(true);
    await supabase.from("transactions").insert({
      account_id:accountId, property_id:txForm.property_id||null,
      type:txForm.type, category:txForm.category, amount:parseFloat(txForm.amount),
      description:txForm.description||null, date:txForm.date,
    });
    const {data:txs} = await supabase.from("transactions").select("*").eq("account_id",accountId).order("date",{ascending:false});
    setTransactions((txs||[]) as Transaction[]);
    setShowAddTx(false);
    setSaving(false);
  }

  if(loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full"/></div>;

  const ic = "w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500/20";

  return (
    <div>
      <div className="flex items-start justify-between mb-8">
        <div><h1 className="text-3xl font-bold text-neutral-900">Financial Hub</h1><p className="text-neutral-500 mt-1">Income, expenses, forecasting, and tax planning</p></div>
        <div className="flex gap-2">
          <button onClick={()=>setShowAddTx(true)} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700">+ Transaction</button>
          <button className="flex items-center gap-2 border border-neutral-200 bg-white text-neutral-700 px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-neutral-50">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Export
          </button>
        </div>
      </div>
      {err && <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{err}</div>}

      {/* Filters */}
      <div className="flex gap-3 mb-6">
        <select className="rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/20" value={selectedProperty} onChange={e=>setSelectedProperty(e.target.value)}>
          <option value="all">All Properties</option>
          {properties.map(p=><option key={p.property_id} value={p.property_id}>{p.nickname||p.address}</option>)}
        </select>
        <select className="rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm outline-none" value={year} onChange={e=>setYear(parseInt(e.target.value))}>
          {[2024,2025,2026,2027].map(y=><option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {/* Big 3 KPIs */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-5">
          <div className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1">Total Income</div>
          <div className="text-4xl font-bold text-green-600">${income.toLocaleString()}</div>
          <div className="text-xs text-neutral-400 mt-1">{year} year to date</div>
        </div>
        <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-5">
          <div className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1">Total Expenses</div>
          <div className="text-4xl font-bold text-red-500">${expenses.toLocaleString()}</div>
          <div className="text-xs text-neutral-400 mt-1">{year} year to date</div>
        </div>
        <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-5">
          <div className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1">Net Cash Flow</div>
          <div className={`text-4xl font-bold ${net>=0?"text-green-600":"text-red-500"}`}>{net>=0?"+":""} ${Math.abs(net).toLocaleString()}</div>
          <div className="text-xs text-neutral-400 mt-1">{year} year to date</div>
        </div>
      </div>

      {/* Monthly chart */}
      <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-5 mb-6">
        <div className="text-sm font-bold text-neutral-700 mb-4">Monthly Breakdown — {year}</div>
        <div className="grid grid-cols-12 gap-1 items-end" style={{height:120}}>
          {months.map((m,i)=>{
            const maxVal = Math.max(...months.map(x=>Math.max(x.income,x.expenses)),1);
            return (
              <div key={i} className="flex flex-col items-center gap-0.5">
                <div className="w-full flex gap-0.5 items-end" style={{height:90}}>
                  <div className="flex-1 bg-green-400 rounded-sm transition-all" style={{height:`${(m.income/maxVal)*100}%`,minHeight:m.income>0?4:0}}/>
                  <div className="flex-1 bg-red-300 rounded-sm transition-all" style={{height:`${(m.expenses/maxVal)*100}%`,minHeight:m.expenses>0?4:0}}/>
                </div>
                <div className="text-xs text-neutral-400">{m.month}</div>
              </div>
            );
          })}
        </div>
        <div className="flex items-center gap-4 mt-2 text-xs text-neutral-500">
          <span className="flex items-center gap-1"><span className="w-3 h-3 bg-green-400 rounded-sm inline-block"/>Income</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 bg-red-300 rounded-sm inline-block"/>Expenses</span>
        </div>
      </div>

      {/* Tax Estimator */}
      <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-2xl border border-purple-200 shadow-sm p-5 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="text-sm font-bold text-purple-900">Tax Estimator — {year}</div>
            <div className="text-xs text-purple-700 mt-0.5">Estimated based on rental income and expenses</div>
          </div>
          <span className="text-xs bg-yellow-100 text-yellow-800 border border-yellow-200 px-2 py-1 rounded-lg font-medium">⚠ Consult a CPA — estimates only</span>
        </div>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <div className="text-xs text-neutral-500 mb-1">Gross Rental Income</div>
            <div className="text-xl font-bold text-neutral-900">${income.toLocaleString()}</div>
          </div>
          <div>
            <div className="text-xs text-neutral-500 mb-1">Deductible Expenses</div>
            <div className="text-xl font-bold text-neutral-900">${expenses.toLocaleString()}</div>
          </div>
          <div>
            <div className="text-xs text-neutral-500 mb-1">Taxable Rental Income</div>
            <div className="text-xl font-bold text-green-700">${taxableIncome.toLocaleString()}</div>
          </div>
          <div>
            <div className="text-xs text-neutral-500 mb-1">Estimated Tax Rate</div>
            <div className="text-xl font-bold text-neutral-900">{((federalRate+stateRate)*100).toFixed(0)}%</div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 flex items-center justify-between border border-purple-100">
          <div>
            <div className="text-xs text-neutral-500">Total Estimated Tax Liability</div>
            <div className="text-2xl font-bold text-red-600">${totalTaxEstimate.toLocaleString(undefined,{maximumFractionDigits:0})}</div>
            <div className="text-xs text-neutral-400 mt-0.5">Federal: ${estimatedFederal.toLocaleString(undefined,{maximumFractionDigits:0})} · State (est): ${estimatedState.toLocaleString(undefined,{maximumFractionDigits:0})}</div>
          </div>
          <div className="text-3xl">🧾</div>
        </div>
        <div className="text-xs text-purple-600 mt-3 bg-purple-100 rounded-lg px-3 py-2">
          <strong>Disclaimer:</strong> These are rough estimates only. Tax laws vary by state and individual situation. Please consult a qualified CPA or tax professional before filing.
        </div>
      </div>

      {/* Recent transactions */}
      <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-5">
        <div className="text-sm font-bold text-neutral-700 mb-4">Transactions</div>
        {filtered.length === 0 ? (
          <div className="text-sm text-neutral-400 text-center py-8">No transactions for the selected period. Click "+ Transaction" to add one.</div>
        ) : (
          <div className="grid gap-2">
            {filtered.slice(0,20).map(t=>(
              <div key={t.id} className="flex items-center justify-between py-2 border-b border-neutral-50 last:border-0">
                <div>
                  <div className="text-sm font-medium text-neutral-900 capitalize">{t.description||t.category}</div>
                  <div className="text-xs text-neutral-400">{new Date(t.date).toLocaleDateString()} · {t.category}</div>
                </div>
                <div className={`text-sm font-bold ${t.type==="income"?"text-green-600":"text-red-500"}`}>
                  {t.type==="income"?"+":"-"}${Number(t.amount).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add transaction modal */}
      {showAddTx && (
        <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 px-4 pb-4 sm:pb-0">
          <div className="bg-white rounded-2xl border border-neutral-200 w-full max-w-md shadow-xl">
            <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between">
              <h3 className="font-bold text-neutral-900">Add Transaction</h3>
              <button onClick={()=>setShowAddTx(false)} className="text-neutral-400 hover:text-neutral-700"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
            </div>
            <div className="px-6 py-5 grid gap-4">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs font-semibold text-neutral-600 mb-1.5">Type</label>
                  <select className={ic} value={txForm.type} onChange={e=>setTx("type",e.target.value)}><option value="income">Income</option><option value="expense">Expense</option></select></div>
                <div><label className="block text-xs font-semibold text-neutral-600 mb-1.5">Category</label>
                  <select className={ic} value={txForm.category} onChange={e=>setTx("category",e.target.value)}>
                    {txForm.type==="income"?["rent","late_fee","deposit","other"].map(c=><option key={c} value={c}>{c}</option>):["repair","maintenance","utilities","insurance","taxes","mortgage","management","supplies","other"].map(c=><option key={c} value={c}>{c}</option>)}
                  </select></div>
              </div>
              <div><label className="block text-xs font-semibold text-neutral-600 mb-1.5">Amount *</label>
                <div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 text-sm">$</span><input className={ic+" pl-7"} type="number" value={txForm.amount} onChange={e=>setTx("amount",e.target.value)}/></div></div>
              <div><label className="block text-xs font-semibold text-neutral-600 mb-1.5">Description</label><input className={ic} value={txForm.description} onChange={e=>setTx("description",e.target.value)}/></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs font-semibold text-neutral-600 mb-1.5">Date</label><input className={ic} type="date" value={txForm.date} onChange={e=>setTx("date",e.target.value)}/></div>
                <div><label className="block text-xs font-semibold text-neutral-600 mb-1.5">Property</label>
                  <select className={ic} value={txForm.property_id} onChange={e=>setTx("property_id",e.target.value)}>
                    <option value="">All / General</option>
                    {properties.map(p=><option key={p.property_id} value={p.property_id}>{p.nickname||p.address}</option>)}
                  </select></div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-neutral-100 flex gap-3">
              <button onClick={()=>setShowAddTx(false)} className="flex-1 border border-neutral-200 text-neutral-700 px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-neutral-50">Cancel</button>
              <button onClick={saveTx} disabled={saving} className="flex-1 bg-blue-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50">{saving?"Saving...":"Save"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
