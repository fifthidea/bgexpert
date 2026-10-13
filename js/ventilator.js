// ===== START: VENTILATOR LOGIC (ventilator.js - اصلاح‌شده نهایی) =====
// 🛑 وابستگی‌ها از window.VENT_CONSTANTS خوانده می‌شوند

/**
 * محاسبه وزن ایده‌آل (Predicted Body Weight)
 */
function calculatePBW(height, gender) {
    if (!height || !gender || height < 100) return null; // 🛑 چک‌های null/undefined/مقدار نامعتبر

    const heightInCm = height;
    let pbw;

    if (gender === 'male') {
        pbw = 50 + 0.91 * (heightInCm - 152.4);
    } else if (gender === 'female') {
        pbw = 45.5 + 0.91 * (heightInCm - 152.4);
    } else {
        return null;
    }

    // 🛑 چک ایمنی: اطمینان از مثبت بودن PBW
    return pbw > 0 ? pbw : null;
}

/**
 * محاسبه P/F Ratio
 */
function calculatePFRatio(pao2, fio2) {
    // 🛑 چک ایمنی و مدیریت خطای تقسیم بر صفر
    if (!pao2 || !fio2 || fio2 <= 0) return null;
    return pao2 / (fio2 / 100);
}

/**
 * محاسبه فشار محرکه (Driving Pressure)
 */
function calculateDrivingPressure(pressureSetting, peep) {
    if (pressureSetting === null || peep === null) return null; // 🛑 چک null
    // 🛑 Driving Pressure = Pplat - PEEP (برای AC-VC/SIMV) یا P.Insp - PEEP (برای AC-PC)
    // در این منطق، pressureSetting می‌تواند Pplat یا P.Insp باشد. از آنجایی که تنها ورودی برای P.Insp / PS است، از آن استفاده می‌کنیم
    return pressureSetting - peep;
}

/**
 * ارزیابی ریسک باراکوتروما
 */
function assessBarotraumaRisk(pplat, peep, drivingPressure) {
    const VENT_CONSTANTS = window.VENT_CONSTANTS;
    const risks = [];

    // 1. Pplat (فقط در VC/SIMV مهم است)
    if (pplat !== null) {
        if (pplat > VENT_CONSTANTS.MAX_PPLAT_SAFE) { // > 30
            risks.push({
                level: 'urgent',
                message: L(`⚠️ فشار پلاتو (${pplat} cmH₂O) بسیار بالاست! خطر باراکوتروما وجود دارد. هدف: < ${VENT_CONSTANTS.MAX_PPLAT_SAFE}`, `⚠️ Plateau pressure (${pplat} cmH₂O) is very high! Risk of barotrauma. Target: < ${VENT_CONSTANTS.MAX_PPLAT_SAFE}`)
            });
        } else if (pplat > 25) {
            risks.push({
                level: 'warning',
                message: L(`⚠️ فشار پلاتو (${pplat} cmH₂O) در محدوده بالا است. خطر آسیب ریوی وجود دارد.`, `⚠️ Plateau pressure (${pplat} cmH₂O) is in the high range. Risk of lung injury.`)
            });
        }
    }

    // 2. Driving Pressure (مهم‌ترین معیار ریسک)
    if (drivingPressure !== null && drivingPressure > VENT_CONSTANTS.MAX_DRIVING_PRESSURE) { // > 15
        risks.push({
            level: 'urgent',
            message: L(`⚠️ فشار محرکه (${drivingPressure.toFixed(1)} cmH₂O) بسیار بالاست! با مرگ‌ومیر بیشتر در ARDS مرتبط است. هدف: < ${VENT_CONSTANTS.MAX_DRIVING_PRESSURE}`, `⚠️ Driving pressure (${drivingPressure.toFixed(1)} cmH₂O) is very high! Associated with higher mortality in ARDS. Target: < ${VENT_CONSTANTS.MAX_DRIVING_PRESSURE}`)
        });
    }

    // 3. PEEP (بالا)
    if (peep !== null && peep > VENT_CONSTANTS.MAX_PEEP_SAFE) { // > 20
        risks.push({
            level: 'warning',
            message: L(`⚠️ PEEP (${peep} cmH₂O) در محدوده بسیار بالا است. خطر کاهش بازگشت وریدی و باراکوتروما.`, `⚠️ PEEP (${peep} cmH₂O) is in the very high range. Risk of reduced venous return and barotrauma.`)
        });
    }

    return risks;
}

