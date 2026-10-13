// ===== START: renderer.js (توابع رندرینگ UI) - اصلاح‌شده نهایی =====

/**
 * رندرینگ بخش تحلیل جبران
 * @param {object} analysis - شامل parameter, actual, expected, unit
 * @returns {string} HTML
 */
function renderCompensationAnalysisHtml(analysis) {
    if (!analysis || !analysis.parameter) return '';
    return `<div class="result-section"><h4><i class="fas fa-check-double"></i> ${L("تحلیل جبران","Compensation analysis")}</h4><ul class="parameter-list"><li class="parameter-item"><span class="parameter-name">${L("مقدار "+analysis.parameter+" مورد انتظار", "Expected "+analysis.parameter)}</span><span class="parameter-value">${analysis.expected} <small>${analysis.unit}</small></span></li><li class="parameter-item"><span class="parameter-name">${L("مقدار "+analysis.parameter+" بیمار", "Patient "+analysis.parameter)}</span><span class="parameter-value">${analysis.actual} <small>${analysis.unit}</small></span></li></ul><div class="interpretation-text">${L("مقدار اندازه‌گیری شده با مقدار مورد انتظار برای جبران مقایسه شده است.","The measured value is compared with the expected value for compensation.")}</div></div>`;
}

/**
 * رندرینگ بخش پیشنهادات ونتیلاتور (با حل مشکل نمایش Suggested Value)
 * @param {boolean} isOnVentilator
 * @param {object} interpretation - شامل primaryDisorder
 * @param {object} data - شامل ورودی‌های خام ABG و ونتیلاتور
 * @returns {string} HTML
 */
