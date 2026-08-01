import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useAppTheme } from '../hooks/ThemeContext';

interface Stat {
  labelKey: string;
  value: string | number;
  subKey?: string;
  subVal?: string;
  color?: string;
  critical?: boolean;
}

export function StatsBar() {
  const [tick, setTick] = useState(0);
  const { styles, themeMode, t } = useAppTheme();

  // Simulate live updating numbers
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 3000);
    return () => clearInterval(id);
  }, []);

  const stats: Stat[] = [
    { labelKey: 'activeZones', value: 3, subVal: '1 ' + t('critical'), color: '#f87171', critical: true },
    { labelKey: 'responders', value: 4, subVal: '1 in danger', color: '#fbbf24' },
    { labelKey: 'resourceHubs', value: 3, subVal: '1,600 cap total', color: '#38bdf8' },
    { labelKey: 'geofenceChecks', value: `${(tick * 7 + 142).toLocaleString()}`, subVal: 'last 60s', color: '#a78bfa' },
    { labelKey: 'p2pSyncOps', value: `${(tick * 3 + 28).toLocaleString()}`, subVal: 'delta updates', color: '#34d399' },
    { labelKey: 'meshLatency', value: `${12 + (tick % 5)}ms`, subVal: 'avg round-trip', color: '#22c55e' },
    { labelKey: 'offlineQueue', value: 0, subVal: 'pending ops', color: '#64748b' },
    { labelKey: 'crdtConflicts', value: 0, subVal: 'resolved', color: '#64748b' },
  ];

  return (
    <div style={{
      display: 'flex',
      background: styles.statsBarBg,
      borderBottom: `${styles.borderWidth} solid ${styles.borderColor}`,
      flexShrink: 0,
      overflowX: 'auto',
      fontFamily: styles.fontFamily,
    }}>
      {stats.map((stat) => (
        <div key={stat.labelKey} style={{
          flex: '0 0 auto',
          padding: '6px 20px',
          borderRight: `1px solid ${themeMode === 'contrast' ? '#00ff00' : '#0f2040'}`,
          minWidth: 120,
        }}>
          <div style={{ 
            fontSize: 9, 
            color: themeMode === 'contrast' ? '#00ff00' : '#475569', 
            textTransform: 'uppercase', 
            letterSpacing: '0.12em', 
            marginBottom: 2 
          }}>
            {t(stat.labelKey)}
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <motion.span
              key={`${stat.value}-${tick}`}
              initial={{ opacity: 0.5 }}
              animate={{ opacity: 1 }}
              style={{ 
                fontSize: 18, 
                fontWeight: 800, 
                color: themeMode === 'contrast' ? '#00ff00' : (stat.color ?? '#e2e8f0'), 
                fontFamily: 'monospace', 
                lineHeight: 1 
              }}
            >
              {stat.value}
            </motion.span>
            {stat.critical && (
              <motion.span
                animate={{ opacity: [1, 0, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
                style={{ fontSize: 8, color: '#f87171', fontWeight: 700 }}
              >●</motion.span>
            )}
          </div>
          {stat.subVal && (
            <div style={{ 
              fontSize: 9, 
              color: themeMode === 'contrast' ? '#00ff00' : '#334155', 
              opacity: themeMode === 'contrast' ? 0.7 : 1,
              marginTop: 1 
            }}>
              {stat.subVal}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
