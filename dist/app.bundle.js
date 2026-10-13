// dist/app.bundle.js — فایل تولیدشده، دستی ویرایش نکنید.
// از فایل‌های js/ توسط build/bundle.mjs برای WebView اندروید ساخته شده است
// (یک اسکریپت کلاسیک واحد که از file:///android_asset/ اجرا می‌شود).
// بازسازی:  node build/bundle.mjs

// ===== js/i18n.js =====
// ===== START: i18n.js (الگوی PediCalc — سبک، بدون وابستگی، ES5 سازگار با WebView) =====
// این فایل عیناً از الگوی موفق PediCalc پیروی می‌کند:
//   - رشته‌های UI در دیکشنری STRINGS با کلید نگهداری می‌شوند و با t(key) خوانده می‌شوند.
//   - سیستم listener (onLangChange) که هنگام تغییر زبان، UI را دوباره اعمال می‌کند.
//   - دکمهٔ زبان با addEventListener('click') وصل می‌شود (نه onclick درون‌خطی).
//   - applyStaticTranslations همهٔ عناصر [data-i18n]/[data-i18n-aria]/... را ترجمه می‌کند.
//   - toggleLang() -> setLang() -> اعمال dir/lang + اطلاع به listenerها.

(function () {
    var STORAGE_KEY = 'abg_lang';
    var DEFAULT_LANG = 'fa';           // این اپ فارسی‌محور است؛ پیش‌فرض فارسی
    var SUPPORTED = ['fa', 'en'];

    var currentLang = DEFAULT_LANG;
    var listeners = [];

    // دیکشنری رشته‌های UI — کلید-محور (مثل PediCalc). fa و en هر دو موجودند.
    var STRINGS = {
        'splash.title':    { fa: 'اپلیکیشن هوشمند تحلیل پیشرفته گازهای خون (ABG/VBG)', en: 'Smart Advanced Blood Gas Analysis (ABG/VBG)' },
        'splash.subtitle': { fa: 'لطفاً نوع نمونه خون را انتخاب کنید', en: 'Please select the blood sample type' },
        'sample.abg':      { fa: 'نمونه خون شریانی (ABG)', en: 'Arterial Blood Gas (ABG)' },
        'sample.vbg':      { fa: 'نمونه خون وریدی (VBG)', en: 'Venous Blood Gas (VBG)' },
        'premium.label':   { fa: 'ویژه نسخه حرفه‌ای', en: 'Pro version' },
        'free.label':      { fa: '۱ بار تست رایگان', en: '1 free trial' },
        'premium.lockedSection': { fa: 'ویژه نسخه حرفه‌ای', en: 'Pro version only' },
        'premium.lockedHint':    { fa: 'برای باز شدن، نسخه حرفه‌ای را تهیه کنید', en: 'Purchase the Pro version to unlock' },

        'menu.title':      { fa: 'منو', en: 'Menu' },
        'menu.medmate':    { fa: 'دانلود اپلیکیشن محاسبات دارویی', en: 'Download drug-calculation app' },
        'menu.edu':        { fa: 'دانلود محصولات آموزشی', en: 'Download educational products' },
        'menu.video':      { fa: 'آموزش اورژانس و مراقبت‌های ویژه', en: 'Emergency & Critical Care training' },
        'menu.about':      { fa: 'درباره ما', en: 'About us' },

        'card.patient':    { fa: 'اطلاعات بیمار', en: 'Patient Information' },
        'card.bloodgas':   { fa: 'پارامترهای اصلی گاز خون', en: 'Primary Blood Gas Parameters' },
        'card.metabolic':  { fa: 'آنالیز متابولیک (الکترولیت‌ها)', en: 'Metabolic Analysis (Electrolytes)' },
        'card.ventilator': { fa: 'وضعیت دستگاه تنفس', en: 'Ventilator Status' },
        'card.aagradient': { fa: 'محاسبات اکسیژن‌رسانی (A-a Gradient)', en: 'Oxygenation (A-a Gradient)' },
        'card.operations': { fa: 'عملیات فرم', en: 'Form Actions' },
        'card.report':     { fa: 'گزارش تحلیل', en: 'Analysis Report' },

        'btn.reset':       { fa: 'پاک کردن فرم', en: 'Clear form' },
        'btn.submit':      { fa: 'تحلیل نتایج', en: 'Analyze results' },

        'lbl.age':         { fa: 'سن', en: 'Age' },
        'lbl.height':      { fa: 'قد', en: 'Height' },
        'lbl.gender':      { fa: 'جنسیت', en: 'Gender' },
        'opt.male':        { fa: 'مرد', en: 'Male' },
        'opt.female':      { fa: 'زن', en: 'Female' },
        'help.pbw':        { fa: 'برای محاسبه گرادیان A-a و وزن ایده‌آل (PBW)', en: 'For A-a gradient and Predicted Body Weight (PBW)' },
        'lbl.albumin':     { fa: 'آلبومین', en: 'Albumin' },
        'lbl.onVent':      { fa: 'بیمار به [ونتیلاتور] متصل است', en: 'Patient is connected to a [ventilator]' },
        'lbl.ventMode':    { fa: 'مود ونتیلاتور (Mode)', en: 'Ventilator Mode' },
        'lbl.rate':        { fa: 'نرخ (RR)', en: 'Rate (RR)' },
        'lbl.tv':          { fa: 'حجم جاری (TV)', en: 'Tidal Volume (TV)' },
        'lbl.pplat':       { fa: 'فشار پلاتو (P.Plateau)', en: 'Plateau Pressure (P.Plateau)' },
        'lbl.measuredVt':  { fa: 'حجم جاری اندازه‌گیری شده', en: 'Measured Tidal Volume' },
        'lbl.calcAa':      { fa: 'محاسبه اختلاف فشار آلوئولار-شریانی (A-a gradient)', en: 'Calculate Alveolar–arterial (A-a) gradient' },

        // برچسب دکمهٔ زبان: زبان مقصد را نشان می‌دهد (مثل PediCalc: header.lang)
        'header.lang':     { fa: 'EN', en: 'فا' },
        'header.langAria': { fa: 'تغییر به انگلیسی', en: 'Switch to Persian' },

        // واحدها و متن‌های راهنما
        'unit.year':       { fa: 'سال', en: 'yr' },
        'metabolic.hint':  { fa: 'پارامترهای زیر برای محاسبه آنیون گپ (AG) استفاده می‌شوند:', en: 'The parameters below are used to calculate the Anion Gap (AG):' },
        'vent.enterParams':{ fa: 'پارامترهای فعلی ونتیلاتور را وارد کنید:', en: 'Enter the current ventilator parameters:' },
        'vent.selectMode': { fa: 'انتخاب کنید...', en: 'Select...' },
        'vent.forVentAa':  { fa: 'برای ونتیلاتور و A-a', en: 'For ventilator & A-a' },
        'vent.pcPsvHint':  { fa: 'برای PC/PSV، TV حاصل را وارد کنید.', en: 'For PC/PSV, enter the resulting TV.' },
        'vent.cpapHint':   { fa: 'در مود CPAP/PSV، Rate (نرخ تنفس) به طور عمده توسط بیمار کنترل می‌شود.', en: 'In CPAP/PSV mode, the rate is largely controlled by the patient.' },
        'aa.fio2Label':    { fa: 'FiO₂ محاسبات A-a', en: 'FiO₂ for A-a calculation' },
        'aa.fio2Hint':     { fa: 'معمولاً ۲۱% (هوای اتاق) تا ۱۰۰%', en: 'Usually 21% (room air) to 100%' },
        'aa.constants':    { fa: 'مقادیر ثابت: Patm=760mmHg | PH₂O=47mmHg | R=0.8', en: 'Constants: Patm=760mmHg | PH₂O=47mmHg | R=0.8' },
        'aa.autoNote':     { fa: 'با فعال بودن ونتیلاتور، A-a Gradient به طور خودکار با استفاده از FiO₂ وارد شده در بخش ونتیلاتور محاسبه می‌شود.', en: 'With the ventilator active, the A-a gradient is calculated automatically using the FiO₂ entered in the ventilator section.' },
        'result.placeholder': { fa: 'نتایج تحلیل بیمار در این قسمت نمایش داده خواهد شد.', en: 'The patient analysis results will be displayed here.' },
        'lbl.pInspPs':     { fa: 'P.Insp / PS', en: 'P.Insp / PS' },
        'lbl.spo2Normal':  { fa: 'نرمال: 94% - 100%', en: 'Normal: 94% - 100%' },

        // اطلاعات بیمار (placeholder واحدها)
        'unit.cm':         { fa: 'cm', en: 'cm' },

        // مودال «درباره»
        'about.title':     { fa: 'درباره برنامه', en: 'About the App' },
        'about.version':   { fa: 'نسخه 2.0.0', en: 'Version 2.0.0' },
        'about.disclaimerTitle': { fa: 'سلب مسئولیت پزشکی', en: 'Medical Disclaimer' },
        'about.disclaimerBody':  { fa: 'این اپلیکیشن یک ابزار کمک‌بالینی و محاسباتی است و <strong>به هیچ وجه</strong> جایگزین قضاوت بالینی، تشخیص و دستورات قطعی پزشک معالج نمی‌باشد. تصمیم‌گیری نهایی در خصوص روند درمان بیمار، منحصراً بر عهده پزشک متخصص است.', en: 'This app is a clinical-support and calculation tool and is <strong>by no means</strong> a substitute for the clinical judgment, diagnosis, or definitive orders of the treating physician. Final decisions about patient treatment rest solely with the specialist physician.' },
        'about.teamTitle': { fa: 'تیم توسعه و نظارت', en: 'Development & Supervision Team' },
        'about.supervisor':{ fa: 'دکتر امیر سالاری', en: 'Dr. Amir Salari' },
        'about.supervisorRole': { fa: 'ناظر علمی (مدرس اورژانس و مراقبت‌های ویژه)', en: 'Scientific supervisor (Emergency & Critical Care instructor)' },
        'about.developer': { fa: 'توکل پیری', en: 'Tavakol Piri' },
        'about.developerRole': { fa: 'طراحی و توسعه (پرستار بیمارستان امام خمینی)', en: 'Design & development (nurse, Imam Khomeini Hospital)' },
        'about.contactTitle': { fa: 'ارتباط با ما', en: 'Contact Us' },
        'about.drSalari':  { fa: 'دکتر سالاری', en: 'Dr. Salari' },

        // مودال پرمیوم
        'premium.title2':  { fa: 'ارتقا به نسخه حرفه‌ای', en: 'Upgrade to Pro' },
        'premium.body':    { fa: 'جهت دسترسی نامحدود به تحلیل نتایج تخصصی شریانی (ABG) و دستیار پیشرفته، نسخه کامل را فعال کنید.', en: 'Activate the full version for unlimited access to specialized arterial (ABG) analysis and the advanced assistant.' },
        'premium.f1':      { fa: 'تحلیل نامحدود و دقیق گازهای خون', en: 'Unlimited, precise blood-gas analysis' },
        'premium.f2':      { fa: 'توصیه‌های هوشمند تنظیمات ونتیلاتور', en: 'Smart ventilator-setting recommendations' },
        'premium.f3':      { fa: 'آنالیز کامل متابولیک و اسید-باز', en: 'Full metabolic & acid-base analysis' },
        'premium.buy':     { fa: 'خرید و فعال‌سازی', en: 'Buy & Activate' },
        'premium.cancel':  { fa: 'انصراف', en: 'Cancel' },
        'premium.vpnWarning': { fa: 'لطفاً پیش از خرید، فیلترشکن (VPN) خود را خاموش کنید.', en: 'Please turn off your VPN before purchasing.' },

        'range.ph':        { fa: 'نرمال: 7.35 - 7.45', en: 'Normal: 7.35 - 7.45' },
        'range.paco2':     { fa: 'نرمال: 35 - 45', en: 'Normal: 35 - 45' },
        'range.hco3':      { fa: 'نرمال: 22 - 26', en: 'Normal: 22 - 26' },
        'range.pao2':      { fa: 'نرمال: 80 - 100', en: 'Normal: 80 - 100' },
        'range.be':        { fa: 'نرمال: -2 تا +2', en: 'Normal: -2 to +2' },
        'range.na':        { fa: 'نرمال: 135 - 145', en: 'Normal: 135 - 145' },
        'range.cl':        { fa: 'نرمال: 95 - 105', en: 'Normal: 95 - 105' },
        'range.albumin':   { fa: 'نرمال: 3.5 - 5.0', en: 'Normal: 3.5 - 5.0' },
        'about.intro':     { fa: 'این اپلیکیشن یک ابزار هوشمند بالینی برای تحلیل پیشرفته گازهای خون (ABG/VBG) است که اختلالات پیچیده اسید-باز و وضعیت اکسیژناسیون بیمار را با دقت بالا ارزیابی می‌کند. همچنین بر اساس داده‌های بیمار، پیشنهادات تخصصی برای تنظیمات ونتیلاتور و استراتژی‌های محافظت از ریه ارائه می‌کند.', en: 'This app is a smart clinical tool for advanced blood-gas analysis (ABG/VBG) that accurately evaluates complex acid-base disorders and patient oxygenation. Based on patient data, it also provides specialized recommendations for ventilator settings and lung-protective strategies.' },
        'menu.download1':  { fa: 'دانلود اپلیکیشن محاسبات دارویی', en: 'Download drug-calculation app' }
    };

    function getLang() { return currentLang; }
    function isRTL() { return currentLang === 'fa'; }

    // t(key): رشتهٔ زبان فعلی؛ fallback به en سپس خود کلید (مثل PediCalc)
    function t(key) {
        var e = STRINGS[key];
        if (!e) return key;
        return (e[currentLang] != null) ? e[currentLang] : (e.en != null ? e.en : key);
    }

    // اعمال lang/dir روی <html>
    function applyLanguage() {
        if (typeof document !== 'undefined' && document.documentElement) {
            document.documentElement.lang = currentLang;
            document.documentElement.dir = isRTL() ? 'rtl' : 'ltr';
            if (document.body && document.body.classList) {
                if (currentLang === 'en') document.body.classList.add('lang-en');
                else document.body.classList.remove('lang-en');
            }
        }
    }

    // ترجمهٔ همهٔ عناصر دارای data-i18n* در صفحه
    function applyStaticTranslations() {
        var i, nodes;
        nodes = document.querySelectorAll('[data-i18n]');
        for (i = 0; i < nodes.length; i++) {
            nodes[i].textContent = t(nodes[i].getAttribute('data-i18n'));
        }
        // متن‌هایی که HTML داخلی دارند (مثل <strong>)
        nodes = document.querySelectorAll('[data-i18n-html]');
        for (i = 0; i < nodes.length; i++) {
            nodes[i].innerHTML = t(nodes[i].getAttribute('data-i18n-html'));
        }
        nodes = document.querySelectorAll('[data-i18n-aria]');
        for (i = 0; i < nodes.length; i++) {
            nodes[i].setAttribute('aria-label', t(nodes[i].getAttribute('data-i18n-aria')));
        }
        nodes = document.querySelectorAll('[data-i18n-placeholder]');
        for (i = 0; i < nodes.length; i++) {
            nodes[i].setAttribute('placeholder', t(nodes[i].getAttribute('data-i18n-placeholder')));
        }
    }

    function onLangChange(cb) {
        listeners.push(cb);
        return function () {
            for (var i = 0; i < listeners.length; i++) {
                if (listeners[i] === cb) { listeners.splice(i, 1); break; }
            }
        };
    }

    function setLang(lang) {
        if (SUPPORTED.indexOf(lang) < 0 || lang === currentLang) return;
        currentLang = lang;
        try { if (typeof localStorage !== 'undefined') localStorage.setItem(STORAGE_KEY, lang); } catch (e) {}
        window.currentLang = currentLang; // برای helper L در سایر اسکریپت‌ها
        applyLanguage();
        applyStaticTranslations();
        for (var i = 0; i < listeners.length; i++) {
            try { listeners[i](currentLang); } catch (e) {}
        }
    }

    function toggleLang() {
        setLang(currentLang === 'fa' ? 'en' : 'fa');
    }

    // خواندن زبان اولیه.
    // نیاز کاربر: برنامه همیشه و قطعاً باید با زبان فارسی شروع شود.
    // بنابراین در هر بار بارگذاری، زبان اولیه فارسی است و زبانِ ذخیره‌شدهٔ قبلی
    // به‌صورت خودکار بازیابی نمی‌شود. تغییر به انگلیسی فقط با کلیک کاربر و
    // برای همان نشست (session) انجام می‌شود.
    function loadSavedLang() {
        currentLang = DEFAULT_LANG; // همیشه فارسی در شروع
        try {
            // زبان ذخیره‌شدهٔ قبلی را پاک می‌کنیم تا شروعِ بعدی هم فارسی بماند.
            if (typeof localStorage !== 'undefined') localStorage.removeItem(STORAGE_KEY);
        } catch (e) {}
        window.currentLang = currentLang;
    }

    // اتصال دکمهٔ زبان — دقیقاً مثل PediCalc با addEventListener('click')
    function setupLanguageToggle(onChange) {
        loadSavedLang();
        applyLanguage();
        applyStaticTranslations();

        var btn = document.getElementById('lang-toggle-btn');
        if (btn) {
            btn.addEventListener('click', function () { toggleLang(); });
        }

        onLangChange(function () {
            applyStaticTranslations();
            if (typeof onChange === 'function') onChange(getLang());
        });
    }

    // helper سراسری برای متن‌های داینامیک نتیجه: L('فارسی','English')
    function L(fa, en) { return (currentLang === 'en') ? en : fa; }

    // در دسترس گذاشتن سراسری (مثل window.PediCalcI18n)
    window.ABGI18n = {
        t: t, getLang: getLang, setLang: setLang, toggleLang: toggleLang,
        onLangChange: onLangChange, applyLanguage: applyLanguage,
        applyStaticTranslations: applyStaticTranslations, isRTL: isRTL,
        setupLanguageToggle: setupLanguageToggle
    };
    window.L = L;
    window.currentLang = currentLang;

    // راه‌اندازی هنگام آماده شدن DOM
    // onChange: هنگام تغییر زبان، رنج‌های نرمال (که در JS تولید می‌شوند) را هم به‌روز کن.
    function boot() {
        setupLanguageToggle(function () {
            if (typeof window.updateRanges === 'function') {
                try { window.updateRanges(); } catch (e) {}
            }
        });
    }
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        boot();
    } else {
        document.addEventListener('DOMContentLoaded', boot, false);
    }
})();

