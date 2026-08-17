import { neon } from '@neondatabase/serverless';
import { cors, leerBody, nul } from './_lib/http.js';

const SEMAFOROS = ['sin_problemas', 'mejorable', 'prioritario'];

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const sql = neon(process.env.NEON_URL);

  try {
    if (req.method === 'GET') {
      const rows = await sql`SELECT * FROM visitas ORDER BY checkin DESC`;
      return res.status(200).json(rows);
    }

    if (req.method === 'POST') {
      const v = leerBody(req);

      if (v.semaforo && !SEMAFOROS.includes(v.semaforo)) {
        return res.status(400).json({ error: `Semáforo inválido: ${v.semaforo}` });
      }

      // encuesta_version la manda el cliente: 'v2' sólo cuando la visita se hizo
      // con la encuesta estructurada. Sin ese campo se asume 'v1'.
      const version = v.encuestaVersion || 'v1';

      // Columnas explícitas y no INSERT ... VALUES posicional: agregar una columna
      // a la tabla no puede volver a desalinear este insert.
      await sql`
        INSERT INTO visitas (
          id, sucursal_id, sucursal_nombre,
          checkin, checkout,
          lat_checkin, lng_checkin, lat_checkout, lng_checkout,
          dist_checkin, dist_checkout,
          gps_ok_checkin, gps_ok_checkout,
          simulado, respuestas,
          semaforo, hallazgo, accion_tomada, accion_detalle,
          dejo_pendientes, encuesta_version
        ) VALUES (
          ${v.id}, ${v.sucursalId}, ${v.sucursalNombre},
          ${v.checkin}, ${nul(v.checkout)},
          ${v.latCheckin}, ${v.lngCheckin}, ${nul(v.latCheckout)}, ${nul(v.lngCheckout)},
          ${v.distCheckin}, ${nul(v.distCheckout)},
          ${v.gpsOkCheckin}, ${nul(v.gpsOkCheckout)},
          ${v.simulado}, ${JSON.stringify(v.respuestas)},
          ${nul(v.semaforo)}, ${nul(v.hallazgo)}, ${nul(v.accionTomada)}, ${nul(v.accionDetalle)},
          ${nul(v.dejoPendientes)}, ${version}
        )
        ON CONFLICT (id) DO UPDATE SET
          checkout         = ${nul(v.checkout)},
          lat_checkout     = ${nul(v.latCheckout)},
          lng_checkout     = ${nul(v.lngCheckout)},
          dist_checkout    = ${nul(v.distCheckout)},
          gps_ok_checkout  = ${nul(v.gpsOkCheckout)},
          respuestas       = ${JSON.stringify(v.respuestas)},
          semaforo         = ${nul(v.semaforo)},
          hallazgo         = ${nul(v.hallazgo)},
          accion_tomada    = ${nul(v.accionTomada)},
          accion_detalle   = ${nul(v.accionDetalle)},
          dejo_pendientes  = ${nul(v.dejoPendientes)},
          encuesta_version = ${version}
      `;
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Método no permitido' });
  } catch (e) {
    console.error('[visitas] ERROR', e.message, e.code || '', e.detail || '');
    return res.status(500).json({ error: e.message });
  }
}
