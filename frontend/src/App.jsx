import { useState, useEffect, useRef, useCallback, Component } from "react";

const API = "http://localhost:8000";

const T = {
  bg:"#05070f", surface:"#080c18", card:"#0c1120", card2:"#101628",
  border:"#16203a", border2:"#1e2d50",
  cyan:"#00e5ff", cyanDim:"rgba(0,229,255,0.1)", cyanGlow:"rgba(0,229,255,0.25)",
  green:"#00ff9d", greenDim:"rgba(0,255,157,0.1)",
  amber:"#ffc840", amberDim:"rgba(255,200,64,0.1)",
  red:"#ff3f5b", redDim:"rgba(255,63,91,0.1)",
  violet:"#b060ff",
  text:"#e8eeff", text2:"#7888aa", muted:"#2e3d60",
};

const riskColor = r => { const n=parseFloat(r); if(isNaN(n))return T.cyan; return n<0.35?T.green:n<0.65?T.amber:T.red; };
const riskGrad  = r => { const n=parseFloat(r); return n<0.35?`linear-gradient(90deg,${T.green},#00aa66)`:n<0.65?`linear-gradient(90deg,${T.amber},#bb8800)`:`linear-gradient(90deg,${T.red},#cc0022)`; };
const decIcon   = { allow:"✓", escalate:"⚠", deny:"✕" };
const decColor  = { allow:"#00ff9d", escalate:"#ffc840", deny:"#ff3f5b" };
const decDim    = { allow:"rgba(0,255,157,0.1)", escalate:"rgba(255,200,64,0.1)", deny:"rgba(255,63,91,0.1)" };

// Normalize all numeric fields coming from backend (SQLite may return strings)
const norm = row => ({
  ...row,
  risk_score:  parseFloat(row.risk_score  || 0),
  confidence:  parseFloat(row.confidence  || 0),
  data_sensitivity: parseInt(row.data_sensitivity || 0),
  request_frequency: parseInt(row.request_frequency || 0),
  time_of_day: parseInt(row.time_of_day || 0),
  privilege_level: parseInt(row.privilege_level || 0),
});

const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&family=IBM+Plex+Mono:ital,wght@0,300;0,400;0,500;0,600;1,300&family=Outfit:wght@300;400;500;600;700&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
  html,body,#root{height:100%;}
  body{background:#05070f;color:#e8eeff;font-family:'Outfit',sans-serif;overflow-x:hidden;}
  ::-webkit-scrollbar{width:4px;height:4px;}
  ::-webkit-scrollbar-track{background:#080c18;}
  ::-webkit-scrollbar-thumb{background:#1e2d50;border-radius:2px;}
  input[type=range]{-webkit-appearance:none;appearance:none;height:3px;background:#2e3d60;border-radius:2px;outline:none;width:100%;cursor:pointer;}
  input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:16px;height:16px;border-radius:50%;background:#00e5ff;border:2px solid #05070f;box-shadow:0 0 8px rgba(0,229,255,0.25);cursor:pointer;transition:transform 0.15s;}
  input[type=range]::-webkit-slider-thumb:hover{transform:scale(1.3);}
  select,input,textarea{color-scheme:dark;}
  @keyframes fadeUp{from{opacity:0;transform:translateY(20px);}to{opacity:1;transform:translateY(0);}}
  @keyframes fadeIn{from{opacity:0;}to{opacity:1;}}
  @keyframes pageIn{from{opacity:0;transform:translateY(8px);}to{opacity:1;transform:translateY(0);}}
  @keyframes spin{to{transform:rotate(360deg);}}
  @keyframes blink{0%,100%{opacity:1;}50%{opacity:0.2;}}
  @keyframes pulse{0%,100%{transform:scale(1);opacity:0.7;}50%{transform:scale(1.08);opacity:1;}}
  @keyframes msgIn{from{opacity:0;transform:translateY(6px);}to{opacity:1;transform:translateY(0);}}
  @keyframes landingExit{0%{opacity:1;transform:scale(1);}100%{opacity:0;transform:scale(1.04);}}
  @keyframes appEnter{from{opacity:0;transform:scale(0.98);}to{opacity:1;transform:scale(1);}}
  @keyframes diamondPulse{0%,100%{filter:drop-shadow(0 0 10px #00e5ff);}50%{filter:drop-shadow(0 0 22px #b060ff);}}
  .sb-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,0.65);backdrop-filter:blur(4px);z-index:99;}
  .sb-overlay.open{display:block;animation:fadeIn 0.2s;}
  .hbg{display:none;flex-direction:column;gap:5px;cursor:pointer;padding:6px;border-radius:6px;background:transparent;border:none;transition:background 0.15s;}
  .hbg:hover{background:rgba(0,229,255,0.08);}
  .hbg span{display:block;width:20px;height:2px;background:#7888aa;border-radius:2px;transition:all 0.25s;}
  .hbg.open span:nth-child(1){transform:translateY(7px) rotate(45deg);}
  .hbg.open span:nth-child(2){opacity:0;transform:scaleX(0);}
  .hbg.open span:nth-child(3){transform:translateY(-7px) rotate(-45deg);}
  .tw{overflow-x:auto;-webkit-overflow-scrolling:touch;}
  @media(max-width:1024px){.g4{grid-template-columns:repeat(2,1fr)!important;}.g3{grid-template-columns:repeat(2,1fr)!important;}.g2c{grid-template-columns:1fr!important;}.gf2{grid-template-columns:1fr!important;}.gkv4{grid-template-columns:repeat(2,1fr)!important;}}
  @media(max-width:768px){.hbg{display:flex!important;}.msb{transform:translateX(-100%);transition:transform 0.3s cubic-bezier(0.16,1,0.3,1);}.msb.open{transform:translateX(0);}.mwrap{margin-left:0!important;}.mpad{padding:16px!important;}.g4{grid-template-columns:repeat(2,1fr)!important;}.g3{grid-template-columns:1fr!important;}.lstrip{display:none!important;}.gkv3{grid-template-columns:1fr 1fr!important;}.gkv4{grid-template-columns:1fr 1fr!important;}.epdesc{display:none!important;}}
  @media(max-width:480px){.g4{grid-template-columns:1fr 1fr!important;}.gf2{grid-template-columns:1fr!important;}.gkv3{grid-template-columns:1fr!important;}}
`;

// ERROR BOUNDARY
class ErrorBoundary extends Component {
  constructor(p){super(p);this.state={err:null};}
  static getDerivedStateFromError(e){return{err:e};}
  render(){
    if(this.state.err)return(
      <div style={{padding:40,textAlign:"center",fontFamily:"'IBM Plex Mono',monospace"}}>
        <div style={{fontSize:20,color:"#ff3f5b",marginBottom:12}}>⚠ Something went wrong</div>
        <div style={{fontSize:11,color:"#7888aa",marginBottom:20}}>{this.state.err.message}</div>
        <button onClick={()=>this.setState({err:null})} style={{padding:"8px 20px",borderRadius:6,background:"rgba(255,63,91,0.1)",border:"1px solid rgba(255,63,91,0.3)",color:"#ff3f5b",cursor:"pointer",fontFamily:"'IBM Plex Mono',monospace",fontSize:10}}>↻ Retry</button>
      </div>
    );
    return this.props.children;
  }
}

// HOOKS
function useApi(){
  return useCallback(async(path,opts={})=>{
    const r=await fetch(`${API}${path}`,{headers:{"Content-Type":"application/json"},...opts});
    if(!r.ok)throw new Error(`HTTP ${r.status}`);
    return r.json();
  },[]);
}
function useMobile(bp=768){
  const[m,setM]=useState(()=>typeof window!=="undefined"?window.innerWidth<=bp:false);
  useEffect(()=>{const fn=()=>setM(window.innerWidth<=bp);window.addEventListener("resize",fn);return()=>window.removeEventListener("resize",fn);},[bp]);
  return m;
}
function useToast(){
  const[s,setS]=useState({msg:"",type:"info",v:false});
  const t=useRef();
  const show=useCallback((msg,type="info")=>{
    clearTimeout(t.current);
    setS({msg,type,v:true});
    t.current=setTimeout(()=>setS(x=>({...x,v:false})),3200);
  },[]);
  return[s,show];
}

// SMALL UI
const Spinner=()=><div style={{width:13,height:13,border:"2px solid rgba(0,229,255,0.15)",borderTopColor:"#00e5ff",borderRadius:"50%",animation:"spin 0.65s linear infinite",display:"inline-block"}}/>;

function Toast({msg,type,v}){
  const c={ok:"#00ff9d",err:"#ff3f5b",info:"#00e5ff"}[type]||"#00e5ff";
  return <div style={{position:"fixed",bottom:24,right:24,zIndex:999,background:"#0c1120",border:`1px solid #1e2d50`,borderLeft:`3px solid ${c}`,borderRadius:8,padding:"11px 18px",fontFamily:"'IBM Plex Mono',monospace",fontSize:10,color:c,boxShadow:"0 20px 50px rgba(0,0,0,0.5)",transform:v?"translateY(0)":"translateY(70px)",opacity:v?1:0,transition:"all 0.35s cubic-bezier(0.16,1,0.3,1)",pointerEvents:"none",maxWidth:300}}>{msg}</div>;
}

function Badge({dec}){
  const d=dec||"allow";
  return <span style={{display:"inline-flex",alignItems:"center",gap:4,padding:"2px 9px",borderRadius:4,fontFamily:"'IBM Plex Mono',monospace",fontSize:9,fontWeight:700,letterSpacing:"1.5px",textTransform:"uppercase",background:decDim[d]||"rgba(0,229,255,0.1)",color:decColor[d]||"#00e5ff",border:`1px solid ${decColor[d]||"#00e5ff"}22`}}><span style={{fontSize:5}}>●</span>{d}</span>;
}

function StatCard({label,value,sub,accent,icon}){
  const[h,sH]=useState(false);
  return <div onMouseEnter={()=>sH(true)} onMouseLeave={()=>sH(false)} style={{background:"#0c1120",border:`1px solid ${h?"#1e2d50":"#16203a"}`,borderRadius:10,padding:"18px 20px",position:"relative",overflow:"hidden",transform:h?"translateY(-2px)":"translateY(0)",transition:"all 0.2s",cursor:"default"}}>
    <div style={{position:"absolute",top:0,left:0,right:0,height:2,background:`linear-gradient(90deg,${accent},transparent)`}}/>
    {icon&&<div style={{position:"absolute",right:12,bottom:8,fontSize:30,opacity:0.04}}>{icon}</div>}
    <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:8,letterSpacing:"2.5px",textTransform:"uppercase",color:"#7888aa",marginBottom:8}}>{label}</div>
    <div style={{fontFamily:"'Rajdhani',sans-serif",fontSize:28,fontWeight:700,color:accent,lineHeight:1,marginBottom:5}}>{value??'—'}</div>
    <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:9,color:"#2e3d60"}}>{sub}</div>
  </div>;
}

function Card({title,children,right,style={}}){
  return <div style={{background:"#0c1120",border:"1px solid #16203a",borderRadius:10,overflow:"hidden",marginBottom:20,...style}}>
    {title&&<div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"13px 20px",borderBottom:"1px solid #16203a",background:"rgba(0,0,0,0.2)"}}>
      <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:10,fontWeight:600,letterSpacing:"2px",textTransform:"uppercase",color:"#e8eeff",display:"flex",alignItems:"center",gap:8}}>
        <div style={{width:5,height:5,borderRadius:"50%",background:"#00e5ff"}}/>{title}
      </div>
      {right}
    </div>}
    <div style={{padding:20}}>{children}</div>
  </div>;
}