// ===== END: i18n.js =====

// ===== js/Pay.js =====
// ===== START: Pay.js (مدیریت وضعیت نسخه حرفه‌ای / پرمیوم) =====
//
// ⚠️ نکته امنیتی مهم:
// اعتبارسنجی نهاییِ خرید همواره باید سمت اپلیکیشن نیتیو (AndroidApp) یا سرور انجام شود.
// کنترل صرفِ سمت کلاینت (JavaScript) قابل دور زدن است و نباید تنها لایهٔ محافظت باشد.
// این فایل فقط وضعیت UI را مدیریت می‌کند و «منبع حقیقت» را از پل نیتیو می‌گیرد.

window.isPremiumUser = true;

/**
 * آیا پل ارتباطی با اپلیکیشن اندروید در دسترس است؟
 */
function hasAndroidBridge() {
    return typeof AndroidApp !== 'undefined';
}

/**
 * استعلام وضعیت پرمیوم به‌صورت معتبر (فقط از منبع نیتیو).
 * localStorage صرفاً به‌عنوان کشِ نمایشی برای جلوگیری از پرش (flicker) استفاده می‌شود
 * و هرگز به‌تنهایی به‌عنوان مجوز دسترسی پذیرفته نمی‌شود.
 * @returns {boolean}
 */
