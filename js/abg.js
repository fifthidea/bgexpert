// ===== START: abg.js (فایل نهایی - با اعتبارسنجی و منطق ABG/VBG و بهینه‌سازی Debounce) =====
// 🛑 ثابت‌ها از window.CONSTANTS خوانده می‌شوند

const TRANSLATIONS = {
    'اسیدوز متابولیک': 'Metabolic Acidosis',
    'آلکالوز متابولیک': 'Metabolic Alkalosis',
    'اسیدوز تنفسی': 'Respiratory Acidosis',
    'آلکالوز تنفسی': 'Respiratory Alkalosis',
    'اسیدوز تنفسی حاد': 'Acute Respiratory Acidosis',
    'اسیدوز تنفسی مزمن': 'Chronic Respiratory Acidosis',
    'آلکالوز تنفسی حاد': 'Acute Respiratory Alkalosis',
    'آلکالوز تنفسی مزمن': 'Chronic Respiratory Alkalosis',
    'اسیدوز متابولیک و تنفسی مختلط': 'Mixed Metabolic and Respiratory Acidosis',
    'آلکالوز متابولیک و تنفسی مختلط': 'Mixed Metabolic and Respiratory Alkalosis',
    'اسیدوز تنفسی و آلکالوز متابولیک (مختلط)': 'Mixed Respiratory Acidosis and Metabolic Alkalosis',
    'آلکالوز تنفسی و اسیدوز متابولیک (مختلط)': 'Mixed Respiratory Alkalosis and Metabolic Acidosis',
    'وضعیت نرمال اسید-باز': 'Normal Acid-Base Status',
    'با جبران کامل': 'with Full Compensation',
    'با جبران ناقص': 'with Partial Compensation',
    'با جبران نامناسب': 'with Inappropriate Compensation',
};

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

const debouncedValidateInputs = debounce(() => {
    validateInputs();
}, 300);

// انتخاب نوع نمونه از صفحه شروع (شریانی/وریدی) - منطق مشترک کلیک و لمس
function handleSampleSelection(sampleType) {
    if (!sampleType) return;

    // مسدودسازی ورود ABG برای کاربر رایگان و نمایش مودال خرید
    if (sampleType === 'abg' && window.isPremiumUser === false) {
        const modal = document.getElementById('purchaseModal');
        if (modal) {
            modal.style.display = 'flex';
            modal.style.opacity = '1';
            modal.style.visibility = 'visible';
            modal.style.pointerEvents = 'auto';
        }
        return;
    }

    document.querySelectorAll('#sample-type-group-splash .radio-card-group')
        .forEach(g => g.classList.remove('selected'));
    const chosen = document.querySelector('#sample-type-group-splash .radio-card-group[data-type="' + sampleType + '"]');
    if (chosen) chosen.classList.add('selected');

    setTimeout(function () {
        if (typeof window.initializeApp === 'function') window.initializeApp(sampleType);
    }, 180);
}

// Event delegation روی document: مقاوم در برابر زمان‌بندی بارگذاری و پایدار در WebView اندروید.
// چه کلیک/لمس روی خود کارت باشد چه روی آیکون یا متن داخل آن، درست تشخیص داده می‌شود.
function onSampleAreaActivate(e) {
    const target = e.target;
    if (!target || !target.closest) return;
    const card = target.closest('#sample-type-group-splash .radio-card-group');
    if (!card) return;
    handleSampleSelection(card.getAttribute('data-type'));
}
document.addEventListener('click', onSampleAreaActivate);

function showStartScreen() {
    const startScreen = document.getElementById('start-screen');
    const mainContent = document.getElementById('main-app-content');
    const navBackBtn = document.getElementById('nav-back-btn');
    const langBtn = document.getElementById('lang-toggle-btn');

    if (startScreen) startScreen.style.display = 'flex';
    if (mainContent) mainContent.style.display = 'none';

    if (navBackBtn) navBackBtn.style.display = 'none';
    // در صفحهٔ اول، دکمهٔ تغییر زبان نمایش داده می‌شود
    if (langBtn) langBtn.style.display = 'inline-flex';

    document.getElementById('abg-form').reset();

    document.querySelectorAll('#sample-type-group-splash .radio-card-group').forEach(g => g.classList.remove('selected'));
}

function setupLiveValidation() {
    document.querySelectorAll('#abg-form input, #abg-form select, #patient-demographics input, #patient-demographics select, #metabolic-calc-card input, #metabolic-calc-card select, #ventilator-inputs input, #ventilator-inputs select, #aagradient-inputs input, #aagradient-inputs select').forEach(input => {

        const oldListener = input.__validationListener;
        if (oldListener) {
            input.removeEventListener('input', oldListener);
            input.removeEventListener('change', oldListener);
        }

        const handleLiveColorAndValidation = () => {
             handleValidationColor(input);
             debouncedValidateInputs();
        };

        input.__validationListener = handleLiveColorAndValidation;
        input.addEventListener('input', handleLiveColorAndValidation);
        input.addEventListener('change', handleLiveColorAndValidation);
    });
}

document.addEventListener('DOMContentLoaded', (event) => {
    const startScreen = document.getElementById('start-screen');
    const mainContent = document.getElementById('main-app-content');

    const navBackBtn = document.getElementById('nav-back-btn');
    if (navBackBtn) {
        navBackBtn.addEventListener('click', showStartScreen);
    }

    function initializeApp(sampleType) {
        const radioToSelect = document.getElementById(`sample-${sampleType}`);
        if (radioToSelect) {
            radioToSelect.checked = true;
            updateRanges();
        }

        if (startScreen) startScreen.style.display = 'none';
        if (mainContent) mainContent.style.display = 'block';

        if (navBackBtn) navBackBtn.style.display = 'flex';
        // پس از ورود به برنامه، دکمهٔ تغییر زبان مخفی می‌شود (زبان فقط در صفحهٔ اول تغییر می‌کند)
        var langBtn = document.getElementById('lang-toggle-btn');
        if (langBtn) langBtn.style.display = 'none';

        document.body.scrollTop = 0;
        document.documentElement.scrollTop = 0;

        validateInputs();
        setupLiveValidation();
    }

    window.initializeApp = initializeApp;

    if (startScreen) {
        if (mainContent) mainContent.style.display = 'none';
        if (navBackBtn) navBackBtn.style.display = 'none';
    } else {
        if (mainContent) mainContent.style.display = 'block';
    }

    const beInput = document.getElementById('be');
    const beSignToggle = document.getElementById('be-sign-toggle');

    if (beInput && beSignToggle) {
        beSignToggle.addEventListener('click', () => {
            let currentValue = beInput.value.trim();
            let numValue = parseFloat(currentValue);

            if (!currentValue || isNaN(numValue)) {
                beInput.value = '-2.0';
            } else {
                let newValue = (numValue * -1).toFixed(1);
                beInput.value = newValue;
            }

            beInput.dispatchEvent(new Event('input'));
            beInput.dispatchEvent(new Event('change'));
        });
    }
});


