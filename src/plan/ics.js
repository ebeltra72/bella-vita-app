import { ESTADO_DERIVADO, FRANJAS, opcion } from "../constants";
import { estadoDerivado, nombreMes } from "./datos";

// ══════════════════════════════════════════════════════════════════════════════
// EXPORTACIÓN DEL PLAN A CALENDARIO (.ics)
//
// Funciones puras, sin JSX y sin DOM: el archivo se arma acá y la descarga la
// dispara PlanPanel. Así el formato se puede verificar sin navegador.
//
// Horarios por franja, en hora de Argentina. La franja en recorridas_plan es una
// etiqueta de intención y no tiene semántica horaria —está documentado en
// constants.js—, así que estos horarios son una convención que nace acá, para
// que las recorridas caigan ordenadas en la grilla del calendario.
export const HORARIOS = {
  apertura:   { desde: 9,  hasta: 11 },
  intermedio: { desde: 12, hasta: 15 },
  cierre:     { desde: 16, hasta: 19 },
};

// Argentina es UTC-3 todo el año: no tiene horario de verano desde 2009. Por eso
// las horas se pasan a UTC con una resta fija y el .ics no necesita un bloque
// VTIMEZONE, que es la parte del formato que peor soportan los clientes.
const OFFSET_ARG = 3;

// El corrimiento nunca cruza la medianoche UTC —el más tarde es 19 + 3 = 22— así
// que la fecha del evento es siempre la fecha planificada.
const aUTC = (fecha, horaLocal) => {
  const [a, m, d] = String(fecha).slice(0, 10).split("-");
  const hh = String(horaLocal + OFFSET_ARG).padStart(2, "0");
  return `${a}${m}${d}T${hh}0000Z`;
};

const sello = (ref = new Date()) =>
  ref.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

// RFC 5545 §3.3.11: en un valor TEXT hay que escapar la barra, el punto y coma,
// la coma y los saltos de línea. Una coma sin escapar parte el valor en dos y el
// evento entra con el título cortado.
//
// Ojo con los reemplazos: en JavaScript "\;" es sólo ";" —la barra se pierde en
// los escapes no reconocidos— así que hay que escribir "\\;" para que salga un
// \; de verdad. La misma trampa que el \s de la query de alertas en fase5.
const esc = (v) => String(v ?? "")
  .replace(/\\/g, "\\\\")
  .replace(/;/g, "\\;")
  .replace(/,/g, "\\,")
  .replace(/\r?\n/g, "\\n");

// RFC 5545 §3.1: las líneas no pueden superar los 75 octetos. Se cortan y se
// continúan con un espacio al principio. Se mide en bytes y no en caracteres
// porque los acentos y los emojis del título ocupan más de uno, y cortar al
// medio de un carácter multibyte rompe el archivo.
function plegar(linea) {
  const bytes = new TextEncoder().encode(linea);
  if (bytes.length <= 75) return linea;

  const partes = [];
  let actual = "";
  let largo = 0;
  let limite = 75;

  for (const char of linea) {
    const n = new TextEncoder().encode(char).length;
    if (largo + n > limite) {
      partes.push(actual);
      actual = char;
      largo = n + 1;   // el espacio de continuación cuenta
      limite = 75;
    } else {
      actual += char;
      largo += n;
    }
  }
  partes.push(actual);
  return partes.join("\r\n ");
}

// ─── Construcción ────────────────────────────────────────────────────────────

// Las canceladas quedan afuera: un VEVENT con STATUS:CANCELLED no lo borra
// Google al reimportar, así que meterlas sólo agregaría ruido a la agenda.
export const exportables = (recorridas = []) =>
  recorridas.filter(r => r.estado !== "cancelada" && r.fechaPlan && HORARIOS[r.franja]);

export function construirIcs(recorridas = [], mes, ref = new Date()) {
  const eventos = exportables(recorridas);
  const stamp = sello(ref);

  const lineas = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Bella Vita//Plan de recorridas//ES",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${esc(`Recorridas ${nombreMes(mes)}`)}`,
    "X-WR-TIMEZONE:America/Argentina/Buenos_Aires",
  ];

  for (const r of eventos) {
    const franja = opcion(FRANJAS, r.franja);
    const horario = HORARIOS[r.franja];
    const est = ESTADO_DERIVADO[estadoDerivado(r, ref)];

    const descripcion = [
      `Estado: ${est?.label || r.estado}`,
      `Franja: ${franja?.label || r.franja} (${horario.desde}:00 a ${horario.hasta}:00)`,
      r.fechaPlanOriginal && r.fechaPlanOriginal !== r.fechaPlan
        ? `Reprogramada. Fecha original: ${r.fechaPlanOriginal}`
        : null,
      r.motivoReprogramacion ? `Motivo: ${r.motivoReprogramacion}` : null,
      r.aprobado ? "Aprobada por Ileana" : "Sin aprobar",
    ].filter(Boolean).join("\n");

    lineas.push(
      "BEGIN:VEVENT",
      // UID estable por recorrida: reimportar después de reprogramar actualiza
      // el evento en vez de duplicarlo, en los clientes que respetan el UID.
      `UID:recorrida-${r.id}@bella-vita-app`,
      // SEQUENCE sube a 1 cuando la recorrida se tocó alguna vez. Es un
      // aproximado: varias reprogramaciones no lo suben más, pero alcanza para
      // que la segunda importación gane sobre la primera.
      `SEQUENCE:${r.actualizadoEn ? 1 : 0}`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${aUTC(r.fechaPlan, horario.desde)}`,
      `DTEND:${aUTC(r.fechaPlan, horario.hasta)}`,
      `SUMMARY:${esc(`${franja?.icono || ""} ${franja?.label || r.franja} · ${r.sucursalNombre}`.trim())}`,
      `DESCRIPTION:${esc(descripcion)}`,
      `LOCATION:${esc(r.sucursalNombre)}`,
      `STATUS:${r.estado === "realizada" ? "CONFIRMED" : "TENTATIVE"}`,
      "END:VEVENT",
    );
  }

  lineas.push("END:VCALENDAR");

  // CRLF, que es lo que pide el RFC. Con \n solo, Outlook rechaza el archivo.
  return lineas.map(plegar).join("\r\n") + "\r\n";
}

export const nombreArchivo = (mes) => `bella-vita-recorridas-${mes}.ics`;
