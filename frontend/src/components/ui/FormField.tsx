import type { ReactNode } from "react";

interface FormFieldProps {
  label: string;
  children: ReactNode;
  hint?: string;
  error?: string;
}

export function FormField({ label, children, hint, error }: FormFieldProps) {
  return (
    <label className="grid gap-2">
      <span className="label">{label}</span>
      {children}
      {hint && !error ? <span className="text-xs text-cocoa-500">{hint}</span> : null}
      {error ? <span className="text-xs font-medium text-red-600">{error}</span> : null}
    </label>
  );
}
