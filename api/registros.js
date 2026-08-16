import { neon } from '@neondatabase/serverless';
import { cors, leerBody } from './_lib/http.js';

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const sql = neon(process.env.DATABASE_URL);

  try {
    if (req.method === 'GET') {
      const rows = await sql`SELECT * FROM registros_comerciales ORDER BY fecha DESC`;
      return res.status(200).json(rows);
    }

    if (req.method === 'POST') {
      const r = leerBody(req);
      await sql`
        INSERT INTO registros_comerciales VALUES (
          ${r.id}, ${r.personaId}, ${r.personaNombre},
          ${r.fecha}, ${r.mensajes}, ${r.turnos}, ${r.senias},
          ${r.nota}, ${r.editado}
        )
        ON CONFLICT (id) DO UPDATE SET
          mensajes = ${r.mensajes},
          turnos = ${r.turnos},
          senias = ${r.senias},
          nota = ${r.nota},
          editado = ${new Date().toISOString()}
      `;
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Método no permitido' });
  } catch (e) {
    console.error('[registros] ERROR', e.message, e.code || '', e.detail || '');
    return res.status(500).json({ error: e.message });
  }
}
