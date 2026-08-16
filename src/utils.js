import { useState } from "react";

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
// toISOString devuelve UTC: en Argentina (UTC-3) después de las 21:00 daba la
// fecha de mañana, así que un registro cargado a la noche quedaba con el día
// equivocado. Estas dos van por hora local.
export function hoy(){
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
export function mesActual(){ return hoy().slice(0,7); }

// ─── PENDIENTES: vencimientos ────────────────────────────────────────────────
// Días desde hoy hasta la fecha límite. Negativo = vencido, null = sin fecha.
export function diasRestantes(fechaLimite) {
  if (!fechaLimite) return null;
  const limite = new Date(`${String(fechaLimite).slice(0, 10)}T00:00:00`);
  if (isNaN(limite)) return null;
  const hoyD = new Date();
  hoyD.setHours(0, 0, 0, 0);
  return Math.round((limite - hoyD) / 86400000);
}

export function estaVencido(pendiente) {
  if (!pendiente || ["resuelto", "cancelado"].includes(pendiente.estado)) return false;
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
// Calcula qué rubro corresponde esta semana del mes (1-4)
export function rubroSemanaActual() {
  const hoyDate = new Date();
  const semanaDelMes = Math.ceil(hoyDate.getDate() / 7);
  const rubros = ["General", "Depilación", "Médico", "Limpiezas y masajes"];
  return rubros[(semanaDelMes - 1) % 4];
}

export function semanaKey() {
  // Clave única para semana del año + año (ej: "2026-W30")
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const semana = Math.ceil(((now - start) / 86400000 + start.getDay() + 1) / 7);
  return `${now.getFullYear()}-W${semana}`;
}
