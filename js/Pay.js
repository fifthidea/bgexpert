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
