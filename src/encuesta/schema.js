// ══════════════════════════════════════════════════════════════════════════════
// ENCUESTA DE VISITA · v2
//
// Las 18 preguntas son datos, no JSX. Este archivo es la única fuente de verdad:
// lo leen EncuestaVisita (para responder), EncuestaPanel (solo lectura, panel de
// Ileana) e HistorialPanel (para mostrar visitas v2). No pueden desincronizarse.
//
// Para cambiar el cuestionario se edita ENCUESTA_V2 y nada más.
//
//   seccion.id → coincide con `categoria` en la tabla pendientes (db/fase1.sql)
//   negativa   → qué respuestas disparan los campos extra. En la mayoría es
//                "No", pero en reclamos y conflictos lo que preocupa es el "Sí".
//   extra      → campos que se abren al responder algo de `negativa`
//   requerido  → campos que hay que completar para que el hallazgo sirva
// ══════════════════════════════════════════════════════════════════════════════

// Juegos de opciones. El primero siempre es el "todo bien" salvo en las
// preguntas invertidas, donde `negativa` lo aclara.
const SI_NO             = ["Sí", "No"];
const SI_NO_OBSERVAR    = ["Sí", "No", "No pude observar"];
const SI_NO_APLICA      = ["Sí", "No", "No aplica"];

// Definición de los campos condicionales
export const CAMPOS = {
  observacion: {
    tipo: "texto", filas: 3,
    label: "¿Qué observaste?",
    placeholder: "Contá brevemente qué pasó…",
  },
  empleado: {
    tipo: "texto1",
    label: "Empleado involucrado",
    placeholder: "Nombre (opcional)",
  },
  involucrados: {
    tipo: "texto1",
    label: "¿Quiénes están involucrados?",
    placeholder: "Nombres (opcional)",
  },
  maquina: {
    tipo: "texto1",
    label: "¿Qué máquina?",
    placeholder: "Ej: Láser cabina 2",
  },
  desdeCuando: {
    tipo: "texto1",
    label: "¿Desde cuándo?",
    placeholder: "Ej: hace 3 días",
  },
  productosFaltantes: {
    tipo: "texto", filas: 2,
    label: "¿Qué productos faltan?",
    placeholder: "Ej: crema corporal, serum…",
  },
  foto: {
    tipo: "foto",
    label: "Foto (opcional)",
  },
};

export const ENCUESTA_V2 = [
  {
    id: "atencion",
    titulo: "Atención al paciente",
    icono: "🤝",
    preguntas: [
      { id: "at_1", texto: "¿La recepción atendió a los pacientes con saludo y trato adecuado?",
        opciones: SI_NO_OBSERVAR, negativa: ["No"],
        extra: ["observacion", "empleado"], requerido: ["observacion"] },
      { id: "at_2", texto: "¿Los pacientes fueron atendidos en el horario de su turno, sin demoras?",
        opciones: SI_NO_OBSERVAR, negativa: ["No"],
        extra: ["observacion"], requerido: ["observacion"] },
      { id: "at_3", texto: "¿Se acompañó al paciente en sala de espera (bebida, contención)?",
        opciones: SI_NO_OBSERVAR, negativa: ["No"],
        extra: ["observacion"], requerido: ["observacion"] },
      { id: "at_4", texto: "¿Hubo algún reclamo o queja de un paciente?",
        // Pregunta invertida: acá el problema es el "Sí"
        opciones: SI_NO_OBSERVAR, negativa: ["Sí"],
        extra: ["observacion", "empleado"], requerido: ["observacion"] },
    ],
  },
  {
    id: "equipo",
    titulo: "Equipo de trabajo",
    icono: "👥",
    preguntas: [
      { id: "eq_1", texto: "¿El personal estaba con uniforme y presentación correcta?",
        opciones: SI_NO_OBSERVAR, negativa: ["No"],
        extra: ["observacion", "empleado"], requerido: ["observacion"] },
      { id: "eq_2", texto: "¿Todo el personal estaba en su puesto y en horario?",
        opciones: SI_NO_OBSERVAR, negativa: ["No"],
        extra: ["observacion", "empleado"], requerido: ["observacion"] },
      { id: "eq_3", texto: "¿Detectaste conflictos o mal clima entre el equipo?",
        // Pregunta invertida
        opciones: SI_NO_OBSERVAR, negativa: ["Sí"],
        extra: ["observacion", "involucrados"], requerido: ["observacion"] },
    ],
  },
  {
    id: "operacion",
    titulo: "Operación e infraestructura",
    icono: "🏢",
    preguntas: [
      { id: "op_1", texto: "¿La sucursal estaba limpia y ordenada (recepción, baños, cabinas)?",
        opciones: SI_NO, negativa: ["No"],
        extra: ["observacion", "foto"], requerido: ["observacion"] },
      { id: "op_2", texto: "¿Las instalaciones están en buen estado (luces, aire, mobiliario, pintura)?",
        opciones: SI_NO, negativa: ["No"],
        extra: ["observacion", "foto"], requerido: ["observacion"] },
      { id: "op_3", texto: "¿Se respetaron los protocolos de higiene y bioseguridad?",
        opciones: SI_NO, negativa: ["No"],
        extra: ["observacion"], requerido: ["observacion"] },
    ],
  },
  {
    id: "maquinas",
    titulo: "Máquinas y equipamiento",
    icono: "⚙️",
    preguntas: [
      { id: "mq_1", texto: "¿Todas las máquinas estaban operativas?",
        opciones: SI_NO_APLICA, negativa: ["No"],
        extra: ["maquina", "desdeCuando", "observacion", "foto"], requerido: ["maquina"] },
      { id: "mq_2", texto: "¿Los mantenimientos y calibraciones están al día?",
        opciones: SI_NO_APLICA, negativa: ["No"],
        extra: ["observacion"], requerido: ["observacion"] },
    ],
  },
  {
    id: "comercial",
    titulo: "Comercial",
    icono: "📣",
    preguntas: [
      { id: "co_1", texto: "¿El equipo conoce y ofrece las promociones vigentes?",
        opciones: SI_NO_OBSERVAR, negativa: ["No"],
        extra: ["observacion"], requerido: ["observacion"] },
      { id: "co_2", texto: "¿La cartelería y exhibición comercial está actualizada?",
        opciones: SI_NO_OBSERVAR, negativa: ["No"],
        extra: ["observacion", "foto"], requerido: ["observacion"] },
    ],
  },
  {
    id: "niza",
    titulo: "Productos Niza",
    icono: "🧴",
    preguntas: [
      { id: "nz_1", texto: "¿Los productos Niza están exhibidos en el lugar acordado?",
        opciones: SI_NO_OBSERVAR, negativa: ["No"],
        extra: ["observacion", "foto"], requerido: ["observacion"] },
      { id: "nz_2", texto: "¿Hay stock suficiente de la línea Niza?",
        opciones: SI_NO_OBSERVAR, negativa: ["No"],
        extra: ["productosFaltantes"], requerido: ["productosFaltantes"] },
      { id: "nz_3", texto: "¿El personal ofrece los productos Niza a los pacientes?",
        opciones: SI_NO_OBSERVAR, negativa: ["No"],
        extra: ["observacion"], requerido: ["observacion"] },
      { id: "nz_4", texto: "¿Los precios y carteles de Niza están actualizados?",
        opciones: SI_NO_OBSERVAR, negativa: ["No"],
        extra: ["observacion"], requerido: ["observacion"] },
    ],
  },
];

