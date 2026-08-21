import { useState, useEffect } from "react";
import { T, F } from "../theme";
import { RUBRO_NIZA } from "../constants";
import { API } from "../api";
import { fmtFecha, mesActual } from "../utils";
import { valorDe } from "../encuesta/schema";
import { Badge, Card, Input } from "../ui";

// La 17 de las 18 preguntas: "¿El personal ofrece los productos Niza a los
// pacientes?". Sí / No / No aplica, con observación obligatoria si es No.
const PREGUNTA_OFRECE = "nz_3";

const COLOR_RESPUESTA = { "Sí": T.sage, "No": T.error, "No aplica": T.muted2 };

// ══════════════════════════════════════════════════════════════════════════════
// PANEL ILEANA – NIZA
//
// Niza Científica es un laboratorio que Bella Vita compra y revende, así que la
// línea se mide distinto que el resto del stock: importa lo que se vendió, no lo
// que se consumió. Tres preguntas, tres secciones:
//
//   VENTAS       qué se vendió y dónde                    → niza_ventas
//   STOCK        qué hay hoy en cada sucursal             → inventarios
//   OFRECIMIENTO si el personal efectivamente los ofrece  → encuesta, nz_3
//
// El ofrecimiento no pide nada al servidor: App ya tiene todas las visitas en
// memoria y las pasa como prop, igual que al Dashboard.
// ══════════════════════════════════════════════════════════════════════════════
export default function NizaPanel({ visitas = [] }) {
  const [mes, setMes] = useState(mesActual);
  const [resumen, setResumen] = useState([]);
  const [stock, setStock] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [expandido, setExpandido] = useState(null);

  useEffect(() => {
    let vigente = true;
    setCargando(true); setError(null); setExpandido(null);
    API.getResumenNiza(mes)
      .then(rs => { if (vigente) setResumen(rs); })
      .catch(e => { if (vigente) { setError(e.message || "No se pudieron cargar las ventas"); setResumen([]); } })
      .finally(() => { if (vigente) setCargando(false); });
    return () => { vigente = false; };
  }, [mes]);

  // El stock no depende del mes: es el último control de cada sucursal, sea
  // cuando sea. Por eso va en su propio efecto y se pide una sola vez.
  useEffect(() => {
    API.getInventarios()
      .then(rows => {
        const nizas = rows.filter(r => r.rubro === RUBRO_NIZA);
        // Uno por sucursal, el más reciente
        const ultimos = [];
        for (const r of nizas.sort((a, b) => (b.fecha || "").localeCompare(a.fecha || ""))) {
          if (ultimos.some(x => String(x.sucursal_id) === String(r.sucursal_id))) continue;
          ultimos.push(r);
        }
        setStock(ultimos);
      })
      .catch(() => setStock([]));
  }, []);

  const totalUnidades = resumen.reduce((a, p) => a + p.unidades, 0);

  // ─── OFRECIMIENTO ──────────────────────────────────────────────────────────
  // Se cuenta una respuesta por visita del mes que tenga la pregunta contestada.
  // Las visitas v1 no tienen la encuesta estructurada, así que quedan afuera.
  const ofrecimiento = [];
  for (const v of visitas) {
    if (!v.checkin?.startsWith(mes)) continue;
    const valor = valorDe(v.respuestas, PREGUNTA_OFRECE);
    if (!valor) continue;

    let g = ofrecimiento.find(x => x.sucursal === v.sucursalNombre);
    if (!g) { g = { sucursal: v.sucursalNombre, total: 0, si: 0, no: 0, naplica: 0, observaciones: [] }; ofrecimiento.push(g); }
    g.total++;
    if (valor === "Sí") g.si++;
    else if (valor === "No") {
      g.no++;
      const obs = v.respuestas?.[PREGUNTA_OFRECE]?.observacion;
      if (obs) g.observaciones.push({ fecha: v.checkin, texto: obs });
    } else g.naplica++;
  }
  // Las que más veces contestaron que no, primero: es el punto a atacar
  ofrecimiento.sort((a, b) => b.no - a.no || a.sucursal.localeCompare(b.sucursal, "es"));

  const Titulo = ({ children, pie }) => (
    <div style={{ margin:"22px 0 12px" }}>
      <div style={{ fontFamily:F.serif, fontSize:21, fontWeight:700, color:T.primaryDeep }}>{children}</div>
      {pie && <div style={{ fontSize:12, color:T.muted, marginTop:2 }}>{pie}</div>}
    </div>
  );

  return (
    <div style={{ padding:"18px 16px" }}>
      <div style={{ marginBottom:6 }}>
        <Input type="month" value={mes} onChange={e => setMes(e.target.value)}/>
      </div>

      {error && (
        <Card style={{ background:T.errorBg, border:`1px solid ${T.error}` }}>
          <div style={{ fontSize:13, color:T.error, lineHeight:1.5 }}>⚠ {error}</div>
        </Card>
      )}

      {/* ─── VENTAS ────────────────────────────────────────────────────────── */}
      <Titulo pie="Tocá un producto para ver el desglose por sucursal">💰 Ventas del mes</Titulo>

      <div style={{ background:`linear-gradient(135deg, ${T.primary}, ${T.primaryDeep})`, borderRadius:18, padding:"24px 20px", textAlign:"center", color:T.white, marginBottom:12, boxShadow:T.shadowBtn }}>
        <div style={{ fontFamily:F.serif, fontSize:42, fontWeight:700, lineHeight:1 }}>{totalUnidades}</div>
        <div style={{ fontSize:14, opacity:.85, marginTop:4 }}>
          {totalUnidades === 1 ? "unidad vendida" : "unidades vendidas"}
          {resumen.length > 0 && ` · ${resumen.length} ${resumen.length === 1 ? "producto" : "productos"}`}
        </div>
      </div>

      {cargando && <div style={{ textAlign:"center", color:T.muted, padding:24 }}>Cargando ventas…</div>}

      {!cargando && resumen.length === 0 && (
        <Card style={{ textAlign:"center", padding:"28px 20px" }}>
          <div style={{ fontSize:13, color:T.muted, lineHeight:1.5 }}>
            Sin ventas de Niza cargadas en este mes.
          </div>
        </Card>
      )}

      {!cargando && resumen.map(p => {
        const open = expandido === p.producto;
        const pct = totalUnidades > 0 ? Math.round((p.unidades / totalUnidades) * 100) : 0;

        return (
          <div key={p.producto} style={{ background:T.card, borderRadius:16, boxShadow:T.shadowList, marginBottom:8, overflow:"hidden" }}>
            <div
              onClick={() => setExpandido(open ? null : p.producto)}
              style={{ padding:"12px 15px", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"space-between", gap:10 }}
            >
              <div style={{ minWidth:0 }}>
                <div style={{ fontSize:14, fontWeight:600, color:T.text }}>{p.producto}</div>
                <div style={{ fontSize:11, color:T.muted, marginTop:2 }}>
                  {p.sucursales.length} {p.sucursales.length === 1 ? "sucursal" : "sucursales"} · {pct}% del total
                </div>
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:10, flexShrink:0 }}>
                <span style={{ fontFamily:F.serif, fontSize:20, fontWeight:700, color:T.primaryDeep }}>
                  {p.unidades}
                </span>
                <span style={{ color:T.muted2, fontSize:13 }}>{open ? "▲" : "▼"}</span>
              </div>
            </div>

            {open && (
              <div style={{ borderTop:`1px solid ${T.divider}`, padding:"10px 15px", background:T.cardSoft }}>
                {p.sucursales.map(s => (
                  <div key={s.sucursalId} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"6px 0" }}>
                    <span style={{ fontSize:13, color:T.text }}>📍 {s.sucursalNombre}</span>
                    <span style={{ fontFamily:F.serif, fontSize:15, fontWeight:700, color:T.primaryDeep }}>{s.unidades}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {/* ─── STOCK ─────────────────────────────────────────────────────────── */}
      <Titulo pie="Último control de inventario de la línea en cada sucursal">📦 Stock disponible</Titulo>

      {stock.length === 0 ? (
        <Card style={{ background:T.amberBg, border:`1px solid ${T.amber}44` }}>
          <div style={{ fontSize:13, color:T.text, lineHeight:1.55 }}>
            <strong style={{ color:T.amber }}>Todavía no hay controles de inventario de Niza.</strong>
            <div style={{ marginTop:6, color:T.muted }}>
              El control semanal rota entre General, Depilación, Médico y Limpiezas
              y masajes: la línea Niza no está en esa rotación, así que ningún
              control la incluye. La señal más cercana hoy es la pregunta 16 de la
              encuesta, "¿Hay stock suficiente de la línea Niza?".
            </div>
          </div>
        </Card>
      ) : (
        stock.map(inv => {
          const productos = inv.productos || {};
          return (
            <Card key={inv.id}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom:10 }}>
                <span style={{ fontFamily:F.serif, fontSize:17, fontWeight:700, color:T.primaryDeep }}>
                  📍 {inv.sucursal_nombre}
                </span>
                <span style={{ fontSize:11, color:T.muted }}>{fmtFecha(inv.fecha?.slice(0, 10))}</span>
              </div>
              {Object.entries(productos).map(([prod, cant]) => (
                <div key={prod} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"6px 0", borderTop:`1px solid ${T.divider}` }}>
                  <span style={{ fontSize:13, color:T.text }}>{prod}</span>
                  <span style={{ fontFamily:F.serif, fontSize:15, fontWeight:700, color: Number(cant) === 0 ? T.error : T.primaryDeep }}>
                    {cant}
                  </span>
                </div>
              ))}
            </Card>
          );
        })
      )}

      {/* ─── OFRECIMIENTO ──────────────────────────────────────────────────── */}
      <Titulo pie="¿El personal ofrece los productos Niza a los pacientes?">
        🗣 Ofrecimiento
      </Titulo>

      {ofrecimiento.length === 0 ? (
        <Card style={{ textAlign:"center", padding:"28px 20px" }}>
          <div style={{ fontSize:13, color:T.muted, lineHeight:1.5 }}>
            Ninguna visita de este mes respondió la pregunta.
          </div>
        </Card>
      ) : (
        ofrecimiento.map(g => (
          <Card key={g.sucursal} style={g.no > 0 ? { borderLeft:`4px solid ${T.error}` } : undefined}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", gap:10, marginBottom:9 }}>
              <span style={{ fontFamily:F.serif, fontSize:17, fontWeight:700, color: g.no > 0 ? T.error : T.primaryDeep }}>
                {g.sucursal}
              </span>
              <span style={{ fontSize:11, color:T.muted, whiteSpace:"nowrap" }}>
                {g.total} {g.total === 1 ? "visita" : "visitas"}
              </span>
            </div>

            <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
              {[["Sí", g.si], ["No", g.no], ["No aplica", g.naplica]]
                .filter(([, n]) => n > 0)
                .map(([label, n]) => (
                  <span key={label} style={{
                    background:T.white, borderRadius:20, padding:"4px 11px",
                    fontSize:12, color:T.text, fontWeight:600,
                  }}>
                    {label}
                    <span style={{ color:COLOR_RESPUESTA[label], marginLeft:5 }}>{n}</span>
                  </span>
                ))}
            </div>

            {g.observaciones.length > 0 && (
              <div style={{ marginTop:10, borderTop:`1px solid ${T.divider}`, paddingTop:9 }}>
                {g.observaciones.map((o, i) => (
                  <div key={i} style={{ fontSize:12, color:T.muted, lineHeight:1.5, marginBottom:5 }}>
                    <span style={{ color:T.muted2 }}>{fmtFecha(o.fecha)} · </span>{o.texto}
                  </div>
                ))}
              </div>
            )}
          </Card>
        ))
      )}
    </div>
  );
}
