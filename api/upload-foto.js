import { cors, leerBody } from './_lib/http.js';

// Única function que no toca Neon: reenvía la foto a Cloudinary con un preset
// unsigned. Usa el fetch global, que existe en el runtime Node de Vercel.
//
// OJO con el tamaño: Vercel corta los requests en 4,5 MB (Netlify permitía 6).
// Una foto de celular de 4 MB pesa ~5,3 MB en base64 y va a rebotar con 413.
export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

  try {
    const { data, sucursal } = leerBody(req);
    if (!data) return res.status(400).json({ error: 'Falta la imagen' });

    const cloudName = 'ubed3xw1';
    const uploadPreset = 'bella_vita_unsigned';

    const formData = [
      `file=${encodeURIComponent(data)}`,
      `upload_preset=${uploadPreset}`,
      `folder=${encodeURIComponent('bella-vita/' + (sucursal || 'sucursal'))}`,
    ].join('&');

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: formData }
    );

    const result = await response.json();
    if (result.error) throw new Error(result.error.message);

    return res.status(200).json({ url: result.secure_url, public_id: result.public_id });
  } catch (e) {
    console.error('[upload-foto] ERROR', e.message);
    return res.status(500).json({ error: e.message });
  }
}
