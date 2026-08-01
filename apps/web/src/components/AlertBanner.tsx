import type { GeofenceAlert } from '@mirage/shared-types';

interface Props {
  alert: GeofenceAlert;
  onDismiss: () => void;
}

export function AlertBanner({ alert, onDismiss }: Props) {
  const isEnter = alert.type === 'enter';
  return (
    <div
      role="alert"
      className={`flex items-center justify-between px-4 py-2 text-sm font-medium ${
        isEnter ? 'bg-red-700 text-white' : 'bg-yellow-600 text-white'
      }`}
    >
      <span>
        {isEnter ? '🚨 ENTERED' : '✅ EXITED'} danger zone:{' '}
        <strong>{alert.zoneName}</strong> — responder {alert.responderId}
      </span>
      <button onClick={onDismiss} className="ml-4 text-white/70 hover:text-white" aria-label="Dismiss alert">
        ✕
      </button>
    </div>
  );
}
