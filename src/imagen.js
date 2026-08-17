// ══════════════════════════════════════════════════════════════════════════════
// PREPARACIÓN DE FOTOS ANTES DE SUBIRLAS
//
// Vercel corta los requests en 4,5 MB. La foto viaja como data URL dentro de un
// JSON, y base64 infla el archivo un 33%, así que el techo real del archivo
// original es de ~3,4 MB. Una foto de celular de 4 MB rebota con 413.
//
// Por encima de ese umbral la foto se achica en el navegador antes de subirla.
// Por debajo se manda tal cual: no tiene sentido recomprimir algo que ya entra.
// ══════════════════════════════════════════════════════════════════════════════

// Umbral del archivo original: 3,4 MB × 4/3 ≈ 4,5 MB en base64
export const MAX_ARCHIVO = Math.round(3.4 * 1024 * 1024);

// Techo del data URL ya armado, con margen bajo los 4,5 MB de Vercel. Se mide
// sobre el string porque eso es lo que efectivamente viaja en el body.
export const MAX_CUERPO = Math.round(4.2 * 1024 * 1024);

// Lado máximo de la foto achicada. A 1600px una foto de 12 MP queda en unos
// cientos de KB, que además sube mucho más rápido con datos móviles.
const MAX_LADO = 1600;

// Se prueba de mayor a menor hasta que entre
const CALIDADES = [0.85, 0.7, 0.55, 0.4];

export const necesitaAchicar = (file) => !!file && file.size > MAX_ARCHIVO;

export function leerComoDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("No se pudo leer el archivo"));
    reader.readAsDataURL(file);
  });
}

function cargarImagen(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    // Los navegadores actuales aplican solos la orientación EXIF al renderizar,
    // así que naturalWidth/Height ya vienen con la foto derecha.
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("No se pudo abrir la imagen"));
    img.src = url;
  });
}

async function achicar(file) {
  const url = URL.createObjectURL(file);
  try {
    const img = await cargarImagen(url);
    const lado = Math.max(img.naturalWidth, img.naturalHeight);
    const escala = Math.min(1, MAX_LADO / (lado || 1));
    const ancho = Math.max(1, Math.round(img.naturalWidth * escala));
    const alto = Math.max(1, Math.round(img.naturalHeight * escala));

    const canvas = document.createElement("canvas");
    canvas.width = ancho;
    canvas.height = alto;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("El navegador no permite procesar la imagen");
    ctx.drawImage(img, 0, 0, ancho, alto);

    for (const calidad of CALIDADES) {
      const dataUrl = canvas.toDataURL("image/jpeg", calidad);
      if (dataUrl.length <= MAX_CUERPO) {
        return { dataUrl, achicada: true, ancho, alto, calidad };
      }
    }
    throw new Error("La foto es demasiado grande incluso después de comprimirla");
  } finally {
    URL.revokeObjectURL(url);
  }
}

// Devuelve { dataUrl, achicada } listo para mandar a /api/upload-foto
export async function prepararFoto(file) {
  if (!file) throw new Error("No se seleccionó ninguna foto");

  if (!necesitaAchicar(file)) {
    const dataUrl = await leerComoDataUrl(file);
    // Chequeo de borde: un archivo justo debajo del umbral puede pasarse igual
    // una vez convertido, así que se valida el tamaño real del cuerpo.
    if (dataUrl.length <= MAX_CUERPO) return { dataUrl, achicada: false };
  }

  return achicar(file);
}