// ─── DERIVADOS Y HELPERS ─────────────────────────────────────────────────────

// Las 18 preguntas planas, cada una con su sección adentro
export const PREGUNTAS_V2 = ENCUESTA_V2.flatMap(s =>
  s.preguntas.map(p => ({ ...p, seccionId: s.id, seccionTitulo: s.titulo, icono: s.icono }))
);

export const TOTAL_PREGUNTAS = PREGUNTAS_V2.length;

const PORID = Object.fromEntries(PREGUNTAS_V2.map(p => [p.id, p]));
export const preguntaPorId = (id) => PORID[id] || null;

// La respuesta de una pregunta es { valor, ...campos extra }
export const valorDe = (respuestas, id) => respuestas?.[id]?.valor ?? null;

export function esNegativa(pregunta, valor) {
  if (!pregunta || !valor) return false;
  return pregunta.negativa.includes(valor);
}

// Campos requeridos que quedaron vacíos en una respuesta negativa
export function camposFaltantes(pregunta, respuesta) {
  if (!esNegativa(pregunta, respuesta?.valor)) return [];
  return (pregunta.requerido || []).filter(c => !String(respuesta?.[c] ?? "").trim());
}

// Texto que se usa para prellenar la descripción del pendiente
export function descripcionSugerida(pregunta, respuesta) {
  const detalle = [respuesta?.observacion, respuesta?.productosFaltantes, respuesta?.maquina]
    .map(x => String(x ?? "").trim())
    .filter(Boolean)
    .join(" · ");
  return detalle || pregunta.texto;
}

// Estado global de la encuesta, para barras de progreso y validaciones
export function resumenEncuesta(respuestas = {}) {
  let respondidas = 0, negativas = 0;
  const incompletas = [];
  for (const p of PREGUNTAS_V2) {
    const r = respuestas[p.id];
    if (!r?.valor) continue;
    respondidas++;
    if (esNegativa(p, r.valor)) {
      negativas++;
      if (camposFaltantes(p, r).length > 0) incompletas.push(p.id);
    }
  }
  return {
    respondidas,
    total: TOTAL_PREGUNTAS,
    negativas,
    incompletas,
    completa: respondidas === TOTAL_PREGUNTAS,
    sinFaltantes: incompletas.length === 0,
  };
}

// Todas las preguntas con respuesta negativa, para el resumen del cierre
export function hallazgos(respuestas = {}) {
  return PREGUNTAS_V2
    .filter(p => esNegativa(p, respuestas[p.id]?.valor))
    .map(p => ({ pregunta: p, respuesta: respuestas[p.id] }));
}
