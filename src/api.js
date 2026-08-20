// ─── POST con errores que no se tragan ──────────────────────────────────────
// El patrón anterior era: `const data = await r.json().catch(()=>({}))` y después
// `data.error || 'mensaje genérico'`. Si la respuesta no era el JSON de nuestra
// function — un 404, un 502, un timeout, una página de error HTML — el cuerpo se
// perdía y sólo quedaba el mensaje genérico, que es justo cuando más falta hace
// saber qué pasó. Ahora siempre viaja el status y un pedazo del cuerpo crudo.
async function post(url, body, contexto) {
  let r;
  try {
    r = await fetch(url, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
  } catch (e) {
    throw new Error(`${contexto}: no se pudo contactar al servidor (${e.message})`);
  }

  const texto = await r.text().catch(() => '');
  let data = {};
  try { data = texto ? JSON.parse(texto) : {}; } catch { /* no era JSON */ }

  if (!r.ok) {
    const detalle = data.error || (texto ? texto.slice(0, 300).replace(/\s+/g, ' ') : 'respuesta vacía');
    const err = new Error(`${contexto} [HTTP ${r.status}] ${detalle}`);
    err.status = r.status;
    err.pg = data.pg || null;   // detalle de Postgres, si la function lo mandó
    if (data.pg) console.error(`${contexto} · error de Postgres:`, data.pg);
    throw err;
  }
  return data;
}

// ─── API ─────────────────────────────────────────────────────────────────────
export const API = {
  async getVisitas() {
    const r = await fetch('/api/visitas');
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
  // Antes esto no chequeaba r.ok: un 500 al guardar la visita pasaba
  // desapercibido y el reintento del check-out nunca se disparaba.
  async saveVisita(v) {
    return post('/api/visitas', v, 'No se pudo guardar la visita');
  },
  // Pasa por post() para que un 413 —foto por encima del límite de 4,5 MB de
  // Vercel— se vea como tal y no como un "Error al subir foto" genérico.
  async uploadFoto({ data, visitaId, sucursal, tipo }) {
    return post('/api/upload-foto', { data, visitaId, sucursal, tipo }, 'No se pudo subir la foto');
  },
  async getRegistros() {
    const r = await fetch('/api/registros');
    if (!r.ok) throw new Error('Error al cargar registros');
    const rows = await r.json();
    return rows.map(r => ({
      id: r.id, personaId: r.persona_id, personaNombre: r.persona_nombre,
      fecha: r.fecha?.slice(0, 10), mensajes: r.mensajes, turnos: r.turnos,
      senias: r.senias, nota: r.nota, editado: r.editado,
    }));
  },
  async saveRegistro(r) {
    return post('/api/registros', r, 'No se pudieron guardar los números');
  },
  async getInventarios(sucursalId) {
    const url = sucursalId ? `/api/inventarios?sucursal_id=${sucursalId}` : '/api/inventarios';
    const r = await fetch(url);
    if (!r.ok) throw new Error('Error al cargar inventarios');
    return r.json();
  },
  async saveInventario(inv) {
    return post('/api/inventarios', inv, 'No se pudo guardar el inventario');
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
    const url = '/api/pendientes' + (qs.toString() ? `?${qs}` : '');
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
    const r = await fetch(`/api/recorridas?mes=${encodeURIComponent(mes)}`);
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

  // ─── PERSONAL ──────────────────────────────────────────────────────────────
  // El plantel rota entre las 7 sucursales: no hay asignación fija, la presencia
  // se marca visita por visita.
  async getPersonal({ todos = false } = {}) {
    const r = await fetch('/api/personal' + (todos ? '?todos=1' : ''));
    if (!r.ok) throw new Error('Error al cargar el plantel');
    return (await r.json()).map(mapPersona);
  },

  // Presencia ya guardada en una visita. Durante la visita en curso la presencia
  // vive en memoria, así que esto sólo hace falta para revisarla después.
  async getPresencia(visitaId) {
    const r = await fetch(`/api/personal?visita_id=${encodeURIComponent(visitaId)}`);
    if (!r.ok) throw new Error('Error al cargar la presencia de la visita');
    return (await r.json()).map(Number);
  },

  async getCobertura(mes) {
    const r = await fetch(`/api/personal?mes=${encodeURIComponent(mes)}`);
    if (!r.ok) throw new Error('Error al cargar la cobertura de personal');
    const c = await r.json();
    return {
      mes: c.mes,
      totalVisitas: c.total_visitas || 0,
      visitasConPresencia: c.visitas_con_presencia || 0,
      franjas: c.franjas || {},
      personas: (c.personas || []).map(p => ({
        ...mapPersona(p),
        visitas: p.visitas, aperturas: p.aperturas, cierres: p.cierres,
      })),
    };
  },

  // La lista es el estado final, no un agregado: quien no viene en `personas`
  // se borra. Por eso sirve igual para la carga original que para una edición,
  // y reintentar el check-out no duplica nada.
  async registrarPresencia({ visitaId, personas }) {
    return postPersonal({ accion: 'registrar_presencia', visita_id: visitaId, personas: personas || [] });
  },

  async agregarPersona({ nombre, rol }) {
    const r = await postPersonal({ accion: 'agregar', id: Date.now(), nombre, rol });
    return r.persona ? mapPersona(r.persona) : null;
  },

  async desactivarPersona(id) {
    const r = await postPersonal({ accion: 'desactivar', id });
    return r.persona ? mapPersona(r.persona) : null;
  },

  // ─── STOCK ─────────────────────────────────────────────────────────────────
  // Los mínimos son la configuración; las alertas son una vista derivada de los
  // últimos controles contra esos mínimos. No hay tabla de alertas ni botón de
  // resolver: si el control siguiente muestra cantidad >= mínimo, la alerta
  // deja de calcularse y desaparece.
  async getMinimos() {
    const r = await fetch('/api/stock');
    if (!r.ok) throw new Error('Error al cargar los stock mínimos');
    return (await r.json()).map(mapMinimo);
  },

  async definirMinimo({ producto, minimo }) {
    const r = await postStock({ accion: 'definir', producto, minimo });
    return r.minimo ? mapMinimo(r.minimo) : null;
  },

  async quitarMinimo(producto) {
    const r = await postStock({ accion: 'quitar', producto });
    return r.minimo ? mapMinimo(r.minimo) : null;
  },

  // Vienen ya ordenadas por antigüedad desde el servidor: las más viejas primero
  async getAlertasStock() {
    const r = await fetch('/api/inventarios?alertas=1');
    if (!r.ok) throw new Error('Error al cargar las alertas de stock');
    return (await r.json()).map(mapAlertaStock);
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

const postRecorridas = (body) =>
  post('/api/recorridas', body, `No se pudo guardar el plan (${body.accion})`);

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

const postPendientes = (body) =>
  post('/api/pendientes', body, 'No se pudo guardar el pendiente');

// ─── HELPERS DE PERSONAL ─────────────────────────────────────────────────────
// id se normaliza a número: Postgres devuelve los BIGINT como string y del otro
// lado se comparan contra los ids tildados en el checklist de presencia. Los
// ids son 1-28 o Date.now(), muy por debajo de MAX_SAFE_INTEGER.
function mapPersona(p) {
  return {
    id: Number(p.id),
    nombre: p.nombre,
    rol: p.rol,
    activo: p.activo,
    creadoEn: p.creado_en,
  };
}

const CONTEXTO_PERSONAL = {
  registrar_presencia: 'No se pudo guardar la presencia',
  agregar:             'No se pudo agregar a la persona',
  desactivar:          'No se pudo dar de baja a la persona',
};

const postPersonal = (body) =>
  post('/api/personal', body, CONTEXTO_PERSONAL[body.accion] || 'No se pudo guardar el plantel');

// ─── HELPERS DE STOCK ────────────────────────────────────────────────────────
// NUMERIC vuelve de Postgres como string ("10.00"): se normaliza a número acá
// para que del otro lado se pueda comparar y formatear sin pensar en el tipo.
function mapMinimo(m) {
  return {
    producto: m.producto,
    minimo: Number(m.minimo),
    creadoEn: m.creado_en,
    actualizadoEn: m.actualizado_en,
  };
}

function mapAlertaStock(a) {
  return {
    producto: a.producto,
    sucursalId: a.sucursal_id,
    sucursalNombre: a.sucursal_nombre,
    rubro: a.rubro,
    fecha: a.fecha?.slice(0, 10) || null,
    cantidad: Number(a.cantidad),
    minimo: Number(a.minimo),
    inventarioId: a.inventario_id,
  };
}

const postStock = (body) =>
  post('/api/stock', body, body.accion === 'quitar'
    ? 'No se pudo quitar el mínimo'
    : 'No se pudo guardar el mínimo');
