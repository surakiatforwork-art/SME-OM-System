import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ReactNode;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-thaiTea-600 text-white shadow-press hover:bg-thaiTea-700 focus:ring-thaiTea-100",
  secondary:
    "border border-cream-200 bg-white text-cocoa-700 hover:border-thaiTea-200 hover:bg-thaiTea-50 focus:ring-thaiTea-100",
  danger:
    "bg-red-500 text-white shadow-sm hover:bg-red-600 focus:ring-red-100",
  ghost: "bg-transparent text-cocoa-700 hover:bg-cream-100 focus:ring-thaiTea-100",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "min-h-10 px-3 text-sm",
  md: "min-h-12 px-4 text-base",
  lg: "min-h-14 px-5 text-base sm:text-lg",
};

export function Button({
  className = "",
  children,
  variant = "primary",
  size = "md",
  icon,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={[
        "inline-flex items-center justify-center gap-2 rounded-xl font-bold outline-none transition active:translate-y-0.5 focus:ring-4 disabled:opacity-50",
        variantClasses[variant],
        sizeClasses[size],
        className,
      ].join(" ")}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
}
