-- ══════════════════════════════════════════════════════════════════════════════
-- BELLA VITA · FASE 3
-- Planificación mensual de recorridas
--
-- Ejecutar en el SQL Editor de Neon. Idempotente: se puede re-ejecutar.
-- ══════════════════════════════════════════════════════════════════════════════


-- ── Chequeo previo ────────────────────────────────────────────────────────────
-- El FK de visita_id necesita que visitas.id sea PRIMARY KEY o UNIQUE.
-- visitas.js usa ON CONFLICT (id), así que debería estarlo. Si esta query no
-- devuelve ninguna fila, sacar la cláusula REFERENCES de más abajo.
SELECT conname, contype
FROM pg_constraint
WHERE conrelid = 'visitas'::regclass AND contype IN ('p','u');


-- ── Tabla ─────────────────────────────────────────────────────────────────────
--
-- Notas de diseño:
--
--   · mes NO es una columna generada a partir de fecha_plan, a propósito. Si una
--     recorrida de agosto se reprograma al 2 de septiembre, tiene que seguir
--     contando para el plan de agosto, que es el que Ileana aprobó. mes significa
--     "a qué plan pertenece", no "en qué mes cae".
--
--   · sucursal_id es BIGINT y no INTEGER: SucursalesPanel crea las sucursales
--     nuevas con id = Date.now() (13 dígitos), que desborda INTEGER.
--
--   · fecha_plan_original guarda la fecha antes de reprogramar, para que el
--     "planificado vs realizado" pueda mostrar "planificada el 5, realizada el
--     12 — reprogramada por X" sin duplicar filas.
--
--   · No existe el estado 'incumplida'. Se deriva en el cliente como
--     planificada + fecha_plan < hoy, igual que "vencido" en pendientes.

CREATE TABLE IF NOT EXISTS recorridas_plan (
  id                     BIGINT      PRIMARY KEY,
  mes                    TEXT        NOT NULL,
  sucursal_id            BIGINT      NOT NULL,
  sucursal_nombre        TEXT        NOT NULL,
  fecha_plan             DATE        NOT NULL,
  fecha_plan_original    DATE,
  franja                 TEXT        NOT NULL,
  estado                 TEXT        NOT NULL DEFAULT 'planificada',
  visita_id              BIGINT      REFERENCES visitas(id) ON DELETE SET NULL,
  aprobado_por_ileana    BOOLEAN     NOT NULL DEFAULT false,
  aprobado_en            TIMESTAMPTZ,
  motivo_reprogramacion  TEXT,
  creado_en              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_en         TIMESTAMPTZ,

  CONSTRAINT recorridas_mes_chk
    CHECK (mes ~ '^\d{4}-\d{2}$'),
  CONSTRAINT recorridas_franja_chk
    CHECK (franja IN ('apertura','intermedio','cierre')),
  CONSTRAINT recorridas_estado_chk
    CHECK (estado IN ('planificada','realizada','reprogramada','cancelada'))
);


-- ── Índices ───────────────────────────────────────────────────────────────────

-- No se puede planificar dos veces la misma sucursal, el mismo día y la misma
-- franja. Es parcial para que cancelar y volver a agendar el mismo slot no quede
-- bloqueado. Permite apertura + cierre el mismo día en la misma sucursal, que es
-- el caso que resuelve la regla de desempate del matching.
CREATE UNIQUE INDEX IF NOT EXISTS idx_recorridas_slot
  ON recorridas_plan (fecha_plan, sucursal_id, franja)
  WHERE estado <> 'cancelada';

-- Plan de un mes, ordenado por fecha
CREATE INDEX IF NOT EXISTS idx_recorridas_mes
  ON recorridas_plan (mes, fecha_plan);

-- Cobertura por sucursal dentro de un mes
CREATE INDEX IF NOT EXISTS idx_recorridas_sucursal
  ON recorridas_plan (sucursal_id, mes);

-- Ir de una visita a su recorrida
CREATE INDEX IF NOT EXISTS idx_recorridas_visita
  ON recorridas_plan (visita_id);

-- El que usa el matching automático del check-out
CREATE INDEX IF NOT EXISTS idx_recorridas_matching
  ON recorridas_plan (sucursal_id, fecha_plan)
  WHERE visita_id IS NULL;


-- ══════════════════════════════════════════════════════════════════════════════
-- VERIFICACIÓN — ejecutar después
-- ══════════════════════════════════════════════════════════════════════════════

-- 1. La tabla debe tener 14 columnas
SELECT ordinal_position, column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'recorridas_plan'
ORDER BY ordinal_position;

-- 2. Los 3 CHECK y el FK
SELECT conname, contype
FROM pg_constraint
WHERE conrelid = 'recorridas_plan'::regclass
ORDER BY contype, conname;

-- 3. Los 5 índices
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'recorridas_plan'
ORDER BY indexname;

-- 4. Debe arrancar vacía
SELECT COUNT(*) AS filas FROM recorridas_plan;
