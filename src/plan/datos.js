import { FRANJAS, RECORRIDAS_ABIERTAS } from "../constants";
import { diasDesde, fechaLocal, inicioSemana } from "../utils";

// ══════════════════════════════════════════════════════════════════════════════
// DERIVACIONES DEL PLAN DE RECORRIDAS
//
// Sin JSX y sin fetch, para poder testearlo aparte. Lo usan MisRecorridas,
// PlanPanel, ArmarPlan y el DashboardPanel (para el % de cumplimiento).
// ══════════════════════════════════════════════════════════════════════════════

const ORDEN_FRANJA = Object.fromEntries(FRANJAS.map((f, i) => [f.id, i]));
export const ordenFranja = (franja) => ORDEN_FRANJA[franja] ?? 9;

// ─── Meses ───────────────────────────────────────────────────────────────────

const MESES = ["enero","febrero","marzo","abril","mayo","junio",
               "julio","agosto","septiembre","octubre","noviembre","diciembre"];

export function nombreMes(mes) {
  const m = /^(\d{4})-(\d{2})$/.exec(String(mes || ""));
  if (!m) return String(mes || "");
  return `${MESES[Number(m[2]) - 1] || "?"} ${m[1]}`;
}

export function mesDesplazado(mes, delta) {
  const m = /^(\d{4})-(\d{2})$/.exec(String(mes || ""));
  if (!m) return mes;
  const d = new Date(Number(m[1]), Number(m[2]) - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export const mesSiguiente = (mes) => mesDesplazado(mes, 1);
export const mesAnterior  = (mes) => mesDesplazado(mes, -1);

// ─── Estado derivado ─────────────────────────────────────────────────────────

// "incumplida" no existe en la base: es una recorrida todavía abierta cuya
// fecha ya pasó. Mismo criterio que "vencido" en pendientes.
export function estadoDerivado(recorrida, ref = new Date()) {
  if (!recorrida) return "pendiente";
  if (recorrida.estado === "realizada") return "realizada";
  if (recorrida.estado === "cancelada") return "cancelada";
  if (!RECORRIDAS_ABIERTAS.includes(recorrida.estado)) return "pendiente";
  const dias = diasDesde(recorrida.fechaPlan, ref);
  return dias !== null && dias > 0 ? "incumplida" : "pendiente";
}

export const esHoy = (recorrida, ref = new Date()) =>
  !!recorrida?.fechaPlan && recorrida.fechaPlan === fechaLocal(ref);

// ─── Agenda por semana ───────────────────────────────────────────────────────

// Agrupa las recorridas en semanas de lunes a domingo. Devuelve sólo las
// semanas que tienen algo, ordenadas, con las recorridas ya ordenadas por
// fecha y franja.
export function agruparPorSemana(recorridas = [], ref = new Date()) {
  const semanas = new Map();

  for (const r of recorridas) {
    if (!r.fechaPlan) continue;
    const lunes = inicioSemana(`${r.fechaPlan}T00:00:00`);
    const clave = fechaLocal(lunes);
    if (!semanas.has(clave)) {
      const domingo = new Date(lunes);
      domingo.setDate(domingo.getDate() + 6);
      semanas.set(clave, {
        clave,
        inicio: clave,
        fin: fechaLocal(domingo),
        esActual: clave === fechaLocal(inicioSemana(ref)),
        recorridas: [],
      });
    }
    semanas.get(clave).recorridas.push(r);
  }

  return [...semanas.values()]
    .sort((a, b) => a.clave.localeCompare(b.clave))
    .map(s => ({
      ...s,
      recorridas: [...s.recorridas].sort((a, b) =>
        a.fechaPlan.localeCompare(b.fechaPlan) || ordenFranja(a.franja) - ordenFranja(b.franja)
      ),
    }));
}

// ─── Cobertura ───────────────────────────────────────────────────────────────

// Qué sucursales tienen al menos una recorrida no cancelada en el mes.
// Es la validación del armado: avisa, no bloquea.
export function cobertura(sucursales = [], recorridas = []) {
  const conPlan = new Set(
    recorridas.filter(r => r.estado !== "cancelada").map(r => String(r.sucursalId))
  );
  const faltantes = sucursales.filter(s => !conPlan.has(String(s.id)));
  return {
    cubiertas: sucursales.length - faltantes.length,
    total: sucursales.length,
    faltantes,
    completa: faltantes.length === 0,
  };
}

// Sucursales efectivamente visitadas en el mes, según las visitas reales.
// Es distinto de la cobertura del plan: esto es lo que pasó, no lo que se
// había planificado.
export function coberturaReal(sucursales = [], visitas = [], mes) {
  const ids = new Set(sucursales.map(s => String(s.id)));
  const visitadas = new Set();
  for (const v of visitas) {
    const f = fechaLocal(v.checkin);
    if (!f || !f.startsWith(mes)) continue;
    if (ids.has(String(v.sucursalId))) visitadas.add(String(v.sucursalId));
  }
  return { visitadas: visitadas.size, total: sucursales.length };
}

// ─── Cumplimiento ────────────────────────────────────────────────────────────

// Cuánto del plan se cumplió. Las canceladas salen del denominador: no se
// incumplió algo que se dio de baja a propósito.
// Esta es la única definición de "cumplido" del sistema — el dashboard la
// importa de acá en vez de recalcularla.
export function cumplimientoPlan(recorridas = [], ref = new Date()) {
  const vigentes = recorridas.filter(r => r.estado !== "cancelada");
  const conteo = { realizada: 0, pendiente: 0, incumplida: 0, cancelada: 0 };
  for (const r of recorridas) conteo[estadoDerivado(r, ref)]++;

  const total = vigentes.length;
  return {
    total,
    realizadas: conteo.realizada,
    pendientes: conteo.pendiente,
    incumplidas: conteo.incumplida,
    canceladas: conteo.cancelada,
    reprogramadas: recorridas.filter(r => !!r.fechaPlanOriginal).length,
    // Sobre el total del plan, no sobre lo que ya venció: es "cuánto del mes
    // está hecho", que es lo que se quiere ver en el dashboard.
    pct: total > 0 ? Math.round((conteo.realizada / total) * 100) : null,
    hayPlan: recorridas.length > 0,
  };
}

// ─── Recorridas de hoy ───────────────────────────────────────────────────────

export function recorridasDeHoy(recorridas = [], ref = new Date()) {
  return recorridas
    .filter(r => esHoy(r, ref) && RECORRIDAS_ABIERTAS.includes(r.estado))
    .sort((a, b) => ordenFranja(a.franja) - ordenFranja(b.franja));
}
