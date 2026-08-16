import { useState, useEffect } from "react";
import { T, F } from "../theme";
import { CATEGORIAS, ESTADOS, ESTADOS_CERRADOS as CERRADOS, PRIORIDADES, opcion } from "../constants";
import { API } from "../api";
import { estaVencido, fmtFecha, textoVencimiento } from "../utils";
import { Badge, Btn, BtnSm, Card, Label, Textarea } from "../ui";
import PendienteForm from "../visita/PendienteForm";

const RANK_PRIORIDAD = { critica: 0, alta: 1, media: 2, baja: 3 };

// Mismo criterio que el ORDER BY de api/pendientes.js: se replica
// acá porque después de cada cambio de estado hay que reordenar en el cliente.
function ordenar(lista) {
  return [...lista].sort((a, b) => {
    const cerradoA = CERRADOS.includes(a.estado) ? 1 : 0;
    const cerradoB = CERRADOS.includes(b.estado) ? 1 : 0;
    if (cerradoA !== cerradoB) return cerradoA - cerradoB;

    const vencA = estaVencido(a) ? 0 : 1;
    const vencB = estaVencido(b) ? 0 : 1;
    if (vencA !== vencB) return vencA - vencB;

    const priA = RANK_PRIORIDAD[a.prioridad] ?? 9;
    const priB = RANK_PRIORIDAD[b.prioridad] ?? 9;
    if (priA !== priB) return priA - priB;

    if (a.fechaLimite !== b.fechaLimite) {
      if (!a.fechaLimite) return 1;   // NULLS LAST
      if (!b.fechaLimite) return -1;
      return a.fechaLimite < b.fechaLimite ? -1 : 1;
    }
    return String(b.fechaCreacion || "").localeCompare(String(a.fechaCreacion || ""));
  });
}

const Filtro = ({ value, onChange, children }) => (
  <select value={value} onChange={onChange} style={{
    flex:"1 1 45%", minWidth:0, padding:"9px 10px", borderRadius:11,
    border:`1.5px solid ${T.border}`, background:T.inputBg,
    fontSize:12, color:T.text, outline:"none", fontFamily:F.body, cursor:"pointer",
  }}>{children}</select>
);

