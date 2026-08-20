-- ══════════════════════════════════════════════════════════════════════════════
-- BELLA VITA · FASE 5
-- Stock mínimo por producto
--
-- Ejecutar en el SQL Editor de Neon. Idempotente: se puede re-ejecutar.
--
-- No hay tabla de alertas: las alertas son una vista derivada de los últimos
-- controles cruzados contra estos mínimos, calculada al vuelo en el GET de
-- inventarios. Nada de estado persistido, nada que sincronizar, nada que se
-- desactualice. La única tabla nueva es la configuración.
--
-- El costo de la decisión: no queda historial de faltantes. Si un producto
-- estuvo bajo mínimo tres semanas y se repuso, no queda rastro. La alerta
-- desaparece sola cuando el control siguiente muestra cantidad >= mínimo.
-- ══════════════════════════════════════════════════════════════════════════════


-- ── Chequeo previo ────────────────────────────────────────────────────────────
-- La derivación expande inventarios.productos con jsonb_each. Si esta query
-- devuelve `json` en vez de `jsonb`, cambiar jsonb_each por json_each en
-- api/inventarios.js — el resto funciona igual.
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'inventarios'
ORDER BY ordinal_position;


-- ══════════════════════════════════════════════════════════════════════════════
-- SCRIPT 1/2 — Tabla stock_minimos
-- ══════════════════════════════════════════════════════════════════════════════
--
-- Notas de diseño:
--
--   · producto es la PRIMARY KEY y no hay columna id: el mínimo es uno solo por
--     producto y global a las 7 sucursales, así que el nombre ya identifica la
--     fila. Misma decisión que visita_personal en fase4.
--
--   · Sin sucursal_id a propósito. Si mañana hace falta un mínimo por sucursal,
--     entra como tabla aparte y ésta queda como el valor por defecto.
--
--   · minimo es NUMERIC y no INT: el control de inventario carga con step 0,5
--     ("medio bidón"), y un mínimo entero no podría expresar 0,5.
--
--   · La tabla arranca vacía y se llena de a poco. Un producto sin fila acá no
--     se evalúa nunca: es la forma de no obligar a Ileana a definir 80 mínimos,
--     y es también la única palanca para apagar una alerta molesta.
--
--   · No hay FK contra catalogo_productos: el control de inventario usa la
--     constante CATALOGO de src/constants.js, no esa tabla. El nombre lo valida
--     el cliente contra el catálogo al definir el mínimo. Un mínimo cuyo nombre
--     no matchee ningún producto simplemente no alerta nunca.

CREATE TABLE IF NOT EXISTS stock_minimos (
  producto       TEXT          PRIMARY KEY,
  minimo         NUMERIC(10,2) NOT NULL,
  creado_en      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  actualizado_en TIMESTAMPTZ,

  CONSTRAINT stock_minimos_minimo_chk   CHECK (minimo >= 0),
  CONSTRAINT stock_minimos_producto_chk CHECK (length(trim(producto)) > 0)
);


-- ══════════════════════════════════════════════════════════════════════════════
-- SCRIPT 2/2 — Índice de apoyo sobre inventarios
-- ══════════════════════════════════════════════════════════════════════════════
--
-- La derivación busca, para cada sucursal y producto, el control más reciente
-- que lo incluya. El JOIN contra stock_minimos poda la expansión antes del
-- DISTINCT ON, así que sólo se expanden los productos configurados; este índice
-- cubre el ordenamiento por fecha dentro de cada sucursal.
--
-- A 30 controles por semana esto es irrelevante y el planner puede ignorarlo.
-- Existe para que siga siendo irrelevante dentro de dos años.

CREATE INDEX IF NOT EXISTS idx_inventarios_sucursal_fecha
  ON inventarios (sucursal_id, fecha DESC);


-- ══════════════════════════════════════════════════════════════════════════════
-- VERIFICACIÓN — ejecutar después de los dos scripts
-- ══════════════════════════════════════════════════════════════════════════════

-- 1. stock_minimos debe tener 4 columnas
SELECT ordinal_position, column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'stock_minimos'
ORDER BY ordinal_position;

-- 2. Los dos CHECK y la PK
SELECT conname, contype FROM pg_constraint
WHERE conrelid = 'stock_minimos'::regclass
ORDER BY contype, conname;

-- 3. Arranca vacía
SELECT COUNT(*) AS minimos FROM stock_minimos;

-- 4. La derivación de alertas, a mano: es la misma query que corre
--    api/inventarios.js en el GET ?alertas=1. Con la tabla vacía devuelve 0
--    filas; después de cargar un mínimo devuelve las sucursales por debajo.
--
--    Tres detalles que no se ven a simple vista:
--
--      · DISTINCT ON (sucursal_id, producto) y no por rubro: si Adrián dejó un
--        producto en blanco esta semana pero lo cargó la anterior, la alerta
--        sobrevive con el último dato real en vez de desaparecer por un
--        casillero vacío.
--
--      · El CASE con regex antes del cast: los valores del jsonb son lo que
--        tipeó Adrián, strings. Un cast directo revienta la query entera con un
--        solo valor raro; así esa fila devuelve NULL y se descarta. El regex se
--        aplica sobre el trim y no usa \s a propósito: en JS un template
--        literal se come esa barra y la query del código dejaría de matchear.
--
--      · El WHERE cantidad IS NOT NULL va en el DISTINCT ON y no después, para
--        que un valor ilegible no tape al control anterior que sí servía.
WITH cargados AS (
  SELECT i.id AS inventario_id, i.sucursal_id, i.sucursal_nombre, i.rubro, i.fecha,
         p.key AS producto, m.minimo,
         CASE WHEN trim(p.value #>> '{}') ~ '^[0-9]+([.,][0-9]+)?$'
              THEN replace(trim(p.value #>> '{}'), ',', '.')::numeric END AS cantidad
  FROM inventarios i
  CROSS JOIN LATERAL jsonb_each(i.productos) p
  JOIN stock_minimos m ON m.producto = p.key
),
ultimos AS (
  SELECT DISTINCT ON (sucursal_id, producto) *
  FROM cargados
  WHERE cantidad IS NOT NULL
  ORDER BY sucursal_id, producto, fecha DESC, inventario_id DESC
)
SELECT producto, sucursal_nombre, cantidad, minimo, fecha
FROM ultimos
WHERE cantidad < minimo
ORDER BY fecha, sucursal_nombre, producto;
