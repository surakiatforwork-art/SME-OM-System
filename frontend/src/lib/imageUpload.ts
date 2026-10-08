interface OptimizeImageOptions {
  maxDimension?: number;
  quality?: number;
  skipBelowBytes?: number;
}

function loadImage(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("อ่านรูปภาพไม่สำเร็จ"));
    };
    image.src = url;
  });
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number,
) {
  return new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, type, quality);
  });
}

export async function optimizeImageForUpload(
  file: File,
  options: OptimizeImageOptions = {},
) {
  const maxDimension = options.maxDimension ?? 1800;
  const quality = options.quality ?? 0.88;
  const skipBelowBytes = options.skipBelowBytes ?? 700 * 1024;

  if (!file.type.startsWith("image/") || file.size <= skipBelowBytes) {
    return file;
  }

  try {
    const image = await loadImage(file);
    const scale = Math.min(
      1,
      maxDimension / Math.max(image.naturalWidth, image.naturalHeight),
    );
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) return file;

    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);

    const outputType = "image/webp";
    const blob = await canvasToBlob(canvas, outputType, quality);
    if (!blob || blob.size >= file.size) return file;

    const baseName = file.name.replace(/\.[^.]+$/, "") || "upload";
    return new File([blob], `${baseName}.webp`, {
      type: outputType,
      lastModified: file.lastModified,
    });
  } catch {
    return file;
  }
}
