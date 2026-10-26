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
		'menu.medmate':		{ fa: 'ماشین حساب محاسبات دارویی', en: 'MedMate Drug Calculator' },
		'menu.pedicalc':	{ fa: 'محاسبه گر دوز داروهای کودکان', en: 'Pediatric Calculator' },
		
        'splash.title':    { fa: 'اپلیکیشن هوشمند تحلیل پیشرفته گازهای خون (ABG/VBG)', en: 'Smart Advanced Blood Gas Analysis (ABG/VBG)' },
        'splash.subtitle': { fa: 'لطفاً نوع نمونه خون را انتخاب کنید', en: 'Please select the blood sample type' },
        'sample.abg':      { fa: 'نمونه خون شریانی (ABG)', en: 'Arterial Blood Gas (ABG)' },
        'sample.vbg':      { fa: 'نمونه خون وریدی (VBG)', en: 'Venous Blood Gas (VBG)' },
        'premium.label':   { fa: 'ویژه نسخه حرفه‌ای', en: 'Pro version' },
        'free.label':      { fa: '۱ بار تست رایگان', en: '1 free trial' },
        'premium.lockedSection': { fa: 'ویژه نسخه حرفه‌ای', en: 'Pro version only' },
        'premium.lockedHint':    { fa: 'برای باز شدن، نسخه حرفه‌ای را تهیه کنید', en: 'Purchase the Pro version to unlock' },

        'menu.title':      { fa: 'منو', en: 'Menu' },
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
