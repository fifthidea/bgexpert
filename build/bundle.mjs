// build/bundle.mjs
// باندلر بدون‌وابستگی برای بیلد WebView اندروید (الگوی PediCalc).
//
// چرا: بارگذاری چند فایل <script src> جدا از file:///android_asset/ گاهی در
// WebView اندروید ناپایدار است (ترتیب بارگذاری، کش، یا فایل‌های جامانده).
// این اسکریپت همهٔ فایل‌های js/ را — به ترتیب درست — در یک فایل کلاسیک واحد
// (dist/app.bundle.js) الحاق می‌کند تا در هر WebViewی بدون وابستگی اجرا شود.
//
// اجرا:  node build/bundle.mjs

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

// ترتیب بارگذاری — دقیقاً مطابق ترتیب <script> در index.html.
// i18n اول است چون window.L و window.currentLang را برای سایر فایل‌ها فراهم می‌کند.
const FILE_ORDER = [
    'js/i18n.js',
    'js/Pay.js',
    'js/constants.js',
    'js/vbg_core.js',
    'js/metabolic.js',
    'js/ventilator.js',
    'js/renderer.js',
    'js/abg.js',
    'js/ui.js'
];

const banner =
`// dist/app.bundle.js — فایل تولیدشده، دستی ویرایش نکنید.
// از فایل‌های js/ توسط build/bundle.mjs برای WebView اندروید ساخته شده است
// (یک اسکریپت کلاسیک واحد که از file:///android_asset/ اجرا می‌شود).
// بازسازی:  node build/bundle.mjs
`;

const parts = [banner];

for (const rel of FILE_ORDER) {
    const code = readFileSync(join(root, rel), 'utf8').trimEnd();
    parts.push(`// ===== ${rel} =====`);
    parts.push(code);
    parts.push('');
}

const outPath = join(root, 'dist', 'app.bundle.js');
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, parts.join('\n'), 'utf8');

console.log(`Bundled ${FILE_ORDER.length} files -> dist/app.bundle.js`);
