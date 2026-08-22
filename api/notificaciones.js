import { neon } from '@neondatabase/serverless';
import { cors } from './_lib/http.js';
import { juntarAlertas } from './_lib/alertas.js';
import { enviarMail, fechaHoy, parseDestinatarios, plantillaResumen } from './_lib/mail.js';

// Destinataria por defecto. Se puede sobreescribir sin tocar el código con la
// env var MAIL_DESTINATARIOS, que además acepta varios separados por coma: sumar
// a Adrián o sacar a alguien no debería necesitar un deploy.
const DESTINATARIO_DEFAULT = 'ileana.ismael@gmail.com';

const APP_URL_DEFAULT = 'https://bella-vita-app.vercel.app';

// ─── Quién puede entrar y a qué ──────────────────────────────────────────────
//
// Tres formas de presentar el mismo secreto, y no todas dan lo mismo:
//
//   · Authorization: Bearer <CRON_SECRET>  — lo que Vercel manda solo cuando la
//     env var existe. No admite headers custom, así que ésta es la única que
//     usa el cron de verdad. Acceso completo.
//
//   · x-cron-secret: <CRON_SECRET>  — para dispararlo a mano con curl. Acceso
//     completo.
//
//   · ?secret=<CRON_SECRET>  — para abrirlo desde el navegador. SÓLO habilita el
//     dry run, nunca un envío.
//
//     Un secreto en la query string queda en los logs de Vercel, en el historial
//     del navegador y en el Referer de cualquier link que se toque después. Es
//     una fuga aceptable para mirar el resumen, pero no para poder mandarle
//     mails a Ileana: si el link se filtra, lo peor que permite es leer.
//
// Sin CRON_SECRET definido no se exige nada, para no romper el deploy antes de
// que la variable exista.
export function resolverAcceso({ secreto, auth, headerPropio, querySecret, pideDry }) {
  if (!secreto) return { ok: true, dry: pideDry };

  if (auth === `Bearer ${secreto}` || headerPropio === secreto) {
    return { ok: true, dry: pideDry };
  }

  if (querySecret === secreto) {
    return {
      ok: true,
      dry: true,
      soloDry: true,
      aviso: pideDry ? null : 'El secreto por query string sólo habilita ?dry=1: no se envió nada.',
    };
  }

  return { ok: false };
}

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
  // a Ileana. Ver resolverAcceso() para las tres formas y qué habilita cada una.
  const q = req.query || {};
  const pideDry = q.dry === '1' || q.dry === 'true';

  const acceso = resolverAcceso({
    secreto: process.env.CRON_SECRET,
    auth: req.headers.authorization,
    headerPropio: req.headers['x-cron-secret'],
    querySecret: q.secret,
    pideDry,
  });

  if (!acceso.ok) {
    return res.status(401).json({
      error: 'No autorizado',
      ayuda: 'Para probar desde el navegador: /api/notificaciones?dry=1&secret=<CRON_SECRET>',
    });
  }

  const sql = neon(process.env.NEON_URL);

  try {
    const alertas = await juntarAlertas(sql);

    // ?dry=1 arma el resumen y devuelve el HTML sin mandar nada: sirve para ver
    // cómo quedó el mail sin llenarle la casilla a Ileana mientras se prueba.
    // acceso.dry puede venir forzado en true si el secreto llegó por query.
    const dry = acceso.dry;

    const resumen = {
      vencidos: alertas.vencidos.length,
      bajoMinimo: alertas.bajoMinimo.length,
      sinVisita: alertas.sinVisita.length,
      total: alertas.total,
    };

    // Cómo devolverlo. Un link abierto en el navegador quiere ver el mail, no un
    // JSON con el HTML escapado adentro; curl y el cron quieren el JSON. Por eso
    // el default depende de por dónde entró el secreto, y ?formato= lo fuerza.
    const comoHtml = q.formato === 'html' || (q.formato !== 'json' && acceso.soloDry);

    if (alertas.total === 0) {
      console.log('[notificaciones] sin alertas, no se envía');
      if (dry && comoHtml) return responderHtml(res, paginaSinAlertas());
      return res.status(200).json({ ok: true, enviado: false, motivo: 'sin alertas', resumen });
    }

    const fecha = fechaHoy();
    const html = plantillaResumen({
      alertas,
      appUrl: process.env.APP_URL || APP_URL_DEFAULT,
      fecha,
    });

    if (dry) {
      if (comoHtml) return responderHtml(res, html);
      return res.status(200).json({
        ok: true, enviado: false, motivo: 'dry run', resumen, html,
        ...(acceso.aviso ? { aviso: acceso.aviso } : {}),
      });
    }

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

// ─── Respuesta HTML ──────────────────────────────────────────────────────────
// .end() y no .send(): es el método de http.ServerResponse de siempre y no
// depende de los agregados del runtime.
function responderHtml(res, html) {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  // Un resumen con pendientes y sucursales no tiene por qué quedar cacheado en
  // un proxy intermedio.
  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).end(html);
}

// El equivalente visual del "no se manda nada": si esto se ve en el navegador,
// hoy no habría salido ningún mail.
const paginaSinAlertas = () => `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Bella Vita · Sin alertas</title></head>
<body style="margin:0;background:#F8F5F2;font-family:'Inter',-apple-system,sans-serif;">
  <div style="max-width:460px;margin:60px auto;background:#FFFFFF;border:1px solid #EDE8E4;border-radius:16px;padding:32px;text-align:center;">
    <div style="font-size:34px;line-height:1;color:#7A9070;">✓</div>
    <div style="font-size:22px;font-weight:700;color:#7A9070;margin-top:12px;">
      Todo al día
    </div>
    <div style="font-size:14px;color:#9A8C89;line-height:1.55;margin-top:8px;">
      No hay pendientes vencidos, ni productos bajo mínimo, ni sucursales sin
      visitar. Hoy no se enviaría ningún mail.
    </div>
  </div>
</body></html>`;
