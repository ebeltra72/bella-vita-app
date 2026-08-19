-- ══════════════════════════════════════════════════════════════════════════════
-- BELLA VITA · FASE 4
-- Plantel y cobertura de personal
--
-- Ejecutar en el SQL Editor de Neon. Idempotente: se puede re-ejecutar.
-- ══════════════════════════════════════════════════════════════════════════════


-- ── Chequeo previo ────────────────────────────────────────────────────────────
-- El FK de visita_id necesita que visitas.id sea PRIMARY KEY o UNIQUE (mismo
-- chequeo que en fase3). Si esta query no devuelve ninguna fila, sacar la
-- cláusula REFERENCES de visita_personal.
SELECT conname, contype
FROM pg_constraint
WHERE conrelid = 'visitas'::regclass AND contype IN ('p','u');


-- ══════════════════════════════════════════════════════════════════════════════
-- SCRIPT 1/3 — Tabla personal
-- ══════════════════════════════════════════════════════════════════════════════
--
-- Notas de diseño:
--
--   · Sin sucursal_id a propósito: el personal rota entre las 7 sucursales y la
--     asignación real de un día se deduce de visita_personal, no de una columna.
--
--   · id es BIGINT sin identity, igual que sucursales, visitas y pendientes: las
--     28 personas iniciales usan ids 1-28 y las que se agreguen desde la app
--     nacen con Date.now() (13 dígitos). Por eso BIGINT y no INTEGER.
--
--   · No hay DELETE en ningún flujo. Una persona que se va se marca
--     activo = false: sus visitas históricas tienen que seguir contando en la
--     cobertura de los meses en que estuvo.
--
--   · El índice único sobre lower(trim(nombre)) es lo que hace que el seed y el
--     "agregar persona" de la app sean idempotentes, y lo que impide que la
--     misma persona entre dos veces con roles distintos.

CREATE TABLE IF NOT EXISTS personal (
  id        BIGINT      PRIMARY KEY,
  nombre    TEXT        NOT NULL,
  rol       TEXT        NOT NULL,
  activo    BOOLEAN     NOT NULL DEFAULT true,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT personal_rol_chk
    CHECK (rol IN ('operadora','recepcionista','cosmiatra','medica','telefono')),
  CONSTRAINT personal_nombre_chk
    CHECK (length(trim(nombre)) > 0)
);

-- Una persona, una fila
CREATE UNIQUE INDEX IF NOT EXISTS idx_personal_nombre
  ON personal (lower(trim(nombre)));

-- El GET del checklist de presencia: activos, por rol y nombre
CREATE INDEX IF NOT EXISTS idx_personal_activo
  ON personal (activo, rol, nombre);


-- ══════════════════════════════════════════════════════════════════════════════
-- SCRIPT 2/3 — Tabla visita_personal
-- ══════════════════════════════════════════════════════════════════════════════
--
-- Notas de diseño:
--
--   · Sin columna id: la PK (visita_id, persona_id) ya identifica la fila y es
--     justo el índice que necesita el ON CONFLICT DO NOTHING. Una columna id
--     encima sería una segunda clave que nadie usa.
--
--   · Las filas se escriben en el check-out, no cuando Adrián confirma la
--     presencia: la visita todavía no existe en la base hasta ese momento.
--     Mismo criterio que los pendientes nuevos y las resoluciones.
--
--   · ON DELETE CASCADE en visita_id: si alguna vez se borra una visita, su
--     presencia no tiene sentido sin ella.
--
--   · ON DELETE RESTRICT en persona_id: borrar una persona con historial
--     falsearía la cobertura de meses ya cerrados. Para eso está activo=false.
--
--   · registrado_en no estaba en el pedido, pero sale gratis y permite
--     distinguir la carga original de una edición posterior.

CREATE TABLE IF NOT EXISTS visita_personal (
  visita_id     BIGINT      NOT NULL REFERENCES visitas(id)  ON DELETE CASCADE,
  persona_id    BIGINT      NOT NULL REFERENCES personal(id) ON DELETE RESTRICT,
  registrado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  PRIMARY KEY (visita_id, persona_id)
);

-- La PK cubre "en qué visita estuvo quién". Este cubre el sentido inverso,
-- que es el que usa la cobertura mensual: "en cuántas visitas estuvo X".
CREATE INDEX IF NOT EXISTS idx_visita_personal_persona
  ON visita_personal (persona_id);


