import { useState, useEffect } from "react";
import { T, F } from "../theme";
import { API } from "../api";
import { fmtFecha, fmtHora, mesActual } from "../utils";
import { cumplimientoPlan, nombreMes } from "../plan/datos";
import { Badge, Card } from "../ui";
import {
  ESTADO_FILA, DIAS_VISITA_RECIENTE,
  alertas as calcularAlertas, filasSucursales, resumenSemanal,
} from "./datos";

const colorDe = (badge) =>
  badge === "sage" ? T.sage : badge === "amber" ? T.amber : badge === "error" ? T.error : T.muted;
const fondoDe = (badge) =>
  badge === "sage" ? T.sageBg : badge === "amber" ? T.amberBg : badge === "error" ? T.errorBg : T.cardSoft;

// "hace 3 días" / "ayer" / "hoy"
const textoAntiguedad = (dias) =>
  dias === null ? "nunca" : dias === 0 ? "hoy" : dias === 1 ? "ayer" : `hace ${dias} días`;

// ─── Resumen semanal ─────────────────────────────────────────────────────────
function ResumenSemanal({ resumen }) {
  const completo = resumen.visitadas === resumen.total;
  const tiles = [
    { label:"Visitadas", valor:`${resumen.visitadas}/${resumen.total}`,
      color: completo ? T.sage : T.primaryDeep, pie:"esta semana" },
    { label:"Abiertos", valor:resumen.abiertos,
      color: resumen.abiertos > 0 ? T.primaryDeep : T.sage, pie:"pendientes" },
    { label:"Vencidos", valor:resumen.vencidos,
      color: resumen.vencidos > 0 ? T.error : T.sage, pie:"pendientes" },
  ];

  return (
    <Card>
      <div style={{ fontFamily:F.serif, fontSize:21, fontWeight:700, color:T.primaryDeep, marginBottom:3 }}>
        Resumen de la semana
      </div>
      <div style={{ fontSize:12, color:T.muted, marginBottom:14 }}>
        Desde el lunes {fmtFecha(resumen.desde)}
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8 }}>
        {tiles.map(t => (
          <div key={t.label} style={{ background:T.cardSoft, borderRadius:13, padding:"14px 6px", textAlign:"center" }}>
            <div style={{ fontFamily:F.serif, fontSize:26, fontWeight:700, color:t.color, lineHeight:1 }}>
              {t.valor}
            </div>
            <div style={{ fontSize:11, color:T.text, fontWeight:600, marginTop:5 }}>{t.label}</div>
            <div style={{ fontSize:10, color:T.muted2 }}>{t.pie}</div>
          </div>
        ))}
      </div>

      <div style={{ fontSize:11, color:T.muted, marginTop:12, textAlign:"center" }}>
        {resumen.ultimoCheckin
          ? `Último check-in: ${fmtFecha(resumen.ultimoCheckin)} a las ${fmtHora(resumen.ultimoCheckin)}`
          : "Todavía no hay check-ins registrados"}
      </div>
    </Card>
  );
}

// ─── Alertas ─────────────────────────────────────────────────────────────────
function Alertas({ alertas, hayStock }) {
  // El "todo al día" mira también el stock: sin esto quedaría un cartel verde
  // justo encima del bloque rojo de productos bajo mínimo.
  if (alertas.length === 0 && !hayStock) return (
    <Card style={{ background:T.sageBg, border:`1px solid ${T.sage}33` }}>
      <div style={{ display:"flex", alignItems:"center", gap:9 }}>
        <span style={{ fontSize:20 }}>✨</span>
        <div>
          <div style={{ fontSize:14, fontWeight:700, color:T.sage }}>Todo al día</div>
          <div style={{ fontSize:12, color:T.muted }}>
            Sin pendientes vencidos y todas las sucursales visitadas en los últimos {DIAS_VISITA_RECIENTE} días.
          </div>
        </div>
      </div>
    </Card>
  );

  if (alertas.length === 0) return null;

  return (
    <>
      {alertas.map(a => {
        const color = colorDe(a.severidad);
        const titulo = a.tipo === "vencidos"
          ? `${a.total} ${a.total === 1 ? "pendiente vencido" : "pendientes vencidos"}`
          : `${a.total} ${a.total === 1 ? "sucursal sin visitar" : "sucursales sin visitar"} hace más de ${DIAS_VISITA_RECIENTE} días`;

        return (
          <Card key={a.tipo} style={{ background:fondoDe(a.severidad), border:`1px solid ${color}44` }}>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:9 }}>
              <span style={{ fontSize:17 }}>{a.icono}</span>
              <span style={{ fontSize:14, fontWeight:700, color }}>{titulo}</span>
            </div>
            <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
              {a.sucursales.map(s => (
                <span key={s.nombre} style={{
                  background:T.white, borderRadius:20, padding:"4px 11px",
                  fontSize:12, color:T.text, fontWeight:600,
                }}>
                  {s.nombre}
                  <span style={{ color, marginLeft:5 }}>
                    {a.tipo === "vencidos" ? s.dato : textoAntiguedad(s.dato)}
                  </span>
                </span>
              ))}
            </div>
          </Card>
        );
      })}
    </>
  );
}

