// ─── DATOS INICIALES ────────────────────────────────────────────────────────
export const SUCURSALES_INIT = [
  { id: 1, nombre: "Caballito",    lat: -34.6150343, lng: -58.4328699 },
  { id: 2, nombre: "Belgrano",     lat: -34.5580079, lng: -58.4599135 },
  { id: 3, nombre: "Palermo",      lat: -34.5836368, lng: -58.4209757 },
  { id: 4, nombre: "Olivos",       lat: -34.511436,  lng: -58.4887857 },
  { id: 5, nombre: "Urquiza",      lat: -34.5731906, lng: -58.4814334 },
  { id: 6, nombre: "Ramos Mejía",  lat: -34.6408629, lng: -58.5634681 },
  { id: 7, nombre: "San Fernando", lat: -34.447114786025985, lng: -58.5467312333035 },
];

export const PREGUNTAS_INIT = [
  { id: 1, texto: "¿Avisó al encargado sobre novedades operativas?", tipo: "bool" },
  { id: 2, texto: "¿Capacitó al personal de la sucursal?",           tipo: "bool" },
  { id: 3, texto: "¿Instruyó sobre acciones comerciales vigentes?",  tipo: "bool" },
  { id: 4, texto: "¿Verificó stock y exhibición de productos?",      tipo: "bool" },
  { id: 5, texto: "Observaciones de la visita",                      tipo: "texto" },
  { id: 6, texto: "Foto de mantenimiento / estado de la sucursal",   tipo: "foto" },
];

export const EQUIPO_INIT = [
  { id: "sasha",  nombre: "Sasha",   rol: "Gestión comercial", enRanking: true },
  { id: "braian", nombre: "Braian",  rol: "Gestión comercial (remoto)", enRanking: true },
  { id: "camila", nombre: "Camila",  rol: "Gestión comercial", enRanking: false },
];

export const META_INIT = { mensajes: 50, turnos: 30, senias: 10, premioPorSenia: 500 };
export const RADIO_ACEPTADO_M = 300;

// ─── CATÁLOGO DE PRODUCTOS ────────────────────────────────────────────────────
export const CATALOGO = {
  "General": [
    "Antigrasa", "Blem", "Cif baño", "Detergente", "Harpic Sarro",
    "Lavandina", "Lavandina en gel", "Lavandina ropa blanca", "Vivere suavizante",
    "Cif", "Limpiavidrios", "Líquido de pisos", "Gel inodoro", "Bolsa basura (rollo)",
    "Jabón manos", "Jabón ropa", "Desodorante ambiente", "Papel higiénico (pack 4)",
  ],
  "Depilación": [
    "Rollos de cocina (pack 3)", "Platsul", "Alcohol 5 lts", "Cintas (cajita x 12 u.)",
    "Guantes", "Rollo Cocina indiv. grande", "Gel bolsa",
  ],
  "Médico": [
    "Aceite Johnson's", "Alcohol chiquito", "Crema anestésica", "Hyaluromax Bioestimulador",
    "LongLasting", "Jabón Clorhexidina", "Ampolla Meso Estrías", "Ampolla Meso Facial",
    "Cánula 25G", "Agujas dermapen", "Jeringa 21G Butterfly", "Jeringa 10ml+aguja",
    "Aguja Bótox", "Aguja intradérmica", "Jeringa Luer Lock 10ml", "Jeringa Luer Lock 5ml",
    "Llave 3 vías", "Solución fisiológica 10ml", "Aguja 21G", "Jeringa 1ml con aguja",
    "Jeringa 1ml", "Tubo citrato", "Radiesse", "Xeomin Bótox", "Belotero Intense (labios)",
    "Exosomas", "PDRN", "Hialuronidasa",
  ],
  "Limpiezas y masajes": [
    "Aceite masajes 1lt", "Ácido láctico corporal", "Crema corporal", "Crema masaje",
    "Scrub corporal", "Agua Oxigenada", "ADN gel", "Matt Balance gel", "Agua micelar",
    "Leche limpieza", "Loción hierbas/refrescante", "Serum hialurónico Lidherma",
    "Gasas", "Jabón blanco", "Agujas 21G 1½", "Pastilla papel facial",
    "Máscara abrasiva", "Peptisomas", "Máscara descongestiva", "Peeling enzimático",
    "Máscara Vit C", "Crema antiage radiofrecuencia", "Protector solar",
    "Acnex Depure", "Serum Hialurónico c/Niacinamida", "Ac. Glicólico", "Ac. Lactobiónico",
  ],
};

export const RUBRO_ICONOS = {
  "General": "🧹",
  "Depilación": "✨",
  "Médico": "💉",
  "Limpiezas y masajes": "🧴",
};

// ─── PENDIENTES ──────────────────────────────────────────────────────────────
// Los `id` son exactamente los valores que aceptan los CHECK de la tabla
// pendientes (ver db/fase1.sql). `badge` es un color de <Badge>.

export const PRIORIDADES = [
  { id: "critica", label: "Crítica", badge: "error" },
  { id: "alta",    label: "Alta",    badge: "amber" },
  { id: "media",   label: "Media",   badge: "gold"  },
  { id: "baja",    label: "Baja",    badge: "terr"  },
];

export const ESTADOS = [
  { id: "abierto",     label: "Abierto",     badge: "error" },
  { id: "en_progreso", label: "En progreso", badge: "amber" },
  { id: "resuelto",    label: "Resuelto",    badge: "sage"  },
  { id: "cancelado",   label: "Cancelado",   badge: "terr"  },
];

// Un pendiente cerrado ya no cuenta como abierto ni puede estar vencido
export const ESTADOS_CERRADOS = ["resuelto", "cancelado"];

// Coinciden con las secciones de la encuesta, más 'otro' para los pendientes
// que Ileana carga a mano desde el panel.
export const CATEGORIAS = [
  { id: "atencion",  label: "Atención al paciente",        icono: "🤝" },
  { id: "equipo",    label: "Equipo de trabajo",           icono: "👥" },
  { id: "operacion", label: "Operación e infraestructura", icono: "🏢" },
  { id: "maquinas",  label: "Máquinas y equipamiento",     icono: "⚙️" },
  { id: "comercial", label: "Comercial",                   icono: "📣" },
  { id: "niza",      label: "Productos Niza",              icono: "🧴" },
  { id: "otro",      label: "Otro",                        icono: "📌" },
];

export const SEMAFORO = [
  { id: "sin_problemas", label: "Sin problemas",                    icono: "🟢", badge: "sage"  },
  { id: "mejorable",     label: "Hay aspectos a mejorar",           icono: "🟡", badge: "amber" },
  { id: "prioritario",   label: "Requiere intervención prioritaria", icono: "🔴", badge: "error" },
];

// Busca en cualquiera de las listas de arriba
export const opcion = (lista, id) => lista.find(x => x.id === id) || null;
export const etiqueta = (lista, id) => opcion(lista, id)?.label || id || "—";
