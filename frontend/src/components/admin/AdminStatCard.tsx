import type { ReactNode } from "react";

export function AdminStatCard({
  label,
  value,
  helper,
  icon,
}: {
  label: string;
  value: ReactNode;
  helper?: string;
  icon?: ReactNode;
}) {
  return (
    <div className="surface flex min-h-32 items-start justify-between gap-4 p-5">
      <div>
        <p className="text-sm font-semibold text-cocoa-500">{label}</p>
        <div className="mt-3 text-3xl font-extrabold text-cocoa-900">{value}</div>
        {helper ? <p className="mt-2 text-xs text-cocoa-500">{helper}</p> : null}
      </div>
      {icon ? (
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-mint-50 text-mint-700">
          {icon}
        </div>
      ) : null}
    </div>
  );
}
