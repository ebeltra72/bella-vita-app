exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };

  try {
    const { data, sucursal } = JSON.parse(event.body);

    const cloudName = 'ubed3xw1';
    const uploadPreset = 'bella_vita_unsigned';

    const formData = [
      `file=${encodeURIComponent(data)}`,
      `upload_preset=${uploadPreset}`,
      `folder=${encodeURIComponent('bella-vita/' + sucursal)}`,
    ].join('&');

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: formData }
    );

    const result = await response.json();
    console.log('Cloudinary response:', JSON.stringify(result).slice(0, 200));

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
