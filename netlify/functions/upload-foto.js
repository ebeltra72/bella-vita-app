exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };

  try {
    const { data, sucursal, tipo } = JSON.parse(event.body);

    const cloudName = 'ubed3xw1';
    const apiKey = '759883733914895';
    const apiSecret = process.env.CLOUDINARY_CRED || process.env.CLOUDINARY_API_SECRET;
    const timestamp = Math.floor(Date.now() / 1000);
    const folder = `bella-vita/${sucursal}`;

    const crypto = require('crypto');
    // String to sign: parámetros en orden alfabético + apiSecret al final
    const strToSign = `folder=${folder}&timestamp=${timestamp}${apiSecret}`;
    const signature = crypto.createHash('sha256').update(strToSign).digest('hex');

    console.log('String to sign:', `folder=${folder}&timestamp=${timestamp}[SECRET]`);
    console.log('Signature:', signature);

    const formData = [
      `file=${encodeURIComponent(data)}`,
      `api_key=${apiKey}`,
      `timestamp=${timestamp}`,
      `signature=${signature}`,
      `folder=${encodeURIComponent(folder)}`,
    ].join('&');

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: formData }
    );

    const result = await response.json();
    console.log('Cloudinary response:', JSON.stringify(result));

    if (result.error) throw new Error(result.error.message);

    return {
      statusCode: 200, headers,
      body: JSON.stringify({ url: result.secure_url, public_id: result.public_id }),
    };
  } catch (e) {
    console.log('Error:', e.message);
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
  }
};
