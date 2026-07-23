import { useState } from "react";

// ─── DATOS INICIALES ────────────────────────────────────────────────────────

const SUCURSALES_INIT = [
  { id: 1, nombre: "Bella Vita 1",  lat: -34.6150343, lng: -58.4328699 },
  { id: 2, nombre: "Bella Vita 2",  lat: -34.5580079, lng: -58.4599135 },
  { id: 3, nombre: "Bella Vita 3",  lat: -34.5836368, lng: -58.4209757 },
  { id: 4, nombre: "Bella Vita 4",  lat: -34.511436,  lng: -58.4887857 },
  { id: 5, nombre: "Bella Vita 5",  lat: -34.5731906, lng: -58.4814334 },
  { id: 6, nombre: "Bella Vita 6",  lat: -34.6408629, lng: -58.5634681 },
  { id: 7, nombre: "Bella Vita Victoria", lat: -34.447114786025985, lng: -58.5467312333035 },
];

const PREGUNTAS_INIT = [
  { id: 1, texto: "¿Avisó al encargado sobre novedades operativas?", tipo: "bool" },
  { id: 2, texto: "¿Capacitó al personal de la sucursal?",           tipo: "bool" },
  { id: 3, texto: "¿Instruyó sobre acciones comerciales vigentes?",  tipo: "bool" },
  { id: 4, texto: "¿Verificó stock y exhibición de productos?",      tipo: "bool" },
  { id: 5, texto: "Observaciones de la visita",                      tipo: "texto" },
];

const EQUIPO_INIT = [
  { id: "camila", nombre: "Camila",  rol: "Gestión comercial" },
  { id: "sasha",  nombre: "Sasha",   rol: "Gestión comercial" },
  { id: "braian", nombre: "Braian",  rol: "Gestión comercial (remoto)" },
];

// meta por defecto: editable por Ileana
const META_INIT = {
  mensajes: 50,
  turnos: 30,
  senias: 10,
  premioPorSenia: 500, // $ por seña confirmada sobre la meta
};

const RADIO_ACEPTADO_M = 300;

// ─── HELPERS ────────────────────────────────────────────────────────────────