function renderVentilatorRecommendationsHtml(isOnVentilator, interpretation, data) {
    // 🛑 وابستگی به تابع بیرونی: getVentilatorRecommendations
    if (!isOnVentilator || !data.ventMode) return '';

    if (typeof getVentilatorRecommendations === 'undefined') {
        return `<div class="result-section"><h4><i class="fas fa-fan"></i> ${L("پیشنهادات ونتیلاتور","Ventilator recommendations")}</h4><div class="interpretation-text" style="border-right-color: var(--danger-color);">${L("خطا: تابع منطق ونتیلاتور (از ventilator.js) تعریف نشده است.","Error: ventilator logic function (from ventilator.js) is not defined.")}</div></div>`;
    }

    const renderChangeIndicator = (current, suggested) => {
        // اگر نوع مود تغییر کرده، تغییر بزرگ است
        if (current.toString().trim().toUpperCase() !== suggested.toString().trim().toUpperCase() && isNaN(parseFloat(current))) {
             return `<i class="fas fa-exchange-alt blue-text"></i> ${L("تغییر مود","Mode change")}`;
        }

        if (typeof current !== 'number' || !isFinite(current)) current = null;
        if (typeof suggested !== 'number' || !isFinite(suggested)) suggested = null;

        if (current === null || suggested === null || Math.abs(suggested - current) < 0.5) return `<span class="blue-text">${L('بدون تغییر','No change')}</span>`;

        const difference = suggested - current;
        if (difference > 0) return `<i class="fas fa-arrow-up green-text"></i> ${L("افزایش","Increase")}`;
        if (difference < 0) return `<i class="fas fa-arrow-down red-text"></i> ${L("کاهش","Decrease")}`;
        return L('بدون تغییر','No change');
    };

    const abgData = {
        ph: data.ph || null,
        paco2: data.paco2 || null,
        pao2: data.pao2 || null,
        spo2: data.spo2 || null
    };

    const ventData = {
        tv: data.tv || null,
        rate: data.rate || null,
        peep: data.peep || null,
        ventMode: data.ventMode || null,
        pplat: data.pplat || null,
        pressureSetting: data.pressureSetting || null,
        measuredVt: data.measuredVt || null,
        height: data.height || null,
        gender: data.gender || null,
        ventFio2: data.ventFio2 || 21
    };

    try {
        // فراخوانی منطق ونتیلاتور
        const result = getVentilatorRecommendations(
            interpretation.primaryDisorder || '',
            abgData,
            ventData
        );

        const ventRecommendations = result.recommendations || [];
        const suggestedSettings = result.suggestedSettings || {};
        const derivedData = result.derivedData || {};

        // 🆕 تنظیم نام نمایش Pressure Setting
        const isPressureMode = data.ventMode === 'AC-PC' || data.ventMode === 'PSV';
        const pressureName = data.ventMode === 'AC-PC' ? 'P.Insp' : (data.ventMode === 'PSV' ? 'Pressure Support' : 'P.Insp/PS');


        const ventParameters = [
            { name: 'Mode', current: data.ventMode, suggestedKey: 'ventMode', unit: '', isNumeric: false },
            { name: 'Rate (RR)', current: data.rate, suggestedKey: 'rate', unit: 'bpm', decimals: 0, show: data.ventMode !== 'CPAP' && data.ventMode !== 'PSV' && data.rate !== null },
            { name: 'TV (Set)', current: data.tv, suggestedKey: 'tv', unit: 'mL', decimals: 0, show: (data.ventMode === 'AC-VC' || data.ventMode === 'SIMV') && data.tv !== null },
            // 🛑 نمایش PressureSetting
            { name: pressureName, current: data.pressureSetting, suggestedKey: 'pressureSetting', unit: 'cmH₂O', decimals: 0, show: isPressureMode && data.pressureSetting !== null },
            { name: 'PEEP', current: data.peep, suggestedKey: 'peep', unit: 'cmH₂O', decimals: 0, show: data.peep !== null },
            { name: 'FiO₂', current: data.ventFio2, suggestedKey: 'fio2', unit: '%', decimals: 0, show: data.ventFio2 !== null },
            // مقادیر پایش (Pplat, Measured VT) پیشنهادی ندارند، همیشه مقدار فعلی هستند
            { name: 'P.Plateau', current: data.pplat, suggestedKey: 'pplat', unit: 'cmH₂O', decimals: 0, show: data.pplat !== null && (data.ventMode === 'AC-VC' || data.ventMode === 'SIMV') },
            { name: 'Measured VT', current: data.measuredVt, suggestedKey: 'measuredVt', unit: 'mL', decimals: 0, show: data.measuredVt !== null && (data.ventMode === 'AC-PC' || data.ventMode === 'PSV') },
        ];

        const tableRows = ventParameters
            .filter(p => p.show !== false)
            .map(p => {
                const isNumeric = typeof p.current === 'number' && isFinite(p.current);
                const currentDisplay = isNumeric ? p.current.toFixed(p.decimals) : (p.current || '-');

                // 🛑 اصلاح مشکل: اطمینان از خواندن مقدار پیشنهادی از suggestedSettings
                let suggestedValue = suggestedSettings[p.suggestedKey] !== undefined ? suggestedSettings[p.suggestedKey] : p.current;

                // برای Pplat و Measured VT، مقدار پیشنهادی همان مقدار فعلی است (فقط برای پایش هستند).
                const isMonitoringParam = (p.name === 'P.Plateau' || p.name === 'Measured VT');
                if (isMonitoringParam) {
                    suggestedValue = p.current;
                }

                // 🛑 مدیریت حالت تغییر مود
                const isModeParam = p.name === 'Mode';
                let suggestedDisplay;
                let isSuggestedNumeric;

                if(isModeParam) {
                    suggestedDisplay = suggestedValue.toString();
                    isSuggestedNumeric = false;
                } else {
                    isSuggestedNumeric = typeof suggestedValue === 'number' && isFinite(suggestedValue);
                    suggestedDisplay = isSuggestedNumeric ? suggestedValue.toFixed(p.decimals) : (suggestedValue || '-');
                }

                const changeIndicator = isModeParam ? renderChangeIndicator(p.current, suggestedValue) :
                                      (isNumeric && isSuggestedNumeric ? renderChangeIndicator(p.current, suggestedValue) : 'نامشخص');

                const suggestedClass = (isSuggestedNumeric && isNumeric && Math.abs(suggestedValue - p.current) >= 0.5) ||
                                       (isModeParam && p.current.toString().trim().toUpperCase() !== suggestedValue.toString().trim().toUpperCase()) ? 'blue-text' : '';

                return `
                    <tr>
                        <td>${p.name}</td>
                        <td>${currentDisplay} <small>${p.unit}</small></td>
                        <td><span class="${suggestedClass}">${suggestedDisplay}</span> <small>${p.unit}</small></td>
                        <td>${changeIndicator}</td>
                    </tr>
                `;
            }).join('');

        let settingsTableHtml = `
            <div class="vent-settings-table">
                <table>
                    <thead>
                        <tr><th>${L("پارامتر","Parameter")}</th><th>${L("مقدار فعلی","Current")}</th><th>${L("مقدار پیشنهادی","Suggested")}</th><th>${L("تغییر","Change")}</th></tr>
                    </thead>
                    <tbody>
                        ${tableRows}
                    </tbody>
                </table>
            </div>
        `;

        let auxiliaryDataHtml = '';
        if (derivedData.pbw || derivedData.pfRatio || derivedData.vtPerKg || derivedData.drivingPressure) {
            auxiliaryDataHtml = `
                <div class="result-section">
                    <h4><i class="fas fa-calculator"></i> ${L("محاسبات ضروری","Key calculations")}</h4>
                    <ul class="parameter-list">
                        ${derivedData.pbw ? `<li class="parameter-item"><span class="parameter-name">${L("وزن ایده‌آل (PBW)","Predicted Body Weight (PBW)")}</span><span class="parameter-value">${derivedData.pbw.toFixed(1)} <small>kg</small></span></li>` : ''}
                        ${derivedData.vtPerKg ? `<li class="parameter-item"><span class="parameter-name">${L("حجم جاری / PBW","Tidal volume / PBW")}</span><span class="parameter-value ${derivedData.vtPerKg > 8 ? 'red-text' : (derivedData.vtPerKg >= 4 && derivedData.vtPerKg <= 6) ? 'green-text' : 'warning-text'}">${derivedData.vtPerKg.toFixed(1)} <small>ml/kg</small></span></li>` : ''}
                        ${derivedData.pfRatio ? `<li class="parameter-item"><span class="parameter-name">P/F Ratio (PaO₂/FiO₂)</span><span class="parameter-value ${derivedData.pfRatio < 150 ? 'red-text' : derivedData.pfRatio < 300 ? 'warning-text' : 'green-text'}">${derivedData.pfRatio.toFixed(0)}</span></li>` : ''}
                        ${derivedData.drivingPressure ? `<li class="parameter-item"><span class="parameter-name">${L("فشار محرکه (Driving Pressure)","Driving Pressure")}</span><span class="parameter-value ${derivedData.drivingPressure > 15 ? 'red-text' : 'green-text'}">${derivedData.drivingPressure.toFixed(1)} <small>cmH₂O</small></span></li>` : ''}
                    </ul>
                </div>
            `;
        }

        let recommendationListHtml = '';
        if (ventRecommendations.length > 0) {
            recommendationListHtml = ventRecommendations.map(rec => {
                let icon = 'fa-info-circle';
                if (rec.type === 'urgent') icon = 'fa-exclamation-circle';
                else if (rec.type === 'warning') icon = 'fa-exclamation-triangle';
                else if (rec.type === 'success') icon = 'fa-check-circle';

                return `<div class="vent-recommendation-item ${rec.type}"><div class="vent-recommendation-icon"><i class="fas ${icon}"></i></div><div><strong>${rec.title || L('توصیه','Recommendation')}:</strong> ${rec.text}</div></div>`;
            }).join('');
        } else {
            recommendationListHtml = `<div class="vent-recommendation-item info"><div class="vent-recommendation-icon"><i class="fas fa-info-circle"></i></div><div>${L("هیچ توصیه‌ای برای تنظیمات فعلی وجود ندارد.","No recommendations for the current settings.")}</div></div>`;
        }

        return `
            <div class="result-section vent-final-result-section">
                <h4><i class="fas fa-fan"></i> ${L("پیشنهادات تنظیم ونتیلاتور","Ventilator settings recommendations")} (${data.ventMode})</h4>
                ${auxiliaryDataHtml}
                ${settingsTableHtml}
                <div id="ventilator-content" class="vent-recommendation-list">
                    ${recommendationListHtml}
                </div>
            </div>
        `;

    } catch (error) {
        console.error('Error in ventilator recommendations:', error);
        return `
            <div class="result-section">
                <h4><i class="fas fa-fan"></i> ${L("پیشنهادات ونتیلاتور","Ventilator recommendations")}</h4>
                <div class="interpretation-text" style="border-right-color: var(--danger-color);">
                    ${L("خطا در تولید پیشنهادات:","Error generating recommendations:")} ${error.message}
                </div>
            </div>
        `;
    }
}

