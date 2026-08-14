import { useState, useEffect } from 'react';

export type ThemeMode = 'glass' | 'contrast';
export type TextSize = 'sm' | 'md' | 'lg';
export type Language = 'en' | 'es' | 'fr' | 'de' | 'hi' | 'ar' | 'zh' | 'ru' | 'ja';

// Define translations for major languages
export const TRANSLATIONS: Record<Language, Record<string, string>> = {
  en: {
    activeZones: "Active Zones",
    responders: "Responders",
    resourceHubs: "Resource Hubs",
    geofenceChecks: "Geofence Checks",
    p2pSyncOps: "P2P Sync Ops",
    meshLatency: "Mesh Latency",
    offlineQueue: "Offline Queue",
    crdtConflicts: "CRDT Conflicts",
    incident: "INCIDENT",
    active: "ACTIVE",
    threatLevel: "THREAT LEVEL",
    high: "HIGH",
    mode: "MODE",
    server: "SERVER",
    peers: "PEERS",
    crdt: "CRDT",
    low: "LOW",
    medium: "MEDIUM",
    critical: "CRITICAL",
    zoneCoverage: "Zone Coverage",
    volunteers: "Volunteers",
    dispatchLog: "Dispatch Log",
    skills: "Skills",
    dispatchTo: "Dispatch To",
    recallToBase: "Recall to Base",
    sendTo: "Send to",
    assigned: "Assigned",
    hubs: "Hubs",
    capacity: "Capacity",
    items: "Items",
    theme: "Theme",
    glass: "Glassmorphism",
    highContrast: "High Contrast",
    language: "Language",
    textResizer: "Text Size",
    sos: "SOS ALERT",
    insideDangerZone: "Inside danger zone",
    enRoute: "EN ROUTE",
    standby: "STANDBY",
    offline: "OFFLINE",
    dangerZone: "danger zone",
    vol: "Volunteer",
    legend: "Legend",
    noHubs: "No hubs loaded",
    breach: "ZONE BREACH DETECTED",
    cleared: "ZONE CLEARED",
  },
  es: {
    activeZones: "Zonas Activas",
    responders: "Socorristas",
    resourceHubs: "Centros de Recursos",
    geofenceChecks: "Controles de Geovalla",
    p2pSyncOps: "Operaciones P2P",
    meshLatency: "Latencia de Red",
    offlineQueue: "Cola Desconectada",
    crdtConflicts: "Conflictos de CRDT",
    incident: "INCIDENTE",
    active: "ACTIVO",
    threatLevel: "NIVEL DE AMENAZA",
    high: "ALTO",
    mode: "MODO",
    server: "SERVIDOR",
    peers: "PARES",
    crdt: "CRDT",
    low: "BAJO",
    medium: "MEDIO",
    critical: "CRÍTICO",
    zoneCoverage: "Cobertura de Zona",
    volunteers: "Voluntarios",
    dispatchLog: "Registro de Despacho",
    skills: "Habilidades",
    dispatchTo: "Despachar A",
    recallToBase: "Llamar a Base",
    sendTo: "Enviar a",
    assigned: "Asignado",
    hubs: "Centros",
    capacity: "Capacidad",
    items: "Artículos",
    theme: "Tema",
    glass: "Glastomorfismo",
    highContrast: "Alto Contraste",
    language: "Idioma",
    textResizer: "Tamaño Texto",
    sos: "ALERTA SOS",
    insideDangerZone: "En zona de peligro",
    enRoute: "EN RUTA",
    standby: "EN ESPERA",
    offline: "DESCONECTADO",
    dangerZone: "zona de peligro",
    vol: "Voluntario",
    legend: "Leyenda",
    noHubs: "No hay centros cargados",
    breach: "BRECHA DE ZONA DETECTADA",
    cleared: "ZONA DESPEJADA",
  },
  fr: {
    activeZones: "Zones Actives",
    responders: "Secouristes",
    resourceHubs: "Centres de Ressources",
    geofenceChecks: "Contrôles Géo-barrière",
    p2pSyncOps: "Ops Synchro P2P",
    meshLatency: "Latence du Réseau",
    offlineQueue: "File d'attente Hors-ligne",
    crdtConflicts: "Conflits CRDT",
    incident: "INCIDENT",
    active: "ACTIF",
    threatLevel: "NIVEAU DE MENACE",
    high: "ÉLEVÉ",
    mode: "MODE",
    server: "SERVEUR",
    peers: "PAIRS",
    crdt: "CRDT",
    low: "BAS",
    medium: "MOYEN",
    critical: "CRITIQUE",
    zoneCoverage: "Couverture de Zone",
    volunteers: "Bénévoles",
    dispatchLog: "Log d'Envoi",
    skills: "Compétences",
    dispatchTo: "Envoyer À",
    recallToBase: "Rappeler à la Base",
    sendTo: "Envoyer vers",
    assigned: "Assigné",
    hubs: "Centres",
    capacity: "Capacité",
    items: "Articles",
    theme: "Thème",
    glass: "Glassmorphisme",
    highContrast: "Contraste Élevé",
    language: "Langue",
    textResizer: "Taille de Police",
    sos: "ALERTE SOS",
    insideDangerZone: "Dans la zone de danger",
    enRoute: "EN ROUTE",
    standby: "EN ATTENTE",
    offline: "HORS-LIGNE",
    dangerZone: "zone de danger",
    vol: "Bénévole",
    legend: "Légende",
    noHubs: "Aucun centre chargé",
    breach: "BRÈCHE DE ZONE DÉTECTÉE",
    cleared: "ZONE LIBÉRÉE",
  },
  de: {
    activeZones: "Aktive Zonen",
    responders: "Einsatzkräfte",
    resourceHubs: "Ressourcenzentren",
    geofenceChecks: "Geofence-Prüfungen",
    p2pSyncOps: "P2P-Sync-Operationen",
    meshLatency: "Netzwerklatenz",
    offlineQueue: "Offline-Warteschlange",
    crdtConflicts: "CRDT-Konflikte",
    incident: "VORFALL",
    active: "AKTIV",
    threatLevel: "GEFAHRSTUFE",
    high: "HOCH",
    mode: "MODUS",
    server: "SERVER",
    peers: "PEERS",
    crdt: "CRDT",
    low: "NIEDRIG",
    medium: "MITTEL",
    critical: "KRITISCH",
    zoneCoverage: "Zonenabdeckung",
    volunteers: "Freiwillige",
    dispatchLog: "Einsatzprotokoll",
    skills: "Fähigkeiten",
    dispatchTo: "Entsenden Nach",
    recallToBase: "Zurückrufen zur Basis",
    sendTo: "Senden an",
    assigned: "Zugewiesen",
    hubs: "Zentren",
    capacity: "Kapazität",
    items: "Artikel",
    theme: "Design",
    glass: "Glasmorphismus",
    highContrast: "Hoher Kontrast",
    language: "Sprache",
    textResizer: "Textgröße",
    sos: "SOS ALERT",
    insideDangerZone: "In Gefahrenzone",
    enRoute: "UNTERWEGS",
    standby: "BEREITSCHAFT",
    offline: "OFFLINE",
    dangerZone: "Gefahrenzone",
    vol: "Freiwilliger",
    legend: "Legende",
    noHubs: "Keine Zentren geladen",
    breach: "ZONENVERLETZUNG ERKANNT",
    cleared: "ZONE GEREINIGT",
  },
  hi: {
    activeZones: "सक्रिय क्षेत्र",
    responders: "सहायक कर्मी",
    resourceHubs: "संसाधन केंद्र",
    geofenceChecks: "जियोफेंस जाँच",
    p2pSyncOps: "P2P सिंक कार्य",
    meshLatency: "नेटवर्क विलंबता",
    offlineQueue: "ऑफ़लाइन कतार",
    crdtConflicts: "CRDT विवाद",
    incident: "घटना",
    active: "सक्रिय",
    threatLevel: "खतरे का स्तर",
    high: "उच्च",
    mode: "मोड",
    server: "सर्वर",
    peers: "सहकर्मी",
    crdt: "CRDT",
    low: "कम",
    medium: "मध्यम",
    critical: "गंभीर",
    zoneCoverage: "क्षेत्र कवरेज",
    volunteers: "स्वयंसेवक",
    dispatchLog: "प्रेषण लॉग",
    skills: "कौशल",
    dispatchTo: "यहाँ भेजें",
    recallToBase: "वापस बुलाएं",
    sendTo: "भेजें",
    assigned: "आवंटित",
    hubs: "हब",
    capacity: "क्षमता",
    items: "सामग्री",
    theme: "थीम",
    glass: "ग्लासमॉर्फ़िज़्म",
    highContrast: "उच्च कंट्रास्ट",
    language: "भाषा",
    textResizer: "पाठ का आकार",
    sos: "SOS चेतावनी",
    insideDangerZone: "खतरे के क्षेत्र में",
    enRoute: "मार्ग में",
    standby: "तैयार",
    offline: "ऑफ़लाइन",
    dangerZone: "खतरे का क्षेत्र",
    vol: "स्वयंसेवक",
    legend: "संकेत चिन्ह",
    noHubs: "कोई हब लोड नहीं",
    breach: "क्षेत्र उल्लंघन पाया गया",
    cleared: "क्षेत्र सुरक्षित",
  },
  ar: {
    activeZones: "المناطق النشطة",
    responders: "المستجيبون",
    resourceHubs: "مراكز الموارد",
    geofenceChecks: "فحوصات السياج الجغرافي",
    p2pSyncOps: "مزامنة P2P",
    meshLatency: "زمن وصول الشبكة",
    offlineQueue: "الانتظار دون اتصال",
    crdtConflicts: "تعارضات CRDT",
    incident: "حادث",
    active: "نشط",
    threatLevel: "مستوى التهديد",
    high: "عالي",
    mode: "الوضع",
    server: "الخادم",
    peers: "النظراء",
    crdt: "CRDT",
    low: "منخفض",
    medium: "متوسط",
    critical: "حرِج",
    zoneCoverage: "تغطية المنطقة",
    volunteers: "المتطوعون",
    dispatchLog: "سجل الإرسال",
    skills: "المهارات",
    dispatchTo: "إرسال إلى",
    recallToBase: "استدعاء للقاعدة",
    sendTo: "إرسال إلى",
    assigned: "تم التعيين",
    hubs: "المراكز",
    capacity: "القدرة الاستيعابية",
    items: "المواد",
    theme: "المظهر",
    glass: "مظهر زجاجي",
    highContrast: "تباين عالي",
    language: "اللغة",
    textResizer: "حجم الخط",
    sos: "إنذار SOS",
    insideDangerZone: "داخل منطقة الخطر",
    enRoute: "في الطريق",
    standby: "الاستعداد",
    offline: "غير متصل",
    dangerZone: "منطقة خطر",
    vol: "متطوع",
    legend: "دليل الخريطة",
    noHubs: "لم يتم تحميل مراكز",
    breach: "تم اكتشاف خرق للمنطقة",
    cleared: "تم إخلاء المنطقة",
  },
  zh: {
    activeZones: "活动区域",
    responders: "救援人员",
    resourceHubs: "物资中心",
    geofenceChecks: "地理围栏检查",
    p2pSyncOps: "P2P同步操作",
    meshLatency: "网络延迟",
    offlineQueue: "离线队列",
    crdtConflicts: "CRDT冲突",
    incident: "事件",
    active: "活跃",
    threatLevel: "威胁等级",
    high: "高",
    mode: "模式",
    server: "服务器",
    peers: "节点",
    crdt: "CRDT",
    low: "低",
    medium: "中",
    critical: "紧急",
    zoneCoverage: "区域覆盖率",
    volunteers: "志愿者",
    dispatchLog: "派遣记录",
    skills: "技能",
    dispatchTo: "派遣至",
    recallToBase: "召回至基地",
    sendTo: "发送到",
    assigned: "已分配",
    hubs: "中心",
    capacity: "容量",
    items: "物品",
    theme: "主题",
    glass: "毛玻璃特效",
    highContrast: "高对比度",
    language: "语言",
    textResizer: "字体大小",
    sos: "SOS 紧急求助",
    insideDangerZone: "处于危险区域",
    enRoute: "前往中",
    standby: "待命",
    offline: "离线",
    dangerZone: "危险区域",
    vol: "志愿者",
    legend: "图例",
    noHubs: "未加载物资中心",
    breach: "检测到区域入侵",
    cleared: "区域已安全",
  },
  ru: {
    activeZones: "Активные зоны",
    responders: "Спасатели",
    resourceHubs: "Ресурсные центры",
    geofenceChecks: "Геозонирование",
    p2pSyncOps: "Синхронизация P2P",
    meshLatency: "Задержка сети",
    offlineQueue: "Очередь офлайн",
    crdtConflicts: "Конфликты CRDT",
    incident: "ПРОИСШЕСТВИЕ",
    active: "АКТИВНО",
    threatLevel: "УРОВЕНЬ УГРОЗЫ",
    high: "ВЫСОКИЙ",
    mode: "РЕЖИМ",
    server: "СЕРВЕР",
    peers: "ПИРЫ",
    crdt: "CRDT",
    low: "НИЗКИЙ",
    medium: "СРЕДНИЙ",
    critical: "КРИТИЧЕСКИЙ",
    zoneCoverage: "Покрытие зон",
    volunteers: "Волонтеры",
    dispatchLog: "Журнал отправки",
    skills: "Навыки",
    dispatchTo: "Направить в",
    recallToBase: "Отозвать на базу",
    sendTo: "Отправить в",
    assigned: "Назначен",
    hubs: "Центры",
    capacity: "Вместимость",
    items: "Ресурсы",
    theme: "Тема",
    glass: "Стекломорфизм",
    highContrast: "Высокий контраст",
    language: "Язык",
    textResizer: "Размер текста",
    sos: "СИГНАЛ SOS",
    insideDangerZone: "В опасной зоне",
    enRoute: "В ПУТИ",
    standby: "ОЖИДАНИЕ",
    offline: "ОФЛАЙН",
    dangerZone: "опасная зона",
    vol: "Волонтер",
    legend: "Легенда",
    noHubs: "Нет загруженных центров",
    breach: "ОБНАРУЖЕНО НАРУШЕНИЕ ЗОНЫ",
    cleared: "ЗОНА БЕЗОПАСНА",
  },
  ja: {
    activeZones: "活動エリア",
    responders: "対応隊員",
    resourceHubs: "支援物資拠点",
    geofenceChecks: "ジオフェンス監視",
    p2pSyncOps: "P2P同期処理",
    meshLatency: "ネットワーク遅延",
    offlineQueue: "オフライン蓄積",
    crdtConflicts: "CRDT競合",
    incident: "災害事象",
    active: "発生中",
    threatLevel: "警戒レベル",
    high: "高警戒",
    mode: "通信モード",
    server: "サーバー",
    peers: "ピア接続数",
    crdt: "CRDT",
    low: "低",
    medium: "中",
    critical: "致命的",
    zoneCoverage: "エリアカバー率",
    volunteers: "支援者リスト",
    dispatchLog: "派遣指示ログ",
    skills: "保有スキル",
    dispatchTo: "派遣先エリア",
    recallToBase: "ベースに帰還指示",
    sendTo: "派遣実行",
    assigned: "派遣済み",
    hubs: "拠点",
    capacity: "許容量",
    items: "支援物資",
    theme: "テーマ",
    glass: "グラスモルフィズム",
    highContrast: "ハイコントラスト",
    language: "表示言語",
    textResizer: "文字サイズ",
    sos: "SOS 緊急信号",
    insideDangerZone: "危険区域内に滞在",
    enRoute: "移動中",
    standby: "待機中",
    offline: "オフライン",
    dangerZone: "危険エリア",
    vol: "ボランティア",
    legend: "凡例",
    noHubs: "拠点情報がありません",
    breach: "危険区域への侵入検知",
    cleared: "安全を確保",
  }
};

