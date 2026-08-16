const { neon } = require('@neondatabase/serverless');

const FRANJAS  = ['apertura', 'intermedio', 'cierre'];
const ESTADOS  = ['planificada', 'realizada', 'reprogramada', 'cancelada'];
// Una recorrida sigue "pendiente de hacerse" en estos dos estados
const ABIERTAS = ['planificada', 'reprogramada'];
const TZ = 'America/Argentina/Buenos_Aires';

const nul = (v) => (v === '' || v === undefined ? null : v);
const esMes = (m) => typeof m === 'string' && /^\d{4}-\d{2}$/.test(m);

// Orden de franja para desempatar: apertura → intermedio → cierre
const ORDEN_FRANJA = `CASE franja WHEN 'apertura' THEN 0 WHEN 'intermedio' THEN 1 ELSE 2 END`;

function validar(r) {
  if (!r || typeof r !== 'object') return 'Recorrida vacía o inválida';
  if (!esMes(r.mes)) return `Mes inválido: ${r.mes}`;
  if (r.sucursalId == null) return 'Falta sucursalId';
  if (!r.sucursalNombre) return 'Falta sucursalNombre';
  if (!r.fechaPlan) return 'Falta fechaPlan';
  if (!FRANJAS.includes(r.franja)) return `Franja inválida: ${r.franja}`;
  if (r.estado && !ESTADOS.includes(r.estado)) return `Estado inválido: ${r.estado}`;
  return null;
}

