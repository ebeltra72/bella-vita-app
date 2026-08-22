import { SUCURSALES } from './sucursales.js';

const TZ = 'America/Argentina/Buenos_Aires';

// Ventana de "hace mucho que no se visita". Coincide a propósito con la que usa
// el Dashboard para pintar una sucursal como desactualizada, pero acá es más
// larga: el mail avisa cuando ya es un problema, no cuando empieza a serlo.
export const DIAS_SIN_VISITA = 15;

// ══════════════════════════════════════════════════════════════════════════════
// LAS TRES ALERTAS DEL RESUMEN DIARIO
//
// Separadas del handler para que "¿hay algo que contar?" sea una sola decisión y
// no quede desperdigada entre el armado del HTML y el envío.
//
// Todas las fechas se resuelven en hora de Argentina y no en UTC. El cron corre
// 11:00 UTC —8 AM allá— así que hoy las dos coinciden, pero un cambio de horario
// del cron haría que "vencido ayer" cambiara de significado sin que nadie toque
// esta query.
// ══════════════════════════════════════════════════════════════════════════════

// ─── Pendientes vencidos ─────────────────────────────────────────────────────
// Mismo criterio que estaVencido() en src/utils.js: abierto o en progreso, con
// fecha límite pasada. Los resueltos y cancelados no pueden estar vencidos.
export async function pendientesVencidos(sql) {
  return sql`
    SELECT
      id, sucursal_nombre, descripcion, prioridad, responsable, fecha_limite,
      ((NOW() AT TIME ZONE ${TZ})::date - fecha_limite)::int AS dias_vencido
    FROM pendientes
    WHERE estado IN ('abierto','en_progreso')
      AND fecha_limite IS NOT NULL
      AND fecha_limite < (NOW() AT TIME ZONE ${TZ})::date
    ORDER BY fecha_limite, sucursal_nombre
    LIMIT 100
  `;
}

// ─── Productos bajo mínimo ───────────────────────────────────────────────────
// La misma vista derivada que sirve el GET ?alertas=1 de inventarios: para cada
// sucursal y producto, el último control que lo incluya, contra su mínimo.
//
// Vive acá y no en api/inventarios.js para que el mail y el panel no puedan
// contar cosas distintas. Los tres detalles de la query —DISTINCT ON por
// producto y no por rubro, el CASE con regex antes del cast, y el JOIN contra
// stock_minimos antes del DISTINCT ON— están explicados en db/fase5.sql.
export async function productosBajoMinimo(sql) {
  return sql`
    WITH cargados AS (
      SELECT i.id AS inventario_id, i.sucursal_id, i.sucursal_nombre, i.rubro, i.fecha,
             p.key AS producto, m.minimo,
             CASE WHEN trim(p.value #>> '{}') ~ '^[0-9]+([.,][0-9]+)?$'
                  THEN replace(trim(p.value #>> '{}'), ',', '.')::numeric END AS cantidad
      FROM inventarios i
      CROSS JOIN LATERAL jsonb_each(i.productos) p
      JOIN stock_minimos m ON m.producto = p.key
    ),
    ultimos AS (
      SELECT DISTINCT ON (sucursal_id, producto) *
      FROM cargados
      WHERE cantidad IS NOT NULL
      ORDER BY sucursal_id, producto, fecha DESC, inventario_id DESC
    )
    SELECT * FROM ultimos
    WHERE cantidad < minimo
    ORDER BY fecha, sucursal_nombre, producto
  `;
}

// ─── Sucursales sin visita ───────────────────────────────────────────────────
// La lista de sucursales no está en la base (ver _lib/sucursales.js), así que el
// cruce se hace acá: la base aporta la última visita de cada una y el código
// completa las que no aparecen porque nunca se visitaron.
export async function sucursalesSinVisita(sql, dias = DIAS_SIN_VISITA) {
  const filas = await sql`
    SELECT
      sucursal_id,
      MAX((checkin::timestamptz AT TIME ZONE ${TZ})::date) AS ultima
    FROM visitas
    WHERE checkout IS NOT NULL
    GROUP BY sucursal_id
  `;

  const porId = new Map(filas.map(f => [String(f.sucursal_id), f.ultima]));
  const hoy = new Date(new Date().toLocaleString('en-US', { timeZone: TZ }));
  hoy.setHours(0, 0, 0, 0);

  const out = [];
  for (const s of SUCURSALES) {
    const ultima = porId.get(String(s.id)) || null;

    // Nunca visitada: dias queda en null y el mail lo dice con esas palabras.
    // Un número inventado acá sería peor que la ausencia del dato.
    if (!ultima) { out.push({ ...s, ultima: null, dias: null }); continue; }

    const d = new Date(`${String(ultima).slice(0, 10)}T00:00:00`);
    const transcurridos = Math.round((hoy - d) / 86400000);
    if (transcurridos > dias) out.push({ ...s, ultima: String(ultima).slice(0, 10), dias: transcurridos });
  }

  // Las más abandonadas primero; las que nunca se visitaron, al tope de todo
  return out.sort((a, b) => (b.dias ?? Infinity) - (a.dias ?? Infinity));
}

// ─── Todo junto ──────────────────────────────────────────────────────────────
// Las tres en paralelo: son independientes y el cron tiene el mismo límite de
// duración que cualquier function.
export async function juntarAlertas(sql) {
  const [vencidos, bajoMinimo, sinVisita] = await Promise.all([
    pendientesVencidos(sql),
    productosBajoMinimo(sql),
    sucursalesSinVisita(sql),
  ]);

  return {
    vencidos,
    bajoMinimo,
    sinVisita,
    total: vencidos.length + bajoMinimo.length + sinVisita.length,
  };
}