// ─── Alertas de stock ────────────────────────────────────────────────────────
// Un resumen por sucursal, sin detalle de productos: el Dashboard responde
// "¿dónde hay que mirar?" y el detalle vive en la pestaña Stock, que además
// permite bajar a la sucursal. Con mínimos definidos en todo el catálogo, el
// listado completo eran cincuenta filas que tapaban el resto del tablero.
//
// Las alertas se derivan del GET de inventarios: no hay tabla ni botón de
// resolver, una alerta desaparece cuando el control siguiente muestra el
// producto repuesto.
function AlertasStock({ alertas, hayMinimos }) {
  // Sin mínimos definidos no hay nada que afirmar: ni que falta stock ni que
  // está todo bien. El bloque no aparece hasta que haya algo configurado.
  if (!hayMinimos) return null;

  if (alertas.length === 0) return (
    <Card style={{ background:T.sageBg, border:`1px solid ${T.sage}33` }}>
      <div style={{ display:"flex", alignItems:"center", gap:9 }}>
        <span style={{ fontSize:20 }}>✓</span>
        <div style={{ fontSize:14, fontWeight:700, color:T.sage }}>
          Todo el stock sobre mínimo
        </div>
      </div>
    </Card>
  );

  // Las alertas ya vienen ordenadas del servidor; acá el orden es por cantidad
  // de faltantes, que es lo único que muestra esta vista.
  const porSucursal = [];
  for (const a of alertas) {
    let g = porSucursal.find(x => String(x.sucursalId) === String(a.sucursalId));
    if (!g) { g = { sucursalId: a.sucursalId, sucursalNombre: a.sucursalNombre, total: 0 }; porSucursal.push(g); }
    g.total++;
  }
  porSucursal.sort((a, b) =>
    b.total - a.total || a.sucursalNombre.localeCompare(b.sucursalNombre, "es"));

  return (
    <Card style={{ background:T.errorBg, border:`1px solid ${T.error}44` }}>
      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10 }}>
        <span style={{ fontSize:17 }}>📦</span>
        <span style={{ fontSize:14, fontWeight:700, color:T.error }}>
          Stock bajo mínimo en {porSucursal.length} {porSucursal.length === 1 ? "sucursal" : "sucursales"}
        </span>
      </div>

      <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
        {porSucursal.map(g => (
          <div key={g.sucursalId} style={{
            display:"flex", alignItems:"center", justifyContent:"space-between", gap:10,
            background:T.white, borderRadius:12, padding:"10px 12px",
          }}>
            <span style={{ fontSize:13, fontWeight:700, color:T.text, minWidth:0 }}>
              {g.sucursalNombre}
            </span>
            <span style={{ fontSize:12, fontWeight:700, color:T.error, whiteSpace:"nowrap", flexShrink:0 }}>
              {g.total} {g.total === 1 ? "producto bajo mínimo" : "productos bajo mínimo"}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ─── Cumplimiento del plan ───────────────────────────────────────────────────
// Sólo aparece cuando el mes en curso tiene un plan cargado. El cálculo viene
// de src/plan/datos.js: una sola definición de "cumplido" en todo el sistema.
function CumplimientoPlan({ cumpl }) {
  const color = cumpl.pct >= 80 ? T.sage : cumpl.pct >= 50 ? T.amber : T.error;
  return (
    <Card>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:9 }}>
        <div>
          <div style={{ fontSize:13, fontWeight:600, color:T.text }}>Cumplimiento del plan</div>
          <div style={{ fontSize:11, color:T.muted, textTransform:"capitalize" }}>{nombreMes(mesActual())}</div>
        </div>
        <span style={{ fontFamily:F.serif, fontSize:26, fontWeight:700, color }}>{cumpl.pct}%</span>
      </div>
      <div style={{ background:T.divider, borderRadius:99, height:8, overflow:"hidden" }}>
        <div style={{ height:"100%", borderRadius:99, width:`${cumpl.pct}%`, background:color, transition:"width .3s" }}/>
      </div>
      <div style={{ fontSize:11, color:T.muted, marginTop:6, display:"flex", flexWrap:"wrap", gap:10 }}>
        <span>{cumpl.realizadas} de {cumpl.total} recorridas</span>
        {cumpl.incumplidas > 0 && <span style={{ color:T.error, fontWeight:600 }}>{cumpl.incumplidas} incumplidas</span>}
        {cumpl.reprogramadas > 0 && <span style={{ color:T.amber }}>{cumpl.reprogramadas} reprogramadas</span>}
      </div>
    </Card>
  );
}

// ─── Tabla semáforo ──────────────────────────────────────────────────────────
function TablaSemaforo({ filas, onVerSucursal }) {
  return (
    <Card style={{ padding:0, overflow:"hidden" }}>
      <div style={{ padding:"14px 16px 10px" }}>
        <div style={{ fontFamily:F.serif, fontSize:19, fontWeight:700, color:T.primaryDeep }}>
          Estado por sucursal
        </div>
        <div style={{ fontSize:11, color:T.muted, marginTop:2 }}>
          Tocá una fila para ver sus visitas
        </div>
      </div>

      {/* Encabezado de columnas */}
      <div style={{
        display:"flex", alignItems:"center", gap:8, padding:"7px 16px",
        background:T.cardSoft, borderTop:`1px solid ${T.divider}`, borderBottom:`1px solid ${T.divider}`,
        fontSize:10, fontWeight:700, color:T.muted2, textTransform:"uppercase", letterSpacing:"0.5px",
      }}>
        <span style={{ flex:1 }}>Sucursal</span>
        <span style={{ width:44, textAlign:"center" }}>Abier.</span>
        <span style={{ width:44, textAlign:"center" }}>Venc.</span>
        <span style={{ width:10 }}/>
      </div>

      {filas.map(f => {
        const est = ESTADO_FILA[f.estado];
        return (
          <div
            key={f.sucursal.id}
            onClick={() => onVerSucursal?.(f.sucursal.nombre)}
            style={{
              display:"flex", alignItems:"center", gap:8, padding:"12px 16px",
              borderBottom:`1px solid ${T.divider}`, cursor:"pointer",
              borderLeft: f.vencidos > 0 ? `4px solid ${T.error}` : "4px solid transparent",
            }}
          >
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ display:"flex", alignItems:"center", gap:7 }}>
                <span style={{ fontSize:14 }} title={est?.label}>{est?.icono}</span>
                <span style={{ fontWeight:700, fontSize:14, color:T.text }}>{f.sucursal.nombre}</span>
              </div>
              <div style={{ fontSize:11, marginTop:3, marginLeft:21, display:"flex", flexWrap:"wrap", gap:6 }}>
                <span style={{ color: f.desactualizada ? T.error : T.muted, fontWeight: f.desactualizada ? 700 : 400 }}>
                  {f.ultimaVisita ? `${fmtFecha(f.ultimaVisita)} · ${textoAntiguedad(f.dias)}` : "Sin visitas registradas"}
                </span>
                {f.estado === "sin_cierre" && (
                  <span style={{ color:T.muted2 }}>· sin cierre estructurado</span>
                )}
              </div>
            </div>

            <div style={{ width:44, textAlign:"center" }}>
              <span style={{
                fontFamily:F.serif, fontSize:18, fontWeight:700,
                color: f.abiertos > 0 ? T.primaryDeep : T.muted2,
              }}>{f.abiertos}</span>
            </div>
            <div style={{ width:44, textAlign:"center" }}>
              <span style={{
                fontFamily:F.serif, fontSize:18, fontWeight:700,
                color: f.vencidos > 0 ? T.error : T.muted2,
              }}>{f.vencidos}</span>
            </div>
            <span style={{ width:10, color:T.muted2, fontSize:13 }}>›</span>
          </div>
        );
      })}

      {/* Referencia de estados */}
      <div style={{ padding:"11px 16px", display:"flex", flexWrap:"wrap", gap:10 }}>
        {Object.values(ESTADO_FILA).map(e => (
          <span key={e.label} style={{ fontSize:10, color:T.muted, display:"flex", alignItems:"center", gap:4 }}>
            {e.icono} {e.label}
          </span>
        ))}
      </div>
    </Card>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// PANEL ILEANA – DASHBOARD
// ══════════════════════════════════════════════════════════════════════════════
export default function DashboardPanel({ sucursales = [], visitas = [], onVerSucursal }) {
  const [pendientes, setPendientes] = useState([]);
  const [recorridas, setRecorridas] = useState([]);
  const [alertasStock, setAlertasStock] = useState([]);
  // Los mínimos sólo se usan para saber si hay algo configurado: sin ninguno,
  // el bloque de stock no dice nada y no se muestra.
  const [hayMinimos, setHayMinimos] = useState(false);
  const [stockOk, setStockOk] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  // Sólo los activos: los conteos del dashboard nunca miran cerrados, y así el
  // LIMIT 500 de la function tarda muchísimo más en afectar los números.
  useEffect(() => {
    let vigente = true;
    API.getPendientes({ estado: "activos" })
      .then(rows => { if (vigente) { setPendientes(rows); setError(null); } })
      .catch(e => { if (vigente) setError(e.message || "No se pudieron cargar los pendientes"); })
      .finally(() => { if (vigente) setCargando(false); });
    return () => { vigente = false; };
  }, []);

  // Plan del mes en curso, para el cumplimiento. Si falla o no hay plan, el
  // bloque no se muestra y el resto del dashboard funciona igual.
  useEffect(() => {
    let vigente = true;
    API.getRecorridas(mesActual())
      .then(rs => { if (vigente) setRecorridas(rs); })
      .catch(() => { if (vigente) setRecorridas([]); });
    return () => { vigente = false; };
  }, []);

  // Alertas de stock: producto por debajo del mínimo en el último control de su
  // sucursal. Si falla o no hay mínimos definidos, el bloque no se muestra y el
  // resto del dashboard funciona igual.
  useEffect(() => {
    let vigente = true;
    // Si cualquiera de las dos falla, stockOk queda en false y el bloque no se
    // muestra: un "todo el stock sobre mínimo" que en realidad es "no se pudo
    // calcular" sería la única parte del tablero que miente en verde.
    Promise.all([API.getAlertasStock(), API.getMinimos()])
      .then(([rows, minimos]) => {
        if (!vigente) return;
        setAlertasStock(rows);
        setHayMinimos(minimos.length > 0);
        setStockOk(true);
      })
      .catch(() => {
        if (!vigente) return;
        setAlertasStock([]); setHayMinimos(false); setStockOk(false);
      });
    return () => { vigente = false; };
  }, []);

  if (cargando) return <div style={{ textAlign:"center", padding:40, color:T.muted }}>Cargando…</div>;

  const filas = filasSucursales(sucursales, visitas, pendientes);
  const resumen = resumenSemanal(sucursales, visitas, pendientes);
  const avisos = calcularAlertas(filas);
  const cumpl = cumplimientoPlan(recorridas);

  return (
    <div style={{ padding:"18px 16px" }}>
      {error && (
        <div style={{ background:T.errorBg, color:T.error, borderRadius:12, padding:"12px 14px", fontSize:13, marginBottom:12 }}>
          ⚠ {error}. Los conteos de pendientes pueden estar incompletos.
        </div>
      )}

      <Alertas alertas={avisos} hayStock={alertasStock.length > 0}/>
      {stockOk && <AlertasStock alertas={alertasStock} hayMinimos={hayMinimos}/>}
      <ResumenSemanal resumen={resumen}/>
      {cumpl.hayPlan && <CumplimientoPlan cumpl={cumpl}/>}
      <TablaSemaforo filas={filas} onVerSucursal={onVerSucursal}/>
    </div>
  );
}
