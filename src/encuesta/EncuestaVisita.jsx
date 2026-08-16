import { useState } from "react";
import { T, F } from "../theme";
import { Badge, Card, FotoUploader, Input, Textarea } from "../ui";
import {
  ENCUESTA_V2, CAMPOS, camposFaltantes, esNegativa, resumenEncuesta,
} from "./schema";

// ─── Botonera de opciones ────────────────────────────────────────────────────
// En mobile "No pude observar" no entra en una fila de tres. Sí y No van juntos
// arriba (son los más usados) y la tercera opción ocupa el ancho completo abajo.
function Opciones({ opciones, valor, negativas, onChange }) {
  const [primeras, resto] = [opciones.slice(0, 2), opciones.slice(2)];

  const boton = (op, ancho) => {
    const activa = valor === op;
    const mala = activa && negativas.includes(op);
    return (
      <button key={op} onClick={() => onChange(op)} style={{
        flex: ancho ? undefined : 1, width: ancho ? "100%" : undefined,
        padding:"10px 6px", borderRadius:12,
        border:`2px solid ${activa ? (mala ? T.error : T.primaryDeep) : T.border}`,
        background:activa ? (mala ? T.errorBg : T.activeSoft) : T.inputBg,
        color:activa ? (mala ? T.error : T.primaryDeep) : T.muted,
        fontWeight:700, cursor:"pointer", fontSize:13, fontFamily:F.body,
        lineHeight:1.25, transition:"all .1s",
      }}>{op}</button>
    );
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
      <div style={{ display:"flex", gap:6 }}>{primeras.map(op => boton(op, false))}</div>
      {resto.map(op => boton(op, true))}
    </div>
  );
}

