import { ESTADOS_CERRADOS } from "../constants";
import { estaVencido } from "../utils";

// ══════════════════════════════════════════════════════════════════════════════
// DERIVACIONES DEL DASHBOARD
//
// Todo el cálculo del dashboard vive acá, sin JSX y sin fetch, para poder
// testearlo aparte. DashboardPanel sólo pinta lo que estas funciones devuelven.
//
// Las 7 sucursales viven en localStorage (bv_sucursales), no en la base, así
// que el cruce contra visitas y pendientes pasa necesariamente en el cliente:
// un GROUP BY en Postgres no podría producir la fila de una sucursal que nunca
// fue visitada, que es justo el caso que el semáforo tiene que mostrar.
// ══════════════════════════════════════════════════════════════════════════════

// Ventana móvil para "sin visita reciente" y para las alertas
export const DIAS_VISITA_RECIENTE = 7;

// Cómo se pinta y en qué orden aparece cada estado. Los rojos primero y los
// verdes al final: lo que necesita atención no se busca, se ve.
export const ESTADO_FILA = {
  prioritario:   { icono:"🔴", label:"Requiere intervención",  badge:"error", orden:0 },
  sin_visita:    { icono:"⚪", label:"Sin visitas",             badge:"terr",  orden:1 },
  mejorable:     { icono:"🟡", label:"Hay aspectos a mejorar",  badge:"amber", orden:2 },
  sin_cierre:    { icono:"⚫", label:"Visita sin cierre",        badge:"terr",  orden:3 },
  sin_problemas: { icono:"🟢", label:"Sin problemas",           badge:"sage",  orden:4 },
};

// ─── Fechas ──────────────────────────────────────────────────────────────────

// Lunes 00:00 de la semana en curso, en hora local.
// No se reusa semanaKey() de utils: ésa calcula la rotación de rubros del
// inventario, que es otra cosa y arranca los años en otro día.
export function inicioSemana(ref = new Date()) {
  const d = new Date(ref);
  d.setHours(0, 0, 0, 0);
  const desdeLunes = (d.getDay() + 6) % 7;   // lunes → 0, domingo → 6
  d.setDate(d.getDate() - desdeLunes);
  return d;
}

// Días completos entre una fecha y hoy, comparando medianoche local contra
// medianoche local: una visita de ayer a las 23:00 son 1 día, no 0.
export function diasDesde(fecha, ref = new Date()) {
  if (!fecha) return null;
  const f = new Date(fecha);
  if (isNaN(f)) return null;
  const a = new Date(f); a.setHours(0, 0, 0, 0);
  const b = new Date(ref); b.setHours(0, 0, 0, 0);
  return Math.round((b - a) / 86400000);
}

const fechaValida = (x) => { const d = new Date(x); return isNaN(d) ? null : d; };

// ─── Filas del semáforo ──────────────────────────────────────────────────────

// Una fila por sucursal, siempre las 7, tengan o no visitas.
export function filasSucursales(sucursales = [], visitas = [], pendientes = [], ref = new Date()) {
  const activos = pendientes.filter(p => !ESTADOS_CERRADOS.includes(p.estado));

  const filas = sucursales.map(sucursal => {
    // La última visita de esta sucursal. No se confía en el orden de entrada.
    let ultima = null, ultimaFecha = null;
    for (const v of visitas) {
      if (v.sucursalId !== sucursal.id) continue;
      const f = fechaValida(v.checkin);
      if (!f) continue;
      if (!ultimaFecha || f > ultimaFecha) { ultima = v; ultimaFecha = f; }
    }

    const dias = ultima ? diasDesde(ultima.checkin, ref) : null;
    const desactualizada = dias === null || dias > DIAS_VISITA_RECIENTE;

    // Decisión (b): si la visita es vieja se mantiene el color y la antigüedad
    // se marca aparte. ⚪ queda sólo para las sucursales que nunca se visitaron.
    const semaforo = ultima?.semaforo || null;
    const estado = !ultima ? "sin_visita" : (semaforo || "sin_cierre");

    const suyos = activos.filter(p => String(p.sucursalId) === String(sucursal.id));

    return {
      sucursal,
      ultimaVisita: ultima?.checkin || null,
      visitaId: ultima?.id || null,
      dias,
      desactualizada,
      semaforo,
      estado,
      abiertos: suyos.length,
      vencidos: suyos.filter(estaVencido).length,
    };
  });

  return filas.sort((a, b) => {
    const oa = ESTADO_FILA[a.estado]?.orden ?? 9;
    const ob = ESTADO_FILA[b.estado]?.orden ?? 9;
    if (oa !== ob) return oa - ob;
    if (a.desactualizada !== b.desactualizada) return a.desactualizada ? -1 : 1;
    if (a.vencidos !== b.vencidos) return b.vencidos - a.vencidos;
    if (a.abiertos !== b.abiertos) return b.abiertos - a.abiertos;
    return a.sucursal.nombre.localeCompare(b.sucursal.nombre, "es");
  });
}

// ─── Resumen semanal ─────────────────────────────────────────────────────────

export function resumenSemanal(sucursales = [], visitas = [], pendientes = [], ref = new Date()) {
  const desde = inicioSemana(ref);
  const ids = new Set(sucursales.map(s => String(s.id)));

  const visitadas = new Set();
  let ultimoCheckin = null;
  for (const v of visitas) {
    const f = fechaValida(v.checkin);
    if (!f) continue;
    if (!ultimoCheckin || f > ultimoCheckin) ultimoCheckin = f;
    // Sólo cuentan las sucursales que siguen en la lista
    if (f >= desde && ids.has(String(v.sucursalId))) visitadas.add(String(v.sucursalId));
  }

  const activos = pendientes.filter(p => !ESTADOS_CERRADOS.includes(p.estado));

  return {
    visitadas: visitadas.size,
    total: sucursales.length,
    abiertos: activos.length,
    vencidos: activos.filter(estaVencido).length,
    ultimoCheckin: ultimoCheckin ? ultimoCheckin.toISOString() : null,
    desde: desde.toISOString(),
  };
}

// ─── Alertas ─────────────────────────────────────────────────────────────────

// Dos bloques agrupados en vez de una alerta por sucursal: entran en pantalla
// y se leen de un vistazo.
export function alertas(filas = []) {
  const out = [];

  const conVencidos = filas.filter(f => f.vencidos > 0);
  if (conVencidos.length > 0) {
    out.push({
      tipo: "vencidos",
      severidad: "error",
      icono: "⏰",
      total: conVencidos.reduce((a, f) => a + f.vencidos, 0),
      sucursales: conVencidos.map(f => ({ nombre: f.sucursal.nombre, dato: f.vencidos })),
    });
  }

  const frias = filas.filter(f => f.desactualizada);
  if (frias.length > 0) {
    out.push({
      tipo: "sin_visita",
      severidad: "amber",
      icono: "📍",
      total: frias.length,
      sucursales: frias.map(f => ({ nombre: f.sucursal.nombre, dato: f.dias })),
    });
  }

  return out;
}