exports.handler = async (event) => {
  const sql = neon(process.env.DATABASE_URL);
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };
  const json = (statusCode, body) => ({ statusCode, headers, body: JSON.stringify(body) });

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };

  // DIAGNÓSTICO TEMPORAL — Fase 3
  // Si esta línea NO aparece en los logs de Vercel, el problema no está en el
  // código: la function no se está ejecutando (404, ruta mal resuelta o build
  // que no la incluyó). Si aparece, el error es de adentro. Sacar cuando el bug
  // de vincular_visita esté cerrado.
  console.log('[recorridas] IN', JSON.stringify({
    metodo: event.httpMethod,
    query: event.queryStringParameters || null,
    body: event.httpMethod === 'POST' ? String(event.body || '').slice(0, 300) : null,
    tieneDbUrl: !!process.env.DATABASE_URL,
  }));

  try {
    // ─── GET ?mes=YYYY-MM ────────────────────────────────────────────────────
    if (event.httpMethod === 'GET') {
      const mes = event.queryStringParameters?.mes;
      if (!esMes(mes)) return json(400, { error: 'Falta el parámetro mes en formato YYYY-MM' });

      // visita_probable es la red de seguridad: si vincular_visita falló después
      // de que la visita se guardó, la recorrida quedaría en planificada para
      // siempre. Acá se detecta la visita del mismo día y sucursal y se devuelve
      // como sugerencia — no se corrige nada en la base, lo decide la UI.
      //
      // El cast a timestamptz antes del AT TIME ZONE hace que funcione tanto si
      // checkin es text con ISO como si ya es timestamptz, y que la fecha se
      // compare en hora de Argentina: una visita de las 22:00 pertenece a ese
      // día, no al siguiente en UTC.
      const rows = await sql`
        SELECT r.*,
          CASE WHEN r.visita_id IS NULL THEN (
            SELECT v.id FROM visitas v
            WHERE v.sucursal_id = r.sucursal_id
              AND v.checkout IS NOT NULL
              AND (v.checkin::timestamptz AT TIME ZONE ${TZ})::date = r.fecha_plan
            ORDER BY v.checkin
            LIMIT 1
          ) END AS visita_probable
        FROM recorridas_plan r
        WHERE r.mes = ${mes}
        ORDER BY r.fecha_plan,
          CASE r.franja WHEN 'apertura' THEN 0 WHEN 'intermedio' THEN 1 ELSE 2 END,
          r.id
      `;
      return json(200, rows);
    }

    if (event.httpMethod !== 'POST') return json(405, { error: 'Método no permitido' });

    const body = JSON.parse(event.body || '{}');
    const { accion } = body;

    // ─── crear_plan ──────────────────────────────────────────────────────────
    if (accion === 'crear_plan') {
      const lista = Array.isArray(body.recorridas) ? body.recorridas : [];
      if (lista.length === 0) return json(400, { error: 'No hay recorridas para crear' });

      for (const r of lista) {
        const err = validar(r);
        if (err) return json(400, { error: err });
      }

      // ON CONFLICT DO NOTHING sin target cubre tanto la PK como el índice único
      // parcial de slot, así que un doble tap no duplica ni rompe.
      let creadas = 0;
      for (const r of lista) {
        const res = await sql`
          INSERT INTO recorridas_plan (
            id, mes, sucursal_id, sucursal_nombre, fecha_plan, franja, estado
          ) VALUES (
            ${r.id}, ${r.mes}, ${r.sucursalId}, ${r.sucursalNombre},
            ${r.fechaPlan}::date, ${r.franja}, ${r.estado || 'planificada'}
          )
          ON CONFLICT DO NOTHING
          RETURNING id
        `;
        creadas += res.length;
      }
      return json(200, { ok: true, creadas, omitidas: lista.length - creadas });
    }

    // ─── aprobar ─────────────────────────────────────────────────────────────
    // Aprueba el mes entero de un tap. Las recorridas que se agreguen después
    // nacen en false, así el panel puede avisar "N sin aprobar".
    if (accion === 'aprobar') {
      const { mes } = body;
      if (!esMes(mes)) return json(400, { error: 'Mes inválido' });
      const rows = await sql`
        UPDATE recorridas_plan
        SET aprobado_por_ileana = true, aprobado_en = NOW(), actualizado_en = NOW()
        WHERE mes = ${mes} AND aprobado_por_ileana = false
        RETURNING id
      `;
      return json(200, { ok: true, aprobadas: rows.length });
    }

    // ─── actualizar_estado ───────────────────────────────────────────────────
    // También reprograma: si viene una fechaPlan distinta, guarda la anterior en
    // fecha_plan_original (sólo la primera vez, para no perder la fecha que se
    // había prometido originalmente).
    if (accion === 'actualizar_estado') {
      const { id, estado, fechaPlan, motivoReprogramacion } = body;
      if (id == null) return json(400, { error: 'Falta id' });
      if (estado && !ESTADOS.includes(estado)) return json(400, { error: `Estado inválido: ${estado}` });

      const rows = await sql`
        UPDATE recorridas_plan SET
          estado = COALESCE(${nul(estado)}::text, estado),
          fecha_plan_original = CASE
            WHEN ${nul(fechaPlan)}::date IS NOT NULL AND ${nul(fechaPlan)}::date <> fecha_plan
            THEN COALESCE(fecha_plan_original, fecha_plan)
            ELSE fecha_plan_original
          END,
          fecha_plan = COALESCE(${nul(fechaPlan)}::date, fecha_plan),
          motivo_reprogramacion = COALESCE(${nul(motivoReprogramacion)}::text, motivo_reprogramacion),
          actualizado_en = NOW()
        WHERE id = ${id}
        RETURNING *
      `;
      if (rows.length === 0) return json(404, { error: 'Recorrida no encontrada' });
      return json(200, { ok: true, recorrida: rows[0] });
    }

    // ─── vincular_visita ─────────────────────────────────────────────────────
    // Matching automático al cerrar la visita: busca la recorrida de esa
    // sucursal en esa fecha que todavía no tenga visita, tomando la de franja
    // más temprana. La fecha la manda el cliente ya en hora local.
    if (accion === 'vincular_visita') {
      const { visitaId, sucursalId, fecha } = body;
      // DIAGNÓSTICO TEMPORAL — tipos exactos de lo que llega desde el cliente
      console.log('[recorridas] vincular_visita params', JSON.stringify({
        visitaId, tipoVisitaId: typeof visitaId,
        sucursalId, tipoSucursalId: typeof sucursalId,
        fecha, tipoFecha: typeof fecha,
      }));
      if (visitaId == null) return json(400, { error: 'Falta visitaId' });
      if (sucursalId == null) return json(400, { error: 'Falta sucursalId' });
      if (!fecha) return json(400, { error: 'Falta fecha' });

      // Idempotencia: si esta visita ya está vinculada, no engancharla a otra.
      // Sin esto, un reintento del check-out marcaría dos recorridas como
      // realizadas con la misma visita.
      const ya = await sql`
        SELECT * FROM recorridas_plan WHERE visita_id = ${visitaId} LIMIT 1
      `;
      if (ya.length > 0) return json(200, { ok: true, recorrida: ya[0], yaEstaba: true });

      const rows = await sql`
        UPDATE recorridas_plan
        SET visita_id = ${visitaId}, estado = 'realizada', actualizado_en = NOW()
        WHERE id = (
          SELECT id FROM recorridas_plan
          WHERE sucursal_id = ${sucursalId}
            AND fecha_plan = ${fecha}::date
            AND visita_id IS NULL
            AND estado IN ('planificada','reprogramada')
          ORDER BY CASE franja WHEN 'apertura' THEN 0 WHEN 'intermedio' THEN 1 ELSE 2 END, id
          LIMIT 1
        )
        RETURNING *
      `;
      // Sin match no es un error: la visita simplemente no estaba planificada
      console.log('[recorridas] vincular_visita OK', JSON.stringify({
        vinculada: !!rows[0], recorridaId: rows[0]?.id || null,
      }));
      return json(200, { ok: true, recorrida: rows[0] || null, yaEstaba: false });
    }

    return json(400, { error: `Acción desconocida: ${accion}` });
  } catch (e) {
    // DIAGNÓSTICO TEMPORAL — Fase 3
    // Los errores de Postgres traen mucho más que .message: el código SQLSTATE,
    // el detail, la constraint que se violó y la rutina interna que falló. Sin
    // eso, un error de tipos y uno de FK se ven igual. Sacar cuando el bug de
    // vincular_visita esté cerrado.
    const pg = {
      message:    e.message,
      code:       e.code,          // SQLSTATE: 23503 = FK, 23505 = unique, 42804 = tipos
      detail:     e.detail,
      hint:       e.hint,
      constraint: e.constraint,
      table:      e.table,
      column:     e.column,
      dataType:   e.dataType,
      routine:    e.routine,       // rutina interna de Postgres que lanzó el error
      severity:   e.severity,
      position:   e.position,
      sourceError: e.sourceError?.message,
    };
    console.error('[recorridas] ERROR', JSON.stringify({
      accion: (() => { try { return JSON.parse(event.body || '{}').accion; } catch { return null; } })(),
      metodo: event.httpMethod,
      query: event.queryStringParameters,
      pg,
    }));
    console.error('[recorridas] STACK', e.stack);

    // Se devuelven también al cliente: sin esto el front sólo ve un 500 pelado
    return json(500, { error: e.message || 'Error sin mensaje', pg });
  }
};
