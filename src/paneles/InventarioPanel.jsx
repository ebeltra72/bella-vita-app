import { useState, useEffect } from "react";
import { T, F } from "../theme";
import { RUBRO_ICONOS } from "../constants";
import { API } from "../api";
import { fmtFecha } from "../utils";
import { Card } from "../ui";
import MinimosPanel from "../stock/MinimosPanel";
import { bajoMinimo, contarBajoMinimo, fmtCantidad, indexarMinimos } from "../stock/datos";

const SUBTABS = [["controles","📋 Controles"],["minimos","🎯 Mínimos"]];

// Cuánto falta para llegar al mínimo. Se redondea a dos decimales porque las
// cantidades se cargan con step 0,5 y la resta en punto flotante puede dejar
// colas como 9.499999999999998.
const deficit = (a) => Math.round((Number(a.minimo) - Number(a.cantidad)) * 100) / 100;

// ══════════════════════════════════════════════════════════════════════════════
// PANEL ILEANA – INVENTARIO
//
// Dos secciones con jerarquía explícita:
//
//   1. Qué falta HOY. Se deriva del último control de cada producto en cada
//      sucursal, ordenado por déficit: lo más urgente arriba.
//   2. Qué se controló, cuándo y dónde. El historial completo, con filtros.
//
// La primera responde "qué compro"; la segunda, "qué pasó". Antes estaban
// mezcladas y había que abrir control por control para enterarse de lo primero.
//
// Los mínimos viven acá y no dentro de MinimosPanel para que editarlos repinte
// los controles al instante, sin recargar.
// ══════════════════════════════════════════════════════════════════════════════
export default function InventarioPanel() {
  const [vista, setVista] = useState("controles");
  const [inventarios, setInventarios] = useState([]);
  const [minimos, setMinimos] = useState([]);
  const [alertas, setAlertas] = useState([]);
  const [alertasError, setAlertasError] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [foco, setFoco] = useState(null);          // sucursalId con el detalle abierto
  const [filtroSuc, setFiltroSuc] = useState("");
  const [filtroRubro, setFiltroRubro] = useState("");
  const [expandido, setExpandido] = useState(null);

  useEffect(() => {
    API.getInventarios()
      .then(rows => setInventarios(rows.map(r => ({
        id: r.id,
        visitaId: r.visita_id,
        sucursalId: r.sucursal_id,
        sucursalNombre: r.sucursal_nombre,
        fecha: r.fecha?.slice(0, 10),
        rubro: r.rubro,
        productos: r.productos || {},
        creadoEn: r.creado_en,
      }))))
      .catch(() => {})
      .finally(() => setCargando(false));
  }, []);

  // Los mínimos van en su propio efecto: si la tabla todavía no existe o el
  // endpoint falla, el historial de controles tiene que seguir funcionando,
  // simplemente sin rojos.
  useEffect(() => {
    API.getMinimos().then(setMinimos).catch(() => setMinimos([]));
  }, []);

  // Las alertas vienen derivadas del servidor, ordenadas por antigüedad. Acá se
  // reordenan por déficit, que es el orden de esta pantalla: no es "hace cuánto
  // que falta" sino "cuánto falta".
  useEffect(() => {
    API.getAlertasStock()
      .then(rows => { setAlertas(rows); setAlertasError(null); })
      .catch(e => { setAlertas([]); setAlertasError(e.message || "No se pudieron cargar las alertas"); });
  }, []);

  const porProducto = indexarMinimos(minimos);

  const criticas = [...alertas].sort((a, b) => {
    const d = deficit(b) - deficit(a);
    if (d !== 0) return d;
    return a.producto.localeCompare(b.producto, "es");
  });

  // Nivel 1 del mapa: una tarjeta por sucursal con faltantes. Un listado plano
  // de 52 productos no se lee — la primera pregunta es dónde, y recién después
  // qué. Como `criticas` ya viene ordenado por déficit, el primer item de cada
  // grupo es su peor faltante y el orden de las sucursales sale solo.
  const grupos = [];
  for (const a of criticas) {
    let g = grupos.find(x => String(x.sucursalId) === String(a.sucursalId));
    if (!g) { g = { sucursalId: a.sucursalId, sucursalNombre: a.sucursalNombre, items: [] }; grupos.push(g); }
    g.items.push(a);
  }

  // Si la sucursal enfocada se quedó sin faltantes, se vuelve al mapa solo
  const grupoFoco = foco === null ? null : grupos.find(g => String(g.sucursalId) === String(foco)) || null;

  const sucursalesUnicas = [...new Set(inventarios.map(i => i.sucursalNombre))].filter(Boolean);
  const rubrosUnicos = [...new Set(inventarios.map(i => i.rubro))].filter(Boolean);

  const lista = inventarios.filter(i => {
    if (filtroSuc && i.sucursalNombre !== filtroSuc) return false;
    if (filtroRubro && i.rubro !== filtroRubro) return false;
    return true;
  }).sort((a, b) => b.fecha?.localeCompare(a.fecha));

  const SubTabs = () => (
    <div style={{ display:"flex", gap:8, marginBottom:16 }}>
      {SUBTABS.map(([v,l]) => (
        <button key={v} onClick={() => setVista(v)} style={{
          flex:1, padding:"10px 0", borderRadius:12, border:"none", cursor:"pointer",
          fontFamily:F.body, fontSize:13, fontWeight:700,
          background: vista===v ? T.primary : T.activeSoft,
          color: vista===v ? T.white : T.primaryDeep,
          boxShadow: vista===v ? T.shadowBtn : "none",
          transition:"all .15s",
        }}>{l}</button>
      ))}
    </div>
  );

  if (cargando) return <div style={{ textAlign:"center", padding:40, color:T.muted }}>Cargando…</div>;

  if (vista === "minimos") return (
    <div style={{ padding:"18px 16px" }}>
      <SubTabs/>
      <MinimosPanel minimos={minimos} setMinimos={setMinimos}/>
    </div>
  );

  return (
    <div style={{ padding:"18px 16px" }}>
      <SubTabs/>

      {/* ══════════════════════════════════════════════════════════════════════
          SECCIÓN 1 — ALERTAS DE STOCK
          ══════════════════════════════════════════════════════════════════════ */}

      {/* Si el pedido falló no se puede afirmar ninguna de las dos cosas: un
          "todo sobre mínimo" en verde sería mentira, y un rojo también. */}
      {alertasError && (
        <Card style={{ background:T.amberBg, border:`1px solid ${T.amber}44` }}>
          <div style={{ fontSize:13, color:T.text, lineHeight:1.5 }}>
            ⚠ No se pudo calcular el stock bajo mínimo.
            <div style={{ fontSize:11, color:T.muted2, marginTop:4 }}>{alertasError}</div>
          </div>
        </Card>
      )}

      {!alertasError && criticas.length === 0 && (
        <Card style={{ background:T.sageBg, border:`1px solid ${T.sage}44` }}>
          <div style={{ display:"flex", alignItems:"center", gap:9 }}>
            <span style={{ fontSize:20 }}>✓</span>
            <div>
              <div style={{ fontSize:14, fontWeight:700, color:T.sage }}>Todo el stock sobre mínimo</div>
              <div style={{ fontSize:12, color:T.muted, marginTop:2 }}>
                {minimos.length === 0
                  ? "Todavía no hay mínimos definidos: nada se está controlando."
                  : `${minimos.length} ${minimos.length === 1 ? "producto controlado" : "productos controlados"} en las 7 sucursales.`}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* ─── NIVEL 1: mapa de sucursales ───────────────────────────────────── */}
      {!alertasError && criticas.length > 0 && !grupoFoco && (
        <Card style={{ background:T.errorBg, border:`1px solid ${T.error}44`, padding:16 }}>
          <div style={{ fontFamily:F.serif, fontSize:21, fontWeight:700, color:T.error, marginBottom:3 }}>
            ⚠ {criticas.length} {criticas.length === 1 ? "producto bajo mínimo" : "productos bajo mínimo"}
          </div>
          <div style={{ fontSize:12, color:T.muted, marginBottom:12 }}>
            el que más falta, primero · tocá una sucursal para ver el detalle
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
            {grupos.map(g => {
              const peor = g.items[0];
              return (
                <button key={g.sucursalId} onClick={() => setFoco(g.sucursalId)} style={{
                  display:"flex", flexDirection:"column", alignItems:"flex-start", gap:6,
                  background:T.white, border:"none", borderRadius:14, padding:"12px 13px",
                  cursor:"pointer", textAlign:"left", fontFamily:F.body, width:"100%",
                }}>
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:8, width:"100%" }}>
                    <span style={{ fontSize:13, fontWeight:700, color:T.text, minWidth:0 }}>
                      {g.sucursalNombre}
                    </span>
                    <span style={{
                      background:T.error, color:T.white, borderRadius:20, padding:"2px 9px",
                      fontSize:12, fontWeight:700, flexShrink:0,
                    }}>{g.items.length}</span>
                  </div>

                  <div style={{ fontSize:11, color:T.muted, lineHeight:1.35, minWidth:0 }}>
                    {peor.producto}
                    <span style={{ color:T.error, fontWeight:700 }}> −{fmtCantidad(deficit(peor))}</span>
                    {g.items.length > 1 && (
                      <span style={{ color:T.muted2 }}>
                        {" "}y {g.items.length - 1} más
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </Card>
      )}

      {/* ─── NIVEL 2: detalle de una sucursal ──────────────────────────────── */}
      {!alertasError && grupoFoco && (
        <Card style={{ background:T.errorBg, border:`1px solid ${T.error}44`, padding:16 }}>
          <button onClick={() => setFoco(null)} style={{
            display:"flex", alignItems:"center", gap:7, background:"none", border:"none",
            padding:0, marginBottom:12, cursor:"pointer", fontFamily:F.body, textAlign:"left",
          }}>
            <span style={{ fontSize:16, color:T.error }}>←</span>
            <span style={{ fontSize:13, color:T.muted, fontWeight:600 }}>
              ⚠ Bajo mínimo
              <span style={{ color:T.muted2 }}> → </span>
              <span style={{ fontFamily:F.serif, fontSize:17, fontWeight:700, color:T.error }}>
                {grupoFoco.sucursalNombre}
              </span>
            </span>
          </button>

          <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
            {grupoFoco.items.map(a => (
              <div key={a.producto} style={{
                display:"flex", alignItems:"center", justifyContent:"space-between", gap:10,
                background:T.white, borderRadius:12, padding:"10px 12px",
              }}>
                <div style={{ minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:700, color:T.text }}>{a.producto}</div>
                  <div style={{ fontSize:11, color:T.muted, marginTop:2 }}>
                    Último control · {fmtFecha(a.fecha)}
                  </div>
                </div>

                <div style={{ display:"flex", alignItems:"center", gap:10, flexShrink:0 }}>
                  <div style={{ textAlign:"right" }}>
                    <div style={{ fontFamily:F.serif, fontSize:17, fontWeight:700, color:T.error, lineHeight:1 }}>
                      {fmtCantidad(a.cantidad)}
                    </div>
                    <div style={{ fontSize:10, color:T.muted, marginTop:3 }}>
                      mín. {fmtCantidad(a.minimo)}
                    </div>
                  </div>
                  <span style={{
                    background:T.errorBg, color:T.error, borderRadius:9, padding:"5px 9px",
                    fontSize:13, fontWeight:700, fontFamily:F.serif, whiteSpace:"nowrap",
                  }}>
                    −{fmtCantidad(deficit(a))}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          SECCIÓN 2 — HISTORIAL DE CONTROLES
          ══════════════════════════════════════════════════════════════════════ */}

      <div style={{ margin:"22px 0 12px" }}>
        <div style={{ fontFamily:F.serif, fontSize:21, fontWeight:700, color:T.primaryDeep }}>
          Historial de controles
        </div>
        <div style={{ fontSize:12, color:T.muted, marginTop:2 }}>
          Tocá un control para ver las cantidades cargadas
        </div>
      </div>

      {/* Resumen */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:14 }}>
        <div style={{ background:T.card, borderRadius:14, padding:"14px 12px", textAlign:"center", boxShadow:T.shadowCard }}>
          <div style={{ fontFamily:F.serif, fontSize:28, fontWeight:700, color:T.primaryDeep }}>{inventarios.length}</div>
          <div style={{ fontSize:11, color:T.muted, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.5px" }}>Controles</div>
        </div>
        <div style={{ background:T.card, borderRadius:14, padding:"14px 12px", textAlign:"center", boxShadow:T.shadowCard }}>
          <div style={{ fontFamily:F.serif, fontSize:28, fontWeight:700, color:T.primaryDeep }}>{sucursalesUnicas.length}</div>
          <div style={{ fontSize:11, color:T.muted, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.5px" }}>Sucursales</div>
        </div>
      </div>

      {/* Filtros */}
      <div style={{ display:"flex", gap:8, marginBottom:14 }}>
        <select value={filtroSuc} onChange={e=>setFiltroSuc(e.target.value)} style={{ flex:1, padding:"9px 11px", borderRadius:12, border:`1.5px solid ${T.border}`, background:T.inputBg, fontSize:12, color:T.text, outline:"none", fontFamily:F.body }}>
          <option value="">Todas las sucursales</option>
          {sucursalesUnicas.map(s => <option key={s}>{s}</option>)}
        </select>
        <select value={filtroRubro} onChange={e=>setFiltroRubro(e.target.value)} style={{ flex:1, padding:"9px 11px", borderRadius:12, border:`1.5px solid ${T.border}`, background:T.inputBg, fontSize:12, color:T.text, outline:"none", fontFamily:F.body }}>
          <option value="">Todos los rubros</option>
          {rubrosUnicos.map(r => <option key={r}>{r}</option>)}
        </select>
      </div>

      {lista.length === 0 && <div style={{ textAlign:"center", color:T.muted, padding:32 }}>Sin controles de inventario todavía.</div>}

      {lista.map(inv => {
        const open = expandido === inv.id;
        const productos = inv.productos || {};
        const cantProductos = Object.keys(productos).length;
        // El borde marca que ESE control tuvo faltantes, que no es lo mismo que
        // la sección de arriba: ahí está el estado de hoy, acá el de ese día.
        const bajos = contarBajoMinimo(productos, porProducto);

        return (
          <div key={inv.id} style={{
            background:T.card, borderRadius:16, boxShadow:T.shadowList, marginBottom:10, overflow:"hidden",
            borderLeft: bajos > 0 ? `4px solid ${T.error}` : "4px solid transparent",
          }}>
            <div style={{ padding:"13px 16px", cursor:"pointer", display:"flex", justifyContent:"space-between", alignItems:"center", gap:10 }}
              onClick={() => setExpandido(open ? null : inv.id)}>
              <div style={{ minWidth:0 }}>
                <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:3 }}>
                  <span style={{ fontSize:13 }}>📍</span>
                  <span style={{ fontFamily:F.serif, fontSize:17, fontWeight:700, color:T.primaryDeep }}>
                    {inv.sucursalNombre}
                  </span>
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:6, fontSize:12, color:T.muted, marginLeft:20 }}>
                  <span style={{ fontSize:14 }}>{RUBRO_ICONOS[inv.rubro] || "📦"}</span>
                  <span style={{ fontWeight:600, color:T.text }}>{inv.rubro}</span>
                  <span>· {fmtFecha(inv.fecha)} · {cantProductos} productos</span>
                </div>
              </div>
              <span style={{ color:T.muted2, flexShrink:0 }}>{open ? "▲" : "▼"}</span>
            </div>

            {open && (
              <div style={{ borderTop:`1px solid ${T.divider}`, padding:"12px 16px", background:T.cardSoft }}>
                {Object.entries(productos).map(([prod, cant]) => {
                  const minimo = porProducto[prod];
                  const bajo = bajoMinimo(cant, minimo);
                  // El cero sigue en rojo aunque no tenga mínimo definido: es la
                  // señal que ya existía y no depende de que Ileana configure nada.
                  const cero = Number(cant) === 0;
                  const rojo = bajo || cero;

                  return (
                    <div key={prod} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:10, padding:"7px 0", borderBottom:`1px solid ${T.divider}` }}>
                      <span style={{ fontSize:13, color: rojo ? T.error : T.text, fontWeight: rojo ? 600 : 400, minWidth:0 }}>
                        {prod}
                      </span>
                      <span style={{ display:"flex", alignItems:"baseline", gap:6, flexShrink:0 }}>
                        <span style={{ fontFamily:F.serif, fontSize:16, fontWeight:700, color: rojo ? T.error : T.primaryDeep }}>
                          {fmtCantidad(cant)}
                        </span>
                        {minimo !== undefined && (
                          <span style={{ fontSize:11, color: bajo ? T.error : T.muted2, fontWeight: bajo ? 700 : 400 }}>
                            mín. {fmtCantidad(minimo)}
                          </span>
                        )}
                      </span>
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
}
