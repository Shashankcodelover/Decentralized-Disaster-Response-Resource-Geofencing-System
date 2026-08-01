import { motion, AnimatePresence } from 'framer-motion';
import type { Volunteer, ZoneNeed, VolunteerRole } from '../hooks/useVolunteerSim';
import { useAppTheme } from '../hooks/ThemeContext';

interface Props {
  volunteers: Volunteer[];
  zoneNeeds: ZoneNeed[];
  dispatchMessages: string[];
  selectedVolunteer: Volunteer | null;
  onSelect: (v: Volunteer | null) => void;
  onDispatch: (volunteerId: string, zoneId: string) => void;
  onRecall: (volunteerId: string) => void;
  roleIcons: Record<VolunteerRole, string>;
  roleColors: Record<VolunteerRole, string>;
  zoneConfigs: { zoneId: string; zoneName: string; severity: string }[];
}

const STATUS_STYLE: Record<string, { bg: string; color: string; labelKey: string }> = {
  idle:     { bg: '#1e293b', color: '#94a3b8', labelKey: 'standby' },
  moving:   { bg: '#1c3a1c', color: '#86efac', labelKey: 'enRoute' },
  'in-zone':{ bg: '#3b1c1c', color: '#fca5a5', labelKey: 'insideDangerZone' },
  offline:  { bg: '#0f172a', color: '#475569', labelKey: 'offline' },
};

const NEED_STYLE: Record<string, { bg: string; color: string; icon: string; labelKey: string }> = {
  'critical-need': { bg: '#450a0a', color: '#fca5a5', icon: '🆘', labelKey: 'critical' },
  'needs-support': { bg: '#431407', color: '#fdba74', icon: '⚠', labelKey: 'medium' },
  'adequate':      { bg: '#052e16', color: '#86efac', icon: '✅', labelKey: 'active' },
  'overcrowded':   { bg: '#1e1b4b', color: '#c4b5fd', icon: '⬆', labelKey: 'high' },
};