function resolvePremiumStatus() {
    if (hasAndroidBridge() && typeof AndroidApp.checkPremium === 'function') {
        try {
            return AndroidApp.checkPremium() === true;
        } catch (e) {
            console.warn('checkPremium failed:', e);
            return false;
        }
    }
    // بدون پل نیتیو، هیچ مجوز معتبری وجود ندارد → کاربر رایگان تلقی می‌شود.
    return true;
}

/**
 * اعمال وضعیت پرمیوم روی UI.
 * @param {boolean} status
 * @param {boolean} showSuccessMsg
 */
function updatePremiumStatus(status, showSuccessMsg) {
    window.isPremiumUser = status === true;

    if (window.isPremiumUser) {
        // ذخیرهٔ کشِ نمایشی (نه امنیتی) برای تجربهٔ کاربری روان‌تر
        try { localStorage.setItem('isPremiumCached', 'true'); } catch (e) {}

        if (showSuccessMsg) {
            alert('پرداخت با موفقیت انجام شد و نسخه کامل فعال گردید.');
        }
        closeModal();

        togglePremiumBadges(false);
    } else {
        try { localStorage.removeItem('isPremiumCached'); } catch (e) {}
        togglePremiumBadges(true);
    }
}

/**
 * نمایش/مخفی‌سازی نشان‌ها و برچسب‌های محدودیت نسخهٔ رایگان.
 * @param {boolean} show
 */
