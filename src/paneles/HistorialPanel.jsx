import { useState, useEffect } from "react";
import { T, F } from "../theme";
import { SEMAFORO, opcion } from "../constants";
import { distanciaKm, duracion, fmtFecha, fmtHora } from "../utils";
import { ENCUESTA_V2, CAMPOS, esNegativa } from "../encuesta/schema";
import { Badge, Label } from "../ui";

// ── Detección de versión ──────────────────────────────────────────────────────
// encuesta_version viene de la base ('v1' por DEFAULT en las visitas viejas).
// El fallback mira la forma de las respuestas: en v2 cada una es un objeto con
// { valor, ...campos }, en v1 es un string suelto.
function esV2(visita) {
  if (visita.encuestaVersion) return visita.encuestaVersion === "v2";
  const primera = Object.values(visita.respuestas || {})[0];
  return !!primera && typeof primera === "object";
}

// ── Renderer v1: preguntas planas editables desde localStorage ────────────────
function DetalleV1({ visita, preguntas }) {
  const respondidas = preguntas.filter(p => visita.respuestas?.[p.id]);
  if (respondidas.length === 0) return null;

  return (
    <div>
      <Label>Encuesta</Label>
      {respondidas.map(p => {
        const r = visita.respuestas[p.id];
        return (
          <div key={p.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:8, fontSize:13 }}>
            <span style={{ color:T.muted, flex:1, marginRight:8, lineHeight:1.4 }}>{p.texto}</span>
            {p.tipo === "bool"
              ? <Badge color={r === "Sí" ? "sage" : "error"}>{r}</Badge>
              : p.tipo === "foto"
                ? <a href={r} target="_blank" rel="noreferrer" style={{ color:T.primary, fontSize:12, fontWeight:600 }}>Ver foto 📷</a>
                : <span style={{ fontStyle:"italic", color:T.text, maxWidth:"45%", textAlign:"right" }}>{r}</span>}
          </div>
        );
      })}
    </div>
  );
}

