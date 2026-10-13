// tests/bundle.smoke.mjs
// بررسی سلامت dist/app.bundle.js: نحو صحیح، نبود import/export، و اجرای بدون خطا
// در یک DOM ساختگی با تعریف شدن توابع کلیدی (i18n + منطق پزشکی).
// اجرا: node tests/bundle.smoke.mjs   (پس از node build/bundle.mjs)
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const code = readFileSync(join(root, 'dist', 'app.bundle.js'), 'utf8');

let ok = true;
function check(name, cond, extra = '') {
    if (cond) console.log('  ✅ ' + name);
    else { ok = false; console.log('  ❌ ' + name + ' ' + extra); }
}

console.log('▶ بررسی محتوای bundle');
check('bundle خالی نیست', code.length > 1000);
check('بدون import/export (سازگار با WebView)', !/^\s*(import|export)\s/m.test(code), '— نباید ES-module باشد');

// --- DOM ساختگی سبک ---
const listeners = {};
function makeEl(id) {
    const l = {};
    return {
        id: id || '', value: '', checked: false, disabled: false, textContent: '', innerHTML: '',
        style: {}, _attrs: {},
        classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
        addEventListener(t, cb) { (l[t] = l[t] || []).push(cb); },
        removeEventListener() {}, dispatchEvent() { return true; },
        setAttribute(k, v) { this._attrs[k] = v; }, getAttribute(k) { return this._attrs[k] ?? null; },
        appendChild() {}, closest() { return null; }, querySelector() { return makeEl(); },
        querySelectorAll() { return []; }, scrollIntoView() {}, focus() {}, click() {}
    };
}
const cache = {};
const document = {
    getElementById: (id) => (cache[id] = cache[id] || makeEl(id)),
    querySelector: (sel) => sel.includes('sampleType') ? { value: 'abg' } : makeEl(),
    querySelectorAll: () => [],
    addEventListener: (t, cb) => { (listeners[t] = listeners[t] || []).push(cb); },
    body: makeEl(), documentElement: { lang: '', dir: '', setAttribute() {}, classList: { add() {}, remove() {} } },
    createElement: () => makeEl(), readyState: 'complete'
};

const sandbox = {};
sandbox.window = sandbox;
sandbox.document = document;
sandbox.console = console;
sandbox.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
sandbox.alert = () => {};
sandbox.setTimeout = (fn) => { try { fn(); } catch (e) {} return 0; };
sandbox.clearTimeout = () => {};
sandbox.navigator = { vibrate: () => {} };
sandbox.innerWidth = 1200;
sandbox.addEventListener = () => {};
sandbox.Event = function (t) { this.type = t; };
vm.createContext(sandbox);

console.log('\n▶ اجرای bundle در محیط ساختگی');
try {
    vm.runInContext(code, sandbox, { filename: 'app.bundle.js' });
    console.log('  ✅ bundle بدون خطای اجرایی اجرا شد');
} catch (e) {
    ok = false;
    console.log('  ❌ خطای اجرایی در bundle: ' + e.message);
}

console.log('\n▶ توابع کلیدی پس از اجرای bundle');
check('window.ABGI18n تعریف شده', sandbox.window.ABGI18n && typeof sandbox.window.ABGI18n.toggleLang === 'function');
check('window.L تعریف شده', typeof sandbox.window.L === 'function');
check('توابع پزشکی موجودند', typeof sandbox.getVentilatorRecommendations === 'function' && typeof sandbox.interpretABG === 'function');
check('window.toggleLanguage یا ABGI18n.toggleLang', typeof sandbox.window.ABGI18n.toggleLang === 'function');

console.log('\n' + '='.repeat(40));
console.log(ok ? '✅ bundle سالم است.' : '❌ مشکل در bundle.');
process.exit(ok ? 0 : 1);
