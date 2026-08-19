import { useState, useEffect } from "react";
import { T, F } from "../theme";
import { ROLES } from "../constants";
import { API } from "../api";
import { mesActual } from "../utils";
import { Badge, BtnSm, Card, Input, ProgressBar } from "../ui";

const VACIA = { totalVisitas:0, visitasConPresencia:0, franjas:{}, personas:[] };

// ══════════════════════════════════════════════════════════════════════════════
// PANEL ILEANA – COBERTURA DE PERSONAL
//
// A cuánta gente vio Adrián en el mes. El personal rota entre las 7 sucursales,
// así que la pregunta no es "quién trabaja dónde" sino "a quién no vi nunca":
// una persona con 0 visitas observadas en el mes es un punto ciego de la
// supervisión, y es lo que el panel pinta en rojo.
//
// El % es sobre el total de visitas del mes, no sobre las visitas de su
// sucursal: no existe "su sucursal".
// ══════════════════════════════════════════════════════════════════════════════
export default function CoberturaPanel() {
  const [mes, setMes] = useState(mesActual);
  const [datos, setDatos] = useState(VACIA);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [bajaId, setBajaId] = useState(null);
  const [ocupado, setOcupado] = useState(null);

  const cargar = (m = mes) => {
    setCargando(true); setError(null); setBajaId(null);
    API.getCobertura(m)
      .then(setDatos)
      .catch(e => { setError(e.message || "No se pudo cargar la cobertura"); setDatos(VACIA); })
      .finally(() => setCargando(false));
  };

  useEffect(() => { cargar(mes); }, [mes]);

  const darDeBaja = async (persona) => {
    setOcupado(persona.id);
    try { await API.desactivarPersona(persona.id); cargar(mes); }
    catch (e) { setError(e.message || "No se pudo dar de baja a la persona"); }
    finally { setOcupado(null); setBajaId(null); }
  };

  const { totalVisitas, visitasConPresencia, franjas, personas } = datos;
  const sinObservar = personas.filter(p => p.visitas === 0 && p.activo);
  const grupos = ROLES
    .map(rol => ({ rol, gente: personas.filter(p => p.rol === rol.id) }))
    .filter(g => g.gente.length > 0);

  const Franja = ({ icono, titulo, dato }) => {
    const { auditadas = 0, planificadas = 0 } = dato || {};
    return (
      <div style={{ flex:1, background:T.card, borderRadius:16, padding:"14px 12px", boxShadow:T.shadowList, textAlign:"center" }}>
        <div style={{ fontSize:11, color:T.muted, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:6 }}>
          {icono} {titulo}
        </div>
        <div style={{ fontFamily:F.serif, fontSize:26, fontWeight:700, color: auditadas > 0 ? T.primaryDeep : T.muted2, lineHeight:1 }}>
          {auditadas}<span style={{ fontSize:15, color:T.muted }}>/{planificadas}</span>
        </div>
        <div style={{ fontSize:11, color:T.muted, marginTop:4 }}>auditadas</div>
      </div>
    );
  };

  return (
    <div style={{ padding:"18px 16px" }}>
      <div style={{ marginBottom:14 }}>
        <Input type="month" value={mes} onChange={e => setMes(e.target.value)}/>
      </div>

      {error && (
        <Card style={{ background:T.errorBg, border:`1px solid ${T.error}` }}>
          <div style={{ fontSize:13, color:T.error, lineHeight:1.5 }}>⚠ {error}</div>
        </Card>
      )}

      {cargando && (
        <div style={{ textAlign:"center", color:T.muted, padding:32 }}>Cargando cobertura…</div>
      )}

      {!cargando && (
        <>
          {/* ── Denominador del mes ───────────────────────────────────────── */}
          <div style={{ background:`linear-gradient(135deg, ${T.primary}, ${T.primaryDeep})`, borderRadius:18, padding:"24px 20px", textAlign:"center", color:T.white, marginBottom:12, boxShadow:T.shadowBtn }}>
            <div style={{ fontFamily:F.serif, fontSize:42, fontWeight:700, lineHeight:1 }}>{totalVisitas}</div>
            <div style={{ fontSize:14, opacity:.85, marginTop:4 }}>
              {totalVisitas === 1 ? "visita en el mes" : "visitas en el mes"}
            </div>
          </div>

          {/* Sin este aviso el % engaña: si la mitad de las visitas no registró
              presencia, todo el mundo aparece con cobertura baja sin serlo. */}
          {totalVisitas > visitasConPresencia && (
            <Card style={{ background:T.amberBg, border:`1px solid ${T.amber}44` }}>
              <div style={{ fontSize:13, color:T.text, lineHeight:1.5 }}>
                <strong style={{ color:T.amber }}>
                  {totalVisitas - visitasConPresencia} de {totalVisitas} visitas sin presencia cargada.
                </strong>{" "}
                Los porcentajes de abajo se calculan sobre el total del mes, así que
                quedan por debajo de lo real.
              </div>
            </Card>
          )}

          {/* ── Aperturas y cierres auditados ─────────────────────────────── */}
          <div style={{ display:"flex", gap:10, marginBottom:12 }}>
            <Franja icono="🌅" titulo="Aperturas" dato={franjas.apertura}/>
            <Franja icono="🌆" titulo="Cierres"   dato={franjas.cierre}/>
          </div>

          {/* ── Punto ciego ───────────────────────────────────────────────── */}
          {personas.length > 0 && (
            sinObservar.length > 0 ? (
              <Card style={{ background:T.errorBg, border:`1px solid ${T.error}44` }}>
                <div style={{ fontFamily:F.serif, fontSize:19, fontWeight:700, color:T.error, marginBottom:4 }}>
                  ⚠ {sinObservar.length} sin observar
                </div>
                <div style={{ fontSize:13, color:T.text, lineHeight:1.6 }}>
                  {sinObservar.map(p => p.nombre).join(" · ")}
                </div>
              </Card>
            ) : (
              <Card style={{ background:T.sageBg, border:`1px solid ${T.sage}44` }}>
                <div style={{ fontSize:13, color:T.sage, fontWeight:600 }}>
                  ✓ Todo el plantel activo fue observado al menos una vez este mes
                </div>
              </Card>
            )
          )}

          {personas.length === 0 && (
            <div style={{ textAlign:"center", color:T.muted, padding:32 }}>
              No hay personal cargado en el plantel.
            </div>
          )}

          {/* ── Detalle por rol ───────────────────────────────────────────── */}
          {grupos.map(({ rol, gente }) => (
            <Card key={rol.id}>
              <div style={{ fontSize:12, fontWeight:700, color:T.muted, textTransform:"uppercase", letterSpacing:"0.6px", marginBottom:12 }}>
                {rol.icono} {rol.label} · {gente.length}
              </div>

              {gente.map(p => {
                const pct = totalVisitas > 0 ? Math.round((p.visitas / totalVisitas) * 100) : 0;
                const ciega = p.visitas === 0;
                const confirmando = bajaId === p.id;

                return (
                  <div key={p.id} style={{
                    padding:"10px 0 12px",
                    borderTop:`1px solid ${T.divider}`,
                    borderLeft: ciega ? `3px solid ${T.error}` : "none",
                    paddingLeft: ciega ? 10 : 0,
                  }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", gap:8, marginBottom:6 }}>
                      <span style={{ fontSize:14, fontWeight:600, color: ciega ? T.error : T.text }}>
                        {p.nombre}
                        {!p.activo && <span style={{ marginLeft:6 }}><Badge color="terr">baja</Badge></span>}
                      </span>
                      <span style={{ fontSize:13, color:T.muted, whiteSpace:"nowrap" }}>
                        <strong style={{ color: ciega ? T.error : T.primaryDeep, fontSize:15 }}>{p.visitas}</strong>
                        {" "}· {pct}%
                      </span>
                    </div>

                    <ProgressBar val={p.visitas} max={totalVisitas || 1}/>

                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:8, marginTop:7 }}>
                      <span style={{ fontSize:11, color:T.muted }}>
                        {ciega
                          ? "Sin observar en el mes"
                          : `🌅 ${p.aperturas} ${p.aperturas === 1 ? "apertura" : "aperturas"} · 🌆 ${p.cierres} ${p.cierres === 1 ? "cierre" : "cierres"}`}
                      </span>

                      {p.activo && (
                        confirmando ? (
                          <span style={{ display:"flex", gap:6, flexShrink:0 }}>
                            <BtnSm variant="danger" onClick={() => darDeBaja(p)}>
                              {ocupado === p.id ? "…" : "Confirmar baja"}
                            </BtnSm>
                            <BtnSm variant="ghost" onClick={() => setBajaId(null)}>No</BtnSm>
                          </span>
                        ) : (
                          <BtnSm variant="ghost" onClick={() => setBajaId(p.id)}>Dar de baja</BtnSm>
                        )
                      )}
                    </div>
                  </div>
                );
              })}
            </Card>
          ))}
        </>
      )}
    </div>
  );
}