function Gauge({label,value,color}){
  const pct=Math.min(Math.max((value||0)*100,0),100);
  const numColor=color&&color.includes("gradient")?"#00e5ff":color||"#00e5ff";
  return <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:10}}>
    <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:8,color:"#7888aa",letterSpacing:"1.5px",textTransform:"uppercase",minWidth:90}}>{label}</div>
    <div style={{flex:1,height:6,background:"#2e3d60",borderRadius:3,overflow:"hidden"}}>
      <div style={{height:"100%",width:`${pct}%`,borderRadius:3,background:color||"#00e5ff",transition:"width 0.8s cubic-bezier(0.16,1,0.3,1)"}}/>
    </div>
    <div style={{fontFamily:"'Rajdhani',sans-serif",fontSize:13,fontWeight:700,color:numColor,minWidth:46,textAlign:"right"}}>{typeof value==="number"?value.toFixed(4):"—"}</div>
  </div>;
}

function ShapList({explanation}){
  if(!explanation||!explanation.length)return <div style={{color:"#2e3d60",fontFamily:"'IBM Plex Mono',monospace",fontSize:10,padding:"8px 0"}}>No explanation data</div>;
  const maxM=Math.max(...explanation.map(e=>e?.magnitude||0),0.01);
  return <div style={{display:"flex",flexDirection:"column",gap:8}}>
    {explanation.slice(0,8).map((e,i)=>{
      if(!e)return null;
      const pct=Math.max(((e.magnitude||0)/maxM)*100,2);
      const pos=(e.shap_value||0)>0;
      return <div key={i} style={{display:"flex",alignItems:"center",gap:10}}>
        <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:9,color:"#7888aa",minWidth:130}}>{e.feature||"—"}</div>
        <div style={{flex:1,height:18,background:"#2e3d60",borderRadius:3,overflow:"hidden"}}>
          <div style={{height:"100%",width:`${pct}%`,borderRadius:3,minWidth:2,background:pos?"linear-gradient(90deg,rgba(255,63,91,0.7),rgba(255,63,91,0.3))":"linear-gradient(90deg,rgba(0,255,157,0.7),rgba(0,255,157,0.3))",display:"flex",alignItems:"center",padding:"0 6px",fontFamily:"'IBM Plex Mono',monospace",fontSize:8,color:pos?"#ff3f5b":"#00ff9d",transition:"width 0.7s cubic-bezier(0.16,1,0.3,1)"}}>{pct>28?e.direction:""}</div>
        </div>
        <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:9,color:pos?"#ff3f5b":"#00ff9d",minWidth:52,textAlign:"right"}}>{(e.shap_value||0)>0?"+":""}{(e.shap_value||0).toFixed(4)}</div>
      </div>;
    })}
  </div>;
}

function KV({label,value,color}){
  return <div style={{background:"rgba(0,0,0,0.2)",border:"1px solid #16203a",borderRadius:7,padding:"9px 12px"}}>
    <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:7,color:"#2e3d60",letterSpacing:"1.5px",textTransform:"uppercase",marginBottom:3}}>{label}</div>
    <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:12,fontWeight:600,color:color||"#e8eeff"}}>{String(value??'—')}</div>
  </div>;
}

function OverrideBar({onOverride,decisionId}){
  return <div style={{display:"flex",alignItems:"center",gap:8,marginTop:16,padding:"12px 14px",background:"rgba(0,0,0,0.2)",border:"1px solid #16203a",borderRadius:8,flexWrap:"wrap"}}>
    <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:9,color:"#2e3d60",letterSpacing:"1.5px",textTransform:"uppercase",marginRight:4}}>Override:</div>
    {["allow","escalate","deny"].map(d=>(
      <button key={d} onClick={()=>onOverride&&onOverride(d)} style={{padding:"5px 12px",borderRadius:5,border:`1px solid ${decColor[d]}44`,background:decDim[d],color:decColor[d],fontFamily:"'IBM Plex Mono',monospace",fontSize:9,fontWeight:700,cursor:"pointer",transition:"opacity 0.15s"}} onMouseEnter={e=>e.currentTarget.style.opacity="0.75"} onMouseLeave={e=>e.currentTarget.style.opacity="1"}>
        {decIcon[d]} {d}
      </button>
    ))}
    {decisionId&&<div style={{marginLeft:"auto",fontFamily:"'IBM Plex Mono',monospace",fontSize:9,color:"#2e3d60"}}>ID: #{decisionId}</div>}
  </div>;
}

function ResultPanel({data,payload,onOverride}){
  if(!data||!data.decision)return null;
  const dec=data.decision;
  return <div style={{background:"#101628",border:"1px solid #16203a",borderRadius:10,padding:24,marginTop:20,animation:"pageIn 0.4s cubic-bezier(0.16,1,0.3,1)",position:"relative",overflow:"hidden"}}>
    <div style={{position:"absolute",top:0,left:0,right:0,height:2,background:decColor[dec]||"#00e5ff"}}/>
    <div style={{display:"flex",alignItems:"center",gap:16,marginBottom:20}}>
      <div style={{width:52,height:52,borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,fontWeight:900,background:decDim[dec],color:decColor[dec],flexShrink:0}}>{decIcon[dec]}</div>
      <div>
        <div style={{fontFamily:"'Rajdhani',sans-serif",fontSize:26,fontWeight:900,letterSpacing:4,color:decColor[dec]}}>{dec.toUpperCase()}</div>
        <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:9,color:"#2e3d60",marginTop:3}}>
          #{data.decision_id} · {data.is_anomalous?"🚨 ANOMALY":"Normal"} · Confidence {(parseFloat(data.confidence||0)*100).toFixed(1)}%
        </div>
      </div>
    </div>
    {payload&&<div className="gkv3" style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginBottom:16}}>
      <KV label="Action" value={payload.action_type} color="#00e5ff"/>
      <KV label="Role" value={payload.user_role}/>
      <KV label="Sensitivity" value={`${payload.data_sensitivity}/3`}/>
      <KV label="Alignment" value={(payload.task_alignment||0).toFixed(2)}/>
      <KV label="Frequency" value={`${payload.request_frequency}/hr`}/>
      <KV label="Time" value={`${payload.time_of_day}:00`}/>
    </div>}
    <Gauge label="Risk Score" value={parseFloat(data.risk_score||0)} color={riskGrad(data.risk_score||0)}/>
    <Gauge label="Confidence" value={parseFloat(data.confidence||0)} color="linear-gradient(90deg,#00e5ff,#0077aa)"/>
    <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:8,color:"#7888aa",letterSpacing:"2px",textTransform:"uppercase",margin:"16px 0 10px"}}>SHAP — Why this decision?</div>
    <ShapList explanation={data.explanation||[]}/>
    <OverrideBar onOverride={onOverride} decisionId={data.decision_id}/>
  </div>;
}

function Modal({data,onClose,onOverride}){
  if(!data)return null;
  const dec=data.decision||"allow";
  const rc=riskColor(data.risk_score||0);
  return <div onClick={e=>{if(e.target===e.currentTarget)onClose();}} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.75)",backdropFilter:"blur(8px)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",animation:"fadeIn 0.2s"}}>
    <div style={{background:"#0c1120",border:"1px solid #1e2d50",borderRadius:12,padding:28,width:540,maxWidth:"92vw",maxHeight:"82vh",overflowY:"auto",boxShadow:"0 40px 100px rgba(0,0,0,0.7)",position:"relative"}}>
      <button onClick={onClose} style={{position:"absolute",top:12,right:12,background:"transparent",border:"none",color:"#2e3d60",fontSize:16,cursor:"pointer"}}>✕</button>
      <div style={{fontFamily:"'Rajdhani',sans-serif",fontSize:14,fontWeight:700,letterSpacing:2,marginBottom:20,color:"#e8eeff"}}>Decision Detail</div>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16}}>
        <Badge dec={dec}/>
        <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:9,color:"#2e3d60"}}>#{data.id} · {new Date(data.timestamp||Date.now()).toLocaleString()}</span>
        {data.is_anomalous&&<span style={{color:"#ff3f5b",fontSize:11}}>🚨 ANOMALY</span>}
      </div>
      <div className="gkv3" style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:16}}>
        <KV label="Action" value={data.action_type} color="#00e5ff"/>
        <KV label="Role" value={data.user_role}/>
        <KV label="Risk" value={parseFloat(data.risk_score||0).toFixed(4)} color={rc}/>
        <KV label="Confidence" value={`${(parseFloat(data.confidence||0)*100).toFixed(2)}%`}/>
        <KV label="Sensitivity" value={`${data.data_sensitivity}/3`}/>
        <KV label="Frequency" value={`${data.request_frequency}/hr`}/>
      </div>
      {data.shap_explanation?.length>0&&<>
        <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:8,color:"#7888aa",letterSpacing:"2px",textTransform:"uppercase",marginBottom:10}}>SHAP Factors</div>
        <ShapList explanation={data.shap_explanation}/>
      </>}
      {data.is_override&&<div style={{marginTop:14,padding:10,background:"rgba(255,200,64,0.1)",border:"1px solid rgba(255,200,64,0.2)",borderRadius:6,fontFamily:"'IBM Plex Mono',monospace",fontSize:9,color:"#ffc840"}}>👤 Override → {(data.override_decision||"").toUpperCase()}</div>}
      <OverrideBar onOverride={(d)=>onOverride&&onOverride(data.id,d)}/>
    </div>
  </div>;
}

