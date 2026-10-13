// ===== START: constants.js (ثابت‌های متمرکز برنامه) =====

// ثابت‌های عمومی پزشکی و برنامه (CONSTANTS)
const CONSTANTS = {
    // ABG Ranges (Arterial)
    PH_NORMAL_LOW: 7.35,
    PH_NORMAL_HIGH: 7.45,
    PACO2_NORMAL_LOW: 35,
    PACO2_NORMAL_HIGH: 45,
    PACO2_NORMAL_REF: 40,
    HCO3_NORMAL_LOW: 22,
    HCO3_NORMAL_HIGH: 26,
    HCO3_NORMAL_REF: 24,

    PAO2_NORMAL_LOW: 80,
    PAO2_NORMAL_HIGH: 100,
    SPO2_NORMAL_LOW: 94, // 🛑 اصلاح شده: تغییر از 95 به 94 برای هماهنگی با UI
    SPO2_WARNING_LOW: 90,
    BE_LOW: -2,
    BE_HIGH: 2,

    // Ventilation & Oxygenation
    P_ATM_SEA_LEVEL: 760,
    P_H2O: 47,
    RESP_QUOTIENT: 0.8,
};

// ثابت‌های VBG (VBG_CONSTANTS)
const VBG_CONSTANTS = {
    PH_VBG_LOW: 7.31,
    PH_VBG_HIGH: 7.41,
    PACO2_VBG_LOW: 41,
    PACO2_VBG_HIGH: 51,
    HCO3_VBG_LOW: 23,
    HCO3_VBG_HIGH: 29,
    PACO2_VBG_REF: 46,
    HCO3_VBG_REF: 26,
};

// ثابت‌های متابولیک (METABOLIC_CONSTANTS)
const METABOLIC_CONSTANTS = {
    AG_NORMAL_LOW: 8,
    AG_NORMAL_HIGH: 12,
    ALBUMIN_NORMAL: 4.0,
};

// ثابت‌های ونتیلاتور (VENT_CONSTANTS)
const VENT_CONSTANTS = {
    PH_CRITICAL_LOW: 7.20,
    PH_CRITICAL_HIGH: 7.60,
    PAO2_CRITICAL_LOW: 60,
    SPO2_CRITICAL_LOW: 88,
    MAX_PEEP_SAFE: 20,
    MAX_PPLAT_SAFE: 30,
    MAX_DRIVING_PRESSURE: 15,
    MIN_TV_PER_KG: 4,
    MAX_TV_PER_KG: 8,
    LUNG_PROTECTIVE_TV_MAX: 6,
    LUNG_PROTECTIVE_TV_MIN: 4,
    PF_RATIO_ARDS_MODERATE: 200,
    PF_RATIO_ARDS_SEVERE: 100,
    FIO2_TOXIC_THRESHOLD: 60,
    FIO2_DANGER_THRESHOLD: 80,
    RR_NORMAL_LOW: 10,
    RR_NORMAL_HIGH: 20,
    RR_MAX_ACCEPTABLE: 35,
};

// 🛑 برای رفع وابستگی‌های محیط مرورگر، همه ثابت‌ها را در window قرار می‌دهیم
window.CONSTANTS = CONSTANTS;
window.VBG_CONSTANTS = VBG_CONSTANTS;
window.METABOLIC_CONSTANTS = METABOLIC_CONSTANTS;
window.VENT_CONSTANTS = VENT_CONSTANTS;

// ===== END: constants.js =====