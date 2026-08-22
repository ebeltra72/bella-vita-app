import { Resend } from 'resend';

const TZ = 'America/Argentina/Buenos_Aires';

// La paleta de la app, copiada como literales: un mail no puede importar
// src/theme.js —es del bundle del cliente— y los clientes de correo no soportan
// variables CSS. Si cambia la paleta de la app, esto se actualiza a mano.
//
// Los nombres mapean uno a uno contra los tokens de T en src/theme.js:
// fondo=bgApp, texto=text, suave=muted, tenue=muted2, marca=primary,
// borde=border, linea=divider.
const C = {
  fondo:   '#F8F5F2',
  card:    '#FFFFFF',
  texto:   '#2C2320',
  suave:   '#9A8C89',
  tenue:   '#B8AAA7',
  marca:   '#B5737A',
  error:   '#B85C5C',
  errorBg: '#F7E8E8',
  ambar:   '#B08A4E',
  ambarBg: '#F6EEE0',
  salvia:  '#7A9070',
  salviaBg:'#EBF0E8',
  borde:   '#EDE8E4',
  linea:   '#F3EEEB',
};

// Inter no va a cargar: los clientes de correo no bajan webfonts. El stack está
// para que caiga en la fuente de sistema de cada plataforma, que es lo más
// parecido a Inter que se consigue en un mail.
const FUENTE = "'Inter', -apple-system, sans-serif";

