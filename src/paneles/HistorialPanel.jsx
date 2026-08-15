import { useState } from "react";
import { T, F } from "../theme";
import { distanciaKm, duracion, fmtFecha, fmtHora } from "../utils";
import { Badge, Label } from "../ui";

// ══════════════════════════════════════════════════════════════════════════════
// PANEL ILEANA – HISTORIAL
// ══════════════════════════════════════════════════════════════════════════════
export default function HistorialPanel({ visitas, preguntas }) {
  const [expandida, setExpandida] = useState(null);
  const [filtroSuc, setFiltroSuc] = useState("");
  const [filtroFecha, setFiltroFecha] = useState("");
  const sucursalesUnicas = [...new Set(visitas.map(v => v.sucursalNombre))];
  let kmTotal = 0;
  const ord = [...visitas].reverse();
  for (let i=1;i<ord.length;i++){ const a=ord[i-1],b=ord[i]; if(a.latCheckout&&b.latCheckin) kmTotal+=parseFloat(distanciaKm(a.latCheckout,a.lngCheckout,b.latCheckin,b.lngCheckin)); }
  const lista = visitas.filter(v => (!filtroSuc||v.sucursalNombre===filtroSuc)&&(!filtroFecha||v.checkin?.startsWith(filtroFecha)));

  return (
    <div style={{ padding:"18px 16px" }}>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, marginBottom:16 }}>
        {[["Visitas",visitas.length],["Sucursales",new Set(visitas.map(v=>v.sucursalId)).size],["Km",kmTotal.toFixed(0)]].map(([l,v]) => (
          <div key={l} style={{ background:T.card, borderRadius:14, padding:"14px 8px", textAlign:"center", boxShadow:T.shadowCard }}>
            <div style={{ fontFamily:F.serif, fontSize:24, fontWeight:700, color:T.primaryDeep }}>{v}</div>
            <div style={{ fontSize:11, color:T.muted, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.5px" }}>{l}</div>
          </div>
        ))}
      </div>
      <div style={{ display:"flex", gap:8, marginBottom:14 }}>
        <select value={filtroSuc} onChange={e=>setFiltroSuc(e.target.value)} style={{ flex:1, padding:"9px 11px", borderRadius:12, border:`1.5px solid ${T.border}`, background:T.inputBg, fontSize:13, color:T.text, outline:"none", fontFamily:F.body }}>
          <option value="">Todas las sucursales</option>
          {sucursalesUnicas.map(n=><option key={n}>{n}</option>)}
        </select>
        <input type="date" value={filtroFecha} onChange={e=>setFiltroFecha(e.target.value)} style={{ width:130, padding:"9px 11px", borderRadius:12, border:`1.5px solid ${T.border}`, background:T.inputBg, fontSize:13, color:T.text, outline:"none", fontFamily:F.body }}/>
      </div>
      {lista.length===0 && <div style={{ textAlign:"center", color:T.muted, padding:32 }}>Sin visitas registradas.</div>}
      {lista.map(v => {
        const dur=duracion(v.checkin,v.checkout); const open=expandida===v.id;
        return (
          <div key={v.id} style={{ background:T.card, borderRadius:16, boxShadow:T.shadowList, marginBottom:10, overflow:"hidden" }}>
            <div style={{ padding:"13px 16px", cursor:"pointer", display:"flex", justifyContent:"space-between", alignItems:"center" }} onClick={()=>setExpandida(open?null:v.id)}>
              <div>
                <div style={{ fontWeight:700, fontSize:14, color:T.text }}>{v.sucursalNombre}</div>
                <div style={{ fontSize:12, color:T.muted, marginTop:2 }}>{fmtFecha(v.checkin)} · {fmtHora(v.checkin)} → {v.checkout?fmtHora(v.checkout):"en curso"}{dur&&<span style={{marginLeft:5,color:T.primary}}> ({dur})</span>}</div>
              </div>
              <div style={{ display:"flex", gap:6, alignItems:"center" }}>
                <Badge color={v.gpsOkCheckin?"sage":"error"}>{v.gpsOkCheckin?"✓ GPS":"⚠ GPS"}</Badge>
                <span style={{ color:T.muted2 }}>{open?"▲":"▼"}</span>
              </div>
            </div>
            {open && (
              <div style={{ borderTop:`1px solid ${T.divider}`, padding:"14px 16px", background:T.cardSoft }}>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:14 }}>
                  {[["Entrada",fmtHora(v.checkin),v.gpsOkCheckin,v.distCheckin],["Salida",fmtHora(v.checkout),v.gpsOkCheckout,v.distCheckout]].map(([l,h,ok,dist])=>(
                    <div key={l} style={{ background:T.white, borderRadius:10, padding:"10px 12px" }}>
                      <Label>{l}</Label>
                      <div style={{ fontFamily:F.serif, fontSize:18, fontWeight:700, color:T.primaryDeep }}>{h}</div>
                      {dist!=null&&<div style={{ fontSize:11, color:ok?T.sage:T.error, marginTop:2 }}>{ok?`✓ ${dist}m`:`⚠ ${dist}m`}</div>}
                    </div>
                  ))}
                </div>
                {preguntas.length>0&&Object.keys(v.respuestas||{}).length>0&&(
                  <div>
                    <Label>Encuesta</Label>
                    {preguntas.map(p=>{ const r=v.respuestas?.[p.id]; if(!r)return null; return (
                      <div key={p.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:8, fontSize:13 }}>
                        <span style={{ color:T.muted, flex:1, marginRight:8, lineHeight:1.4 }}>{p.texto}</span>
                        {p.tipo==="bool"?<Badge color={r==="Sí"?"sage":"error"}>{r}</Badge>:p.tipo==="foto"?<a href={r} target="_blank" rel="noreferrer" style={{ color:T.primary, fontSize:12, fontWeight:600 }}>Ver foto 📷</a>:<span style={{ fontStyle:"italic", color:T.text, maxWidth:"45%", textAlign:"right" }}>{r}</span>}
                      </div>
                    );})}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