// Language options for selector
export const LANG_LIST = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Español' },
  { code: 'fr', name: 'Français' },
  { code: 'de', name: 'Deutsch' },
  { code: 'hi', name: 'हिन्दी' },
  { code: 'ar', name: 'العربية' },
  { code: 'zh', name: '中文' },
  { code: 'ru', name: 'Русский' },
  { code: 'ja', name: '日本語' },
];

export function useTheme() {
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    return (localStorage.getItem('mirage_theme') as ThemeMode) || 'glass';
  });

  const [textSize, setTextSize] = useState<TextSize>(() => {
    return (localStorage.getItem('mirage_text_size') as TextSize) || 'md';
  });

  const [lang, setLang] = useState<Language>(() => {
    return (localStorage.getItem('mirage_lang') as Language) || 'en';
  });

  const [isLowEndDevice, setIsLowEndDevice] = useState(false);
  const [userRole, setUserRole] = useState<'admin' | 'coordinator' | 'field_agent' | 'responder' | 'viewer'>(() => {
    return (localStorage.getItem('mirage_role') as any) || 'viewer';
  });
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('mirage_token');
  });

  // Automatically fetch token when role changes
  useEffect(() => {
    if (userRole === 'viewer') {
      setToken(null);
      localStorage.removeItem('mirage_token');
      return;
    }
    
    const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';
    fetch(`${API_URL}/api/v1/auth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sub: `user_${userRole}`,
        role: userRole,
        secret: 'change_me_in_production',
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.token) {
          setToken(data.token);
          localStorage.setItem('mirage_token', data.token);
        }
      })
      .catch((err) => console.error('Auto-auth failed:', err));
  }, [userRole]);

  // Detect low-end devices or browsers without backdrop-filter support
  useEffect(() => {
    const hasBackdropFilter = CSS.supports('backdrop-filter', 'blur(15px)');
    const hardwareConcurrency = navigator.hardwareConcurrency || 4;
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    // Flag device as low-end if no backdrop-filter or CPU cores <= 2 on mobile
    if (!hasBackdropFilter || (isMobile && hardwareConcurrency <= 2)) {
      setIsLowEndDevice(true);
    }
  }, []);

  const toggleTheme = () => {
    const nextMode = themeMode === 'glass' ? 'contrast' : 'glass';
    setThemeMode(nextMode);
    localStorage.setItem('mirage_theme', nextMode);
    triggerHaptic('success');
  };

  const changeTextSize = (size: TextSize) => {
    setTextSize(size);
    localStorage.setItem('mirage_text_size', size);
    triggerHaptic('success');
  };

  const changeLanguage = (newLang: Language) => {
    setLang(newLang);
    localStorage.setItem('mirage_lang', newLang);
    triggerHaptic('success');
  };

  const changeRole = (newRole: typeof userRole) => {
    setUserRole(newRole);
    localStorage.setItem('mirage_role', newRole);
    triggerHaptic('success');
  };

  // Haptic feedback triggers using standard Web Vibration API
  const triggerHaptic = (pattern: 'sos' | 'success' | 'warning' | 'tap') => {
    if (!navigator.vibrate) return;
    
    switch (pattern) {
      case 'sos':
        navigator.vibrate([100, 50, 100, 50, 100]); // Heartbeat SOS
        break;
      case 'success':
        navigator.vibrate([15]); // Sharp tap success
        break;
      case 'warning':
        navigator.vibrate([200, 100, 200]); // Warning vibration
        break;
      case 'tap':
        navigator.vibrate([8]); // Very light tab feedback
        break;
    }
  };

  const t = (key: string): string => {
    return TRANSLATIONS[lang]?.[key] || TRANSLATIONS['en']?.[key] || key;
  };

      // Dynamic style builder depending on theme modes, text sizes, and device performance.
  const getThemeStyles = () => {
    const baseFontSize = textSize === 'sm' ? '12px' : textSize === 'md' ? '14px' : '17px';
    const isContrast = themeMode === 'contrast'; // Now acts as Daylight High Contrast mode
    
    return {
      fontSize: baseFontSize,
      fontFamily: isContrast ? 'Arial, Helvetica, sans-serif' : 'system-ui, -apple-system, sans-serif',
      appBg: isContrast ? '#ffffff' : '#040b16',
      textColor: isContrast ? '#000000' : '#e2e8f0',
      borderColor: isContrast ? '#000000' : '#1e3a5f',
      borderWidth: isContrast ? '3px' : '1px',
      
      // Panel styling
      panelBg: isContrast 
        ? '#ffffff' 
        : (isLowEndDevice ? 'rgba(7, 15, 30, 0.98)' : 'rgba(7, 15, 30, 0.65)'),
      panelBackdrop: isLowEndDevice || isContrast ? 'none' : 'blur(15px)',
      
      // Dynamic buttons
      btnPrimaryBg: isContrast ? '#ffcc00' : '#2563eb', // High-viz yellow
      btnPrimaryColor: isContrast ? '#000000' : '#ffffff',
      btnPrimaryBorder: isContrast ? '3px solid #000000' : '1px solid #2563eb',
      
      btnDangerBg: isContrast ? '#ff0000' : '#dc2626',
      btnDangerColor: isContrast ? '#ffffff' : '#ffffff',
      btnDangerBorder: isContrast ? '3px solid #000000' : '1px solid #dc2626',

      headerBg: isContrast ? '#ffffff' : 'linear-gradient(90deg, #020c1b 0%, #0a1628 50%, #020c1b 100%)',
      statsBarBg: isContrast ? '#f3f4f6' : '#040e1c',
      
      glowColor: isContrast ? 'transparent' : 'rgba(56, 189, 248, 0.5)',
      
      glowShadow: isContrast 
        ? '4px 4px 0px #000000' // Hard shadow for high contrast UI
        : '0 4px 30px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
    };
  };

  return {
    themeMode,
    textSize,
    lang,
    userRole,
    token,
    isLowEndDevice,
    toggleTheme,
    changeTextSize,
    changeLanguage,
    changeRole,
    triggerHaptic,
    t,
    styles: getThemeStyles(),
  };
}

export type ThemeHook = ReturnType<typeof useTheme>;
