import type { ReactNode } from 'react';

type Variant = 'default' | 'success' | 'warning' | 'danger' | 'info';

const VARIANT_CLASSES: Record<Variant, string> = {
  default: 'bg-slate-700 text-slate-200',
  success: 'bg-green-800 text-green-200',
  warning: 'bg-yellow-800 text-yellow-200',
  danger: 'bg-red-800 text-red-200',
  info: 'bg-blue-800 text-blue-200',
};

interface BadgeProps {
  children: ReactNode;
  variant?: Variant;
  className?: string;
}

export function Badge({ children, variant = 'default', className = '' }: BadgeProps) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${VARIANT_CLASSES[variant]} ${className}`}>
      {children}
    </span>
  );
}