function ParticleBg(){
  const r=useRef();
  useEffect(()=>{
    const c=r.current;if(!c)return;
    const ctx=c.getContext("2d");let W,H,id;
    const pts=Array.from({length:80},()=>({x:Math.random()*window.innerWidth,y:Math.random()*window.innerHeight,r:Math.random()*1.3+0.3,vx:(Math.random()-0.5)*0.22,vy:(Math.random()-0.5)*0.22,a:Math.random()*0.45+0.1,d:Math.random()>0.72}));
    const resize=()=>{W=c.width=window.innerWidth;H=c.height=window.innerHeight;};
    resize();window.addEventListener("resize",resize);
    const draw=()=>{
      ctx.clearRect(0,0,W,H);
      ctx.strokeStyle="rgba(0,229,255,0.025)";ctx.lineWidth=1;
      for(let x=0;x<W;x+=48){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke();}
      for(let y=0;y<H;y+=48){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}
      pts.forEach((p,i)=>{
        p.x+=p.vx;p.y+=p.vy;
        if(p.x<0)p.x=W;if(p.x>W)p.x=0;if(p.y<0)p.y=H;if(p.y>H)p.y=0;
        pts.slice(i+1).forEach(q=>{const dx=p.x-q.x,dy=p.y-q.y,d=Math.sqrt(dx*dx+dy*dy);if(d<110){ctx.strokeStyle=`rgba(0,229,255,${0.04*(1-d/110)})`;ctx.lineWidth=0.5;ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(q.x,q.y);ctx.stroke();}});
        if(p.d){ctx.save();ctx.translate(p.x,p.y);ctx.rotate(Math.PI/4);ctx.fillStyle=`rgba(0,229,255,${p.a*0.5})`;ctx.fillRect(-p.r,-p.r,p.r*2,p.r*2);ctx.restore();}
        else{ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fillStyle=`rgba(0,229,255,${p.a})`;ctx.fill();}
      });
      id=requestAnimationFrame(draw);
    };
    draw();
    return()=>{cancelAnimationFrame(id);window.removeEventListener("resize",resize);};
  },[]);
  return <canvas ref={r} style={{position:"absolute",inset:0,width:"100%",height:"100%"}}/>;
}

function SidebarFooter(){
  const api=useApi();
  const[info,setInfo]=useState(null);
  useEffect(()=>{api("/health").then(setInfo).catch(()=>{});},[]);
  return <div style={{padding:"14px 22px",borderTop:"1px solid #16203a",fontFamily:"'IBM Plex Mono',monospace",fontSize:9,color:"#2e3d60",lineHeight:2.2,letterSpacing:"0.5px"}}>
    {info?<><div style={{color:"#7888aa"}}>PRISM</div><div>v{info.api_version||"1.0.0"}</div><div style={{color:info.models_loaded?"#00ff9d":"#ff3f5b"}}>{info.models_loaded?"● Models Ready":"● Models Missing"}</div><div>FastAPI · SQLite</div></>
    :<div>PRISM<br/>Connecting...<br/>FastAPI · SQLite</div>}
  </div>;
}

// ── DASHBOARD ────────────────────────────────────────────────────
function Dashboard({showToast,refreshSig=0}){
  const[stats,setStats]=useState(null);
  const[feed,setFeed]=useState([]);
  const[modal,setModal]=useState(null);
  const[ar,setAr]=useState(true);
  const tmr=useRef();
  const load=()=>{
    Promise.all([
      fetch(`${API}/stats`).then(r=>r.json()),
      fetch(`${API}/history?limit=15`).then(r=>r.json())
    ]).then(([s,h])=>{
      setStats(s);
      setFeed((h.decisions||[]).map(r=>({
        ...r,
        risk_score:parseFloat(r.risk_score)||0,
        confidence:parseFloat(r.confidence)||0,
      })));
    }).catch(()=>{});
  };
  useEffect(()=>{load();},[]);
  useEffect(()=>{if(refreshSig>0){load();};},[refreshSig]);
  useEffect(()=>{if(ar){tmr.current=setInterval(load,5000);}return()=>clearInterval(tmr.current);},[ar,load]);
  const doOverride=async(id,dec)=>{
    try{
      const r=await fetch(`${API}/feedback`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({decision_id:id,override_decision:dec,reason:"Dashboard override"})});
      if(!r.ok)throw new Error();
      showToast(`Override #${id} → ${dec.toUpperCase()}`,"ok");setModal(null);load();
    }catch{showToast("Override failed","err");}
  };
  const t=stats?.total_decisions||0,a=stats?.decision_breakdown?.allow||0,e=stats?.decision_breakdown?.escalate||0,d=stats?.decision_breakdown?.deny||0;
  const Btn=({children,onClick})=><button onClick={onClick} style={{padding:"5px 11px",borderRadius:5,border:"1px solid #16203a",background:"transparent",color:"#7888aa",fontFamily:"'IBM Plex Mono',monospace",fontSize:9,cursor:"pointer"}}>{children}</button>;
  return <div style={{animation:"pageIn 0.35s cubic-bezier(0.16,1,0.3,1)"}}>
    <div className="g4" style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14,marginBottom:16}}>
      <StatCard label="Total Decisions" value={t||"—"} sub="all time" accent="#00e5ff" icon="◈"/>
      <StatCard label="Allowed" value={a||"—"} sub={t?`${(a/t*100).toFixed(1)}% of total`:"—"} accent="#00ff9d" icon="✓"/>
      <StatCard label="Escalated" value={e||"—"} sub={t?`${(e/t*100).toFixed(1)}% of total`:"—"} accent="#ffc840" icon="⚠"/>
      <StatCard label="Denied" value={d||"—"} sub={t?`${(d/t*100).toFixed(1)}% of total`:"—"} accent="#ff3f5b" icon="✕"/>
    </div>
    <div className="g3" style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:14,marginBottom:20}}>
      <StatCard label="Avg Risk Score" value={parseFloat(stats?.avg_risk_score||0).toFixed(3)||"—"} sub="0=safe · 1=critical" accent="#00e5ff"/>
      <StatCard label="Override Rate" value={stats?.override_rate!=null?`${(stats.override_rate*100).toFixed(1)}%`:"—"} sub="human corrections" accent="#b060ff"/>
      <StatCard label="Anomalies" value={stats?.anomaly_count??'—'} sub="IsolationForest" accent="#ff3f5b"/>
    </div>
    <Card title="Live Decision Feed" right={<div style={{display:"flex",gap:10,alignItems:"center"}}>
      <div onClick={()=>setAr(v=>!v)} style={{display:"flex",alignItems:"center",gap:7,cursor:"pointer",fontFamily:"'IBM Plex Mono',monospace",fontSize:9,color:"#7888aa"}}>
        <div style={{width:30,height:16,background:ar?"#00e5ff":"#2e3d60",borderRadius:8,position:"relative",transition:"background 0.2s"}}>
          <div style={{position:"absolute",top:2,left:ar?14:2,width:12,height:12,borderRadius:"50%",background:"#fff",transition:"left 0.2s"}}/>
        </div>AUTO
      </div>
      <Btn onClick={load}>↻</Btn>
    </div>}>
      <div className="tw">
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead><tr>{["#","Action","Role","Sens.","Risk","Decision","Anomaly","Time","Override"].map(h=>(
            <th key={h} style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:8,letterSpacing:"2px",textTransform:"uppercase",color:"#2e3d60",padding:"8px 12px",textAlign:"left",borderBottom:"1px solid #16203a",background:"rgba(0,0,0,0.15)",whiteSpace:"nowrap"}}>{h}</th>
          ))}</tr></thead>
          <tbody>
            {!feed.length?<tr><td colSpan={9}><div style={{textAlign:"center",padding:40,color:"#2e3d60",fontFamily:"'IBM Plex Mono',monospace",fontSize:11}}>No decisions yet. Go to Predict and analyze a request.</div></td></tr>
            :feed.map(row=>{
              const rc=riskColor(row.risk_score);
              return <tr key={row.id} onClick={()=>setModal(row)} style={{cursor:"pointer",transition:"background 0.12s"}} onMouseEnter={e=>e.currentTarget.style.background="rgba(0,229,255,0.03)"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                <td style={{padding:"10px 12px",fontFamily:"'IBM Plex Mono',monospace",fontSize:9,color:"#2e3d60"}}>#{row.id}</td>
                <td style={{padding:"10px 12px"}}><code style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:9,color:"#00e5ff"}}>{row.action_type}</code></td>
                <td style={{padding:"10px 12px",fontFamily:"'IBM Plex Mono',monospace",fontSize:9}}>{row.user_role}</td>
                <td style={{padding:"10px 12px",textAlign:"center",fontFamily:"'IBM Plex Mono',monospace",fontSize:10}}>{row.data_sensitivity}</td>
                <td style={{padding:"10px 12px"}}><div style={{display:"flex",alignItems:"center",gap:6}}><div style={{width:60,height:3,background:"#2e3d60",borderRadius:2,overflow:"hidden"}}><div style={{height:"100%",width:`${(parseFloat(row.risk_score||0)*100).toFixed(0)}%`,background:rc,borderRadius:2}}/></div><span style={{fontSize:9,color:rc,fontFamily:"'IBM Plex Mono',monospace"}}>{parseFloat(row.risk_score||0).toFixed(3)}</span></div></td>
                <td style={{padding:"10px 12px"}}><Badge dec={row.decision}/></td>
                <td style={{padding:"10px 12px",textAlign:"center"}}>{row.is_anomalous?<span style={{color:"#ff3f5b"}}>🚨</span>:<span style={{color:"#2e3d60"}}>—</span>}</td>
                <td style={{padding:"10px 12px",fontFamily:"'IBM Plex Mono',monospace",fontSize:9,color:"#2e3d60"}}>{new Date(row.timestamp||Date.now()).toLocaleTimeString("en-GB",{hour12:false})}</td>
                <td style={{padding:"10px 12px",fontFamily:"'IBM Plex Mono',monospace",fontSize:9}}>{row.is_override?<span style={{color:"#ffc840"}}>👤 {(row.override_decision||"").toUpperCase()}</span>:<span style={{color:"#2e3d60"}}>—</span>}</td>
              </tr>;
            })}
          </tbody>
        </table>
      </div>
    </Card>
    {modal&&<Modal data={modal} onClose={()=>setModal(null)} onOverride={doOverride}/>}
  </div>;
}

