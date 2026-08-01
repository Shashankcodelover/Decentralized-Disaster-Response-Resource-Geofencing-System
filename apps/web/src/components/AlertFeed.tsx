import { motion, AnimatePresence } from 'framer-motion';
import type { GeofenceAlert } from '@mirage/shared-types';
import { useAppTheme } from '../hooks/ThemeContext';

interface Props {
  alerts: GeofenceAlert[];
  onDismiss: (index: number) => void;
}

export function AlertFeed({ alerts, onDismiss }: Props) {
  const { styles, themeMode, triggerHaptic, t } = useAppTheme();
  const isContrast = themeMode === 'contrast';

  return (
    <div style={{ padding: 12, fontFamily: styles.fontFamily, color: styles.textColor }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <span style={{ fontSize: 10, color: isContrast ? '#00ff00' : '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          Alert Log
        </span>
        <span style={{ fontSize: 10, color: isContrast ? '#00ff00' : '#475569' }}>{alerts.length} events</span>
      </div>

      {alerts.length === 0 && (
        <div style={{ textAlign: 'center', padding: '32px 0', color: isContrast ? '#00ff00' : '#334155' }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>✅</div>
          <div style={{ fontSize: 12 }}>No active alerts</div>
          <div style={{ fontSize: 10, marginTop: 4, color: isContrast ? '#00ff00' : '#1e3a5f', opacity: isContrast ? 0.7 : 1 }}>All zones clear</div>
        </div>
      )}

      <AnimatePresence initial={false}>
        {alerts.map((alert, i) => (
          <motion.div
            key={`${alert.zoneId}-${alert.timestamp}`}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            style={{
              marginBottom: 8,
              background: isContrast 
                ? '#000000' 
                : (alert.type === 'enter' ? '#1a0a0a' : '#0a1a0a'),
              border: `${styles.borderWidth} solid ${
                alert.type === 'enter' 
                  ? (isContrast ? '#ff3333' : '#7f1d1d') 
                  : (isContrast ? '#00ff00' : '#14532d')
              }`,
              borderRadius: 6,
              padding: '8px 10px',
              position: 'relative',
              boxShadow: isContrast ? 'none' : styles.glowShadow,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <span style={{ fontSize: 16, lineHeight: 1.2 }}>{alert.type === 'enter' ? '🚨' : '✅'}</span>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: alert.type === 'enter' ? (isContrast ? '#ff3333' : '#fca5a5') : (isContrast ? '#00ff00' : '#86efac') }}>
                    {alert.type === 'enter' ? t('breach') : t('cleared')}
                  </div>
                  <div style={{ fontSize: 10, color: isContrast ? '#00ff00' : '#94a3b8', marginTop: 2 }}>
                    Zone: <strong style={{ color: isContrast ? '#00ff00' : '#e2e8f0' }}>{alert.zoneName}</strong>
                  </div>
                  <div style={{ fontSize: 10, color: isContrast ? '#00ff00' : '#64748b', opacity: isContrast ? 0.8 : 1, marginTop: 1 }}>
                    Responder: {alert.responderId.slice(0, 12)}
                  </div>
                  <div style={{ fontSize: 9, color: isContrast ? '#00ff00' : '#334155', opacity: isContrast ? 0.7 : 1, marginTop: 2 }}>
                    {new Date(alert.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              </div>
              <button
                onClick={() => {
                  onDismiss(i);
                  triggerHaptic('tap');
                }}
                style={{ 
                  background: 'none', 
                  border: 'none', 
                  color: isContrast ? '#ff3333' : '#475569', 
                  cursor: 'pointer', 
                  fontSize: 12, 
                  padding: 2,
                  outline: 'none',
                }}
              >✕</button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
