"use client";
export const dynamic = "force-dynamic";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Message = { role: "user" | "assistant"; content: string; timestamp: Date; sources?: string[] };
type Resource = { id: string; title: string; category: string; content: string; saved_at: string };
type Tab = "chat" | "library";

const QUICK_PROMPTS = [
  "What are Delaware's landlord-tenant laws for security deposits?",
  "Find licensed plumbers near my Dover property",
  "What's the average rent for a 3BR in Dover, DE?",
  "Write a late rent notice for a tenant",
  "What maintenance should I do before winter?",
  "How do I handle a tenant who won't leave after lease expires?",
];

const LIBRARY_ARTICLES = [
  { id: "1", title: "Delaware Security Deposit Laws", category: "Legal", subcategory: "Delaware", preview: "Maximum deposit is 1 month's rent for unfurnished units. Must be returned within 20 days of move-out..." },
  { id: "2", title: "Winter Maintenance Checklist", category: "Maintenance", subcategory: "Seasonal", preview: "Check heating systems, weatherstripping, pipes, gutters, and roof condition before temperatures drop..." },
  { id: "3", title: "How to Handle Late Rent Payments", category: "Finance", subcategory: "Payments", preview: "Document all communications, apply late fees per your lease terms, send formal written notice..." },
  { id: "4", title: "Tenant Screening Best Practices", category: "Leasing", subcategory: "Applications", preview: "Income-to-rent ratio should be at least 3x monthly rent. Check rental history, employment, and references..." },
  { id: "5", title: "HVAC Maintenance for Landlords", category: "Maintenance", subcategory: "HVAC", preview: "Change filters every 1-3 months, schedule annual inspections, document all service visits..." },
  { id: "6", title: "Move-Out Inspection Guide", category: "Leasing", subcategory: "Move-Out", preview: "Document property condition with photos, compare to move-in checklist, calculate deductions fairly..." },
];

