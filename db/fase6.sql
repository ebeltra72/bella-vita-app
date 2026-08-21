-- ══════════════════════════════════════════════════════════════════════════════
-- BELLA VITA · FASE 6
-- Ventas de la línea Niza
--
-- Niza Científica es un laboratorio de skincare que Bella Vita compra y revende.
-- Adrián carga en cada visita cuántas unidades se vendieron desde la anterior.
--
-- Ejecutar en el SQL Editor de Neon. Idempotente: se puede re-ejecutar.
-- ══════════════════════════════════════════════════════════════════════════════


-- ── Chequeo previo ────────────────────────────────────────────────────────────
-- El FK de visita_id necesita que visitas.id sea PRIMARY KEY o UNIQUE. Si esta
-- query no devuelve ninguna fila, sacar la cláusula REFERENCES.
SELECT conname, contype
FROM pg_constraint
WHERE conrelid = 'visitas'::regclass AND contype IN ('p','u');


-- ══════════════════════════════════════════════════════════════════════════════
-- Tabla niza_ventas
-- ══════════════════════════════════════════════════════════════════════════════
--
-- Notas de diseño:
--
--   · La PK es (visita_id, producto) y no hay columna id. La fila ya está
--     identificada por esas dos columnas, y es justo el índice que necesita el
--     ON CONFLICT del guardado. Misma decisión que visita_personal (fase4) y
--     stock_minimos (fase5). Un id con Date.now() encima sería además peligroso:
--     las filas de una visita se generan en el mismo milisegundo y colisionarían.
--
--   · Una fila por producto vendido, no un jsonb como inventarios.productos. Las
--     ventas se agregan por producto y por mes cruzando sucursales, y en jsonb
--     eso obliga a expandir con jsonb_each en cada consulta (ver la query de
--     alertas de fase5). Acá el agregado ES la operación principal.
--
--   · unidades INTEGER y no NUMERIC: los productos Niza se venden por unidad,
--     no hay medio frasco.
--
--   · Se guardan los ceros que Adrián carga explícitamente. "Revisé Niza y no
--     vendí ninguno" y "no cargué Niza" son cosas distintas y las dos importan
--     para leer un mes. Los campos que deja en blanco no generan fila.
--
--   · sucursal_nombre se copia además del id, igual que en pendientes y
--     recorridas_plan: las sucursales viven en localStorage y no en la base, así
--     que sin el nombre la fila no se puede leer sola.
--
--   · Las filas se escriben en el check-out, no cuando Adrián confirma la
--     pantalla: la visita todavía no existe en la base hasta ese momento. Mismo
--     criterio que la presencia de personal en fase4.

CREATE TABLE IF NOT EXISTS niza_ventas (
  visita_id       BIGINT      NOT NULL REFERENCES visitas(id) ON DELETE CASCADE,
  sucursal_id     BIGINT      NOT NULL,
  sucursal_nombre TEXT        NOT NULL,
  producto        TEXT        NOT NULL,
  unidades        INTEGER     NOT NULL,
  fecha           DATE        NOT NULL,
  creado_en       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  PRIMARY KEY (visita_id, producto),

  CONSTRAINT niza_ventas_unidades_chk CHECK (unidades >= 0),
  CONSTRAINT niza_ventas_producto_chk CHECK (length(trim(producto)) > 0)
);


-- ── Índices ───────────────────────────────────────────────────────────────────

-- GET ?sucursal_id=N&mes=YYYY-MM
CREATE INDEX IF NOT EXISTS idx_niza_ventas_sucursal_fecha
  ON niza_ventas (sucursal_id, fecha);

-- GET ?resumen=1&mes=YYYY-MM — agrega por producto sobre el rango del mes
CREATE INDEX IF NOT EXISTS idx_niza_ventas_fecha_producto
  ON niza_ventas (fecha, producto);


-- ══════════════════════════════════════════════════════════════════════════════
-- VERIFICACIÓN — ejecutar después
-- ══════════════════════════════════════════════════════════════════════════════

-- 1. Debe tener 7 columnas
SELECT ordinal_position, column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'niza_ventas'
ORDER BY ordinal_position;

-- 2. La PK compuesta, el FK y los dos CHECK
SELECT conname, contype FROM pg_constraint
WHERE conrelid = 'niza_ventas'::regclass
ORDER BY contype, conname;

-- 3. Los dos índices
SELECT indexname, indexdef FROM pg_indexes
WHERE tablename = 'niza_ventas'
ORDER BY indexname;

-- 4. Arranca vacía
SELECT COUNT(*) AS ventas FROM niza_ventas;

-- 5. El resumen del mes: es la misma query que corre el GET ?resumen=1
SELECT producto,
       SUM(unidades)::int                 AS unidades,
       COUNT(DISTINCT sucursal_id)::int   AS sucursales
FROM niza_ventas
WHERE to_char(fecha, 'YYYY-MM') = '2026-08'
GROUP BY producto
ORDER BY unidades DESC, producto;
