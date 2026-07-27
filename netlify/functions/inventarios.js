exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };

  const dbUrl = process.env.DATABASE_URL;

  // Parsear la connection string de Neon para usar fetch HTTP
  const neonFetch = async (query, params = []) => {
    const url = dbUrl.replace('postgresql://', 'https://').replace('postgres://', 'https://');
    const [creds, rest] = url.replace('https://', '').split('@');
    const [user, password] = creds.split(':');
    const [host, dbPath] = rest.split('/');
    const database = dbPath.split('?')[0];

    const response = await fetch(`https://${host}/sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(`${user}:${password}`).toString('base64')}`,
        'Neon-Connection-String': dbUrl,
      },
      body: JSON.stringify({ query, params }),
    });
    const data = await response.json();
    if (data.error) throw new Error(data.error);
    return data;
  };

  try {
    if (event.httpMethod === 'GET') {
      const sucursalId = event.queryStringParameters?.sucursal_id;
      let result;
      if (sucursalId) {
        result = await neonFetch('SELECT * FROM inventarios WHERE sucursal_id = $1 ORDER BY fecha DESC LIMIT 50', [sucursalId]);
      } else {
        result = await neonFetch('SELECT * FROM inventarios ORDER BY fecha DESC LIMIT 100');
      }
      return { statusCode: 200, headers, body: JSON.stringify(result.rows) };
    }

    if (event.httpMethod === 'POST') {
      const inv = JSON.parse(event.body);
      await neonFetch(
        'INSERT INTO inventarios (id, visita_id, sucursal_id, sucursal_nombre, fecha, rubro, semana_key, productos) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)',
        [inv.id, inv.visitaId, inv.sucursalId, inv.sucursalNombre, inv.fecha, inv.rubro, inv.semanaKey, JSON.stringify(inv.productos)]
      );
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
    }
  } catch (e) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
  }
};
