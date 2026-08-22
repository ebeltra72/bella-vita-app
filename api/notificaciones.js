import { neon } from '@neondatabase/serverless';
import { cors } from './_lib/http.js';
import { juntarAlertas } from './_lib/alertas.js';
import { enviarMail, fechaHoy, parseDestinatarios, plantillaResumen } from './_lib/mail.js';

// Destinataria por defecto. Se puede sobreescribir sin tocar el código con la
// env var MAIL_DESTINATARIOS, que además acepta varios separados por coma: sumar
// a Adrián o sacar a alguien no debería necesitar un deploy.
const DESTINATARIO_DEFAULT = 'ileana.ismael@gmail.com';

const APP_URL_DEFAULT = 'https://bella-vita-app.vercel.app';

// ══════════════════════════════════════════════════════════════════════════════
// RESUMEN DIARIO POR MAIL
//
// Lo dispara el cron de vercel.json a las 11:00 UTC — 8 AM en Argentina, que no
// tiene horario de verano, así que la hora local no se corre en todo el año.
//
// Solo manda si hay al menos una alerta. Un mail diario que la mitad de los días
// dice "todo bien" se convierte en ruido y dejan de abrirlo justo el día que
// dice otra cosa.
//
// Idempotencia: la doc de Vercel avisa que la entrega es best effort y que una
// misma corrida puede invocarse dos veces. Acá eso significa, en el peor caso,
// un mail repetido — no hay nada que se escriba ni que se incremente, así que
// dos corridas producen exactamente el mismo resultado.
// ══════════════════════════════════════════════════════════════════════════════
export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  // ─── Autenticación ────────────────────────────────────────────────────────
  // Sin esto el endpoint es público y cualquiera con la URL puede disparar mails
  // a Ileana. Se aceptan dos formas del mismo secreto:
  //
  //   · Authorization: Bearer <CRON_SECRET>  — es lo que Vercel manda solo
  //     cuando la env var existe. NO se puede cambiar por un header propio: el
  //     cron no admite headers custom, así que un handler que sólo mirara
  //     x-cron-secret devolvería 401 todos los días. Y como Vercel no reintenta
  //     ni avisa, el silencio se vería igual que "no había alertas".
  //
  //   · x-cron-secret: <CRON_SECRET>  — para dispararlo a mano con curl.
  const secreto = process.env.CRON_SECRET;
  if (secreto) {
    const auth = req.headers.authorization;
    const propio = req.headers['x-cron-secret'];
    if (auth !== `Bearer ${secreto}` && propio !== secreto) {
      return res.status(401).json({ error: 'No autorizado' });
    }
  }

  const sql = neon(process.env.NEON_URL);

  try {
    const alertas = await juntarAlertas(sql);

    // ?dry=1 arma el resumen y devuelve el HTML sin mandar nada: sirve para ver
    // cómo quedó el mail sin llenarle la casilla a Ileana mientras se prueba.
    const dry = req.query?.dry === '1' || req.query?.dry === 'true';

    const resumen = {
      vencidos: alertas.vencidos.length,
      bajoMinimo: alertas.bajoMinimo.length,
      sinVisita: alertas.sinVisita.length,
      total: alertas.total,
    };

    if (alertas.total === 0) {
      console.log('[notificaciones] sin alertas, no se envía');
      return res.status(200).json({ ok: true, enviado: false, motivo: 'sin alertas', resumen });
    }

    const fecha = fechaHoy();
    const html = plantillaResumen({
      alertas,
      appUrl: process.env.APP_URL || APP_URL_DEFAULT,
      fecha,
    });

    if (dry) return res.status(200).json({ ok: true, enviado: false, motivo: 'dry run', resumen, html });

    const to = parseDestinatarios(process.env.MAIL_DESTINATARIOS);
    const destinatarios = to.length > 0 ? to : [DESTINATARIO_DEFAULT];

    const enviado = await enviarMail({
      to: destinatarios,
      subject: `Bella Vita · Resumen del día ${fecha}`,
      html,
    });

    console.log('[notificaciones] enviado', JSON.stringify(resumen), '→', destinatarios.join(', '));
    return res.status(200).json({ ok: true, enviado: true, id: enviado?.id || null, destinatarios, resumen });
  } catch (e) {
    console.error('[notificaciones] ERROR', e.message, e.code || '', e.detail || '');
    return res.status(500).json({ error: e.message });
  }
}