// ══════════════════════════════════════════════════════════════════════════════
// PANEL ILEANA – PENDIENTES
// ══════════════════════════════════════════════════════════════════════════════
export default function PendientesPanel({ sucursales = [], equipo = [] }) {
  const [pendientes, setPendientes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  const [filtros, setFiltros] = useState({
    sucursal: "", categoria: "", prioridad: "", estado: "activos",
  });
  const [expandido, setExpandido] = useState(null);
  const [ocupado, setOcupado] = useState(null);      // id que está guardando
  const [borradores, setBorradores] = useState({});  // { [id]: { seguimiento, cierre } }
  const [nuevoAbierto, setNuevoAbierto] = useState(false);

  const cargar = () => {
    setCargando(true); setError(null);
    API.getPendientes()
      .then(rows => setPendientes(ordenar(rows)))
      .catch(e => setError(e.message || "No se pudieron cargar los pendientes"))
      .finally(() => setCargando(false));
  };

  useEffect(cargar, []);

  const setFiltro = (k, v) => setFiltros(f => ({ ...f, [k]: v }));
  const borrador = (id) => borradores[id] || {};
  const setBorrador = (id, k, v) =>
    setBorradores(b => ({ ...b, [id]: { ...(b[id] || {}), [k]: v } }));

  const reemplazar = (p) => setPendientes(prev => ordenar(prev.map(x => x.id === p.id ? p : x)));

  // ─── Acciones ──────────────────────────────────────────────────────────────
  const cambiarEstado = async (p, estado) => {
    if (p.estado === estado) return;
    setOcupado(p.id); setError(null);
    try {
      const comentarioCierre = CERRADOS.includes(estado)
        ? (borrador(p.id).cierre || "").trim() || null
        : null;
      const actualizado = await API.actualizarPendiente({ id: p.id, estado, comentarioCierre });
      reemplazar(actualizado);
      setBorrador(p.id, "cierre", "");
    } catch (e) {
      setError(e.message || "No se pudo actualizar el estado");
    } finally { setOcupado(null); }
  };

  const cambiarPrioridad = async (p, prioridad) => {
    if (p.prioridad === prioridad) return;
    setOcupado(p.id); setError(null);
    try {
      reemplazar(await API.actualizarPendiente({ id: p.id, prioridad }));
    } catch (e) {
      setError(e.message || "No se pudo cambiar la prioridad");
    } finally { setOcupado(null); }
  };

  const agregarSeguimiento = async (p) => {
    const texto = (borrador(p.id).seguimiento || "").trim();
    if (!texto) return;
    setOcupado(p.id); setError(null);
    try {
      reemplazar(await API.agregarSeguimiento(p.id, texto, "Ileana"));
      setBorrador(p.id, "seguimiento", "");
    } catch (e) {
      setError(e.message || "No se pudo agregar el seguimiento");
    } finally { setOcupado(null); }
  };

  const crearNuevo = async (p) => {
    setNuevoAbierto(false); setError(null);
    try {
      await API.crearPendiente(p);
      cargar();
    } catch (e) {
      setError(e.message || "No se pudo crear el pendiente");
    }
  };

  // ─── Filtrado ──────────────────────────────────────────────────────────────
  const lista = pendientes.filter(p => {
    if (filtros.sucursal && String(p.sucursalId) !== filtros.sucursal) return false;
    if (filtros.categoria && p.categoria !== filtros.categoria) return false;
    if (filtros.prioridad && p.prioridad !== filtros.prioridad) return false;
    if (filtros.estado === "activos") return !CERRADOS.includes(p.estado);
    if (filtros.estado === "todos") return true;
    return p.estado === filtros.estado;
  });

  const activos  = pendientes.filter(p => !CERRADOS.includes(p.estado));
  const vencidos = activos.filter(estaVencido).length;
  const criticos = activos.filter(p => p.prioridad === "critica").length;

  const sucursalesConPendientes = sucursales.filter(s =>
    pendientes.some(p => String(p.sucursalId) === String(s.id))
  );

  if (cargando) return <div style={{ textAlign:"center", padding:40, color:T.muted }}>Cargando…</div>;

  return (
    <div style={{ padding:"18px 16px" }}>
      {/* Resumen */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, marginBottom:14 }}>
        {[
          ["Abiertos", activos.length, T.primaryDeep],
          ["Vencidos", vencidos, vencidos > 0 ? T.error : T.muted2],
          ["Críticos", criticos, criticos > 0 ? T.error : T.muted2],
        ].map(([l, v, color]) => (
          <div key={l} style={{ background:T.card, borderRadius:14, padding:"14px 8px", textAlign:"center", boxShadow:T.shadowCard }}>
            <div style={{ fontFamily:F.serif, fontSize:26, fontWeight:700, color }}>{v}</div>
            <div style={{ fontSize:11, color:T.muted, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.5px" }}>{l}</div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div style={{ display:"flex", flexWrap:"wrap", gap:8, marginBottom:12 }}>
        <Filtro value={filtros.sucursal} onChange={e => setFiltro("sucursal", e.target.value)}>
          <option value="">Todas las sucursales</option>
          {sucursalesConPendientes.map(s => <option key={s.id} value={String(s.id)}>{s.nombre}</option>)}
        </Filtro>
        <Filtro value={filtros.categoria} onChange={e => setFiltro("categoria", e.target.value)}>
          <option value="">Todas las categorías</option>
          {CATEGORIAS.map(c => <option key={c.id} value={c.id}>{c.icono} {c.label}</option>)}
        </Filtro>
        <Filtro value={filtros.prioridad} onChange={e => setFiltro("prioridad", e.target.value)}>
          <option value="">Toda prioridad</option>
          {PRIORIDADES.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
        </Filtro>
        <Filtro value={filtros.estado} onChange={e => setFiltro("estado", e.target.value)}>
          <option value="activos">Abiertos y en progreso</option>
          {ESTADOS.map(e => <option key={e.id} value={e.id}>{e.label}</option>)}
          <option value="todos">Todos</option>
        </Filtro>
      </div>

      <div style={{ display:"flex", gap:8, marginBottom:14 }}>
        <BtnSm onClick={() => setNuevoAbierto(true)}>+ Nuevo pendiente</BtnSm>
        <BtnSm variant="ghost" onClick={cargar}>↻ Actualizar</BtnSm>
      </div>

      {error && (
        <div style={{ background:T.errorBg, color:T.error, borderRadius:12, padding:"12px 14px", fontSize:13, marginBottom:12 }}>
          ⚠ {error}
        </div>
      )}

      {lista.length === 0 && (
        <div style={{ textAlign:"center", color:T.muted, padding:32 }}>
          {pendientes.length === 0 ? "Todavía no hay pendientes registrados." : "Ningún pendiente coincide con los filtros."}
        </div>
      )}

      {/* Lista */}
      {lista.map(p => {
        const cat = opcion(CATEGORIAS, p.categoria);
        const pri = opcion(PRIORIDADES, p.prioridad);
        const est = opcion(ESTADOS, p.estado);
        const vencido = estaVencido(p);
        const cerrado = CERRADOS.includes(p.estado);
        const abierto = expandido === p.id;
        const trabajando = ocupado === p.id;
        const venceTxt = textoVencimiento(p.fechaLimite);

        return (
          <div key={p.id} style={{
            background:T.card, borderRadius:16, boxShadow:T.shadowList, marginBottom:10,
            overflow:"hidden", opacity: cerrado ? 0.72 : 1,
            borderLeft: vencido ? `4px solid ${T.error}` : undefined,
          }}>
            <div onClick={() => setExpandido(abierto ? null : p.id)}
              style={{ padding:"13px 16px", cursor:"pointer" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:8, marginBottom:6 }}>
                <span style={{ fontSize:11, color:T.muted, fontWeight:600 }}>
                  {cat?.icono} {p.sucursalNombre}
                </span>
                <div style={{ display:"flex", gap:5, alignItems:"center", flexShrink:0 }}>
                  {vencido && <Badge color="error">Vencido</Badge>}
                  {pri && <Badge color={pri.badge}>{pri.label}</Badge>}
                  <span style={{ color:T.muted2, fontSize:11 }}>{abierto ? "▲" : "▼"}</span>
                </div>
              </div>
              <div style={{
                fontSize:14, color:T.text, lineHeight:1.45,
                textDecoration: p.estado === "cancelado" ? "line-through" : "none",
              }}>
                {p.descripcion}
              </div>
              <div style={{ display:"flex", flexWrap:"wrap", gap:10, fontSize:11, color:T.muted, marginTop:6 }}>
                {est && <Badge color={est.badge}>{est.label}</Badge>}
                {p.responsable && <span>👤 {p.responsable}</span>}
                {p.fechaLimite && (
                  <span style={{ color: vencido ? T.error : T.muted }}>
                    📅 {fmtFecha(p.fechaLimite)}{venceTxt ? ` · ${venceTxt}` : ""}
                  </span>
                )}
                {p.seguimiento?.length > 0 && <span>💬 {p.seguimiento.length}</span>}
              </div>
            </div>

            {abierto && (
              <div style={{ borderTop:`1px solid ${T.divider}`, padding:"14px 16px", background:T.cardSoft }}>
                <div style={{ fontSize:12, color:T.muted, marginBottom:12 }}>
                  {cat?.label} · creado el {fmtFecha(p.fechaCreacion)}
                  {p.fechaActualizacion && ` · actualizado el ${fmtFecha(p.fechaActualizacion)}`}
                </div>

                {p.accionCorrectiva && (
                  <div style={{ marginBottom:12 }}>
                    <Label>Acción correctiva</Label>
                    <div style={{ fontSize:13, color:T.text, lineHeight:1.5 }}>{p.accionCorrectiva}</div>
                  </div>
                )}

                {p.evidenciaUrl && (
                  <div style={{ marginBottom:12 }}>
                    <Label>Evidencia</Label>
                    <a href={p.evidenciaUrl} target="_blank" rel="noreferrer">
                      <img src={p.evidenciaUrl} alt="Evidencia" style={{ width:"100%", borderRadius:10, maxHeight:180, objectFit:"cover" }}/>
                    </a>
                  </div>
                )}

                {p.comentarioCierre && (
                  <div style={{ background:T.sageBg, borderRadius:10, padding:"10px 12px", marginBottom:12 }}>
                    <div style={{ fontSize:11, fontWeight:600, color:T.sage, marginBottom:3 }}>Cierre</div>
                    <div style={{ fontSize:13, color:T.text, lineHeight:1.5 }}>{p.comentarioCierre}</div>
                  </div>
                )}

                {/* Estado */}
                <div style={{ marginBottom:12 }}>
                  <Label>Estado</Label>
                  <div style={{ display:"flex", gap:5 }}>
                    {ESTADOS.map(e => {
                      const activo = p.estado === e.id;
                      return (
                        <button key={e.id} disabled={trabajando} onClick={() => cambiarEstado(p, e.id)} style={{
                          flex:1, padding:"9px 2px", borderRadius:10,
                          border:`2px solid ${activo ? T.primaryDeep : T.border}`,
                          background:activo ? T.activeSoft : T.inputBg,
                          color:activo ? T.primaryDeep : T.muted,
                          fontWeight:700, cursor:trabajando ? "wait" : "pointer",
                          fontSize:11, fontFamily:F.body, opacity:trabajando ? 0.6 : 1,
                        }}>{e.label}</button>
                      );
                    })}
                  </div>
                  {!cerrado && (
                    <div style={{ marginTop:8 }}>
                      <Textarea
                        rows={2}
                        placeholder="Comentario de cierre (se guarda al marcar resuelto o cancelado)"
                        value={borrador(p.id).cierre || ""}
                        onChange={e => setBorrador(p.id, "cierre", e.target.value)}
                      />
                    </div>
                  )}
                </div>

                {/* Prioridad */}
                <div style={{ marginBottom:12 }}>
                  <Label>Prioridad</Label>
                  <div style={{ display:"flex", gap:5 }}>
                    {PRIORIDADES.map(pr => {
                      const activo = p.prioridad === pr.id;
                      return (
                        <button key={pr.id} disabled={trabajando} onClick={() => cambiarPrioridad(p, pr.id)} style={{
                          flex:1, padding:"9px 2px", borderRadius:10,
                          border:`2px solid ${activo ? T.primaryDeep : T.border}`,
                          background:activo ? T.activeSoft : T.inputBg,
                          color:activo ? T.primaryDeep : T.muted,
                          fontWeight:700, cursor:trabajando ? "wait" : "pointer",
                          fontSize:11, fontFamily:F.body, opacity:trabajando ? 0.6 : 1,
                        }}>{pr.label}</button>
                      );
                    })}
                  </div>
                </div>

                {/* Seguimiento */}
                <Label>Seguimiento</Label>
                {p.seguimiento?.length > 0 ? (
                  <div style={{ marginBottom:10 }}>
                    {p.seguimiento.map((s, i) => (
                      <div key={i} style={{
                        background:T.white, borderRadius:10, padding:"9px 12px", marginBottom:6,
                        borderLeft:`3px solid ${T.primary}`,
                      }}>
                        <div style={{ fontSize:10, color:T.muted2, marginBottom:3 }}>
                          {s.autor} · {fmtFecha(s.fecha)}
                        </div>
                        <div style={{ fontSize:13, color:T.text, lineHeight:1.5 }}>{s.texto}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ fontSize:12, color:T.muted2, marginBottom:10 }}>Sin seguimiento todavía.</div>
                )}

                <Textarea
                  rows={2}
                  placeholder="Agregar seguimiento…"
                  value={borrador(p.id).seguimiento || ""}
                  onChange={e => setBorrador(p.id, "seguimiento", e.target.value)}
                />
                <Btn
                  variant="ghost"
                  disabled={trabajando || !(borrador(p.id).seguimiento || "").trim()}
                  onClick={() => agregarSeguimiento(p)}
                  style={{ marginTop:8 }}
                >
                  {trabajando ? "Guardando…" : "+ Agregar seguimiento"}
                </Btn>
              </div>
            )}
          </div>
        );
      })}

      {nuevoAbierto && (
        <PendienteForm
          titulo="Nuevo pendiente"
          inicial={{ categoria:"otro" }}
          equipo={equipo}
          sucursales={sucursales}
          onGuardar={crearNuevo}
          onCancelar={() => setNuevoAbierto(false)}
        />
      )}
    </div>
  );
}
