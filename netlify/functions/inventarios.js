const { neon } = require('@neondatabase/serverless');

exports.handler = async (event) => {
  const sql = neon(process.env.DATABASE_URL);
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };

  try {
    if (event.httpMethod === 'GET') {
      const params = new URLSearchParams(event.queryStringParameters || {});
      const sucursalId = params.get('sucursal_id');
      const rubro = params.get('rubro');
      
      let rows;
      if (sucursalId && rubro) {
        rows = await sql`
          SELECT * FROM inventarios 
          WHERE sucursal_id = ${sucursalId} AND rubro = ${rubro}
          ORDER BY fecha DESC LIMIT 10
        `;
      } else if (sucursalId) {
        rows = await sql`
          SELECT * FROM inventarios 
          WHERE sucursal_id = ${sucursalId}
          ORDER BY fecha DESC LIMIT 50
        `;
      } else {
        rows = await sql`
          SELECT * FROM inventarios 
          ORDER BY fecha DESC LIMIT 100
        `;
      }
      return { statusCode: 200, headers, body: JSON.stringify(rows) };
    }

    if (event.httpMethod === 'POST') {
      const inv = JSON.parse(event.body);
      await sql`
        INSERT INTO inventarios (
          id, visita_id, sucursal_id, sucursal_nombre,
          fecha, rubro, productos
        ) VALUES (
          ${inv.id}, ${inv.visitaId}, ${inv.sucursalId}, ${inv.sucursalNombre},
          ${inv.fecha}, ${inv.rubro}, ${JSON.stringify(inv.productos)}
        )
      `;
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
    }
  } catch (e) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
  }
};