// ── Renderer v2: encuesta estructurada por secciones ──────────────────────────
function DetalleV2({ visita }) {
  const respuestas = visita.respuestas || {};
  const sem = opcion(SEMAFORO, visita.semaforo);

  return (
    <div>
      {/* Cierre estructurado */}
      {(sem || visita.hallazgo || visita.accionTomada != null) && (
        <div style={{ background:T.white, borderRadius:12, padding:"12px 14px", marginBottom:14 }}>
          {sem && (
            <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:10 }}>
              <span style={{ fontSize:16 }}>{sem.icono}</span>
              <span style={{ fontSize:13, fontWeight:700, color: sem.badge === "sage" ? T.sage : sem.badge === "amber" ? T.amber : T.error }}>
                {sem.label}
              </span>
            </div>
          )}
          {visita.hallazgo && (
            <div style={{ marginBottom:10 }}>
              <Label>Principal hallazgo</Label>
              <div style={{ fontSize:13, color:T.text, lineHeight:1.5 }}>{visita.hallazgo}</div>
            </div>
          )}
          {visita.accionTomada != null && (
            <div>
              <Label>Acción durante la visita</Label>
              <div style={{ fontSize:13, color:T.text, lineHeight:1.5 }}>
                {visita.accionTomada ? (visita.accionDetalle || "Sí") : "No tomó acciones"}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Respuestas por sección */}
      {ENCUESTA_V2.map(seccion => {
        const conRespuesta = seccion.preguntas.filter(p => respuestas[p.id]?.valor);
        if (conRespuesta.length === 0) return null;

        return (
          <div key={seccion.id} style={{ marginBottom:14 }}>
            <div style={{ fontSize:12, fontWeight:700, color:T.primaryDeep, marginBottom:8 }}>
              {seccion.icono} {seccion.titulo}
            </div>

            {conRespuesta.map(p => {
              const r = respuestas[p.id];
              const mala = esNegativa(p, r.valor);
              const neutra = !mala && r.valor !== "Sí";

              return (
                <div key={p.id} style={{ marginBottom:9 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:8, fontSize:13 }}>
                    <span style={{ color:T.muted, flex:1, lineHeight:1.4 }}>{p.texto}</span>
                    <Badge color={mala ? "error" : neutra ? "terr" : "sage"}>{r.valor}</Badge>
                  </div>

                  {/* Campos extra: sólo existen cuando la respuesta fue negativa */}
                  {mala && (
                    <div style={{ marginTop:6, padding:"9px 12px", borderRadius:10, background:T.errorBg }}>
                      {p.extra.map(clave => {
                        const valor = r[clave];
                        if (!valor) return null;
                        const campo = CAMPOS[clave];
                        return (
                          <div key={clave} style={{ marginBottom:5, fontSize:12, lineHeight:1.5 }}>
                            <span style={{ color:T.muted, fontWeight:600 }}>{campo?.label || clave}: </span>
                            {campo?.tipo === "foto"
                              ? <a href={valor} target="_blank" rel="noreferrer" style={{ color:T.primary, fontWeight:600 }}>Ver foto 📷</a>
                              : <span style={{ color:T.text }}>{valor}</span>}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// PANEL ILEANA – HISTORIAL
// ══════════════════════════════════════════════════════════════════════════════
// `foco` llega desde el Dashboard: { sucursal, n }. El contador n existe para
// que tocar dos veces la misma sucursal vuelva a aplicar el filtro aunque el
// nombre no haya cambiado — si Ileana lo editó a mano en el medio, se reaplica.
export default function HistorialPanel({ visitas, preguntas, foco }) {
  const [expandida, setExpandida] = useState(null);
  const [filtroSuc, setFiltroSuc] = useState("");
  const [filtroFecha, setFiltroFecha] = useState("");

  useEffect(() => {
    if (!foco?.sucursal) return;
    setFiltroSuc(foco.sucursal);
    setFiltroFecha("");
    // Y se abre la última visita de esa sucursal, que es lo que se va a buscar
    let ultima = null, ultimaFecha = null;
    for (const v of visitas) {
      if (v.sucursalNombre !== foco.sucursal || !v.checkin) continue;
      const f = new Date(v.checkin);
      if (isNaN(f)) continue;
      if (!ultimaFecha || f > ultimaFecha) { ultima = v; ultimaFecha = f; }
    }
    setExpandida(ultima?.id ?? null);
  }, [foco?.n]);
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
        const dur = duracion(v.checkin, v.checkout);
        const open = expandida === v.id;
        const v2 = esV2(v);
        const sem = v2 ? opcion(SEMAFORO, v.semaforo) : null;

        return (
          <div key={v.id} style={{ background:T.card, borderRadius:16, boxShadow:T.shadowList, marginBottom:10, overflow:"hidden" }}>
            <div style={{ padding:"13px 16px", cursor:"pointer", display:"flex", justifyContent:"space-between", alignItems:"center" }} onClick={()=>setExpandida(open?null:v.id)}>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                  {sem && <span style={{ fontSize:13 }} title={sem.label}>{sem.icono}</span>}
                  <span style={{ fontWeight:700, fontSize:14, color:T.text }}>{v.sucursalNombre}</span>
                </div>
                <div style={{ fontSize:12, color:T.muted, marginTop:2 }}>
                  {fmtFecha(v.checkin)} · {fmtHora(v.checkin)} → {v.checkout?fmtHora(v.checkout):"en curso"}
                  {dur && <span style={{ marginLeft:5, color:T.primary }}> ({dur})</span>}
                </div>
                {v2 && v.hallazgo && (
                  <div style={{ fontSize:12, color:T.muted, marginTop:4, fontStyle:"italic", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                    {v.hallazgo}
                  </div>
                )}
              </div>
              <div style={{ display:"flex", gap:6, alignItems:"center", flexShrink:0, marginLeft:8 }}>
                <Badge color={v.gpsOkCheckin?"sage":"error"}>{v.gpsOkCheckin?"✓ GPS":"⚠ GPS"}</Badge>
                <span style={{ color:T.muted2 }}>{open?"▲":"▼"}</span>
              </div>
            </div>

            {open && (
              <div style={{ borderTop:`1px solid ${T.divider}`, padding:"14px 16px", background:T.cardSoft }}>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:14 }}>
                  {[["Entrada",fmtHora(v.checkin),v.gpsOkCheckin,v.distCheckin],["Salida",fmtHora(v.checkout),v.gpsOkCheckout,v.distCheckout]].map(([l,hh,ok,dist])=>(
                    <div key={l} style={{ background:T.white, borderRadius:10, padding:"10px 12px" }}>
                      <Label>{l}</Label>
                      <div style={{ fontFamily:F.serif, fontSize:18, fontWeight:700, color:T.primaryDeep }}>{hh}</div>
                      {dist!=null&&<div style={{ fontSize:11, color:ok?T.sage:T.error, marginTop:2 }}>{ok?`✓ ${dist}m`:`⚠ ${dist}m`}</div>}
                    </div>
                  ))}
                </div>

                {v2
                  ? <DetalleV2 visita={v}/>
                  : <DetalleV1 visita={v} preguntas={preguntas}/>}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
