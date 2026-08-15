import { useState } from "react";
import { T, F } from "../theme";
import { distanciaKm, fmtFecha, mesActual } from "../utils";
import { Badge, Input } from "../ui";

// ══════════════════════════════════════════════════════════════════════════════
// PANEL ILEANA – KM
// ══════════════════════════════════════════════════════════════════════════════
export default function KmPanel({ visitas }) {
  const [mes, setMes] = useState(mesActual);
  const filtradas = visitas.filter(v=>v.checkin?.startsWith(mes)&&v.checkout).sort((a,b)=>new Date(a.checkin)-new Date(b.checkin));
  let kmAcum=0;
  const filas = filtradas.map((v,i)=>{ let km=null; if(i>0){const prev=filtradas[i-1]; if(prev.latCheckout&&v.latCheckin){km=parseFloat(distanciaKm(prev.latCheckout,prev.lngCheckout,v.latCheckin,v.lngCheckin)); kmAcum+=km;}} return {...v,km}; });
  return (
    <div style={{ padding:"18px 16px" }}>
      <div style={{ marginBottom:14 }}><Input type="month" value={mes} onChange={e=>setMes(e.target.value)}/></div>
      <div style={{ background:`linear-gradient(135deg, ${T.primary}, ${T.primaryDeep})`, borderRadius:18, padding:"28px 20px", textAlign:"center", color:T.white, marginBottom:14, boxShadow:T.shadowBtn }}>
        <div style={{ fontFamily:F.serif, fontSize:44, fontWeight:700, lineHeight:1 }}>{kmAcum.toFixed(1)}</div>
        <div style={{ fontSize:14, opacity:.85, marginTop:4 }}>km estimados · {filtradas.length} visitas</div>
      </div>
      {filas.length===0&&<div style={{ textAlign:"center", color:T.muted, padding:32 }}>Sin visitas en este período.</div>}
      {filas.map(v=>(
        <div key={v.id} style={{ background:T.card, borderRadius:14, padding:"12px 14px", boxShadow:T.shadowList, marginBottom:8 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <div><div style={{ fontWeight:600, fontSize:14, color:T.text }}>{v.sucursalNombre}</div><div style={{ fontSize:11, color:T.muted }}>{fmtFecha(v.checkin)}</div></div>
            {v.km!=null?<Badge color="sage">{v.km} km</Badge>:<span style={{ fontSize:12, color:T.muted2 }}>origen</span>}
          </div>
        </div>
      ))}
    </div>
  );
}
