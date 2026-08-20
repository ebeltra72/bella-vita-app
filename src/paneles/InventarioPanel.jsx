import { useState, useEffect } from "react";
import { T, F } from "../theme";
import { RUBRO_ICONOS } from "../constants";
import { API } from "../api";
import { fmtFecha } from "../utils";
import MinimosPanel from "../stock/MinimosPanel";
import { bajoMinimo, contarBajoMinimo, fmtCantidad, indexarMinimos } from "../stock/datos";

const SUBTABS = [["controles","📋 Controles"],["minimos","🎯 Mínimos"]];

// ══════════════════════════════════════════════════════════════════════════════
// PANEL ILEANA – INVENTARIO
//
// Dos solapas sobre los mismos datos: el historial de controles y la
// configuración de mínimos que decide qué se pinta en rojo en ese historial. Los
// mínimos viven acá y no dentro de MinimosPanel para que editarlos repinte los
// controles al instante, sin recargar.
// ══════════════════════════════════════════════════════════════════════════════
export default function InventarioPanel() {
  const [vista, setVista] = useState("controles");
  const [inventarios, setInventarios] = useState([]);
  const [minimos, setMinimos] = useState([]);
  const [cargando, setCargando] = useState(true);
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

  const porProducto = indexarMinimos(minimos);

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

      {/* Resumen */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:16 }}>
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
        const bajos = contarBajoMinimo(productos, porProducto);

        return (
          <div key={inv.id} style={{
            background:T.card, borderRadius:16, boxShadow:T.shadowList, marginBottom:10, overflow:"hidden",
            borderLeft: bajos > 0 ? `4px solid ${T.error}` : "4px solid transparent",
          }}>
            <div style={{ padding:"13px 16px", cursor:"pointer", display:"flex", justifyContent:"space-between", alignItems:"center" }}
              onClick={() => setExpandido(open ? null : inv.id)}>
              <div>
                <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:2 }}>
                  <span style={{ fontSize:16 }}>{RUBRO_ICONOS[inv.rubro] || "📦"}</span>
                  <span style={{ fontWeight:700, fontSize:14, color:T.text }}>{inv.rubro}</span>
                </div>
                <div style={{ fontSize:12, color:T.muted }}>
                  {inv.sucursalNombre} · {fmtFecha(inv.fecha)} · {cantProductos} productos
                </div>
                {bajos > 0 && (
                  <div style={{ fontSize:12, color:T.error, fontWeight:700, marginTop:3 }}>
                    ⚠ {bajos} bajo mínimo
                  </div>
                )}
              </div>
              <span style={{ color:T.muted2 }}>{open ? "▲" : "▼"}</span>
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
