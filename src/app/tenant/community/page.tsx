"use client";
export const dynamic = "force-dynamic";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { TenantNav } from "@/components/ui/TenantNav";

type Post = { id: string; body: string; image_url: string | null; author_id: string; author_name: string; created_at: string; like_count: number; comment_count: number; liked_by_me: boolean; };
type Comment = { id: string; post_id: string; author_id: string; author_name: string; body: string; created_at: string; };

export default function TenantCommunityPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [comments, setComments] = useState<Record<string, Comment[]>>({});
  const [myUserId, setMyUserId] = useState("");
  const [myName, setMyName] = useState("Tenant");
  const [accountId, setAccountId] = useState("");
  const [loading, setLoading] = useState(true);
  const [newPost, setNewPost] = useState("");
  const [posting, setPosting] = useState(false);
  const [expandedPost, setExpandedPost] = useState<string | null>(null);
  const [commentInput, setCommentInput] = useState<Record<string, string>>({});

  useEffect(() => {
    (async () => {
      const { data: ud } = await supabase.auth.getUser();
      if (!ud.user) { location.href = "/login"; return; }
      setMyUserId(ud.user.id);
      const name = ud.user.user_metadata?.full_name || ud.user.email?.split("@")[0] || "Tenant";
      setMyName(name);
      const { data: au } = await supabase.from("app_users").select("account_id").eq("user_id", ud.user.id).maybeSingle();
      if (!au) { setLoading(false); return; }
      setAccountId(au.account_id);
      const { data: rawPosts } = await supabase.from("community_posts").select("*").eq("account_id", au.account_id).order("created_at", { ascending: false });
      const enriched: Post[] = await Promise.all((rawPosts || []).map(async p => {
        const { count: likes } = await supabase.from("community_likes").select("id", { count: "exact", head: true }).eq("post_id", p.id);
        const { count: comms } = await supabase.from("community_comments").select("id", { count: "exact", head: true }).eq("post_id", p.id);
        const { data: myLike } = await supabase.from("community_likes").select("id").eq("post_id", p.id).eq("user_id", ud.user.id).maybeSingle();
        return { ...p, author_name: "Neighbor", like_count: likes || 0, comment_count: comms || 0, liked_by_me: !!myLike };
      }));
      setPosts(enriched);
      setLoading(false);
    })();
  }, []);

  async function submitPost() {
    if (!newPost.trim() || posting) return;
    setPosting(true);
    const { data } = await supabase.from("community_posts").insert({ account_id: accountId, author_id: myUserId, body: newPost.trim() }).select().single();
    if (data) setPosts(prev => [{ ...data, author_name: myName, like_count: 0, comment_count: 0, liked_by_me: false }, ...prev]);
    setNewPost(""); setPosting(false);
  }

  async function toggleLike(postId: string) {
    const post = posts.find(p => p.id === postId);
    if (!post) return;
    if (post.liked_by_me) {
      await supabase.from("community_likes").delete().eq("post_id", postId).eq("user_id", myUserId);
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, liked_by_me: false, like_count: p.like_count - 1 } : p));
    } else {
      await supabase.from("community_likes").insert({ post_id: postId, user_id: myUserId });
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, liked_by_me: true, like_count: p.like_count + 1 } : p));
    }
  }

  async function loadComments(postId: string) {
    if (expandedPost === postId) { setExpandedPost(null); return; }
    const { data } = await supabase.from("community_comments").select("*").eq("post_id", postId).order("created_at");
    setComments(prev => ({ ...prev, [postId]: (data || []).map(c => ({ ...c, author_name: "Neighbor" })) }));
    setExpandedPost(postId);
  }

  async function submitComment(postId: string) {
    const body = commentInput[postId]?.trim();
    if (!body) return;
    const { data } = await supabase.from("community_comments").insert({ post_id: postId, author_id: myUserId, body }).select().single();
    if (data) {
      setComments(prev => ({ ...prev, [postId]: [...(prev[postId] || []), { ...data, author_name: myName }] }));
      setCommentInput(prev => ({ ...prev, [postId]: "" }));
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, comment_count: p.comment_count + 1 } : p));
    }
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" /></div>;

  return (
    <div className="pb-24">
      <div className="mx-auto max-w-3xl px-6 pt-10">
        <div className="mb-8"><h1 className="text-3xl font-bold text-neutral-900">Community</h1><p className="text-neutral-500 mt-1">Connect with neighbors in your building</p></div>

        {/* New post */}
        <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-4 mb-6">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm shrink-0">{myName[0]}</div>
            <div className="flex-1">
              <textarea className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 resize-none" rows={3} placeholder="Share something with your neighbors..." value={newPost} onChange={e => setNewPost(e.target.value)} />
              <div className="flex justify-end mt-2">
                <button onClick={submitPost} disabled={posting || !newPost.trim()} className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-40">{posting ? "Posting..." : "Post"}</button>
              </div>
            </div>
          </div>
        </div>

        {/* Posts */}
        {posts.length === 0 ? (
          <div className="bg-white rounded-2xl border border-neutral-200 p-10 text-center shadow-sm">
            <div className="text-4xl mb-3">🏘️</div>
            <h2 className="text-lg font-bold text-neutral-900">Be the first to post!</h2>
            <p className="text-neutral-500 text-sm mt-1">Start the conversation with your neighbors.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {posts.map(p => (
              <div key={p.id} className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
                <div className="p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-9 h-9 rounded-xl bg-purple-100 flex items-center justify-center text-purple-600 font-bold text-sm">{p.author_name[0]}</div>
                    <div><div className="font-semibold text-neutral-900 text-sm">{p.author_id === myUserId ? "You" : p.author_name}</div><div className="text-xs text-neutral-400">{new Date(p.created_at).toLocaleString()}</div></div>
                  </div>
                  <p className="text-sm text-neutral-900 leading-relaxed">{p.body}</p>
                </div>
                <div className="flex items-center gap-4 px-5 py-3 border-t border-neutral-100 bg-neutral-50">
                  <button onClick={() => toggleLike(p.id)} className={`flex items-center gap-1.5 text-xs font-semibold transition-colors ${p.liked_by_me ? "text-red-500" : "text-neutral-500 hover:text-red-500"}`}>{p.liked_by_me ? "❤️" : "🤍"} {p.like_count}</button>
                  <button onClick={() => loadComments(p.id)} className="flex items-center gap-1.5 text-xs font-semibold text-neutral-500 hover:text-blue-600 transition-colors">💬 {p.comment_count}</button>
                </div>
                {expandedPost === p.id && (
                  <div className="border-t border-neutral-100 p-4">
                    {(comments[p.id] || []).map(c => (
                      <div key={c.id} className="flex gap-2 mb-3">
                        <div className="w-7 h-7 rounded-lg bg-neutral-100 flex items-center justify-center text-neutral-600 font-bold text-xs shrink-0">{c.author_name[0]}</div>
                        <div className="bg-neutral-50 rounded-xl px-3 py-2 text-xs flex-1"><span className="font-semibold">{c.author_id === myUserId ? "You" : c.author_name}</span> <span className="text-neutral-700">{c.body}</span></div>
                      </div>
                    ))}
                    <div className="flex gap-2 mt-2">
                      <input className="flex-1 rounded-xl border border-neutral-200 px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-500/20" placeholder="Write a comment..." value={commentInput[p.id] || ""} onChange={e => setCommentInput(prev => ({ ...prev, [p.id]: e.target.value }))} onKeyDown={e => e.key === "Enter" && submitComment(p.id)} />
                      <button onClick={() => submitComment(p.id)} className="bg-blue-600 text-white px-3 py-2 rounded-xl text-xs font-semibold">Reply</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      <TenantNav />
    </div>
  );
}
