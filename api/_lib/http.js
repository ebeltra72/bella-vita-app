// Helpers compartidos por las functions de api/.
// El prefijo _ hace que Vercel no enrute esta carpeta como endpoint.

// Mismo origen desde que las functions viven en /api, así que CORS ya no hace
// falta. Se mantiene por si alguna vez se llama desde otro lado: sale gratis.
export function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

// Vercel parsea el body cuando el Content-Type es application/json, pero no
// siempre: puede llegar como string. Se contemplan los dos casos.
export function leerBody(req) {
  const b = req.body;
  if (!b) return {};
  if (typeof b === 'string') {
    try { return JSON.parse(b); } catch { return {}; }
  }
  return b;
}

// '' y undefined se normalizan a null: un string vacío rompe el cast a DATE
export const nul = (v) => (v === '' || v === undefined ? null : v);
