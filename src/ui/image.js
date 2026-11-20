/**
 * Lee una imagen del usuario y la reduce para no llenar el almacenamiento del teléfono.
 * Con type 'image/jpeg' se rellena el fondo (las fotos no tienen transparencia); con PNG se conserva.
 */
export function readImage(file, { maxWidth = 400, type = 'image/png', quality = 0.9, background = null } = {}) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onerror = () => reject(fr.error);
    fr.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('No se pudo leer la imagen.'));
      img.onload = () => {
        const scale = Math.min(1, maxWidth / img.width);
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        if (background) { ctx.fillStyle = background; ctx.fillRect(0, 0, canvas.width, canvas.height); }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL(type, quality));
      };
      img.src = fr.result;
    };
    fr.readAsDataURL(file);
  });
}
