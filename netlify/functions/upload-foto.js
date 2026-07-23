const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: 'ubed3xw1',
  api_key: '759883733914895',
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };

  try {
    const { data, visitaId, sucursal, tipo } = JSON.parse(event.body);
    const result = await cloudinary.uploader.upload(data, {
      folder: `bella-vita/${sucursal}`,
      public_id: `${visitaId}_${tipo}_${Date.now()}`,
      resource_type: 'image',
    });
    return {
      statusCode: 200, headers,
      body: JSON.stringify({ url: result.secure_url, public_id: result.public_id }),
    };
  } catch (e) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
  }
};
