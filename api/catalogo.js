import { neon } from '@neondatabase/serverless';
import { cors, leerBody } from './_lib/http.js';

// Nota: hoy el frontend no llama a este endpoint — el control de inventario usa
// la constante CATALOGO de src/constants.js. Se migra igual para no perderlo.
export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const sql = neon(process.env.NEON_URL);

  try {
    if (req.method === 'GET') {
      const rows = await sql`
        SELECT * FROM catalogo_productos
        WHERE activo = true
        ORDER BY rubro, orden, nombre
      `;
      return res.status(200).json(rows);
    }

    if (req.method === 'POST') {
      const { accion, id, rubro, nombre } = leerBody(req);

      if (accion === 'agregar') {
        const maxOrden = await sql`
          SELECT COALESCE(MAX(orden), 0) as max FROM catalogo_productos WHERE rubro = ${rubro}
        `;
        await sql`
          INSERT INTO catalogo_productos (id, rubro, nombre, activo, orden)
          VALUES (${Date.now()}, ${rubro}, ${nombre}, true, ${maxOrden[0].max + 1})
        `;
      }

      if (accion === 'eliminar') {
        await sql`UPDATE catalogo_productos SET activo = false WHERE id = ${id}`;
      }

      if (accion === 'renombrar') {
        await sql`UPDATE catalogo_productos SET nombre = ${nombre} WHERE id = ${id}`;
      }

      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Método no permitido' });
  } catch (e) {
    console.error('[catalogo] ERROR', e.message, e.code || '', e.detail || '');
    return res.status(500).json({ error: e.message });
  }
}
