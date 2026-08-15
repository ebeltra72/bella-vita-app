const { neon } = require('@neondatabase/serverless');

const SEMAFOROS = ['sin_problemas', 'mejorable', 'prioritario'];

const nul = (v) => (v === '' || v === undefined ? null : v);

exports.handler = async (event) => {
  const sql = neon(process.env.DATABASE_URL);
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    if (event.httpMethod === 'GET') {
      const rows = await sql`SELECT * FROM visitas ORDER BY checkin DESC`;
      return { statusCode: 200, headers, body: JSON.stringify(rows) };
    }

    if (event.httpMethod === 'POST') {
      const v = JSON.parse(event.body);

      if (v.semaforo && !SEMAFOROS.includes(v.semaforo)) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: `Semáforo inválido: ${v.semaforo}` }) };
      }

      // encuesta_version la manda el cliente: 'v2' sólo cuando la visita se hizo
      // con la encuesta estructurada. Sin ese campo se asume 'v1', que es lo que
      // corresponde mientras VistaAdrian siga usando las preguntas viejas.
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
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
    }

    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Método no permitido' }) };
  } catch (e) {
    console.log('visitas error:', e.message);
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
  }
};
