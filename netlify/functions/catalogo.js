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
      const rows = await sql`
        SELECT * FROM catalogo_productos 
        WHERE activo = true 
        ORDER BY rubro, orden, nombre
      `;
      return { statusCode: 200, headers, body: JSON.stringify(rows) };
    }

    if (event.httpMethod === 'POST') {
      const { accion, id, rubro, nombre } = JSON.parse(event.body);

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
        await sql`
          UPDATE catalogo_productos SET activo = false WHERE id = ${id}
        `;
      }

      if (accion === 'renombrar') {
        await sql`
          UPDATE catalogo_productos SET nombre = ${nombre} WHERE id = ${id}
        `;
      }

      return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
    }
  } catch (e) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
  }
};