function togglePremiumBadges(show) {
    const display = show ? '' : 'none';
    document.querySelectorAll('.premium-lock-badge').forEach(l => l.style.display = display);
    document.querySelectorAll('.premium-label-text').forEach(l => l.style.display = display);
    document.querySelectorAll('.free-label-text').forEach(l => l.style.display = display);

    // پس از تغییر وضعیت پرمیوم، قفل بخش‌های حرفه‌ای را نیز به‌روزرسانی کن.
    updatePremiumSectionLocks();
}

/**
 * قفل/باز کردن بخش‌های ویژهٔ نسخهٔ حرفه‌ای (آنالیز متابولیک و ونتیلاتور).
 *
 * نیاز کاربر: در نمونهٔ خون وریدی (VBG)، این دو بخش برای کاربر رایگان قفل باشند
 * و تنها پس از خرید نسخهٔ حرفه‌ای باز شوند.
 *
 * توجه: نمونهٔ شریانی (ABG) به‌طور کامل مخصوص نسخهٔ حرفه‌ای است و در صفحهٔ اول
 * قفل می‌شود؛ بنابراین اگر کاربر به فرم ABG رسیده باشد یعنی پرمیوم است و قفلی لازم نیست.
 */
function updatePremiumSectionLocks() {
    var lockables = document.querySelectorAll('.premium-lockable');
    if (!lockables || !lockables.length) return;

    // نوع نمونهٔ انتخاب‌شده در فرم اصلی
    var checkedSample = document.querySelector('input[name="sampleType"]:checked');
    var sampleType = checkedSample ? checkedSample.value : 'abg';

    // فقط کاربر رایگان در نمونهٔ VBG باید این بخش‌ها را قفل ببیند.
    var shouldLock = (window.isPremiumUser === false) && (sampleType === 'vbg');

    for (var i = 0; i < lockables.length; i++) {
        if (shouldLock) lockables[i].classList.add('is-locked');
        else lockables[i].classList.remove('is-locked');
    }
}

// در دسترس گذاشتن سراسری تا abg.js هنگام تغییر نوع نمونه/ورود به اپ صدا بزند.
window.updatePremiumSectionLocks = updatePremiumSectionLocks;

// Event delegation روی document (پایدار در WebView اندروید طبق الگوی پروژه):
// کلیک روی overlayِ قفل، مودال خرید را باز می‌کند.
document.addEventListener('click', function (e) {
    if (!e.target || !e.target.closest) return;
    var overlay = e.target.closest('[data-premium-lock]');
    if (!overlay) return;
    var card = overlay.closest('.premium-lockable');
    if (!card || !card.classList.contains('is-locked')) return;

    e.preventDefault();
    e.stopPropagation();

    var modal = document.getElementById('purchaseModal');
    if (modal) {
        modal.style.display = 'flex';
        modal.style.opacity = '1';
        modal.style.visibility = 'visible';
        modal.style.pointerEvents = 'auto';
    }
});

/**
 * بستن پاپ‌آپ خرید (با انیمیشن نرم).
 */
function closeModal() {
    const modal = document.getElementById('purchaseModal');
    if (!modal) return;
    modal.style.opacity = '0';
    setTimeout(() => {
        modal.style.display = 'none';
        modal.style.pointerEvents = 'none';
        modal.style.opacity = '1';
    }, 300);
}

/**
 * شروع فرایند خرید (از طریق پل نیتیو).
 */
function startPurchase() {
    if (hasAndroidBridge() && typeof AndroidApp.purchase === 'function') {
        AndroidApp.purchase();
    } else {
        alert('خطا: برنامه در محیط مرورگر باز شده است یا پل ارتباطی با اندروید قطع است. لطفاً اپلیکیشن را در گوشی اجرا کنید.');
    }
}

