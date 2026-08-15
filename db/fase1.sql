-- ══════════════════════════════════════════════════════════════════════════════
-- BELLA VITA · FASE 1
-- Hallazgos, pendientes y cierre estructurado de visita
--
-- Ejecutar en el SQL Editor de Neon, en orden (Script 1, después Script 2).
-- Ambos scripts son idempotentes: se pueden re-ejecutar sin efectos adversos.
-- ══════════════════════════════════════════════════════════════════════════════


-- ══════════════════════════════════════════════════════════════════════════════
-- SCRIPT 1/2 — Tabla pendientes
-- ══════════════════════════════════════════════════════════════════════════════
--
-- Notas de diseño:
--
--   · sucursal_id es BIGINT y no INTEGER: SucursalesPanel crea las sucursales
--     nuevas con id = Date.now() (13 dígitos), que desborda INTEGER. Las 7
--     sucursales iniciales usan ids 1-7, pero cualquiera que se agregue después
--     rompería un INTEGER.
--
--   · Los valores de estado / prioridad / categoria se guardan sin acentos y en
--     minúsculas ('critica', 'en_progreso', 'atencion'). La UI se encarga de
--     mostrarlos como "Crítica", "En progreso", "Atención al paciente".
--
--   · categoria incluye 'otro' para pendientes cargados a mano desde el panel de
--     Ileana, que no provienen de ninguna sección de la encuesta.
--
--   · seguimiento es un array JSONB de objetos {fecha, autor, texto}. Se resuelve
--     como columna y no como segunda tabla para evitar el join, siguiendo el
--     mismo criterio que visitas.respuestas e inventarios.productos.
--
--   · id lo genera el cliente con Date.now(), igual que en visitas, registros
--     comerciales e inventarios.

CREATE TABLE IF NOT EXISTS pendientes (
  id                  BIGINT      PRIMARY KEY,
  visita_id           BIGINT,
  sucursal_id         BIGINT      NOT NULL,
  sucursal_nombre     TEXT        NOT NULL,
  categoria           TEXT        NOT NULL,
  descripcion         TEXT        NOT NULL,
  accion_correctiva   TEXT,
  responsable         TEXT,
  fecha_creacion      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  fecha_limite        DATE,
  prioridad           TEXT        NOT NULL DEFAULT 'media',
  estado              TEXT        NOT NULL DEFAULT 'abierto',
  evidencia_url       TEXT,
  comentario_cierre   TEXT,
  pregunta_id         TEXT,
  visita_cierre_id    BIGINT,
  fecha_actualizacion TIMESTAMPTZ,
  seguimiento         JSONB       NOT NULL DEFAULT '[]'::jsonb,

  CONSTRAINT pendientes_prioridad_chk
    CHECK (prioridad IN ('critica','alta','media','baja')),
  CONSTRAINT pendientes_estado_chk
    CHECK (estado IN ('abierto','en_progreso','resuelto','cancelado')),
  CONSTRAINT pendientes_categoria_chk
    CHECK (categoria IN ('atencion','equipo','operacion','maquinas','comercial','niza','otro'))
);

-- Pendientes abiertos de una sucursal (se consulta al inicio de cada visita)
CREATE INDEX IF NOT EXISTS idx_pendientes_sucursal_estado
  ON pendientes (sucursal_id, estado);

-- Vencidos y próximos a vencer (orden por defecto del panel de Ileana)
CREATE INDEX IF NOT EXISTS idx_pendientes_estado_limite
  ON pendientes (estado, fecha_limite);

-- Pendientes originados en una visita puntual
CREATE INDEX IF NOT EXISTS idx_pendientes_visita
  ON pendientes (visita_id);


-- ══════════════════════════════════════════════════════════════════════════════
-- SCRIPT 2/2 — Cierre estructurado en la tabla visitas
-- ══════════════════════════════════════════════════════════════════════════════
--
-- Seguro de ejecutar con la app en producción:
--
--   netlify/functions/visitas.js hace INSERT INTO visitas VALUES (...) con 15
--   valores posicionales. En PostgreSQL un INSERT ... VALUES con menos valores
--   que columnas es válido: asigna de izquierda a derecha y el resto toma su
--   DEFAULT. Como las 6 columnas nuevas van al final, la versión desplegada
--   sigue funcionando sin cambios, y las visitas que se registren mientras tanto
--   quedan correctamente marcadas como encuesta_version = 'v1'.
--
--   El DEFAULT 'v1' además backfillea las visitas históricas, que es lo que
--   necesita HistorialPanel para elegir el renderer viejo en vez del nuevo.

ALTER TABLE visitas
  ADD COLUMN IF NOT EXISTS semaforo         TEXT,
  ADD COLUMN IF NOT EXISTS hallazgo         TEXT,
  ADD COLUMN IF NOT EXISTS accion_tomada    BOOLEAN,
  ADD COLUMN IF NOT EXISTS accion_detalle   TEXT,
  ADD COLUMN IF NOT EXISTS dejo_pendientes  BOOLEAN,
  ADD COLUMN IF NOT EXISTS encuesta_version TEXT NOT NULL DEFAULT 'v1';

-- PostgreSQL no soporta ADD CONSTRAINT IF NOT EXISTS
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'visitas_semaforo_chk'
  ) THEN
    ALTER TABLE visitas
      ADD CONSTRAINT visitas_semaforo_chk
      CHECK (semaforo IS NULL OR semaforo IN ('sin_problemas','mejorable','prioritario'));
  END IF;
END $$;


-- ══════════════════════════════════════════════════════════════════════════════
-- VERIFICACIÓN — ejecutar después de los dos scripts
-- ══════════════════════════════════════════════════════════════════════════════

-- 1. visitas debe tener 21 columnas, con las 6 nuevas al final y en este orden:
--    semaforo, hallazgo, accion_tomada, accion_detalle, dejo_pendientes,
--    encuesta_version
SELECT ordinal_position, column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'visitas'
ORDER BY ordinal_position;

-- 2. pendientes debe tener 18 columnas
SELECT ordinal_position, column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'pendientes'
ORDER BY ordinal_position;

-- 3. Todas las visitas históricas deben quedar en 'v1'
SELECT encuesta_version, COUNT(*) AS visitas
FROM visitas
GROUP BY encuesta_version;

-- 4. Los CHECK deben existir (3 en pendientes, 1 en visitas)
SELECT conrelid::regclass AS tabla, conname AS constraint_name
FROM pg_constraint
WHERE conname IN (
  'pendientes_prioridad_chk',
  'pendientes_estado_chk',
  'pendientes_categoria_chk',
  'visitas_semaforo_chk'
)
ORDER BY tabla, conname;
