import { useState } from "react";
import { T, F } from "../theme";
import { fmtFecha, mesActual } from "../utils";
import { Badge, Card, Input, Label, ProgressBar, Select } from "../ui";

// ══════════════════════════════════════════════════════════════════════════════
// PANEL ILEANA – GESTIÓN COMERCIAL
// ══════════════════════════════════════════════════════════════════════════════
export default function GestionComercialPanel({ registros, equipo, meta, setMeta }) {
  const [subTab, setSubTab] = useState("resumen");
  const [mes, setMes] = useState(mesActual);
  const [personaFiltro, setPersonaFiltro] = useState("todos");
  const regMes = registros.filter(r => r.fecha?.startsWith(mes));
  const totales = equipo.map(m => {
    const regs = regMes.filter(r=>r.personaId===m.id);
    const tot = regs.reduce((a,r)=>({mensajes:a.mensajes+r.mensajes,turnos:a.turnos+r.turnos,senias:a.senias+r.senias}),{mensajes:0,turnos:0,senias:0});
    return { ...m, ...tot, pctConv:tot.turnos>0?((tot.senias/tot.turnos)*100).toFixed(0):0, dias:regs.length, premio:Math.max(0,tot.senias-meta.senias)*meta.premioPorSenia };
  });
  const regFiltrados = regMes.filter(r=>personaFiltro==="todos"||r.personaId===personaFiltro).sort((a,b)=>b.fecha?.localeCompare(a.fecha));

  return (
    <div style={{ padding:"18px 16px" }}>
      <div style={{ display:"flex", gap:8, marginBottom:16 }}>
        {[["resumen","📊 Resumen"],["detalle","📋 Detalle"],["metas","🎯 Metas"]].map(([t,l])=>(
          <button key={t} onClick={()=>setSubTab(t)} style={{
            flex:1, padding:"9px 0", borderRadius:12,
            border:`2px solid ${subTab===t?T.primaryDeep:T.border}`,
            background:subTab===t?T.activeSoft:T.inputBg,
            color:subTab===t?T.primaryDeep:T.muted,
            fontWeight:700, cursor:"pointer", fontSize:12, fontFamily:F.body,
          }}>{l}</button>
        ))}
      </div>

      <div style={{ marginBottom:14 }}>
        <Input type="month" value={mes} onChange={e=>setMes(e.target.value)}/>
      </div>

      {subTab==="resumen" && totales.map(p=>(
        <Card key={p.id}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:14 }}>
            <div>
              <div style={{ fontFamily:F.serif, fontSize:20, fontWeight:700, color:T.primaryDeep }}>{p.nombre}</div>
              <div style={{ fontSize:12, color:T.muted }}>{p.rol} · {p.dias} días cargados</div>
            </div>
            <Badge color={p.senias>=meta.senias?"sage":"amber"}>{p.senias>=meta.senias?"✓ Meta":"En progreso"}</Badge>
          </div>
          {[["💬 Mensajes",p.mensajes,meta.mensajes],["📅 Turnos",p.turnos,meta.turnos],["🤝 Señas",p.senias,meta.senias]].map(([lbl,val,met])=>(
            <div key={lbl} style={{ marginBottom:12 }}>
              <div style={{ display:"flex", justifyContent:"space-between", fontSize:13, marginBottom:5 }}>
                <span style={{ color:T.muted }}>{lbl}</span>
                <span style={{ fontWeight:700, color:T.text }}>{val} <span style={{ color:T.muted2, fontWeight:400 }}>/ {met}</span></span>
              </div>
              <ProgressBar val={val} max={met}/>
            </div>
          ))}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginTop:14 }}>
            <div style={{ background:T.cardSoft, borderRadius:12, padding:"12px 14px" }}>
              <div style={{ fontSize:11, color:T.muted }}>Conversión señas/turnos</div>
              <div style={{ fontFamily:F.serif, fontSize:22, fontWeight:700, color:T.primary }}>{p.pctConv}%</div>
            </div>
            <div style={{ background:p.premio>0?T.goldSoft:T.cardSoft, borderRadius:12, padding:"12px 14px" }}>
              <div style={{ fontSize:11, color:T.muted }}>Premio estimado</div>
              <div style={{ fontFamily:F.serif, fontSize:22, fontWeight:700, color:p.premio>0?T.gold:T.muted2 }}>${p.premio.toLocaleString("es-AR")}</div>
            </div>
          </div>
        </Card>
      ))}

      {subTab==="detalle" && (
        <div>
          <div style={{ marginBottom:12 }}>
            <Select value={personaFiltro} onChange={e=>setPersonaFiltro(e.target.value)}>
              <option value="todos">Todos</option>
              {equipo.map(m=><option key={m.id} value={m.id}>{m.nombre}</option>)}
            </Select>
          </div>
          {regFiltrados.length===0&&<div style={{ textAlign:"center", color:T.muted, padding:32 }}>Sin registros en este período.</div>}
          {regFiltrados.map(r=>(
            <div key={r.id} style={{ background:T.card, borderRadius:14, padding:"13px 14px", boxShadow:T.shadowList, marginBottom:10 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
                <div><span style={{ fontWeight:700, fontSize:14, color:T.text }}>{r.personaNombre}</span><span style={{ fontSize:12, color:T.muted, marginLeft:8 }}>{fmtFecha(r.fecha)}</span></div>
                {r.editado&&<Badge color="amber">editado</Badge>}
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8 }}>
                {[["💬","Mensajes",r.mensajes],["📅","Turnos",r.turnos],["🤝","Señas",r.senias]].map(([e,l,v])=>(
                  <div key={l} style={{ background:T.cardSoft, borderRadius:10, padding:"10px 6px", textAlign:"center" }}>
                    <div style={{ fontSize:16 }}>{e}</div>
                    <div style={{ fontFamily:F.serif, fontSize:20, fontWeight:700, color:T.gold }}>{v}</div>
                    <div style={{ fontSize:10, color:T.muted }}>{l}</div>
                  </div>
                ))}
              </div>
              {r.nota&&<div style={{ fontSize:13, color:T.muted, marginTop:10, fontStyle:"italic" }}>"{r.nota}"</div>}
            </div>
          ))}
        </div>
      )}

      {subTab==="metas" && (
        <Card>
          <div style={{ fontFamily:F.serif, fontSize:20, fontWeight:700, color:T.primaryDeep, marginBottom:18 }}>Metas mensuales del equipo</div>
          {[["mensajes","💬 Meta mensual de mensajes"],["turnos","📅 Meta mensual de turnos"],["senias","🤝 Meta mensual de señas"],["premioPorSenia","💰 Premio por seña sobre meta ($)"]].map(([k,l])=>(
            <div key={k} style={{ marginBottom:14 }}>
              <Label>{l}</Label>
              <Input type="number" value={meta[k]} onChange={e=>setMeta(m=>({...m,[k]:Number(e.target.value)}))}/>
            </div>
          ))}
          <div style={{ background:T.activeSoft, borderRadius:12, padding:"14px 16px" }}>
            <div style={{ fontSize:13, color:T.primaryDeep, lineHeight:1.6 }}>
              <strong>Premio:</strong> cada seña sobre la meta mensual suma ${meta.premioPorSenia.toLocaleString("es-AR")}. Se muestra en el resumen por persona.
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
