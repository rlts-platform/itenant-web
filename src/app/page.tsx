export default function Home() {
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
        {/* Light overlay preserving natural tones */}
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
            {name:"Starter",price:"$29",units:"10 units",tenants:"10 tenants",color:"#F4F3FF",border:"#E2DEF9",btn:"#7C6FCD"},
            {name:"Growth",price:"$79",units:"50 units",tenants:"50 tenants",color:"#F4F3FF",border:"#E2DEF9",btn:"#7C6FCD"},
            {name:"Pro",price:"$149",units:"200 units",tenants:"200 tenants",color:"#3D2FA0",border:"#3D2FA0",btn:"#fff",featured:true},
            {name:"Enterprise",price:"Custom",units:"Unlimited",tenants:"Unlimited",color:"#F4F3FF",border:"#E2DEF9",btn:"#7C6FCD",contact:true},
          ].map(p => (
            <div key={p.name} style={{background:p.featured?"linear-gradient(135deg,#3D2FA0,#7C6FCD)":p.color,borderRadius:16,border:`2px solid ${p.border}`,padding:"28px 24px",position:"relative"}}>
              {p.featured && <div style={{position:"absolute",top:-12,left:"50%",transform:"translateX(-50%)",background:"#7C6FCD",color:"#fff",fontSize:11,fontWeight:700,padding:"4px 14px",borderRadius:99,border:"2px solid #fff",whiteSpace:"nowrap"}}>MOST POPULAR</div>}
              <div style={{fontWeight:800,fontSize:18,color:p.featured?"#fff":"#1A1A2E",marginBottom:6}}>{p.name}</div>
              <div style={{fontWeight:800,fontSize:36,color:p.featured?"#fff":"#7C6FCD",marginBottom:4}}>{p.price}<span style={{fontSize:14,fontWeight:500,opacity:.7}}>{p.price!=="Custom"?"/mo":""}</span></div>
              <div style={{color:p.featured?"rgba(255,255,255,0.8)":"#6B6B8A",fontSize:13,marginBottom:4}}>{p.units}</div>
              <div style={{color:p.featured?"rgba(255,255,255,0.8)":"#6B6B8A",fontSize:13,marginBottom:24}}>{p.tenants}</div>
              <a href="/login" style={{display:"block",textAlign:"center",padding:"10px 0",borderRadius:10,background:p.featured?"rgba(255,255,255,0.2)":p.btn,color:p.featured?"#fff":"#fff",fontWeight:700,fontSize:14,textDecoration:"none",border:p.featured?"1.5px solid rgba(255,255,255,0.4)":"none"}}>
                {p.contact?"Contact Us":"Get Started"}
              </a>
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
    </main>
  );
}
