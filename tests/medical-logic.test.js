// ===== تست واحد فرمول‌های پزشکی حیاتی =====
// اجرا: node tests/medical-logic.test.js
// بدون وابستگی خارجی. یک محیط window ساختگی می‌سازیم و فایل‌های محاسباتی را
// (که همگی روی window.* تعریف شده‌اند) در همان اسکوپ بارگذاری و اجرا می‌کنیم.

const fs = require('fs');
const path = require('path');
const vm = require('vm');

// --- ساخت محیط اجرای مشترک با window و document ساختگی ---
const sandbox = {};
sandbox.window = sandbox; // در مرورگر window === globalThis
sandbox.console = console;
// document ساختگی: منطق اسید-باز sampleType را از DOM می‌خواند؛ به‌صورت پیش‌فرض abg.
sandbox.document = {
    querySelector: () => ({ value: 'abg' }),
    getElementById: () => null,
};
// helper زبان (در محیط واقعی از i18n.js می‌آید)
sandbox.currentLang = 'fa';
sandbox.L = function (fa, en) { return sandbox.currentLang === 'en' ? en : fa; };
vm.createContext(sandbox);

const root = path.join(__dirname, '..', 'js');
// ترتیب بارگذاری مطابق index.html (بخش محاسباتی)
['constants.js', 'vbg_core.js', 'metabolic.js', 'ventilator.js'].forEach(file => {
    const code = fs.readFileSync(path.join(root, file), 'utf8');
    vm.runInContext(code, sandbox, { filename: file });
});

// --- چارچوب تست سبک ---
let passed = 0;
let failed = 0;
const failures = [];

function approx(a, b, tol = 0.01) {
    return Math.abs(a - b) <= tol;
}

function check(name, condition, detail = '') {
    if (condition) {
        passed++;
        console.log(`  ✅ ${name}`);
    } else {
        failed++;
        failures.push(`${name} ${detail}`);
        console.log(`  ❌ ${name} ${detail}`);
    }
}

function section(title) {
    console.log(`\n▶ ${title}`);
}

const { getNormalRanges, runAcidBaseInterpretation } = sandbox;
const { calculateAnionGap, calculateAdjustedAnionGap, calculateDeltaGap, interpretMetabolicAcidosis } = sandbox;
const { calculatePBW, calculatePFRatio, calculateDrivingPressure } = sandbox;

// ============ ۱. محدوده‌های نرمال ============
section('getNormalRanges');
{
    const abg = getNormalRanges('abg', 40);
    check('pH نرمال ABG برابر 7.35-7.45', abg.ph_low === 7.35 && abg.ph_high === 7.45);

    const vbg = getNormalRanges('vbg', 40);
    check('pH نرمال VBG برابر 7.31-7.41', vbg.ph_low === 7.31 && vbg.ph_high === 7.41);

    const young = getNormalRanges('abg', 20);
    const old = getNormalRanges('abg', 80);
    check('PaO2 مورد انتظار با افزایش سن کاهش می‌یابد', old.pao2_high < young.pao2_high,
        `(young=${young.pao2_high}, old=${old.pao2_high})`);
}

// ============ ۲. تفسیر اسید-باز ============
section('runAcidBaseInterpretation');
{
    const ranges = getNormalRanges('abg', 40);

    // اسیدوز متابولیک جبران‌شدهٔ تنفسی (فرمول وینتر: 1.5*8+8 = 20)
    let r = runAcidBaseInterpretation({ ph: 7.30, paco2: 20, hco3: 8, be: -16 }, ranges, false);
    check('اسیدوز متابولیک تشخیص داده شد', r.primaryDisorder.includes('اسیدوز متابولیک'),
        `(got: ${r.primaryDisorder})`);
    check('جبران تنفسی مناسب شناسایی شد', r.compensationState.includes('جبران'),
        `(got: ${r.compensationState})`);

    // اسیدوز تنفسی حاد
    r = runAcidBaseInterpretation({ ph: 7.25, paco2: 60, hco3: 25, be: 0 }, ranges, false);
    check('اسیدوز تنفسی تشخیص داده شد', r.primaryDisorder.includes('اسیدوز تنفسی'),
        `(got: ${r.primaryDisorder})`);

    // آلکالوز تنفسی
    r = runAcidBaseInterpretation({ ph: 7.55, paco2: 25, hco3: 24, be: 0 }, ranges, false);
    check('آلکالوز تنفسی تشخیص داده شد', r.primaryDisorder.includes('آلکالوز تنفسی'),
        `(got: ${r.primaryDisorder})`);

    // آلکالوز متابولیک
    r = runAcidBaseInterpretation({ ph: 7.50, paco2: 45, hco3: 34, be: 8 }, ranges, false);
    check('آلکالوز متابولیک تشخیص داده شد', r.primaryDisorder.includes('آلکالوز متابولیک'),
        `(got: ${r.primaryDisorder})`);

    // وضعیت نرمال
    r = runAcidBaseInterpretation({ ph: 7.40, paco2: 40, hco3: 24, be: 0 }, ranges, false);
    check('وضعیت نرمال اسید-باز تشخیص داده شد', r.primaryDisorder === 'وضعیت نرمال اسید-باز',
        `(got: ${r.primaryDisorder})`);

    // مختلط: اسیدوز متابولیک و تنفسی
    r = runAcidBaseInterpretation({ ph: 7.10, paco2: 60, hco3: 15, be: -12 }, ranges, false);
    check('اسیدوز مختلط متابولیک و تنفسی تشخیص داده شد', r.primaryDisorder.includes('مختلط'),
        `(got: ${r.primaryDisorder})`);

    // داده ناقص
    r = runAcidBaseInterpretation({ ph: null, paco2: 40, hco3: 24, be: 0 }, ranges, false);
    check('داده ناقص به‌درستی مدیریت شد', r.primaryDisorder === 'داده‌های ناکافی',
        `(got: ${r.primaryDisorder})`);
}