// ── PREDICT ──────────────────────────────────────────────────────
function Predict({showToast,triggerRefresh}){
  const api=useApi();
  const[form,setForm]=useState({action_type:"",user_role:"",data_sensitivity:0,task_alignment:0.80,request_frequency:5,time_of_day:10});
  const[result,setResult]=useState(null);
  const[loading,setLoading]=useState(false);
  const set=(k,v)=>setForm(f=>({...f,[k]:v}));
  const DEMOS=[
    {action_type:"code_exec",user_role:"guest",data_sensitivity:3,task_alignment:0.05,request_frequency:52,time_of_day:2},
    {action_type:"web_search",user_role:"developer",data_sensitivity:0,task_alignment:0.95,request_frequency:3,time_of_day:10},
    {action_type:"db_write",user_role:"user",data_sensitivity:2,task_alignment:0.55,request_frequency:12,time_of_day:14},
    {action_type:"file_read",user_role:"admin",data_sensitivity:0,task_alignment:0.98,request_frequency:2,time_of_day:9},
    {action_type:"api_call",user_role:"user",data_sensitivity:1,task_alignment:0.70,request_frequency:55,time_of_day:3},
  ];
  const submit=async()=>{
    if(!form.action_type||!form.user_role){showToast("Select Action and Role","err");return;}
    setLoading(true);setResult(null);
    try{
      const data=await api("/predict",{method:"POST",body:JSON.stringify({...form,data_sensitivity:parseInt(form.data_sensitivity)})});
      setResult({data:norm(data),payload:{...form}});
      showToast(`${(data.decision||"").toUpperCase()} · Risk ${parseFloat(data.risk_score||0).toFixed(3)}`,"ok");
      if(triggerRefresh) triggerRefresh();
    }catch(e){showToast(`Error: ${e.message}`,"err");}
    finally{setLoading(false);}
  };
  const doOverride=async(dec)=>{
    if(!result?.data?.decision_id){showToast("No active decision","err");return;}
    try{await api("/feedback",{method:"POST",body:JSON.stringify({decision_id:result.data.decision_id,override_decision:dec,reason:"Predict override"})});showToast(`Override → ${dec.toUpperCase()}`,"ok");}
    catch{showToast("Override failed","err");}
  };
  const IS={background:"#080c18",border:"1px solid #16203a",borderRadius:6,padding:"10px 13px",color:"#e8eeff",fontFamily:"'IBM Plex Mono',monospace",fontSize:11,outline:"none",width:"100%"};
  const LS={fontFamily:"'IBM Plex Mono',monospace",fontSize:9,letterSpacing:"2px",textTransform:"uppercase",color:"#7888aa",marginBottom:7};
  return <div style={{animation:"pageIn 0.35s cubic-bezier(0.16,1,0.3,1)"}}>
    <Card title="Permission Request Analyzer" right={<button onClick={()=>setForm({...DEMOS[Math.floor(Math.random()*DEMOS.length)]})} style={{...IS,width:"auto",padding:"5px 12px",cursor:"pointer"}}>⚡ Demo</button>}>
      <div className="gf2" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:18}}>
        <div><div style={LS}>Action Type</div>
          <select value={form.action_type} onChange={e=>set("action_type",e.target.value)} style={IS}>
            <option value="">Select action...</option>
            {["file_read","file_write","api_call","code_exec","db_read","db_write","web_search","email_send"].map(a=><option key={a} value={a}>{a}</option>)}
          </select>
        </div>
        <div><div style={LS}>User Role</div>
          <select value={form.user_role} onChange={e=>set("user_role",e.target.value)} style={IS}>
            <option value="">Select role...</option>
            {["guest","user","developer","admin"].map(r=><option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <div><div style={LS}>Data Sensitivity</div>
          <select value={form.data_sensitivity} onChange={e=>set("data_sensitivity",e.target.value)} style={IS}>
            <option value={0}>0 — Public</option><option value={1}>1 — Internal</option>
            <option value={2}>2 — Confidential</option><option value={3}>3 — PII / Medical</option>
          </select>
        </div>
        <div><div style={LS}>Time of Day — {form.time_of_day}:00</div>
          <input type="range" min={0} max={23} value={form.time_of_day} onChange={e=>set("time_of_day",parseInt(e.target.value))}/>
        </div>
        <div><div style={LS}>Task Alignment — {form.task_alignment.toFixed(2)}</div>
          <input type="range" min={0} max={100} value={Math.round(form.task_alignment*100)} onChange={e=>set("task_alignment",parseInt(e.target.value)/100)}/>
        </div>
        <div><div style={LS}>Request Frequency — {form.request_frequency}/hr</div>
          <input type="range" min={1} max={60} value={form.request_frequency} onChange={e=>set("request_frequency",parseInt(e.target.value))}/>
        </div>
        <div style={{gridColumn:"1/-1"}}>
          <button onClick={submit} disabled={loading} style={{width:"100%",padding:13,borderRadius:7,background:"linear-gradient(135deg,#00e5ff,#0099cc)",border:"none",color:"#000",fontFamily:"'Rajdhani',sans-serif",fontSize:13,fontWeight:700,letterSpacing:"2px",cursor:loading?"not-allowed":"pointer",opacity:loading?0.6:1,display:"flex",alignItems:"center",justifyContent:"center",gap:10}}>
            {loading?<><Spinner/> Analyzing...</>:"⬡  Analyze Permission Request"}
          </button>
        </div>
      </div>
    </Card>
    {result&&<ResultPanel data={result.data} payload={result.payload} onOverride={doOverride}/>}
  </div>;
}

// ── LLM INTERFACE ────────────────────────────────────────────────
async function parseWithClaude(text){
  const SYS=`You are PRISM. Extract structured fields from a natural language AI agent action description. Return ONLY valid JSON:
{"action_type":"one of [file_read,file_write,api_call,code_exec,db_read,db_write,web_search,email_send]","user_role":"one of [guest,user,developer,admin]","data_sensitivity":1,"task_alignment":0.75,"request_frequency":10,"time_of_day":10}
data_sensitivity 0-3. task_alignment 0.0-1.0. request_frequency 1-60. time_of_day 0-23. No explanation, only JSON.`;
  const r=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:200,system:SYS,messages:[{role:"user",content:text}]})});
  const d=await r.json();
  return JSON.parse((d.content?.[0]?.text||"{}").replace(/```json|```/g,"").trim());
}

function fallbackParse(text){
  const t=text.toLowerCase();
  return {
    action_type:t.includes("code")||t.includes("exec")?"code_exec":t.includes("db")||t.includes("database")?"db_write":t.includes("file")?"file_read":t.includes("api")?"api_call":t.includes("web")||t.includes("search")?"web_search":"api_call",
    user_role:t.includes("admin")?"admin":t.includes("dev")?"developer":t.includes("guest")?"guest":"user",
    data_sensitivity:t.includes("medical")||t.includes("pii")||t.includes("sensitive")?3:t.includes("confidential")?2:t.includes("internal")?1:0,
    task_alignment:t.includes("unrelated")||t.includes("suspicious")?0.08:t.includes("routine")||t.includes("normal")?0.92:0.70,
    request_frequency:t.includes("50")||t.includes("55")||t.includes("flood")||t.includes("many")?52:10,
    time_of_day:t.includes("night")||t.includes("midnight")?2:10,
  };
}