document.getElementById('is-on-ventilator').addEventListener('change', function() {
    const parentGroup = this.closest('.checkbox-group');
    const ventInputs = document.getElementById('ventilator-inputs');
    const isChecked = this.checked;

    if (isChecked) {
        parentGroup.classList.add('is-ventilator-active');
        if(ventInputs) ventInputs.style.display = 'block';

        document.getElementById('vent-mode').value = '';
        document.getElementById('vent-mode').dispatchEvent(new Event('change'));

        document.getElementById('aagradient-non-vent-section').style.display = 'none';
        document.getElementById('aagradient-vent-section').style.display = 'block';

        document.getElementById('calculate-aagradient').checked = true;
        document.getElementById('calculate-aagradient').disabled = true;
        document.getElementById('aagradient-inputs').style.display = 'none';

    } else {
        parentGroup.classList.remove('is-ventilator-active');
        if(ventInputs) ventInputs.style.display = 'none';

        document.querySelectorAll('#ventilator-inputs input, #ventilator-inputs select').forEach(input => {
            input.classList.remove('invalid', 'is-normal', 'is-abnormal');
            const errorEl = document.getElementById(`${input.id}-error`);
            if(errorEl) errorEl.style.display = 'none';
        });
        document.getElementById('vent-mode').value = '';

        document.getElementById('aagradient-non-vent-section').style.display = 'block';
        document.getElementById('aagradient-vent-section').style.display = 'none';

        document.getElementById('calculate-aagradient').disabled = false;
        document.getElementById('calculate-aagradient').checked = false;
        document.getElementById('aagradient-inputs').style.display = 'none';

        document.getElementById('vent-fio2').value = 21;
    }
    validateInputs();
    setupLiveValidation();
});

document.getElementById('vent-mode').addEventListener('change', function() {
    const selectedMode = this.value;
    const modeInputs = document.querySelectorAll('.mode-inputs');
    const rateGroup = document.getElementById('rate-group');
    const pressureLabel = document.getElementById('pressure-setting-label');

    modeInputs.forEach(el => {
        el.style.display = 'none';
        el.querySelectorAll('input').forEach(input => {
            input.classList.remove('invalid');
            const errorEl = document.getElementById(`${input.id}-error`);
            if(errorEl) errorEl.style.display = 'none';
        });
    });

    if (rateGroup) {
         if (selectedMode === 'PSV' || selectedMode === 'CPAP') {
            rateGroup.style.display = 'none';
        } else {
            rateGroup.style.display = 'grid';
        }
    }

    if (selectedMode) {
        modeInputs.forEach(el => {
            const dataModes = el.getAttribute('data-mode');
            if (dataModes && dataModes.includes(selectedMode)) {
                el.style.display = 'grid';
            }
        });

        if (pressureLabel) {
            if (selectedMode === 'AC-PC') pressureLabel.textContent = 'P.Insp (Driving Pressure)';
            else if (selectedMode === 'PSV') pressureLabel.textContent = 'Pressure Support (PS)';
            else pressureLabel.textContent = 'P.Insp / PS';
        }
    }
    validateInputs();
    setupLiveValidation();
});

const handleValidationColor = (input) => {
    const CONSTANTS = window.CONSTANTS;
    if (!input) return;

    const value = parseFloat(input.value);
    const id = input.id;

    if (input.value === '' || isNaN(value)) {
        input.classList.remove('is-normal', 'is-abnormal');
        return;
    }

    const sampleType = document.querySelector('input[name="sampleType"]:checked')?.value || 'abg';
    const ageInput = document.getElementById('age');
    const age = ageInput ? parseInt(ageInput.value) : 40;

    const ranges = getNormalRanges(sampleType, age);

    let low, high;

    switch (id) {
        case 'ph':
            low = ranges.ph_low; high = ranges.ph_high;
            break;
        case 'paco2':
            low = ranges.paco2_low; high = ranges.paco2_high;
            break;
        case 'hco3':
            low = ranges.hco3_low; high = ranges.hco3_high;
            break;
        case 'pao2':
            low = ranges.pao2_low; high = ranges.pao2_high;
            break;
        case 'spo2':
            low = CONSTANTS.SPO2_NORMAL_LOW; high = 100;
            break;
        case 'be':
            low = CONSTANTS.BE_LOW; high = CONSTANTS.BE_HIGH;
            break;
        case 'sodium':
            low = 135; high = 145;
            break;
        case 'chloride':
            low = 95; high = 105;
            break;
        case 'albumin':
            low = 3.5; high = 5.0;
            break;
        case 'aagradient-fio2':
            low = 21; high = 100;
            break;
        case 'peep': low = 0; high = 20; break;
        case 'vent-fio2': low = 21; high = 100; break;
        case 'rate': low = 1; high = 40; break;
        case 'tv':
        case 'measured-vt': low = 100; high = 1000; break;
        case 'pplat': low = 0; high = 30; break;
        case 'pressure-setting': low = 5; high = 30; break;
        default:
            return;
            break;
    }

    if (value >= low && value <= high) {
        input.classList.add('is-normal');
        input.classList.remove('is-abnormal');
    } else {
        input.classList.add('is-abnormal');
        input.classList.remove('is-normal');
    }
};

