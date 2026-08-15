import { useState } from "react";
import { T, F } from "../theme";
import { RADIO_ACEPTADO_M } from "../constants";
import { API } from "../api";
import { distanciaM, fmtHora, fmtFecha, useGPS } from "../utils";
import { Badge, Btn, Card, Label, Select, FotoUploader } from "../ui";
import InventarioForm from "./InventarioForm";

// ══════════════════════════════════════════════════════════════════════════════
// VISTA ADRIÁN
// ══════════════════════════════════════════════════════════════════════════════
export default function VistaAdrian({ sucursales, preguntas, visitas, setVisitas }) {
  const [fase, setFase] = useState("inicio");
  const [sucursalId, setSucursalId] = useState("");
  const [visitaActual, setVisitaActual] = useState(null);
  const [respuestas, setRespuestas] = useState({});
  const [guardando, setGuardando] = useState(false);
  const [inventariosVisita, setInventariosVisita] = useState([]);
  const { loading, error, sinPermiso, setSinPermiso, obtener, simular } = useGPS();
  const sucursal = sucursales.find(x => x.id===Number(sucursalId));

  const registrarCheckin = (coords) => {
    const dist = sucursal ? distanciaM(coords.latitude, coords.longitude, sucursal.lat, sucursal.lng) : 9999;
    setVisitaActual({
      id:Date.now(), sucursalId:sucursal.id, sucursalNombre:sucursal.nombre,
      checkin:new Date().toISOString(), checkout:null,
      latCheckin:coords.latitude, lngCheckin:coords.longitude,
      latCheckout:null, lngCheckout:null,
      distCheckin:Math.round(dist), distCheckout:null,
      gpsOkCheckin:dist<=RADIO_ACEPTADO_M, gpsOkCheckout:null,
      simulado:coords.simulado||false, respuestas:{},
    });
    setRespuestas({});
    // Cargar inventarios de esta sucursal para saber si ya se hizo el rubro esta semana
    API.getInventarios(sucursal?.id)
      .then(rows => setInventariosVisita(rows.map(r => ({
        id: r.id,
        sucursalId: r.sucursal_id,
        rubro: r.rubro,
        semanaKey: r.semana_key,
        fecha: r.fecha,
      }))))
      .catch(() => {});
    setFase("encuesta");
  };

  const registrarCheckout = async (coords) => {
    const dist = sucursal ? distanciaM(coords.latitude, coords.longitude, sucursal.lat, sucursal.lng) : 9999;
    const fin = { ...visitaActual, checkout:new Date().toISOString(), latCheckout:coords.latitude, lngCheckout:coords.longitude, distCheckout:Math.round(dist), gpsOkCheckout:dist<=RADIO_ACEPTADO_M, respuestas };
    setGuardando(true);
    try { await API.saveVisita(fin); } catch {}
    setVisitas(p => [fin, ...p]);
    setGuardando(false); setVisitaActual(null); setFase("listo");
  };

  const reset = () => { setFase("inicio"); setSucursalId(""); setSinPermiso(false); };

  if (fase==="listo") return (
    <div style={{ padding:"18px 16px" }}>
      <Card className="bvpop" style={{ textAlign:"center", padding:"44px 20px" }}>
        <div style={{ width:74, height:74, borderRadius:"50%", background:T.sageBg, display:"flex", alignItems:"center", justifyContent:"center", fontSize:32, margin:"0 auto 16px" }}>✅</div>
        <div style={{ fontFamily:F.serif, fontSize:24, fontWeight:700, color:T.primaryDeep, marginBottom:8 }}>¡Visita registrada!</div>
        <div style={{ color:T.muted, fontSize:14, marginBottom:24 }}>La información quedó guardada correctamente.</div>
        <Btn onClick={reset}>Nueva visita</Btn>
      </Card>
    </div>
  );

  if (fase==="encuesta") return (
    <div style={{ padding:"18px 16px" }}>
      <Card>
        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:14 }}>
          <div style={{ width:9, height:9, borderRadius:"50%", background:T.sage, boxShadow:`0 0 0 3px ${T.sageBg}` }}/>
          <span style={{ fontWeight:700, fontSize:15, color:T.text }}>{visitaActual?.sucursalNombre}</span>
          {visitaActual?.simulado && <Badge color="amber">simulado</Badge>}
        </div>
        <div style={{ display:"flex", gap:20 }}>
          <div><Label>Check-in</Label><div style={{ fontWeight:700, fontFamily:F.serif, fontSize:18, color:T.primaryDeep }}>{fmtHora(visitaActual?.checkin)}</div></div>
          <div><Label>GPS entrada</Label><Badge color={visitaActual?.gpsOkCheckin?"sage":"error"}>{visitaActual?.gpsOkCheckin ? ("✓ "+visitaActual?.distCheckin+"m") : ("⚠ "+visitaActual?.distCheckin+"m")}</Badge></div>
        </div>
      </Card>

      <Card>
        <div style={{ fontFamily:F.serif, fontSize:18, fontWeight:700, color:T.primaryDeep, marginBottom:16 }}>Encuesta de visita</div>
        {preguntas.map(p => (
          <div key={p.id} style={{ marginBottom:18 }}>
            <div style={{ fontSize:14, fontWeight:500, color:T.text, marginBottom:8, lineHeight:1.5 }}>{p.texto}</div>
            {p.tipo==="bool" ? (
              <div style={{ display:"flex", gap:8 }}>
                {["Sí","No"].map(op => (
                  <button key={op} onClick={() => setRespuestas(r => ({...r,[p.id]:op}))} style={{
                    flex:1, padding:"10px 0", borderRadius:12,
                    border:`2px solid ${respuestas[p.id]===op?T.primaryDeep:T.border}`,
                    background:respuestas[p.id]===op?T.activeSoft:T.inputBg,
                    color:respuestas[p.id]===op?T.primaryDeep:T.muted,
                    fontWeight:700, cursor:"pointer", fontSize:14, fontFamily:F.body, transition:"all .1s",
                  }}>{op}</button>
                ))}
              </div>
            ) : p.tipo==="foto" ? (
              <FotoUploader
                visitaId={visitaActual?.id}
                sucursal={visitaActual?.sucursalNombre}
                tipo={"p"+p.id}
                value={respuestas[p.id]}
                onChange={url => setRespuestas(r => ({...r,[p.id]:url}))}
              />
            ) : (
              <textarea rows={3} placeholder="Escribí tus observaciones..." value={respuestas[p.id]||""} onChange={e => setRespuestas(r => ({...r,[p.id]:e.target.value}))}
                style={{ width:"100%", padding:"11px 13px", borderRadius:12, border:`1.5px solid ${T.border}`, background:T.inputBg, fontSize:14, color:T.text, outline:"none", fontFamily:F.body, resize:"vertical" }}/>
            )}
          </div>
        ))}
      </Card>

      {/* INVENTARIO */}
      <Card>
        <div style={{ fontWeight:700, fontSize:14, color:T.primaryDeep, marginBottom:14 }}>📦 Control de inventario</div>
        <InventarioForm visitaActual={visitaActual} inventariosExistentes={inventariosVisita} />
      </Card>

      {error && <div style={{ background:T.errorBg, color:T.error, borderRadius:12, padding:"12px 14px", fontSize:13, marginBottom:12 }}>⚠ GPS: {error}</div>}

      {sinPermiso ? (
        <Card style={{ background:T.amberBg, border:`1px solid ${T.amber}` }}>
          <div style={{ fontWeight:700, fontSize:13, color:T.amber, marginBottom:6 }}>⚠ GPS sin permiso en este entorno</div>
          <div style={{ fontSize:13, color:T.text, marginBottom:14 }}>En el celu real el GPS funciona. Podés simular para probar el flujo.</div>
          <Btn variant="ghost" onClick={() => { setSinPermiso(false); registrarCheckout(simular(sucursal)); }}>📍 Simular Check-out</Btn>
        </Card>
      ) : (
        <Btn variant="danger" disabled={loading||guardando} onClick={async()=>{ try{await registrarCheckout(await obtener());}catch{} }}>
          {guardando?"Guardando…":loading?"Obteniendo GPS…":"⏹ Registrar Check-out"}
        </Btn>
      )}
    </div>
  );

  return (
    <div style={{ padding:"18px 16px" }}>
      <div style={{ marginBottom:20 }}>
        <div style={{ fontFamily:F.serif, fontSize:26, fontWeight:700, color:T.primaryDeep, marginBottom:4 }}>Hola, Adrián 👋</div>
        <div style={{ color:T.muted, fontSize:14 }}>Seleccioná la sucursal a visitar.</div>
      </div>

      <Card>
        <Label>Sucursal</Label>
        <Select value={sucursalId} onChange={e => setSucursalId(e.target.value)}>
          <option value="">— Elegí una sucursal —</option>
          {sucursales.map(x => <option key={x.id} value={x.id}>{x.nombre}</option>)}
        </Select>
      </Card>

      {error && <div style={{ background:T.errorBg, color:T.error, borderRadius:12, padding:"12px 14px", fontSize:13, marginBottom:12 }}>⚠ GPS: {error}</div>}

      {sinPermiso ? (
        <Card style={{ background:T.amberBg, border:`1px solid ${T.amber}` }}>
          <div style={{ fontWeight:700, fontSize:13, color:T.amber, marginBottom:6 }}>⚠ GPS sin permiso en este entorno</div>
          <div style={{ fontSize:13, color:T.text, marginBottom:14 }}>En el celu real el GPS funciona. Podés simular para probar el flujo.</div>
          <Btn variant="ghost" disabled={!sucursalId} onClick={() => { setSinPermiso(false); registrarCheckin(simular(sucursal)); }}>📍 Simular Check-in</Btn>
        </Card>
      ) : (
        <Btn disabled={!sucursalId||loading} onClick={async()=>{ try{registrarCheckin(await obtener());}catch{} }}>
          {loading?"Obteniendo GPS…":"📍 Registrar Check-in"}
        </Btn>
      )}

      {visitas.slice(0,3).length>0 && (
        <div style={{ marginTop:24 }}>
          <Label>Últimas visitas</Label>
          {visitas.slice(0,3).map(v => (
            <div key={v.id} style={{ background:T.card, borderRadius:14, padding:"12px 14px", boxShadow:T.shadowList, marginBottom:8 }}>
              <div style={{ fontWeight:600, fontSize:14, color:T.text }}>{v.sucursalNombre}</div>
              <div style={{ fontSize:12, color:T.muted, marginTop:2 }}>
                {fmtFecha(v.checkin)} · {fmtHora(v.checkin)} → {fmtHora(v.checkout)}
                {v.simulado && <span style={{ marginLeft:6 }}><Badge color="amber">sim</Badge></span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
