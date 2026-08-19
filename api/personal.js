import { neon } from '@neondatabase/serverless';
import { cors, leerBody } from './_lib/http.js';

const ROLES = ['operadora', 'recepcionista', 'cosmiatra', 'medica', 'telefono'];
const TZ = 'America/Argentina/Buenos_Aires';

const esMes = (m) => typeof m === 'string' && /^\d{4}-\d{2}$/.test(m);

// El orden de los roles es el de negocio, no el alfabético. Va escrito a mano en
// cada ORDER BY porque el tag `sql` de neon convierte todo lo interpolado en un
// parámetro: no se puede inyectar un fragmento de SQL desde una constante.

// Las listas de ids viajan como JSON y no como array de Postgres: es el mismo
// recurso que ya usan visitas.js e inventarios.js para las columnas jsonb, y no
// depende de cómo el driver serialice un array de JS.
function idsValidos(lista) {
  if (!Array.isArray(lista)) return null;
  const ids = lista.map(Number);
  if (ids.some(n => !Number.isFinite(n))) return null;
  return [...new Set(ids)];
}

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const sql = neon(process.env.NEON_URL);

  try {
    if (req.method === 'GET') {
      const q = req.query || {};

      // ─── GET ?visita_id=N ─────────────────────────────────────────────────
      // Quiénes quedaron registrados en una visita ya cerrada. Lo usa el
      // resumen editable cuando la visita ya se guardó.
      if (q.visita_id) {
        const rows = await sql`
          SELECT persona_id FROM visita_personal
          WHERE visita_id = ${q.visita_id}::bigint
          ORDER BY persona_id
        `;
        return res.status(200).json(rows.map(r => Number(r.persona_id)));
      }

      // ─── GET ?mes=YYYY-MM ─────────────────────────────────────────────────
      if (q.mes) {
        if (!esMes(q.mes)) return res.status(400).json({ error: 'Mes inválido, se espera YYYY-MM' });
        return res.status(200).json(await cobertura(sql, q.mes));
      }

      // ─── GET (plantel) ────────────────────────────────────────────────────
      // Por defecto sólo los activos, que es lo que necesita el checklist de
      // presencia. ?todos=1 agrega las bajas, para el panel de Ileana.
      const todos = q.todos === '1' || q.todos === 'true';
      const rows = await sql`
        SELECT * FROM personal
        WHERE ${todos}::boolean OR activo
        ORDER BY
          CASE rol WHEN 'operadora' THEN 0 WHEN 'recepcionista' THEN 1
                   WHEN 'cosmiatra' THEN 2 WHEN 'medica' THEN 3 ELSE 4 END,
          nombre
      `;
      return res.status(200).json(rows);
    }

    if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

    const body = leerBody(req);
    const { accion } = body;

    // ─── registrar_presencia ────────────────────────────────────────────────
    // La lista que llega ES el estado final, no un agregado: primero borra a los
    // que quedaron destildados y después inserta a los tildados. Así el botón
    // sirve igual para la carga original que para una edición, y reintentar el
    // check-out no duplica ni deja gente de más.
    if (accion === 'registrar_presencia') {
      const visitaId = body.visita_id ?? body.visitaId;
      if (visitaId == null) return res.status(400).json({ error: 'Falta visita_id' });

      const ids = idsValidos(body.personas);
      if (ids === null) return res.status(400).json({ error: 'personas debe ser un array de ids' });

      const json = JSON.stringify(ids);

      // Con la lista vacía el NOT IN no matchea a nadie y borra toda la
      // presencia de la visita, que es exactamente "no había nadie".
      await sql`
        DELETE FROM visita_personal
        WHERE visita_id = ${visitaId}::bigint
          AND persona_id NOT IN (
            SELECT value::bigint FROM json_array_elements_text(${json}::json)
          )
      `;

      const insertadas = await sql`
        INSERT INTO visita_personal (visita_id, persona_id)
        SELECT ${visitaId}::bigint, value::bigint
        FROM json_array_elements_text(${json}::json)
        ON CONFLICT DO NOTHING
        RETURNING persona_id
      `;

      return res.status(200).json({ ok: true, presentes: ids.length, nuevas: insertadas.length });
    }

    // ─── agregar ────────────────────────────────────────────────────────────
    // Adrián da de alta desde la sucursal cuando aparece alguien que no está en
    // la lista. Si el nombre ya existe pero estaba dado de baja, se reactiva:
    // es el caso de la persona que vuelve, y evita el callejón sin salida de un
    // alta que rebota contra el índice único sin poder hacer nada al respecto.
    if (accion === 'agregar') {
      const nombre = String(body.nombre || '').trim();
      const rol = body.rol;
      if (!nombre) return res.status(400).json({ error: 'El nombre es obligatorio' });
      if (!ROLES.includes(rol)) return res.status(400).json({ error: `Rol inválido: ${rol}` });

      const creadas = await sql`
        INSERT INTO personal (id, nombre, rol)
        VALUES (${body.id || Date.now()}, ${nombre}, ${rol})
        ON CONFLICT DO NOTHING
        RETURNING *
      `;
      if (creadas.length > 0) return res.status(200).json({ ok: true, persona: creadas[0], creada: true });

      const existentes = await sql`
        SELECT * FROM personal WHERE lower(trim(nombre)) = lower(${nombre}) LIMIT 1
      `;
      const persona = existentes[0];
      if (!persona) return res.status(409).json({ error: `No se pudo agregar a ${nombre}` });
      if (persona.activo) {
        return res.status(409).json({ error: `${persona.nombre} ya está en el plantel` });
      }

      const reactivadas = await sql`
        UPDATE personal SET activo = true, rol = ${rol} WHERE id = ${persona.id} RETURNING *
      `;
      return res.status(200).json({ ok: true, persona: reactivadas[0], reactivada: true });
    }

    // ─── desactivar ─────────────────────────────────────────────────────────
    // Nunca DELETE: las visitas en las que estuvo tienen que seguir contando en
    // la cobertura de los meses ya cerrados.
    if (accion === 'desactivar') {
      const { id } = body;
      if (id == null) return res.status(400).json({ error: 'Falta id' });
      const rows = await sql`
        UPDATE personal SET activo = false WHERE id = ${id} RETURNING *
      `;
      if (rows.length === 0) return res.status(404).json({ error: 'Persona no encontrada' });
      return res.status(200).json({ ok: true, persona: rows[0] });
    }

    return res.status(400).json({ error: `Acción desconocida: ${accion}` });
  } catch (e) {
    console.error('[personal] ERROR', e.message, e.code || '', e.detail || '', e.constraint || '');
    return res.status(500).json({ error: e.message });
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// COBERTURA MENSUAL
//
// El universo del mes son las visitas cerradas cuyo check-in cae en el mes en
// hora de Argentina — mismo criterio de TZ que api/recorridas.js, para que una
// visita de las 22:00 pertenezca a ese día y no al siguiente en UTC.
//
// La franja (apertura / intermedio / cierre) no vive en la visita: sale de la
// recorrida planificada que se vinculó en el check-out. Una visita que no estaba
// en el plan no tiene franja, y por eso el LEFT JOIN.
// ══════════════════════════════════════════════════════════════════════════════
async function cobertura(sql, mes) {
  // El CTE se repite en las dos primeras queries a propósito: son dos preguntas
  // distintas (el denominador y el detalle por persona) y separarlas evita una
  // query con tres GROUP BY encimados.
  const [totales] = await sql`
    WITH visitas_mes AS (
      SELECT v.id
      FROM visitas v
      WHERE v.checkout IS NOT NULL
        AND to_char(v.checkin::timestamptz AT TIME ZONE ${TZ}, 'YYYY-MM') = ${mes}
    )
    SELECT
      COUNT(*)::int AS total_visitas,
      COUNT(*) FILTER (
        WHERE EXISTS (SELECT 1 FROM visita_personal vp WHERE vp.visita_id = vm.id)
      )::int AS visitas_con_presencia
    FROM visitas_mes vm
  `;

  // Se listan todos los activos —incluso los que no aparecieron nunca, que son
  // justo los que el panel pinta en rojo— más las bajas que sí estuvieron
  // presentes este mes, para que el mes ya transcurrido no cambie de números
  // cuando alguien se va.
  const personas = await sql`
    WITH visitas_mes AS (
      SELECT v.id, r.franja
      FROM visitas v
      LEFT JOIN recorridas_plan r ON r.visita_id = v.id
      WHERE v.checkout IS NOT NULL
        AND to_char(v.checkin::timestamptz AT TIME ZONE ${TZ}, 'YYYY-MM') = ${mes}
    ),
    presencia AS (
      SELECT vp.persona_id, vp.visita_id, vm.franja
      FROM visita_personal vp
      JOIN visitas_mes vm ON vm.id = vp.visita_id
    )
    SELECT
      p.id, p.nombre, p.rol, p.activo,
      COUNT(pr.visita_id)::int AS visitas,
      COUNT(pr.visita_id) FILTER (WHERE pr.franja = 'apertura')::int AS aperturas,
      COUNT(pr.visita_id) FILTER (WHERE pr.franja = 'cierre')::int   AS cierres
    FROM personal p
    LEFT JOIN presencia pr ON pr.persona_id = p.id
    GROUP BY p.id, p.nombre, p.rol, p.activo
    HAVING p.activo OR COUNT(pr.visita_id) > 0
    ORDER BY
      CASE p.rol WHEN 'operadora' THEN 0 WHEN 'recepcionista' THEN 1
                 WHEN 'cosmiatra' THEN 2 WHEN 'medica' THEN 3 ELSE 4 END,
      p.nombre
  `;

  // Aperturas y cierres auditados: sale del plan del mes, no de las visitas.
  // "planificadas" es el total no cancelado y "auditadas" las que efectivamente
  // se hicieron, que es el par que necesita el indicador.
  const franjas = await sql`
    SELECT
      franja,
      COUNT(*) FILTER (WHERE estado <> 'cancelada')::int AS planificadas,
      COUNT(*) FILTER (WHERE estado = 'realizada')::int  AS auditadas
    FROM recorridas_plan
    WHERE mes = ${mes} AND franja IN ('apertura','cierre')
    GROUP BY franja
  `;

  const porFranja = (id) => {
    const f = franjas.find(x => x.franja === id);
    return { planificadas: f?.planificadas || 0, auditadas: f?.auditadas || 0 };
  };

  return {
    mes,
    total_visitas: totales?.total_visitas || 0,
    visitas_con_presencia: totales?.visitas_con_presencia || 0,
    franjas: { apertura: porFranja('apertura'), cierre: porFranja('cierre') },
    personas,
  };
}
