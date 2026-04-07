"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function Home() {
  const [showContact, setShowContact] = useState(false);
  const [form, setForm] = useState({ name: "", business: "", email: "", phone: "", units: "", message: "" });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState("");

  async function submitInquiry() {
    if (!form.name || !form.email || !form.business || !form.phone || !form.units) {
      setErr("Please fill in all required fields.");
      return;
    }
    setSending(true); setErr("");
    await supabase.from("enterprise_inquiries").insert({
      name: form.name, business_name: form.business, email: form.email,
      phone: form.phone, unit_count: parseInt(form.units) || 0,
      message: form.message, status: "new",
    }).maybeSingle();
    setSent(true); setSending(false);
  }

  return (
    <main style={{fontFamily:"system-ui",background:"#F4F3FF",minHeight:"100vh"}}>
      {/* NAV */}
      <nav style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"18px 40px",background:"#fff",borderBottom:"1px solid #E2DEF9"}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:36,height:36,borderRadius:8,background:"#7C6FCD",display:"flex",alignItems:"center",justifyContent:"center"}}>
            <span style={{color:"#fff",fontWeight:800,fontSize:18}}>i</span>
          </div>
          <span style={{fontWeight:800,fontSize:20,color:"#1A1A2E"}}>i<span style={{color:"#7C6FCD"}}>Tenant</span></span>
        </div>
        <div style={{display:"flex",gap:12}}>
          <a href="/login" style={{padding:"8px 20px",borderRadius:10,border:"1.5px solid #7C6FCD",color:"#7C6FCD",fontWeight:600,fontSize:14,textDecoration:"none"}}>Sign In</a>
          <a href="/login" style={{padding:"8px 20px",borderRadius:10,background:"#7C6FCD",color:"#fff",fontWeight:600,fontSize:14,textDecoration:"none"}}>Get Started</a>
        </div>
      </nav>

      {/* HERO */}
      <div style={{position:"relative",minHeight:520,display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden",
        backgroundImage:"url('https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=1600&q=80')",
        backgroundSize:"cover",backgroundPosition:"center"}}>
        <div style={{position:"absolute",inset:0,background:"rgba(26,26,46,0.52)"}}/>
        <div style={{position:"relative",textAlign:"center",padding:"60px 24px",maxWidth:720}}>
          <div style={{display:"inline-block",background:"rgba(124,111,205,0.25)",border:"1px solid rgba(124,111,205,0.5)",borderRadius:99,padding:"6px 20px",marginBottom:20}}>
            <span style={{color:"rgba(255,255,255,0.9)",fontSize:13,fontWeight:600,letterSpacing:1}}>PROPERTY MANAGEMENT, SIMPLIFIED</span>
          </div>
          <h1 style={{fontSize:"clamp(32px,5vw,56px)",fontWeight:800,color:"#FFFFFF",lineHeight:1.15,marginBottom:20,textShadow:"0 2px 8px rgba(0,0,0,0.45)"}}>
            Manage Properties.<br/>
            <span style={{color:"#C4B8F0"}}>Effortlessly.</span>
          </h1>
          <p style={{fontSize:18,color:"rgba(255,255,255,0.88)",lineHeight:1.6,marginBottom:36,maxWidth:520,margin:"0 auto 36px",textShadow:"0 1px 4px rgba(0,0,0,0.35)"}}>
            The AI-powered platform for landlords and property managers. Leases, payments, maintenance, and tenants — all in one place.
          </p>
          <div style={{display:"flex",gap:14,justifyContent:"center",flexWrap:"wrap"}}>
            <a href="/login" style={{padding:"14px 32px",borderRadius:12,background:"#7C6FCD",color:"#fff",fontWeight:700,fontSize:16,textDecoration:"none",boxShadow:"0 4px 16px rgba(124,111,205,0.5)"}}>
              Start Free Trial
            </a>
            <a href="/login" style={{padding:"14px 32px",borderRadius:12,background:"rgba(255,255,255,0.15)",backdropFilter:"blur(8px)",border:"1.5px solid rgba(255,255,255,0.4)",color:"#fff",fontWeight:700,fontSize:16,textDecoration:"none"}}>
              Sign In
            </a>
          </div>
        </div>
      </div>

      {/* FEATURES */}
      <div style={{maxWidth:1100,margin:"0 auto",padding:"72px 24px"}}>
        <h2 style={{textAlign:"center",fontSize:32,fontWeight:800,color:"#1A1A2E",marginBottom:8}}>Everything You Need</h2>
        <p style={{textAlign:"center",color:"#6B6B8A",fontSize:16,marginBottom:48}}>Built for landlords who want a real tool, not a spreadsheet.</p>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",gap:24}}>
          {[
            {icon:"🤖",title:"AI Lease Generator",desc:"Generate state-specific lease agreements in seconds. Review, edit, and send directly to tenants."},
            {icon:"💳",title:"Rent Collection",desc:"Accept payments via bank transfer (Plaid) or card (Stripe). Auto-receipts for every payment."},
            {icon:"🔧",title:"Maintenance Kanban",desc:"Visual maintenance pipeline from submission to resolution. Tenants see real-time status updates."},
            {icon:"⚡",title:"16 Automations",desc:"Rent reminders, late notices, lease renewals — set them up once and let them run."},
            {icon:"📊",title:"Analytics Dashboard",desc:"Revenue, expenses, occupancy, and net profit across your entire portfolio at a glance."},
            {icon:"📢",title:"Broadcast Announcements",desc:"Send emergency or general announcements to all tenants in a property instantly."},
          ].map(f => (
            <div key={f.title} style={{background:"#fff",borderRadius:16,border:"1.5px solid #E2DEF9",padding:"28px 24px",boxShadow:"0 2px 12px rgba(0,0,0,0.04)"}}>
              <div style={{fontSize:32,marginBottom:14}}>{f.icon}</div>
              <h3 style={{fontWeight:700,fontSize:17,color:"#1A1A2E",marginBottom:8}}>{f.title}</h3>
              <p style={{color:"#6B6B8A",fontSize:14,lineHeight:1.6}}>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* PRICING */}
      <div style={{background:"#fff",borderTop:"1.5px solid #E2DEF9",borderBottom:"1.5px solid #E2DEF9",padding:"72px 24px"}}>
        <h2 style={{textAlign:"center",fontSize:32,fontWeight:800,color:"#1A1A2E",marginBottom:8}}>Simple, Transparent Pricing</h2>
        <p style={{textAlign:"center",color:"#6B6B8A",fontSize:16,marginBottom:48}}>No setup fees. No per-unit surprises. Cancel anytime.</p>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:20,maxWidth:960,margin:"0 auto"}}>
          {[
            {name:"Starter",price:"$29",period:"/mo",units:"10 units",tenants:"10 tenants",featured:false,action:"get-started"},
            {name:"Growth",price:"$79",period:"/mo",units:"50 units",tenants:"50 tenants",featured:false,action:"get-started"},
            {name:"Pro",price:"$149",period:"/mo",units:"200 units",tenants:"200 tenants",featured:true,action:"get-started"},
            {name:"Enterprise",price:"Custom",period:"",units:"Unlimited units",tenants:"Unlimited tenants",featured:false,action:"contact"},
          ].map(p => (
            <div key={p.name} style={{
              background: p.featured ? "linear-gradient(135deg,#3D2FA0,#7C6FCD)" : "#F4F3FF",
              borderRadius:16, border: p.featured ? "2px solid #7C6FCD" : "1.5px solid #E2DEF9",
              padding:"28px 24px", position:"relative"
            }}>
              {p.featured && <div style={{position:"absolute",top:-12,left:"50%",transform:"translateX(-50%)",background:"#7C6FCD",color:"#fff",fontSize:11,fontWeight:700,padding:"4px 14px",borderRadius:99,border:"2px solid #fff",whiteSpace:"nowrap"}}>MOST POPULAR</div>}
              <div style={{fontWeight:800,fontSize:18,color:p.featured?"#fff":"#1A1A2E",marginBottom:6}}>{p.name}</div>
              <div style={{fontWeight:800,fontSize:36,color:p.featured?"#fff":"#7C6FCD",marginBottom:4}}>
                {p.price}<span style={{fontSize:14,fontWeight:500,opacity:.7}}>{p.period}</span>
              </div>
              <div style={{color:p.featured?"rgba(255,255,255,0.8)":"#6B6B8A",fontSize:13,marginBottom:4}}>{p.units}</div>
              <div style={{color:p.featured?"rgba(255,255,255,0.8)":"#6B6B8A",fontSize:13,marginBottom:24}}>{p.tenants}</div>
              {p.action === "contact" ? (
                <button onClick={() => setShowContact(true)} style={{display:"block",width:"100%",textAlign:"center",padding:"10px 0",borderRadius:10,background:"#7C6FCD",color:"#fff",fontWeight:700,fontSize:14,border:"none",cursor:"pointer"}}>
                  Contact Us
                </button>
              ) : (
                <a href="/login" style={{display:"block",textAlign:"center",padding:"10px 0",borderRadius:10,
                  background: p.featured ? "rgba(255,255,255,0.2)" : "#7C6FCD",
                  color:"#fff",fontWeight:700,fontSize:14,textDecoration:"none",
                  border: p.featured ? "1.5px solid rgba(255,255,255,0.4)" : "none"}}>
                  Get Started
                </a>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* FOOTER */}
      <footer style={{textAlign:"center",padding:"32px 24px",color:"#9CA3AF",fontSize:13}}>
        <div style={{marginBottom:12}}>
          <a href="/terms" style={{color:"#7C6FCD",textDecoration:"none",marginRight:24}}>Terms of Service</a>
          <a href="/privacy" style={{color:"#7C6FCD",textDecoration:"none"}}>Privacy Policy</a>
        </div>
        <div>© 2026 iTenant. All rights reserved.</div>
      </footer>

      {/* ENTERPRISE CONTACT MODAL */}
      {showContact && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:999,display:"flex",alignItems:"center",justifyContent:"center",padding:24}}>
          <div style={{background:"#fff",borderRadius:20,padding:40,maxWidth:480,width:"100%",boxShadow:"0 20px 60px rgba(0,0,0,0.2)"}}>
            {sent ? (
              <div style={{textAlign:"center",padding:"20px 0"}}>
                <div style={{fontSize:48,marginBottom:16}}>✅</div>
                <h3 style={{fontSize:22,fontWeight:800,color:"#1A1A2E",marginBottom:8}}>Message Sent!</h3>
                <p style={{color:"#6B6B8A",fontSize:15,marginBottom:24}}>We'll be in touch within 24 hours to discuss your Enterprise plan.</p>
                <button onClick={() => { setShowContact(false); setSent(false); setForm({ name:"",business:"",email:"",phone:"",units:"",message:"" }); }}
                  style={{padding:"12px 28px",borderRadius:10,background:"#7C6FCD",color:"#fff",fontWeight:700,fontSize:15,border:"none",cursor:"pointer"}}>
                  Close
                </button>
              </div>
            ) : (
              <>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24}}>
                  <h3 style={{fontSize:20,fontWeight:800,color:"#1A1A2E"}}>Enterprise Inquiry</h3>
                  <button onClick={() => setShowContact(false)} style={{background:"none",border:"none",cursor:"pointer",fontSize:20,color:"#9CA3AF"}}>✕</button>
                </div>
                {err && <div style={{background:"#FEF2F2",border:"1px solid #FECACA",borderRadius:8,padding:"10px 14px",fontSize:13,color:"#DC2626",marginBottom:16}}>{err}</div>}
                {[
                  { label:"Full Name *", key:"name", type:"text", placeholder:"Your name" },
                  { label:"Business Name *", key:"business", type:"text", placeholder:"Company or portfolio name" },
                  { label:"Email Address *", key:"email", type:"email", placeholder:"you@company.com" },
                  { label:"Phone Number *", key:"phone", type:"tel", placeholder:"+1 (555) 000-0000" },
                  { label:"Approximate Number of Units *", key:"units", type:"number", placeholder:"e.g. 250" },
                ].map(f => (
                  <div key={f.key} style={{marginBottom:14}}>
                    <label style={{display:"block",fontSize:12,fontWeight:600,color:"#555",marginBottom:6}}>{f.label}</label>
                    <input type={f.type} placeholder={f.placeholder} value={(form as any)[f.key]}
                      onChange={e => setForm(p => ({...p, [f.key]: e.target.value}))}
                      style={{width:"100%",padding:"10px 14px",border:"1.5px solid #E2DEF9",borderRadius:8,fontSize:14,outline:"none",boxSizing:"border-box"}} />
                  </div>
                ))}
                <div style={{marginBottom:20}}>
                  <label style={{display:"block",fontSize:12,fontWeight:600,color:"#555",marginBottom:6}}>Message or Specific Needs</label>
                  <textarea placeholder="Tell us about your portfolio and what you're looking for..." value={form.message}
                    onChange={e => setForm(p => ({...p, message: e.target.value}))} rows={3}
                    style={{width:"100%",padding:"10px 14px",border:"1.5px solid #E2DEF9",borderRadius:8,fontSize:14,outline:"none",resize:"none",boxSizing:"border-box"}} />
                </div>
                <button onClick={submitInquiry} disabled={sending}
                  style={{width:"100%",padding:"14px",borderRadius:10,background:"#7C6FCD",color:"#fff",fontWeight:700,fontSize:15,border:"none",cursor:sending?"not-allowed":"pointer",opacity:sending?0.7:1}}>
                  {sending ? "Sending..." : "Send Inquiry"}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
