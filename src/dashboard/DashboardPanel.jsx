import { useState, useEffect } from "react";
import { T, F } from "../theme";
import { API } from "../api";
import { fmtFecha, fmtHora } from "../utils";
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
function Alertas({ alertas }) {
  if (alertas.length === 0) return (
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

  if (cargando) return <div style={{ textAlign:"center", padding:40, color:T.muted }}>Cargando…</div>;

  const filas = filasSucursales(sucursales, visitas, pendientes);
  const resumen = resumenSemanal(sucursales, visitas, pendientes);
  const avisos = calcularAlertas(filas);

  return (
    <div style={{ padding:"18px 16px" }}>
      {error && (
        <div style={{ background:T.errorBg, color:T.error, borderRadius:12, padding:"12px 14px", fontSize:13, marginBottom:12 }}>
          ⚠ {error}. Los conteos de pendientes pueden estar incompletos.
        </div>
      )}

      <Alertas alertas={avisos}/>
      <ResumenSemanal resumen={resumen}/>
      <TablaSemaforo filas={filas} onVerSucursal={onVerSucursal}/>
    </div>
  );
}
