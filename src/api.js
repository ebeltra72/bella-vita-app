// ─── API ─────────────────────────────────────────────────────────────────────
export const API = {
  async getVisitas() {
    const r = await fetch('/.netlify/functions/visitas');
    if (!r.ok) throw new Error('Error al cargar visitas');
    const rows = await r.json();
    return rows.map(v => ({
      id: v.id, sucursalId: v.sucursal_id, sucursalNombre: v.sucursal_nombre,
      checkin: v.checkin, checkout: v.checkout,
      latCheckin: v.lat_checkin, lngCheckin: v.lng_checkin,
      latCheckout: v.lat_checkout, lngCheckout: v.lng_checkout,
      distCheckin: v.dist_checkin, distCheckout: v.dist_checkout,
      gpsOkCheckin: v.gps_ok_checkin, gpsOkCheckout: v.gps_ok_checkout,
      simulado: v.simulado, respuestas: v.respuestas || {},
      semaforo: v.semaforo, hallazgo: v.hallazgo,
      accionTomada: v.accion_tomada, accionDetalle: v.accion_detalle,
      dejoPendientes: v.dejo_pendientes,
      encuestaVersion: v.encuesta_version || 'v1',
    }));
  },
  async saveVisita(v) {
    await fetch('/.netlify/functions/visitas', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(v),
    });
  },
  async uploadFoto({ data, visitaId, sucursal, tipo }) {
    const r = await fetch('/.netlify/functions/upload-foto', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data, visitaId, sucursal, tipo }),
    });
    if (!r.ok) throw new Error('Error al subir foto');
    return r.json();
  },
  async getRegistros() {
    const r = await fetch('/.netlify/functions/registros');
    if (!r.ok) throw new Error('Error al cargar registros');
    const rows = await r.json();
    return rows.map(r => ({
      id: r.id, personaId: r.persona_id, personaNombre: r.persona_nombre,
      fecha: r.fecha?.slice(0, 10), mensajes: r.mensajes, turnos: r.turnos,
      senias: r.senias, nota: r.nota, editado: r.editado,
    }));
  },
  async saveRegistro(r) {
    await fetch('/.netlify/functions/registros', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(r),
    });
  },
  async getInventarios(sucursalId) {
    const url = sucursalId ? `/.netlify/functions/inventarios?sucursal_id=${sucursalId}` : '/.netlify/functions/inventarios';
    const r = await fetch(url);
    if (!r.ok) throw new Error('Error al cargar inventarios');
    return r.json();
  },
  async saveInventario(inv) {
    await fetch('/.netlify/functions/inventarios', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(inv),
    });
  },

  // ─── PENDIENTES ────────────────────────────────────────────────────────────
  // filtros: { sucursalId, estado, categoria, prioridad }
  // estado: 'abierto' | 'en_progreso' | 'resuelto' | 'cancelado' | 'activos'
  //         ('activos' = abierto + en_progreso)
  async getPendientes(filtros = {}) {
    const qs = new URLSearchParams();
    if (filtros.sucursalId != null) qs.set('sucursal_id', filtros.sucursalId);
    if (filtros.estado)             qs.set('estado', filtros.estado);
    if (filtros.categoria)          qs.set('categoria', filtros.categoria);
    if (filtros.prioridad)          qs.set('prioridad', filtros.prioridad);
    const url = '/.netlify/functions/pendientes' + (qs.toString() ? `?${qs}` : '');
    const r = await fetch(url);
    if (!r.ok) throw new Error('Error al cargar pendientes');
    return (await r.json()).map(mapPendiente);
  },

  async crearPendiente(pendiente) {
    return postPendientes({ accion: 'crear', pendiente });
  },

  async crearPendientes(pendientes) {
    if (!pendientes?.length) return { ok: true, creados: 0 };
    return postPendientes({ accion: 'crear_lote', pendientes });
  },

  async actualizarPendiente(pendiente) {
    const r = await postPendientes({ accion: 'actualizar', pendiente });
    return r.pendiente ? mapPendiente(r.pendiente) : null;
  },

  async agregarSeguimiento(id, texto, autor) {
    const r = await postPendientes({ accion: 'seguimiento', id, texto, autor });
    return r.pendiente ? mapPendiente(r.pendiente) : null;
  },

  // ─── RECORRIDAS ────────────────────────────────────────────────────────────
  async getRecorridas(mes) {
    const r = await fetch(`/.netlify/functions/recorridas?mes=${encodeURIComponent(mes)}`);
    if (!r.ok) throw new Error('Error al cargar el plan de recorridas');
    return (await r.json()).map(mapRecorrida);
  },

  async crearRecorridas(recorridas) {
    if (!recorridas?.length) return { ok: true, creadas: 0 };
    return postRecorridas({ accion: 'crear_plan', recorridas });
  },

  async aprobarPlan(mes) {
    return postRecorridas({ accion: 'aprobar', mes });
  },

  async actualizarRecorrida({ id, estado, fechaPlan, motivoReprogramacion }) {
    const r = await postRecorridas({ accion: 'actualizar_estado', id, estado, fechaPlan, motivoReprogramacion });
    return r.recorrida ? mapRecorrida(r.recorrida) : null;
  },

  // Se llama al cerrar la visita. El servidor busca la recorrida que
  // corresponde; si no hay ninguna, devuelve null y no es un error.
  async vincularVisita({ visitaId, sucursalId, fecha }) {
    const r = await postRecorridas({ accion: 'vincular_visita', visitaId, sucursalId, fecha });
    return r.recorrida ? mapRecorrida(r.recorrida) : null;
  },
};

