// تست سیستم چندزبانه (i18n) — الگوی PediCalc (window.ABGI18n)
// اجرا: NODE_OPTIONS="" node tests/i18n.test.js
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.join(__dirname, '..', 'js');

let ok = true, passed = 0;
function check(name, cond, extra = '') {
    if (cond) { passed++; console.log('  ✅ ' + name); }
    else { ok = false; console.log('  ❌ ' + name + ' ' + extra); }
}

// --- DOM ساختگی با پشتیبانی data-i18n / data-i18n-aria ---
function makeEl(attrs) {
    return {
        _attrs: attrs || {}, textContent: '',
        _l: {},
        getAttribute(k) { return this._attrs[k] != null ? this._attrs[k] : null; },
        setAttribute(k, v) { this._attrs[k] = v; },
        addEventListener(type, cb) { (this._l[type] = this._l[type] || []).push(cb); },
        click() { (this._l['click'] || []).forEach(fn => fn()); },
        classList: { _s: {}, add(c) { this._s[c] = 1; }, remove(c) { delete this._s[c]; }, contains(c) { return !!this._s[c]; } }
    };
}
const h1 = makeEl({ 'data-i18n': 'splash.title' });
const vbg = makeEl({ 'data-i18n': 'sample.vbg' });
const submit = makeEl({ 'data-i18n': 'btn.submit' });
const langLabel = makeEl({ id: 'lang-toggle-label', 'data-i18n': 'header.lang' });
const langBtn = makeEl({ id: 'lang-toggle-btn', 'data-i18n-aria': 'header.langAria' });
const byI18n = { 'splash.title': [h1], 'sample.vbg': [vbg], 'btn.submit': [submit], 'header.lang': [langLabel] };
const allI18n = [h1, vbg, submit, langLabel];
const ariaEls = [langBtn];

let store = {};
const documentEl = { lang: '', dir: '' };
const document = {
    documentElement: documentEl,
    body: { classList: { _s: {}, add(c) { this._s[c] = 1; }, remove(c) { delete this._s[c]; } } },
    querySelectorAll: (sel) => {
        if (sel === '[data-i18n]') return allI18n;
        if (sel === '[data-i18n-aria]') return ariaEls;
        return [];
    },
    getElementById: (id) => id === 'lang-toggle-btn' ? langBtn : (id === 'lang-toggle-label' ? langLabel : null),
    addEventListener: () => {},
    readyState: 'complete'
};
const sandbox = {
    document, console,
    localStorage: { getItem: (k) => store[k] || null, setItem: (k, v) => { store[k] = v; }, removeItem: (k) => { delete store[k]; } }
};
sandbox.window = sandbox;
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'i18n.js'), 'utf8'), sandbox, { filename: 'i18n.js' });

const I = sandbox.window.ABGI18n;

console.log('▶ API در دسترس است');
check('window.ABGI18n موجود است', I && typeof I.t === 'function');
check('window.L موجود است', typeof sandbox.window.L === 'function');
check('toggleLang / setLang موجودند', typeof I.toggleLang === 'function' && typeof I.setLang === 'function');

console.log('\n▶ مقداردهی اولیه (پیش‌فرض فارسی)');
check('زبان فعلی فارسی است', I.getLang() === 'fa', '(=' + I.getLang() + ')');
check('عنوان فارسی اعمال شد', h1.textContent.indexOf('اپلیکیشن') === 0, '(=' + h1.textContent + ')');
check('جهت rtl است', documentEl.dir === 'rtl', '(=' + documentEl.dir + ')');
check('برچسب دکمه EN است', langLabel.textContent === 'EN', '(=' + langLabel.textContent + ')');
check('aria دکمه اعمال شد', langBtn.getAttribute('aria-label') && langBtn.getAttribute('aria-label').length > 0);

console.log('\n▶ تغییر به انگلیسی با toggleLang()');
I.toggleLang();
check('زبان en شد', I.getLang() === 'en');
check('عنوان انگلیسی شد', h1.textContent === 'Smart Advanced Blood Gas Analysis (ABG/VBG)', '(=' + h1.textContent + ')');
check('VBG انگلیسی شد', vbg.textContent === 'Venous Blood Gas (VBG)', '(=' + vbg.textContent + ')');
check('Submit انگلیسی شد', submit.textContent === 'Analyze results', '(=' + submit.textContent + ')');
check('جهت ltr شد', documentEl.dir === 'ltr');
check('برچسب دکمه فا شد', langLabel.textContent === 'فا', '(=' + langLabel.textContent + ')');
check('در localStorage ذخیره شد', store['abg_lang'] === 'en');
check('L انگلیسی برمی‌گرداند', sandbox.window.L('سلام', 'Hello') === 'Hello');

console.log('\n▶ کلیک روی دکمه (addEventListener) — بازگشت به فارسی');
langBtn.click();
check('زبان fa شد', I.getLang() === 'fa');
check('عنوان دوباره فارسی شد', h1.textContent.indexOf('اپلیکیشن') === 0);
check('جهت rtl شد', documentEl.dir === 'rtl');
check('L فارسی برمی‌گرداند', sandbox.window.L('سلام', 'Hello') === 'سلام');

console.log('\n▶ listener سفارشی (onLangChange)');
var fired = 0;
I.onLangChange(function () { fired++; });
I.toggleLang();
check('listener هنگام تغییر زبان صدا زده شد', fired === 1, '(fired=' + fired + ')');

console.log('\n▶ t() برای کلید ناموجود، خود کلید را برمی‌گرداند');
check('fallback به کلید', I.t('no.such.key') === 'no.such.key');

console.log('\n' + '='.repeat(40));
console.log(ok ? ('✅ همهٔ ' + passed + ' تست i18n موفق.') : '❌ برخی تست‌های i18n ناموفق.');
process.exit(ok ? 0 : 1);