function LLMInterface({showToast,triggerRefresh}){
  const api=useApi();
  const[msgs,setMsgs]=useState([{role:"system",text:`Hello. I am <b style="color:#00e5ff">PRISM</b>. Describe any agent action in natural language and I will assess its risk and return a decision. Try the quick prompts below or type your own.`,time:"System initialized"}]);
  const[input,setInput]=useState("");
  const[loading,setLoading]=useState(false);
  const[result,setResult]=useState(null);
  const[did,setDid]=useState(null);
  const aRef=useRef();
  const QUICK=["Guest executing code on medical PII data","Admin reading public files","Unknown agent: 55 API calls in 1 hour","Developer web search during coding task","User writing to confidential database at midnight"];
  const addMsg=(role,text)=>{
    const time=new Date().toLocaleTimeString("en-GB",{hour12:false});
    setMsgs(m=>[...m,{role,text,time}]);
    setTimeout(()=>{if(aRef.current)aRef.current.scrollTop=aRef.current.scrollHeight;},60);
  };
  const send=async(txt)=>{
    if(!txt.trim()||loading)return;
    setInput("");setLoading(true);
    addMsg("user",txt);
    let payload;
    try{
      addMsg("system",`<span style="color:#7888aa"><i>Parsing with Claude AI...</i></span>`);
      payload=await parseWithClaude(txt);
      setMsgs(m=>m.filter((_,i)=>i<m.length-1));
    }catch{
      setMsgs(m=>m.filter((_,i)=>i<m.length-1));
      payload=fallbackParse(txt);
    }
    try{
      const data=await api("/predict",{method:"POST",body:JSON.stringify(payload)});
      setDid(data.decision_id);setResult({data:norm(data),payload});
      const top=data.explanation?.[0];
      addMsg("system",
        `Assessment <b style="color:#00e5ff">#${data.decision_id}</b> complete<br/><br/>`+
        `Verdict: <b style="color:${decColor[data.decision]||"#00e5ff"}">${decIcon[data.decision]||"?"} ${(data.decision||"").toUpperCase()}</b><br/>`+
        `Risk: <b style="color:#00e5ff">${parseFloat(data.risk_score||0).toFixed(4)}</b> · Confidence: <b>${(parseFloat(data.confidence||0)*100).toFixed(1)}%</b>${data.is_anomalous?` · <b style="color:#ff3f5b">🚨 ANOMALY</b>`:""}<br/><br/>`+
        `Detected: <b style="color:#00e5ff">${payload.action_type}</b> by <b>${payload.user_role}</b> · sensitivity-${payload.data_sensitivity}<br/>`+
        (top?`Key factor: <b>${top.feature}</b> → ${top.direction}`:"")
      );
      showToast(`${(data.decision||"").toUpperCase()} · Risk ${parseFloat(data.risk_score||0).toFixed(3)}`,"ok");
      if(triggerRefresh) triggerRefresh();
    }catch(e){addMsg("system",`<b style="color:#ff3f5b">⚠ Backend error: ${e.message}</b>`);showToast("Backend error","err");}
    finally{setLoading(false);}
  };
  const doOverride=async(dec)=>{
    if(!did){showToast("No active decision","err");return;}
    try{await api("/feedback",{method:"POST",body:JSON.stringify({decision_id:did,override_decision:dec,reason:"LLM override"})});showToast(`Override #${did} → ${dec.toUpperCase()}`,"ok");}
    catch{showToast("Override failed","err");}
  };
  const IS={background:"#080c18",border:"1px solid #16203a",borderRadius:6,color:"#e8eeff",fontFamily:"'IBM Plex Mono',monospace",fontSize:10,outline:"none"};
  return <div className="g2c" style={{display:"grid",gridTemplateColumns:"1.2fr 1fr",gap:20,animation:"pageIn 0.35s cubic-bezier(0.16,1,0.3,1)"}}>
    <div>
      <Card title="PRISM Agent Interface" right={<button onClick={()=>{setMsgs([{role:"system",text:"Chat cleared. Ready for new assessment.",time:new Date().toLocaleTimeString()}]);setResult(null);setDid(null);}} style={{...IS,padding:"5px 12px",cursor:"pointer"}}>✕ Clear</button>}>
        <div ref={aRef} style={{background:"#080c18",border:"1px solid #16203a",borderRadius:8,padding:14,minHeight:260,maxHeight:400,overflowY:"auto",marginBottom:12}}>
          {msgs.map((m,i)=>(
            <div key={i} style={{display:"flex",gap:11,padding:"11px 0",borderBottom:i<msgs.length-1?"1px solid rgba(22,32,58,0.4)":"none",animation:"msgIn 0.3s cubic-bezier(0.16,1,0.3,1)"}}>
              <div style={{width:26,height:26,borderRadius:6,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:"#fff",flexShrink:0,background:m.role==="system"?"linear-gradient(135deg,#00e5ff,#b060ff)":"linear-gradient(135deg,#b060ff,#ff3f5b)"}}>{m.role==="system"?"P":"U"}</div>
              <div style={{flex:1}}>
                <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:8,letterSpacing:"1.5px",textTransform:"uppercase",color:"#7888aa",marginBottom:4}}>{m.role==="system"?"PRISM System":"You"}</div>
                <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:10,lineHeight:1.8,color:"#e8eeff"}} dangerouslySetInnerHTML={{__html:m.text}}/>
                <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:7,color:"#2e3d60",marginTop:3}}>{m.time}</div>
              </div>
            </div>
          ))}
          {loading&&<div style={{display:"flex",gap:11,padding:"11px 0",animation:"msgIn 0.3s"}}>
            <div style={{width:26,height:26,borderRadius:6,display:"flex",alignItems:"center",justifyContent:"center",background:"linear-gradient(135deg,#00e5ff,#b060ff)",fontWeight:700,color:"#fff",fontSize:11}}>P</div>
            <div style={{paddingTop:4}}><Spinner/></div>
          </div>}
        </div>
        <div style={{display:"flex",flexWrap:"wrap",gap:7,marginBottom:12}}>
          {QUICK.map(q=><div key={q} onClick={()=>send(q)} style={{padding:"4px 11px",borderRadius:20,border:"1px solid #16203a",fontFamily:"'IBM Plex Mono',monospace",fontSize:8,color:"#7888aa",cursor:"pointer",transition:"all 0.15s",whiteSpace:"nowrap"}} onMouseEnter={e=>{e.target.style.borderColor="rgba(0,229,255,0.3)";e.target.style.color="#00e5ff";e.target.style.background="rgba(0,229,255,0.1)";}} onMouseLeave={e=>{e.target.style.borderColor="#16203a";e.target.style.color="#7888aa";e.target.style.background="transparent";}}>{q}</div>)}
        </div>
        <div style={{display:"flex",gap:10}}>
          <textarea value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send(input);}}} placeholder="Describe an agent action in plain English..." style={{...IS,flex:1,resize:"none",minHeight:44,padding:"10px 13px",lineHeight:1.5}}/>
          <button onClick={()=>send(input)} disabled={loading} style={{width:44,height:44,borderRadius:6,background:"linear-gradient(135deg,#00e5ff,#0099cc)",border:"none",color:"#000",fontSize:16,cursor:loading?"not-allowed":"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,opacity:loading?0.5:1}}>→</button>
        </div>
      </Card>
    </div>
    <div>
      <Card title="Current Assessment" style={{marginBottom:14}}>
        {result?<>
          <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:14}}>
            <div style={{width:46,height:46,borderRadius:9,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,fontWeight:900,background:decDim[result.data.decision],color:decColor[result.data.decision]}}>{decIcon[result.data.decision]}</div>
            <div>
              <div style={{fontFamily:"'Rajdhani',sans-serif",fontSize:20,fontWeight:900,letterSpacing:3,color:decColor[result.data.decision]}}>{(result.data.decision||"").toUpperCase()}</div>
              <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:8,color:"#2e3d60"}}>#{result.data.decision_id} · {result.data.is_anomalous?"🚨 Anomaly":"Normal"}</div>
            </div>
          </div>
          <Gauge label="Risk" value={result.data.risk_score} color={riskGrad(result.data.risk_score||0)}/>
          <Gauge label="Confidence" value={result.data.confidence} color="linear-gradient(90deg,#00e5ff,#006699)"/>
          <div style={{marginTop:12}}>
            <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:8,color:"#7888aa",letterSpacing:"2px",textTransform:"uppercase",marginBottom:8}}>Top Factors</div>
            <ShapList explanation={(result.data.explanation||[]).slice(0,5)}/>
          </div>
        </>:<div style={{textAlign:"center",padding:"30px 0",color:"#2e3d60",fontFamily:"'IBM Plex Mono',monospace",fontSize:11}}>Awaiting agent request...</div>}
      </Card>
      <Card title="Human Override Panel">
        <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:9,color:"#7888aa",marginBottom:14,lineHeight:1.8}}>Review the decision and override if needed. All overrides are logged for audit.</div>
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {["allow","escalate","deny"].map(d=><button key={d} onClick={()=>doOverride(d)} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 16px",borderRadius:8,border:`1px solid ${decColor[d]}33`,background:decDim[d],color:decColor[d],cursor:"pointer",fontFamily:"'IBM Plex Mono',monospace",fontSize:10,fontWeight:700,letterSpacing:"1px",textTransform:"uppercase"}} onMouseEnter={e=>e.currentTarget.style.opacity="0.8"} onMouseLeave={e=>e.currentTarget.style.opacity="1"}>
            <span style={{fontSize:16}}>{decIcon[d]}</span>
            <div style={{textAlign:"left"}}><div>{d.charAt(0).toUpperCase()+d.slice(1)} Action</div><div style={{fontSize:8,opacity:0.7,fontWeight:400,marginTop:2}}>{d==="allow"?"Grant permission":d==="escalate"?"Request senior review":"Block entirely"}</div></div>
          </button>)}
        </div>
        <div style={{marginTop:14,padding:"10px 12px",background:"rgba(0,0,0,0.2)",border:"1px solid #16203a",borderRadius:6}}>
          <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:8,color:"#2e3d60"}}>Active Decision ID</div>
          <div style={{fontFamily:"'Rajdhani',sans-serif",fontSize:14,color:"#00e5ff",marginTop:3}}>{did?`#${did}`:"—"}</div>
        </div>
      </Card>
    </div>
  </div>;
}

