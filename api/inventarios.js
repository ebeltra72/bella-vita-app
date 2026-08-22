import { neon } from '@neondatabase/serverless';
import { cors, leerBody } from './_lib/http.js';
import { productosBajoMinimo } from './_lib/alertas.js';

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
        return res.status(200).json(await productosBajoMinimo(sql));
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

// La derivación de alertas vive en _lib/alertas.js: la usan este endpoint y el
// resumen diario por mail, y si estuviera duplicada el panel y el mail podrían
// llegar a contar cosas distintas. Los tres detalles finos de la query —el
// DISTINCT ON por producto y no por rubro, el CASE con regex antes del cast y el
// JOIN contra stock_minimos antes del DISTINCT ON— están explicados allá y en
// db/fase5.sql.
