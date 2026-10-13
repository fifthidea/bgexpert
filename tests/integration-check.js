// بررسی یکپارچگی: شبیه‌سازی حداقلی DOM و بارگذاری همهٔ اسکریپت‌ها به ترتیب index.html
// هدف: اطمینان از نبود خطای اجرایی سطح-ماژول و اتصال درست رویدادها/توابع.
// اجرا: NODE_OPTIONS="" node tests/integration-check.js
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..', 'js');

function makeEl(id) {
    const listeners = {};
    const el = {
        id: id || '', value: '', checked: false, disabled: false,
        textContent: '', innerHTML: '', className: '', style: {}, dataset: {},
        classList: { add(){}, remove(){}, toggle(){}, contains(){ return false; } },
        addEventListener(type, cb){ (listeners[type] ||= []).push(cb); },
        removeEventListener(){}, dispatchEvent(){ return true; },
        appendChild(){}, setAttribute(){}, getAttribute(){ return null; },
        closest(){ return makeEl(); }, querySelector(){ return makeEl(); },
        querySelectorAll(){ return []; }, scrollIntoView(){},
        contains(){ return false; }, focus(){}, __listeners: listeners,
    };
    el.nextElementSibling = null;
    return el;
}

const elCache = {};
function getById(id) {
    if (!(id in elCache)) elCache[id] = makeEl(id);
    return elCache[id];
}

const pendingDCL = [];
const document = {
    getElementById: (id) => getById(id),
    querySelector: (sel) => {
        if (sel.includes('sampleType')) return { value: 'abg' };
        if (sel.includes('label[for=')) { const e = makeEl(); e.closest = () => makeEl(); e.nextElementSibling = makeEl(); return e; }
        return makeEl();
    },
    querySelectorAll: () => [],
    addEventListener: (type, cb) => { if (type === 'DOMContentLoaded') pendingDCL.push(cb); },
    body: makeEl(), documentElement: makeEl(), createElement: () => makeEl(),
};

const sandbox = {};
sandbox.window = sandbox;
sandbox.document = document;
sandbox.console = console;
sandbox.localStorage = { getItem: () => null, setItem(){}, removeItem(){} };
sandbox.alert = () => {};
sandbox.setTimeout = (fn) => { try { fn(); } catch(e){} return 0; };
sandbox.clearTimeout = () => {};
sandbox.navigator = { vibrate: () => {} };
sandbox.innerWidth = 1200;
sandbox.addEventListener = () => {};
sandbox.Event = function(t){ this.type = t; };
vm.createContext(sandbox);

const files = ['i18n.js','Pay.js','constants.js','vbg_core.js','metabolic.js','ventilator.js','renderer.js','abg.js','ui.js'];
let ok = true;
console.log('▶ بارگذاری اسکریپت‌ها');
for (const f of files) {
    try {
        vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), sandbox, { filename: f });
        console.log(`  ✅ ${f}`);
    } catch (e) { ok = false; console.log(`  ❌ ${f}: ${e.message}`); }
}

console.log('\n▶ اجرای DOMContentLoaded handlers');
for (const cb of pendingDCL) {
    try { cb({}); console.log('  ✅ handler اجرا شد'); }
    catch (e) { ok = false; console.log(`  ❌ handler: ${e.message}`); }
}

console.log('\n▶ بررسی توابع کلیدی');
const required = ['getNormalRanges','runAcidBaseInterpretation','calculateAnionGap',
    'interpretMetabolicAcidosis','getVentilatorRecommendations','calculatePBW',
    'renderVentilatorRecommendationsHtml','renderMetabolicAnalysisHtml','interpretABG',
    'updatePremiumStatus','validateInputs'];
for (const fn of required) {
    if (typeof sandbox[fn] === 'function') console.log(`  ✅ ${fn}`);
    else { ok = false; console.log(`  ❌ ${fn} تعریف نشده!`); }
}

console.log('\n▶ سناریوی end-to-end (interpretABG)');
try {
    const res = sandbox.interpretABG({
        ph: 7.30, paco2: 20, hco3: 9, pao2: 90, spo2: 96, be: -15,
        age: 50, height: 175, gender: 'male',
        calculateAAGradient: true, isOnVentilator: false, ventFio2: null,
        aagradientFio2: 21, sodium: 140, chloride: 100, albumin: 4.0
    });
    console.log(`  تشخیص: ${res.finalDiagnosis}`);
    console.log(`  AG: ${res.ag}, A-a: ${res.aaGradient !== null ? res.aaGradient.toFixed(0) : 'null'}`);
    if (res.finalDiagnosis && res.ag !== null) console.log('  ✅ خروجی کامل تولید شد');
    else { ok = false; console.log('  ❌ خروجی ناقص'); }
} catch (e) { ok = false; console.log(`  ❌ خطا: ${e.message}`); }

console.log('\n' + '='.repeat(40));
console.log(ok ? '✅ یکپارچگی کامل تأیید شد.' : '❌ مشکل یکپارچگی وجود دارد.');
process.exit(ok ? 0 : 1);
