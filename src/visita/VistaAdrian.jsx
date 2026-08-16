import { useState, useEffect } from "react";
import { T, F } from "../theme";
import { RADIO_ACEPTADO_M } from "../constants";
import { API } from "../api";
import { distanciaM, fechaLocal, fmtHora, fmtFecha, useGPS } from "../utils";
import { Badge, Btn, Card, Label, Select } from "../ui";
import EncuestaVisita from "../encuesta/EncuestaVisita";
import { descripcionSugerida, hallazgos as calcularHallazgos, resumenEncuesta } from "../encuesta/schema";
import InventarioForm from "./InventarioForm";
import PendientesPrevios from "./PendientesPrevios";
import CierreVisita, { faltantesCierre, dejoPendientes } from "./CierreVisita";
import PendienteForm from "./PendienteForm";
import MisRecorridas from "../plan/MisRecorridas";

const CIERRE_VACIO = {
  semaforo: null, hallazgo: "", accionTomada: null, accionDetalle: "", dejoPendientes: null,
};

// ══════════════════════════════════════════════════════════════════════════════
// VISTA ADRIÁN
//
//   inicio ──check-in──► pendientes ──► encuesta ──► cierre ──check-out──► listo
//
// Todo lo que se genera durante la visita (respuestas, pendientes nuevos y
// resoluciones de pendientes viejos) vive en memoria y se persiste recién en el
// check-out. Una visita abandonada a mitad no deja nada suelto en la base.
// ══════════════════════════════════════════════════════════════════════════════
export default function VistaAdrian({ sucursales, equipo, visitas, setVisitas }) {
  const [fase, setFase] = useState("inicio");
  const [sucursalId, setSucursalId] = useState("");
  const [visitaActual, setVisitaActual] = useState(null);
  const [respuestas, setRespuestas] = useState({});
  const [inventariosVisita, setInventariosVisita] = useState([]);

  // Pendientes: los que ya existían, lo que Adrián hizo con ellos, y los nuevos
  const [pendientesPrevios, setPendientesPrevios] = useState([]);
  const [cargandoPrevios, setCargandoPrevios] = useState(false);
  const [resoluciones, setResoluciones] = useState({});
  const [pendientesNuevos, setPendientesNuevos] = useState([]);

  const [cierre, setCierre] = useState(CIERRE_VACIO);
  const [formPendiente, setFormPendiente] = useState(null); // { inicial, titulo }

  const [guardando, setGuardando] = useState(false);
  const [errorGuardado, setErrorGuardado] = useState(null);
  const [porGuardar, setPorGuardar] = useState(null); // visita ya armada, para reintentar

  const [previewPendientes, setPreviewPendientes] = useState(null);

  const { loading, error, sinPermiso, setSinPermiso, obtener, simular } = useGPS();
  const sucursal = sucursales.find(x => x.id === Number(sucursalId));

  const resumen = resumenEncuesta(respuestas);
  const hallazgos = calcularHallazgos(respuestas);
  const resueltos = Object.values(resoluciones).filter(r => r.estado === "resuelto").length;

  // Cuántos pendientes abiertos tiene la sucursal elegida, antes del check-in
  useEffect(() => {
    if (fase !== "inicio" || !sucursal) { setPreviewPendientes(null); return; }
    let vigente = true;
    API.getPendientes({ sucursalId: sucursal.id, estado: "activos" })
      .then(rows => { if (vigente) setPreviewPendientes(rows.length); })
      .catch(() => { if (vigente) setPreviewPendientes(null); });
    return () => { vigente = false; };
  }, [sucursal?.id, fase]);

  // ─── CHECK-IN ──────────────────────────────────────────────────────────────
  const registrarCheckin = (coords) => {
    const dist = sucursal ? distanciaM(coords.latitude, coords.longitude, sucursal.lat, sucursal.lng) : 9999;
    const visita = {
      id: Date.now(), sucursalId: sucursal.id, sucursalNombre: sucursal.nombre,
      checkin: new Date().toISOString(), checkout: null,
      latCheckin: coords.latitude, lngCheckin: coords.longitude,
      latCheckout: null, lngCheckout: null,
      distCheckin: Math.round(dist), distCheckout: null,
      gpsOkCheckin: dist <= RADIO_ACEPTADO_M, gpsOkCheckout: null,
      simulado: coords.simulado || false, respuestas: {},
    };
    setVisitaActual(visita);
    setRespuestas({});
    setPendientesNuevos([]);
    setResoluciones({});
    setCierre(CIERRE_VACIO);
    setErrorGuardado(null);
    setPorGuardar(null);

    setCargandoPrevios(true);
    API.getPendientes({ sucursalId: sucursal.id, estado: "activos" })
      .then(setPendientesPrevios)
      .catch(() => setPendientesPrevios([]))
      .finally(() => setCargandoPrevios(false));

    API.getInventarios(sucursal.id)
      .then(rows => setInventariosVisita(rows.map(r => ({
        id: r.id, sucursalId: r.sucursal_id, rubro: r.rubro,
        semanaKey: r.semana_key, fecha: r.fecha,
      }))))
      .catch(() => setInventariosVisita([]));

    setFase("pendientes");
  };

  // ─── CHECK-OUT ─────────────────────────────────────────────────────────────
  const armarVisita = (coords) => {
    const dist = sucursal ? distanciaM(coords.latitude, coords.longitude, sucursal.lat, sucursal.lng) : 9999;
    return {
      ...visitaActual,
      checkout: new Date().toISOString(),
      latCheckout: coords.latitude, lngCheckout: coords.longitude,
      distCheckout: Math.round(dist), gpsOkCheckout: dist <= RADIO_ACEPTADO_M,
      respuestas,
      encuestaVersion: "v2",
      semaforo: cierre.semaforo,
      hallazgo: cierre.hallazgo.trim(),
      accionTomada: cierre.accionTomada,
      accionDetalle: cierre.accionTomada ? cierre.accionDetalle.trim() : null,
      dejoPendientes: dejoPendientes(cierre, pendientesNuevos),
    };
  };

  // Los tres pasos son idempotentes (visitas hace ON CONFLICT DO UPDATE,
  // pendientes ON CONFLICT DO NOTHING), así que reintentar es seguro.
  const persistir = async (fin) => {
    setGuardando(true); setErrorGuardado(null);
    try {
      await API.saveVisita(fin);

      if (pendientesNuevos.length > 0) {
        await API.crearPendientes(pendientesNuevos.map(p => ({ ...p, visitaId: fin.id })));
      }

      for (const [id, res] of Object.entries(resoluciones)) {
        await API.actualizarPendiente({
          id: Number(id),
          estado: res.estado,
          comentarioCierre: res.comentarioCierre || null,
          visitaCierreId: fin.id,
        });
      }

      // Engancha la visita con su recorrida planificada, si había una. El
      // servidor hace el matching por sucursal + fecha; si no hay ninguna no
      // pasa nada, la visita simplemente no estaba en el plan. La fecha sale
      // del check-in y no de hoy(), por si la visita cruzó la medianoche.
      await API.vincularVisita({
        visitaId: fin.id,
        sucursalId: fin.sucursalId,
        fecha: fechaLocal(fin.checkin),
      });

      setVisitas(p => [fin, ...p]);
      setVisitaActual(null);
      setPorGuardar(null);
      setFase("listo");
    } catch (e) {
      setPorGuardar(fin);
      setErrorGuardado(e.message || "No se pudo guardar la visita");
    } finally {
      setGuardando(false);
    }
  };

  const finalizar = async (coords) => persistir(armarVisita(coords));

  const reset = () => {
    setFase("inicio"); setSucursalId(""); setSinPermiso(false);
    setPendientesPrevios([]); setPendientesNuevos([]); setResoluciones({});
    setCierre(CIERRE_VACIO); setErrorGuardado(null); setPorGuardar(null);
  };

  // ─── PENDIENTES ────────────────────────────────────────────────────────────
  const abrirFormDesdeEncuesta = (pregunta, respuesta) => setFormPendiente({
    titulo: "Pendiente por este hallazgo",
    inicial: {
      categoria: pregunta.seccionId,
      descripcion: descripcionSugerida(pregunta, respuesta),
      preguntaId: pregunta.id,
      evidenciaUrl: respuesta?.foto || null,
    },
  });

  const abrirFormDesdeCierre = () => setFormPendiente({
    titulo: "Nuevo pendiente",
    inicial: { categoria: "otro" },
  });

  const guardarPendiente = (p) => {
    setPendientesNuevos(prev => [...prev, p]);
    setFormPendiente(null);
  };

  const quitarPendiente = (id) => setPendientesNuevos(prev => prev.filter(p => p.id !== id));

  // ─── UI COMPARTIDA ─────────────────────────────────────────────────────────
  const Cabecera = () => (
    <Card>
      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:14 }}>
        <div style={{ width:9, height:9, borderRadius:"50%", background:T.sage, boxShadow:`0 0 0 3px ${T.sageBg}` }}/>
        <span style={{ fontWeight:700, fontSize:15, color:T.text }}>{visitaActual?.sucursalNombre}</span>
        {visitaActual?.simulado && <Badge color="amber">simulado</Badge>}
      </div>
      <div style={{ display:"flex", gap:20 }}>
        <div>
          <Label>Check-in</Label>
          <div style={{ fontWeight:700, fontFamily:F.serif, fontSize:18, color:T.primaryDeep }}>
            {fmtHora(visitaActual?.checkin)}
          </div>
        </div>
        <div>
          <Label>GPS entrada</Label>
          <Badge color={visitaActual?.gpsOkCheckin ? "sage" : "error"}>
            {visitaActual?.gpsOkCheckin ? `✓ ${visitaActual?.distCheckin}m` : `⚠ ${visitaActual?.distCheckin}m`}
          </Badge>
        </div>
      </div>
    </Card>
  );

  const ErrorGuardado = () => !errorGuardado ? null : (
    <Card style={{ background:T.errorBg, border:`1px solid ${T.error}` }}>
      <div style={{ fontWeight:700, fontSize:13, color:T.error, marginBottom:6 }}>
        ⚠ No se pudo guardar
      </div>
      <div style={{ fontSize:13, color:T.text, marginBottom:12, lineHeight:1.5 }}>
        {errorGuardado}. No se perdió nada: podés reintentar sin volver a cargar la visita.
      </div>
      <Btn variant="danger" disabled={guardando} onClick={() => persistir(porGuardar)}>
        {guardando ? "Reintentando…" : "Reintentar"}
      </Btn>
    </Card>
  );

  const ErrorGPS = () => !error ? null : (
    <div style={{ background:T.errorBg, color:T.error, borderRadius:12, padding:"12px 14px", fontSize:13, marginBottom:12 }}>
      ⚠ GPS: {error}
    </div>
  );

  const modal = formPendiente && (
    <PendienteForm
      titulo={formPendiente.titulo}
      inicial={formPendiente.inicial}
      equipo={equipo}
      sucursal={sucursal}
      visitaId={visitaActual?.id}
      onGuardar={guardarPendiente}
      onCancelar={() => setFormPendiente(null)}
    />
  );

  // Sub-tabs de la vista de Adrián. Sólo aparecen fuera de una visita en curso:
  // durante la encuesta o el cierre no queremos que se salga del flujo.
  const SubTabs = () => (
    <div style={{ display:"flex", gap:8, marginBottom:18 }}>
      {[["inicio","📍 Visita"],["recorridas","🗓 Mis recorridas"]].map(([f,l]) => (
        <button key={f} onClick={() => setFase(f)} style={{
          flex:1, padding:"10px 0", borderRadius:12, border:"none", cursor:"pointer",
          fontFamily:F.body, fontSize:13, fontWeight:700,
          background: fase===f ? T.primary : T.activeSoft,
          color: fase===f ? T.white : T.primaryDeep,
          boxShadow: fase===f ? T.shadowBtn : "none",
          transition:"all .15s",
        }}>{l}</button>
      ))}
    </div>
  );

  // ─── FASE: MIS RECORRIDAS ──────────────────────────────────────────────────
  if (fase === "recorridas") return (
    <div style={{ padding:"18px 16px" }}>
      <SubTabs/>
      <MisRecorridas
        sucursales={sucursales}
        visitas={visitas}
        onIniciarVisita={(r) => { setSucursalId(String(r.sucursalId)); setFase("inicio"); }}
      />
    </div>
  );

  // ─── FASE: LISTO ───────────────────────────────────────────────────────────
  if (fase === "listo") return (
    <div style={{ padding:"18px 16px" }}>
      <Card className="bvpop" style={{ textAlign:"center", padding:"44px 20px" }}>
        <div style={{ width:74, height:74, borderRadius:"50%", background:T.sageBg, display:"flex", alignItems:"center", justifyContent:"center", fontSize:32, margin:"0 auto 16px" }}>✅</div>
        <div style={{ fontFamily:F.serif, fontSize:24, fontWeight:700, color:T.primaryDeep, marginBottom:8 }}>
          ¡Visita registrada!
        </div>
        <div style={{ color:T.muted, fontSize:14, marginBottom:24, lineHeight:1.6 }}>
          La información quedó guardada correctamente.
          {pendientesNuevos.length > 0 && <><br/>Se crearon {pendientesNuevos.length} {pendientesNuevos.length === 1 ? "pendiente" : "pendientes"}.</>}
          {resueltos > 0 && <><br/>Se cerraron {resueltos} {resueltos === 1 ? "pendiente anterior" : "pendientes anteriores"}.</>}
        </div>
        <Btn onClick={reset}>Nueva visita</Btn>
      </Card>
    </div>
  );

  // ─── FASE: PENDIENTES PREVIOS ──────────────────────────────────────────────
  if (fase === "pendientes") return (
    <div style={{ padding:"18px 16px" }}>
      <Cabecera/>
      <PendientesPrevios
        pendientes={pendientesPrevios}
        cargando={cargandoPrevios}
        resoluciones={resoluciones}
        setResoluciones={setResoluciones}
        onContinuar={() => setFase("encuesta")}
      />
    </div>
  );

  // ─── FASE: ENCUESTA ────────────────────────────────────────────────────────
  if (fase === "encuesta") return (
    <div style={{ padding:"18px 16px" }}>
      <Cabecera/>

      <EncuestaVisita
        respuestas={respuestas}
        setRespuestas={setRespuestas}
        visitaId={visitaActual?.id}
        sucursalNombre={visitaActual?.sucursalNombre}
        pendientes={pendientesNuevos}
        onCrearPendiente={abrirFormDesdeEncuesta}
        onQuitarPendiente={quitarPendiente}
      />

      <Card>
        <div style={{ fontWeight:700, fontSize:14, color:T.primaryDeep, marginBottom:14 }}>
          📦 Control de inventario
        </div>
        <InventarioForm visitaActual={visitaActual} inventariosExistentes={inventariosVisita}/>
      </Card>

      <Btn onClick={() => setFase("cierre")}>Continuar al cierre →</Btn>
      <Btn variant="ghost" onClick={() => setFase("pendientes")} style={{ marginTop:8 }}>
        ← Volver a pendientes
      </Btn>

      {modal}
    </div>
  );

  // ─── FASE: CIERRE ──────────────────────────────────────────────────────────
  if (fase === "cierre") {
    const faltan = faltantesCierre(cierre, pendientesNuevos);
    const puedeCerrar = faltan.length === 0;

    return (
      <div style={{ padding:"18px 16px" }}>
        <Cabecera/>

        <CierreVisita
          cierre={cierre}
          setCierre={setCierre}
          resumen={resumen}
          hallazgos={hallazgos}
          pendientesNuevos={pendientesNuevos}
          pendientesResueltos={resueltos}
          onCrearPendiente={abrirFormDesdeCierre}
          onQuitarPendiente={quitarPendiente}
          onVolver={() => setFase("encuesta")}
        />

        <ErrorGPS/>
        <ErrorGuardado/>

        {!errorGuardado && (sinPermiso ? (
          <Card style={{ background:T.amberBg, border:`1px solid ${T.amber}` }}>
            <div style={{ fontWeight:700, fontSize:13, color:T.amber, marginBottom:6 }}>⚠ GPS sin permiso en este entorno</div>
            <div style={{ fontSize:13, color:T.text, marginBottom:14 }}>En el celu real el GPS funciona. Podés simular para probar el flujo.</div>
            <Btn variant="ghost" disabled={!puedeCerrar || guardando} onClick={() => { setSinPermiso(false); finalizar(simular(sucursal)); }}>
              📍 Simular Check-out
            </Btn>
          </Card>
        ) : (
          <Btn variant="danger" disabled={!puedeCerrar || loading || guardando}
            onClick={async () => { try { await finalizar(await obtener()); } catch {} }}>
            {guardando ? "Guardando…" : loading ? "Obteniendo GPS…" : "⏹ Finalizar y registrar Check-out"}
          </Btn>
        ))}

        <Btn variant="ghost" onClick={() => setFase("encuesta")} style={{ marginTop:8 }}>
          ← Volver a la encuesta
        </Btn>

        {modal}
      </div>
    );
  }

  // ─── FASE: INICIO ──────────────────────────────────────────────────────────
  return (
    <div style={{ padding:"18px 16px" }}>
      <SubTabs/>
      <div style={{ marginBottom:20 }}>
        <div style={{ fontFamily:F.serif, fontSize:26, fontWeight:700, color:T.primaryDeep, marginBottom:4 }}>
          Hola, Adrián 👋
        </div>
        <div style={{ color:T.muted, fontSize:14 }}>Seleccioná la sucursal a visitar.</div>
      </div>

      <Card>
        <Label>Sucursal</Label>
        <Select value={sucursalId} onChange={e => setSucursalId(e.target.value)}>
          <option value="">— Elegí una sucursal —</option>
          {sucursales.map(x => <option key={x.id} value={x.id}>{x.nombre}</option>)}
        </Select>

        {previewPendientes !== null && (
          <div style={{
            marginTop:12, padding:"10px 13px", borderRadius:11, fontSize:13, fontWeight:600,
            background: previewPendientes > 0 ? T.amberBg : T.sageBg,
            color: previewPendientes > 0 ? T.amber : T.sage,
          }}>
            {previewPendientes > 0
              ? `⚠ ${previewPendientes} ${previewPendientes === 1 ? "pendiente abierto" : "pendientes abiertos"} de visitas anteriores`
              : "✓ Sin pendientes abiertos"}
          </div>
        )}
      </Card>

      <ErrorGPS/>

      {sinPermiso ? (
        <Card style={{ background:T.amberBg, border:`1px solid ${T.amber}` }}>
          <div style={{ fontWeight:700, fontSize:13, color:T.amber, marginBottom:6 }}>⚠ GPS sin permiso en este entorno</div>
          <div style={{ fontSize:13, color:T.text, marginBottom:14 }}>En el celu real el GPS funciona. Podés simular para probar el flujo.</div>
          <Btn variant="ghost" disabled={!sucursalId} onClick={() => { setSinPermiso(false); registrarCheckin(simular(sucursal)); }}>
            📍 Simular Check-in
          </Btn>
        </Card>
      ) : (
        <Btn disabled={!sucursalId || loading} onClick={async () => { try { registrarCheckin(await obtener()); } catch {} }}>
          {loading ? "Obteniendo GPS…" : "📍 Registrar Check-in"}
        </Btn>
      )}

      {visitas.slice(0, 3).length > 0 && (
        <div style={{ marginTop:24 }}>
          <Label>Últimas visitas</Label>
          {visitas.slice(0, 3).map(v => (
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
