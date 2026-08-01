type Status = 'online' | 'offline' | 'warning';

const DOT_CLASSES: Record<Status, string> = {
  online: 'bg-green-400',
  offline: 'bg-red-400',
  warning: 'bg-yellow-400',
};

interface StatusDotProps {
  status: Status;
  label?: string;
}

export function StatusDot({ status, label }: StatusDotProps) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-slate-300">
      <span className={`w-2 h-2 rounded-full ${DOT_CLASSES[status]}`} aria-hidden="true" />
      {label}
    </span>
  );
}
