export interface SlipQrCheck {
  ok: boolean;
  payload: string;
  transRef: string;
  message: string;
}

interface TlvNode {
  id: string;
  value: string;
}

function parseTlv(value: string): TlvNode[] {
  const nodes: TlvNode[] = [];
  let index = 0;

  while (index + 4 <= value.length) {
    const id = value.slice(index, index + 2);
    const length = Number(value.slice(index + 2, index + 4));
    if (!Number.isFinite(length) || length < 0) break;
    const start = index + 4;
    const end = start + length;
    if (end > value.length) break;
    nodes.push({ id, value: value.slice(start, end) });
    index = end;
  }

  return nodes;
}

function extractTransactionRef(payload: string) {
  const root = parseTlv(payload);
  for (const node of root) {
    const children = parseTlv(node.value);
    const apiId = children.find((child) => child.id === "00")?.value;
    const transRef = children.find((child) => child.id === "02")?.value;
    if (apiId === "000001" && transRef) return transRef;
  }
  return "";
}

export function validateSlipQrPayload(payload: string): SlipQrCheck {
  const value = payload.trim();
  if (!value) {
    return {
      ok: false,
      payload: "",
      transRef: "",
      message: "ไม่พบ QR ตรวจสอบสลิปในรูป กรุณาอัปโหลดสลิปจากแอปธนาคารอีกครั้ง",
    };
  }

  const transRef = extractTransactionRef(value);
  if (!transRef) {
    return {
      ok: false,
      payload: value,
      transRef: "",
      message: "QR ในรูปไม่ใช่ QR ตรวจสอบสลิปธนาคาร กรุณาอัปโหลดสลิปโอนเงินที่มี QR ตรวจสอบ",
    };
  }

  return {
    ok: true,
    payload: value,
    transRef,
    message: "ตรวจพบ QR สลิปเบื้องต้นแล้ว",
  };
}

async function loadImageSize(file: File) {
  if ("createImageBitmap" in window) {
    const bitmap = await createImageBitmap(file);
    return {
      width: bitmap.width,
      height: bitmap.height,
      draw: (context: CanvasRenderingContext2D, width: number, height: number) => {
        context.drawImage(bitmap, 0, 0, width, height);
        bitmap.close();
      },
    };
  }

  const url = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error("Image load failed"));
      element.src = url;
    });
    return {
      width: image.naturalWidth,
      height: image.naturalHeight,
      draw: (context: CanvasRenderingContext2D, width: number, height: number) => {
        context.drawImage(image, 0, 0, width, height);
      },
    };
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function fileToImageData(file: File): Promise<ImageData> {
  const image = await loadImageSize(file);
  const maxSide = 1600;
  const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.width * scale));
  canvas.height = Math.max(1, Math.round(image.height * scale));
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("ไม่สามารถอ่านรูปสลิปได้");
  image.draw(context, canvas.width, canvas.height);
  return context.getImageData(0, 0, canvas.width, canvas.height);
}

export async function readAndValidateSlipQr(file: File): Promise<SlipQrCheck> {
  try {
    const { default: jsQR } = await import("jsqr");
    const imageData = await fileToImageData(file);
    const result = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: "attemptBoth",
    });
    return validateSlipQrPayload(result?.data || "");
  } catch {
    return {
      ok: false,
      payload: "",
      transRef: "",
      message: "ไม่สามารถอ่านรูปสลิปได้ กรุณาลองอัปโหลดรูปที่ชัดขึ้น",
    };
  }
}
