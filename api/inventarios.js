import { neon } from '@neondatabase/serverless';
import { cors, leerBody } from './_lib/http.js';

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const sql = neon(process.env.NEON_URL);

  try {
    if (req.method === 'GET') {
      // ─── GET ?alertas=1 ───────────────────────────────────────────────────
      // Las alertas de stock no viven en ninguna tabla: se derivan acá, al
      // vuelo, cruzando el último control de cada producto contra el mínimo
      // que definió Ileana. Sin estado persistido no hay nada que sincronizar
      // ni que resolver a mano: si el control siguiente muestra cantidad >=
      // mínimo, la alerta desaparece sola porque deja de calcularse.
      if (req.query?.alertas) {
        return res.status(200).json(await alertasStock(sql));
      }

      const sucursalId = req.query?.sucursal_id;
      const rows = sucursalId
        ? await sql`SELECT * FROM inventarios WHERE sucursal_id = ${sucursalId} ORDER BY fecha DESC LIMIT 50`
        : await sql`SELECT * FROM inventarios ORDER BY fecha DESC LIMIT 100`;
      return res.status(200).json(rows);
    }

    if (req.method === 'POST') {
      const inv = leerBody(req);
      await sql`
        INSERT INTO inventarios (id, visita_id, sucursal_id, sucursal_nombre, fecha, rubro, semana_key, productos)
        VALUES (${inv.id}, ${inv.visitaId}, ${inv.sucursalId}, ${inv.sucursalNombre}, ${inv.fecha}, ${inv.rubro}, ${inv.semanaKey}, ${JSON.stringify(inv.productos)})
      `;
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Método no permitido' });
  } catch (e) {
    console.error('[inventarios] ERROR', e.message, e.code || '', e.detail || '');
    return res.status(500).json({ error: e.message });
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// ALERTAS DE STOCK — vista derivada
//
// Para cada sucursal y producto se toma el control más reciente que lo incluya
// y se compara contra stock_minimos. Tres detalles que no se ven a simple vista:
//
//   · DISTINCT ON (sucursal_id, producto) y no por rubro: si Adrián dejó un
//     producto en blanco esta semana pero lo cargó la anterior, la alerta
//     sobrevive con el último dato real en vez de desaparecer por un casillero
//     vacío. El formulario permite explícitamente dejar productos sin revisar,
//     así que "ausente" no es "cero".
//
//   · El CASE con regex antes del cast: los valores del jsonb son lo que tipeó
//     Adrián, siempre strings y con step 0,5, así que "0.5" es válido. Un cast
//     directo reventaría la query entera con un solo valor raro; así esa fila
//     devuelve NULL y se descarta.
//
//     El regex se aplica sobre el trim y evita \s a propósito: en un template
//     literal de JS esa barra se pierde y el patrón dejaría de matchear.
//
//   · El JOIN contra stock_minimos va antes del DISTINCT ON: poda la expansión
//     del jsonb a los productos configurados, que son unos pocos de los 80 del
//     catálogo.
//
// El orden es el que pide el Dashboard: las más viejas primero.
// ══════════════════════════════════════════════════════════════════════════════
async function alertasStock(sql) {
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
