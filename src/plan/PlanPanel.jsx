import { useState, useEffect } from "react";
import { T, F } from "../theme";
import { ESTADO_DERIVADO, FRANJAS, opcion } from "../constants";
import { API } from "../api";
import { fmtFecha, hoy, mesActual } from "../utils";
import { Badge, Btn, BtnSm, Card, Label, Select, Textarea } from "../ui";
import ArmarPlan from "./ArmarPlan";
import {
  agruparPorSemana, cobertura, cumplimientoPlan, estadoDerivado,
  mesAnterior, mesSiguiente, nombreMes,
} from "./datos";

const diaCorto = (fecha) =>
  new Date(`${fecha}T00:00:00`).toLocaleDateString("es-AR", { weekday:"short", day:"numeric" });

// ══════════════════════════════════════════════════════════════════════════════
// PANEL ILEANA – PLAN
// ══════════════════════════════════════════════════════════════════════════════
export default function PlanPanel({ sucursales = [] }) {
  const [mes, setMes] = useState(mesActual);
  const [recorridas, setRecorridas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [armando, setArmando] = useState(false);
  const [semanaFiltro, setSemanaFiltro] = useState("");
  const [ocupado, setOcupado] = useState(null);
  const [reprogramando, setReprogramando] = useState(null);   // id
  const [borrador, setBorrador] = useState({ fechaPlan:"", motivo:"" });

  const cargar = (m = mes) => {
    setCargando(true); setError(null);
    API.getRecorridas(m)
      .then(rs => { setRecorridas(rs); setSemanaFiltro(""); })
      .catch(e => { setError(e.message || "No se pudo cargar el plan"); setRecorridas([]); })
      .finally(() => setCargando(false));
  };

  useEffect(() => { cargar(mes); }, [mes]);

  const reemplazar = (r) => setRecorridas(prev => prev.map(x => x.id === r.id ? { ...r, visitaProbable: null } : x));

  const aprobar = async () => {
    setOcupado("aprobar"); setError(null);
    try { await API.aprobarPlan(mes); cargar(mes); }
    catch (e) { setError(e.message || "No se pudo aprobar el plan"); }
    finally { setOcupado(null); }
  };

  const cambiar = async (r, cambios) => {
    setOcupado(r.id); setError(null);
    try {
      const act = await API.actualizarRecorrida({ id: r.id, ...cambios });
      if (act) reemplazar(act);
      setReprogramando(null);
      setBorrador({ fechaPlan:"", motivo:"" });
    } catch (e) { setError(e.message || "No se pudo actualizar la recorrida"); }
    finally { setOcupado(null); }
  };

  const vincular = async (r) => {
    setOcupado(r.id); setError(null);
    try {
      const act = await API.vincularVisita({
        visitaId: r.visitaProbable, sucursalId: r.sucursalId, fecha: r.fechaPlan,
      });
      if (act) reemplazar(act); else cargar(mes);
    } catch (e) { setError(e.message || "No se pudo vincular la visita"); }
    finally { setOcupado(null); }
  };

  if (armando) return (
    <div style={{ padding:"18px 16px" }}>
      <ArmarPlan
        mes={mes}
        sucursales={sucursales}
        existentes={recorridas}
        onListo={() => { setArmando(false); cargar(mes); }}
        onCancelar={() => setArmando(false)}
      />
    </div>
  );

  const cumpl = cumplimientoPlan(recorridas);
  const cob = cobertura(sucursales, recorridas);
  const semanas = agruparPorSemana(recorridas);
  const sinAprobar = recorridas.filter(r => !r.aprobado && r.estado !== "cancelada").length;
  const aprobadoEn = recorridas.find(r => r.aprobadoEn)?.aprobadoEn;
  const visibles = semanaFiltro ? semanas.filter(s => s.clave === semanaFiltro) : semanas;

  return (
    <div style={{ padding:"18px 16px" }}>
      {/* Navegación de mes */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:8, marginBottom:12 }}>
        <BtnSm variant="ghost" onClick={() => setMes(mesAnterior(mes))}>‹</BtnSm>
        <span style={{ fontFamily:F.serif, fontSize:20, fontWeight:700, color:T.primaryDeep, textTransform:"capitalize" }}>
          {nombreMes(mes)}
        </span>
        <BtnSm variant="ghost" onClick={() => setMes(mesSiguiente(mes))}>›</BtnSm>
      </div>

      {error && (
        <div style={{ background:T.errorBg, color:T.error, borderRadius:12, padding:"12px 14px", fontSize:13, marginBottom:12 }}>
          ⚠ {error}
        </div>
      )}

      {cargando && <div style={{ textAlign:"center", padding:40, color:T.muted }}>Cargando…</div>}

      {/* Mes sin plan */}
      {!cargando && recorridas.length === 0 && (
        <Card style={{ textAlign:"center", padding:"32px 20px" }}>
          <div style={{ fontSize:34, marginBottom:10 }}>🗓</div>
          <div style={{ fontFamily:F.serif, fontSize:19, fontWeight:700, color:T.primaryDeep, marginBottom:6 }}>
            Sin plan para {nombreMes(mes)}
          </div>
          <div style={{ fontSize:13, color:T.muted, marginBottom:18, lineHeight:1.5 }}>
            Las visitas se pueden registrar igual. El plan sirve para comparar lo
            previsto con lo que efectivamente pasó.
          </div>
          <Btn onClick={() => setArmando(true)}>Armar plan de {nombreMes(mes)}</Btn>
          <Btn variant="ghost" onClick={() => setMes(mesSiguiente(mes))} style={{ marginTop:8 }}>
            Ir a {nombreMes(mesSiguiente(mes))} →
          </Btn>
        </Card>
      )}

      {!cargando && recorridas.length > 0 && <>
        {/* Planificado vs realizado */}
        <Card>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
            <span style={{ fontFamily:F.serif, fontSize:19, fontWeight:700, color:T.primaryDeep }}>
              Planificado vs. realizado
            </span>
            <span style={{ fontFamily:F.serif, fontSize:26, fontWeight:700, color: cumpl.pct >= 80 ? T.sage : cumpl.pct >= 50 ? T.amber : T.error }}>
              {cumpl.pct}%
            </span>
          </div>

          <div style={{ background:T.divider, borderRadius:99, height:10, overflow:"hidden", marginBottom:12 }}>
            <div style={{
              height:"100%", borderRadius:99, width:`${cumpl.pct}%`,
              background: cumpl.pct >= 80 ? T.sage : cumpl.pct >= 50 ? T.amber : T.error,
              transition:"width .3s",
            }}/>
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:6 }}>
            {[
              ["Plan", cumpl.total, T.primaryDeep],
              ["Hechas", cumpl.realizadas, T.sage],
              ["Pend.", cumpl.pendientes, T.muted],
              ["Incump.", cumpl.incumplidas, cumpl.incumplidas > 0 ? T.error : T.muted2],
            ].map(([l, v, c]) => (
              <div key={l} style={{ background:T.cardSoft, borderRadius:11, padding:"10px 4px", textAlign:"center" }}>
                <div style={{ fontFamily:F.serif, fontSize:20, fontWeight:700, color:c }}>{v}</div>
                <div style={{ fontSize:10, color:T.muted, fontWeight:600 }}>{l}</div>
              </div>
            ))}
          </div>

          <div style={{ fontSize:11, color:T.muted, marginTop:10, display:"flex", flexWrap:"wrap", gap:10 }}>
            <span>Cobertura {cob.cubiertas}/{cob.total} sucursales</span>
            {cumpl.reprogramadas > 0 && <span style={{ color:T.amber }}>{cumpl.reprogramadas} reprogramadas</span>}
            {cumpl.canceladas > 0 && <span>{cumpl.canceladas} canceladas</span>}
          </div>

          {!cob.completa && (
            <div style={{ background:T.amberBg, borderRadius:10, padding:"9px 12px", fontSize:12, color:T.amber, marginTop:10 }}>
              Sin recorrida planificada: {cob.faltantes.map(s => s.nombre).join(", ")}
            </div>
          )}
        </Card>

        {/* Aprobación */}
        <Card style={{ background: sinAprobar === 0 ? T.sageBg : T.cardSoft, border:`1px solid ${sinAprobar === 0 ? T.sage : T.border}44` }}>
          {sinAprobar === 0 ? (
            <div style={{ display:"flex", alignItems:"center", gap:9 }}>
              <span style={{ fontSize:18 }}>✓</span>
              <div>
                <div style={{ fontSize:14, fontWeight:700, color:T.sage }}>Plan aprobado</div>
                {aprobadoEn && (
                  <div style={{ fontSize:12, color:T.muted }}>el {fmtFecha(aprobadoEn)}</div>
                )}
              </div>
            </div>
          ) : (
            <>
              <div style={{ fontSize:13, color:T.text, marginBottom:12, lineHeight:1.5 }}>
                {recorridas.some(r => r.aprobado)
                  ? `Plan aprobado, pero se agregaron ${sinAprobar} ${sinAprobar === 1 ? "recorrida" : "recorridas"} después.`
                  : `${sinAprobar} ${sinAprobar === 1 ? "recorrida espera" : "recorridas esperan"} tu aprobación.`}
              </div>
              <Btn disabled={ocupado === "aprobar"} onClick={aprobar}>
                {ocupado === "aprobar" ? "Aprobando…" : `Aprobar plan de ${nombreMes(mes)}`}
              </Btn>
            </>
          )}
        </Card>

        {/* Filtro por semana */}
        {semanas.length > 1 && (
          <div style={{ marginBottom:12 }}>
            <Select value={semanaFiltro} onChange={e => setSemanaFiltro(e.target.value)}>
              <option value="">Todas las semanas</option>
              {semanas.map(s => (
                <option key={s.clave} value={s.clave}>
                  {fmtFecha(`${s.inicio}T00:00:00`)} — {fmtFecha(`${s.fin}T00:00:00`)}
                  {s.esActual ? " (esta semana)" : ""}
                </option>
              ))}
            </Select>
          </div>
        )}

        {/* Recorridas */}
        {visibles.map(sem => (
          <Card key={sem.clave} style={{ padding:0, overflow:"hidden" }}>
            <div style={{ padding:"10px 14px", background: sem.esActual ? T.activeSoft : T.cardSoft }}>
              <span style={{ fontSize:12, fontWeight:700, color:T.primaryDeep }}>
                {fmtFecha(`${sem.inicio}T00:00:00`)} — {fmtFecha(`${sem.fin}T00:00:00`)}
              </span>
            </div>

            {sem.recorridas.map(r => {
              const fr = opcion(FRANJAS, r.franja);
              const derivado = estadoDerivado(r);
              const est = ESTADO_DERIVADO[derivado];
              const trabajando = ocupado === r.id;
              const editando = reprogramando === r.id;

              return (
                <div key={r.id} style={{
                  padding:"11px 14px", borderBottom:`1px solid ${T.divider}`,
                  borderLeft: derivado === "incumplida" ? `3px solid ${T.error}` : "3px solid transparent",
                  opacity: derivado === "cancelada" ? 0.6 : 1,
                }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:8 }}>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:7, flexWrap:"wrap" }}>
                        <span style={{ fontSize:12, fontWeight:700, color:T.primaryDeep, textTransform:"capitalize" }}>
                          {diaCorto(r.fechaPlan)}
                        </span>
                        <span style={{
                          fontWeight:700, fontSize:14, color:T.text,
                          textDecoration: derivado === "cancelada" ? "line-through" : "none",
                        }}>{r.sucursalNombre}</span>
                        {!r.aprobado && r.estado !== "cancelada" && <Badge color="amber">sin aprobar</Badge>}
                      </div>
                      <div style={{ fontSize:11, color:T.muted, marginTop:3 }}>
                        {fr?.icono} {fr?.label}
                        {r.fechaPlanOriginal && (
                          <span style={{ color:T.amber }}>
                            {" · "}planificada el {fmtFecha(`${r.fechaPlanOriginal}T00:00:00`)}
                          </span>
                        )}
                      </div>
                      {r.motivoReprogramacion && (
                        <div style={{ fontSize:11, color:T.muted, marginTop:3, fontStyle:"italic" }}>
                          "{r.motivoReprogramacion}"
                        </div>
                      )}
                    </div>
                    <Badge color={est.badge}>{est.icono} {est.label}</Badge>
                  </div>

                  {/* Visita sin vincular detectada por el servidor */}
                  {r.visitaProbable && (
                    <div style={{
                      marginTop:9, padding:"9px 12px", borderRadius:10,
                      background:T.amberBg, border:`1px solid ${T.amber}44`,
                    }}>
                      <div style={{ fontSize:12, color:T.text, marginBottom:8, lineHeight:1.5 }}>
                        Hay una visita de ese día a esta sucursal que quedó sin vincular.
                      </div>
                      <BtnSm onClick={() => vincular(r)}>
                        {trabajando ? "Vinculando…" : "Vincular y marcar realizada"}
                      </BtnSm>
                    </div>
                  )}

                  {/* Acciones */}
                  {derivado !== "realizada" && derivado !== "cancelada" && !editando && (
                    <div style={{ display:"flex", gap:6, marginTop:9 }}>
                      <BtnSm variant="ghost" onClick={() => { setReprogramando(r.id); setBorrador({ fechaPlan:r.fechaPlan, motivo:"" }); }}>
                        Reprogramar
                      </BtnSm>
                      <BtnSm variant="ghost" onClick={() => cambiar(r, { estado:"cancelada" })}>
                        {trabajando ? "…" : "Cancelar"}
                      </BtnSm>
                    </div>
                  )}

                  {editando && (
                    <div style={{ marginTop:10, padding:"11px 12px", borderRadius:11, background:T.cardSoft }}>
                      <Label>Nueva fecha</Label>
                      <input
                        type="date" value={borrador.fechaPlan}
                        onChange={e => setBorrador(b => ({ ...b, fechaPlan:e.target.value }))}
                        style={{
                          width:"100%", padding:"9px 11px", borderRadius:10,
                          border:`1.5px solid ${T.border}`, background:T.inputBg,
                          fontSize:13, color:T.text, outline:"none", fontFamily:F.body, marginBottom:9,
                        }}
                      />
                      <Label>Motivo</Label>
                      <Textarea
                        rows={2} placeholder="¿Por qué se reprograma?"
                        value={borrador.motivo}
                        onChange={e => setBorrador(b => ({ ...b, motivo:e.target.value }))}
                      />
                      <div style={{ display:"flex", gap:6, marginTop:9 }}>
                        <BtnSm
                          onClick={() => cambiar(r, {
                            estado:"reprogramada",
                            fechaPlan: borrador.fechaPlan,
                            motivoReprogramacion: borrador.motivo.trim() || null,
                          })}
                        >{trabajando ? "Guardando…" : "Guardar"}</BtnSm>
                        <BtnSm variant="ghost" onClick={() => setReprogramando(null)}>Cancelar</BtnSm>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </Card>
        ))}

        <Btn variant="ghost" onClick={() => setArmando(true)}>
          + Agregar recorridas a {nombreMes(mes)}
        </Btn>
        <Btn variant="ghost" onClick={() => setMes(mesSiguiente(mes))} style={{ marginTop:8 }}>
          Armar plan de {nombreMes(mesSiguiente(mes))} →
        </Btn>
      </>}
    </div>
  );
}