// ============ ۳. آنیون گپ ============
section('Anion Gap');
{
    check('AG صحیح محاسبه شد (140 - (100+24) = 16)', calculateAnionGap(140, 100, 24) === 16);
    check('AG با ورودی null برابر null', calculateAnionGap(140, null, 24) === null);

    // AG اصلاح‌شده: albumin نرمال → بدون تغییر
    check('Adj AG با آلبومین نرمال تغییر نمی‌کند', calculateAdjustedAnionGap(12, 4.0) === 12);
    // آلبومین 2.0 → AG + 2.5*(4-2) = AG + 5
    check('Adj AG با هیپوآلبومینمی افزایش می‌یابد', approx(calculateAdjustedAnionGap(12, 2.0), 17),
        `(got: ${calculateAdjustedAnionGap(12, 2.0)})`);

    // Delta Gap: AG=24, HCO3=12 → (24-12)/(24-12) = 1.0
    check('Delta Gap صحیح محاسبه شد', approx(calculateDeltaGap(24, 12), 1.0),
        `(got: ${calculateDeltaGap(24, 12)})`);
    check('Delta Gap برای HCO3 نرمال برابر null', calculateDeltaGap(12, 24) === null);
}

// ============ ۴. تفسیر متابولیک ============
section('interpretMetabolicAcidosis');
{
    let res = interpretMetabolicAcidosis({ ag: 24, hco3: 12, adjAg: 24, isMetabolicAcidosis: true });
    check('AG بالا تشخیص داده شد', res.agState === 'high', `(got: ${res.agState})`);
    check('Delta Gap برای اسیدوز محاسبه شد', res.deltaGap !== null);

    res = interpretMetabolicAcidosis({ ag: 10, hco3: 18, adjAg: 10, isMetabolicAcidosis: true });
    check('AG نرمال (هایپرکلرمیک) تشخیص داده شد', res.agState === 'normal', `(got: ${res.agState})`);
}

// ============ ۵. محاسبات ونتیلاتور ============
section('Ventilator formulas');
{
    // PBW مرد قد 175: 50 + 0.91*(175-152.4) = 50 + 20.566 = 70.57
    check('PBW مرد صحیح محاسبه شد', approx(calculatePBW(175, 'male'), 70.57, 0.1),
        `(got: ${calculatePBW(175, 'male')})`);
    // PBW زن قد 165: 45.5 + 0.91*(165-152.4) = 45.5 + 11.466 = 56.97
    check('PBW زن صحیح محاسبه شد', approx(calculatePBW(165, 'female'), 56.97, 0.1),
        `(got: ${calculatePBW(165, 'female')})`);
    check('PBW با قد نامعتبر برابر null', calculatePBW(90, 'male') === null);

    // P/F: PaO2=80, FiO2=40% → 80/0.4 = 200
    check('P/F Ratio صحیح محاسبه شد', calculatePFRatio(80, 40) === 200,
        `(got: ${calculatePFRatio(80, 40)})`);
    check('P/F با FiO2 صفر برابر null', calculatePFRatio(80, 0) === null);

    // Driving Pressure: 25 - 10 = 15
    check('فشار محرکه صحیح محاسبه شد', calculateDrivingPressure(25, 10) === 15);
}

// ============ خلاصه ============
console.log(`\n${'='.repeat(40)}`);
console.log(`نتیجه: ${passed} موفق، ${failed} ناموفق (مجموع ${passed + failed})`);
if (failed > 0) {
    console.log('\nموارد ناموفق:');
    failures.forEach(f => console.log(`  - ${f}`));
    process.exit(1);
} else {
    console.log('✅ همهٔ تست‌ها با موفقیت گذشتند.');
    process.exit(0);
}
