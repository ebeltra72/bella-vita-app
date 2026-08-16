import { useState, useEffect } from "react";
import { T, F } from "../theme";
import { ESTADO_DERIVADO, FRANJAS, opcion } from "../constants";
import { API } from "../api";
import { fmtFecha, mesActual } from "../utils";
import { Badge, Btn, BtnSm, Card, Label } from "../ui";
import ArmarPlan from "./ArmarPlan";
import {
  agruparPorSemana, coberturaReal, cumplimientoPlan, esHoy,
  estadoDerivado, mesAnterior, mesSiguiente, nombreMes,
} from "./datos";

const diaCorto = (fecha) =>
  new Date(`${fecha}T00:00:00`).toLocaleDateString("es-AR", { weekday:"short", day:"numeric" });

// ─── Una recorrida de la agenda ──────────────────────────────────────────────
function Fila({ recorrida, onIniciar }) {
  const fr = opcion(FRANJAS, recorrida.franja);
  const derivado = estadoDerivado(recorrida);
  const est = ESTADO_DERIVADO[derivado];
  const hoy = esHoy(recorrida) && derivado === "pendiente";

  return (
    <div style={{
      padding:"11px 14px", borderBottom:`1px solid ${T.divider}`,
      background: hoy ? T.activeSoft : "transparent",
      borderLeft: derivado === "incumplida" ? `3px solid ${T.error}` : "3px solid transparent",
    }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:8 }}>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:"flex", alignItems:"center", gap:7, flexWrap:"wrap" }}>
            <span style={{ fontSize:12, fontWeight:700, color:T.primaryDeep, textTransform:"capitalize" }}>
              {diaCorto(recorrida.fechaPlan)}
            </span>
            <span style={{ fontWeight:700, fontSize:14, color:T.text }}>{recorrida.sucursalNombre}</span>
            {hoy && <Badge color="terr">hoy</Badge>}
          </div>
          <div style={{ fontSize:11, color:T.muted, marginTop:3 }}>
            {fr?.icono} {fr?.label}
            {recorrida.fechaPlanOriginal && (
              <span style={{ color:T.amber }}>
                {" · "}reprogramada del {fmtFecha(`${recorrida.fechaPlanOriginal}T00:00:00`)}
              </span>
            )}
          </div>
          {recorrida.motivoReprogramacion && (
            <div style={{ fontSize:11, color:T.muted, marginTop:3, fontStyle:"italic" }}>
              "{recorrida.motivoReprogramacion}"
            </div>
          )}
        </div>
        <Badge color={est.badge}>{est.icono} {est.label}</Badge>
      </div>

      {hoy && (
        <Btn onClick={() => onIniciar(recorrida)} style={{ marginTop:10, padding:"10px" }}>
          📍 Iniciar visita
        </Btn>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MIS RECORRIDAS — vista de Adrián
// ══════════════════════════════════════════════════════════════════════════════
export default function MisRecorridas({ sucursales = [], visitas = [], onIniciarVisita }) {
  const [mes, setMes] = useState(mesActual);
  const [recorridas, setRecorridas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [armando, setArmando] = useState(false);

  const cargar = (m = mes) => {
    setCargando(true); setError(null);
    API.getRecorridas(m)
      .then(setRecorridas)
      .catch(e => { setError(e.message || "No se pudo cargar el plan"); setRecorridas([]); })
      .finally(() => setCargando(false));
  };

  useEffect(() => { cargar(mes); }, [mes]);

  if (armando) return (
    <ArmarPlan
      mes={mes}
      sucursales={sucursales}
      existentes={recorridas}
      onListo={() => { setArmando(false); cargar(mes); }}
      onCancelar={() => setArmando(false)}
    />
  );

  const real = coberturaReal(sucursales, visitas, mes);
  const cumpl = cumplimientoPlan(recorridas);
  const semanas = agruparPorSemana(recorridas);

  const NavMes = () => (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:8, marginBottom:12 }}>
      <BtnSm variant="ghost" onClick={() => setMes(mesAnterior(mes))}>‹</BtnSm>
      <span style={{ fontFamily:F.serif, fontSize:19, fontWeight:700, color:T.primaryDeep, textTransform:"capitalize" }}>
        {nombreMes(mes)}
      </span>
      <BtnSm variant="ghost" onClick={() => setMes(mesSiguiente(mes))}>›</BtnSm>
    </div>
  );

  return (
    <div>
      <NavMes/>

      {/* Cobertura del mes: lo que realmente se visitó */}
      <Card>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
          <span style={{ fontSize:13, fontWeight:600, color:T.text }}>Cobertura del mes</span>
          <span style={{ fontFamily:F.serif, fontSize:20, fontWeight:700, color: real.visitadas === real.total ? T.sage : T.primaryDeep }}>
            {real.visitadas}/{real.total}
          </span>
        </div>
        <div style={{ background:T.divider, borderRadius:99, height:8, overflow:"hidden" }}>
          <div style={{
            height:"100%", borderRadius:99,
            width:`${real.total > 0 ? (real.visitadas / real.total) * 100 : 0}%`,
            background: real.visitadas === real.total ? T.sage : T.primary,
            transition:"width .3s",
          }}/>
        </div>
        <div style={{ fontSize:11, color:T.muted, marginTop:6 }}>
          Sucursales con al menos una visita realizada
          {cumpl.hayPlan && ` · plan cumplido al ${cumpl.pct}% (${cumpl.realizadas}/${cumpl.total})`}
        </div>
      </Card>

      {error && (
        <div style={{ background:T.errorBg, color:T.error, borderRadius:12, padding:"12px 14px", fontSize:13, marginBottom:12 }}>
          ⚠ {error}
        </div>
      )}

      {cargando && <div style={{ textAlign:"center", padding:32, color:T.muted }}>Cargando plan…</div>}

      {/* Mes sin plan */}
      {!cargando && recorridas.length === 0 && (
        <Card style={{ textAlign:"center", padding:"32px 20px" }}>
          <div style={{ fontSize:34, marginBottom:10 }}>🗓</div>
          <div style={{ fontFamily:F.serif, fontSize:19, fontWeight:700, color:T.primaryDeep, marginBottom:6 }}>
            Sin plan para {nombreMes(mes)}
          </div>
          <div style={{ fontSize:13, color:T.muted, marginBottom:18, lineHeight:1.5 }}>
            Podés seguir registrando visitas sin plan. Armarlo sirve para saber
            qué falta cubrir.
          </div>
          <Btn onClick={() => setArmando(true)}>Armar plan de {nombreMes(mes)}</Btn>
        </Card>
      )}

      {/* Agenda por semana */}
      {!cargando && semanas.map(sem => (
        <Card key={sem.clave} style={{ padding:0, overflow:"hidden" }}>
          <div style={{
            padding:"10px 14px", background: sem.esActual ? T.activeSoft : T.cardSoft,
            display:"flex", justifyContent:"space-between", alignItems:"center",
          }}>
            <span style={{ fontSize:12, fontWeight:700, color:T.primaryDeep }}>
              {fmtFecha(`${sem.inicio}T00:00:00`)} — {fmtFecha(`${sem.fin}T00:00:00`)}
            </span>
            <span style={{ fontSize:11, color:T.muted, fontWeight:600 }}>
              {sem.esActual ? "esta semana" : `${sem.recorridas.length} recorridas`}
            </span>
          </div>
          {sem.recorridas.map(r => (
            <Fila key={r.id} recorrida={r} onIniciar={onIniciarVisita}/>
          ))}
        </Card>
      ))}

      {!cargando && recorridas.length > 0 && (
        <Btn variant="ghost" onClick={() => setArmando(true)}>+ Agregar recorridas a {nombreMes(mes)}</Btn>
      )}
    </div>
  );
}
