import { neon } from '@neondatabase/serverless';
import { cors, leerBody } from './_lib/http.js';

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const sql = neon(process.env.DATABASE_URL);

  try {
    if (req.method === 'GET') {
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
