// ===== START: metabolic.js (منطق آنیون گپ و تحلیل متابولیک) =====
// 🛑 وابستگی‌ها از window.METABOLIC_CONSTANTS و window.CONSTANTS خوانده می‌شوند

/**
 * محاسبه آنیون گپ (Anion Gap)
 * AG = Na+ - (Cl- + HCO3-)
 * @param {number} sodium
 * @param {number} chloride
 * @param {number} hco3
 * @returns {number | null} Anion Gap
 */
function calculateAnionGap(sodium, chloride, hco3) {
    if (!sodium || !chloride || !hco3) return null; // 🛑 چک null/undefined
    return sodium - (chloride + hco3);
}

/**
 * محاسبه آنیون گپ اصلاح‌شده بر اساس آلبومین (Adjusted Anion Gap)
 * Adj AG = AG + 2.5 * (4.0 - Albumin)
 * @param {number} ag - Anion Gap خام
 * @param {number} albumin - آلبومین بیمار
 * @returns {number | null} Adjusted Anion Gap
 */
function calculateAdjustedAnionGap(ag, albumin) {
    const METABOLIC_CONSTANTS = window.METABOLIC_CONSTANTS;
    if (ag === null) return null; // 🛑 چک null

    // اگر آلبومین وارد نشده، از مقدار نرمال ثابت استفاده کن
    const actualAlbumin = albumin !== null ? albumin : METABOLIC_CONSTANTS.ALBUMIN_NORMAL;

    // اگر آلبومین نرمال یا بالا باشد، نیازی به اصلاح نیست.
    if (actualAlbumin >= METABOLIC_CONSTANTS.ALBUMIN_NORMAL) return ag;

    // 2.5 * (نرمال آلبومین - آلبومین بیمار)
    return ag + 2.5 * (METABOLIC_CONSTANTS.ALBUMIN_NORMAL - actualAlbumin);
}

/**
 * محاسبه نسبت دلتا (Delta Gap)
 * DG = (AG - 12) / (24 - HCO3-)
 * @param {number} ag - آنیون گپ
 * @param {number} hco3 - HCO3 بیمار
 * @returns {number | null} Delta Gap Ratio
 */
function calculateDeltaGap(ag, hco3) {
    const METABOLIC_CONSTANTS = window.METABOLIC_CONSTANTS;
    const CONSTANTS = window.CONSTANTS;

    // فقط برای اسیدوز متابولیک (HCO3 پایین)
    if (ag === null || !hco3 || hco3 >= CONSTANTS.HCO3_NORMAL_REF) return null;

    // فرض بر این است که 12 میانگین AG نرمال و 24 میانگین HCO3 نرمال است.
    const deltaAG = ag - METABOLIC_CONSTANTS.AG_NORMAL_HIGH; // AG - 12
    const deltaHCO3 = CONSTANTS.HCO3_NORMAL_REF - hco3; // 24 - HCO3

    // 🛑 مدیریت خطای تقسیم بر صفر و ورودی‌های نامعتبر
    if (deltaHCO3 <= 0 || isNaN(deltaAG) || isNaN(deltaHCO3)) return null;

    return deltaAG / deltaHCO3;
}


/**
 * تفسیر نهایی اسیدوز متابولیک با آنیون گپ
 * @param {object} data - شامل ag, hco3, deltaGap
 * @param {boolean} isMetabolicAcidosis
 * @returns {object} شامل agInterpretation, deltaGap, dgInterpretation
 */
function interpretMetabolicAcidosis(data) {
    const { ag, hco3, adjAg, isMetabolicAcidosis } = data;
    const { AG_NORMAL_LOW, AG_NORMAL_HIGH } = window.METABOLIC_CONSTANTS;

    const result = {
        agInterpretation: "",
        deltaGap: null,
        dgInterpretation: "",
        agState: 'normal', // normal, high, low
        adjAg: adjAg,
    };

    if (ag === null || adjAg === null) return result; // 🛑 چک null

    // 1. تفسیر آنیون گپ
    if (adjAg > AG_NORMAL_HIGH) {
        result.agInterpretation = L(`آنیون گپ اصلاح‌شده (${adjAg.toFixed(1)}) بالا است. این یافته قویاً مطرح‌کننده اسیدوز متابولیک با AG بالا است.`, `The corrected anion gap (${adjAg.toFixed(1)}) is high. This strongly suggests a high anion gap metabolic acidosis.`);
        result.agState = 'high';
    } else if (adjAg < AG_NORMAL_LOW) {
        result.agInterpretation = L(`آنیون گپ اصلاح‌شده (${adjAg.toFixed(1)}) پایین است (غیرمعمول). این یافته می‌تواند ناشی از هیپوآلبومینمی (اگر آلبومین وارد نشده)، آلکالوز یا خطای اندازه‌گیری باشد.`, `The corrected anion gap (${adjAg.toFixed(1)}) is low (uncommon). This may be due to hypoalbuminemia (if albumin was not entered), alkalosis, or a measurement error.`);
        result.agState = 'low';
    } else {
        result.agInterpretation = L(`آنیون گپ اصلاح‌شده (${adjAg.toFixed(1)}) در محدوده نرمال است. اسیدوز متابولیک فعلی احتمالاً اسیدوز متابولیک با AG نرمال (هایپرکلرمیک) است.`, `The corrected anion gap (${adjAg.toFixed(1)}) is within the normal range. The current metabolic acidosis is likely a normal anion gap (hyperchloremic) metabolic acidosis.`);
        result.agState = 'normal';
    }

    // 2. تحلیل دلتا گپ (فقط در صورت وجود اسیدوز متابولیک)
    if (isMetabolicAcidosis) {
        const dg = calculateDeltaGap(ag, hco3);
        result.deltaGap = dg;

        if (dg !== null) {
            if (dg > 1.2) {
                result.dgInterpretation = L(`نسبت دلتا (${dg.toFixed(2)}) بالاتر از حد انتظار است. این نتیجه نشان می‌دهد که آلکالوز متابولیک همزمان (Co-existing Metabolic Alkalosis) با اسیدوز متابولیک اولیه وجود دارد.`, `The delta ratio (${dg.toFixed(2)}) is higher than expected. This indicates a co-existing metabolic alkalosis alongside the primary metabolic acidosis.`);
            } else if (dg < 0.8) {
                result.dgInterpretation = L(`نسبت دلتا (${dg.toFixed(2)}) پایین‌تر از حد انتظار است. این نتیجه نشان می‌دهد که اسیدوز متابولیک با AG نرمال (Non-Anion Gap MA) همزمان با اسیدوز متابولیک اولیه وجود دارد.`, `The delta ratio (${dg.toFixed(2)}) is lower than expected. This indicates a co-existing normal anion gap metabolic acidosis (non-anion gap MA) alongside the primary metabolic acidosis.`);
            } else {
                result.dgInterpretation = L(`نسبت دلتا (${dg.toFixed(2)}) طبیعی است (0.8 تا 1.2). این نشان‌دهنده اسیدوز متابولیک خالص با AG بالا است.`, `The delta ratio (${dg.toFixed(2)}) is normal (0.8 to 1.2). This indicates a pure high anion gap metabolic acidosis.`);
            }
        }
    }

    return result;
}

// ===== END: metabolic.js =====