// ─── HELPERS DE RECORRIDAS ───────────────────────────────────────────────────
function mapRecorrida(r) {
  return {
    id: r.id,
    mes: r.mes,
    sucursalId: r.sucursal_id,
    sucursalNombre: r.sucursal_nombre,
    fechaPlan: r.fecha_plan?.slice(0, 10) || null,
    fechaPlanOriginal: r.fecha_plan_original?.slice(0, 10) || null,
    franja: r.franja,
    estado: r.estado,
    visitaId: r.visita_id,
    aprobado: r.aprobado_por_ileana,
    aprobadoEn: r.aprobado_en,
    motivoReprogramacion: r.motivo_reprogramacion,
    creadoEn: r.creado_en,
    actualizadoEn: r.actualizado_en,
    // Sólo viene en el GET: visita del mismo día y sucursal que quedó sin
    // vincular, para poder ofrecer el enganche con un tap
    visitaProbable: r.visita_probable ?? null,
  };
}

async function postRecorridas(body) {
  const r = await fetch('/.netlify/functions/recorridas', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || 'Error al guardar el plan');
  return data;
}

// ─── HELPERS DE PENDIENTES ───────────────────────────────────────────────────
function mapPendiente(p) {
  return {
    id: p.id,
    visitaId: p.visita_id,
    sucursalId: p.sucursal_id,
    sucursalNombre: p.sucursal_nombre,
    categoria: p.categoria,
    descripcion: p.descripcion,
    accionCorrectiva: p.accion_correctiva,
    responsable: p.responsable,
    fechaCreacion: p.fecha_creacion,
    fechaLimite: p.fecha_limite?.slice(0, 10) || null,
    prioridad: p.prioridad,
    estado: p.estado,
    evidenciaUrl: p.evidencia_url,
    comentarioCierre: p.comentario_cierre,
    preguntaId: p.pregunta_id,
    visitaCierreId: p.visita_cierre_id,
    fechaActualizacion: p.fecha_actualizacion,
    seguimiento: p.seguimiento || [],
  };
}

async function postPendientes(body) {
  const r = await fetch('/.netlify/functions/pendientes', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || 'Error al guardar el pendiente');
  return data;
}