// --- مقداردهی اولیه هنگام بارگذاری ---
// اگر کش نمایشی موجود است، برای جلوگیری از پرش، موقتاً UI را باز نشان می‌دهیم،
// اما بلافاصله وضعیت واقعی را از منبع نیتیو استعلام و اعمال می‌کنیم.
(function initPremiumState() {
    let cachedLooksPremium = false;
    try { cachedLooksPremium = localStorage.getItem('isPremiumCached') === 'true'; } catch (e) {}

    if (cachedLooksPremium && hasAndroidBridge()) {
        togglePremiumBadges(false); // فقط نمایش موقت
    }

    // منبع حقیقت: نیتیو
    const verified = resolvePremiumStatus();
    updatePremiumStatus(verified, false);
})();

// ===== END: Pay.js =====

// ===== js/constants.js =====
// ===== START: constants.js (ثابت‌های متمرکز برنامه) =====

// ثابت‌های عمومی پزشکی و برنامه (CONSTANTS)
const CONSTANTS = {
    // ABG Ranges (Arterial)
    PH_NORMAL_LOW: 7.35,
    PH_NORMAL_HIGH: 7.45,
    PACO2_NORMAL_LOW: 35,
    PACO2_NORMAL_HIGH: 45,
    PACO2_NORMAL_REF: 40,
    HCO3_NORMAL_LOW: 22,
    HCO3_NORMAL_HIGH: 26,
    HCO3_NORMAL_REF: 24,

    PAO2_NORMAL_LOW: 80,
    PAO2_NORMAL_HIGH: 100,
    SPO2_NORMAL_LOW: 94, // 🛑 اصلاح شده: تغییر از 95 به 94 برای هماهنگی با UI
    SPO2_WARNING_LOW: 90,
    BE_LOW: -2,
    BE_HIGH: 2,

    // Ventilation & Oxygenation
    P_ATM_SEA_LEVEL: 760,
    P_H2O: 47,
    RESP_QUOTIENT: 0.8,
};

// ثابت‌های VBG (VBG_CONSTANTS)
const VBG_CONSTANTS = {
    PH_VBG_LOW: 7.31,
    PH_VBG_HIGH: 7.41,
    PACO2_VBG_LOW: 41,
    PACO2_VBG_HIGH: 51,
    HCO3_VBG_LOW: 23,
    HCO3_VBG_HIGH: 29,
    PACO2_VBG_REF: 46,
    HCO3_VBG_REF: 26,
};

// ثابت‌های متابولیک (METABOLIC_CONSTANTS)
const METABOLIC_CONSTANTS = {
    AG_NORMAL_LOW: 8,
    AG_NORMAL_HIGH: 12,
    ALBUMIN_NORMAL: 4.0,
};

// ثابت‌های ونتیلاتور (VENT_CONSTANTS)
const VENT_CONSTANTS = {
    PH_CRITICAL_LOW: 7.20,
    PH_CRITICAL_HIGH: 7.60,
    PAO2_CRITICAL_LOW: 60,
    SPO2_CRITICAL_LOW: 88,
    MAX_PEEP_SAFE: 20,
    MAX_PPLAT_SAFE: 30,
    MAX_DRIVING_PRESSURE: 15,
    MIN_TV_PER_KG: 4,
    MAX_TV_PER_KG: 8,
    LUNG_PROTECTIVE_TV_MAX: 6,
    LUNG_PROTECTIVE_TV_MIN: 4,
    PF_RATIO_ARDS_MODERATE: 200,
    PF_RATIO_ARDS_SEVERE: 100,
    FIO2_TOXIC_THRESHOLD: 60,
    FIO2_DANGER_THRESHOLD: 80,
    RR_NORMAL_LOW: 10,
    RR_NORMAL_HIGH: 20,
    RR_MAX_ACCEPTABLE: 35,
};

// 🛑 برای رفع وابستگی‌های محیط مرورگر، همه ثابت‌ها را در window قرار می‌دهیم
window.CONSTANTS = CONSTANTS;
window.VBG_CONSTANTS = VBG_CONSTANTS;
window.METABOLIC_CONSTANTS = METABOLIC_CONSTANTS;
window.VENT_CONSTANTS = VENT_CONSTANTS;

// ===== END: constants.js =====

// ===== js/vbg_core.js =====
// ===== START: vbg_core.js (منطق مرکزی تحلیل اسید-باز) =====
// 🛑 وابستگی‌ها از window.CONSTANTS خوانده می‌شوند

/**
 * دریافت محدوده های نرمال بر اساس نوع نمونه
 * @param {string} sampleType - 'abg' یا 'vbg'
 * @param {number} age - سن بیمار
 * @returns {object} محدوده های نرمال
 */
function getNormalRanges(sampleType, age = 40) {
    // 🛑 استفاده از ثابت‌های عمومی
    const CONSTANTS = window.CONSTANTS;
    const VBG_CONSTANTS = window.VBG_CONSTANTS;

    const isVBG = sampleType === 'vbg';

    let ranges = {
        ph_low: isVBG ? VBG_CONSTANTS.PH_VBG_LOW : CONSTANTS.PH_NORMAL_LOW,
        ph_high: isVBG ? VBG_CONSTANTS.PH_VBG_HIGH : CONSTANTS.PH_NORMAL_HIGH,
        paco2_low: isVBG ? VBG_CONSTANTS.PACO2_VBG_LOW : CONSTANTS.PACO2_NORMAL_LOW,
        paco2_high: isVBG ? VBG_CONSTANTS.PACO2_VBG_HIGH : CONSTANTS.PACO2_NORMAL_HIGH,
        paco2_ref: isVBG ? VBG_CONSTANTS.PACO2_VBG_REF : CONSTANTS.PACO2_NORMAL_REF,
        hco3_low: isVBG ? VBG_CONSTANTS.HCO3_VBG_LOW : CONSTANTS.HCO3_NORMAL_LOW,
        hco3_high: isVBG ? VBG_CONSTANTS.HCO3_VBG_HIGH : CONSTANTS.HCO3_NORMAL_HIGH,
        hco3_ref: isVBG ? VBG_CONSTANTS.HCO3_VBG_REF : CONSTANTS.HCO3_NORMAL_REF,
        pao2_low: CONSTANTS.PAO2_NORMAL_LOW,
        pao2_high: CONSTANTS.PAO2_NORMAL_HIGH,
    };

    if (!isVBG && age && age > 0) { // تنظیم PaO2 بر اساس سن فقط برای ABG
        let expectedPaO2 = 100 - (0.3 * age);
        ranges.pao2_low = expectedPaO2 - 10;
        ranges.pao2_high = expectedPaO2;
    }

    return ranges;
}