// Todo lo que entra al HTML pasa por acá. Descripciones de pendientes, nombres
// de productos y de sucursales son texto libre cargado desde el celular: un
// "<" suelto rompe el mail y algo peor lo convierte en un vector de inyección.
const esc = (v) => String(v ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

const fmtFecha = (f) => {
  if (!f) return '—';
  const s = String(f).slice(0, 10);
  const [a, m, d] = s.split('-');
  return d && m && a ? `${d}/${m}/${a}` : s;
};

export const fechaHoy = () =>
  new Date().toLocaleDateString('es-AR', { timeZone: TZ, day: '2-digit', month: '2-digit', year: 'numeric' });

// ══════════════════════════════════════════════════════════════════════════════
// PLANTILLA
//
// Tablas y estilos inline, que es lo único que renderiza parejo en Gmail,
// Outlook y iOS Mail. Sin <style>, sin clases, sin imágenes externas: un mail
// diario que se ve roto se deja de leer a la semana.
//
// Las secciones vacías no se renderizan. Si el resumen llegara sin ninguna, el
// endpoint ni siquiera lo manda.
// ══════════════════════════════════════════════════════════════════════════════

const fila = (izq, der) => `
  <tr>
    <td style="padding:9px 0;border-bottom:1px solid ${C.linea};font-size:14px;color:${C.texto};line-height:1.45;">
      ${izq}
    </td>
    <td style="padding:9px 0 9px 12px;border-bottom:1px solid ${C.linea};font-size:13px;color:${C.suave};text-align:right;white-space:nowrap;vertical-align:top;">
      ${der}
    </td>
  </tr>`;

function seccion({ titulo, color, fondo, items }) {
  if (items.length === 0) return '';
  return `
  <tr><td style="padding:0 0 18px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.card};border-radius:14px;border:1px solid ${C.borde};">
      <tr><td style="padding:16px 18px 6px;">
        <div style="display:inline-block;background:${fondo};color:${color};font-size:13px;font-weight:700;padding:5px 12px;border-radius:20px;">
          ${titulo}
        </div>
      </td></tr>
      <tr><td style="padding:4px 18px 14px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          ${items.join('')}
        </table>
      </td></tr>
    </table>
  </td></tr>`;
}

export function plantillaResumen({ alertas, appUrl, fecha }) {
  const { vencidos, bajoMinimo, sinVisita } = alertas;

  const secVencidos = seccion({
    titulo: `⏰ ${vencidos.length} ${vencidos.length === 1 ? 'pendiente vencido' : 'pendientes vencidos'}`,
    color: C.error, fondo: C.errorBg,
    items: vencidos.map(p => fila(
      `<strong style="color:${C.marca};">${esc(p.sucursal_nombre)}</strong> · ${esc(p.descripcion)}
       ${p.responsable ? `<div style="font-size:12px;color:${C.tenue};margin-top:2px;">👤 ${esc(p.responsable)}</div>` : ''}`,
      `<strong style="color:${C.error};">${p.dias_vencido} ${p.dias_vencido === 1 ? 'día' : 'días'}</strong>
       <div style="font-size:11px;color:${C.tenue};margin-top:2px;">vencía ${fmtFecha(p.fecha_limite)}</div>`,
    )),
  });

  const secStock = seccion({
    titulo: `📦 ${bajoMinimo.length} ${bajoMinimo.length === 1 ? 'producto bajo mínimo' : 'productos bajo mínimo'}`,
    color: C.ambar, fondo: C.ambarBg,
    items: bajoMinimo.map(a => fila(
      `<strong style="color:${C.marca};">${esc(a.sucursal_nombre)}</strong> · ${esc(a.producto)}`,
      `<strong style="color:${C.error};">${Number(a.cantidad)}</strong>
       <span style="color:${C.tenue};"> de ${Number(a.minimo)}</span>
       <div style="font-size:11px;color:${C.tenue};margin-top:2px;">al ${fmtFecha(a.fecha)}</div>`,
    )),
  });

  const secVisitas = seccion({
    titulo: `📍 ${sinVisita.length} ${sinVisita.length === 1 ? 'sucursal sin visitar' : 'sucursales sin visitar'}`,
    color: C.ambar, fondo: C.ambarBg,
    items: sinVisita.map(s => fila(
      `<strong style="color:${C.marca};">${esc(s.nombre)}</strong>`,
      s.dias === null
        ? `<strong style="color:${C.error};">nunca visitada</strong>`
        : `<strong style="color:${C.error};">hace ${s.dias} días</strong>
           <div style="font-size:11px;color:${C.tenue};margin-top:2px;">última: ${fmtFecha(s.ultima)}</div>`,
    )),
  });

  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Bella Vita · Resumen del día</title></head>
<body style="margin:0;padding:0;background:${C.fondo};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.fondo};padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">

        <tr><td style="padding:0 0 20px;">
          <div style="font-family:${FUENTE};font-size:26px;font-weight:700;color:${C.marca};line-height:1.1;">
            Bella Vita
          </div>
          <div style="font-family:${FUENTE};font-size:11px;font-weight:600;color:${C.tenue};letter-spacing:2px;text-transform:uppercase;margin-top:3px;">
            Resumen del día · ${esc(fecha)}
          </div>
        </td></tr>

        <tr><td style="font-family:${FUENTE};padding:0 0 18px;font-size:14px;color:${C.suave};line-height:1.5;">
          ${alertas.total} ${alertas.total === 1 ? 'cosa requiere atención' : 'cosas requieren atención'} hoy.
        </td></tr>

        <tr><td><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-family:${FUENTE};">
          ${secVencidos}
          ${secStock}
          ${secVisitas}
        </table></td></tr>

        <tr><td align="center" style="padding:8px 0 0;">
          <a href="${esc(appUrl)}" style="display:inline-block;background:${C.marca};color:#ffffff;font-family:${FUENTE};font-size:14px;font-weight:700;text-decoration:none;padding:13px 28px;border-radius:12px;">
            Abrir el tablero →
          </a>
        </td></tr>

        <tr><td align="center" style="padding:20px 0 0;font-family:${FUENTE};font-size:11px;color:${C.tenue};line-height:1.5;">
          Este resumen se envía automáticamente cada mañana,<br>
          y solo cuando hay algo que reportar.
        </td></tr>

      </table>
    </td></tr>
  </table>
</body></html>`;
}

// ══════════════════════════════════════════════════════════════════════════════
// ENVÍO
// ══════════════════════════════════════════════════════════════════════════════

// Coma o punto y coma, con espacios de más: el valor lo escribe una persona en
// el panel de Vercel, no un programa.
export const parseDestinatarios = (valor) =>
  String(valor || '')
    .split(/[,;]/)
    .map(s => s.trim())
    .filter(Boolean);

export async function enviarMail({ to, subject, html }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error('Falta RESEND_API_KEY');

  const resend = new Resend(apiKey);
  const { data, error } = await resend.emails.send({
    from: process.env.MAIL_FROM || 'Bella Vita <onboarding@resend.dev>',
    to,
    subject,
    html,
  });

  // El SDK devuelve el error en el cuerpo en vez de tirar: sin esto un rechazo
  // de Resend —dominio sin verificar es el clásico— pasaría por éxito y el cron
  // quedaría en verde sin haber mandado nada.
  if (error) throw new Error(`Resend rechazó el envío: ${error.message || JSON.stringify(error)}`);
  return data;
}