/**
 * رندرینگ بخش آنالیز متابولیک (AG/DG)
 * @param {object} interpretation - شامل ag, adjAg, agInterpretation, deltaGap, dgInterpretation
 * @returns {string} HTML
 */
function renderMetabolicAnalysisHtml(interpretation) {
    const METABOLIC_CONSTANTS = window.METABOLIC_CONSTANTS;
    const { ag, sodium, chloride, albumin, hco3, agInterpretation, dgInterpretation, deltaGap, adjAg } = interpretation;

    if (!sodium || !chloride || ag === null) return '';

    const agIndicator = adjAg > METABOLIC_CONSTANTS.AG_NORMAL_HIGH ? 'indicator-danger' : (adjAg < METABOLIC_CONSTANTS.AG_NORMAL_LOW ? 'indicator-warning' : 'indicator-normal');

    let html = `
        <div class="result-section">
            <h4><i class="fas fa-microscope"></i> ${L("آنالیز متابولیک (Anion Gap)","Metabolic analysis (Anion Gap)")}</h4>
            <ul class="parameter-list">
                <li class="parameter-item"><span class="parameter-name"><div class="visual-indicator ${agIndicator}"></div>Anion Gap (AG)</span><span class="parameter-value">${ag.toFixed(1)} <small>mEq/L</small></span></li>
                ${albumin !== null ? `<li class="parameter-item"><span class="parameter-name">${L("آلبومین (Alb)","Albumin (Alb)")}</span><span class="parameter-value">${albumin.toFixed(1)} <small>g/dL</small></span></li>` : ''}
                <li class="parameter-item"><span class="parameter-name">${L("AG اصلاح‌شده (Adj AG)","Corrected AG (Adj AG)")}</span><span class="parameter-value">${adjAg.toFixed(1)} <small>mEq/L</small></span></li>
                <li class="parameter-item"><span class="parameter-name">Na⁺</span><span class="parameter-value">${sodium} <small>mmol/L</small></span></li>
                <li class="parameter-item"><span class="parameter-name">Cl⁻</span><span class="parameter-value">${chloride} <small>mmol/L</small></span></li>
            </ul>
            <div class="interpretation-text" style="border-right-color: ${agIndicator === 'indicator-danger' ? 'var(--danger-color)' : 'var(--success-color)'};">
                ${agInterpretation}
            </div>`;

    if (interpretation.isMetabolicAcidosis && deltaGap !== null) {
         const dgColor = deltaGap > 1.2 || deltaGap < 0.8 ? 'var(--danger-color)' : 'var(--success-color)';
         html += `
             <ul class="parameter-list" style="margin-top: 1rem;">
                <li class="parameter-item"><span class="parameter-name">${L("نسبت دلتا (Delta Gap)","Delta ratio (Delta Gap)")}</span><span class="parameter-value">${deltaGap.toFixed(2)}</span></li>
            </ul>
            <div class="interpretation-text" style="border-right-color: ${dgColor};">
                ${dgInterpretation}
            </div>
         `;
    } else if(interpretation.isMetabolicAcidosis) {
        html += `<div class="interpretation-text" style="border-right-color: var(--info-color);">${L("توجه: تحلیل دلتا گپ برای اسیدوز متابولیک فعال انجام می‌شود.","Note: delta-gap analysis is performed for active metabolic acidosis.")}</div>`;
    }

    html += `</div>`;
    return html;
}