/**
 * تابع مرکزی تفسیر اسید-باز.
 * @param {object} data - شامل ph, paco2, hco3 و سایر داده ها
 * @param {object} normalRanges - محدوده های نرمال (ABG یا VBG)
 * @param {boolean} isVBG - آیا نمونه وریدی است؟
 * @returns {object} نتایج تفسیر
 */
function runAcidBaseInterpretation(data, normalRanges, isVBG) {
    const { ph, paco2, hco3, be } = data;
    const {
        ph_low, ph_high, paco2_low, paco2_high, hco3_low, hco3_high, paco2_ref, hco3_ref
    } = normalRanges;

    let primaryDisorder = "", compensationState = "";

    // 🛑 چک ایمنی: اگر پارامترهای اصلی وارد نشده باشند، از اجرا صرف نظر کن
    if (ph === null || paco2 === null || hco3 === null) {
        return { primaryDisorder: "داده‌های ناکافی", compensationState: "", compensationAnalysis: {}, isMetabolicAcidosis: false, hco3_ref: hco3_ref };
    }

    const isAcidemia = ph < ph_low, isAlkalemia = ph > ph_high;
    const isPHNormal = !isAcidemia && !isAlkalemia;
    const isRespiratoryAcidosis = paco2 > paco2_high, isRespiratoryAlkalosis = paco2 < paco2_low;
    const isMetabolicAcidosis = hco3 < hco3_low, isMetabolicAlkalosis = hco3 > hco3_high;


    // 1. تشخیص اختلال اولیه (Primary Disorder)
    if (isAcidemia) {
        if (isMetabolicAcidosis && isRespiratoryAcidosis) primaryDisorder = "اسیدوز متابولیک و تنفسی مختلط";
        else if (isMetabolicAcidosis) primaryDisorder = "اسیدوز متابولیک";
        else if (isRespiratoryAcidosis) primaryDisorder = "اسیدوز تنفسی";
        else primaryDisorder = "اسیدمی نامشخص";
    }
    else if (isAlkalemia) {
        if (isMetabolicAlkalosis && isRespiratoryAlkalosis) primaryDisorder = "آلکالوز متابولیک و تنفسی مختلط";
        else if (isMetabolicAlkalosis) primaryDisorder = "آلکالوز متابولیک";
        else if (isRespiratoryAlkalosis) primaryDisorder = "آلکالوز تنفسی";
        else primaryDisorder = "آلکالمی نامشخص";
    }
    else if (isPHNormal) {
        if (isRespiratoryAcidosis && isMetabolicAlkalosis) primaryDisorder = "اسیدوز تنفسی و آلکالوز متابولیک (مختلط)";
        else if (isRespiratoryAlkalosis && isMetabolicAcidosis) primaryDisorder = "آلکالوز تنفسی و اسیدوز متابولیک (مختلط)";
        else primaryDisorder = "وضعیت نرمال اسید-باز";
    } else {
        primaryDisorder = "اختلال اولیه نامشخص";
    }

    // 2. تحلیل جبران (Compensation Analysis)
    let compensationAnalysis = {};

    if (primaryDisorder.includes("اسیدوز متابولیک") && !primaryDisorder.includes("مختلط")) {
        const expectedPaco2 = 1.5 * hco3 + 8;
        compensationAnalysis = { parameter: 'PaCO₂', actual: paco2, expected: expectedPaco2.toFixed(1), unit: 'mmHg' };
        if (Math.abs(paco2 - expectedPaco2) > 2) compensationState = "با جبران نامناسب";
        else compensationState = isPHNormal ? "با جبران کامل" : "با جبران ناقص";
    } else if (primaryDisorder.includes("آلکالوز متابولیک") && !primaryDisorder.includes("مختلط")) {
        const expectedPaco2 = 0.7 * hco3 + 21;
        compensationAnalysis = { parameter: 'PaCO₂', actual: paco2, expected: expectedPaco2.toFixed(1), unit: 'mmHg' };
        if (Math.abs(paco2 - expectedPaco2) > 5) compensationState = "با جبران نامناسب";
        else compensationState = isPHNormal ? "با جبران کامل" : "با جبران ناقص";
    } else if (primaryDisorder.includes("اسیدوز تنفسی") && !primaryDisorder.includes("مختلط")) {
        const deltaPaco2 = paco2 - paco2_ref;
        const expectedHCO3Acute = hco3_ref + 0.1 * deltaPaco2;
        const expectedHCO3Chronic = hco3_ref + 0.35 * deltaPaco2;

        let expectedHCO3;
        if (Math.abs(hco3 - expectedHCO3Chronic) < Math.abs(hco3 - expectedHCO3Acute)) {
            primaryDisorder = "اسیدوز تنفسی مزمن"; expectedHCO3 = expectedHCO3Chronic;
        } else {
            primaryDisorder = "اسیدوز تنفسی حاد"; expectedHCO3 = expectedHCO3Acute;
        }

        compensationAnalysis = { parameter: 'HCO₃⁻', actual: hco3, expected: expectedHCO3.toFixed(1), unit: 'mmol/L' };
        // 🛑 اصلاح: اضافه کردن چک جبران نامناسب تنفسی (آستانه 3)
        if (Math.abs(hco3 - expectedHCO3) > 3) compensationState = "با جبران نامناسب";
        else compensationState = isPHNormal ? "با جبران کامل" : "با جبران ناقص";

    } else if (primaryDisorder.includes("آلکالوز تنفسی") && !primaryDisorder.includes("مختلط")) {
        const deltaPaco2 = paco2_ref - paco2;
        const expectedHCO3Acute = hco3_ref - 0.2 * deltaPaco2;
        const expectedHCO3Chronic = hco3_ref - 0.5 * deltaPaco2;

        let expectedHCO3;
        if (Math.abs(hco3 - expectedHCO3Chronic) < Math.abs(hco3 - expectedHCO3Acute)) {
            primaryDisorder = "آلکالوز تنفسی مزمن"; expectedHCO3 = expectedHCO3Chronic;
        } else {
            primaryDisorder = "آلکالوز تنفسی حاد"; expectedHCO3 = expectedHCO3Acute;
        }

        compensationAnalysis = { parameter: 'HCO₃⁻', actual: hco3, expected: expectedHCO3.toFixed(1), unit: 'mmol/L' };
        // 🛑 اصلاح: اضافه کردن چک جبران نامناسب تنفسی (آستانه 3)
        if (Math.abs(hco3 - expectedHCO3) > 3) compensationState = "با جبران نامناسب";
        else compensationState = isPHNormal ? "با جبران کامل" : "با جبران ناقص";
    }

    return { primaryDisorder, compensationState, compensationAnalysis, isMetabolicAcidosis, isAlkalemia, hco3_ref };
}

