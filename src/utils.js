import { useState } from "react";
import { ESTADOS_CERRADOS } from "./constants";

// ─── HELPERS ────────────────────────────────────────────────────────────────
export function distanciaM(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}
export function distanciaKm(lat1,lng1,lat2,lng2){ return (distanciaM(lat1,lng1,lat2,lng2)/1000).toFixed(1); }
export function fmtHora(iso){ if(!iso)return"—"; return new Date(iso).toLocaleTimeString("es-AR",{hour:"2-digit",minute:"2-digit"}); }
export function fmtFecha(iso){ if(!iso)return"—"; return new Date(iso).toLocaleDateString("es-AR",{day:"2-digit",month:"2-digit",year:"numeric"}); }
export function duracion(a,b){ if(!a||!b)return null; const m=Math.round((new Date(b)-new Date(a))/60000); return m<60?(m+" min"):(Math.floor(m/60)+"h "+( m%60)+"min"); }
// ─── FECHAS EN HORA LOCAL ────────────────────────────────────────────────────
// toISOString devuelve UTC: en Argentina (UTC-3) después de las 21:00 daba la
// fecha de mañana, así que un registro cargado a la noche quedaba con el día
// equivocado. Todo lo que sea "qué día es" pasa por acá.

// Una fecha cualquiera → "YYYY-MM-DD" en hora local
export function fechaLocal(x) {
  if (!x) return null;
  const d = new Date(x);
  if (isNaN(d)) return null;
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
export function hoy(){ return fechaLocal(new Date()); }
export function mesActual(){ return hoy().slice(0,7); }

// Medianoche local de una fecha, para comparar días sin que la hora moleste
function medianoche(x) {
  const d = new Date(x);
  if (isNaN(d)) return null;
  d.setHours(0, 0, 0, 0);
  return d;
}

// Días completos transcurridos desde una fecha hasta hoy.
// Positivo = pasado, negativo = futuro, null = sin fecha o fecha inválida.
// Compara medianoche contra medianoche: algo de ayer a las 23:00 es 1 día, no 0.
export function diasDesde(fecha, ref = new Date()) {
  if (!fecha) return null;
  const s = String(fecha);
  // Hay que distinguir dos cosas que llegan acá:
  //   · "YYYY-MM-DD" es una fecha de calendario (columnas DATE como fecha_limite
  //     o fecha_plan). Se interpreta en hora local, sin correrla de día.
  //   · un timestamp completo (checkin) se lleva a su medianoche LOCAL. Recortarlo
  //     a 10 caracteres daría la fecha UTC: una visita de ayer a las 23:00 en
  //     Argentina tiene ISO de hoy, y contaría 0 días en vez de 1.
  const base = /^\d{4}-\d{2}-\d{2}$/.test(s) ? `${s}T00:00:00` : fecha;
  const a = medianoche(base);
  const b = medianoche(ref);
  if (!a || !b) return null;
  return Math.round((b - a) / 86400000);
}

// Lunes 00:00 de la semana de `ref`, en hora local.
// No se reusa semanaKey(): ésa calcula la rotación de rubros del inventario,
// que es otra cosa y arranca los años en otro día.
export function inicioSemana(ref = new Date()) {
  const d = medianoche(ref);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));   // lunes → 0, domingo → 6
  return d;
}

// ─── PENDIENTES: vencimientos ────────────────────────────────────────────────
// Días desde hoy hasta la fecha límite. Negativo = vencido, null = sin fecha.
// Es exactamente el inverso de diasDesde, así que se deriva en vez de repetir
// la aritmética de fechas.
export function diasRestantes(fechaLimite) {
  const d = diasDesde(fechaLimite);
  return d === null ? null : -d;
}

export function estaVencido(pendiente) {
  if (!pendiente || ESTADOS_CERRADOS.includes(pendiente.estado)) return false;
  const d = diasRestantes(pendiente.fechaLimite);
  return d !== null && d < 0;
}

// "Vence hoy" / "Vencido hace 3 días" / "Faltan 5 días"
export function textoVencimiento(fechaLimite) {
  const d = diasRestantes(fechaLimite);
  if (d === null) return null;
  if (d === 0) return "Vence hoy";
  if (d < 0) return `Vencido hace ${Math.abs(d)} ${Math.abs(d) === 1 ? "día" : "días"}`;
  return `Faltan ${d} ${d === 1 ? "día" : "días"}`;
}

export function useLocalStorage(key, init) {
  const [val, setVal] = useState(() => { try { return JSON.parse(localStorage.getItem(key))??init; } catch { return init; } });
  const set = (v) => { const next=typeof v==="function"?v(val):v; setVal(next); localStorage.setItem(key,JSON.stringify(next)); };
  return [val, set];
}

// ─── GPS HOOK ────────────────────────────────────────────────────────────────
export function useGPS() {
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [sinPermiso, setSinPermiso] = useState(false);
  const obtener = () => new Promise((res,rej) => {
    setLoading(true); setError(null); setSinPermiso(false);
    navigator.geolocation.getCurrentPosition(
      (p) => { setLoading(false); res(p.coords); },
      (e) => { setLoading(false); if(e.code===1||e.message?.toLowerCase().includes("permission")){ setSinPermiso(true); rej(e); } else { setError(e.message); rej(e); } },
      { enableHighAccuracy:true, timeout:8000 }
    );
  });
  const simular = (suc) => ({ latitude:(suc?.lat??-34.6037)+(Math.random()-.5)*.001, longitude:(suc?.lng??-58.3816)+(Math.random()-.5)*.001, simulado:true });
  return { error, loading, sinPermiso, setSinPermiso, obtener, simular };
}

// ─── INVENTARIO: rubro rotativo por semana ───────────────────────────────────
// Calcula qué rubro corresponde esta semana del mes.
//
// El módulo va contra rubros.length y no contra un 4 escrito a mano: con el
// número fijo, sumar un quinto rubro lo dejaba en un índice inalcanzable y el
// cambio no hacía nada.
//
// ⚠ La semana del mes va de 1 a 5, pero la quinta son sólo los días 29 a 31, así
// que el quinto rubro toca 3 días por mes y ninguno en febrero. Los otros cuatro
// conservan exactamente la semana que tenían. Si Niza necesita el mismo peso que
// el resto, hay que rotar por semana corrida del año —como semanaKey()— en vez
// de por semana del mes, y eso mueve el calendario de los otros cuatro.
export function rubroSemanaActual() {
  const hoyDate = new Date();
  const semanaDelMes = Math.ceil(hoyDate.getDate() / 7);
  const rubros = ["General", "Depilación", "Médico", "Limpiezas y masajes", "Productos Niza"];
  return rubros[(semanaDelMes - 1) % rubros.length];
}

export function semanaKey() {
  // Clave única para semana del año + año (ej: "2026-W30")
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const semana = Math.ceil(((now - start) / 86400000 + start.getDay() + 1) / 7);
  return `${now.getFullYear()}-W${semana}`;
}
