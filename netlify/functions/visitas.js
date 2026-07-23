const { neon } = require('@neondatabase/serverless');

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
      await sql`
        INSERT INTO visitas VALUES (
          ${v.id}, ${v.sucursalId}, ${v.sucursalNombre},
          ${v.checkin}, ${v.checkout},
          ${v.latCheckin}, ${v.lngCheckin},
          ${v.latCheckout}, ${v.lngCheckout},
          ${v.distCheckin}, ${v.distCheckout},
          ${v.gpsOkCheckin}, ${v.gpsOkCheckout},
          ${v.simulado}, ${JSON.stringify(v.respuestas)}
        )
        ON CONFLICT (id) DO UPDATE SET
          checkout = ${v.checkout},
          lat_checkout = ${v.latCheckout},
          lng_checkout = ${v.lngCheckout},
          dist_checkout = ${v.distCheckout},
          gps_ok_checkout = ${v.gpsOkCheckout},
          respuestas = ${JSON.stringify(v.respuestas)}
      `;
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
    }
  } catch (e) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
  }
};