/**
 * ارزیابی استراتژی محافظت از ریه
 */
function assessLungProtectiveStrategy(tv, pbw, ventMode) {
    const VENT_CONSTANTS = window.VENT_CONSTANTS;
    const recommendations = [];

    if (tv === null || pbw === null || pbw <= 0) return recommendations;

    const tvPerKg = tv / pbw;
    const targetTV = pbw * VENT_CONSTANTS.LUNG_PROTECTIVE_TV_MAX; // 6 ml/kg

    if (tvPerKg > VENT_CONSTANTS.MAX_TV_PER_KG) { // > 8 ml/kg
        recommendations.push({
            level: 'urgent',
            message: L(`⛔️ حجم جاری (${tvPerKg.toFixed(1)} ml/kg) بسیار بالاست! خطر آسیب ریوی وجود دارد. هدف: ${VENT_CONSTANTS.LUNG_PROTECTIVE_TV_MIN}-${VENT_CONSTANTS.LUNG_PROTECTIVE_TV_MAX} ml/kg`, `⛔️ Tidal volume (${tvPerKg.toFixed(1)} ml/kg) is very high! Risk of lung injury. Target: ${VENT_CONSTANTS.LUNG_PROTECTIVE_TV_MIN}-${VENT_CONSTANTS.LUNG_PROTECTIVE_TV_MAX} ml/kg`)
        });

        if (ventMode === 'AC-VC' || ventMode === 'SIMV') {
            recommendations.push({
                level: 'suggestion',
                message: L(`کاهش TV به ${targetTV.toFixed(0)} mL (حدود ${VENT_CONSTANTS.LUNG_PROTECTIVE_TV_MAX} ml/kg) توصیه می‌شود.`, `Reduce TV to ${targetTV.toFixed(0)} mL (about ${VENT_CONSTANTS.LUNG_PROTECTIVE_TV_MAX} ml/kg) is recommended.`)
            });
        } else if (ventMode === 'AC-PC' || ventMode === 'PSV') {
            recommendations.push({
                level: 'suggestion',
                message: L(`کاهش فشار دمی (P.Insp/PS) برای رسیدن به حجم جاری ${targetTV.toFixed(0)} mL توصیه می‌شود.`, `Reduce inspiratory pressure (P.Insp/PS) to reach a tidal volume of ${targetTV.toFixed(0)} mL is recommended.`)
            });
        }

    } else if (tvPerKg > VENT_CONSTANTS.LUNG_PROTECTIVE_TV_MAX) { // > 6 ml/kg
        recommendations.push({
            level: 'warning',
            message: L(`⚠️ حجم جاری (${tvPerKg.toFixed(1)} ml/kg) کمی بالاست. هدف: ${VENT_CONSTANTS.LUNG_PROTECTIVE_TV_MIN}-${VENT_CONSTANTS.LUNG_PROTECTIVE_TV_MAX} ml/kg`, `⚠️ Tidal volume (${tvPerKg.toFixed(1)} ml/kg) is slightly high. Target: ${VENT_CONSTANTS.LUNG_PROTECTIVE_TV_MIN}-${VENT_CONSTANTS.LUNG_PROTECTIVE_TV_MAX} ml/kg`)
        });

        if (ventMode === 'AC-VC' || ventMode === 'SIMV') {
            recommendations.push({
                level: 'suggestion',
                message: L(`کاهش TV به ${targetTV.toFixed(0)} mL (حدود ${VENT_CONSTANTS.LUNG_PROTECTIVE_TV_MAX} ml/kg) توصیه می‌شود.`, `Reduce TV to ${targetTV.toFixed(0)} mL (about ${VENT_CONSTANTS.LUNG_PROTECTIVE_TV_MAX} ml/kg) is recommended.`)
            });
        } else if (ventMode === 'AC-PC' || ventMode === 'PSV') {
            recommendations.push({
                level: 'suggestion',
                message: L(`کاهش فشار دمی (P.Insp/PS) در نظر گرفته شود.`, `Consider reducing inspiratory pressure (P.Insp/PS).`)
            });
        }

    } else if (tvPerKg >= VENT_CONSTANTS.LUNG_PROTECTIVE_TV_MIN && tvPerKg <= VENT_CONSTANTS.LUNG_PROTECTIVE_TV_MAX) { // 4-6 ml/kg
        recommendations.push({
            level: 'success',
            message: L(`✅ حجم جاری (${tvPerKg.toFixed(1)} ml/kg) در محدوده محافظتی ریه است. (TV: ${tv.toFixed(0)} mL)`, `✅ Tidal volume (${tvPerKg.toFixed(1)} ml/kg) is within the lung-protective range. (TV: ${tv.toFixed(0)} mL)`)
        });
    } else if (tvPerKg < VENT_CONSTANTS.MIN_TV_PER_KG) { // < 4 ml/kg
        recommendations.push({
            level: 'warning',
            message: L(`⚠️ حجم جاری (${tvPerKg.toFixed(1)} ml/kg) بسیار پایین است. افزایش تهویه در نظر گرفته شود.`, `⚠️ Tidal volume (${tvPerKg.toFixed(1)} ml/kg) is very low. Consider increasing ventilation.`)
        });
    }

    return recommendations;
}