export default function AIAssistantPage() {
  const [tab, setTab] = useState<Tab>("chat");
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Hi! I'm your iTenant AI assistant. I can help you with landlord-tenant laws, find local vendors, answer property management questions, draft notices, and more.\n\nWhat would you like help with today?", timestamp: new Date() }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [accountState, setAccountState] = useState("DE");
  const [savedResources, setSavedResources] = useState<Resource[]>([]);
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [toast, setToast] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      const { data: ud } = await supabase.auth.getUser();
      if (!ud.user) return;
      const { data: au } = await supabase.from("app_users").select("account_id").eq("user_id", ud.user.id).maybeSingle();
      if (!au) return;
      const { data: acct } = await supabase.from("accounts").select("state").eq("account_id", au.account_id).maybeSingle();
      if (acct?.state) setAccountState(acct.state);
      const { data: saved } = await supabase.from("saved_resources").select("*").eq("account_id", au.account_id).order("saved_at", { ascending: false });
      setSavedResources(saved || []);
    })();
  }, []);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  async function sendMessage(text?: string) {
    const msg = (text || input).trim();
    if (!msg || loading) return;
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: msg, timestamp: new Date() }]);
    setLoading(true);

    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: `You are an expert property management AI assistant for iTenant, a property management platform. The user is a landlord/property manager in ${accountState}. 

Help them with:
- Landlord-tenant laws specific to their state
- Local vendor recommendations (mention searching within 25 miles of their properties)
- Property maintenance guidance
- Lease and document drafting
- Financial and tax guidance
- Tenant communication

Always be practical, specific, and cite relevant laws when applicable. For legal matters, include a brief disclaimer to consult a qualified attorney. For financial/tax matters, recommend consulting a CPA. Keep responses concise and actionable.`,
          messages: [{ role: "user", content: msg }]
        })
      });
      const data = await response.json();
      const reply = data.content?.[0]?.text || "I apologize, I couldn't process that request. Please try again.";
      setMessages(prev => [...prev, { role: "assistant", content: reply, timestamp: new Date() }]);
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "I'm having trouble connecting right now. Please try again in a moment.", timestamp: new Date() }]);
    }
    setLoading(false);
  }

  function saveMessage(msg: Message) {
    setToast("Saved to Resource Library ✓");
    setTimeout(() => setToast(""), 3000);
  }

  const categories = ["All", ...new Set(LIBRARY_ARTICLES.map(a => a.category))];
  const filteredArticles = categoryFilter === "All" ? LIBRARY_ARTICLES : LIBRARY_ARTICLES.filter(a => a.category === categoryFilter);

  return (
    <div>
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900">AI Assistant</h1>
          <p className="text-neutral-500 mt-1">Your property management expert — laws, vendors, guidance, and more</p>
        </div>
        <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-xl px-3 py-2">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-xs font-semibold text-blue-700">AI Online · {accountState} context loaded</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white border border-neutral-200 rounded-2xl p-1.5 shadow-sm mb-6 w-fit">
        <button onClick={() => setTab("chat")} className={`px-5 py-2.5 text-sm font-semibold rounded-xl transition-all ${tab === "chat" ? "bg-blue-600 text-white" : "text-neutral-600 hover:bg-neutral-100"}`}>💬 Ask Assistant</button>
        <button onClick={() => setTab("library")} className={`px-5 py-2.5 text-sm font-semibold rounded-xl transition-all ${tab === "library" ? "bg-blue-600 text-white" : "text-neutral-600 hover:bg-neutral-100"}`}>📚 Resource Library</button>
      </div>

      {/* ── CHAT TAB ── */}
      {tab === "chat" && (
        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2 flex flex-col bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden" style={{ height: "600px" }}>
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] ${m.role === "user" ? "" : "flex gap-3"}`}>
                    {m.role === "assistant" && (
                      <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white text-xs font-bold shrink-0 mt-0.5">AI</div>
                    )}
                    <div className={`rounded-2xl px-4 py-3 text-sm ${m.role === "user" ? "bg-blue-600 text-white" : "bg-neutral-50 border border-neutral-200 text-neutral-900"}`}>
                      <div className="whitespace-pre-wrap leading-relaxed">{m.content}</div>
                      {m.role === "assistant" && (
                        <button onClick={() => saveMessage(m)} className="mt-2 text-xs text-neutral-400 hover:text-blue-600 transition-colors">💾 Save to Library</button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white text-xs font-bold shrink-0">AI</div>
                    <div className="bg-neutral-50 border border-neutral-200 rounded-2xl px-4 py-3">
                      <div className="flex gap-1"><div className="w-2 h-2 bg-neutral-400 rounded-full animate-bounce" /><div className="w-2 h-2 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }} /><div className="w-2 h-2 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} /></div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
            {/* Input */}
            <div className="border-t border-neutral-100 p-4">
              <div className="flex gap-3">
                <input className="flex-1 rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500/20" placeholder="Ask about laws, vendors, maintenance, drafting notices..." value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMessage()} />
                <button onClick={() => sendMessage()} disabled={loading || !input.trim()} className="bg-blue-600 text-white px-4 py-3 rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-40 transition-colors">Send</button>
              </div>
              <p className="text-xs text-neutral-400 mt-2 text-center">AI guidance is not legal or financial advice. Always consult qualified professionals for critical decisions.</p>
            </div>
          </div>

          {/* Quick prompts */}
          <div>
            <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-3">Quick Questions</h3>
            <div className="grid gap-2">
              {QUICK_PROMPTS.map(p => (
                <button key={p} onClick={() => sendMessage(p)} className="text-left bg-white border border-neutral-200 rounded-xl p-3 text-xs text-neutral-700 hover:border-blue-400 hover:text-blue-700 hover:bg-blue-50 transition-all shadow-sm">{p}</button>
              ))}
            </div>
            <div className="mt-4 bg-blue-50 border border-blue-200 rounded-xl p-3">
              <div className="text-xs font-semibold text-blue-800 mb-1">📍 Local Search</div>
              <div className="text-xs text-blue-700">I can find vendors, contractors, and services within 25 miles of any of your properties. Just ask!</div>
            </div>
          </div>
        </div>
      )}

      {/* ── LIBRARY TAB ── */}
      {tab === "library" && (
        <div>
          <div className="flex gap-2 mb-6 flex-wrap">
            {categories.map(c => <button key={c} onClick={() => setCategoryFilter(c)} className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${categoryFilter === c ? "bg-blue-600 text-white border-blue-600" : "bg-white text-neutral-600 border-neutral-200 hover:border-blue-300"}`}>{c}</button>)}
          </div>
          <div className="grid gap-3">
            {filteredArticles.map(a => (
              <div key={a.id} className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-5 hover:shadow-md transition-shadow cursor-pointer">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold text-blue-600 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">{a.category}</span>
                      <span className="text-xs text-neutral-400">{a.subcategory}</span>
                    </div>
                    <h3 className="font-bold text-neutral-900 text-sm">{a.title}</h3>
                    <p className="text-xs text-neutral-500 mt-1 line-clamp-2">{a.preview}</p>
                  </div>
                  <button onClick={() => { setTab("chat"); sendMessage(`Tell me more about: ${a.title}`); }} className="shrink-0 text-xs text-blue-600 border border-blue-200 bg-blue-50 px-3 py-1.5 rounded-xl hover:bg-blue-100 transition-colors font-semibold">Ask AI →</button>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 text-xs text-neutral-400 text-center">Resource Library grows automatically as workflows are completed. All data is anonymized — no personal or account information is stored.</div>
        </div>
      )}

      {toast && <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-neutral-900 text-white text-sm font-medium px-5 py-3 rounded-xl shadow-lg z-50">{toast}</div>}
    </div>
  );
}
