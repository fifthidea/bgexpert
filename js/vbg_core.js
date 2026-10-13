// ===== START: vbg_core.js (منطق مرکزی تحلیل اسید-باز) =====
// 🛑 وابستگی‌ها از window.CONSTANTS خوانده می‌شوند

/**
 * دریافت محدوده های نرمال بر اساس نوع نمونه
 * @param {string} sampleType - 'abg' یا 'vbg'
 * @param {number} age - سن بیمار
 * @returns {object} محدوده های نرمال
 */
function getNormalRanges(sampleType, age = 40) {
    // 🛑 استفاده از ثابت‌های عمومی
    const CONSTANTS = window.CONSTANTS;
    const VBG_CONSTANTS = window.VBG_CONSTANTS;

    const isVBG = sampleType === 'vbg';

    let ranges = {
        ph_low: isVBG ? VBG_CONSTANTS.PH_VBG_LOW : CONSTANTS.PH_NORMAL_LOW,
        ph_high: isVBG ? VBG_CONSTANTS.PH_VBG_HIGH : CONSTANTS.PH_NORMAL_HIGH,
        paco2_low: isVBG ? VBG_CONSTANTS.PACO2_VBG_LOW : CONSTANTS.PACO2_NORMAL_LOW,
        paco2_high: isVBG ? VBG_CONSTANTS.PACO2_VBG_HIGH : CONSTANTS.PACO2_NORMAL_HIGH,
        paco2_ref: isVBG ? VBG_CONSTANTS.PACO2_VBG_REF : CONSTANTS.PACO2_NORMAL_REF,
        hco3_low: isVBG ? VBG_CONSTANTS.HCO3_VBG_LOW : CONSTANTS.HCO3_NORMAL_LOW,
        hco3_high: isVBG ? VBG_CONSTANTS.HCO3_VBG_HIGH : CONSTANTS.HCO3_NORMAL_HIGH,
        hco3_ref: isVBG ? VBG_CONSTANTS.HCO3_VBG_REF : CONSTANTS.HCO3_NORMAL_REF,
        pao2_low: CONSTANTS.PAO2_NORMAL_LOW,
        pao2_high: CONSTANTS.PAO2_NORMAL_HIGH,
    };

    if (!isVBG && age && age > 0) { // تنظیم PaO2 بر اساس سن فقط برای ABG
        let expectedPaO2 = 100 - (0.3 * age);
        ranges.pao2_low = expectedPaO2 - 10;
        ranges.pao2_high = expectedPaO2;
    }

    return ranges;
}


/**
 * تابع مرکزی تفسیر اسید-باز.
 * @param {object} data - شامل ph, paco2, hco3 و سایر داده ها
 * @param {object} normalRanges - محدوده های نرمال (ABG یا VBG)
 * @param {boolean} isVBG - آیا نمونه وریدی است؟
 * @returns {object} نتایج تفسیر
 */