// ===== END: vbg_core.js =====

// ===== js/metabolic.js =====
// ===== START: metabolic.js (منطق آنیون گپ و تحلیل متابولیک) =====
// 🛑 وابستگی‌ها از window.METABOLIC_CONSTANTS و window.CONSTANTS خوانده می‌شوند

/**
 * محاسبه آنیون گپ (Anion Gap)
 * AG = Na+ - (Cl- + HCO3-)
 * @param {number} sodium
 * @param {number} chloride
 * @param {number} hco3
 * @returns {number | null} Anion Gap
 */
function calculateAnionGap(sodium, chloride, hco3) {
    if (!sodium || !chloride || !hco3) return null; // 🛑 چک null/undefined
    return sodium - (chloride + hco3);
}

/**
 * محاسبه آنیون گپ اصلاح‌شده بر اساس آلبومین (Adjusted Anion Gap)
 * Adj AG = AG + 2.5 * (4.0 - Albumin)
 * @param {number} ag - Anion Gap خام
 * @param {number} albumin - آلبومین بیمار
 * @returns {number | null} Adjusted Anion Gap
 */
function calculateAdjustedAnionGap(ag, albumin) {
    const METABOLIC_CONSTANTS = window.METABOLIC_CONSTANTS;
    if (ag === null) return null; // 🛑 چک null

    // اگر آلبومین وارد نشده، از مقدار نرمال ثابت استفاده کن
    const actualAlbumin = albumin !== null ? albumin : METABOLIC_CONSTANTS.ALBUMIN_NORMAL;

    // اگر آلبومین نرمال یا بالا باشد، نیازی به اصلاح نیست.
    if (actualAlbumin >= METABOLIC_CONSTANTS.ALBUMIN_NORMAL) return ag;

    // 2.5 * (نرمال آلبومین - آلبومین بیمار)
    return ag + 2.5 * (METABOLIC_CONSTANTS.ALBUMIN_NORMAL - actualAlbumin);
}

/**
 * محاسبه نسبت دلتا (Delta Gap)
 * DG = (AG - 12) / (24 - HCO3-)
 * @param {number} ag - آنیون گپ
 * @param {number} hco3 - HCO3 بیمار
 * @returns {number | null} Delta Gap Ratio
 */
function calculateDeltaGap(ag, hco3) {
    const METABOLIC_CONSTANTS = window.METABOLIC_CONSTANTS;
    const CONSTANTS = window.CONSTANTS;

    // فقط برای اسیدوز متابولیک (HCO3 پایین)
    if (ag === null || !hco3 || hco3 >= CONSTANTS.HCO3_NORMAL_REF) return null;

    // فرض بر این است که 12 میانگین AG نرمال و 24 میانگین HCO3 نرمال است.
    const deltaAG = ag - METABOLIC_CONSTANTS.AG_NORMAL_HIGH; // AG - 12
    const deltaHCO3 = CONSTANTS.HCO3_NORMAL_REF - hco3; // 24 - HCO3

    // 🛑 مدیریت خطای تقسیم بر صفر و ورودی‌های نامعتبر
    if (deltaHCO3 <= 0 || isNaN(deltaAG) || isNaN(deltaHCO3)) return null;

    return deltaAG / deltaHCO3;
}


/**
 * تفسیر نهایی اسیدوز متابولیک با آنیون گپ
 * @param {object} data - شامل ag, hco3, deltaGap
 * @param {boolean} isMetabolicAcidosis
 * @returns {object} شامل agInterpretation, deltaGap, dgInterpretation
 */
function interpretMetabolicAcidosis(data) {
    const { ag, hco3, adjAg, isMetabolicAcidosis } = data;
    const { AG_NORMAL_LOW, AG_NORMAL_HIGH } = window.METABOLIC_CONSTANTS;

    const result = {
        agInterpretation: "",
        deltaGap: null,
        dgInterpretation: "",
        agState: 'normal', // normal, high, low
        adjAg: adjAg,
    };

    if (ag === null || adjAg === null) return result; // 🛑 چک null

    // 1. تفسیر آنیون گپ
    if (adjAg > AG_NORMAL_HIGH) {
        result.agInterpretation = L(`آنیون گپ اصلاح‌شده (${adjAg.toFixed(1)}) بالا است. این یافته قویاً مطرح‌کننده اسیدوز متابولیک با AG بالا است.`, `The corrected anion gap (${adjAg.toFixed(1)}) is high. This strongly suggests a high anion gap metabolic acidosis.`);
        result.agState = 'high';
    } else if (adjAg < AG_NORMAL_LOW) {
        result.agInterpretation = L(`آنیون گپ اصلاح‌شده (${adjAg.toFixed(1)}) پایین است (غیرمعمول). این یافته می‌تواند ناشی از هیپوآلبومینمی (اگر آلبومین وارد نشده)، آلکالوز یا خطای اندازه‌گیری باشد.`, `The corrected anion gap (${adjAg.toFixed(1)}) is low (uncommon). This may be due to hypoalbuminemia (if albumin was not entered), alkalosis, or a measurement error.`);
        result.agState = 'low';
    } else {
        result.agInterpretation = L(`آنیون گپ اصلاح‌شده (${adjAg.toFixed(1)}) در محدوده نرمال است. اسیدوز متابولیک فعلی احتمالاً اسیدوز متابولیک با AG نرمال (هایپرکلرمیک) است.`, `The corrected anion gap (${adjAg.toFixed(1)}) is within the normal range. The current metabolic acidosis is likely a normal anion gap (hyperchloremic) metabolic acidosis.`);
        result.agState = 'normal';
    }

    // 2. تحلیل دلتا گپ (فقط در صورت وجود اسیدوز متابولیک)
    if (isMetabolicAcidosis) {
        const dg = calculateDeltaGap(ag, hco3);
        result.deltaGap = dg;

        if (dg !== null) {
            if (dg > 1.2) {
                result.dgInterpretation = L(`نسبت دلتا (${dg.toFixed(2)}) بالاتر از حد انتظار است. این نتیجه نشان می‌دهد که آلکالوز متابولیک همزمان (Co-existing Metabolic Alkalosis) با اسیدوز متابولیک اولیه وجود دارد.`, `The delta ratio (${dg.toFixed(2)}) is higher than expected. This indicates a co-existing metabolic alkalosis alongside the primary metabolic acidosis.`);
            } else if (dg < 0.8) {
                result.dgInterpretation = L(`نسبت دلتا (${dg.toFixed(2)}) پایین‌تر از حد انتظار است. این نتیجه نشان می‌دهد که اسیدوز متابولیک با AG نرمال (Non-Anion Gap MA) همزمان با اسیدوز متابولیک اولیه وجود دارد.`, `The delta ratio (${dg.toFixed(2)}) is lower than expected. This indicates a co-existing normal anion gap metabolic acidosis (non-anion gap MA) alongside the primary metabolic acidosis.`);
            } else {
                result.dgInterpretation = L(`نسبت دلتا (${dg.toFixed(2)}) طبیعی است (0.8 تا 1.2). این نشان‌دهنده اسیدوز متابولیک خالص با AG بالا است.`, `The delta ratio (${dg.toFixed(2)}) is normal (0.8 to 1.2). This indicates a pure high anion gap metabolic acidosis.`);
            }
        }
    }

    return result;
}