export function VolunteerPanel({
  volunteers, zoneNeeds, dispatchMessages,
  selectedVolunteer, onSelect, onDispatch, onRecall,
  roleIcons, roleColors, zoneConfigs,
}: Props) {
  const { styles, themeMode, triggerHaptic, t } = useAppTheme();
  const isContrast = themeMode === 'contrast';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', fontFamily: styles.fontFamily, color: styles.textColor }}>

      {/* Zone needs overview */}
      <div style={{ padding: '10px 12px', borderBottom: `${styles.borderWidth} solid ${styles.borderColor}`, flexShrink: 0 }}>
        <div style={{ 
          fontSize: 9, 
          color: isContrast ? '#00ff00' : '#475569', 
          textTransform: 'uppercase', 
          letterSpacing: '0.12em', 
          marginBottom: 8 
        }}>
          {t('zoneCoverage')}
        </div>
        {zoneNeeds.map(need => {
          const style = NEED_STYLE[need.status];
          const pct = Math.min(100, (need.currentCount / need.requiredCount) * 100);
          return (
            <div 
              key={need.zoneId} 
              style={{ 
                marginBottom: 8, 
                background: isContrast ? '#000000' : style.bg, 
                border: `${styles.borderWidth} solid ${isContrast ? '#00ff00' : style.color + '33'}`, 
                borderRadius: 6, 
                padding: '7px 10px' 
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: isContrast ? '#00ff00' : '#e2e8f0' }}>{need.zoneName}</span>
                <span style={{ 
                  fontSize: 9, 
                  fontWeight: 700, 
                  color: isContrast ? '#00ff00' : style.color, 
                  background: isContrast ? '#000000' : style.bg, 
                  border: `1px solid ${isContrast ? '#00ff00' : style.color + '55'}`, 
                  padding: '1px 6px', 
                  borderRadius: 3 
                }}>
                  {style.icon} {t(style.labelKey)}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ flex: 1, height: 4, background: isContrast ? '#111' : '#1e3a5f', borderRadius: 2 }}>
                  <motion.div
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.5 }}
                    style={{ 
                      height: '100%', 
                      background: isContrast ? '#00ff00' : style.color, 
                      borderRadius: 2,
                      boxShadow: isContrast ? '0 0 5px #00ff00' : 'none'
                    }}
                  />
                </div>
                <span style={{ fontSize: 10, color: isContrast ? '#00ff00' : style.color, fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                  {need.currentCount}/{need.requiredCount}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Volunteer list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '10px 12px' }}>
        <div style={{ 
          fontSize: 9, 
          color: isContrast ? '#00ff00' : '#475569', 
          textTransform: 'uppercase', 
          letterSpacing: '0.12em', 
          marginBottom: 8 
        }}>
          {t('volunteers')} ({volunteers.length})
        </div>

        {volunteers.map(v => {
          const st = STATUS_STYLE[v.status];
          const isSelected = selectedVolunteer?.id === v.id;
          return (
            <motion.div
              key={v.id}
              layout
              onClick={() => {
                onSelect(isSelected ? null : v);
                triggerHaptic('tap');
              }}
              style={{
                marginBottom: 6,
                background: isSelected 
                  ? (isContrast ? '#000000' : '#0f2040') 
                  : (isContrast ? '#000000' : '#0a1628'),
                border: `${styles.borderWidth} solid ${isSelected ? (isContrast ? '#00ff00' : '#2563eb') : styles.borderColor}`,
                borderRadius: 8,
                cursor: 'pointer',
                overflow: 'hidden',
                boxShadow: isContrast ? 'none' : styles.glowShadow,
              }}
            >
              {/* Volunteer row */}
              <div style={{ padding: '8px 10px', display: 'flex', alignItems: 'center', gap: 8 }}>
                {/* Avatar */}
                <div style={{
                  width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                  background: isContrast ? 'transparent' : roleColors[v.role] + '22',
                  border: `2px solid ${isContrast ? '#00ff00' : roleColors[v.role]}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 14,
                }}>
                  {v.gender === 'female' ? '👩' : '👨'}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: isContrast ? '#00ff00' : '#e2e8f0' }}>{v.name}</span>
                    <span style={{ 
                      fontSize: 9, 
                      fontWeight: 700, 
                      padding: '1px 6px', 
                      borderRadius: 3, 
                      background: isContrast ? '#000000' : st.bg, 
                      color: isContrast ? '#00ff00' : st.color, 
                      border: `1px solid ${isContrast ? '#00ff00' : st.color + '44'}` 
                    }}>
                      {t(st.labelKey)}
                    </span>
                  </div>
                  <div style={{ fontSize: 10, color: isContrast ? '#00ff00' : roleColors[v.role], marginTop: 1 }}>
                    {roleIcons[v.role]} {v.role.charAt(0).toUpperCase() + v.role.slice(1)}
                  </div>
                </div>
              </div>

              {/* Expanded detail */}
              <AnimatePresence initial={false}>
                {isSelected && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    style={{ overflow: 'hidden', borderTop: `${styles.borderWidth} solid ${styles.borderColor}` }}
                  >
                    <div style={{ padding: '10px 12px' }}>
                      {/* Skills */}
                      <div style={{ marginBottom: 10 }}>
                        <div style={{ fontSize: 9, color: isContrast ? '#00ff00' : '#475569', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 5 }}>{t('skills')}</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                          {v.skills.map(s => (
                            <span key={s} style={{ 
                              fontSize: 9, 
                              padding: '2px 7px', 
                              borderRadius: 4, 
                              background: isContrast ? 'transparent' : '#1e3a5f', 
                              color: isContrast ? '#00ff00' : '#94a3b8',
                              border: isContrast ? '1px solid #00ff00' : 'none',
                            }}>{s}</span>
                          ))}
                        </div>
                      </div>

                      {/* Location */}
                      <div style={{ fontSize: 10, color: isContrast ? '#00ff00' : '#64748b', marginBottom: 10 }}>
                        📍 {v.lat.toFixed(4)}, {v.lng.toFixed(4)}
                        {v.currentZoneId && <span style={{ color: '#f87171', marginLeft: 6 }}>⚠ {t('insideDangerZone')}</span>}
                      </div>

                      {/* Dispatch controls */}
                      <div style={{ fontSize: 9, color: isContrast ? '#00ff00' : '#475569', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>{t('dispatchTo')}</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {zoneConfigs.map(z => (
                          <button
                            key={z.zoneId}
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              onDispatch(v.id, z.zoneId); 
                              triggerHaptic('success');
                            }}
                            disabled={v.assignedZoneId === z.zoneId}
                            style={{
                              padding: '5px 10px', borderRadius: 5, fontSize: 10, fontWeight: 600,
                              cursor: v.assignedZoneId === z.zoneId ? 'default' : 'pointer',
                              background: v.assignedZoneId === z.zoneId 
                                ? (isContrast ? '#000000' : '#1e3a5f') 
                                : (isContrast ? '#000000' : '#0f2040'),
                              color: v.assignedZoneId === z.zoneId 
                                ? (isContrast ? '#555555' : '#475569') 
                                : (isContrast ? '#00ff00' : '#38bdf8'),
                              border: `1px solid ${
                                v.assignedZoneId === z.zoneId 
                                  ? (isContrast ? '#555555' : '#1e3a5f') 
                                  : (isContrast ? '#00ff00' : '#2563eb')
                              }`,
                              textAlign: 'left',
                              outline: 'none',
                            }}
                          >
                            {v.assignedZoneId === z.zoneId ? `✓ ${t('assigned')}` : `→ ${t('sendTo')}`} {z.zoneName}
                          </button>
                        ))}
                        {v.assignedZoneId && (
                          <button
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              onRecall(v.id); 
                              triggerHaptic('warning');
                            }}
                            style={{
                              padding: '5px 10px', borderRadius: 5, fontSize: 10, fontWeight: 600,
                              cursor: 'pointer', 
                              background: isContrast ? '#000000' : '#1a0a0a', 
                              color: isContrast ? '#ff3333' : '#f87171',
                              border: `1px solid ${isContrast ? '#ff3333' : '#7f1d1d'}`, 
                              textAlign: 'left',
                              outline: 'none',
                            }}
                          >
                            ↩ {t('recallToBase')}
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>

      {/* Dispatch log */}
      {dispatchMessages.length > 0 && (
        <div style={{ borderTop: `${styles.borderWidth} solid ${styles.borderColor}`, padding: '8px 12px', flexShrink: 0, maxHeight: 120, overflowY: 'auto', background: isContrast ? '#000000' : '#040e1c' }}>
          <div style={{ fontSize: 9, color: isContrast ? '#00ff00' : '#475569', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 5 }}>{t('dispatchLog')}</div>
          {dispatchMessages.map((msg, i) => (
            <div key={i} style={{ fontSize: 10, color: isContrast ? '#00ff00' : '#64748b', opacity: isContrast ? 0.7 : 1, marginBottom: 3, fontFamily: 'monospace' }}>{msg}</div>
          ))}
        </div>
      )}
    </div>
  );
}