// ─── Campos condicionales de una pregunta ────────────────────────────────────
function CamposExtra({ pregunta, respuesta, visitaId, sucursalNombre, onCampo }) {
  const faltantes = camposFaltantes(pregunta, respuesta);

  return (
    <div style={{
      marginTop:10, padding:"12px 13px", borderRadius:12,
      background:T.errorBg, border:`1px solid ${T.error}22`,
    }}>
      {pregunta.extra.map(clave => {
        const campo = CAMPOS[clave];
        if (!campo) return null;
        const falta = faltantes.includes(clave);
        const requerido = (pregunta.requerido || []).includes(clave);
        const valor = respuesta?.[clave] ?? "";

        return (
          <div key={clave} style={{ marginBottom:10 }}>
            <span style={{
              display:"block", fontSize:11, fontWeight:600, marginBottom:5,
              textTransform:"uppercase", letterSpacing:"0.5px",
              color: falta ? T.error : T.muted,
            }}>
              {campo.label}{requerido ? " *" : ""}
            </span>

            {campo.tipo === "foto" ? (
              <FotoUploader
                visitaId={visitaId}
                sucursal={sucursalNombre}
                tipo={pregunta.id}
                value={valor || null}
                onChange={url => onCampo(clave, url)}
              />
            ) : campo.tipo === "texto1" ? (
              <Input
                placeholder={campo.placeholder}
                value={valor}
                onChange={e => onCampo(clave, e.target.value)}
                style={falta ? { borderColor:T.error } : undefined}
              />
            ) : (
              <Textarea
                rows={campo.filas || 3}
                placeholder={campo.placeholder}
                value={valor}
                onChange={e => onCampo(clave, e.target.value)}
                style={falta ? { borderColor:T.error } : undefined}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ENCUESTA DE VISITA
// ══════════════════════════════════════════════════════════════════════════════
export default function EncuestaVisita({
  respuestas,
  setRespuestas,
  visitaId,
  sucursalNombre,
  pendientes = [],
  onCrearPendiente,
  onQuitarPendiente,
}) {
  const [colapsadas, setColapsadas] = useState({});
  const resumen = resumenEncuesta(respuestas);

  const setValor = (pregunta, valor) => {
    setRespuestas(r => {
      const previa = r[pregunta.id] || {};
      // Si deja de ser negativa, los campos extra que había quedan obsoletos
      const limpia = esNegativa(pregunta, valor) ? previa : {};
      return { ...r, [pregunta.id]: { ...limpia, valor } };
    });
  };

  const setCampo = (preguntaId, clave, valor) => {
    setRespuestas(r => ({ ...r, [preguntaId]: { ...(r[preguntaId] || {}), [clave]: valor } }));
  };

  return (
    <div>
      {/* Progreso general */}
      <Card style={{ padding:"14px 16px" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
          <span style={{ fontSize:13, fontWeight:600, color:T.text }}>
            {resumen.respondidas} de {resumen.total} respondidas
          </span>
          <div style={{ display:"flex", gap:6 }}>
            {resumen.negativas > 0 && <Badge color="error">{resumen.negativas} hallazgos</Badge>}
            {resumen.completa && resumen.sinFaltantes && <Badge color="sage">✓ Completa</Badge>}
          </div>
        </div>
        <div style={{ background:T.divider, borderRadius:99, height:8, overflow:"hidden" }}>
          <div style={{
            height:"100%", borderRadius:99,
            width:`${(resumen.respondidas / resumen.total) * 100}%`,
            background: resumen.completa ? T.sage : T.primary,
            transition:"width .3s",
          }}/>
        </div>
        {resumen.incompletas.length > 0 && (
          <div style={{ fontSize:12, color:T.error, marginTop:8 }}>
            ⚠ {resumen.incompletas.length} {resumen.incompletas.length === 1 ? "hallazgo le falta" : "hallazgos les falta"} el detalle obligatorio
          </div>
        )}
      </Card>

      {/* Secciones */}
      {ENCUESTA_V2.map(seccion => {
        const cerrada = !!colapsadas[seccion.id];
        const respondidasSeccion = seccion.preguntas.filter(p => respuestas[p.id]?.valor).length;
        const completa = respondidasSeccion === seccion.preguntas.length;

        return (
          <Card key={seccion.id} style={{ padding:0, overflow:"hidden" }}>
            <div
              onClick={() => setColapsadas(c => ({ ...c, [seccion.id]: !cerrada }))}
              style={{
                padding:"14px 16px", cursor:"pointer", display:"flex",
                justifyContent:"space-between", alignItems:"center",
                background: completa ? T.sageBg : T.cardSoft,
              }}
            >
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <span style={{ fontSize:18 }}>{seccion.icono}</span>
                <span style={{ fontFamily:F.serif, fontSize:17, fontWeight:700, color:T.primaryDeep }}>
                  {seccion.titulo}
                </span>
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <span style={{ fontSize:12, fontWeight:700, color: completa ? T.sage : T.muted }}>
                  {respondidasSeccion}/{seccion.preguntas.length}
                </span>
                <span style={{ color:T.muted2, fontSize:12 }}>{cerrada ? "▼" : "▲"}</span>
              </div>
            </div>

            {!cerrada && (
              <div style={{ padding:"4px 16px 16px" }}>
                {seccion.preguntas.map(p => {
                  const respuesta = respuestas[p.id];
                  const negativa = esNegativa(p, respuesta?.valor);
                  const pendientesDeEsta = pendientes.filter(x => x.preguntaId === p.id);

                  return (
                    <div key={p.id} style={{ paddingTop:16, borderTop:`1px solid ${T.divider}`, marginTop:12 }}>
                      <div style={{ fontSize:14, fontWeight:500, color:T.text, marginBottom:10, lineHeight:1.5 }}>
                        {p.texto}
                      </div>

                      <Opciones
                        opciones={p.opciones}
                        valor={respuesta?.valor ?? null}
                        negativas={p.negativa}
                        onChange={v => setValor(p, v)}
                      />

                      {negativa && (
                        <>
                          <CamposExtra
                            pregunta={p}
                            respuesta={respuesta}
                            visitaId={visitaId}
                            sucursalNombre={sucursalNombre}
                            onCampo={(clave, valor) => setCampo(p.id, clave, valor)}
                          />

                          {/* Pendientes ya creados desde esta pregunta */}
                          {pendientesDeEsta.map(pend => (
                            <div key={pend.id} style={{
                              display:"flex", justifyContent:"space-between", alignItems:"center", gap:8,
                              marginTop:8, padding:"9px 12px", borderRadius:10,
                              background:T.amberBg, border:`1px solid ${T.amber}44`,
                            }}>
                              <span style={{ fontSize:12, color:T.text, flex:1, lineHeight:1.4 }}>
                                ⚠ <strong>Pendiente:</strong> {pend.descripcion}
                              </span>
                              <button onClick={() => onQuitarPendiente?.(pend.id)} style={{
                                border:"none", background:"transparent", color:T.muted,
                                cursor:"pointer", fontSize:14, padding:"0 2px",
                              }}>✕</button>
                            </div>
                          ))}

                          {pendientesDeEsta.length === 0 && (
                            <button onClick={() => onCrearPendiente?.(p, respuesta)} style={{
                              width:"100%", marginTop:8, padding:"10px", borderRadius:12,
                              border:`1.5px dashed ${T.amber}`, background:T.amberBg,
                              color:T.amber, fontWeight:700, fontSize:13,
                              fontFamily:F.body, cursor:"pointer",
                            }}>
                              + Crear pendiente por este hallazgo
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}
