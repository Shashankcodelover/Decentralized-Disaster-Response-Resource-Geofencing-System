import type { SyncStatus } from '@mirage/crdt-logic';

interface Props {
  connected: boolean;
  peerCount: number;
  syncStatus: SyncStatus;
}

const STATUS_COLORS: Record<SyncStatus, string> = {
  idle: 'text-slate-400',
  syncing: 'text-yellow-400',
  synced: 'text-green-400',
  offline: 'text-red-400',
};

export function P2PStatus({ connected, peerCount, syncStatus }: Props) {
  return (
    <div className="flex items-center gap-3 text-xs">
      <span className={connected ? 'text-green-400' : 'text-red-400'}>
        {connected ? '● Server' : '○ Offline'}
      </span>
      <span className="text-slate-400">
        {peerCount} peer{peerCount !== 1 ? 's' : ''}
      </span>
      <span className={STATUS_COLORS[syncStatus]}>
        CRDT: {syncStatus}
      </span>
    </div>
  );
}
