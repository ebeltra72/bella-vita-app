import { neon } from '@neondatabase/serverless';
import { cors, leerBody } from './_lib/http.js';

const esMes = (m) => typeof m === 'string' && /^\d{4}-\d{2}$/.test(m);

// ══════════════════════════════════════════════════════════════════════════════
// NIZA — ventas de la línea
//
// Adrián carga en cada visita cuántas unidades se vendieron desde la anterior.
// El guardado es sincronizador y no acumulativo: la lista que llega ES el estado
// final de esa visita, así que el mismo endpoint sirve para la carga original y
// para una edición, y reintentar el check-out no duplica ni suma dos veces.
// ══════════════════════════════════════════════════════════════════════════════
export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const sql = neon(process.env.NEON_URL);

  try {
    if (req.method === 'GET') {
      const q = req.query || {};

      // ─── GET ?visita_id=N ─────────────────────────────────────────────────
      // Lo cargado en una visita ya cerrada, para poder revisarlo después
      if (q.visita_id) {
        const rows = await sql`
          SELECT * FROM niza_ventas
          WHERE visita_id = ${q.visita_id}::bigint
          ORDER BY producto
        `;
        return res.status(200).json(rows);
      }

      // ─── GET ?resumen=1&mes=YYYY-MM ───────────────────────────────────────
      // Total por producto del mes, con el desglose por sucursal adentro para
      // que la tabla del panel se pueda expandir sin un segundo pedido. Es una
      // sola query agrupada por las dos dimensiones: armar el anidado en JS sale
      // gratis y evita el problema clásico de dos agregados que no cuadran.
      if (q.resumen) {
        if (!esMes(q.mes)) return res.status(400).json({ error: 'Falta el parámetro mes en formato YYYY-MM' });

        const filas = await sql`
          SELECT producto, sucursal_id, sucursal_nombre, SUM(unidades)::int AS unidades
          FROM niza_ventas
          WHERE to_char(fecha, 'YYYY-MM') = ${q.mes}
          GROUP BY producto, sucursal_id, sucursal_nombre
          ORDER BY producto
        `;

        const porProducto = [];
        for (const f of filas) {
          let p = porProducto.find(x => x.producto === f.producto);
          if (!p) { p = { producto: f.producto, unidades: 0, sucursales: [] }; porProducto.push(p); }
          p.unidades += f.unidades;
          p.sucursales.push({
            sucursal_id: f.sucursal_id,
            sucursal_nombre: f.sucursal_nombre,
            unidades: f.unidades,
          });
        }

        // Más vendido primero; dentro de cada producto, la sucursal que más vendió
        porProducto.sort((a, b) => b.unidades - a.unidades || a.producto.localeCompare(b.producto, 'es'));
        for (const p of porProducto) p.sucursales.sort((a, b) => b.unidades - a.unidades);

        return res.status(200).json(porProducto);
      }

      // ─── GET ?sucursal_id=N&mes=YYYY-MM ───────────────────────────────────
      // Los dos filtros son opcionales por separado: sin ninguno devuelve las
      // últimas ventas cargadas, que es lo que necesita una pantalla de control.
      const rows = await sql`
        SELECT * FROM niza_ventas
        WHERE (${q.sucursal_id || null}::bigint IS NULL OR sucursal_id = ${q.sucursal_id || null}::bigint)
          AND (${q.mes || null}::text IS NULL OR to_char(fecha, 'YYYY-MM') = ${q.mes || null}::text)
        ORDER BY fecha DESC, producto
        LIMIT 1000
      `;
      return res.status(200).json(rows);
    }

    if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

    const body = leerBody(req);
    const { accion } = body;

    // ─── registrar_ventas ───────────────────────────────────────────────────
    if (accion === 'registrar_ventas') {
      const visitaId = body.visita_id ?? body.visitaId;
      const sucursalId = body.sucursal_id ?? body.sucursalId;
      const sucursalNombre = body.sucursal_nombre ?? body.sucursalNombre;
      const fecha = body.fecha;

      if (visitaId == null) return res.status(400).json({ error: 'Falta visita_id' });
      if (sucursalId == null) return res.status(400).json({ error: 'Falta sucursal_id' });
      if (!sucursalNombre) return res.status(400).json({ error: 'Falta sucursal_nombre' });
      if (!fecha) return res.status(400).json({ error: 'Falta fecha' });
      if (!Array.isArray(body.ventas)) return res.status(400).json({ error: 'ventas debe ser un array' });

      // Se normaliza y se valida todo ANTES de tocar la base: una venta inválida
      // en el medio del lote no puede dejar la visita a medio guardar.
      const ventas = [];
      for (const v of body.ventas) {
        const producto = String(v?.producto || '').trim();
        if (!producto) return res.status(400).json({ error: 'Hay una venta sin producto' });

        const unidades = Number(v?.unidades);
        if (!Number.isInteger(unidades) || unidades < 0) {
          return res.status(400).json({ error: `Unidades inválidas para ${producto}: ${v?.unidades}` });
        }
        if (ventas.some(x => x.producto === producto)) {
          return res.status(400).json({ error: `${producto} viene repetido` });
        }
        ventas.push({ producto, unidades });
      }

      const productos = JSON.stringify(ventas.map(v => v.producto));

      // Los productos que ya no vienen se borran: si Adrián corrige la carga y
      // deja un campo en blanco, esa venta tiene que desaparecer. Con la lista
      // vacía el NOT IN no matchea a nadie y borra todo, que es "no cargué Niza".
      await sql`
        DELETE FROM niza_ventas
        WHERE visita_id = ${visitaId}::bigint
          AND producto NOT IN (
            SELECT value FROM json_array_elements_text(${productos}::json)
          )
      `;

      for (const v of ventas) {
        await sql`
          INSERT INTO niza_ventas (visita_id, sucursal_id, sucursal_nombre, producto, unidades, fecha)
          VALUES (
            ${visitaId}, ${sucursalId}, ${sucursalNombre},
            ${v.producto}, ${v.unidades}, ${fecha}::date
          )
          ON CONFLICT (visita_id, producto) DO UPDATE SET
            unidades = EXCLUDED.unidades,
            fecha    = EXCLUDED.fecha
        `;
      }

      const total = ventas.reduce((a, v) => a + v.unidades, 0);
      return res.status(200).json({ ok: true, productos: ventas.length, unidades: total });
    }

    return res.status(400).json({ error: `Acción desconocida: ${accion}` });
  } catch (e) {
    console.error('[niza] ERROR', e.message, e.code || '', e.detail || '', e.constraint || '');
    return res.status(500).json({ error: e.message });
  }
}
