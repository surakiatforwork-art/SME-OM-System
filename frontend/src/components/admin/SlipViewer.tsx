import { ExternalLink, Eye, X } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "../ui/Button";

interface SlipViewerProps {
  slipUrl?: string;
  slipFileId?: string;
}

export function SlipViewer({ slipUrl, slipFileId }: SlipViewerProps) {
  const [open, setOpen] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const previewUrl = useMemo(
    () => buildSlipPreviewUrl(slipUrl, slipFileId),
    [slipUrl, slipFileId],
  );
  const driveUrl = slipFileId
    ? `https://drive.google.com/file/d/${slipFileId}/view`
    : slipUrl;

  if (!previewUrl) {
    return (
      <p className="mt-4 rounded-2xl bg-cream-50 p-4 text-sm text-cocoa-500">
        ลูกค้ายังไม่ได้อัปโหลดสลิป
      </p>
    );
  }

  return (
    <>
      <div className="mt-4 grid gap-3">
        <button
          type="button"
          className="group overflow-hidden rounded-2xl border border-cream-200 bg-cream-50 text-left"
          onClick={() => {
            setImageFailed(false);
            setOpen(true);
          }}
        >
          {imageFailed ? (
            <div className="grid min-h-44 place-items-center p-4 text-center text-sm font-semibold text-cocoa-600">
              แสดงภาพตัวอย่างไม่ได้ กดเพื่อเปิดสลิปขนาดใหญ่
            </div>
          ) : (
            <img
              src={previewUrl}
              alt="สลิปชำระเงิน"
              className="max-h-72 w-full object-contain transition group-hover:scale-[1.01]"
              onError={() => setImageFailed(true)}
            />
          )}
        </button>
        <div className="grid gap-2 sm:grid-cols-2">
          <Button
            variant="secondary"
            icon={<Eye size={18} aria-hidden />}
            onClick={() => {
              setImageFailed(false);
              setOpen(true);
            }}
          >
            ขยายสลิป
          </Button>
          {driveUrl ? (
            <a href={driveUrl} target="_blank" rel="noreferrer">
              <Button
                className="w-full"
                variant="secondary"
                icon={<ExternalLink size={18} aria-hidden />}
              >
                เปิดไฟล์ต้นฉบับ
              </Button>
            </a>
          ) : null}
        </div>
      </div>

      {open ? (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-cocoa-900/80 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="ดูสลิปชำระเงิน"
        >
          <div className="relative grid max-h-[92vh] w-full max-w-4xl gap-3 rounded-3xl bg-white p-4 shadow-soft">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-lg font-extrabold text-cocoa-900">
                สลิปชำระเงิน
              </h3>
              <Button
                variant="ghost"
                size="sm"
                aria-label="ปิด"
                icon={<X size={18} aria-hidden />}
                onClick={() => setOpen(false)}
              >
                ปิด
              </Button>
            </div>
            <div className="grid max-h-[74vh] place-items-center overflow-auto rounded-2xl bg-cream-50 p-3">
              {imageFailed ? (
                <div className="grid gap-3 text-center text-sm text-cocoa-600">
                  <p className="font-semibold">ไม่สามารถแสดงภาพใน popup ได้</p>
                  {driveUrl ? (
                    <a
                      className="font-bold text-mint-700"
                      href={driveUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      เปิดสลิปใน Google Drive
                    </a>
                  ) : null}
                </div>
              ) : (
                <img
                  src={previewUrl}
                  alt="สลิปชำระเงิน"
                  className="max-h-[70vh] w-auto max-w-full rounded-xl object-contain"
                  onError={() => setImageFailed(true)}
                />
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function buildSlipPreviewUrl(slipUrl?: string, slipFileId?: string) {
  if (slipFileId) {
    return `https://drive.google.com/thumbnail?id=${encodeURIComponent(
      slipFileId,
    )}&sz=w1600`;
  }
  return slipUrl || "";
}