function distanciaM(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function distanciaKm(lat1, lng1, lat2, lng2) {
  return (distanciaM(lat1, lng1, lat2, lng2) / 1000).toFixed(1);
}

function fmtHora(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
}

function fmtFecha(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function duracion(entrada, salida) {
  if (!entrada || !salida) return null;
  const mins = Math.round((new Date(salida) - new Date(entrada)) / 60000);
  if (mins < 60) return `${mins} min`;
  return `${Math.floor(mins / 60)}h ${mins % 60}min`;
}

function hoy() { return new Date().toISOString().slice(0, 10); }
function mesActual() { return new Date().toISOString().slice(0, 7); }

function useLocalStorage(key, init) {
  const [val, setVal] = useState(() => {
    try { return JSON.parse(localStorage.getItem(key)) ?? init; }
    catch { return init; }
  });
  const set = (v) => {
    const next = typeof v === "function" ? v(val) : v;
    setVal(next);
    localStorage.setItem(key, JSON.stringify(next));
  };
  return [val, set];
}

// ─── COLORES Y ESTILOS ───────────────────────────────────────────────────────

const C = {
  verde:    "#2D6A4F",
  verdeL:   "#40916C",
  menta:    "#D8F3DC",
  crema:    "#F8F4EF",
  texto:    "#1B1B1B",
  gris:     "#6B7280",
  grisL:    "#F3F4F6",
  rojo:     "#DC2626",
  rojoL:    "#FEE2E2",
  amarillo: "#D97706",
  amarilloL:"#FEF3C7",
  violeta:  "#7C3AED",
  violetaL: "#EDE9FE",
  blanco:   "#FFFFFF",
  sombra:   "0 2px 12px rgba(0,0,0,0.08)",
};

const s = {
  app: { minHeight: "100vh", background: C.crema, fontFamily: "'Inter','Segoe UI',sans-serif", color: C.texto },
  header: {
    background: C.verde, color: C.blanco, padding: "0 16px",
    display: "flex", alignItems: "center", justifyContent: "space-between",
    height: 56, boxShadow: "0 2px 8px rgba(0,0,0,0.15)", gap: 8,
  },
  logo: { fontSize: 17, fontWeight: 700, letterSpacing: "-0.3px", whiteSpace: "nowrap" },
  headerTabs: { display: "flex", gap: 4, overflowX: "auto", flexShrink: 1 },
  tab: (a) => ({
    padding: "5px 11px", borderRadius: 20, border: "none", cursor: "pointer",
    fontSize: 12, fontWeight: 600, whiteSpace: "nowrap",
    background: a ? C.blanco : "transparent",
    color: a ? C.verde : "rgba(255,255,255,0.85)", transition: "all .15s",
  }),
  subTabs: {
    background: C.blanco, borderBottom: "1px solid #E5E7EB",
    padding: "0 12px", display: "flex", gap: 2, overflowX: "auto",
  },
  subTab: (a) => ({
    padding: "11px 10px 9px", border: "none", background: "none", cursor: "pointer",
    fontSize: 12, fontWeight: 600, whiteSpace: "nowrap",
    color: a ? C.verde : C.gris,
    borderBottom: a ? `2px solid ${C.verde}` : "2px solid transparent",
    transition: "all .15s",
  }),
  section: { padding: "16px", maxWidth: 480, margin: "0 auto" },
  card: { background: C.blanco, borderRadius: 14, padding: 18, boxShadow: C.sombra, marginBottom: 14 },
  btn: (v = "primary") => ({
    display: "block", width: "100%", padding: "13px 18px", borderRadius: 10, border: "none",
    cursor: "pointer", fontSize: 14, fontWeight: 700, letterSpacing: "0.2px", transition: "opacity .15s",
    background: v === "primary" ? C.verde : v === "danger" ? C.rojo : v === "purple" ? C.violeta : C.grisL,
    color: v === "ghost" ? C.texto : C.blanco,
  }),
  btnSm: (v = "primary") => ({
    padding: "6px 12px", borderRadius: 8, border: "none", cursor: "pointer",
    fontSize: 12, fontWeight: 600,
    background: v === "primary" ? C.verde : v === "danger" ? C.rojo : v === "purple" ? C.violeta : C.grisL,
    color: v === "ghost" ? C.texto : C.blanco,
  }),
  label: { fontSize: 11, fontWeight: 600, color: C.gris, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 4, display: "block" },
  input: { width: "100%", padding: "9px 11px", borderRadius: 8, border: "1.5px solid #E5E7EB", fontSize: 14, outline: "none", boxSizing: "border-box", background: C.blanco },
  select: { width: "100%", padding: "11px 13px", borderRadius: 10, border: "1.5px solid #E5E7EB", fontSize: 14, outline: "none", background: C.blanco, cursor: "pointer" },
  badge: (color) => ({
    display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 9px",
    borderRadius: 20, fontSize: 11, fontWeight: 600,
    background: color === "verde" ? C.menta : color === "rojo" ? C.rojoL : color === "purple" ? C.violetaL : C.amarilloL,
    color: color === "verde" ? C.verde : color === "rojo" ? C.rojo : color === "purple" ? C.violeta : C.amarillo,
  }),
};

// ─── GPS HOOK ────────────────────────────────────────────────────────────────

function useGPS() {
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [sinPermiso, setSinPermiso] = useState(false);

  const obtener = (sucursalRef) =>
    new Promise((res, rej) => {
      setLoading(true); setError(null); setSinPermiso(false);
      navigator.geolocation.getCurrentPosition(
        (p) => { setLoading(false); res(p.coords); },
        (e) => {
          setLoading(false);
          // Error de permisos → activar modo simulación
          if (e.code === 1 || e.message?.toLowerCase().includes("permission")) {
            setSinPermiso(true);
            setError(null);
            rej(e);
          } else {
            setError(e.message);
            rej(e);
          }
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    });

  // Simula coordenadas a ~50-150m de la sucursal (dentro del radio aceptado)
  const simular = (sucursal) => {
    const offsetLat = (Math.random() - 0.5) * 0.001; // ~±55m
    const offsetLng = (Math.random() - 0.5) * 0.001;
    return {
      latitude:  (sucursal?.lat ?? -34.6037) + offsetLat,
      longitude: (sucursal?.lng ?? -58.3816) + offsetLng,
      simulado: true,
    };
  };

  return { error, loading, sinPermiso, setSinPermiso, obtener, simular };
}

// ══════════════════════════════════════════════════════════════════════════════
// VISTA ADRIÁN – VISITAS
// ══════════════════════════════════════════════════════════════════════════════

function VistaAdrian({ sucursales, preguntas, visitas, setVisitas }) {
  const [fase, setFase] = useState("inicio");
  const [sucursalId, setSucursalId] = useState("");
  const [visitaActual, setVisitaActual] = useState(null);
  const [respuestas, setRespuestas] = useState({});
  const { loading, error, sinPermiso, setSinPermiso, obtener, simular } = useGPS();

  const sucursal = sucursales.find((x) => x.id === Number(sucursalId));

  const registrarCheckin = (coords) => {
    const dist = sucursal ? distanciaM(coords.latitude, coords.longitude, sucursal.lat, sucursal.lng) : 9999;
    setVisitaActual({
      id: Date.now(), sucursalId: sucursal.id, sucursalNombre: sucursal.nombre,
      checkin: new Date().toISOString(), checkout: null,
      latCheckin: coords.latitude, lngCheckin: coords.longitude,
      latCheckout: null, lngCheckout: null,
      distCheckin: Math.round(dist), distCheckout: null,
      gpsOkCheckin: dist <= RADIO_ACEPTADO_M, gpsOkCheckout: null,
      simulado: coords.simulado || false,
      respuestas: {},
    });
    setRespuestas({});
    setFase("encuesta");
  };

  const handleCheckin = async () => {
    try {
      const coords = await obtener(sucursal);
      registrarCheckin(coords);
    } catch {}
  };

  const handleCheckinSimulado = () => {
    setSinPermiso(false);
    registrarCheckin(simular(sucursal));
  };

  const registrarCheckout = (coords) => {
    const dist = sucursal ? distanciaM(coords.latitude, coords.longitude, sucursal.lat, sucursal.lng) : 9999;
    const fin = {
      ...visitaActual, checkout: new Date().toISOString(),
      latCheckout: coords.latitude, lngCheckout: coords.longitude,
      distCheckout: Math.round(dist), gpsOkCheckout: dist <= RADIO_ACEPTADO_M,
      respuestas,
    };
    setVisitas((p) => [fin, ...p]);
    setVisitaActual(null);
    setFase("listo");
  };

  const handleCheckout = async () => {
    try {
      const coords = await obtener(sucursal);
      registrarCheckout(coords);
    } catch {}
  };

  const handleCheckoutSimulado = () => {
    setSinPermiso(false);
    registrarCheckout(simular(sucursal));
  };

  const reset = () => { setFase("inicio"); setSucursalId(""); setSinPermiso(false); };

  if (fase === "listo") return (
    <div style={s.section}>
      <div style={{ ...s.card, textAlign: "center", padding: "40px 20px" }}>
        <div style={{ fontSize: 52, marginBottom: 10 }}>✅</div>
        <div style={{ fontSize: 19, fontWeight: 700, color: C.verde, marginBottom: 6 }}>¡Visita registrada!</div>
        <div style={{ color: C.gris, fontSize: 13, marginBottom: 20 }}>La información quedó guardada correctamente.</div>
        <button style={s.btn()} onClick={reset}>Nueva visita</button>
      </div>
    </div>
  );

  if (fase === "encuesta") return (
    <div style={s.section}>
      <div style={s.card}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
          <div style={{ width: 9, height: 9, borderRadius: "50%", background: "#22C55E", boxShadow: "0 0 0 3px #BBF7D0" }} />
          <span style={{ fontWeight: 700, fontSize: 14 }}>{visitaActual?.sucursalNombre}</span>
        </div>
        <div style={{ display: "flex", gap: 18 }}>
          <div><span style={s.label}>Check-in</span><div style={{ fontWeight: 600 }}>{fmtHora(visitaActual?.checkin)}</div></div>
          <div>
            <span style={s.label}>GPS entrada</span>
            <span style={s.badge(visitaActual?.gpsOkCheckin ? "verde" : "rojo")}>
              {visitaActual?.gpsOkCheckin ? `✓ ${visitaActual?.distCheckin}m` : `⚠ ${visitaActual?.distCheckin}m`}
            </span>
          </div>
        </div>
      </div>

      <div style={s.card}>
        <div style={{ fontWeight: 700, fontSize: 14, color: C.verde, marginBottom: 14 }}>Encuesta de visita</div>
        {preguntas.map((p) => (
          <div key={p.id} style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 7, lineHeight: 1.4 }}>{p.texto}</div>
            {p.tipo === "bool" ? (
              <div style={{ display: "flex", gap: 8 }}>
                {["Sí", "No"].map((op) => (
                  <button key={op} onClick={() => setRespuestas((r) => ({ ...r, [p.id]: op }))} style={{
                    flex: 1, padding: "9px 0", borderRadius: 8,
                    border: `2px solid ${respuestas[p.id] === op ? C.verde : "#E5E7EB"}`,
                    background: respuestas[p.id] === op ? C.menta : C.blanco,
                    color: respuestas[p.id] === op ? C.verde : C.texto,
                    fontWeight: 700, cursor: "pointer", fontSize: 13, transition: "all .1s",
                  }}>{op}</button>
                ))}
              </div>
            ) : (
              <textarea rows={3} placeholder="Escribí tus observaciones..."
                style={{ ...s.input, resize: "vertical" }}
                value={respuestas[p.id] || ""}
                onChange={(e) => setRespuestas((r) => ({ ...r, [p.id]: e.target.value }))}
              />
            )}
          </div>
        ))}
      </div>

      {error && <div style={{ ...s.card, background: C.rojoL, color: C.rojo, fontSize: 12 }}>⚠ GPS: {error}</div>}

      {sinPermiso ? (
        <div style={{ ...s.card, background: C.amarilloL, border: `1px solid ${C.amarillo}` }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: C.amarillo, marginBottom: 6 }}>⚠ GPS sin permiso en este entorno</div>
          <div style={{ fontSize: 12, color: C.texto, marginBottom: 12, lineHeight: 1.5 }}>
            En producción (web real) el GPS funciona normalmente. Acá podés simular la ubicación para probar el flujo.
          </div>
          <button style={s.btn("ghost")} onClick={handleCheckoutSimulado}>📍 Simular Check-out</button>
        </div>
      ) : (
        <button style={s.btn("danger")} onClick={handleCheckout} disabled={loading}>
          {loading ? "Obteniendo GPS…" : "⏹ Registrar Check-out"}
        </button>
      )}
    </div>
  );

  return (
    <div style={s.section}>
      <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>Hola, Adrián 👋</div>
      <div style={{ color: C.gris, fontSize: 13, marginBottom: 18 }}>Seleccioná la sucursal a visitar.</div>
      <div style={s.card}>
        <span style={s.label}>Sucursal</span>
        <select style={s.select} value={sucursalId} onChange={(e) => setSucursalId(e.target.value)}>
          <option value="">— Elegí una sucursal —</option>
          {sucursales.map((x) => <option key={x.id} value={x.id}>{x.nombre}</option>)}
        </select>
      </div>
      {error && <div style={{ ...s.card, background: C.rojoL, color: C.rojo, fontSize: 12 }}>⚠ GPS: {error}</div>}

      {sinPermiso ? (
        <div style={{ ...s.card, background: C.amarilloL, border: `1px solid ${C.amarillo}` }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: C.amarillo, marginBottom: 6 }}>⚠ GPS sin permiso en este entorno</div>
          <div style={{ fontSize: 12, color: C.texto, marginBottom: 12, lineHeight: 1.5 }}>
            En producción (web real) el GPS funciona normalmente. Podés simular la ubicación para probar el flujo completo.
          </div>
          <button style={{ ...s.btn("ghost"), opacity: !sucursalId ? 0.5 : 1 }}
            disabled={!sucursalId} onClick={handleCheckinSimulado}>
            📍 Simular Check-in
          </button>
        </div>
      ) : (
        <button style={{ ...s.btn(), opacity: !sucursalId || loading ? 0.5 : 1 }}
          disabled={!sucursalId || loading} onClick={handleCheckin}>
          {loading ? "Obteniendo GPS…" : "📍 Registrar Check-in"}
        </button>
      )}
      {visitas.slice(0, 3).length > 0 && (
        <div style={{ marginTop: 20 }}>
          <span style={{ ...s.label, marginBottom: 10 }}>Últimas visitas</span>
          {visitas.slice(0, 3).map((v) => (
            <div key={v.id} style={{ ...s.card, padding: "10px 14px" }}>
              <div style={{ fontWeight: 600, fontSize: 13 }}>{v.sucursalNombre}</div>
              <div style={{ fontSize: 12, color: C.gris }}>{fmtFecha(v.checkin)} · {fmtHora(v.checkin)} → {fmtHora(v.checkout)}
                {v.simulado && <span style={{ marginLeft: 6, ...s.badge("amarillo") }}>simulado</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// VISTA EQUIPO – CARGA DIARIA (Camila / Sasha / Braian)
// ══════════════════════════════════════════════════════════════════════════════

function VistaEquipo({ equipo, registros, setRegistros }) {
  const [persona, setPersona] = useState("");
  const [form, setForm] = useState({ mensajes: "", turnos: "", senias: "", nota: "" });
  const [guardado, setGuardado] = useState(false);

  const miembro = equipo.find((x) => x.id === persona);
  const fechaHoy = hoy();

  // ver si ya cargó hoy
  const yaCargoHoy = persona && registros.some((r) => r.personaId === persona && r.fecha === fechaHoy);
  const registroHoy = registros.find((r) => r.personaId === persona && r.fecha === fechaHoy);

  const guardar = () => {
    if (!persona || !form.mensajes || !form.turnos || !form.senias) return;
    const nuevo = {
      id: Date.now(),
      personaId: persona,
      personaNombre: miembro.nombre,
      fecha: fechaHoy,
      mensajes: Number(form.mensajes),
      turnos: Number(form.turnos),
      senias: Number(form.senias),
      nota: form.nota,
      editado: yaCargoHoy ? new Date().toISOString() : null,
    };
    setRegistros((prev) => {
      // si ya existe hoy, reemplaza
      const sin = prev.filter((r) => !(r.personaId === persona && r.fecha === fechaHoy));
      return [nuevo, ...sin];
    });
    setGuardado(true);
  };

  const editar = () => {
    setForm({
      mensajes: String(registroHoy.mensajes),
      turnos: String(registroHoy.turnos),
      senias: String(registroHoy.senias),
      nota: registroHoy.nota || "",
    });
    setGuardado(false);
  };

  if (guardado) return (
    <div style={s.section}>
      <div style={{ ...s.card, textAlign: "center", padding: "36px 18px" }}>
        <div style={{ fontSize: 48, marginBottom: 8 }}>🎯</div>
        <div style={{ fontSize: 17, fontWeight: 700, color: C.violeta, marginBottom: 6 }}>¡Números guardados!</div>
        <div style={{ color: C.gris, fontSize: 13, marginBottom: 20 }}>
          {miembro?.nombre} — {new Date().toLocaleDateString("es-AR", { day: "2-digit", month: "long" })}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 20 }}>
          {[["💬", "Mensajes", form.mensajes], ["📅", "Turnos", form.turnos], ["🤝", "Señas", form.senias]].map(([e, l, v]) => (
            <div key={l} style={{ background: C.grisL, borderRadius: 10, padding: "12px 8px" }}>
              <div style={{ fontSize: 20 }}>{e}</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: C.violeta }}>{v}</div>
              <div style={{ fontSize: 11, color: C.gris }}>{l}</div>
            </div>
          ))}
        </div>
        <button style={s.btn("ghost")} onClick={() => { setPersona(""); setForm({ mensajes: "", turnos: "", senias: "", nota: "" }); setGuardado(false); }}>
          Volver al inicio
        </button>
      </div>
    </div>
  );

  return (
    <div style={s.section}>
      <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>Equipo comercial 💼</div>
      <div style={{ color: C.gris, fontSize: 13, marginBottom: 16 }}>Cargá tus números del día.</div>

      <div style={s.card}>
        <span style={s.label}>¿Quién sos?</span>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {equipo.map((m) => (
            <button key={m.id} onClick={() => { setPersona(m.id); setGuardado(false); setForm({ mensajes: "", turnos: "", senias: "", nota: "" }); }} style={{
              padding: "9px 16px", borderRadius: 20, border: `2px solid ${persona === m.id ? C.violeta : "#E5E7EB"}`,
              background: persona === m.id ? C.violetaL : C.blanco,
              color: persona === m.id ? C.violeta : C.texto,
              fontWeight: 700, cursor: "pointer", fontSize: 13, transition: "all .1s",
            }}>{m.nombre}</button>
          ))}
        </div>
      </div>

      {persona && yaCargoHoy && !registroHoy?.editado && (
        <div style={{ ...s.card, background: C.violetaL, border: `1px solid ${C.violeta}` }}>
          <div style={{ color: C.violeta, fontWeight: 700, fontSize: 13, marginBottom: 10 }}>
            ✓ Ya cargaste tus números hoy
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 12 }}>
            {[["💬", "Mensajes", registroHoy.mensajes], ["📅", "Turnos", registroHoy.turnos], ["🤝", "Señas", registroHoy.senias]].map(([e, l, v]) => (
              <div key={l} style={{ background: C.blanco, borderRadius: 8, padding: "10px 6px", textAlign: "center" }}>
                <div style={{ fontSize: 18 }}>{e}</div>
                <div style={{ fontSize: 17, fontWeight: 800, color: C.violeta }}>{v}</div>
                <div style={{ fontSize: 11, color: C.gris }}>{l}</div>
              </div>
            ))}
          </div>
          <button style={s.btn("ghost")} onClick={editar}>✏ Corregir números</button>
        </div>
      )}

      {persona && (!yaCargoHoy || registroHoy?.editado !== undefined) && !guardado && (
        <div style={s.card}>
          <div style={{ fontWeight: 700, fontSize: 14, color: C.violeta, marginBottom: 14 }}>
            {yaCargoHoy ? "Corregir números de hoy" : `Números de hoy — ${new Date().toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" })}`}
          </div>
          {[
            ["mensajes", "💬 Mensajes enviados"],
            ["turnos",   "📅 Turnos gestionados"],
            ["senias",   "🤝 Señas confirmadas"],
          ].map(([k, l]) => (
            <div key={k} style={{ marginBottom: 12 }}>
              <span style={s.label}>{l}</span>
              <input type="number" min="0" style={s.input} placeholder="0"
                value={form[k]} onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))} />
            </div>
          ))}
          <div style={{ marginBottom: 14 }}>
            <span style={s.label}>Nota (opcional)</span>
            <textarea rows={2} style={{ ...s.input, resize: "vertical" }} placeholder="Comentarios del día..."
              value={form.nota} onChange={(e) => setForm((f) => ({ ...f, nota: e.target.value }))} />
          </div>
          <button style={{ ...s.btn("purple"), opacity: (!form.mensajes || !form.turnos || !form.senias) ? 0.5 : 1 }}
            disabled={!form.mensajes || !form.turnos || !form.senias}
            onClick={guardar}>
            Guardar números
          </button>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// PANEL ILEANA – HISTORIAL VISITAS
// ══════════════════════════════════════════════════════════════════════════════

function HistorialPanel({ visitas, preguntas }) {
  const [expandida, setExpandida] = useState(null);
  const [filtroSuc, setFiltroSuc] = useState("");
  const [filtroFecha, setFiltroFecha] = useState("");

  const lista = visitas.filter((v) => {
    if (filtroSuc && v.sucursalNombre !== filtroSuc) return false;
    if (filtroFecha && !v.checkin.startsWith(filtroFecha)) return false;
    return true;
  });

  const sucursalesUnicas = [...new Set(visitas.map((v) => v.sucursalNombre))];
  let kmTotal = 0;
  const ordenadas = [...visitas].reverse();
  for (let i = 1; i < ordenadas.length; i++) {
    const a = ordenadas[i - 1], b = ordenadas[i];
    if (a.latCheckout && b.latCheckin)
      kmTotal += parseFloat(distanciaKm(a.latCheckout, a.lngCheckout, b.latCheckin, b.lngCheckin));
  }

  return (
    <div style={s.section}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 16 }}>
        {[["Visitas", visitas.length], ["Sucursales", new Set(visitas.map((v) => v.sucursalId)).size], ["Km aprox.", kmTotal.toFixed(0)]].map(([l, v]) => (
          <div key={l} style={{ background: C.blanco, borderRadius: 12, padding: "12px 8px", textAlign: "center", boxShadow: C.sombra }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: C.verde }}>{v}</div>
            <div style={{ fontSize: 11, color: C.gris, fontWeight: 600 }}>{l}</div>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        <select style={{ ...s.select, flex: 1, padding: "8px 10px", fontSize: 12 }} value={filtroSuc} onChange={(e) => setFiltroSuc(e.target.value)}>
          <option value="">Todas</option>
          {sucursalesUnicas.map((n) => <option key={n}>{n}</option>)}
        </select>
        <input type="date" style={{ ...s.input, width: 130, padding: "8px 10px", fontSize: 12 }} value={filtroFecha} onChange={(e) => setFiltroFecha(e.target.value)} />
      </div>
      {lista.length === 0 && <div style={{ ...s.card, textAlign: "center", color: C.gris }}>Sin visitas registradas.</div>}
      {lista.map((v) => {
        const dur = duracion(v.checkin, v.checkout);
        const open = expandida === v.id;
        return (
          <div key={v.id} style={{ ...s.card, padding: 0, overflow: "hidden" }}>
            <div style={{ padding: "12px 14px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}
              onClick={() => setExpandida(open ? null : v.id)}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13 }}>{v.sucursalNombre}</div>
                <div style={{ fontSize: 11, color: C.gris, marginTop: 2 }}>
                  {fmtFecha(v.checkin)} · {fmtHora(v.checkin)} → {v.checkout ? fmtHora(v.checkout) : "en curso"}
                  {dur && <span style={{ marginLeft: 5, color: C.verdeL }}>({dur})</span>}
                </div>
              </div>
              <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
                <span style={s.badge(v.gpsOkCheckin ? "verde" : "rojo")}>{v.gpsOkCheckin ? "✓ GPS" : "⚠ GPS"}</span>
                <span style={{ color: C.gris }}>{open ? "▲" : "▼"}</span>
              </div>
            </div>
            {open && (
              <div style={{ borderTop: "1px solid #F3F4F6", padding: "12px 14px", background: "#FAFAFA" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
                  {[["Entrada", fmtHora(v.checkin), v.gpsOkCheckin, v.distCheckin],
                    ["Salida", fmtHora(v.checkout), v.gpsOkCheckout, v.distCheckout]].map(([l, h, ok, dist]) => (
                    <div key={l} style={{ background: C.blanco, borderRadius: 8, padding: "9px 11px" }}>
                      <span style={s.label}>{l}</span>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{h}</div>
                      {dist != null && <div style={{ fontSize: 11, color: ok ? C.verde : C.rojo, marginTop: 2 }}>{ok ? `✓ ${dist}m` : `⚠ ${dist}m`}</div>}
                    </div>
                  ))}
                </div>
                {preguntas.length > 0 && Object.keys(v.respuestas || {}).length > 0 && (
                  <div>
                    <span style={{ ...s.label, marginBottom: 8 }}>Encuesta</span>
                    {preguntas.map((p) => {
                      const r = v.respuestas?.[p.id];
                      if (!r) return null;
                      return (
                        <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 7, fontSize: 12 }}>
                          <span style={{ color: C.gris, flex: 1, marginRight: 8, lineHeight: 1.4 }}>{p.texto}</span>
                          {p.tipo === "bool"
                            ? <span style={s.badge(r === "Sí" ? "verde" : "rojo")}>{r}</span>
                            : <span style={{ fontStyle: "italic", maxWidth: "45%", textAlign: "right" }}>{r}</span>}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// PANEL ILEANA – GESTIÓN COMERCIAL
// ══════════════════════════════════════════════════════════════════════════════

function GestionComercialPanel({ registros, equipo, meta, setMeta }) {
  const [subTab, setSubTab] = useState("resumen"); // resumen | detalle | metas
  const [mes, setMes] = useState(mesActual);
  const [personaFiltro, setPersonaFiltro] = useState("todos");

  const regMes = registros.filter((r) => r.fecha.startsWith(mes));

  // totales por persona
  const totalesPorPersona = equipo.map((m) => {
    const regs = regMes.filter((r) => r.personaId === m.id);
    const tot = regs.reduce((a, r) => ({
      mensajes: a.mensajes + r.mensajes,
      turnos:   a.turnos   + r.turnos,
      senias:   a.senias   + r.senias,
    }), { mensajes: 0, turnos: 0, senias: 0 });
    const pctSenias = tot.turnos > 0 ? ((tot.senias / tot.turnos) * 100).toFixed(0) : 0;
    const diasCargados = regs.length;
    // premio: señas sobre meta → monto libre por seña extra
    const seniasExtra = Math.max(0, tot.senias - meta.senias);
    const premio = seniasExtra * meta.premioPorSenia;
    return { ...m, ...tot, pctSenias, diasCargados, premio, regs };
  });

  const regFiltrados = regMes.filter((r) => personaFiltro === "todos" || r.personaId === personaFiltro)
    .sort((a, b) => b.fecha.localeCompare(a.fecha));

  return (
    <div style={s.section}>
      {/* sub-navegación */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {[["resumen", "📊 Resumen"], ["detalle", "📋 Detalle"], ["metas", "🎯 Metas"]].map(([t, l]) => (
          <button key={t} onClick={() => setSubTab(t)} style={{
            flex: 1, padding: "8px 0", borderRadius: 8, border: `2px solid ${subTab === t ? C.violeta : "#E5E7EB"}`,
            background: subTab === t ? C.violetaL : C.blanco,
            color: subTab === t ? C.violeta : C.gris,
            fontWeight: 700, cursor: "pointer", fontSize: 12,
          }}>{l}</button>
        ))}
      </div>

      {/* SELECTOR MES */}
      <div style={{ marginBottom: 14 }}>
        <input type="month" style={{ ...s.input, fontSize: 13 }} value={mes} onChange={(e) => setMes(e.target.value)} />
      </div>

      {/* ── RESUMEN ── */}
      {subTab === "resumen" && (
        <div>
          {totalesPorPersona.map((p) => {
            const pctMsg = meta.mensajes > 0 ? Math.min(100, (p.mensajes / meta.mensajes) * 100) : 0;
            const pctTur = meta.turnos   > 0 ? Math.min(100, (p.turnos   / meta.turnos)   * 100) : 0;
            const pctSen = meta.senias   > 0 ? Math.min(100, (p.senias   / meta.senias)   * 100) : 0;
            const cumple = p.senias >= meta.senias;
            return (
              <div key={p.id} style={s.card}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 15 }}>{p.nombre}</div>
                    <div style={{ fontSize: 11, color: C.gris }}>{p.rol} · {p.diasCargados} días cargados</div>
                  </div>
                  <span style={s.badge(cumple ? "purple" : "amarillo")}>{cumple ? "✓ Meta" : "En progreso"}</span>
                </div>

                {/* barras de progreso */}
                {[
                  ["💬 Mensajes", p.mensajes, meta.mensajes, pctMsg],
                  ["📅 Turnos",   p.turnos,   meta.turnos,   pctTur],
                  ["🤝 Señas",    p.senias,   meta.senias,   pctSen],
                ].map(([lbl, val, met, pct]) => (
                  <div key={lbl} style={{ marginBottom: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                      <span style={{ color: C.gris }}>{lbl}</span>
                      <span style={{ fontWeight: 700 }}>{val} <span style={{ color: C.gris, fontWeight: 400 }}>/ {met}</span></span>
                    </div>
                    <div style={{ background: C.grisL, borderRadius: 99, height: 7, overflow: "hidden" }}>
                      <div style={{
                        height: "100%", borderRadius: 99, transition: "width .3s",
                        width: `${pct}%`,
                        background: pct >= 100 ? C.violeta : pct >= 60 ? C.verdeL : C.amarillo,
                      }} />
                    </div>
                  </div>
                ))}

                {/* conversión y premio */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 12 }}>
                  <div style={{ background: C.grisL, borderRadius: 10, padding: "10px 12px" }}>
                    <div style={{ fontSize: 11, color: C.gris }}>Conversión señas/turnos</div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: C.violeta }}>{p.pctSenias}%</div>
                  </div>
                  <div style={{ background: p.premio > 0 ? C.violetaL : C.grisL, borderRadius: 10, padding: "10px 12px" }}>
                    <div style={{ fontSize: 11, color: C.gris }}>Premio estimado</div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: p.premio > 0 ? C.violeta : C.gris }}>
                      ${p.premio.toLocaleString("es-AR")}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── DETALLE ── */}
      {subTab === "detalle" && (
        <div>
          <div style={{ marginBottom: 12 }}>
            <select style={{ ...s.select, fontSize: 13 }} value={personaFiltro} onChange={(e) => setPersonaFiltro(e.target.value)}>
              <option value="todos">Todos</option>
              {equipo.map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
            </select>
          </div>
          {regFiltrados.length === 0 && <div style={{ ...s.card, textAlign: "center", color: C.gris }}>Sin registros en este período.</div>}
          {regFiltrados.map((r) => (
            <div key={r.id} style={{ ...s.card, padding: "12px 14px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <div>
                  <span style={{ fontWeight: 700, fontSize: 13 }}>{r.personaNombre}</span>
                  <span style={{ fontSize: 12, color: C.gris, marginLeft: 8 }}>{fmtFecha(r.fecha)}</span>
                </div>
                {r.editado && <span style={s.badge("amarillo")}>editado</span>}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
                {[["💬", "Mensajes", r.mensajes], ["📅", "Turnos", r.turnos], ["🤝", "Señas", r.senias]].map(([e, l, v]) => (
                  <div key={l} style={{ background: C.grisL, borderRadius: 8, padding: "8px 6px", textAlign: "center" }}>
                    <div style={{ fontSize: 14 }}>{e}</div>
                    <div style={{ fontWeight: 800, fontSize: 15, color: C.violeta }}>{v}</div>
                    <div style={{ fontSize: 10, color: C.gris }}>{l}</div>
                  </div>
                ))}
              </div>
              {r.nota && <div style={{ fontSize: 12, color: C.gris, marginTop: 8, fontStyle: "italic" }}>"{r.nota}"</div>}
            </div>
          ))}
        </div>
      )}

      {/* ── METAS ── */}
      {subTab === "metas" && (
        <div style={s.card}>
          <div style={{ fontWeight: 700, fontSize: 14, color: C.violeta, marginBottom: 16 }}>Metas mensuales del equipo</div>
          {[
            ["mensajes", "💬 Meta mensual de mensajes"],
            ["turnos",   "📅 Meta mensual de turnos"],
            ["senias",   "🤝 Meta mensual de señas"],
            ["premioPorSenia", "💰 Premio por seña sobre meta ($)"],
          ].map(([k, l]) => (
            <div key={k} style={{ marginBottom: 14 }}>
              <span style={s.label}>{l}</span>
              <input type="number" min="0" style={s.input}
                value={meta[k]}
                onChange={(e) => setMeta((m) => ({ ...m, [k]: Number(e.target.value) }))}
              />
            </div>
          ))}
          <div style={{ ...s.card, background: C.violetaL, padding: "12px 14px", marginBottom: 0 }}>
            <div style={{ fontSize: 12, color: C.violeta, lineHeight: 1.5 }}>
              <strong>Cómo funciona el premio:</strong> cada seña que supere la meta mensual suma ${meta.premioPorSenia.toLocaleString("es-AR")}. 
              El resultado se muestra en el resumen por persona.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// PANEL ILEANA – ENCUESTA
// ══════════════════════════════════════════════════════════════════════════════

function EncuestaPanel({ preguntas, setPreguntas }) {
  const [nueva, setNueva] = useState("");
  const [tipo, setTipo] = useState("bool");
  const [editandoId, setEditandoId] = useState(null);
  const [editTexto, setEditTexto] = useState("");

  return (
    <div style={s.section}>
      <div style={s.card}>
        <div style={{ fontWeight: 700, fontSize: 14, color: C.verde, marginBottom: 12 }}>Nueva pregunta</div>
        <div style={{ marginBottom: 10 }}>
          <span style={s.label}>Texto</span>
          <input style={s.input} placeholder="¿Ej: Verificó apertura de caja?" value={nueva} onChange={(e) => setNueva(e.target.value)} />
        </div>
        <div style={{ marginBottom: 12 }}>
          <span style={s.label}>Tipo de respuesta</span>
          <div style={{ display: "flex", gap: 8 }}>
            {[["bool", "Sí / No"], ["texto", "Texto libre"]].map(([v, l]) => (
              <button key={v} onClick={() => setTipo(v)} style={{
                flex: 1, padding: "8px 0", borderRadius: 8,
                border: `2px solid ${tipo === v ? C.verde : "#E5E7EB"}`,
                background: tipo === v ? C.menta : C.blanco,
                color: tipo === v ? C.verde : C.texto,
                fontWeight: 600, cursor: "pointer", fontSize: 12,
              }}>{l}</button>
            ))}
          </div>
        </div>
        <button style={s.btn()} onClick={() => { if (!nueva.trim()) return; setPreguntas((p) => [...p, { id: Date.now(), texto: nueva.trim(), tipo }]); setNueva(""); }}>
          + Agregar pregunta
        </button>
      </div>
      <span style={{ ...s.label, marginBottom: 10 }}>Preguntas actuales ({preguntas.length})</span>
      {preguntas.map((p, i) => (
        <div key={p.id} style={{ ...s.card, padding: "11px 13px" }}>
          {editandoId === p.id ? (
            <div>
              <input style={{ ...s.input, marginBottom: 8 }} value={editTexto} onChange={(e) => setEditTexto(e.target.value)} />
              <div style={{ display: "flex", gap: 8 }}>
                <button style={s.btnSm()} onClick={() => { setPreguntas((pp) => pp.map((x) => x.id === p.id ? { ...x, texto: editTexto } : x)); setEditandoId(null); }}>Guardar</button>
                <button style={s.btnSm("ghost")} onClick={() => setEditandoId(null)}>Cancelar</button>
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: 11, color: C.gris, marginRight: 5 }}>{i + 1}.</span>
                <span style={{ fontSize: 13 }}>{p.texto}</span>
                <span style={{ marginLeft: 7, ...s.badge(p.tipo === "bool" ? "verde" : "amarillo") }}>{p.tipo === "bool" ? "Sí/No" : "Texto"}</span>
              </div>
              <div style={{ display: "flex", gap: 5, flexShrink: 0 }}>
                <button style={s.btnSm("ghost")} onClick={() => { setEditandoId(p.id); setEditTexto(p.texto); }}>✏</button>
                <button style={s.btnSm("danger")} onClick={() => setPreguntas((pp) => pp.filter((x) => x.id !== p.id))}>✕</button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// PANEL ILEANA – SUCURSALES
// ══════════════════════════════════════════════════════════════════════════════

function SucursalesPanel({ sucursales, setSucursales }) {
  const [nueva, setNueva] = useState({ nombre: "", lat: "", lng: "" });
  const [editandoId, setEditandoId] = useState(null);
  const [editDatos, setEditDatos] = useState({});

  return (
    <div style={s.section}>
      <div style={s.card}>
        <div style={{ fontWeight: 700, fontSize: 14, color: C.verde, marginBottom: 12 }}>Nueva sucursal</div>
        {[["nombre", "Nombre", "text", "Ej: Sucursal Palermo"], ["lat", "Latitud", "number", "-34.6037"], ["lng", "Longitud", "number", "-58.3816"]].map(([k, l, t, ph]) => (
          <div key={k} style={{ marginBottom: 10 }}>
            <span style={s.label}>{l}</span>
            <input type={t} style={s.input} placeholder={ph} value={nueva[k]} onChange={(e) => setNueva((n) => ({ ...n, [k]: e.target.value }))} />
          </div>
        ))}
        <button style={s.btn()} onClick={() => {
          if (!nueva.nombre.trim() || !nueva.lat || !nueva.lng) return;
          setSucursales((ss) => [...ss, { id: Date.now(), nombre: nueva.nombre.trim(), lat: parseFloat(nueva.lat), lng: parseFloat(nueva.lng) }]);
          setNueva({ nombre: "", lat: "", lng: "" });
        }}>+ Agregar sucursal</button>
      </div>
      {sucursales.map((suc) => (
        <div key={suc.id} style={{ ...s.card, padding: "11px 13px" }}>
          {editandoId === suc.id ? (
            <div>
              {[["nombre", "Nombre", "text"], ["lat", "Latitud", "number"], ["lng", "Longitud", "number"]].map(([k, l, t]) => (
                <div key={k} style={{ marginBottom: 8 }}>
                  <span style={s.label}>{l}</span>
                  <input type={t} style={s.input} value={editDatos[k]} onChange={(e) => setEditDatos((d) => ({ ...d, [k]: e.target.value }))} />
                </div>
              ))}
              <div style={{ display: "flex", gap: 8 }}>
                <button style={s.btnSm()} onClick={() => { setSucursales((ss) => ss.map((x) => x.id === suc.id ? { ...x, ...editDatos, lat: parseFloat(editDatos.lat), lng: parseFloat(editDatos.lng) } : x)); setEditandoId(null); }}>Guardar</button>
                <button style={s.btnSm("ghost")} onClick={() => setEditandoId(null)}>Cancelar</button>
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{suc.nombre}</div>
                <div style={{ fontSize: 11, color: C.gris }}>{suc.lat}, {suc.lng}</div>
              </div>
              <div style={{ display: "flex", gap: 5 }}>
                <button style={s.btnSm("ghost")} onClick={() => { setEditandoId(suc.id); setEditDatos({ nombre: suc.nombre, lat: suc.lat, lng: suc.lng }); }}>✏</button>
                <button style={s.btnSm("danger")} onClick={() => setSucursales((ss) => ss.filter((x) => x.id !== suc.id))}>✕</button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// PANEL ILEANA – KM
// ══════════════════════════════════════════════════════════════════════════════

function KmPanel({ visitas }) {
  const [mes, setMes] = useState(mesActual);
  const filtradas = visitas.filter((v) => v.checkin.startsWith(mes) && v.checkout)
    .sort((a, b) => new Date(a.checkin) - new Date(b.checkin));

  let kmAcum = 0;
  const filas = filtradas.map((v, i) => {
    let km = null;
    if (i > 0) {
      const prev = filtradas[i - 1];
      if (prev.latCheckout && v.latCheckin) {
        km = parseFloat(distanciaKm(prev.latCheckout, prev.lngCheckout, v.latCheckin, v.lngCheckin));
        kmAcum += km;
      }
    }
    return { ...v, km };
  });

  return (
    <div style={s.section}>
      <div style={{ marginBottom: 14 }}>
        <input type="month" style={{ ...s.input, fontSize: 13 }} value={mes} onChange={(e) => setMes(e.target.value)} />
      </div>
      <div style={{ ...s.card, background: C.verde, color: C.blanco, textAlign: "center" }}>
        <div style={{ fontSize: 34, fontWeight: 800 }}>{kmAcum.toFixed(1)} km</div>
        <div style={{ fontSize: 12, opacity: 0.8 }}>estimados · {filtradas.length} visitas</div>
      </div>
      {filas.length === 0 && <div style={{ ...s.card, textAlign: "center", color: C.gris }}>Sin visitas en este período.</div>}
      {filas.map((v) => (
        <div key={v.id} style={{ ...s.card, padding: "11px 13px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 13 }}>{v.sucursalNombre}</div>
              <div style={{ fontSize: 11, color: C.gris }}>{fmtFecha(v.checkin)}</div>
            </div>
            {v.km != null
              ? <span style={s.badge("verde")}>{v.km} km</span>
              : <span style={{ fontSize: 12, color: C.gris }}>origen</span>}
          </div>
        </div>
      ))}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ROOT
// ══════════════════════════════════════════════════════════════════════════════

export default function App() {
  const [vista, setVista] = useState("adrian");
  const [tabIleana, setTabIleana] = useState("historial");

  const [visitas,    setVisitas]    = useLocalStorage("bv_visitas",    []);
  const [preguntas,  setPreguntas]  = useLocalStorage("bv_preguntas",  PREGUNTAS_INIT);
  const [sucursales, setSucursales] = useLocalStorage("bv_sucursales", SUCURSALES_INIT);
  const [equipo]                    = useLocalStorage("bv_equipo",     EQUIPO_INIT);
  const [registros,  setRegistros]  = useLocalStorage("bv_registros",  []);
  const [meta,       setMeta]       = useLocalStorage("bv_meta",       META_INIT);

  const VISTAS_HEADER = [
    ["adrian",  "🗺 Adrián"],
    ["equipo",  "💼 Equipo"],
    ["ileana",  "👩‍💼 Panel Ileana"],
  ];

  const TABS_ILEANA = [
    ["historial", "📋 Visitas"],
    ["gestion",   "💜 Comercial"],
    ["encuesta",  "📝 Encuesta"],
    ["sucursales","📍 Sucursales"],
    ["km",        "🚗 Km"],
  ];

  return (
    <div style={s.app}>
      <div style={s.header}>
        <div style={s.logo}>🌿 Bella Vita</div>
        <div style={s.headerTabs}>
          {VISTAS_HEADER.map(([v, l]) => (
            <button key={v} style={s.tab(vista === v)} onClick={() => setVista(v)}>{l}</button>
          ))}
        </div>
      </div>

      {vista === "adrian" && (
        <VistaAdrian sucursales={sucursales} preguntas={preguntas} visitas={visitas} setVisitas={setVisitas} />
      )}

      {vista === "equipo" && (
        <VistaEquipo equipo={equipo} registros={registros} setRegistros={setRegistros} />
      )}

      {vista === "ileana" && (
        <>
          <div style={s.subTabs}>
            {TABS_ILEANA.map(([t, l]) => (
              <button key={t} style={s.subTab(tabIleana === t)} onClick={() => setTabIleana(t)}>{l}</button>
            ))}
          </div>
          {tabIleana === "historial"   && <HistorialPanel visitas={visitas} preguntas={preguntas} />}
          {tabIleana === "gestion"     && <GestionComercialPanel registros={registros} equipo={equipo} meta={meta} setMeta={setMeta} />}
          {tabIleana === "encuesta"    && <EncuestaPanel preguntas={preguntas} setPreguntas={setPreguntas} />}
          {tabIleana === "sucursales"  && <SucursalesPanel sucursales={sucursales} setSucursales={setSucursales} />}
          {tabIleana === "km"          && <KmPanel visitas={visitas} />}
        </>
      )}
    </div>
  );
}
