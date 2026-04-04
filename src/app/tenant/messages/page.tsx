"use client";
export const dynamic = "force-dynamic";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { TenantNav } from "@/components/ui/TenantNav";

type Message = { id: string; from_user_id: string; to_user_id: string; body: string; subject: string | null; read_at: string | null; created_at: string; message_type: string; is_mine: boolean; };
type Thread = { other_user_id: string; other_name: string; last_message: string; last_time: string; unread: number; messages: Message[]; };

export default function TenantMessagesPage() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeThread, setActiveThread] = useState<Thread | null>(null);
  const [myUserId, setMyUserId] = useState("");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      const { data: ud } = await supabase.auth.getUser();
      if (!ud.user) { location.href = "/login"; return; }
      setMyUserId(ud.user.id);
      const { data: msgs } = await supabase.from("messages").select("*").or(`from_user_id.eq.${ud.user.id},to_user_id.eq.${ud.user.id}`).order("created_at", { ascending: true });
      const grouped: Record<string, Message[]> = {};
      for (const m of msgs || []) {
        const other = m.from_user_id === ud.user.id ? m.to_user_id : m.from_user_id;
        if (!grouped[other]) grouped[other] = [];
        grouped[other].push({ ...m, is_mine: m.from_user_id === ud.user.id });
      }
      const built: Thread[] = Object.entries(grouped).map(([otherId, msgs]) => ({
        other_user_id: otherId, other_name: "Property Manager",
        last_message: msgs[msgs.length - 1].body, last_time: msgs[msgs.length - 1].created_at,
        unread: msgs.filter(m => !m.is_mine && !m.read_at).length, messages: msgs,
      }));
      setThreads(built);
      setLoading(false);
    })();
  }, []);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [activeThread?.messages]);

  async function send() {
    if (!input.trim() || !activeThread || sending) return;
    setSending(true);
    const { data } = await supabase.from("messages").insert({ from_user_id: myUserId, to_user_id: activeThread.other_user_id, body: input.trim(), message_type: "direct" }).select().single();
    if (data) {
      const newMsg = { ...data, is_mine: true };
      setActiveThread(prev => prev ? { ...prev, messages: [...prev.messages, newMsg], last_message: input.trim() } : prev);
      setThreads(prev => prev.map(t => t.other_user_id === activeThread.other_user_id ? { ...t, messages: [...t.messages, newMsg], last_message: input.trim() } : t));
    }
    setInput(""); setSending(false);
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" /></div>;

  return (
    <div className="pb-24">
      <div className="mx-auto max-w-3xl px-6 pt-10">
        <div className="mb-6"><h1 className="text-3xl font-bold text-neutral-900">Messages</h1><p className="text-neutral-500 mt-1">Communicate with your property manager and team</p></div>
        {!activeThread ? (
          threads.length === 0 ? (
            <div className="bg-white rounded-2xl border border-neutral-200 p-12 text-center shadow-sm">
              <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-500 mx-auto mb-4"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg></div>
              <h2 className="text-lg font-bold text-neutral-900">No messages yet</h2>
              <p className="text-neutral-500 text-sm mt-1">Messages from your property manager will appear here.</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {threads.map(t => (
                <div key={t.other_user_id} onClick={() => setActiveThread(t)} className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-4 flex items-center gap-4 cursor-pointer hover:shadow-md transition-shadow">
                  <div className="w-11 h-11 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm shrink-0">PM</div>
                  <div className="flex-1 min-w-0"><div className="flex items-center justify-between"><span className="font-bold text-neutral-900 text-sm">{t.other_name}</span><span className="text-xs text-neutral-400">{new Date(t.last_time).toLocaleDateString()}</span></div><div className="text-sm text-neutral-500 truncate mt-0.5">{t.last_message}</div></div>
                  {t.unread > 0 && <span className="w-5 h-5 bg-blue-600 text-white rounded-full text-xs flex items-center justify-center font-bold shrink-0">{t.unread}</span>}
                </div>
              ))}
            </div>
          )
        ) : (
          <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden flex flex-col" style={{ height: "500px" }}>
            <div className="flex items-center gap-3 px-4 py-3 border-b border-neutral-100">
              <button onClick={() => setActiveThread(null)} className="text-neutral-400 hover:text-neutral-700"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg></button>
              <div className="w-8 h-8 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs">PM</div>
              <span className="font-semibold text-neutral-900 text-sm">{activeThread.other_name}</span>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {activeThread.messages.map(m => (
                <div key={m.id} className={`flex ${m.is_mine ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${m.is_mine ? "bg-blue-600 text-white" : "bg-neutral-100 text-neutral-900"}`}>
                    <div>{m.body}</div><div className={`text-xs mt-1 ${m.is_mine ? "text-blue-200" : "text-neutral-400"}`}>{new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
                  </div>
                </div>
              ))}
              <div ref={endRef} />
            </div>
            <div className="border-t border-neutral-100 p-3 flex gap-2">
              <input className="flex-1 rounded-xl border border-neutral-200 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/20" placeholder="Type a message..." value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && send()} />
              <button onClick={send} disabled={sending || !input.trim()} className="bg-blue-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-40">Send</button>
            </div>
          </div>
        )}
      </div>
      <TenantNav />
    </div>
  );
}
