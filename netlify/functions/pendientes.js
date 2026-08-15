const { neon } = require('@neondatabase/serverless');

const PRIORIDADES = ['critica', 'alta', 'media', 'baja'];
const ESTADOS     = ['abierto', 'en_progreso', 'resuelto', 'cancelado'];
const CATEGORIAS  = ['atencion', 'equipo', 'operacion', 'maquinas', 'comercial', 'niza', 'otro'];
const CERRADOS    = ['resuelto', 'cancelado'];

// '' y undefined se normalizan a null: un string vacío rompe el cast a DATE
const nul = (v) => (v === '' || v === undefined ? null : v);

function validar(p) {
  if (!p || typeof p !== 'object') return 'Body vacío o inválido';
  if (p.sucursalId == null) return 'Falta sucursalId';
  if (!p.sucursalNombre) return 'Falta sucursalNombre';
  if (!p.descripcion || !String(p.descripcion).trim()) return 'La descripción es obligatoria';
  if (!CATEGORIAS.includes(p.categoria)) return `Categoría inválida: ${p.categoria}`;
  if (p.prioridad && !PRIORIDADES.includes(p.prioridad)) return `Prioridad inválida: ${p.prioridad}`;
  if (p.estado && !ESTADOS.includes(p.estado)) return `Estado inválido: ${p.estado}`;
  return null;
}

async function insertar(sql, p) {
  await sql`
    INSERT INTO pendientes (
      id, visita_id, sucursal_id, sucursal_nombre, categoria, descripcion,
      accion_correctiva, responsable, fecha_limite, prioridad, estado,
      evidencia_url, pregunta_id
    ) VALUES (
      ${p.id || Date.now()}, ${nul(p.visitaId)}, ${p.sucursalId}, ${p.sucursalNombre},
      ${p.categoria}, ${String(p.descripcion).trim()},
      ${nul(p.accionCorrectiva)}, ${nul(p.responsable)}, ${nul(p.fechaLimite)},
      ${p.prioridad || 'media'}, ${p.estado || 'abierto'},
      ${nul(p.evidenciaUrl)}, ${nul(p.preguntaId)}
    )
    ON CONFLICT (id) DO NOTHING
  `;
}

