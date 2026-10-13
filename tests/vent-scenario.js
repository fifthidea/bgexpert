// سناریوی end-to-end بخش ونتیلاتور برای هر ۵ مود، با تأکید روی هماهنگی
// getVentilatorRecommendations (ventilator.js) و renderVentilatorRecommendationsHtml (renderer.js).
// اجرا: NODE_OPTIONS="" node tests/vent-scenario.js
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.join(__dirname, '..', 'js');

const sandbox = {};
sandbox.window = sandbox;
sandbox.console = console;
sandbox.document = {
    querySelector: () => ({ value: 'abg' }),
    getElementById: () => null,
};
// helper زبان (در محیط واقعی از i18n.js می‌آید)؛ اینجا پیش‌فرض فارسی
sandbox.currentLang = 'fa';
sandbox.L = function (fa, en) { return sandbox.currentLang === 'en' ? en : fa; };
vm.createContext(sandbox);
['constants.js','vbg_core.js','metabolic.js','ventilator.js','renderer.js'].forEach(f =>
    vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), sandbox, { filename: f }));

const { getVentilatorRecommendations, renderVentilatorRecommendationsHtml } = sandbox;
let ok = true;

function scenario(name, primaryDisorder, abg, vent) {
    console.log(`\n▶ ${name} (mode=${vent.ventMode})`);
    try {
        // ۱) لایهٔ منطق
        const r = getVentilatorRecommendations(primaryDisorder, abg, vent);
        if (!r || !Array.isArray(r.recommendations)) { ok = false; console.log('  ❌ ساختار خروجی نامعتبر'); return; }
        console.log(`  توصیه‌ها: ${r.recommendations.length} | تنظیمات پیشنهادی: ${JSON.stringify(r.suggestedSettings)}`);
        if (r.derivedData) {
            const d = r.derivedData;
            console.log(`  PBW=${d.pbw?.toFixed(1)} | vt/kg=${d.vtPerKg?.toFixed(1)} | P/F=${d.pfRatio?.toFixed(0)} | ΔP=${d.drivingPressure?.toFixed(1)}`);
        }
        // ۲) لایهٔ رندر (همان دادهٔ ورودی که abg.js می‌سازد)
        const data = Object.assign({}, abg, vent);
        const html = renderVentilatorRecommendationsHtml(true, { primaryDisorder }, data);
        if (typeof html === 'string' && html.includes('پیشنهادات تنظیم ونتیلاتور') && !html.includes('خطا در تولید')) {
            console.log('  ✅ HTML رندر شد و شامل جدول تنظیمات است');
        } else if (html.includes('خطا')) {
            ok = false; console.log('  ❌ HTML شامل پیام خطاست');
        } else {
            ok = false; console.log('  ❌ HTML ناقص');
        }
    } catch (e) { ok = false; console.log(`  ❌ استثنا: ${e.message}`); }
}

// AC-VC: اسیدوز تنفسی، حجم بالا
scenario('اسیدوز تنفسی + حجم بالا', 'اسیدوز تنفسی حاد',
    { ph: 7.25, paco2: 60, pao2: 70, spo2: 92 },
    { ventMode: 'AC-VC', tv: 600, rate: 12, peep: 5, ventFio2: 60, pplat: 32, height: 175, gender: 'male' });

// AC-PC: هیپوکسمی شدید (ARDS)
scenario('ARDS شدید', 'اسیدوز تنفسی مزمن',
    { ph: 7.30, paco2: 50, pao2: 55, spo2: 85 },
    { ventMode: 'AC-PC', pressureSetting: 28, measuredVt: 400, rate: 18, peep: 12, ventFio2: 90, height: 170, gender: 'female' });

// SIMV: نرمال
scenario('وضعیت پایدار', 'وضعیت نرمال اسید-باز',
    { ph: 7.40, paco2: 40, pao2: 95, spo2: 97 },
    { ventMode: 'SIMV', tv: 420, rate: 14, peep: 5, ventFio2: 35, pplat: 20, height: 168, gender: 'female' });

// PSV: آلکالوز تنفسی
scenario('آلکالوز تنفسی', 'آلکالوز تنفسی حاد',
    { ph: 7.52, paco2: 28, pao2: 100, spo2: 99 },
    { ventMode: 'PSV', pressureSetting: 15, measuredVt: 500, peep: 5, ventFio2: 40, height: 180, gender: 'male' });

// CPAP
scenario('CPAP', 'وضعیت نرمال اسید-باز',
    { ph: 7.38, paco2: 42, pao2: 88, spo2: 95 },
    { ventMode: 'CPAP', peep: 8, ventFio2: 40, height: 175, gender: 'male' });

// داده ناقص: مود وارد نشده
console.log('\n▶ داده ناقص (بدون مود)');
try {
    const r = getVentilatorRecommendations('اسیدوز متابولیک', { ph: 7.3, paco2: 30 }, { ventMode: null });
    if (r.recommendations[0] && r.recommendations[0].title.includes('ناقص')) console.log('  ✅ پیام دادهٔ ناقص درست بازگشت');
    else { ok = false; console.log('  ❌ مدیریت دادهٔ ناقص اشتباه'); }
} catch (e) { ok = false; console.log(`  ❌ ${e.message}`); }

console.log('\n' + '='.repeat(40));
console.log(ok ? '✅ همهٔ سناریوهای ونتیلاتور موفق.' : '❌ مشکل در سناریوی ونتیلاتور.');
process.exit(ok ? 0 : 1);
