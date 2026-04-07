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
  const [tab, setTab] = useState<"trends"|"forecast"|"categories"|"invoices"|"recurring"|"payments"|"all_records"|"banking"|"budgets"|"taxes"|"reports">("trends");
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

      {/* TAB BAR */}
      <div className="flex gap-1 flex-wrap bg-white border border-neutral-200 rounded-2xl p-1.5 shadow-sm mb-6 overflow-x-auto">
        {([
          {key:"trends",label:"Trends"},
          {key:"forecast",label:"AI Forecast"},
          {key:"categories",label:"Categories"},
          {key:"reports",label:"Reports"},
          {key:"invoices",label:"Invoices"},
          {key:"budgets",label:"Budgets"},
          {key:"recurring",label:"Recurring"},
          {key:"payments",label:"Payments"},
          {key:"banking",label:"Banking"},
          {key:"taxes",label:"Taxes"},
          {key:"all_records",label:"All Records"},
        ] as const).map(t=>(
          <button key={t.key} onClick={()=>setTab(t.key)}
            className={`px-4 py-2 text-sm font-semibold rounded-xl transition-all whitespace-nowrap ${tab===t.key?"bg-purple-600 text-white":"text-neutral-600 hover:bg-neutral-100"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── TRENDS TAB ── */}
      {tab === "trends" && (<div>
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

      </div>)} {/* END TRENDS TAB */}

      {/* ── CATEGORIES TAB ── */}
      {tab === "categories" && (
        <div className="grid md:grid-cols-2 gap-6">
          {/* Income Categories */}
          <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-neutral-100 bg-green-50">
              <div className="font-bold text-green-800">Income Categories</div>
            </div>
            <div className="divide-y divide-neutral-50">
              {[
                {name:"Rent Income",color:"#059669",emoji:"🏠"},
                {name:"Late Fees",color:"#D97706",emoji:"⏰"},
                {name:"Pet Rent",color:"#7C3AED",emoji:"🐾"},
                {name:"Parking",color:"#6B7280",emoji:"🚗"},
                {name:"Security Deposit",color:"#2563EB",emoji:"🔒"},
                {name:"Application Fees",color:"#EA580C",emoji:"📋"},
                {name:"Other Income",color:"#9CA3AF",emoji:"💰"},
              ].map(c=>{
                const catKey = c.name.toLowerCase().replace(/ /g,"_");
                const total = filtered.filter(t=>t.type==="income"&&t.category.toLowerCase().replace(/ /g,"_")===catKey).reduce((s,t)=>s+Number(t.amount),0);
                return (
                  <div key={c.name} className="flex items-center justify-between px-5 py-3">
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{c.emoji}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{background:c.color}}/>
                        <span className="text-sm font-medium text-neutral-700">{c.name}</span>
                      </div>
                    </div>
                    <span className="text-sm font-bold text-green-600">${total.toLocaleString()}</span>
                  </div>
                );
              })}
            </div>
          </div>
          {/* Expense Categories */}
          <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-neutral-100 bg-red-50">
              <div className="font-bold text-red-800">Expense Categories</div>
            </div>
            <div className="divide-y divide-neutral-50">
              {[
                {name:"Repairs & Maintenance",color:"#DC2626",emoji:"🔧"},
                {name:"Property Insurance",color:"#2563EB",emoji:"🛡️"},
                {name:"Property Taxes",color:"#374151",emoji:"🏛️"},
                {name:"Management Fees",color:"#7C3AED",emoji:"💼"},
                {name:"Utilities",color:"#EA580C",emoji:"⚡"},
                {name:"Mortgage / Loan",color:"#1D4ED8",emoji:"🏦"},
                {name:"Landscaping",color:"#059669",emoji:"🌿"},
                {name:"Cleaning",color:"#0891B2",emoji:"🧹"},
                {name:"Advertising",color:"#EC4899",emoji:"📣"},
                {name:"Legal & Professional",color:"#6B7280",emoji:"⚖️"},
                {name:"Capital Improvements",color:"#B45309",emoji:"🏗️"},
                {name:"Other Expense",color:"#9CA3AF",emoji:"📦"},
              ].map(c=>{
                const catKey = c.name.toLowerCase().replace(/[^a-z]+/g,"_").replace(/_$/,"");
                const total = filtered.filter(t=>t.type==="expense").reduce((s,t)=>s+Number(t.amount),0);
                return (
                  <div key={c.name} className="flex items-center justify-between px-5 py-3">
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{c.emoji}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{background:c.color}}/>
                        <span className="text-sm font-medium text-neutral-700">{c.name}</span>
                      </div>
                    </div>
                    <span className="text-sm font-bold text-red-500">$0</span>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="md:col-span-2 text-xs text-neutral-400 bg-neutral-50 rounded-xl p-3 text-center">
            Category totals pull from your transaction records. Add transactions using the + Transaction button above.
          </div>
        </div>
      )}

      {/* ── INVOICES TAB ── */}
      {tab === "invoices" && (
        <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between">
            <div className="font-bold text-neutral-800">Invoices</div>
            <button className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-purple-700">
              + Create Invoice
            </button>
          </div>
          <div className="p-10 text-center">
            <div className="text-4xl mb-3">🧾</div>
            <h3 className="font-bold text-neutral-800 mb-1">No invoices yet</h3>
            <p className="text-sm text-neutral-500 mb-4">Create invoices for tenants or vendors. They'll receive a copy by email.</p>
            <button className="bg-purple-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-purple-700">
              Create First Invoice
            </button>
          </div>
        </div>
      )}

      {/* ── RECURRING TAB ── */}
      {tab === "recurring" && (
        <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between">
            <div className="font-bold text-neutral-800">Recurring Entries</div>
            <button className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-purple-700">
              + Add Recurring
            </button>
          </div>
          <div className="p-10 text-center">
            <div className="text-4xl mb-3">🔁</div>
            <h3 className="font-bold text-neutral-800 mb-1">No recurring entries</h3>
            <p className="text-sm text-neutral-500 mb-4">Set up mortgage payments, insurance premiums, or recurring income to auto-post on schedule.</p>
            <button className="bg-purple-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-purple-700">
              Add Recurring Entry
            </button>
          </div>
        </div>
      )}

      {/* ── ALL RECORDS TAB ── */}
      {tab === "all_records" && (
        <div>
          {/* Controls */}
          <div className="flex gap-3 mb-4 flex-wrap">
            <input className="rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500/20 min-w-48"
              placeholder="Search transactions..." />
            <select className="rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm outline-none" value={selectedProperty} onChange={e=>setSelectedProperty(e.target.value)}>
              <option value="all">All Properties</option>
              {properties.map(p=><option key={p.property_id} value={p.property_id}>{p.nickname||p.address}</option>)}
            </select>
            <select className="rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm outline-none">
              <option value="all">All Types</option>
              <option value="income">Income</option>
              <option value="expense">Expense</option>
            </select>
            <button onClick={()=>{
              const rows = ["Date,Description,Category,Type,Amount,Property"];
              filtered.forEach(t=>rows.push(`${t.date},${t.description||""},${t.category},${t.type},${t.amount},${properties.find(p=>p.property_id===t.property_id)?.nickname||""}`));
              const blob = new Blob([rows.join("\n")],{type:"text/csv"});
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a"); a.href=url; a.download="transactions.csv"; a.click();
            }} className="flex items-center gap-2 border border-neutral-200 bg-white text-neutral-700 px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-neutral-50 ml-auto">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Export CSV
            </button>
          </div>
          <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-neutral-50 text-xs text-neutral-500 uppercase tracking-wider">
                  <th className="px-5 py-3 text-left">Date</th>
                  <th className="px-5 py-3 text-left">Description</th>
                  <th className="px-5 py-3 text-left">Category</th>
                  <th className="px-5 py-3 text-center">Type</th>
                  <th className="px-5 py-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={5} className="px-5 py-10 text-center text-neutral-400 text-sm">
                    No transactions yet. Click "+ Transaction" to add your first entry.
                  </td></tr>
                ) : filtered.map(t=>(
                  <tr key={t.id} className="border-t border-neutral-50 hover:bg-neutral-50">
                    <td className="px-5 py-3 text-neutral-500">{new Date(t.date).toLocaleDateString()}</td>
                    <td className="px-5 py-3 font-medium text-neutral-900 capitalize">{t.description||t.category}</td>
                    <td className="px-5 py-3 text-neutral-500 capitalize">{t.category.replace(/_/g," ")}</td>
                    <td className="px-5 py-3 text-center">
                      <span className={`text-xs px-2 py-1 rounded-full font-semibold ${t.type==="income"?"bg-green-50 text-green-700":"bg-red-50 text-red-600"}`}>
                        {t.type}
                      </span>
                    </td>
                    <td className={`px-5 py-3 text-right font-bold ${t.type==="income"?"text-green-600":"text-red-500"}`}>
                      {t.type==="income"?"+":"-"}${Number(t.amount).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── BANKING TAB ── */}
      {tab === "banking" && (
        <div className="space-y-5">
          {/* Connect Bank */}
          <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-6">
            <h3 className="font-bold text-neutral-800 mb-1">Connect Bank Account</h3>
            <p className="text-sm text-neutral-500 mb-4">Link your bank via Plaid to automatically sync transactions and track cash flow in real time.</p>
            <button className="flex items-center gap-2 bg-purple-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-purple-700">
              🏦 Connect Bank via Plaid
            </button>
          </div>
          {/* Upload Statements */}
          <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-6">
            <h3 className="font-bold text-neutral-800 mb-1">Upload Bank Statement</h3>
            <p className="text-sm text-neutral-500 mb-4">Upload PDF or CSV statements from any bank to import transactions manually.</p>
            <div className="border-2 border-dashed border-neutral-200 rounded-xl p-8 text-center hover:border-purple-400 cursor-pointer transition-colors">
              <div className="text-3xl mb-2">📤</div>
              <div className="text-sm text-neutral-600 font-medium">Drop file here or click to upload</div>
              <div className="text-xs text-neutral-400 mt-1">PDF, CSV, XLSX supported</div>
            </div>
          </div>
          {/* Export */}
          <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-6">
            <h3 className="font-bold text-neutral-800 mb-4">Export Financial Data</h3>
            <div className="flex gap-3 flex-wrap">
              <button onClick={()=>{
                const rows = ["Date,Description,Category,Type,Amount"];
                filtered.forEach(t=>rows.push(`${t.date},${t.description||""},${t.category},${t.type},${t.amount}`));
                const blob = new Blob([rows.join("\n")],{type:"text/csv"});
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a"); a.href=url; a.download="financial_export.csv"; a.click();
              }} className="flex items-center gap-2 border border-neutral-200 bg-white text-neutral-700 px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-neutral-50">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                Export All Transactions (CSV)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── AI FORECAST TAB ── */}
      {tab === "forecast" && (
        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-bold text-neutral-800 text-lg">AI Revenue Forecast</h3>
                <p className="text-sm text-neutral-500 mt-0.5">Projected based on your active leases and historical patterns</p>
              </div>
              <select className="rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm outline-none">
                <option>Next 3 Months</option>
                <option>Next 6 Months</option>
                <option>Next 12 Months</option>
              </select>
            </div>
            {/* Forecast chart placeholder */}
            <div className="h-48 bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl border border-purple-100 flex items-center justify-center mb-6">
              <div className="text-center">
                <div className="text-3xl mb-2">📈</div>
                <div className="text-sm font-semibold text-neutral-600">Forecast chart renders when you have active leases</div>
                <div className="text-xs text-neutral-400 mt-1">Add leases to see projected revenue</div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: "Projected Revenue", value: `$${(income * 3).toLocaleString()}`, color: "#059669", note: "Next 3 months" },
                { label: "Projected Expenses", value: `$${(expenses * 3).toLocaleString()}`, color: "#DC2626", note: "Based on history" },
                { label: "Projected Net", value: `$${((income - expenses) * 3).toLocaleString()}`, color: "#7C6FCD", note: "After expenses" },
              ].map(c => (
                <div key={c.label} className="bg-neutral-50 rounded-xl p-4 border border-neutral-100">
                  <div className="text-xs text-neutral-500 mb-1">{c.label}</div>
                  <div className="text-xl font-bold" style={{color: c.color}}>{c.value}</div>
                  <div className="text-xs text-neutral-400 mt-1">{c.note}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-purple-50 rounded-2xl border border-purple-200 p-5">
            <div className="font-semibold text-purple-800 mb-2">What-If Scenarios</div>
            <div className="text-sm text-purple-700 mb-4">Adjust variables to see how they affect your projected income</div>
            <div className="grid gap-3">
              {[
                { label: "Vacancy Rate Increase", suffix: "%", placeholder: "e.g. 10" },
                { label: "Rent Increase", suffix: "%", placeholder: "e.g. 5" },
              ].map(s => (
                <div key={s.label} className="flex items-center gap-3">
                  <label className="text-sm text-purple-800 font-medium w-48">{s.label}</label>
                  <div className="flex items-center gap-2">
                    <input type="number" placeholder={s.placeholder} className="w-24 px-3 py-2 border border-purple-200 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-purple-300" />
                    <span className="text-sm text-purple-600">{s.suffix}</span>
                  </div>
                </div>
              ))}
              <button className="bg-purple-600 text-white px-5 py-2 rounded-xl text-sm font-semibold hover:bg-purple-700 w-fit">Run Scenario</button>
            </div>
          </div>
        </div>
      )}

      {/* ── BUDGETS TAB ── */}
      {tab === "budgets" && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <div className="text-sm text-neutral-500">Track your planned vs actual income and expenses</div>
            <button className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-purple-700">
              + Create Budget
            </button>
          </div>
          <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-neutral-100 bg-neutral-50">
              <div className="font-bold text-neutral-700 text-sm">Annual Budget Overview — {year}</div>
            </div>
            {[
              { label: "Rent Income", budgeted: 0, actual: income, color: "#059669" },
              { label: "Repairs & Maintenance", budgeted: 0, actual: expenses, color: "#DC2626" },
              { label: "Property Insurance", budgeted: 0, actual: 0, color: "#2563EB" },
              { label: "Property Taxes", budgeted: 0, actual: 0, color: "#D97706" },
              { label: "Utilities", budgeted: 0, actual: 0, color: "#7C3AED" },
            ].map((b, i) => {
              const pct = b.budgeted > 0 ? Math.min(100, (b.actual / b.budgeted) * 100) : 0;
              return (
                <div key={b.label} className={`px-6 py-4 ${i > 0 ? "border-t border-neutral-50" : ""}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-neutral-700">{b.label}</span>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-neutral-400">Budget: <span className="text-neutral-600 font-semibold">${b.budgeted.toLocaleString()}</span></span>
                      <span className="text-neutral-400">Actual: <span style={{color: b.color}} className="font-semibold">${b.actual.toLocaleString()}</span></span>
                    </div>
                  </div>
                  <div className="h-2 bg-neutral-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: b.color }} />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-center">
            <div className="text-2xl mb-2">💡</div>
            <div className="text-sm font-semibold text-amber-800 mb-1">Set your budgets</div>
            <div className="text-sm text-amber-700">Click "Create Budget" to set planned amounts for each category. Track actual vs budget in real time.</div>
          </div>
        </div>
      )}

      {/* ── REPORTS TAB ── */}
      {tab === "reports" && (
        <div className="space-y-5">
          {[
            { title: "Profit & Loss Statement", desc: "Income vs expenses — the full financial picture", icon: "📊" },
            { title: "Cash Flow Statement", desc: "Track cash in and out by month", icon: "💵" },
            { title: "Income by Property", desc: "Compare revenue across your portfolio", icon: "🏘️" },
          ].map(r => (
            <div key={r.title} className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="text-3xl">{r.icon}</div>
                  <div>
                    <div className="font-bold text-neutral-800">{r.title}</div>
                    <div className="text-sm text-neutral-500 mt-0.5">{r.desc}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <select className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm outline-none">
                    <option>This Year</option>
                    <option>This Quarter</option>
                    <option>This Month</option>
                    <option>Last Month</option>
                  </select>
                  <button onClick={() => {
                    const rows = ["Financial Report - " + r.title, "Generated: " + new Date().toLocaleDateString(), "", "Date,Description,Type,Amount"];
                    filtered.forEach(t => rows.push(`${t.date},${t.description || t.category},${t.type},${t.amount}`));
                    const blob = new Blob([rows.join("
")], {type: "text/csv"});
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a"); a.href = url; a.download = r.title.replace(/ /g,"_") + ".csv"; a.click();
                  }} className="flex items-center gap-1.5 text-sm font-semibold text-purple-600 border border-purple-200 px-4 py-2 rounded-xl hover:bg-purple-50">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    Download CSV
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── PAYMENTS TAB ── */}
      {tab === "payments" && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between">
              <div className="font-bold text-neutral-800">Payment Records</div>
              <a href="/client/payments" className="text-sm font-semibold text-purple-600 hover:text-purple-700">View Full Payment Dashboard →</a>
            </div>
            <div className="grid grid-cols-3 divide-x divide-neutral-100">
              {[
                { label: "Total Collected", value: `$${income.toLocaleString()}`, color: "#059669" },
                { label: "Outstanding", value: "$0", color: "#DC2626" },
                { label: "This Month", value: `$${months[months.length-1]?.income.toLocaleString() || "0"}`, color: "#7C6FCD" },
              ].map(s => (
                <div key={s.label} className="px-5 py-4 text-center">
                  <div className="text-xs text-neutral-500 mb-1">{s.label}</div>
                  <div className="text-xl font-bold" style={{color: s.color}}>{s.value}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-neutral-50 rounded-2xl border border-neutral-200 p-6 text-center">
            <div className="text-sm text-neutral-500 mb-3">Full payment management is in the Payments Dashboard</div>
            <a href="/client/payments" className="inline-flex items-center gap-2 bg-purple-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-purple-700 no-underline">
              Go to Payments Dashboard →
            </a>
          </div>
        </div>
      )}

      {/* ── TAXES TAB ── */}
      {tab === "taxes" && (
        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-6">
            <h3 className="font-bold text-neutral-800 mb-4">Tax Summary — {year}</h3>
            <div className="grid grid-cols-3 gap-4 mb-6">
              {[
                { label: "Total Rental Income", value: `$${income.toLocaleString()}`, color: "#059669" },
                { label: "Total Deductible Expenses", value: `$${expenses.toLocaleString()}`, color: "#DC2626" },
                { label: "Estimated Taxable Income", value: `$${Math.max(0, income - expenses).toLocaleString()}`, color: "#7C6FCD" },
              ].map(c => (
                <div key={c.label} className="bg-neutral-50 rounded-xl p-4 border border-neutral-100">
                  <div className="text-xs text-neutral-500 mb-1">{c.label}</div>
                  <div className="text-xl font-bold" style={{color: c.color}}>{c.value}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-6">
            <h3 className="font-bold text-neutral-800 mb-4">Quarterly Tax Estimates</h3>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: "Q1 (Due Apr 15)", amount: Math.max(0, (income - expenses) * 0.0625) },
                { label: "Q2 (Due Jun 15)", amount: Math.max(0, (income - expenses) * 0.0625) },
                { label: "Q3 (Due Sep 15)", amount: Math.max(0, (income - expenses) * 0.0625) },
                { label: "Q4 (Due Jan 15)", amount: Math.max(0, (income - expenses) * 0.0625) },
              ].map(q => (
                <div key={q.label} className="flex items-center justify-between p-4 bg-neutral-50 rounded-xl border border-neutral-100">
                  <span className="text-sm font-medium text-neutral-700">{q.label}</span>
                  <span className="font-bold text-amber-600">${q.amount.toLocaleString(undefined, {maximumFractionDigits: 0})}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 text-xs text-neutral-400 italic">⚠️ Estimated at 25% blended rate. Consult a qualified CPA for accurate tax advice specific to your situation.</div>
          </div>

          <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-neutral-800">1099 Generator</h3>
              <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full font-semibold">Due Jan 31</span>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
              <div className="text-sm text-amber-800 font-medium">Vendors/contractors paid $600+ require a 1099-NEC form</div>
              <div className="text-xs text-amber-700 mt-1">IRS penalties: $60–$310 per form for late filing</div>
            </div>
            <div className="text-center py-6 text-sm text-neutral-400">
              No vendors on file yet. Add vendors in the Vendors section to track 1099 requirements.
            </div>
            <button onClick={() => {
              const rows = ["1099-NEC Report — " + year, "Vendor,EIN,Total Paid,1099 Required"];
              const blob = new Blob([rows.join("
")], {type: "text/csv"});
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a"); a.href = url; a.download = `1099_report_${year}.csv`; a.click();
            }} className="flex items-center gap-2 border border-neutral-200 bg-white text-neutral-700 px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-neutral-50">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Export 1099 Report
            </button>
          </div>
        </div>
      )}

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