// ===== END: metabolic.js =====

// ===== js/ventilator.js =====
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

// ===== js/renderer.js =====
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

// ===== js/abg.js =====
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

// ===== js/ui.js =====
const sidenav = document.getElementById('sidenav');
const overlay = document.getElementById('overlay');

function openNav() {
    if (sidenav) sidenav.classList.add('open');
    if (overlay) overlay.classList.add('open');
}

function closeNav() {
    if (sidenav) sidenav.classList.remove('open');
    if (overlay) overlay.classList.remove('open');
}

function openMedmateAppOrBrowser() {
    window.location.href = "bazaar://details?id=ir.medmate.app";
}

document.addEventListener('DOMContentLoaded', () => {

    const closeBtn = document.getElementById('close-sidenav-btn');
    if (closeBtn) {
        closeBtn.addEventListener('click', closeNav);
    }

    if (overlay) {
        overlay.addEventListener('click', closeNav);
    }

    const aboutLink = document.getElementById('about-us-link');
    const aboutModal = document.getElementById('about-us-modal');

    if (aboutLink && aboutModal) {
        aboutLink.addEventListener('click', (e) => {
            e.preventDefault();
            aboutModal.classList.add('open');
            closeNav();
        });
    }

    window.addEventListener('click', (event) => {
        if (event.target == aboutModal) {
            aboutModal.classList.remove('open');
        }
    });

    // 🛑 نکته: کنترل چک‌باکس «ونتیلاتور» و «محاسبه A-a Gradient» به‌طور کامل
    // در abg.js مدیریت می‌شود (به همراه validateInputs و setupLiveValidation).
    // listenerهای تکراری قبلی از اینجا حذف شدند تا از تداخل رفتار جلوگیری شود.

    if (sidenav) {
        let touchStartX = 0;
        let touchEndX = 0;
        const minSwipeDistance = 50;

        sidenav.addEventListener('touchstart', (e) => {
            touchStartX = e.changedTouches[0].screenX;
        }, {passive: true});

        sidenav.addEventListener('touchend', (e) => {
            touchEndX = e.changedTouches[0].screenX;
            handleSwipe();
        }, {passive: true});

        function handleSwipe() {
            if (touchEndX - touchStartX > minSwipeDistance) {
                closeNav();
            }
        }
    }

    const genderRadios = document.querySelectorAll('input[name="gender-radio"]');
    const genderHiddenInput = document.getElementById('gender');

    if (genderRadios.length > 0 && genderHiddenInput) {
        genderRadios.forEach(radio => {
            radio.addEventListener('change', function() {
                genderHiddenInput.value = this.value;
                genderHiddenInput.dispatchEvent(new Event('change'));
            });
        });
    }

    const ventModeContainer = document.getElementById('vent-mode-container');
    const ventModeTrigger = document.getElementById('vent-mode-trigger');
    const ventModeDisplay = document.getElementById('vent-mode-display');
    const ventModeOptions = document.querySelectorAll('#vent-mode-options li');
    const ventModeInput = document.getElementById('vent-mode');

    if (ventModeTrigger && ventModeContainer) {
        ventModeTrigger.addEventListener('click', (e) => {
            e.stopPropagation();
            ventModeContainer.classList.toggle('open');
        });

        ventModeOptions.forEach(option => {
            option.addEventListener('click', (e) => {
                e.stopPropagation();
                const value = option.getAttribute('data-value');
                const text = option.textContent;

                ventModeDisplay.textContent = text;
                ventModeDisplay.style.color = 'var(--text-primary)';

                ventModeOptions.forEach(opt => opt.classList.remove('selected'));
                option.classList.add('selected');

                ventModeContainer.classList.remove('open');

                ventModeInput.value = value;
                ventModeInput.dispatchEvent(new Event('change'));
            });
        });

        window.addEventListener('click', (e) => {
            if (!ventModeContainer.contains(e.target)) {
                ventModeContainer.classList.remove('open');
            }
        });

        document.getElementById('abg-form').addEventListener('reset', () => {
            setTimeout(() => {
                ventModeDisplay.textContent = 'انتخاب کنید...';
                ventModeDisplay.style.color = 'var(--text-secondary)';
                ventModeOptions.forEach(opt => opt.classList.remove('selected'));
                ventModeInput.value = '';
            }, 10);
        });
    }
});

const clickableElements = document.querySelectorAll('button, .radio-card-group, .checkbox-group, input[type="checkbox"], input[type="radio"], a, .custom-select-trigger, .custom-select-options li');

clickableElements.forEach(el => {
    el.addEventListener('touchstart', () => {
        if (navigator.vibrate) {
            navigator.vibrate(15);
        }
    }, { passive: true });
});