document.getElementById('calculate-aagradient').addEventListener('change', function() {
    const isChecked = this.checked;
    const aaGradientInputs = document.getElementById('aagradient-inputs');

    const checkboxGroup = this.closest('.checkbox-group');

    aaGradientInputs.style.display = isChecked ? 'block' : 'none';

    if(checkboxGroup) {
         if (isChecked) {
            checkboxGroup.classList.add('is-gradient-active');
        } else {
            checkboxGroup.classList.remove('is-gradient-active');
        }
    }
    validateInputs();
    setupLiveValidation();
});

function updateRanges() {
    const sampleType = document.querySelector('input[name="sampleType"]:checked')?.value || 'abg';
    const isVBG = sampleType === 'vbg';

    const pao2Group = document.querySelector('label[for="pao2"]').closest('.form-group');
    const spo2Group = document.querySelector('label[for="spo2"]').closest('.form-group');
    const aaGradientCheckbox = document.getElementById('calculate-aagradient').closest('.checkbox-group');
    const aaGradientInputs = document.getElementById('aagradient-inputs');
    const aaGradientCard = document.getElementById('aagradient-calc-card');

    if (isVBG) {
        if (pao2Group) pao2Group.style.display = 'none';
        if (spo2Group) spo2Group.style.display = 'none';
        if (aaGradientCheckbox) aaGradientCheckbox.style.display = 'none';
        if (aaGradientInputs) aaGradientInputs.style.display = 'none';
        // در VBG کل کارت گرادیان A-a کاربرد ندارد و کاملاً مخفی می‌شود
        if (aaGradientCard) aaGradientCard.style.display = 'none';
        document.getElementById('calculate-aagradient').checked = false;
    } else {
        if (pao2Group) pao2Group.style.display = 'block';
        if (spo2Group) spo2Group.style.display = 'block';
        if (aaGradientCheckbox) aaGradientCheckbox.style.display = 'flex';
        // در ABG کارت گرادیان A-a دوباره نمایش داده می‌شود
        if (aaGradientCard) aaGradientCard.style.display = 'block';

        const isOnVentilator = document.getElementById('is-on-ventilator')?.checked;
        if(isOnVentilator) {
             if (aaGradientInputs) aaGradientInputs.style.display = 'none';
        } else if(document.getElementById('calculate-aagradient').checked) {
             if (aaGradientInputs) aaGradientInputs.style.display = 'block';
        } else {
             if (aaGradientInputs) aaGradientInputs.style.display = 'none';
        }
    }

    const ageInput = document.getElementById('age');
    const age = ageInput?.value ? parseInt(ageInput.value) : 40;

    const ranges = getNormalRanges(sampleType, age);

    const phRange = document.querySelector('label[for="ph"]').nextElementSibling;
    if (isVBG) phRange.textContent = L(`نرمال (وریدی): ${ranges.ph_low} - ${ranges.ph_high}`, `Normal (venous): ${ranges.ph_low} - ${ranges.ph_high}`);
    else phRange.textContent = L(`نرمال: ${ranges.ph_low} - ${ranges.ph_high}`, `Normal: ${ranges.ph_low} - ${ranges.ph_high}`);

    const paco2Range = document.getElementById('paco2-range');
    if (isVBG) paco2Range.textContent = L(`نرمال (وریدی): ${ranges.paco2_low} - ${ranges.paco2_high}`, `Normal (venous): ${ranges.paco2_low} - ${ranges.paco2_high}`);
    else paco2Range.textContent = L(`نرمال: ${ranges.paco2_low} - ${ranges.paco2_high}`, `Normal: ${ranges.paco2_low} - ${ranges.paco2_high}`);

    const hco3Range = document.getElementById('hco3-range');
    if (isVBG) hco3Range.textContent = L(`نرمال (وریدی): ${ranges.hco3_low} - ${ranges.hco3_high}`, `Normal (venous): ${ranges.hco3_low} - ${ranges.hco3_high}`);
    else hco3Range.textContent = L(`نرمال: ${ranges.hco3_low} - ${ranges.hco3_high}`, `Normal: ${ranges.hco3_low} - ${ranges.hco3_high}`);

    const pao2Range = document.getElementById('pao2-range');
    if(pao2Range) pao2Range.textContent = L(`نرمال: ${Math.round(ranges.pao2_low)} - ${Math.round(ranges.pao2_high)} (وابسته به سن)`, `Normal: ${Math.round(ranges.pao2_low)} - ${Math.round(ranges.pao2_high)} (age-dependent)`);

    handleValidationColor(document.getElementById('ph'));
    handleValidationColor(document.getElementById('paco2'));
    handleValidationColor(document.getElementById('hco3'));
    if(document.getElementById('pao2')) handleValidationColor(document.getElementById('pao2'));

    // به‌روزرسانی قفل بخش‌های حرفه‌ای (متابولیک/ونتیلاتور) بر اساس نوع نمونه و وضعیت پرمیوم.
    if (typeof window.updatePremiumSectionLocks === 'function') {
        try { window.updatePremiumSectionLocks(); } catch (e) {}
    }

    validateInputs();
}

if(document.getElementById('age')) {
    document.getElementById('age').addEventListener('change', updateRanges);
    document.getElementById('age').addEventListener('input', updateRanges);
}

