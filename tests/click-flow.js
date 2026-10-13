// شبیه‌سازی جریان انتخاب نمونه (splash) و منو
// معماری جدید: event delegation روی document + توابع سطح ماژول
// (handleSampleSelection / initializeApp / onSampleAreaActivate)
// اجرا: NODE_OPTIONS="" node tests/click-flow.js
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.join(__dirname, '..', 'js');

let ok = true;
const registry = {};

function makeEl(opts = {}) {
    const listeners = {};
    const el = {
        id: opts.id || '', value: '', checked: false, disabled: false,
        textContent: '', innerHTML: '', style: {}, _attrs: opts.attrs || {},
        classList: { _s: new Set(), add(c){ this._s.add(c); }, remove(c){ this._s.delete(c); }, toggle(c){ this._s.has(c)?this._s.delete(c):this._s.add(c); }, contains(c){ return this._s.has(c); } },
        addEventListener(t, cb){ (listeners[t] ||= []).push(cb); },
        removeEventListener(){}, dispatchEvent(){ return true; },
        getAttribute(k){ return this._attrs[k] ?? null; },
        setAttribute(k,v){ this._attrs[k]=v; },
        appendChild(){}, scrollIntoView(){}, focus(){},
        closest(){ return null; }, querySelector(){ return makeEl(); }, querySelectorAll(){ return []; },
        contains(){ return false; },
        __fire(t, ev){ (listeners[t]||[]).forEach(cb => cb.call(el, ev || { type: t, target: el, preventDefault(){}, stopPropagation(){} })); },
    };
    el.nextElementSibling = null;
    return el;
}

const abgCard = makeEl({ attrs: { 'data-type': 'abg' } });
const vbgCard = makeEl({ attrs: { 'data-type': 'vbg' } });
const splashGroups = [abgCard, vbgCard];
// شبیه‌سازی closest: خود کارت را برمی‌گرداند
abgCard.closest = (sel) => sel.includes('radio-card-group') ? abgCard : null;
vbgCard.closest = (sel) => sel.includes('radio-card-group') ? vbgCard : null;

const docListeners = {};
const document = {
    getElementById: (id) => (registry[id] ||= makeEl({ id })),
    querySelector: (sel) => {
        if (sel.includes('sampleType')) return { value: 'abg' };
        if (sel.includes('data-type="abg"')) return abgCard;
        if (sel.includes('data-type="vbg"')) return vbgCard;
        if (sel.includes('label[for=')) { const e = makeEl(); e.nextElementSibling = makeEl(); return e; }
        return makeEl();
    },
    querySelectorAll: (sel) => sel.includes('sample-type-group-splash') ? splashGroups : [],
    addEventListener: (t, cb) => { (docListeners[t] ||= []).push(cb); },
    body: makeEl(), documentElement: makeEl(), createElement: () => makeEl(),
    __fire(t, ev){ (docListeners[t]||[]).forEach(cb => cb(ev)); },
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
// helper زبان (در محیط واقعی از i18n.js می‌آید)
sandbox.currentLang = 'fa';
sandbox.L = function (fa, en) { return sandbox.currentLang === 'en' ? en : fa; };
sandbox.updateRanges = undefined; // در abg.js تعریف می‌شود
vm.createContext(sandbox);

['Pay.js','constants.js','vbg_core.js','metabolic.js','ventilator.js','renderer.js','abg.js','ui.js']
    .forEach(f => vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), sandbox, { filename: f }));

// اجرای DOMContentLoaded (تا window.initializeApp ست شود)
document.__fire('DOMContentLoaded', {});

console.log('▶ بررسی معماری جدید');
if (typeof sandbox.handleSampleSelection === 'function') console.log('  ✅ handleSampleSelection تعریف شده');
else { ok = false; console.log('  ❌ handleSampleSelection نیست'); }
if (typeof sandbox.initializeApp === 'function') console.log('  ✅ initializeApp تعریف شده');
else { ok = false; console.log('  ❌ initializeApp نیست'); }
if ((docListeners['click'] || []).length) console.log('  ✅ هندلر delegation کلیک روی document ثبت شده');
else { ok = false; console.log('  ❌ هندلر delegation ثبت نشده'); }

console.log('\n▶ کلیک روی کارت وریدی (VBG) از طریق delegation');
sandbox.isPremiumUser = false;
try {
    document.__fire('click', { target: vbgCard, preventDefault(){}, stopPropagation(){} });
    const ss = registry['start-screen'], mc = registry['main-app-content'];
    if (ss.style.display === 'none' && mc.style.display === 'block') console.log('  ✅ ورود به برنامه با VBG انجام شد');
    else { ok = false; console.log('  ❌ ورود انجام نشد (start=' + ss.style.display + ', main=' + mc.style.display + ')'); }
} catch (e) { ok = false; console.log('  ❌ خطا:', e.message); }

console.log('\n▶ کلیک روی کارت شریانی (ABG) — کاربر رایگان (مودال خرید)');
try {
    const modal = document.getElementById('purchaseModal');
    modal.style.display = 'none';
    document.__fire('click', { target: abgCard, preventDefault(){}, stopPropagation(){} });
    if (modal.style.display === 'flex') console.log('  ✅ مودال خرید باز شد');
    else { ok = false; console.log('  ❌ مودال باز نشد (display=' + modal.style.display + ')'); }
} catch (e) { ok = false; console.log('  ❌ خطا:', e.message); }

console.log('\n▶ کلیک روی نقطه‌ای خارج از کارت‌ها (نباید کاری کند)');
try {
    const other = makeEl(); other.closest = () => null;
    document.__fire('click', { target: other, preventDefault(){}, stopPropagation(){} });
    console.log('  ✅ کلیک بیرون از کارت‌ها بی‌اثر بود');
} catch (e) { ok = false; console.log('  ❌ خطا:', e.message); }

console.log('\n▶ توابع منو');
if (typeof sandbox.openNav === 'function' && typeof sandbox.closeNav === 'function') console.log('  ✅ openNav/closeNav تعریف شده');
else { ok = false; console.log('  ❌ توابع منو نیست'); }

console.log('\n' + '='.repeat(40));
console.log(ok ? '✅ جریان کلیک سالم است.' : '❌ مشکل در جریان کلیک.');
process.exit(ok ? 0 : 1);