/**
 * ارزیابی وضعیت اکسیژناسیون
 */
function assessOxygenation(pao2, spo2, fio2, peep, ventMode) {
    const VENT_CONSTANTS = window.VENT_CONSTANTS;
    const recommendations = [];

    if (pao2 === null && spo2 === null) return recommendations;

    const pfRatio = pao2 && fio2 ? calculatePFRatio(pao2, fio2) : null;

    // 1. ارزیابی هیپوکسمی
    const isHypoxemic = (pao2 !== null && pao2 < VENT_CONSTANTS.PAO2_CRITICAL_LOW) ||
                        (spo2 !== null && spo2 < VENT_CONSTANTS.SPO2_CRITICAL_LOW);

    if (isHypoxemic) {
        recommendations.push({
            level: 'urgent',
            message: L(`🛑 هیپوکسمی شدید! هدف PaO₂: 60-100 یا SpO₂: 90-95%`, `🛑 Severe hypoxemia! Target PaO₂: 60-100 or SpO₂: 90-95%`)
        });

        // پیشنهادات برای اصلاح هیپوکسمی
        if (fio2 !== null && fio2 < 60) {
            const newFio2 = Math.min(100, fio2 + 10);
            recommendations.push({
                level: 'suggestion',
                message: L(`افزایش FiO₂ به ${newFio2}%`, `Increase FiO₂ to ${newFio2}%`)
            });
        } else if (peep !== null && peep < VENT_CONSTANTS.MAX_PEEP_SAFE) {
            const newPeep = Math.min(VENT_CONSTANTS.MAX_PEEP_SAFE, peep + 2);
            recommendations.push({
                level: 'suggestion',
                message: L(`افزایش PEEP به ${newPeep} cmH₂O`, `Increase PEEP to ${newPeep} cmH₂O`)
            });
        } else if (fio2 !== null && fio2 < 100) {
            recommendations.push({
                 level: 'suggestion',
                 message: L('اگر FiO₂ < 100 است، افزایش آن به ۱۰۰٪ در نظر گرفته شود.', 'If FiO₂ < 100, consider increasing it to 100%.')
            });
        }
    }

    // 2. ارزیابی P/F Ratio برای ARDS
    if (pfRatio) {
        if (pfRatio < VENT_CONSTANTS.PF_RATIO_ARDS_SEVERE) { // < 100
            recommendations.push({
                level: 'urgent',
                message: L(`🛑 ARDS شدید! P/F Ratio: ${pfRatio.toFixed(0)}. اجرای کامل پروتکل ARDSNet.`, `🛑 Severe ARDS! P/F Ratio: ${pfRatio.toFixed(0)}. Apply the full ARDSNet protocol.`)
            });
        } else if (pfRatio < VENT_CONSTANTS.PF_RATIO_ARDS_MODERATE) { // < 200
            recommendations.push({
                level: 'warning',
                message: L(`⚠️ ARDS متوسط! P/F Ratio: ${pfRatio.toFixed(0)}. اجرای پروتکل ARDSNet.`, `⚠️ Moderate ARDS! P/F Ratio: ${pfRatio.toFixed(0)}. Apply the ARDSNet protocol.`)
            });
        }
    }

    // 3. ارزیابی FiO₂ بالا و هایپراکسی
    if (fio2 !== null && fio2 > VENT_CONSTANTS.FIO2_DANGER_THRESHOLD) { // > 80
        recommendations.push({
            level: 'warning',
            message: L(`⚠️ FiO₂ بسیار بالا (${fio2}%). خطر سمیت اکسیژن و جذب آتلکتازی.`, `⚠️ FiO₂ is very high (${fio2}%). Risk of oxygen toxicity and absorption atelectasis.`)
        });
    } else if (fio2 !== null && fio2 > VENT_CONSTANTS.FIO2_TOXIC_THRESHOLD) { // > 60
        recommendations.push({
            level: 'info',
            message: L(`ℹ️ FiO₂ بالا (${fio2}%). هدف: کاهش زیر ۶۰٪ در صورت امکان.`, `ℹ️ FiO₂ is high (${fio2}%). Target: reduce below 60% if possible.`)
        });
    }

    // اگر اکسیژناسیون خوب است (PaO2 نرمال/بالا و SpO2 نرمال)، کاهش FiO₂ پیشنهاد شود
    if (pao2 !== null && pao2 > 90 && spo2 !== null && spo2 > 95 && fio2 !== null && fio2 > 21) {
        const newFio2 = Math.max(21, fio2 - 5);
        if(fio2 > 30) {
             recommendations.push({
                level: 'suggestion',
                message: L(`اکسیژناسیون عالی است. کاهش FiO₂ به ${newFio2}%`, `Oxygenation is excellent. Reduce FiO₂ to ${newFio2}%`)
            });
        } else if (fio2 > 21 && fio2 <= 30) {
             recommendations.push({
                 level: 'suggestion',
                 message: L(`اکسیژناسیون عالی است. کاهش FiO₂ به ${newFio2}% برای رسیدن به ۲۱٪`, `Oxygenation is excellent. Reduce FiO₂ to ${newFio2}% toward 21%`)
             });
        }
    }

    return recommendations;
}

