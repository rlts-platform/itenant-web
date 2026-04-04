export default function Home() {
  return (
    <main style={{display:"grid",placeItems:"center",minHeight:"100vh",fontFamily:"system-ui"}}>
      <div style={{textAlign:"center",maxWidth:420,padding:24}}>
        <h1 style={{fontSize:28,marginBottom:10}}>iTenant</h1>
        <p style={{opacity:.75,marginBottom:18}}>Continue to login.</p>
        <a href="/login" style={{display:"inline-block",padding:"12px 18px",borderRadius:12,background:"#000",color:"#fff",textDecoration:"none"}}>
          Go to Login
        </a>
      </div>
    </main>
  );
}