function runAcidBaseInterpretation(data, normalRanges, isVBG) {
    const { ph, paco2, hco3, be } = data;
    const {
        ph_low, ph_high, paco2_low, paco2_high, hco3_low, hco3_high, paco2_ref, hco3_ref
    } = normalRanges;

    let primaryDisorder = "", compensationState = "";

    // 🛑 چک ایمنی: اگر پارامترهای اصلی وارد نشده باشند، از اجرا صرف نظر کن
    if (ph === null || paco2 === null || hco3 === null) {
        return { primaryDisorder: "داده‌های ناکافی", compensationState: "", compensationAnalysis: {}, isMetabolicAcidosis: false, hco3_ref: hco3_ref };
    }

    const isAcidemia = ph < ph_low, isAlkalemia = ph > ph_high;
    const isPHNormal = !isAcidemia && !isAlkalemia;
    const isRespiratoryAcidosis = paco2 > paco2_high, isRespiratoryAlkalosis = paco2 < paco2_low;
    const isMetabolicAcidosis = hco3 < hco3_low, isMetabolicAlkalosis = hco3 > hco3_high;


    // 1. تشخیص اختلال اولیه (Primary Disorder)
    if (isAcidemia) {
        if (isMetabolicAcidosis && isRespiratoryAcidosis) primaryDisorder = "اسیدوز متابولیک و تنفسی مختلط";
        else if (isMetabolicAcidosis) primaryDisorder = "اسیدوز متابولیک";
        else if (isRespiratoryAcidosis) primaryDisorder = "اسیدوز تنفسی";
        else primaryDisorder = "اسیدمی نامشخص";
    }
    else if (isAlkalemia) {
        if (isMetabolicAlkalosis && isRespiratoryAlkalosis) primaryDisorder = "آلکالوز متابولیک و تنفسی مختلط";
        else if (isMetabolicAlkalosis) primaryDisorder = "آلکالوز متابولیک";
        else if (isRespiratoryAlkalosis) primaryDisorder = "آلکالوز تنفسی";
        else primaryDisorder = "آلکالمی نامشخص";
    }
    else if (isPHNormal) {
        if (isRespiratoryAcidosis && isMetabolicAlkalosis) primaryDisorder = "اسیدوز تنفسی و آلکالوز متابولیک (مختلط)";
        else if (isRespiratoryAlkalosis && isMetabolicAcidosis) primaryDisorder = "آلکالوز تنفسی و اسیدوز متابولیک (مختلط)";
        else primaryDisorder = "وضعیت نرمال اسید-باز";
    } else {
        primaryDisorder = "اختلال اولیه نامشخص";
    }

    // 2. تحلیل جبران (Compensation Analysis)
    let compensationAnalysis = {};

    if (primaryDisorder.includes("اسیدوز متابولیک") && !primaryDisorder.includes("مختلط")) {
        const expectedPaco2 = 1.5 * hco3 + 8;
        compensationAnalysis = { parameter: 'PaCO₂', actual: paco2, expected: expectedPaco2.toFixed(1), unit: 'mmHg' };
        if (Math.abs(paco2 - expectedPaco2) > 2) compensationState = "با جبران نامناسب";
        else compensationState = isPHNormal ? "با جبران کامل" : "با جبران ناقص";
    } else if (primaryDisorder.includes("آلکالوز متابولیک") && !primaryDisorder.includes("مختلط")) {
        const expectedPaco2 = 0.7 * hco3 + 21;
        compensationAnalysis = { parameter: 'PaCO₂', actual: paco2, expected: expectedPaco2.toFixed(1), unit: 'mmHg' };
        if (Math.abs(paco2 - expectedPaco2) > 5) compensationState = "با جبران نامناسب";
        else compensationState = isPHNormal ? "با جبران کامل" : "با جبران ناقص";
    } else if (primaryDisorder.includes("اسیدوز تنفسی") && !primaryDisorder.includes("مختلط")) {
        const deltaPaco2 = paco2 - paco2_ref;
        const expectedHCO3Acute = hco3_ref + 0.1 * deltaPaco2;
        const expectedHCO3Chronic = hco3_ref + 0.35 * deltaPaco2;

        let expectedHCO3;
        if (Math.abs(hco3 - expectedHCO3Chronic) < Math.abs(hco3 - expectedHCO3Acute)) {
            primaryDisorder = "اسیدوز تنفسی مزمن"; expectedHCO3 = expectedHCO3Chronic;
        } else {
            primaryDisorder = "اسیدوز تنفسی حاد"; expectedHCO3 = expectedHCO3Acute;
        }

        compensationAnalysis = { parameter: 'HCO₃⁻', actual: hco3, expected: expectedHCO3.toFixed(1), unit: 'mmol/L' };
        // 🛑 اصلاح: اضافه کردن چک جبران نامناسب تنفسی (آستانه 3)
        if (Math.abs(hco3 - expectedHCO3) > 3) compensationState = "با جبران نامناسب";
        else compensationState = isPHNormal ? "با جبران کامل" : "با جبران ناقص";

    } else if (primaryDisorder.includes("آلکالوز تنفسی") && !primaryDisorder.includes("مختلط")) {
        const deltaPaco2 = paco2_ref - paco2;
        const expectedHCO3Acute = hco3_ref - 0.2 * deltaPaco2;
        const expectedHCO3Chronic = hco3_ref - 0.5 * deltaPaco2;

        let expectedHCO3;
        if (Math.abs(hco3 - expectedHCO3Chronic) < Math.abs(hco3 - expectedHCO3Acute)) {
            primaryDisorder = "آلکالوز تنفسی مزمن"; expectedHCO3 = expectedHCO3Chronic;
        } else {
            primaryDisorder = "آلکالوز تنفسی حاد"; expectedHCO3 = expectedHCO3Acute;
        }

        compensationAnalysis = { parameter: 'HCO₃⁻', actual: hco3, expected: expectedHCO3.toFixed(1), unit: 'mmol/L' };
        // 🛑 اصلاح: اضافه کردن چک جبران نامناسب تنفسی (آستانه 3)
        if (Math.abs(hco3 - expectedHCO3) > 3) compensationState = "با جبران نامناسب";
        else compensationState = isPHNormal ? "با جبران کامل" : "با جبران ناقص";
    }

    return { primaryDisorder, compensationState, compensationAnalysis, isMetabolicAcidosis, isAlkalemia, hco3_ref };
}

// ===== END: vbg_core.js =====