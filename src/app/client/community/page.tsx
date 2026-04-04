"use client";
export const dynamic = "force-dynamic";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Post = { id:string; author_id:string; body:string; image_url:string|null; created_at:string; author_name:string; like_count:number; comment_count:number; liked_by_me:boolean; };
type Comment = { id:string; post_id:string; author_id:string; body:string; created_at:string; };

export default function CommunityPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [myId, setMyId] = useState("");
  const [accountId, setAccountId] = useState("");
  const [loading, setLoading] = useState(true);
  const [newPost, setNewPost] = useState("");
  const [posting, setPosting] = useState(false);
  const [activeComments, setActiveComments] = useState<string|null>(null);
  const [comments, setComments] = useState<Record<string,Comment[]>>({});
  const [commentInput, setCommentInput] = useState("");

  useEffect(()=>{
    (async()=>{
      const {data:ud} = await supabase.auth.getUser();
      if(!ud.user){location.href="/login";return;}
      setMyId(ud.user.id);
      const {data:au} = await supabase.from("app_users").select("account_id").eq("user_id",ud.user.id).maybeSingle();
      if(!au){setLoading(false);return;}
      setAccountId(au.account_id);
      await loadPosts(au.account_id,ud.user.id);
      setLoading(false);
    })();
  },[]);

  async function loadPosts(acctId:string, userId:string) {
    const {data:raw} = await supabase.from("community_posts").select("*").eq("account_id",acctId).order("created_at",{ascending:false});
    const enriched:Post[] = await Promise.all((raw||[]).map(async p=>{
      const {data:t} = await supabase.from("tenants").select("first_name,last_name").eq("user_id",p.author_id).maybeSingle();
      const name = t?`${t.first_name} ${t.last_name}`:"Team Member";
      const {count:likes} = await supabase.from("community_likes").select("id",{count:"exact",head:true}).eq("post_id",p.id);
      const {count:cmnts} = await supabase.from("community_comments").select("id",{count:"exact",head:true}).eq("post_id",p.id);
      const {data:myLike} = await supabase.from("community_likes").select("id").eq("post_id",p.id).eq("user_id",userId).maybeSingle();
      return {...p,author_name:name,like_count:likes||0,comment_count:cmnts||0,liked_by_me:!!myLike};
    }));
    setPosts(enriched);
  }

  async function submitPost() {
    if(!newPost.trim())return;
    setPosting(true);
    const {data:p} = await supabase.from("community_posts").insert({account_id:accountId,author_id:myId,body:newPost.trim()}).select().single();
    if(p) setPosts(prev=>[{...p,author_name:"You",like_count:0,comment_count:0,liked_by_me:false},...prev]);
    setNewPost("");setPosting(false);
  }

  async function toggleLike(postId:string, liked:boolean) {
    if(liked){await supabase.from("community_likes").delete().eq("post_id",postId).eq("user_id",myId);}
    else{await supabase.from("community_likes").insert({post_id:postId,user_id:myId});}
    setPosts(p=>p.map(x=>x.id===postId?{...x,liked_by_me:!liked,like_count:x.like_count+(liked?-1:1)}:x));
  }

  async function loadComments(postId:string) {
    if(activeComments===postId){setActiveComments(null);return;}
    setActiveComments(postId);
    if(!comments[postId]){
      const {data:c} = await supabase.from("community_comments").select("*").eq("post_id",postId).order("created_at");
      setComments(p=>({...p,[postId]:c||[]}));
    }
  }

  async function addComment(postId:string) {
    if(!commentInput.trim())return;
    const {data:c} = await supabase.from("community_comments").insert({post_id:postId,author_id:myId,body:commentInput.trim()}).select().single();
    if(c) setComments(p=>({...p,[postId]:[...(p[postId]||[]),c]}));
    setPosts(p=>p.map(x=>x.id===postId?{...x,comment_count:x.comment_count+1}:x));
    setCommentInput("");
  }

  if(loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full"/></div>;

  return (
    <div>
      <div className="mb-8"><h1 className="text-3xl font-bold text-neutral-900">Community</h1><p className="text-neutral-500 mt-1">Share updates and connect with your tenants</p></div>

      {/* Post composer */}
      <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-5 mb-6">
        <textarea className="w-full text-sm text-neutral-800 outline-none resize-none placeholder-neutral-400" rows={3} placeholder="Share an update with your tenants..." value={newPost} onChange={e=>setNewPost(e.target.value)}/>
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-neutral-100">
          <div className="text-xs text-neutral-400">Posts are visible to all tenants in your account</div>
          <button onClick={submitPost} disabled={posting||!newPost.trim()} className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-40">Post</button>
        </div>
      </div>

      {posts.length === 0 ? (
        <div className="bg-white rounded-2xl border border-neutral-200 p-12 text-center shadow-sm">
          <div className="text-4xl mb-3">🏘️</div>
          <h2 className="text-lg font-bold text-neutral-900">No posts yet</h2>
          <p className="text-neutral-500 text-sm mt-1">Share your first update with your tenants community.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {posts.map(p=>(
            <div key={p.id} className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
              <div className="p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-bold text-sm">{p.author_name[0]}</div>
                  <div><div className="font-semibold text-sm text-neutral-900">{p.author_name}</div><div className="text-xs text-neutral-400">{new Date(p.created_at).toLocaleDateString()}</div></div>
                </div>
                <p className="text-neutral-800 text-sm leading-relaxed">{p.body}</p>
              </div>
              <div className="flex items-center gap-4 px-5 py-3 border-t border-neutral-100">
                <button onClick={()=>toggleLike(p.id,p.liked_by_me)} className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${p.liked_by_me?"text-red-500":"text-neutral-500 hover:text-red-400"}`}>
                  {p.liked_by_me?"❤️":"🤍"} {p.like_count}
                </button>
                <button onClick={()=>loadComments(p.id)} className="flex items-center gap-1.5 text-sm font-medium text-neutral-500 hover:text-blue-500 transition-colors">
                  💬 {p.comment_count}
                </button>
              </div>
              {activeComments===p.id && (
                <div className="px-5 pb-4 border-t border-neutral-100 bg-neutral-50">
                  <div className="pt-3 space-y-2 mb-3">
                    {(comments[p.id]||[]).map(c=>(
                      <div key={c.id} className="bg-white rounded-xl border border-neutral-100 px-3 py-2 text-sm">{c.body}</div>
                    ))}
                    {(comments[p.id]||[]).length===0 && <div className="text-xs text-neutral-400 text-center py-2">No comments yet.</div>}
                  </div>
                  <div className="flex gap-2">
                    <input className="flex-1 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm outline-none" placeholder="Add a comment..." value={commentInput} onChange={e=>setCommentInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addComment(p.id)}/>
                    <button onClick={()=>addComment(p.id)} className="bg-blue-600 text-white px-3 py-2 rounded-xl text-sm font-semibold hover:bg-blue-700">Post</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