// ── HISTORY ──────────────────────────────────────────────────────
function History({showToast}){
  const[all,setAll]=useState([]);
  const[filter,setFilter]=useState("all");
  const[modal,setModal]=useState(null);
  const[loading,setLoading]=useState(true);
  const load=()=>{
    setLoading(true);
    fetch(`${API}/history?limit=100`)
      .then(r=>{if(!r.ok)throw new Error(`HTTP ${r.status}`);return r.json();})
      .then(d=>{
        const rows=(d.decisions||[]).map(r=>({
          ...r,
          risk_score:parseFloat(r.risk_score)||0,
          confidence:parseFloat(r.confidence)||0,
          data_sensitivity:parseInt(r.data_sensitivity)||0,
          request_frequency:parseInt(r.request_frequency)||0,
        }));
        setAll(rows);
        setLoading(false);
      })
      .catch(e=>{showToast("Failed to load history","err");setLoading(false);});
  };
  useEffect(()=>{load();},[]);
  const FILTERS=[["all","All"],["allow","✓ Allow"],["escalate","⚠ Escalate"],["deny","✕ Deny"],["anomaly","🚨 Anomaly"],["override","👤 Overridden"]];
  let rows=all;
  if(filter==="allow")rows=rows.filter(r=>r.decision==="allow");
  if(filter==="escalate")rows=rows.filter(r=>r.decision==="escalate");
  if(filter==="deny")rows=rows.filter(r=>r.decision==="deny");
  if(filter==="anomaly")rows=rows.filter(r=>r.is_anomalous);
  if(filter==="override")rows=rows.filter(r=>r.is_override);
  const doOverride=async(id,dec)=>{
    try{
      const r=await fetch(`${API}/feedback`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({decision_id:id,override_decision:dec,reason:"History override"})});
      if(!r.ok)throw new Error();
      showToast(`Override #${id} → ${dec.toUpperCase()}`,"ok");setModal(null);load();
    }catch{showToast("Override failed","err");}
  };
  return <div style={{animation:"pageIn 0.35s cubic-bezier(0.16,1,0.3,1)"}}>
    <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:18,alignItems:"center"}}>
      {FILTERS.map(([f,lbl])=><div key={f} onClick={()=>setFilter(f)} style={{padding:"5px 13px",borderRadius:20,fontFamily:"'IBM Plex Mono',monospace",fontSize:9,letterSpacing:"1px",textTransform:"uppercase",cursor:"pointer",border:`1px solid ${filter===f?"rgba(0,229,255,0.3)":"#16203a"}`,background:filter===f?"rgba(0,229,255,0.1)":"transparent",color:filter===f?"#00e5ff":"#7888aa",transition:"all 0.15s",userSelect:"none"}}>{lbl}</div>)}
      <button onClick={load} style={{marginLeft:"auto",padding:"5px 12px",borderRadius:5,border:"1px solid #16203a",background:"transparent",color:"#7888aa",fontFamily:"'IBM Plex Mono',monospace",fontSize:9,cursor:"pointer"}}>↻ Refresh</button>
    </div>
    <Card title="Decision Log" right={<div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:9,color:"#2e3d60"}}>{rows.length} records</div>}>
      <div className="tw">
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead><tr>{["#","Time","Action","Role","Risk","Decision","Conf.","Override",""].map(h=><th key={h} style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:8,letterSpacing:"2px",textTransform:"uppercase",color:"#2e3d60",padding:"8px 12px",textAlign:"left",borderBottom:"1px solid #16203a",background:"rgba(0,0,0,0.15)",whiteSpace:"nowrap"}}>{h}</th>)}</tr></thead>
          <tbody>
            {loading?<tr><td colSpan={9}><div style={{textAlign:"center",padding:40}}><Spinner/></div></td></tr>
            :!rows.length?<tr><td colSpan={9}><div style={{textAlign:"center",padding:40,color:"#2e3d60",fontFamily:"'IBM Plex Mono',monospace",fontSize:11}}>No records match this filter.</div></td></tr>
            :rows.map(row=>{
              const rc=riskColor(row.risk_score);
              return <tr key={row.id} onClick={()=>setModal(row)} style={{cursor:"pointer"}} onMouseEnter={e=>e.currentTarget.style.background="rgba(0,229,255,0.03)"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                <td style={{padding:"10px 12px",fontFamily:"'IBM Plex Mono',monospace",fontSize:9,color:"#2e3d60"}}>#{row.id}</td>
                <td style={{padding:"10px 12px",fontFamily:"'IBM Plex Mono',monospace",fontSize:9,color:"#2e3d60"}}>{new Date(row.timestamp||Date.now()).toLocaleString("en-GB",{hour12:false,day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"})}</td>
                <td style={{padding:"10px 12px"}}><code style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:9,color:"#00e5ff"}}>{row.action_type}</code></td>
                <td style={{padding:"10px 12px",fontFamily:"'IBM Plex Mono',monospace",fontSize:9}}>{row.user_role}</td>
                <td style={{padding:"10px 12px",fontFamily:"'IBM Plex Mono',monospace",fontSize:9,color:rc}}>{parseFloat(row.risk_score||0).toFixed(3)}</td>
                <td style={{padding:"10px 12px"}}><Badge dec={row.decision}/></td>
                <td style={{padding:"10px 12px",fontFamily:"'IBM Plex Mono',monospace",fontSize:9,color:"#2e3d60"}}>{(parseFloat(row.confidence||0)*100).toFixed(1)}%</td>
                <td style={{padding:"10px 12px",fontFamily:"'IBM Plex Mono',monospace",fontSize:9}}>{row.is_override?<span style={{color:"#ffc840"}}>👤 {(row.override_decision||"").toUpperCase()}</span>:<span style={{color:"#2e3d60"}}>—</span>}</td>
                <td style={{padding:"10px 12px"}}><button onClick={e=>{e.stopPropagation();setModal(row);}} style={{padding:"3px 9px",borderRadius:4,border:"1px solid #16203a",background:"transparent",color:"#7888aa",fontFamily:"'IBM Plex Mono',monospace",fontSize:8,cursor:"pointer"}}>View</button></td>
              </tr>;
            })}
          </tbody>
        </table>
      </div>
    </Card>
    {modal&&<Modal data={modal} onClose={()=>setModal(null)} onOverride={doOverride}/>}
  </div>;
}

// ── ANALYTICS ────────────────────────────────────────────────────
function Analytics({showToast,refreshSig=0}){
  const[stats,setStats]=useState(null);
  const[hist,setHist]=useState([]);
  const charts=useRef({});
  useEffect(()=>{
    Promise.all([
      fetch(`${API}/stats`).then(r=>r.json()),
      fetch(`${API}/history?limit=100`).then(r=>r.json())
    ]).then(([s,h])=>{
      setStats(s);
      setHist((h.decisions||[]).map(r=>({...r,risk_score:parseFloat(r.risk_score)||0})));
    }).catch(()=>showToast("Failed to load analytics","err"));
  },[refreshSig]);
  useEffect(()=>{
    if(!stats)return;
    const tryBuild=()=>{
      const{Chart}=window;
      if(!Chart){setTimeout(tryBuild,200);return;}
    Object.values(charts.current).forEach(c=>{try{c.destroy();}catch{}});charts.current={};
    const CF={font:{family:"IBM Plex Mono",size:9}};
    const mk=(id,cfg)=>{const el=document.getElementById(id);if(el){charts.current[id]=new Chart(el,cfg);}};
    const a=stats.decision_breakdown?.allow||0,e=stats.decision_breakdown?.escalate||0,d=stats.decision_breakdown?.deny||0;
    mk("cD",{type:"doughnut",data:{labels:["Allow","Escalate","Deny"],datasets:[{data:[a,e,d],backgroundColor:["rgba(0,255,157,0.6)","rgba(255,200,64,0.6)","rgba(255,63,91,0.6)"],borderColor:["#00ff9d","#ffc840","#ff3f5b"],borderWidth:2,hoverOffset:6}]},options:{responsive:true,plugins:{legend:{labels:{...CF,color:"rgba(136,153,187,0.9)",padding:12}}},cutout:"65%"}});
    const tr=stats.risk_trend||[];
    mk("cL",{type:"line",data:{labels:tr.map((_,i)=>i+1),datasets:[{label:"Risk",data:tr.map(t=>t.risk_score||0),borderColor:"#00e5ff",backgroundColor:"rgba(0,229,255,0.06)",borderWidth:1.5,pointRadius:3,fill:true,tension:0.4,pointBackgroundColor:tr.map(t=>riskColor(t.risk_score))}]},options:{responsive:true,plugins:{legend:{display:false}},scales:{x:{ticks:{...CF,color:"#2e3d60"},grid:{color:"rgba(22,32,58,0.5)"}},y:{min:0,max:1,ticks:{...CF,color:"#2e3d60"},grid:{color:"rgba(22,32,58,0.5)"}}}}});
    const ac={};hist.forEach(x=>{ac[x.action_type]=(ac[x.action_type]||0)+1;});
    const sa=Object.entries(ac).sort((a,b)=>b[1]-a[1]);
    mk("cB",{type:"bar",data:{labels:sa.map(x=>x[0]),datasets:[{data:sa.map(x=>x[1]),backgroundColor:"rgba(0,229,255,0.3)",borderColor:"#00e5ff",borderWidth:1,borderRadius:4}]},options:{responsive:true,plugins:{legend:{display:false}},scales:{x:{ticks:{...CF,color:"#2e3d60"},grid:{display:false}},y:{ticks:{...CF,color:"#2e3d60"},grid:{color:"rgba(22,32,58,0.5)"}}}}});
    const bins=Array(10).fill(0);hist.forEach(x=>{const idx=Math.min(Math.floor((x.risk_score||0)*10),9);bins[idx]++;});
    mk("cH",{type:"bar",data:{labels:["0.0","0.1","0.2","0.3","0.4","0.5","0.6","0.7","0.8","0.9"],datasets:[{data:bins,backgroundColor:bins.map((_,i)=>i<4?"rgba(0,255,157,0.5)":i<7?"rgba(255,200,64,0.5)":"rgba(255,63,91,0.5)"),borderRadius:3}]},options:{responsive:true,plugins:{legend:{display:false}},scales:{x:{ticks:{...CF,color:"#2e3d60"},grid:{display:false}},y:{ticks:{...CF,color:"#2e3d60"},grid:{color:"rgba(22,32,58,0.5)"}}}}});
    };
    tryBuild();
  },[stats,hist]);
  const mi=stats?.model_info;
  return <div style={{animation:"pageIn 0.35s cubic-bezier(0.16,1,0.3,1)"}}>
    <Card title="Model Information" style={{marginBottom:20}}>
      {!stats?<div style={{textAlign:"center",padding:20}}><Spinner/></div>
      :<div className="gkv4" style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10}}>
        <KV label="Model" value={mi?.name||"XGBoost"} color="#00e5ff"/>
        <KV label="Features" value={mi?.features||8}/>
        <KV label="Classes" value={mi?.classes?.length||3}/>
        <KV label="SHAP" value="Enabled ✓" color="#00ff9d"/>
        <KV label="Anomaly" value="IsolationForest"/>
        <KV label="Decisions" value={stats?.total_decisions||0} color="#00e5ff"/>
        <KV label="Avg Risk" value={(stats?.avg_risk_score||0).toFixed(3)} color={riskColor(stats?.avg_risk_score||0)}/>
        <KV label="Version" value={mi?.version||"1.0.0"}/>
      </div>}
    </Card>
    <div className="g2c" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:18}}>
      {[["Decision Distribution","cD"],["Risk Score Trend","cL"],["Decisions by Action","cB"],["Risk Distribution","cH"]].map(([title,id])=>(
        <div key={id} style={{background:"#0c1120",border:"1px solid #16203a",borderRadius:10,padding:18}}>
          <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:9,letterSpacing:"2px",textTransform:"uppercase",color:"#7888aa",marginBottom:14,display:"flex",alignItems:"center",gap:7}}><span style={{color:"#00e5ff"}}>▸</span>{title}</div>
          <canvas id={id} height={200}/>
        </div>
      ))}
    </div>
  </div>;
}