/**
 * ارزیابی وضعیت تهویه (CO₂) و پیشنهادات تنظیم
 */
function assessVentilation(ph, paco2, ventMode, rate, pressureSetting, tv, pbw, primaryDisorder) {
    const VENT_CONSTANTS = window.VENT_CONSTANTS;
    const recommendations = [];

    if (ph === null || paco2 === null) return recommendations;

    const isSevereAcidemia = ph < VENT_CONSTANTS.PH_CRITICAL_LOW; // < 7.20
    const isSevereAlkalemia = ph > VENT_CONSTANTS.PH_CRITICAL_HIGH; // > 7.60
    const isRespiratoryAcidosis = paco2 > 45; // برای هر دو ABG/VBG تقریبا یکسان است
    const isRespiratoryAlkalosis = paco2 < 35; // برای هر دو ABG/VBG تقریبا یکسان است

    let hasAdjustedRate = false;
    let hasAdjustedPressure = false;
    let hasAdjustedTV = false;

    // 1. اسیدوز تنفسی (Hypercapnia) - نیاز به افزایش تهویه
    if (isRespiratoryAcidosis || isSevereAcidemia) {
        if (isSevereAcidemia) {
            recommendations.push({
                level: 'urgent',
                message: L(`🛑 اسیدمی شدید! pH: ${ph.toFixed(2)}. هدف: حفظ pH > 7.20`, `🛑 Severe acidemia! pH: ${ph.toFixed(2)}. Target: keep pH > 7.20`)
            });
        } else if (paco2 > 55) {
             recommendations.push({
                level: 'warning',
                message: L(`⚠️ هایپرکاپنی قابل توجه (PaCO₂: ${paco2} mmHg).`, `⚠️ Significant hypercapnia (PaCO₂: ${paco2} mmHg).`)
            });
        } else if (paco2 > 45) {
             recommendations.push({
                level: 'info',
                message: L(`ℹ️ هایپرکاپنی خفیف (PaCO₂: ${paco2} mmHg).`, `ℹ️ Mild hypercapnia (PaCO₂: ${paco2} mmHg).`)
            });
        }

        // 🛑 پیشنهادات افزایش تهویه
        if (ventMode !== 'CPAP') {
            // A. افزایش Rate
            if (rate !== null && rate < VENT_CONSTANTS.RR_MAX_ACCEPTABLE) { // < 35
                const newRate = Math.min(VENT_CONSTANTS.RR_MAX_ACCEPTABLE, rate + 2);
                recommendations.push({
                    level: 'suggestion',
                    message: L(`افزایش Rate به ${newRate} bpm برای کاهش PaCO₂`, `Increase rate to ${newRate} bpm to lower PaCO₂`)
                });
                hasAdjustedRate = true;
            }

            // B. افزایش Volume/Pressure
            if (!hasAdjustedRate) {
                if ((ventMode === 'AC-VC' || ventMode === 'SIMV') && tv !== null && pbw !== null) {
                    const tvPerKg = tv / pbw;
                    if (tvPerKg < VENT_CONSTANTS.LUNG_PROTECTIVE_TV_MAX) { // < 6 ml/kg
                        const newTV = Math.min(pbw * VENT_CONSTANTS.LUNG_PROTECTIVE_TV_MAX, tv + 50);
                         recommendations.push({
                            level: 'suggestion',
                            message: L(`افزایش TV به ${newTV.toFixed(0)} mL (تا سقف محافظتی ریه)`, `Increase TV to ${newTV.toFixed(0)} mL (up to the lung-protective limit)`)
                        });
                        hasAdjustedTV = true;
                    }
                } else if ((ventMode === 'AC-PC' || ventMode === 'PSV') && pressureSetting !== null && pressureSetting < 40) {
                    const increaseAmount = ventMode === 'PSV' ? 2 : 1; // PSV بیشتر از PC
                    const newPressure = pressureSetting + increaseAmount;
                    recommendations.push({
                        level: 'suggestion',
                        message: L(`افزایش P.Insp/PS به ${newPressure} cmH₂O برای افزایش تهویه`, `Increase P.Insp/PS to ${newPressure} cmH₂O to raise ventilation`)
                    });
                    hasAdjustedPressure = true;
                }
            }
        }

        // Permissive Hypercapnia
        if (ph >= 7.20 && ph < 7.35 && isRespiratoryAcidosis && !isSevereAcidemia &&
            (primaryDisorder.includes("اسیدوز تنفسی مزمن") || primaryDisorder.includes("ARDS"))) {
            recommendations.push({
                level: 'info',
                message: L(`ℹ️ حفظ PaCO₂ در محدوده بالا (Permissive Hypercapnia) برای حفاظت از ریه قابل قبول است. (pH: ${ph.toFixed(2)} را پایش کنید)`, `ℹ️ Allowing a higher PaCO₂ (permissive hypercapnia) is acceptable for lung protection. (Monitor pH: ${ph.toFixed(2)})`)
            });
        }
    }

    // 2. آلکالوز تنفسی (Hypocapnia) - نیاز به کاهش تهویه
    if (isRespiratoryAlkalosis) {
        if (ph > VENT_CONSTANTS.PH_CRITICAL_HIGH) { // > 7.60
            recommendations.push({
                level: 'urgent',
                message: L(`🛑 آلکالمی شدید! pH: ${ph.toFixed(2)}. خطر آریتمی و تشنج.`, `🛑 Severe alkalemia! pH: ${ph.toFixed(2)}. Risk of arrhythmia and seizures.`)
            });
        } else {
            recommendations.push({
                level: 'warning',
                message: L(`⚠️ هایپوکاپنی (PaCO₂: ${paco2} mmHg).`, `⚠️ Hypocapnia (PaCO₂: ${paco2} mmHg).`)
            });
        }

        // 🛑 پیشنهادات کاهش تهویه
        if (ventMode !== 'CPAP') {
            // A. کاهش Rate (فقط اگر بیمار سدیشن باشد)
            if (rate !== null && rate > VENT_CONSTANTS.RR_NORMAL_LOW) { // > 10
                const newRate = Math.max(VENT_CONSTANTS.RR_NORMAL_LOW, rate - 2);
                recommendations.push({
                    level: 'suggestion',
                    message: L(`کاهش Rate به ${newRate} bpm برای افزایش PaCO₂`, `Decrease rate to ${newRate} bpm to raise PaCO₂`)
                });
                hasAdjustedRate = true;
            }

            // B. کاهش Volume/Pressure
            if (!hasAdjustedRate) {
                if ((ventMode === 'AC-VC' || ventMode === 'SIMV') && tv !== null) {
                    const newTV = tv - 50;
                    if (newTV >= pbw * VENT_CONSTANTS.MIN_TV_PER_KG) { // > 4 ml/kg
                        recommendations.push({
                            level: 'suggestion',
                            message: L(`کاهش TV به ${newTV.toFixed(0)} mL`, `Decrease TV to ${newTV.toFixed(0)} mL`)
                        });
                        hasAdjustedTV = true;
                    }
                } else if ((ventMode === 'AC-PC' || ventMode === 'PSV') && pressureSetting !== null && pressureSetting > 5) {
                    const newPressure = pressureSetting - 2;
                    recommendations.push({
                        level: 'suggestion',
                        message: L(`کاهش P.Insp/PS به ${newPressure} cmH₂O`, `Decrease P.Insp/PS to ${newPressure} cmH₂O`)
                    });
                    hasAdjustedPressure = true;
                }
            }
        }
    }

    // 3. در صورت نرمال بودن (pH نرمال) و تهویه بیش از حد/کم
    if (!isRespiratoryAcidosis && !isRespiratoryAlkalosis && !isSevereAcidemia && !isSevereAlkalemia) {
        if (rate !== null && rate > VENT_CONSTANTS.RR_NORMAL_HIGH) { // > 20
            recommendations.push({
                level: 'info',
                message: L(`ℹ️ Rate (${rate} bpm) نسبتاً بالا است. اگر تهویه بیش از حد نیست، پایش کنید.`, `ℹ️ Rate (${rate} bpm) is relatively high. If not over-ventilating, monitor closely.`)
            });
        }
    }

    // 4. ارزیابی فشارهای پایین
    if (paco2 < 35 && ventMode === 'PSV') {
         recommendations.push({
             level: 'info',
             message: L('ℹ️ در PSV، اگر PaCO₂ پایین است، ممکن است نشان‌دهنده افزایش تلاش تنفسی بیمار باشد. سدیشن و کاهش PS را در نظر بگیرید.', 'ℹ️ In PSV, a low PaCO₂ may indicate increased patient respiratory effort. Consider sedation and reducing PS.')
         });
    }


    return recommendations;
}