-- ══════════════════════════════════════════════════════════════════════════════
-- SCRIPT 3/3 — Plantel inicial
-- ══════════════════════════════════════════════════════════════════════════════
--
-- Fuente: "Disponibilidad operadoras.xlsx", hojas Operadoras (16),
-- Recepcionistas (9), Teléfonos (3) y Cosmiatras BackUp (4). La hoja
-- "Empleadas viejas" (60 personas) queda afuera: son bajas.
--
-- 32 filas en el xlsx → 28 personas. Cuatro aparecen en dos hojas y se cargan
-- una sola vez, con el rol que hacen hoy:
--
--   Valeria Altamirano       Operadoras + Recepcionistas → recepcionista
--   Solange Aldana Lakomcik  Operadoras + Recepcionistas → recepcionista
--   Camila Schnaider         Recepcionistas + Teléfonos  → telefono
--   Sasha Soto               Recepcionistas + Teléfonos  → telefono
--
-- El rol 'medica' existe en el CHECK pero arranca sin filas: en el xlsx no hay
-- ninguna hoja de médicas. Se cargan desde la app cuando haga falta.

INSERT INTO personal (id, nombre, rol) VALUES
  -- ── Operadoras de láser ─────────────────────────────────────────────────────
  ( 1, 'Cecilia Soria',                 'operadora'),
  ( 2, 'Agustina Salvador',             'operadora'),
  ( 3, 'Mayerli Waleska Lopez Cedaño',  'operadora'),
  ( 4, 'Grecia Judimar Teran Salas',    'operadora'),
  ( 5, 'Yasmin Estecho',                'operadora'),
  ( 6, 'Auriany Rodriguez Da Silva',    'operadora'),
  ( 7, 'Melanie Parrales',              'operadora'),
  ( 8, 'Camila Sheridan',               'operadora'),
  ( 9, 'Olga Bohorquez',                'operadora'),
  (10, 'Brenda Ramírez',                'operadora'),
  (11, 'Maria Fernanda Lopez Casanova', 'operadora'),
  (12, 'Aissa Matos De Brito',          'operadora'),
  (13, 'Jazmin Arno',                   'operadora'),
  (14, 'Gabriela Carrato',              'operadora'),

  -- ── Recepcionistas ──────────────────────────────────────────────────────────
  (15, 'Mayra Rojas Ulloa',             'recepcionista'),
  (16, 'Yennyret Flores',               'recepcionista'),
  (17, 'Jazmín Alonso',                 'recepcionista'),
  (18, 'Patricia Fernández',            'recepcionista'),
  (19, 'Lourdes Santillan',             'recepcionista'),
  (20, 'Solange Aldana Lakomcik',       'recepcionista'),
  (21, 'Valeria Altamirano',            'recepcionista'),

  -- ── Teléfono ────────────────────────────────────────────────────────────────
  (22, 'Camila Schnaider',              'telefono'),
  (23, 'Sasha Soto',                    'telefono'),
  (24, 'Braian Herrlein',               'telefono'),

  -- ── Cosmiatras ──────────────────────────────────────────────────────────────
  (25, 'Abril Guarrochena',             'cosmiatra'),
  (26, 'Johanna Lacambra',              'cosmiatra'),
  (27, 'Sofia Peretti',                 'cosmiatra'),
  (28, 'Gabriela Dipré',                'cosmiatra')
ON CONFLICT DO NOTHING;


-- ══════════════════════════════════════════════════════════════════════════════
-- VERIFICACIÓN — ejecutar después de los tres scripts
-- ══════════════════════════════════════════════════════════════════════════════

-- 1. personal debe tener 5 columnas; visita_personal, 3
SELECT table_name, ordinal_position, column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name IN ('personal','visita_personal')
ORDER BY table_name, ordinal_position;

-- 2. 28 filas: 14 operadoras, 7 recepcionistas, 4 cosmiatras, 3 teléfono
SELECT rol, COUNT(*) AS personas FROM personal WHERE activo GROUP BY rol ORDER BY rol;

-- 3. Los CHECK, los FK y la PK compuesta
SELECT conrelid::regclass AS tabla, conname, contype
FROM pg_constraint
WHERE conrelid IN ('personal'::regclass, 'visita_personal'::regclass)
ORDER BY tabla, contype, conname;

-- 4. Nadie duplicado
SELECT lower(trim(nombre)) AS nombre, COUNT(*)
FROM personal GROUP BY 1 HAVING COUNT(*) > 1;

-- 5. Debe arrancar vacía
SELECT COUNT(*) AS filas FROM visita_personal;