// ── API DOCS ─────────────────────────────────────────────────────
function ApiDocs(){
  const api=useApi();
  const[eps,setEps]=useState([]);
  const[loading,setLoading]=useState(true);
  const[open,setOpen]=useState({});
  const[sel,setSel]=useState("GET /health");
  const[res,setRes]=useState("Click Run to execute...");
  const[rc,setRc]=useState("#00e5ff");
  useEffect(()=>{
    fetch(`${API}/openapi.json`).then(r=>r.json()).then(spec=>{
      const arr=[];
      Object.entries(spec.paths||{}).forEach(([path,methods])=>{
        Object.entries(methods).forEach(([method,op])=>{
          if(["get","post","put","delete","patch"].includes(method)){
            let b=null;
            const rb=op.requestBody?.content?.["application/json"]?.schema;
            if(rb){const ex={};Object.entries(rb.properties||{}).forEach(([k,v])=>{if(v.example!==undefined)ex[k]=v.example;else if(v.type==="integer")ex[k]=0;else if(v.type==="number")ex[k]=0.0;else if(v.type==="string")ex[k]="";else if(v.type==="boolean")ex[k]=false;});b=JSON.stringify(ex,null,2);}
            arr.push({m:method.toUpperCase(),p:path,d:op.summary||op.description||"",tags:op.tags||[],b});
          }
        });
      });
      setEps(arr);setLoading(false);
    }).catch(()=>setLoading(false));
  },[]);
  const run=async()=>{
    const parts=sel.trim().split(" ");
    setRes("Loading...");setRc("#7888aa");
    try{const d=await api(parts[1]||parts[0]);setRes(JSON.stringify(d,null,2));setRc("#00e5ff");}
    catch(e){setRes("Error: "+e.message);setRc("#ff3f5b");}
  };
  const getEps=eps.filter(e=>e.m==="GET").map(e=>`GET ${e.p}`);
  const IS={background:"#080c18",border:"1px solid #16203a",borderRadius:6,color:"#e8eeff",fontFamily:"'IBM Plex Mono',monospace",fontSize:11,outline:"none",width:"100%",padding:"10px 13px"};
  return <div style={{animation:"pageIn 0.35s cubic-bezier(0.16,1,0.3,1)"}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
      <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:10,color:"#7888aa"}}>{loading?"Fetching from /openapi.json...":`${eps.length} endpoints · live from FastAPI`}</div>
      <a href={`${API}/docs`} target="_blank" rel="noreferrer" style={{padding:"8px 18px",borderRadius:6,background:"linear-gradient(135deg,#00e5ff,#0099cc)",color:"#000",fontFamily:"'Rajdhani',sans-serif",fontSize:11,fontWeight:700,letterSpacing:"2px",textDecoration:"none",display:"inline-flex",alignItems:"center",gap:6}}>↗ Swagger UI</a>
    </div>
    {loading?<div style={{textAlign:"center",padding:40,color:"#2e3d60",fontFamily:"'IBM Plex Mono',monospace",fontSize:11}}><Spinner/> &nbsp;Fetching API schema...</div>
    :!eps.length?<div style={{textAlign:"center",padding:40,color:"#2e3d60",fontFamily:"'IBM Plex Mono',monospace",fontSize:11}}>Backend offline — start uvicorn first.</div>
    :eps.map((ep,i)=>(
      <div key={i} style={{background:"#0c1120",border:"1px solid #16203a",borderRadius:8,marginBottom:10,overflow:"hidden"}}>
        <div onClick={()=>setOpen(o=>({...o,[i]:!o[i]}))} style={{display:"flex",alignItems:"center",gap:12,padding:"13px 18px",cursor:"pointer"}} onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,0.02)"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
          <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:9,fontWeight:700,padding:"3px 9px",borderRadius:4,background:ep.m==="GET"?"rgba(0,255,157,0.1)":ep.m==="POST"?"rgba(0,229,255,0.1)":"rgba(255,200,64,0.1)",color:ep.m==="GET"?"#00ff9d":ep.m==="POST"?"#00e5ff":"#ffc840",border:`1px solid ${ep.m==="GET"?"rgba(0,255,157,0.2)":"rgba(0,229,255,0.2)"}`,minWidth:50,textAlign:"center"}}>{ep.m}</span>
          <code style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:12,color:"#e8eeff",flex:1}}>{ep.p}</code>
          <span className="epdesc" style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:10,color:"#7888aa",maxWidth:400,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{ep.d}</span>
          <span style={{color:"#2e3d60",fontSize:12}}>{open[i]?"▲":"▼"}</span>
        </div>
        {open[i]&&ep.b&&<pre style={{padding:"13px 18px",fontFamily:"'IBM Plex Mono',monospace",fontSize:10,color:"#00e5ff",background:"rgba(0,0,0,0.2)",borderTop:"1px solid #16203a",whiteSpace:"pre",overflowX:"auto"}}>{ep.b}</pre>}
      </div>
    ))}
    <Card title="Live Tester" style={{marginTop:16}}>
      <div style={{display:"flex",gap:10,alignItems:"flex-end",marginBottom:14}}>
        <div style={{flex:1}}>
          <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:9,letterSpacing:"2px",textTransform:"uppercase",color:"#7888aa",marginBottom:7}}>Endpoint</div>
          <select value={sel} onChange={e=>setSel(e.target.value)} style={IS}>
            {getEps.length?getEps.map(e=><option key={e}>{e}</option>):<><option>GET /health</option><option>GET /stats</option><option>GET /history?limit=5</option></>}
          </select>
        </div>
        <button onClick={run} style={{padding:"10px 20px",borderRadius:6,background:"linear-gradient(135deg,#00e5ff,#0099cc)",border:"none",color:"#000",fontFamily:"'Rajdhani',sans-serif",fontSize:11,fontWeight:700,letterSpacing:"2px",cursor:"pointer",height:42}}>▶ Run</button>
      </div>
      <div style={{background:"#080c18",border:"1px solid #16203a",borderRadius:6,padding:14}}>
        <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:8,color:"#2e3d60",letterSpacing:"2px",textTransform:"uppercase",marginBottom:8}}>Response</div>
        <pre style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:10,color:rc,whiteSpace:"pre-wrap",wordBreak:"break-all",maxHeight:260,overflowY:"auto"}}>{res}</pre>
      </div>
    </Card>
  </div>;
}