/**
 * تابع اصلی برای پیشنهاد تنظیمات ونتیلاتور
 */
function getVentilatorRecommendations(primaryDisorder, abgData, ventData) {
    const { ph, paco2, pao2, spo2 } = abgData || {};
    const {
        tv, rate, peep, ventMode, pplat, pressureSetting, measuredVt,
        height, gender, ventFio2
    } = ventData || {};

    // 🛑 چک ایمنی اصلاح شده: جلوگیری از اجرای منطق با داده‌های اصلی ناقص
    if (ph === null || paco2 === null || !ventMode) {
        return {
            suggestedSettings: {},
            recommendations: [{
                type: "urgent",
                title: L("🛑 داده‌های ناقص", "🛑 Incomplete data"),
                text: L("برای تحلیل کامل ونتیلاتور، PH، PaCO₂ و مود ونتیلاتور باید وارد شوند.", "For a full ventilator analysis, pH, PaCO₂ and ventilator mode must be entered.")
            }],
            derivedData: {}
        };
    }

    const recommendations = [];
    const derivedData = {};

    // 🛑 مقادیر پیش‌فرض برای پیشنهادات (شروع از مقادیر فعلی)
    const suggestedSettings = {
        rate: rate,
        peep: peep,
        fio2: ventFio2,
        tv: tv,
        pressureSetting: pressureSetting,
        ventMode: ventMode
    };

    // محاسبات مشتقه
    derivedData.pbw = calculatePBW(height, gender);

    let currentTV = null;
    if (ventMode === 'AC-VC' || ventMode === 'SIMV') {
        currentTV = tv;
    } else if (ventMode === 'AC-PC' || ventMode === 'PSV') {
        currentTV = measuredVt;
    }

    if (derivedData.pbw !== null && derivedData.pbw > 0 && currentTV !== null) {
        derivedData.vtPerKg = currentTV / derivedData.pbw;
    }

    if (pao2 !== null && ventFio2 !== null && ventFio2 > 0) {
        derivedData.pfRatio = calculatePFRatio(pao2, ventFio2);
    }

    // 🛑 محاسبه Driving Pressure: از Pplat برای VC و از P.Insp برای PC استفاده می‌کنیم.
    let currentDrivingPressure = null;
    if ((ventMode === 'AC-VC' || ventMode === 'SIMV') && pplat !== null && peep !== null) {
        currentDrivingPressure = calculateDrivingPressure(pplat, peep);
    } else if ((ventMode === 'AC-PC' || ventMode === 'PSV') && pressureSetting !== null && peep !== null) {
        currentDrivingPressure = calculateDrivingPressure(pressureSetting, peep);
    }
    derivedData.drivingPressure = currentDrivingPressure;

    // 1. ارزیابی ریسک فشاری (Barotrauma)
    const barotraumaRisks = assessBarotraumaRisk(pplat, peep, currentDrivingPressure);
    barotraumaRisks.forEach(risk => {
        recommendations.push({
            type: risk.level === 'urgent' ? 'urgent' : 'warning',
            title: risk.level === 'urgent' ? L('خطر باراکوتروما', 'Barotrauma risk') : L('هشدار فشار', 'Pressure warning'),
            text: risk.message
        });
    });

    // 2. ارزیابی استراتژی محافظت از ریه
    const lungProtectionRecs = assessLungProtectiveStrategy(currentTV, derivedData.pbw, ventMode);
    lungProtectionRecs.forEach(rec => {
        recommendations.push({
            type: rec.level === 'urgent' ? 'urgent' :
                   rec.level === 'warning' ? 'warning' :
                   rec.level === 'suggestion' ? 'info' : 'success',
            title: rec.level === 'success' ? L('استراتژی محافظتی', 'Protective strategy') : L('حجم جاری', 'Tidal volume'),
            text: rec.message
        });

        // 🛑 به روزرسانی تنظیمات پیشنهادی TV
        if (rec.level === 'suggestion' && (rec.message.includes('کاهش TV به') || rec.message.includes('Reduce TV to'))) {
            const match = rec.message.match(/(?:کاهش TV به|Reduce TV to) (\d+) mL/);
            if (match) {
                suggestedSettings.tv = parseInt(match[1]);
            }
        }
    });

    // 3. ارزیابی اکسیژناسیون (FiO₂, PEEP)
    const oxygenationRecs = assessOxygenation(pao2, spo2, ventFio2, peep, ventMode);
    oxygenationRecs.forEach(rec => {
        recommendations.push({
            type: rec.level === 'urgent' ? 'urgent' :
                   rec.level === 'warning' ? 'warning' :
                   rec.level === 'suggestion' ? 'info' : 'info',
            title: L('اکسیژناسیون', 'Oxygenation'),
            text: rec.message
        });

        // 🛑 به روزرسانی تنظیمات پیشنهادی FiO₂ و PEEP
        if (rec.level === 'suggestion') {
            if (rec.message.includes('افزایش FiO₂ به') || rec.message.includes('Increase FiO₂ to')) {
                const match = rec.message.match(/(?:افزایش FiO₂ به|Increase FiO₂ to) (\d+)%/);
                if (match) {
                    suggestedSettings.fio2 = parseInt(match[1]);
                }
            } else if (rec.message.includes('کاهش FiO₂ به') || rec.message.includes('Reduce FiO₂ to')) {
                const match = rec.message.match(/(?:کاهش FiO₂ به|Reduce FiO₂ to) (\d+)%/);
                if (match) {
                    suggestedSettings.fio2 = parseInt(match[1]);
                }
            } else if (rec.message.includes('افزایش PEEP به') || rec.message.includes('Increase PEEP to')) {
                const match = rec.message.match(/(?:افزایش PEEP به|Increase PEEP to) (\d+)/);
                if (match) {
                    suggestedSettings.peep = parseInt(match[1]);
                }
            }
        }
    });

    // 4. ارزیابی تهویه (Rate, Volume/Pressure)
    const ventilationRecs = assessVentilation(ph, paco2, ventMode, rate, pressureSetting, currentTV, derivedData.pbw, primaryDisorder);
    ventilationRecs.forEach(rec => {
        recommendations.push({
            type: rec.level === 'urgent' ? 'urgent' :
                   rec.level === 'warning' ? 'warning' :
                   rec.level === 'suggestion' ? 'info' : 'info',
            title: L('تهویه', 'Ventilation'),
            text: rec.message
        });

        // 🛑 به روزرسانی تنظیمات پیشنهادی Rate، TV و P.Insp/PS
        if (rec.level === 'suggestion') {
            if (rec.message.includes('افزایش Rate به') || rec.message.includes('Increase rate to')) {
                const match = rec.message.match(/(?:افزایش Rate به|Increase rate to) (\d+)/);
                if (match) {
                    suggestedSettings.rate = parseInt(match[1]);
                }
            } else if (rec.message.includes('کاهش Rate به') || rec.message.includes('Decrease rate to')) {
                const match = rec.message.match(/(?:کاهش Rate به|Decrease rate to) (\d+)/);
                if (match) {
                    suggestedSettings.rate = parseInt(match[1]);
                }
            } else if (rec.message.includes('افزایش TV به') || rec.message.includes('Increase TV to')) {
                const match = rec.message.match(/(?:افزایش TV به|Increase TV to) (\d+)/);
                if (match) {
                    suggestedSettings.tv = parseInt(match[1]);
                }
            } else if (rec.message.includes('کاهش TV به') || rec.message.includes('Decrease TV to')) {
                const match = rec.message.match(/(?:کاهش TV به|Decrease TV to) (\d+)/);
                if (match) {
                    suggestedSettings.tv = parseInt(match[1]);
                }
            } else if (rec.message.includes('افزایش P.Insp/PS به') || rec.message.includes('Increase P.Insp/PS to')) {
                const match = rec.message.match(/(?:افزایش P\.Insp\/PS به|Increase P\.Insp\/PS to) (\d+)/);
                if (match) {
                    suggestedSettings.pressureSetting = parseInt(match[1]);
                }
            } else if (rec.message.includes('کاهش P.Insp/PS به') || rec.message.includes('Decrease P.Insp/PS to')) {
                const match = rec.message.match(/(?:کاهش P\.Insp\/PS به|Decrease P\.Insp\/PS to) (\d+)/);
                if (match) {
                    suggestedSettings.pressureSetting = parseInt(match[1]);
                }
            }
        }
    });

    // 5. پایش نهایی
    const urgentCount = recommendations.filter(r => r.type === 'urgent').length;
    const warningCount = recommendations.filter(r => r.type === 'warning').length;

    if (urgentCount === 0 && warningCount === 0 && ventilationRecs.length === 0 && oxygenationRecs.length === 0) {
        recommendations.push({
            type: 'success',
            title: L('وضعیت پایدار', 'Stable status'),
            text: L(`تنظیمات ونتیلاتور (${ventMode}) مناسب به نظر می‌رسد. پایش‌های معمول را ادامه دهید.`, `Ventilator settings (${ventMode}) appear appropriate. Continue routine monitoring.`)
        });
    } else {
         recommendations.push({
             type: 'info',
             title: L('اولویت اقدام', 'Action priority'),
             text: L(`اولویت با توصیه‌های اضطراری/هشداراست. پس از هر تغییر تنظیمات، ABG را ۲۰-۳۰ دقیقه بعد تکرار کنید و فشارهای راه هوایی را پایش نمایید.`, `Prioritize urgent/warning recommendations. After each settings change, repeat the ABG in 20-30 minutes and monitor airway pressures.`)
         });
    }


    return { suggestedSettings, recommendations, derivedData };
}

// ===== END: VENTILATOR LOGIC - اصلاح‌شده نهایی =====