function validateInputs() {
    const CONSTANTS = window.CONSTANTS;
    let isValid = true;
    const fieldsToValidate = [
        { id: 'ph', min: 6.8, max: 7.8, defaultRequired: true },
        { id: 'paco2', min: 10, max: 130, defaultRequired: true },
        { id: 'hco3', min: 5, max: 50, defaultRequired: true },
        { id: 'pao2', min: 20, max: 600 },
        { id: 'spo2', min: 70, max: 100 },
        { id: 'be', min: -30, max: 30 },
        { id: 'age', min: 0, max: 150 },
        { id: 'height', min: 100, max: 250 },
        { id: 'gender', type: 'select' },
        { id: 'sodium', min: 100, max: 180 },
        { id: 'chloride', min: 70, max: 130 },
        { id: 'albumin', min: 1.0, max: 5.5 },
        { id: 'aagradient-fio2', min: 21, max: 100 },
        { id: 'vent-mode', type: 'select' },
        { id: 'peep', min: 0, max: 30 },
        { id: 'vent-fio2', min: 21, max: 100 },
        { id: 'rate', min: 1, max: 50 },
        { id: 'tv', min: 100, max: 1000 },
        { id: 'pplat', min: 0, max: 50 },
        { id: 'pressure-setting', min: 5, max: 40 },
        { id: 'measured-vt', min: 100, max: 1000 },
    ];

    const isOnVentilator = document.getElementById('is-on-ventilator')?.checked;
    const ventMode = document.getElementById('vent-mode')?.value;
    const isVBG = document.querySelector('input[name="sampleType"]:checked')?.value === 'vbg';
    const isAAGradientActive = document.getElementById('calculate-aagradient')?.checked;

    const dynamicRequiredFields = new Set();
    const dynamicMonitoringFields = new Set();

    if (isAAGradientActive && !isVBG) {
        dynamicRequiredFields.add('age');
        dynamicRequiredFields.add('pao2');

        if (!isOnVentilator) {
            dynamicRequiredFields.add('aagradient-fio2');
        }
    }

    if (isOnVentilator) {
        dynamicRequiredFields.add('vent-mode');
        dynamicRequiredFields.add('peep');
        dynamicRequiredFields.add('vent-fio2');
        dynamicRequiredFields.add('height');
        dynamicRequiredFields.add('gender');

        if (!isVBG) {
            dynamicRequiredFields.add('pao2');
        }

        if (ventMode && (ventMode !== 'PSV' && ventMode !== 'CPAP')) {
            dynamicRequiredFields.add('rate');
        }
        if (ventMode === 'AC-VC' || ventMode === 'SIMV') {
            dynamicRequiredFields.add('tv');
            dynamicMonitoringFields.add('pplat');
        }
        if (ventMode === 'AC-PC' || ventMode === 'PSV') {
            dynamicRequiredFields.add('pressure-setting');
            dynamicMonitoringFields.add('measured-vt');
        }
    }


    fieldsToValidate.forEach(field => {
        const input = document.getElementById(field.id);
        const errorEl = document.getElementById(`${field.id}-error`);
        const label = document.querySelector(`label[for="${field.id}"]`);

        if (!input) return;

        const isPBWField = (field.id === 'height' || field.id === 'gender');
        const isVentControlField = (field.id === 'vent-mode' || field.id === 'peep' || field.id === 'vent-fio2' || field.id === 'rate' || field.id === 'tv' || field.id === 'pplat' || field.id === 'pressure-setting' || field.id === 'measured-vt');
        const isABGField = (field.id === 'pao2' || field.id === 'spo2');
        const isMetabolicField = (field.id === 'sodium' || field.id === 'chloride' || field.id === 'albumin');
        const isAAFiO2Field = (field.id === 'aagradient-fio2');

        let isRequired = field.defaultRequired || dynamicRequiredFields.has(field.id);
        let isMonitoring = dynamicMonitoringFields.has(field.id);

        if (isVBG && isABGField) {
            isRequired = false;
        }

        if ((isVentControlField || isPBWField) && !isOnVentilator) {
            isRequired = false;
            isMonitoring = false;
        }

        if (isMetabolicField || field.id === 'be') {
             isRequired = false;
        }

        if (isAAFiO2Field && (!isAAGradientActive || isOnVentilator)) {
            isRequired = false;
        }

        if(label) {
             if (isRequired) label.classList.add('required-field');
             else label.classList.remove('required-field');

             label.classList.remove('error-active');
        }

        const value = (field.type === 'select') ? input.value : parseFloat(input.value);
        let isFieldInvalid = false;
        let errorMessage = '';

        if (isRequired && (input.value === null || input.value === "" || (field.type === 'select' && input.value === "") || (field.type !== 'select' && isNaN(value)))) {
            isFieldInvalid = true;
            errorMessage = (field.type === 'select') ? L('لطفاً یک گزینه را انتخاب کنید.', 'Please select an option.') : L('این فیلد ضروری است.', 'This field is required.');
        }
        else if (input.value !== "" && field.type !== 'select' && !isNaN(value) && (value < field.min || value > field.max)) {
            isFieldInvalid = true;
            errorMessage = L(`مقدار باید بین ${field.min} و ${field.max} باشد.`, `Value must be between ${field.min} and ${field.max}.`);
        }

        if (isFieldInvalid) {
            input.classList.add('invalid');
            if (label) label.classList.add('error-active');
            if(errorEl) {
                errorEl.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${errorMessage}`;
                errorEl.style.display = 'flex';
            }
            isValid = false;
        } else {
            input.classList.remove('invalid');
            if (label) label.classList.remove('error-active');
            if(errorEl) errorEl.style.display = 'none';
        }
    });
    return isValid;
}

function interpretABG(data) {
    const CONSTANTS = window.CONSTANTS;
    const METABOLIC_CONSTANTS = window.METABOLIC_CONSTANTS;
    const {
        ph, paco2, hco3, pao2, spo2, be, age: patientAge,
        calculateAAGradient, isOnVentilator, ventFio2,
        aagradientFio2,
        sodium, chloride, albumin
    } = data;

    let primaryDisorder = "", compensationState = "", finalDiagnosis = "";
    let finalDiagnosisEnglish = "";
    let oxygenationStatus = "";
    let compensationAnalysis = {};

    const sampleType = document.querySelector('input[name="sampleType"]:checked')?.value || 'abg';
    const isVBG = sampleType === 'vbg';

    const age = patientAge || 40;
    const normalRanges = getNormalRanges(sampleType, age);

    const acidBaseResult = runAcidBaseInterpretation(data, normalRanges, isVBG);

    primaryDisorder = acidBaseResult.primaryDisorder;
    compensationState = acidBaseResult.compensationState;
    compensationAnalysis = acidBaseResult.compensationAnalysis;
    const isMetabolicAcidosis = acidBaseResult.isMetabolicAcidosis;
    const isMetabolicAlkalosis = acidBaseResult.isMetabolicAlkalosis;

    let beInterpretation = "";
    if (be !== null) {
        if (be < CONSTANTS.BE_LOW) {
            beInterpretation = L(`Base Excess منفی (${be.toFixed(1)}) نشان‌دهنده کمبود بیز و وجود اسیدوز متابولیک است.`, `Base Excess is negative (${be.toFixed(1)}), indicating a base deficit and metabolic acidosis.`);
        }
        else if (be > CONSTANTS.BE_HIGH) {
            beInterpretation = L(`Base Excess مثبت (${be.toFixed(1)}) نشان‌دهنده بیش از حد بیز و وجود آلکالوز متابولیک است.`, `Base Excess is positive (${be.toFixed(1)}), indicating a base excess and metabolic alkalosis.`);
        }
        else {
            if (isMetabolicAcidosis || isMetabolicAlkalosis) {
                beInterpretation = L(`Base Excess نرمال (${be.toFixed(1)}) است. در صورت وجود اسیدوز/آلکالوز متابولیک، این یافته نشان‌دهنده تأثیرات جبرانی یا تداخل اندازه‌گیری است.`, `Base Excess is normal (${be.toFixed(1)}). In the presence of metabolic acidosis/alkalosis, this may reflect compensatory effects or measurement interference.`);
            } else {
                 beInterpretation = L(`Base Excess نرمال (${be.toFixed(1)}) است.`, `Base Excess is normal (${be.toFixed(1)}).`);
            }
        }
    }

    finalDiagnosis = `${primaryDisorder} ${compensationState}`.trim();
    if (primaryDisorder.includes("مختلط") || primaryDisorder === "وضعیت نرمال اسید-باز") { finalDiagnosis = primaryDisorder; }

    let primaryDisorderEn = TRANSLATIONS[primaryDisorder] || primaryDisorder;
    let compensationStateEn = TRANSLATIONS[compensationState] || "";

    if (primaryDisorder.includes("مختلط") || primaryDisorder === "وضعیت نرمال اسید-باز") {
        finalDiagnosisEnglish = TRANSLATIONS[finalDiagnosis] || finalDiagnosis;
    } else {
        finalDiagnosisEnglish = `${primaryDisorderEn} ${compensationStateEn}`.trim();
    }

    if (isVBG) {
        oxygenationStatus = L("اکسیژناسیون برای VBG تفسیر نمی شود. (تنها برای ABG معتبر است.)","Oxygenation is not interpreted for VBG. (Valid only for ABG.)");
    } else {
         if (spo2 !== null) {
            if (spo2 < CONSTANTS.SPO2_WARNING_LOW) { oxygenationStatus = L(`هیپوکسمی شدید (بر اساس SpO₂) (پایش لازم)`,`Severe hypoxemia (based on SpO₂) (monitoring required)`); }
            else if (spo2 < CONSTANTS.SPO2_NORMAL_LOW) { oxygenationStatus = L(`هیپوکسمی خفیف (بر اساس SpO₂) (پایش لازم)`,`Mild hypoxemia (based on SpO₂) (monitoring required)`); }
        }
        if (pao2 !== null) {
            if (pao2 < 60) { oxygenationStatus = L("نارسایی تنفسی هیپوکسمیک","Hypoxemic respiratory failure"); }
            else if (pao2 < normalRanges.pao2_low) { oxygenationStatus = L("هیپوکسمی","Hypoxemia"); }
            else if(oxygenationStatus === "") { oxygenationStatus = L("اکسیژناسیون نرمال","Normal oxygenation"); }
        } else if (spo2 === null) { oxygenationStatus = L("PaO₂/SpO₂ وارد نشده است.","PaO₂/SpO₂ not entered."); }
    }

    let aaGradient = null, expectedAaGradient = null, aaGradientInterpretation = "";
    let fio2UsedForAA = null;
    let shouldCalculateAAGradient = false;
    let isAAGradientAuto = false;

    if (!isVBG && pao2 !== null && patientAge !== null) {
        if (isOnVentilator) {
            shouldCalculateAAGradient = true;
            isAAGradientAuto = true;
            fio2UsedForAA = ventFio2 || 21;
        } else if (calculateAAGradient) {
            shouldCalculateAAGradient = true;
            fio2UsedForAA = aagradientFio2 || 21;
        }
    }

    if (shouldCalculateAAGradient && fio2UsedForAA !== null) {
        const paco2_value = paco2 || CONSTANTS.PACO2_NORMAL_REF;
        const fio2_decimal = fio2UsedForAA / 100;

        const paO2_calc = (fio2_decimal * (CONSTANTS.P_ATM_SEA_LEVEL - CONSTANTS.P_H2O)) - (paco2_value / CONSTANTS.RESP_QUOTIENT);

        aaGradient = paO2_calc - pao2;
        expectedAaGradient = (patientAge / 4) + 4;

        if (aaGradient > expectedAaGradient + 5) {
            aaGradientInterpretation = L(`گرادیان A-a (${aaGradient.toFixed(0)} mmHg) <strong>افزایش یافته</strong> (نرمال: ~${expectedAaGradient.toFixed(0)}). این یافته مطرح کننده مشکل ذاتی ریه (V/Q mismatch, Shunt) است.`, `A-a gradient (${aaGradient.toFixed(0)} mmHg) is <strong>elevated</strong> (normal: ~${expectedAaGradient.toFixed(0)}). This suggests an intrinsic lung problem (V/Q mismatch, shunt).`);
        } else {
            aaGradientInterpretation = L(`گرادیان A-a (${aaGradient.toFixed(0)} mmHg) <strong>نرمال</strong> است.`, `A-a gradient (${aaGradient.toFixed(0)} mmHg) is <strong>normal</strong>.`);
        }
    }

    let metabolicAnalysis = {};
    let rawAG = calculateAnionGap(sodium, chloride, hco3);
    let adjAG = calculateAdjustedAnionGap(rawAG, albumin !== null ? albumin : METABOLIC_CONSTANTS.ALBUMIN_NORMAL);

    if (rawAG !== null && typeof interpretMetabolicAcidosis !== 'undefined') {
        metabolicAnalysis = interpretMetabolicAcidosis({
            ag: rawAG,
            hco3: hco3,
            adjAg: adjAG,
            isMetabolicAcidosis: isMetabolicAcidosis
        });
    }

    let beConflictWarning = null;
    const isMetabolicPrimary = primaryDisorder.includes("متابولیک") && !primaryDisorder.includes("مختلط");
    const isBE_Normal = be !== null && be >= CONSTANTS.BE_LOW && be <= CONSTANTS.BE_HIGH;

    if (isMetabolicPrimary && isBE_Normal) {
        beConflictWarning = {
            title: L("تضاد معیار متابولیک","Metabolic criteria conflict"),
            text: L(`با وجود انحراف در HCO₃⁻، مقدار Base Excess (${be.toFixed(1)} mmol/L) در محدوده نرمال قرار دارد (${CONSTANTS.BE_LOW} تا ${CONSTANTS.BE_HIGH}). این یافته احتمالاً نشان‌دهنده یک تغییر ثانویه HCO₃⁻ به دلیل جبران تنفسی است، نه اختلال متابولیک اولیه.`, `Despite the HCO₃⁻ deviation, the Base Excess (${be.toFixed(1)} mmol/L) is within the normal range (${CONSTANTS.BE_LOW} to ${CONSTANTS.BE_HIGH}). This likely reflects a secondary HCO₃⁻ change due to respiratory compensation rather than a primary metabolic disorder.`),
            type: 'warning'
        };
    }

    return {
        finalDiagnosis,
        finalDiagnosisEnglish,
        oxygenationStatus,
        aaGradient,
        expectedAaGradient,
        aaGradientInterpretation,
        beInterpretation,
        compensationAnalysis,
        normalRanges,
        isVBG,
        primaryDisorder,

        ag: rawAG,
        sodium: sodium,
        chloride: chloride,
        albumin: albumin,
        adjAg: adjAG,
        agInterpretation: metabolicAnalysis.agInterpretation,
        deltaGap: metabolicAnalysis.deltaGap,
        dgInterpretation: metabolicAnalysis.dgInterpretation,
        isMetabolicAcidosis: isMetabolicAcidosis,
        isMetabolicAlkalosis: isMetabolicAlkalosis,
        fio2UsedForAA: fio2UsedForAA,
        shouldShowAAGradient: shouldCalculateAAGradient,
        isAAGradientAuto: isAAGradientAuto,
        beConflictWarning: beConflictWarning
    };
}

// ============== رویداد سابمیت و بررسی استفاده تست رایگان VBG =================
document.getElementById('abg-form').addEventListener('submit', function(event) {
    event.preventDefault();

    if (typeof renderCompensationAnalysisHtml === 'undefined' || typeof renderVentilatorRecommendationsHtml === 'undefined' || typeof renderMetabolicAnalysisHtml === 'undefined' || typeof renderHco3BeInterpretationHtml === 'undefined') {
         alert('خطا: فایل renderer.js بارگذاری نشده است.');
         return;
    }

    if (!validateInputs()) {
        const firstInvalidInput = document.querySelector('.invalid');
        if (firstInvalidInput) {
            firstInvalidInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        return;
    }

    const sampleType = document.querySelector('input[name="sampleType"]:checked')?.value || 'abg';
    const isVBG = sampleType === 'vbg';

    // بررسی منطق تست رایگان (فقط برای VBG چون ABG کلاً در صفحه اول قفل شده است)
    if (window.isPremiumUser === false) {
        if (isVBG) {
            let hasUsedTrial = false;

            // ارتباط با اندروید برای خواندن اطلاعات پایدار
            if (typeof AndroidApp !== 'undefined' && typeof AndroidApp.hasUsedTrial === 'function') {
                hasUsedTrial = AndroidApp.hasUsedTrial();
            } else {
                hasUsedTrial = (localStorage.getItem('hasUsedFreeTrial') === 'true');
            }

            if (hasUsedTrial) {
                let modal = document.getElementById('purchaseModal');
                if (modal) {
                    modal.style.display = 'flex';
                    modal.style.opacity = '1';
                    modal.style.visibility = 'visible';
                    modal.style.pointerEvents = 'auto';
                } else {
                    alert('جهت دسترسی نامحدود به تحلیل نتایج، لطفاً نسخه کامل برنامه را تهیه کنید.');
                }
                return; // متوقف کردن تحلیل
            } else {
                // ثبت استفاده از تست رایگان در صورت موفقیت
                if (typeof AndroidApp !== 'undefined' && typeof AndroidApp.setTrialUsed === 'function') {
                    AndroidApp.setTrialUsed();
                } else {
                    localStorage.setItem('hasUsedFreeTrial', 'true');
                }
            }
        } else {
            // یک گارد احتیاطی برای ABG در صورت دور زدن UI
            let modal = document.getElementById('purchaseModal');
            if (modal) {
                modal.style.display = 'flex';
                modal.style.opacity = '1';
                modal.style.visibility = 'visible';
                modal.style.pointerEvents = 'auto';
            }
            return;
        }
    }

    const submitBtn = document.getElementById('submit-btn');
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${L('در حال تحلیل...','Analyzing...')}`;

    const data = {
        ph: parseFloat(document.getElementById('ph').value) || null,
        paco2: parseFloat(document.getElementById('paco2').value) || null,
        hco3: parseFloat(document.getElementById('hco3').value) || null,
        pao2: isVBG ? null : (document.getElementById('pao2').value ? parseFloat(document.getElementById('pao2').value) : null),
        spo2: isVBG ? null : (document.getElementById('spo2').value ? parseFloat(document.getElementById('spo2').value) : null),
        be: document.getElementById('be').value ? parseFloat(document.getElementById('be').value) : null,
        age: document.getElementById('age').value ? parseFloat(document.getElementById('age').value) : null,
        height: document.getElementById('height')?.value ? parseFloat(document.getElementById('height').value) : null,
        gender: document.getElementById('gender')?.value || null,
        calculateAAGradient: document.getElementById('calculate-aagradient')?.checked || document.getElementById('is-on-ventilator')?.checked,

        aagradientFio2: document.getElementById('aagradient-fio2')?.value ? parseFloat(document.getElementById('aagradient-fio2').value) : null,

        sodium: document.getElementById('sodium')?.value ? parseFloat(document.getElementById('sodium').value) : null,
        chloride: document.getElementById('chloride')?.value ? parseFloat(document.getElementById('chloride').value) : null,
        albumin: document.getElementById('albumin')?.value ? parseFloat(document.getElementById('albumin').value) : null,

        isOnVentilator: document.getElementById('is-on-ventilator')?.checked,
        ventMode: document.getElementById('vent-mode')?.value || null,
        ventFio2: document.getElementById('vent-fio2')?.value ? parseFloat(document.getElementById('vent-fio2').value) : null,
        peep: document.getElementById('peep')?.value ? parseFloat(document.getElementById('peep').value) : null,
        rate: document.getElementById('rate')?.value ? parseFloat(document.getElementById('rate').value) : null,
        tv: document.getElementById('tv')?.value ? parseFloat(document.getElementById('tv').value) : null,
        pplat: document.getElementById('pplat')?.value ? parseFloat(document.getElementById('pplat').value) : null,
        pressureSetting: document.getElementById('pressure-setting')?.value ? parseFloat(document.getElementById('pressure-setting').value) : null,
        measuredVt: document.getElementById('measured-vt')?.value ? parseFloat(document.getElementById('measured-vt').value) : null,
    };

    setTimeout(() => {
        const CONSTANTS = window.CONSTANTS;
        const interpretation = interpretABG(data);
        const resultContainer = document.getElementById('interpretation-result');

        if (interpretation.error) {
            resultContainer.innerHTML = `<div class="placeholder"><i class="fas fa-exclamation-triangle"></i><p>${interpretation.message}</p></div>`;
            submitBtn.disabled = false;
            submitBtn.innerHTML = `<i class="fas fa-check-circle"></i> ${L('تحلیل نتایج','Analyze results')}`;
            return;
        }

        const normalRanges = interpretation.normalRanges;

        const phIndicator = data.ph < normalRanges.ph_low || data.ph > normalRanges.ph_high ? 'indicator-danger' : 'indicator-normal';
        const paco2Indicator = data.paco2 < normalRanges.paco2_low || data.paco2 > normalRanges.paco2_high ? 'indicator-warning' : 'indicator-normal';
        const hco3Indicator = data.hco3 < normalRanges.hco3_low || data.hco3 > normalRanges.hco3_high ? 'indicator-danger' : 'indicator-normal';
        const beIndicator = data.be !== null ? (data.be < CONSTANTS.BE_LOW || data.be > CONSTANTS.BE_HIGH ? 'indicator-danger' : 'indicator-normal') : '';
        let pao2Indicator = ''; if (data.pao2 !== null) { pao2Indicator = data.pao2 < normalRanges.pao2_low ? 'indicator-danger' : (data.pao2 <= normalRanges.pao2_high ? 'indicator-normal' : 'indicator-warning'); }
        let spo2Indicator = ''; if (data.spo2 !== null) { spo2Indicator = data.spo2 < CONSTANTS.SPO2_WARNING_LOW ? 'indicator-danger' : (data.spo2 < CONSTANTS.SPO2_NORMAL_LOW ? 'indicator-warning' : 'indicator-normal'); }

        const ventilatorHtml = renderVentilatorRecommendationsHtml(
            data.isOnVentilator,
            interpretation,
            data
        );

        const metabolicHtml = renderMetabolicAnalysisHtml(interpretation);

        const hco3BeHtml = renderHco3BeInterpretationHtml({
            hco3: data.hco3,
            beInterpretation: interpretation.beInterpretation,
            normalRanges: normalRanges,
            isMetabolicAcidosis: interpretation.isMetabolicAcidosis,
            isMetabolicAlkalosis: interpretation.isMetabolicAlkalosis
        });


        let conflictWarningHtml = '';
        if (interpretation.beConflictWarning) {
            const warning = interpretation.beConflictWarning;
            conflictWarningHtml = `
                <div class="vent-recommendation-item warning" style="margin-bottom: 1rem;">
                    <div class="vent-recommendation-icon"><i class="fas fa-exclamation-triangle"></i></div>
                    <div>
                        <strong>${warning.title}</strong>: ${warning.text}
                    </div>
                </div>
            `;
        }


        const analysisHtml = `
            ${conflictWarningHtml}  <div class="results-summary">
                <h3>${L(interpretation.finalDiagnosis, interpretation.finalDiagnosisEnglish || interpretation.finalDiagnosis)}</h3>
                <p class="english-translation">${L(interpretation.finalDiagnosisEnglish || '', '')}</p>
                <p>${interpretation.oxygenationStatus}</p>
                <div class="interpretation-text" style="border-right-color: ${isVBG ? 'var(--warning-color)' : 'var(--success-color)'};">
                    ${L('تحلیل بر اساس محدوده‌های گاز خون ' + (isVBG ? 'وریدی (VBG)' : 'شریانی (ABG)') + ' انجام شده است.', 'Analysis is based on ' + (isVBG ? 'venous (VBG)' : 'arterial (ABG)') + ' blood gas reference ranges.')}
                </div>
            </div>

            <div class="result-section">
                <h4><i class="fas fa-balance-scale"></i> ${L("وضعیت اسید-باز","Acid-Base Status")}</h4>
                <ul class="parameter-list">
                    <li class="parameter-item"><span class="parameter-name"><div class="visual-indicator ${phIndicator}"></div>pH</span><span class="parameter-value">${data.ph.toFixed(2)}</span></li>
                    <li class="parameter-item"><span class="parameter-name"><div class="visual-indicator ${paco2Indicator}"></div>PaCO₂</span><span class="parameter-value">${data.paco2} <small>mmHg</small></span></li>
                    <li class="parameter-item"><span class="parameter-name"><div class="visual-indicator ${hco3Indicator}"></div>HCO₃⁻</span><span class="parameter-value">${data.hco3} <small>mmol/L</small></span></li>
                    ${data.be !== null ? `<li class="parameter-item"><span class="parameter-name"><div class="visual-indicator ${beIndicator}"></div>Base Excess</span><span class="parameter-value">${data.be.toFixed(1)} <small>mmol/L</small></span></li>` : ''}
                </ul>
            </div>

            ${hco3BeHtml}

            ${renderCompensationAnalysisHtml(interpretation.compensationAnalysis)}

            ${metabolicHtml}

            ${!isVBG && (data.pao2 !== null || data.spo2 !== null) ? `
            <div class="result-section">
                <h4><i class="fas fa-lungs"></i> ${L("ارزیابی اکسیژناسیون (فقط برای ABG)","Oxygenation assessment (ABG only)")}</h4>
                <ul class="parameter-list">
                    ${data.pao2 !== null ? `<li class="parameter-item"><span class="parameter-name"><div class="visual-indicator ${pao2Indicator}"></div>PaO₂</span><span class="parameter-value">${data.pao2} <small>mmHg</small></span></li>` : ''}
                    ${data.spo2 !== null ? `<li class="parameter-item"><span class="parameter-name"><div class="visual-indicator ${spo2Indicator}"></div>SpO₂</span><span class="parameter-value">${data.spo2} <small>%</small></span></li>` : ''}
                    ${interpretation.shouldShowAAGradient && interpretation.aaGradient !== null ? `
                    <li class="parameter-item"><span class="parameter-name">${L("FiO₂ استفاده شده","FiO₂ used")}</span><span class="parameter-value">${interpretation.fio2UsedForAA} <small>%</small></span></li>
                    <li class="parameter-item"><span class="parameter-name">${L("گرادیان A-a بیمار","Patient A-a gradient")}</span><span class="parameter-value">${interpretation.aaGradient.toFixed(0)} <small>mmHg</small></span></li>
                    <li class="parameter-item"><span class="parameter-name">${L("گرادیان A-a مورد انتظار","Expected A-a gradient")}</span><span class="parameter-value">~${interpretation.expectedAaGradient.toFixed(0)} <small>mmHg</small></span></li>` : ''}
                </ul>
                ${interpretation.aaGradientInterpretation ? `<div class="interpretation-text">${interpretation.aaGradientInterpretation}</div>` : ''}

                ${interpretation.isAAGradientAuto ? `
                <div class="interpretation-text" style="border-right-color: var(--info-color); margin-top: 0.5rem;">
                    <i class="fas fa-info-circle"></i> ${L("A-a Gradient با استفاده از FiO₂ وارد شده در بخش ونتیلاتور محاسبه شده است.","The A-a gradient was calculated using the FiO₂ entered in the ventilator section.")}
                </div>` : ''}
            </div>` : ''}
        `;

        resultContainer.innerHTML = analysisHtml + ventilatorHtml;

        submitBtn.disabled = false;
        submitBtn.innerHTML = `<i class="fas fa-check-circle"></i> ${L('تحلیل نتایج','Analyze results')}`;
        if (window.innerWidth <= 992) {
            document.getElementById('results-card').scrollIntoView({ behavior: 'smooth' });
        }
    }, 500);
});

document.getElementById('abg-form').addEventListener('reset', function() {
    const CONSTANTS = window.CONSTANTS;
    document.querySelectorAll('input.invalid').forEach(input => input.classList.remove('invalid'));

    document.querySelectorAll('label.error-active').forEach(label => label.classList.remove('error-active'));

    document.querySelectorAll('.error-message').forEach(el => el.style.display = 'none');
    document.getElementById('interpretation-result').innerHTML = `<div class="placeholder"><i class="fas fa-notes-medical"></i><p>${L("نتایج تحلیل بیمار در این قسمت نمایش داده خواهد شد.","The patient analysis results will be displayed here.")}</p></div>`;

    document.getElementById('aagradient-inputs').style.display = 'none';
    document.getElementById('aagradient-fio2').value = 21;

    document.getElementById('aagradient-non-vent-section').style.display = 'block';
    document.getElementById('aagradient-vent-section').style.display = 'none';
    document.getElementById('calculate-aagradient').disabled = false;
    document.getElementById('calculate-aagradient').checked = false;


    document.querySelectorAll('input[type="number"], input[type="text"]').forEach(input => {
        input.classList.remove('is-normal', 'is-abnormal');
    });

    const aaGradientCheckbox = document.getElementById('calculate-aagradient').closest('.checkbox-group');
    if(aaGradientCheckbox) aaGradientCheckbox.classList.remove('is-gradient-active');

    document.getElementById('ventilator-checkbox-group').classList.remove('is-ventilator-active');
    const ventInputs = document.getElementById('ventilator-inputs');
    if(ventInputs) ventInputs.style.display = 'none';
    document.getElementById('vent-mode').value = '';
    document.getElementById('vent-mode').dispatchEvent(new Event('change'));

    document.getElementById('vent-fio2').value = 21;

    const age = document.getElementById('age').value ? parseInt(document.getElementById('age').value) : 40;
    const ranges = getNormalRanges('abg', age);

    document.querySelector('label[for="ph"]').nextElementSibling.textContent = L(`نرمال: ${ranges.ph_low} - ${ranges.ph_high}`, `Normal: ${ranges.ph_low} - ${ranges.ph_high}`);
    document.getElementById('paco2-range').textContent = L(`نرمال: ${ranges.paco2_low} - ${ranges.paco2_high}`, `Normal: ${ranges.paco2_low} - ${ranges.paco2_high}`);
    document.getElementById('hco3-range').textContent = L(`نرمال: ${ranges.hco3_low} - ${ranges.hco3_high}`, `Normal: ${ranges.hco3_low} - ${ranges.hco3_high}`);
    if(document.getElementById('pao2-range')) document.getElementById('pao2-range').textContent = L(`نرمال: ${Math.round(ranges.pao2_low)} - ${Math.round(ranges.pao2_high)} (وابسته به سن)`, `Normal: ${Math.round(ranges.pao2_low)} - ${Math.round(ranges.pao2_high)} (age-dependent)`);

    const pao2Group = document.querySelector('label[for="pao2"]').closest('.form-group');
    const spo2Group = document.querySelector('label[for="spo2"]').closest('.form-group');
    const aaGradientCheckboxElement = document.getElementById('calculate-aagradient').closest('.checkbox-group');

    if (pao2Group) pao2Group.style.display = 'block';
    if (spo2Group) spo2Group.style.display = 'block';
    if (aaGradientCheckboxElement) aaGradientCheckboxElement.style.display = 'flex';

    const radioABG = document.getElementById('sample-abg');
    if(radioABG) radioABG.checked = true;

    validateInputs();
    setupLiveValidation();
});
// ===== END: abg.js =====