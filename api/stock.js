import { neon } from '@neondatabase/serverless';
import { cors, leerBody } from './_lib/http.js';

// ══════════════════════════════════════════════════════════════════════════════
// STOCK MÍNIMOS
//
// Sólo la configuración: un mínimo por producto, global a las 7 sucursales. Las
// alertas no viven acá ni en ninguna tabla — se derivan de los últimos controles
// contra estos mínimos, en api/inventarios.js con ?alertas=1.
//
// Un producto sin fila en esta tabla no se evalúa nunca. Es la forma de no
// obligar a Ileana a definir 80 mínimos, y también la única palanca para apagar
// una alerta que molesta: se quita el mínimo y deja de alertar.
// ══════════════════════════════════════════════════════════════════════════════
export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const sql = neon(process.env.NEON_URL);

  try {
    if (req.method === 'GET') {
      const rows = await sql`SELECT * FROM stock_minimos ORDER BY producto`;
      return res.status(200).json(rows);
    }

    if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

    const body = leerBody(req);
    const { accion } = body;

    // ─── definir ────────────────────────────────────────────────────────────
    // Upsert: definir y editar son la misma acción. El producto llega elegido
    // del catálogo, no tipeado a mano, así que el nombre matchea exacto contra
    // las claves del jsonb de inventarios.
    if (accion === 'definir') {
      const producto = String(body.producto || '').trim();
      const minimo = Number(body.minimo);

      if (!producto) return res.status(400).json({ error: 'Falta el producto' });
      if (!Number.isFinite(minimo)) return res.status(400).json({ error: `Mínimo inválido: ${body.minimo}` });
      if (minimo < 0) return res.status(400).json({ error: 'El mínimo no puede ser negativo' });

      const rows = await sql`
        INSERT INTO stock_minimos (producto, minimo)
        VALUES (${producto}, ${minimo})
        ON CONFLICT (producto) DO UPDATE SET
          minimo = EXCLUDED.minimo,
          actualizado_en = NOW()
        RETURNING *
      `;
      return res.status(200).json({ ok: true, minimo: rows[0] });
    }

    // ─── quitar ─────────────────────────────────────────────────────────────
    // DELETE y no un flag de activo: la fila ES la configuración, y sin ella el
    // producto vuelve al estado por defecto, que es no alertar. No hay historial
    // que preservar porque las alertas no se persisten.
    if (accion === 'quitar') {
      const producto = String(body.producto || '').trim();
      if (!producto) return res.status(400).json({ error: 'Falta el producto' });

      const rows = await sql`
        DELETE FROM stock_minimos WHERE producto = ${producto} RETURNING *
      `;
      if (rows.length === 0) return res.status(404).json({ error: `No hay mínimo definido para ${producto}` });
      return res.status(200).json({ ok: true, minimo: rows[0] });
    }

    return res.status(400).json({ error: `Acción desconocida: ${accion}` });
  } catch (e) {
    console.error('[stock] ERROR', e.message, e.code || '', e.detail || '', e.constraint || '');
    return res.status(500).json({ error: e.message });
  }
}
