export function maskPromptPayId(value?: string) {
  if (!value) return "ยังไม่ได้ตั้งค่า";
  let digits = value.replace(/\D/g, "");

  if (digits.length === 9 && /^[689]\d{8}$/.test(digits)) {
    digits = `0${digits}`;
  }

  if (digits.length === 10) {
    return `${digits.slice(0, 2)}x-xxx-${digits.slice(-4)}`;
  }

  if (digits.length === 13) {
    return `${digits.slice(0, 1)}-xxxx-xxxxx-${digits.slice(-3)}`;
  }

  if (value.length <= 6) return `${value.slice(0, 2)}***`;
  return `${value.slice(0, 3)}***${value.slice(-3)}`;
}

export function createMockPromptPayPayload(promptPayId: string, amount: number) {
  return createPromptPayPayload(promptPayId || "0800000000", amount);
}

export function createPromptPayPayload(promptPayId: string, amount: number) {
  const target = buildPromptPayTarget(promptPayId);
  const merchantAccount =
    formatEmvField("00", "A000000677010111") +
    formatEmvField(target.type, target.value);
  let payload = "";
  payload += formatEmvField("00", "01");
  payload += formatEmvField("01", amount > 0 ? "12" : "11");
  payload += formatEmvField("29", merchantAccount);
  payload += formatEmvField("53", "764");
  if (amount > 0) payload += formatEmvField("54", amount.toFixed(2));
  payload += formatEmvField("58", "TH");
  payload += "6304";
  return payload + crc16Ccitt(payload);
}

function buildPromptPayTarget(promptPayId: string) {
  const text = promptPayId.trim();
  const digits = text.replace(/\D/g, "");

  if (digits.length === 10 && digits.startsWith("0")) {
    return { type: "01", value: `0066${digits.slice(1)}` };
  }

  if (digits.length === 9 && /^[689]\d{8}$/.test(digits)) {
    return { type: "01", value: `0066${digits}` };
  }

  if (digits.length === 11 && digits.startsWith("66")) {
    return { type: "01", value: `0066${digits.slice(2)}` };
  }

  if (digits.length === 13 && digits.startsWith("0066")) {
    return { type: "01", value: digits };
  }

  if (digits.length === 13) {
    return { type: "02", value: digits };
  }

  if (digits.length === 15) {
    return { type: "03", value: digits };
  }

  throw new Error("PromptPay ID ต้องเป็นเบอร์โทร 10 หลัก, เลขบัตร 13 หลัก หรือ e-wallet 15 หลัก");
}

function formatEmvField(id: string, value: string) {
  return `${id}${String(value.length).padStart(2, "0")}${value}`;
}

function crc16Ccitt(value: string) {
  let crc = 0xffff;
  for (let i = 0; i < value.length; i += 1) {
    crc ^= value.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j += 1) {
      crc = (crc & 0x8000) !== 0 ? (crc << 1) ^ 0x1021 : crc << 1;
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}
