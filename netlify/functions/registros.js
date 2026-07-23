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
      const rows = await sql`SELECT * FROM registros_comerciales ORDER BY fecha DESC`;
      return { statusCode: 200, headers, body: JSON.stringify(rows) };
    }

    if (event.httpMethod === 'POST') {
      const r = JSON.parse(event.body);
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
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
    }
  } catch (e) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
  }
};