// ══════════════════════════════════════════════════════════════════
// ROOT APP
// ══════════════════════════════════════════════════════════════════
export default function App(){
  const api=useApi();
  const[page,setPage]=useState("landing");
  const[active,setActive]=useState("dashboard");
  const[status,setStatus]=useState("offline");
  const[clock,setClock]=useState("");
  const[sbOpen,setSbOpen]=useState(false);
  const[toast,showToast]=useToast();
  const isMobile=useMobile();

  useEffect(()=>{const s=document.createElement("style");s.textContent=GLOBAL_CSS;document.head.appendChild(s);return()=>s.remove();},[]);
  useEffect(()=>{const t=setInterval(()=>setClock(new Date().toLocaleTimeString("en-GB",{hour12:false})),1000);return()=>clearInterval(t);},[]);

  const checkStatus=useCallback(async()=>{
    try{const d=await api("/health");setStatus(d.status==="healthy"&&d.models_loaded?"online":"partial");}
    catch{setStatus("offline");}
  },[api]);
  useEffect(()=>{if(page==="app"){checkStatus();const t=setInterval(checkStatus,10000);return()=>clearInterval(t);}},[page,checkStatus]);

  const enterApp=()=>{
    const el=document.getElementById("LS");
    if(el){el.style.animation="landingExit 0.9s cubic-bezier(0.65,0,0.35,1) forwards";}
    setTimeout(()=>{setPage("app");checkStatus();},900);
  };
  const[visitKey,setVisitKey]=useState(0);
  const[refreshSig,setRefreshSig]=useState(0);
  const triggerRefresh=useCallback(()=>setRefreshSig(v=>v+1),[]);
  const navTo=(id)=>{setActive(id);if(isMobile)setSbOpen(false);setVisitKey(v=>v+1);};

  const NAV=[
    {id:"dashboard",icon:"◈",label:"Dashboard",sec:"Core"},
    {id:"llm",icon:"⬡",label:"LLM Interface",sec:"Core",tag:"NEW"},
    {id:"predict",icon:"◎",label:"Predict",sec:"Core"},
    {id:"history",icon:"≡",label:"History",sec:"Analysis"},
    {id:"analytics",icon:"◐",label:"Analytics",sec:"Analysis"},
    {id:"apidocs",icon:"⊞",label:"API Reference",sec:"Developer"},
  ];
  const secs=[...new Set(NAV.map(n=>n.sec))];
  const labels=Object.fromEntries(NAV.map(n=>[n.id,n.label]));
  const SI={online:{c:"#00ff9d",t:"Online · Models Loaded"},partial:{c:"#ffc840",t:"Models Not Loaded"},offline:{c:"#ff3f5b",t:"Backend Offline"}}[status]||{c:"#ff3f5b",t:"Offline"};

  if(page==="landing")return <>
    <style>{`@keyframes landingExit{0%{opacity:1;transform:scale(1);}100%{opacity:0;transform:scale(1.04);}}`}</style>
    <div id="LS" style={{position:"fixed",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",background:"#05070f",overflow:"hidden"}}>
      <ParticleBg/>
      <div style={{position:"absolute",width:600,height:600,borderRadius:"50%",background:"radial-gradient(ellipse,rgba(0,229,255,0.055) 0%,transparent 70%)",animation:"pulse 4s ease-in-out infinite",pointerEvents:"none"}}/>
      <div style={{position:"relative",zIndex:2,textAlign:"center",display:"flex",flexDirection:"column",alignItems:"center",padding:"0 20px",width:"100%"}}>
        <div style={{display:"inline-flex",alignItems:"center",gap:8,padding:"8px 20px",borderRadius:20,border:"1px solid rgba(0,229,255,0.22)",background:"rgba(0,229,255,0.055)",fontFamily:"'IBM Plex Mono',monospace",fontSize:"clamp(9px,2.2vw,11px)",letterSpacing:"2px",textTransform:"uppercase",color:"rgba(0,229,255,0.8)",marginBottom:"clamp(20px,4vh,36px)",animation:"fadeUp 0.8s cubic-bezier(0.16,1,0.3,1) 0.2s both"}}>
          <div style={{width:6,height:6,borderRadius:"50%",background:"#00e5ff",animation:"blink 2s ease-in-out infinite",flexShrink:0}}/>
          ML · Access Control · Agentic AI Security
        </div>
        <h1 style={{fontFamily:"'Rajdhani',sans-serif",fontSize:"clamp(88px,22vw,172px)",fontWeight:900,letterSpacing:"0.05em",lineHeight:1,background:"linear-gradient(135deg,#fff 20%,#00e5ff 60%,#b060ff 100%)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",filter:"drop-shadow(0 0 60px rgba(0,229,255,0.3))",animation:"fadeUp 1.2s cubic-bezier(0.16,1,0.3,1) 0.4s both",marginBottom:4}}>PRISM</h1>
        <div style={{width:"clamp(100px,30vw,180px)",height:1,background:"linear-gradient(90deg,transparent,#00e5ff,transparent)",margin:"clamp(12px,2vh,20px) 0 clamp(14px,2.5vh,24px)",animation:"fadeIn 1s 0.7s both"}}/>
        <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:"clamp(11px,2.4vw,14px)",letterSpacing:"2px",textTransform:"uppercase",color:"#7888aa",marginBottom:"clamp(10px,1.5vh,16px)",animation:"fadeUp 0.8s cubic-bezier(0.16,1,0.3,1) 0.8s both",lineHeight:1.8}}>
          <span style={{color:"#00e5ff"}}>P</span>ermission &nbsp;<span style={{color:"#00e5ff"}}>R</span>isk &nbsp;<span style={{color:"#00e5ff"}}>I</span>ntelligence &nbsp;<span style={{color:"#00e5ff"}}>S</span>ystem for Agentic &nbsp;<span style={{color:"#00e5ff"}}>M</span>odels
        </div>
        <p style={{fontFamily:"'Outfit',sans-serif",fontSize:"clamp(15px,2.8vw,19px)",fontWeight:400,color:"#7888aa",maxWidth:"min(520px,90vw)",lineHeight:1.75,animation:"fadeUp 0.8s cubic-bezier(0.16,1,0.3,1) 1s both",marginBottom:"clamp(32px,5vh,56px)"}}>
          A human-centered, explainable ML framework that&nbsp;<strong style={{color:"#e8eeff",fontWeight:700}}>scores, explains,</strong> and&nbsp;<strong style={{color:"#e8eeff",fontWeight:700}}>controls</strong> every action an AI agent attempts — in real time.
        </p>
        <button onClick={enterApp} style={{display:"inline-flex",alignItems:"center",gap:14,padding:"clamp(14px,2vh,18px) clamp(30px,6vw,52px)",borderRadius:4,background:"transparent",border:"1px solid #00e5ff",color:"#00e5ff",fontFamily:"'Rajdhani',sans-serif",fontSize:"clamp(13px,3vw,15px)",fontWeight:700,letterSpacing:"4px",textTransform:"uppercase",cursor:"pointer",animation:"fadeUp 0.8s cubic-bezier(0.16,1,0.3,1) 1.2s both",boxShadow:"0 0 30px rgba(0,229,255,0.08)",transition:"all 0.3s",touchAction:"manipulation"}}
          onMouseEnter={e=>{e.currentTarget.style.color="#fff";e.currentTarget.style.boxShadow="0 0 60px rgba(0,229,255,0.22)";}}
          onMouseLeave={e=>{e.currentTarget.style.color="#00e5ff";e.currentTarget.style.boxShadow="0 0 30px rgba(0,229,255,0.08)";}}>
          Enter Dashboard <span style={{fontSize:"clamp(16px,3.5vw,20px)"}}>→</span>
        </button>
      </div>
      <div className="lstrip" style={{position:"absolute",bottom:0,left:0,right:0,display:"flex",justifyContent:"space-between",alignItems:"center",padding:"16px 40px",borderTop:"1px solid #16203a",animation:"fadeIn 1s 1.5s both"}}>
        {["XGBoost Classifier","SHAP Explainability","Human-in-the-Loop","IsolationForest Anomaly","v1.0.0 · PRISM"].map((t,i)=>(
          <div key={i} style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:9,letterSpacing:"2px",textTransform:"uppercase",color:"#2e3d60",display:"flex",alignItems:"center",gap:7}}>
            {(i===0||i===4)&&<div style={{width:4,height:4,borderRadius:"50%",background:"#00ff9d",animation:"blink 2s ease-in-out infinite"}}/>}{t}
          </div>
        ))}
      </div>
    </div>
  </>;

  return <div style={{display:"flex",minHeight:"100vh",animation:"appEnter 0.6s cubic-bezier(0.16,1,0.3,1)"}}>
    {isMobile&&sbOpen&&<div className="sb-overlay open" onClick={()=>setSbOpen(false)}/>}
    <aside className={`msb${sbOpen?" open":""}`} style={{position:"fixed",top:0,left:0,width:256,height:"100vh",background:"#080c18",borderRight:"1px solid #16203a",display:"flex",flexDirection:"column",zIndex:100,boxShadow:"8px 0 40px rgba(0,0,0,0.5)"}}>
      <div style={{padding:"26px 22px 20px",borderBottom:"1px solid #16203a"}}>
        <div style={{display:"flex",alignItems:"center",gap:11,marginBottom:5}}>
          <div style={{position:"relative",width:32,height:32,flexShrink:0}}>
            <div style={{position:"absolute",inset:0,background:"linear-gradient(135deg,#00e5ff,#b060ff)",clipPath:"polygon(50% 0%,100% 50%,50% 100%,0% 50%)",animation:"diamondPulse 3s ease-in-out infinite"}}/>
          </div>
          <div style={{fontFamily:"'Rajdhani',sans-serif",fontSize:20,fontWeight:900,letterSpacing:"4px",background:"linear-gradient(135deg,#fff,#00e5ff)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>PRISM</div>
        </div>
        <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:8,color:"#2e3d60",letterSpacing:"1.5px",textTransform:"uppercase",marginLeft:43,lineHeight:1.5}}>Permission Risk Intelligence<br/>System for Agentic Models</div>
      </div>
      <div style={{display:"flex",alignItems:"center",gap:8,padding:"8px 22px",background:`${SI.c}11`,borderBottom:"1px solid #16203a",fontFamily:"'IBM Plex Mono',monospace",fontSize:9,letterSpacing:"1.5px",textTransform:"uppercase",color:SI.c,transition:"all 0.3s"}}>
        <div style={{width:6,height:6,borderRadius:"50%",background:SI.c,animation:status==="online"?"blink 2s infinite":"none",flexShrink:0}}/>{SI.t}
      </div>
      <nav style={{flex:1,padding:"12px 10px",display:"flex",flexDirection:"column",gap:2,overflowY:"auto"}}>
        {secs.map(sec=><div key={sec}>
          <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:8,letterSpacing:"2.5px",textTransform:"uppercase",color:"#2e3d60",padding:"12px 12px 5px"}}>{sec}</div>
          {NAV.filter(n=>n.sec===sec).map(n=>(
            <div key={n.id} onClick={()=>navTo(n.id)} style={{display:"flex",alignItems:"center",gap:11,padding:"10px 13px",borderRadius:6,cursor:"pointer",fontFamily:"'IBM Plex Mono',monospace",fontSize:11,fontWeight:500,color:active===n.id?"#00e5ff":"#7888aa",background:active===n.id?"rgba(0,229,255,0.1)":"transparent",border:`1px solid ${active===n.id?"rgba(0,229,255,0.15)":"transparent"}`,transition:"all 0.18s",position:"relative",userSelect:"none"}}
              onMouseEnter={e=>{if(active!==n.id){e.currentTarget.style.background="rgba(0,229,255,0.04)";e.currentTarget.style.color="#e8eeff";}}}
              onMouseLeave={e=>{if(active!==n.id){e.currentTarget.style.background="transparent";e.currentTarget.style.color="#7888aa";}}}>
              {active===n.id&&<div style={{position:"absolute",left:0,top:"20%",height:"60%",width:3,background:"linear-gradient(180deg,#00e5ff,#b060ff)",borderRadius:"0 2px 2px 0"}}/>}
              <span style={{fontSize:13,width:16,textAlign:"center",flexShrink:0}}>{n.icon}</span>
              <span style={{flex:1}}>{n.label}</span>
              {n.tag&&<span style={{background:"rgba(0,255,157,0.1)",color:"#00ff9d",fontSize:8,fontWeight:700,letterSpacing:"1px",padding:"1px 6px",borderRadius:3,border:"1px solid rgba(0,255,157,0.2)"}}>{n.tag}</span>}
            </div>
          ))}
        </div>)}
      </nav>
      <SidebarFooter/>
    </aside>
    <div className="mwrap" style={{marginLeft:256,flex:1,display:"flex",flexDirection:"column",minHeight:"100vh"}}>
      <div style={{height:56,background:"rgba(8,12,24,0.88)",backdropFilter:"blur(20px)",borderBottom:"1px solid #16203a",display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 20px",position:"sticky",top:0,zIndex:50,gap:12}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <button className={`hbg${sbOpen?" open":""}`} onClick={()=>setSbOpen(v=>!v)} aria-label="Menu"><span/><span/><span/></button>
          <div style={{display:"flex",alignItems:"center",gap:8,fontFamily:"'IBM Plex Mono',monospace",fontSize:11,color:"#7888aa"}}>
            {!isMobile&&<><span style={{color:"#2e3d60"}}>PRISM</span><span style={{color:"#2e3d60"}}>›</span></>}
            <span style={{color:"#e8eeff",fontWeight:500}}>{labels[active]||active}</span>
          </div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:isMobile?8:16,flexShrink:0}}>
          <div style={{display:"flex",alignItems:"center",gap:6,padding:"5px 10px",borderRadius:20,border:"1px solid rgba(0,229,255,0.2)",background:"rgba(0,229,255,0.1)",fontFamily:"'IBM Plex Mono',monospace",fontSize:9,letterSpacing:"1px",textTransform:"uppercase",color:"#00e5ff"}}>
            <div style={{width:5,height:5,borderRadius:"50%",background:"#00e5ff",animation:"blink 2s infinite",flexShrink:0}}/>
            {isMobile?"8000":"localhost:8000"}
          </div>
          {!isMobile&&<div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:11,color:"#7888aa",letterSpacing:"1px"}}>{clock}</div>}
        </div>
      </div>
      <div className="mpad" style={{padding:30,flex:1}}>
        <ErrorBoundary key={active}>
          {active==="dashboard"&&<Dashboard showToast={showToast} refreshSig={refreshSig}/>}
          {active==="llm"&&<LLMInterface showToast={showToast} triggerRefresh={triggerRefresh}/>}
          {active==="predict"&&<Predict showToast={showToast} triggerRefresh={triggerRefresh}/>}
          {active==="history"&&<History showToast={showToast}/>}
          {active==="analytics"&&<Analytics showToast={showToast} refreshSig={refreshSig}/>}
          {active==="apidocs"&&<ApiDocs/>}
        </ErrorBoundary>
      </div>
    </div>
    <Toast {...toast}/>
  </div>;
}