/**
 * رندرینگ بخش تفسیر HCO3 / BE
 * @param {object} data - شامل hco3, beInterpretation, normalRanges, isMetabolicAcidosis, isMetabolicAlkalosis
 * @returns {string} HTML
 */
function renderHco3BeInterpretationHtml(data) {
    const { hco3, beInterpretation, normalRanges, isMetabolicAcidosis, isMetabolicAlkalosis } = data;
    const hco3_low = normalRanges.hco3_low;
    const hco3_high = normalRanges.hco3_high;

    let hco3Interpretation = "";
    let hco3Color = 'var(--success-color)';

    if (hco3 < hco3_low) {
        hco3Interpretation = L(`HCO₃⁻ پایین (${hco3} mmol/L) نشان‌دهنده اسیدوز متابولیک (کمبود بافر) است.`, `HCO₃⁻ is low (${hco3} mmol/L), indicating metabolic acidosis (buffer deficit).`);
        hco3Color = 'var(--danger-color)';
    } else if (hco3 > hco3_high) {
        hco3Interpretation = L(`HCO₃⁻ بالا (${hco3} mmol/L) نشان‌دهنده آلکالوز متابولیک (بیش از حد بافر) است.`, `HCO₃⁻ is high (${hco3} mmol/L), indicating metabolic alkalosis (buffer excess).`);
        hco3Color = 'var(--warning-color)';
    } else {
        hco3Interpretation = L(`HCO₃⁻ نرمال (${hco3} mmol/L) است.`, `HCO₃⁻ is normal (${hco3} mmol/L).`);
    }

    let html = '';

    // اگر اختلال متابولیک اولیه داریم، BE و HCO3 را مقایسه و تفسیر می‌کنیم.
    if (isMetabolicAcidosis || isMetabolicAlkalosis) {
        html += `
            <div class="result-section">
                <h4><i class="fas fa-flask"></i> ${L("تفسیر بیز و بیکربنات","Base excess & bicarbonate interpretation")}</h4>
                <div class="interpretation-text" style="border-right-color: ${hco3Color}; margin-bottom: 0.8rem;">
                    <strong>HCO₃⁻:</strong> ${hco3Interpretation}
                </div>
                ${beInterpretation ? `
                <div class="interpretation-text" style="border-right-color: ${(beInterpretation.includes('نرمال') || beInterpretation.includes('normal') || beInterpretation.includes('Base Excess is normal')) ? 'var(--info-color)' : 'var(--danger-color)'};">
                    <strong>Base Excess:</strong> ${beInterpretation}
                </div>` : ''}
            </div>
        `;
    }

    return html;
}
// ===== END: renderer.js - اصلاح‌شده نهایی =====