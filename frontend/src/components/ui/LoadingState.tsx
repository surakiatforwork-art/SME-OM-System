export function LoadingState({
  label = "กำลังโหลดข้อมูล...",
  compact = false,
}: {
  label?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={[
        "loading-stage surface overflow-hidden text-center",
        compact ? "min-h-28 p-4" : "min-h-52 p-6",
      ].join(" ")}
      role="status"
      aria-live="polite"
    >
      <div className="loader-scene" aria-hidden>
        <div className="loader-orbit loader-orbit-a" />
        <div className="loader-orbit loader-orbit-b" />
        <div className="loader-cube">
          <span className="loader-face loader-front" />
          <span className="loader-face loader-back" />
          <span className="loader-face loader-right" />
          <span className="loader-face loader-left" />
          <span className="loader-face loader-top" />
          <span className="loader-face loader-bottom" />
        </div>
      </div>
      <p className="mt-2 text-sm font-bold text-cocoa-700">{label}</p>
      <p className="mt-1 text-xs font-medium text-cocoa-500">
        ระบบกำลังจัดเตรียมข้อมูลให้พร้อมใช้งาน
      </p>
    </div>
  );
}
