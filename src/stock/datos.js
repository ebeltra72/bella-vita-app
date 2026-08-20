import { CATALOGO } from "../constants";

// ══════════════════════════════════════════════════════════════════════════════
// DERIVACIONES DE STOCK
//
// Sin JSX y sin fetch, como src/dashboard/datos.js y src/plan/datos.js. Lo usan
// el panel de Stock (para pintar en rojo lo que está bajo mínimo) y el panel de
// mínimos (para agrupar por rubro).
//
// Las alertas del Dashboard NO se calculan acá: vienen ya derivadas y ordenadas
// del GET de inventarios. Acá vive sólo la regla que hace falta del lado del
// cliente, que es la misma regla escrita dos veces a propósito — una en SQL para
// la vista de alertas, otra en JS para el historial de controles, que ya tiene
// los datos en memoria y no vale la pena volver a pedir.
// ══════════════════════════════════════════════════════════════════════════════

// Mismo criterio que el CASE del SQL: los valores del jsonb son lo que tipeó
// Adrián, siempre strings, y el formulario carga con step 0,5. Un valor que no
// sea un número limpio devuelve null, que NO es lo mismo que cero.
export function parseCantidad(valor) {
  if (valor === null || valor === undefined) return null;
  const txt = String(valor).trim().replace(",", ".");
  if (!/^[0-9]+(\.[0-9]+)?$/.test(txt)) return null;
  return Number(txt);
}

// { producto: minimo } para poder consultar por nombre sin recorrer el array
export function indexarMinimos(minimos = []) {
  const out = {};
  for (const m of minimos) {
    const n = Number(m.minimo);
    if (Number.isFinite(n)) out[m.producto] = n;
  }
  return out;
}

// Devuelve false cuando no hay mínimo definido o cuando la cantidad no se puede
// leer: "no sé" no es "está mal". Sin mínimo no hay alerta, que es justamente lo
// que evita obligar a definir los 80 productos del catálogo.
export function bajoMinimo(valor, minimo) {
  if (minimo === null || minimo === undefined) return false;
  const cant = parseCantidad(valor);
  if (cant === null) return false;
  return cant < Number(minimo);
}

// Cuántos productos de un control quedaron por debajo. Lo usa el encabezado
// plegado de cada control en el panel de Stock.
export function contarBajoMinimo(productos = {}, minimosPorProducto = {}) {
  return Object.entries(productos)
    .filter(([prod, cant]) => bajoMinimo(cant, minimosPorProducto[prod]))
    .length;
}

// NUMERIC vuelve de Postgres como string ("10.00") y las cantidades del jsonb
// son strings tipeados a mano. En los dos casos se quiere leer "10" y "0.5".
export function fmtCantidad(x) {
  const n = Number(String(x ?? "").replace(",", "."));
  return Number.isFinite(n) ? String(n) : String(x ?? "—");
}

// ─── CATÁLOGO ────────────────────────────────────────────────────────────────

// A qué rubro pertenece un producto. Devuelve null para los nombres que no están
// en el catálogo: un mínimo puede sobrevivir a que el producto se renombre, y en
// ese caso hay que poder mostrarlo igual en vez de esconderlo.
export function rubroDe(producto) {
  for (const [rubro, lista] of Object.entries(CATALOGO)) {
    if (lista.includes(producto)) return rubro;
  }
  return null;
}

// Los mínimos definidos, agrupados por rubro y en el orden del catálogo. Los
// productos huérfanos van al final, juntos.
export function agruparPorRubro(minimos = []) {
  const grupos = Object.keys(CATALOGO).map(rubro => ({
    rubro,
    items: minimos.filter(m => rubroDe(m.producto) === rubro),
  }));

  const huerfanos = minimos.filter(m => rubroDe(m.producto) === null);
  if (huerfanos.length > 0) grupos.push({ rubro: null, items: huerfanos });

  return grupos.filter(g => g.items.length > 0);
}

// Productos del catálogo que todavía no tienen mínimo, para el selector del alta
export function productosSinMinimo(minimos = []) {
  const definidos = new Set(minimos.map(m => m.producto));
  return Object.entries(CATALOGO)
    .map(([rubro, lista]) => ({ rubro, productos: lista.filter(p => !definidos.has(p)) }))
    .filter(g => g.productos.length > 0);
}
