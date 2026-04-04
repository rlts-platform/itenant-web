"use client";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Conversation = { user_id:string; name:string; last_message:string; last_time:string; unread:number; role:string; };
type Message = { id:string; from_user_id:string; to_user_id:string; body:string; read_at:string|null; created_at:string; };

export default function MessagesPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeConvo, setActiveConvo] = useState<Conversation|null>(null);
  const [myId, setMyId] = useState("");
  const [accountId, setAccountId] = useState("");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(()=>{
    (async()=>{
      const {data:ud} = await supabase.auth.getUser();
      if(!ud.user){location.href="/login";return;}
      setMyId(ud.user.id);
      const {data:au} = await supabase.from("app_users").select("account_id").eq("user_id",ud.user.id).maybeSingle();
      if(!au){setLoading(false);return;}
      setAccountId(au.account_id);
      // Get all users in account for conversations
      const {data:users} = await supabase.from("app_users").select("user_id,role").eq("account_id",au.account_id).neq("user_id",ud.user.id);
      const convos:Conversation[] = await Promise.all((users||[]).map(async u=>{
        // Try to get name from auth metadata or tenants table
        const {data:t} = await supabase.from("tenants").select("first_name,last_name").eq("user_id",u.user_id).maybeSingle();
        const name = t?`${t.first_name} ${t.last_name}`:`User (${u.role})`;
        const {data:msgs} = await supabase.from("messages").select("body,created_at,read_at").or(`from_user_id.eq.${ud.user.id},to_user_id.eq.${ud.user.id}`).or(`from_user_id.eq.${u.user_id},to_user_id.eq.${u.user_id}`).order("created_at",{ascending:false}).limit(1);
        const last = msgs?.[0];
        const {count:unread} = await supabase.from("messages").select("id",{count:"exact",head:true}).eq("from_user_id",u.user_id).eq("to_user_id",ud.user.id).is("read_at",null);
        return {user_id:u.user_id, name, last_message:last?.body||"", last_time:last?.created_at||"", unread:unread||0, role:u.role};
      }));
      setConversations(convos.filter(c=>c.name));
      setLoading(false);
    })();
  },[]);

  useEffect(()=>{
    if(!activeConvo||!myId)return;
    (async()=>{
      const {data} = await supabase.from("messages").select("*")
        .or(`and(from_user_id.eq.${myId},to_user_id.eq.${activeConvo.user_id}),and(from_user_id.eq.${activeConvo.user_id},to_user_id.eq.${myId})`)
        .order("created_at");
      setMessages(data||[]);
      // Mark as read
      await supabase.from("messages").update({read_at:new Date().toISOString()}).eq("from_user_id",activeConvo.user_id).eq("to_user_id",myId).is("read_at",null);
    })();
  },[activeConvo,myId]);

  useEffect(()=>{ bottomRef.current?.scrollIntoView({behavior:"smooth"}); },[messages]);

  async function sendMessage() {
    if(!input.trim()||!activeConvo||sending)return;
    setSending(true);
    const body = input.trim();
    setInput("");
    const {data:msg} = await supabase.from("messages").insert({account_id:accountId,from_user_id:myId,to_user_id:activeConvo.user_id,body}).select().single();
    if(msg) setMessages(p=>[...p,msg]);
    setSending(false);
  }

  if(loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full"/></div>;

  return (
    <div>
      <div className="mb-8"><h1 className="text-3xl font-bold text-neutral-900">Messages</h1><p className="text-neutral-500 mt-1">Communicate with tenants and team</p></div>
      <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden" style={{height:"70vh",display:"flex"}}>
        {/* Sidebar */}
        <div className="w-72 border-r border-neutral-100 flex flex-col shrink-0">
          <div className="p-4 border-b border-neutral-100 font-semibold text-sm text-neutral-700">Conversations</div>
          <div className="flex-1 overflow-y-auto">
            {conversations.length === 0 ? (
              <div className="p-8 text-center text-sm text-neutral-400">
                <div className="text-3xl mb-2">💬</div>
                No conversations yet. Messages will appear here when tenants or team message you.
              </div>
            ) : conversations.map(c=>(
              <button key={c.user_id} onClick={()=>setActiveConvo(c)} className={`w-full text-left p-4 border-b border-neutral-50 hover:bg-neutral-50 transition-colors ${activeConvo?.user_id===c.user_id?"bg-blue-50":""}`}>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-bold text-sm shrink-0">{c.name[0]}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm text-neutral-900 truncate">{c.name}</span>
                      {c.unread > 0 && <span className="w-5 h-5 bg-blue-600 text-white text-xs rounded-full flex items-center justify-center shrink-0">{c.unread}</span>}
                    </div>
                    <div className="text-xs text-neutral-400 truncate mt-0.5">{c.last_message||"No messages yet"}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Chat area */}
        <div className="flex-1 flex flex-col">
          {!activeConvo ? (
            <div className="flex-1 flex items-center justify-center text-neutral-400 text-sm flex-col gap-3">
              <div className="text-5xl">💬</div>
              <div>Select a conversation to start messaging</div>
            </div>
          ) : (<>
            <div className="p-4 border-b border-neutral-100 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-bold text-sm">{activeConvo.name[0]}</div>
              <div><div className="font-semibold text-sm text-neutral-900">{activeConvo.name}</div><div className="text-xs text-neutral-400 capitalize">{activeConvo.role}</div></div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map(m=>(
                <div key={m.id} className={`flex ${m.from_user_id===myId?"justify-end":"justify-start"}`}>
                  <div className={`max-w-xs px-4 py-2.5 rounded-2xl text-sm ${m.from_user_id===myId?"bg-blue-600 text-white rounded-br-sm":"bg-neutral-100 text-neutral-800 rounded-bl-sm"}`}>
                    {m.body}
                    <div className={`text-xs mt-1 ${m.from_user_id===myId?"text-blue-200":"text-neutral-400"}`}>{new Date(m.created_at).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}</div>
                  </div>
                </div>
              ))}
              {messages.length===0 && <div className="text-center text-neutral-400 text-sm pt-8">No messages yet. Say hello!</div>}
              <div ref={bottomRef}/>
            </div>
            <div className="p-4 border-t border-neutral-100 flex gap-2">
              <input className="flex-1 rounded-xl border border-neutral-200 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/20" placeholder="Type a message..." value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&!e.shiftKey&&sendMessage()}/>
              <button onClick={sendMessage} disabled={sending||!input.trim()} className="bg-blue-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-40">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
              </button>
            </div>
          </>)}
        </div>
      </div>
    </div>
  );
}
