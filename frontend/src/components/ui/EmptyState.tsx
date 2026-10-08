import { PackageOpen } from "lucide-react";
import { Button } from "./Button";

interface EmptyStateProps {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <div className="surface grid place-items-center gap-3 px-6 py-12 text-center">
      <div className="grid h-12 w-12 place-items-center rounded-xl bg-thaiTea-100 text-thaiTea-700">
        <PackageOpen aria-hidden size={24} />
      </div>
      <div>
        <h2 className="font-display text-xl font-bold text-cocoa-900">{title}</h2>
        {description ? (
          <p className="mt-1 text-sm text-cocoa-500">{description}</p>
        ) : null}
      </div>
      {actionLabel && onAction ? (
        <Button onClick={onAction} variant="secondary">
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}