exports.handler = async (event) => {
  const sql = neon(process.env.DATABASE_URL);
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };

  try {
    // ─── GET con filtros ────────────────────────────────────────────────────
    if (event.httpMethod === 'GET') {
      const q = event.queryStringParameters || {};

      // estado=activos es un atajo para abierto + en_progreso: es lo que necesita
      // la pantalla de pendientes previos al inicio de cada visita
      const activos = q.estado === 'activos';
      const estado = activos ? null : (q.estado || null);

      const rows = await sql`
        SELECT * FROM pendientes
        WHERE (${q.sucursal_id || null}::bigint IS NULL OR sucursal_id = ${q.sucursal_id || null}::bigint)
          AND (${estado}::text            IS NULL OR estado    = ${estado}::text)
          AND (${q.categoria || null}::text IS NULL OR categoria = ${q.categoria || null}::text)
          AND (${q.prioridad || null}::text IS NULL OR prioridad = ${q.prioridad || null}::text)
          AND (NOT ${activos}::boolean OR estado IN ('abierto','en_progreso'))
        ORDER BY
          -- resueltos y cancelados al fondo
          CASE WHEN estado IN ('resuelto','cancelado') THEN 1 ELSE 0 END,
          -- vencidos primero
          CASE WHEN fecha_limite IS NOT NULL
                    AND fecha_limite < CURRENT_DATE
                    AND estado IN ('abierto','en_progreso') THEN 0 ELSE 1 END,
          -- después por prioridad
          CASE prioridad WHEN 'critica' THEN 0 WHEN 'alta' THEN 1
                         WHEN 'media'   THEN 2 ELSE 3 END,
          fecha_limite ASC NULLS LAST,
          fecha_creacion DESC
        LIMIT 500
      `;
      return { statusCode: 200, headers, body: JSON.stringify(rows) };
    }

    // ─── POST: crear / crear_lote / actualizar / seguimiento ────────────────
    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      const { accion } = body;

      if (accion === 'crear') {
        const err = validar(body.pendiente);
        if (err) return { statusCode: 400, headers, body: JSON.stringify({ error: err }) };
        await insertar(sql, body.pendiente);
        return { statusCode: 200, headers, body: JSON.stringify({ ok: true, id: body.pendiente.id }) };
      }

      // Alta en lote: el cierre de una visita puede dejar varios pendientes juntos
      if (accion === 'crear_lote') {
        const lista = Array.isArray(body.pendientes) ? body.pendientes : [];
        if (lista.length === 0) {
          return { statusCode: 400, headers, body: JSON.stringify({ error: 'Lista de pendientes vacía' }) };
        }
        for (const p of lista) {
          const err = validar(p);
          if (err) return { statusCode: 400, headers, body: JSON.stringify({ error: err }) };
        }
        for (const p of lista) await insertar(sql, p);
        return { statusCode: 200, headers, body: JSON.stringify({ ok: true, creados: lista.length }) };
      }

      if (accion === 'actualizar') {
        const p = body.pendiente || {};
        if (p.id == null) {
          return { statusCode: 400, headers, body: JSON.stringify({ error: 'Falta id' }) };
        }
        if (p.estado && !ESTADOS.includes(p.estado)) {
          return { statusCode: 400, headers, body: JSON.stringify({ error: `Estado inválido: ${p.estado}` }) };
        }
        if (p.prioridad && !PRIORIDADES.includes(p.prioridad)) {
          return { statusCode: 400, headers, body: JSON.stringify({ error: `Prioridad inválida: ${p.prioridad}` }) };
        }

        // COALESCE: sólo pisa los campos que vienen en el body, el resto queda igual
        const rows = await sql`
          UPDATE pendientes SET
            estado            = COALESCE(${nul(p.estado)}::text, estado),
            prioridad         = COALESCE(${nul(p.prioridad)}::text, prioridad),
            descripcion       = COALESCE(${nul(p.descripcion)}::text, descripcion),
            accion_correctiva = COALESCE(${nul(p.accionCorrectiva)}::text, accion_correctiva),
            responsable       = COALESCE(${nul(p.responsable)}::text, responsable),
            fecha_limite      = COALESCE(${nul(p.fechaLimite)}::date, fecha_limite),
            evidencia_url     = COALESCE(${nul(p.evidenciaUrl)}::text, evidencia_url),
            comentario_cierre = COALESCE(${nul(p.comentarioCierre)}::text, comentario_cierre),
            visita_cierre_id  = CASE
                                  WHEN ${nul(p.estado)}::text IN ('resuelto','cancelado')
                                  THEN COALESCE(${nul(p.visitaCierreId)}::bigint, visita_cierre_id)
                                  ELSE visita_cierre_id
                                END,
            fecha_actualizacion = NOW()
          WHERE id = ${p.id}
          RETURNING *
        `;
        if (rows.length === 0) {
          return { statusCode: 404, headers, body: JSON.stringify({ error: 'Pendiente no encontrado' }) };
        }
        return { statusCode: 200, headers, body: JSON.stringify({ ok: true, pendiente: rows[0] }) };
      }

      if (accion === 'seguimiento') {
        const { id, texto, autor } = body;
        if (id == null) {
          return { statusCode: 400, headers, body: JSON.stringify({ error: 'Falta id' }) };
        }
        if (!texto || !String(texto).trim()) {
          return { statusCode: 400, headers, body: JSON.stringify({ error: 'El seguimiento no puede estar vacío' }) };
        }
        const entrada = [{
          fecha: new Date().toISOString(),
          autor: autor || 'Ileana',
          texto: String(texto).trim(),
        }];
        const rows = await sql`
          UPDATE pendientes
          SET seguimiento = seguimiento || ${JSON.stringify(entrada)}::jsonb,
              fecha_actualizacion = NOW()
          WHERE id = ${id}
          RETURNING *
        `;
        if (rows.length === 0) {
          return { statusCode: 404, headers, body: JSON.stringify({ error: 'Pendiente no encontrado' }) };
        }
        return { statusCode: 200, headers, body: JSON.stringify({ ok: true, pendiente: rows[0] }) };
      }

      return { statusCode: 400, headers, body: JSON.stringify({ error: `Acción desconocida: ${accion}` }) };
    }

    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Método no permitido' }) };
  } catch (e) {
    console.log('pendientes error:', e.message);
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
  }
};
