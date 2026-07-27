const { Pool } = require('pg');

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };

  const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

  try {
    if (event.httpMethod === 'GET') {
      const sucursalId = event.queryStringParameters?.sucursal_id;
      let result;
      if (sucursalId) {
        result = await pool.query('SELECT * FROM inventarios WHERE sucursal_id = $1 ORDER BY fecha DESC LIMIT 50', [sucursalId]);
      } else {
        result = await pool.query('SELECT * FROM inventarios ORDER BY fecha DESC LIMIT 100');
      }
      return { statusCode: 200, headers, body: JSON.stringify(result.rows) };
    }

    if (event.httpMethod === 'POST') {
      const inv = JSON.parse(event.body);
      await pool.query(
        'INSERT INTO inventarios (id, visita_id, sucursal_id, sucursal_nombre, fecha, rubro, semana_key, productos) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)',
        [inv.id, inv.visitaId, inv.sucursalId, inv.sucursalNombre, inv.fecha, inv.rubro, inv.semanaKey, JSON.stringify(inv.productos)]
      );
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
    }
  } catch (e) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
  } finally {
    await pool.end();
  }
};
