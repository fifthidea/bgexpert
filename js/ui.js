// ==================== PWA === START =============================

// PWA installation and user-controlled app updates.
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
});

// Keep this value synchronized with version.json and sw.js.
const BGEXPERT_APP_VERSION = '1.0.2';
const BGEXPERT_CACHE_PREFIX = 'bgexpert-pwa-';
let bgexpertPwaRegistration = null;
let bgexpertUpdateCheckRunning = false;

async function fetchLatestbgexpertVersion() {
    try {
        const versionUrl = new URL('./version.json', document.baseURI);
        versionUrl.searchParams.set('_', Date.now().toString());
        const response = await fetch(versionUrl.toString(), { cache: 'no-store' });
        if (!response.ok) return null;

        const info = await response.json();
        if (typeof info.version !== 'string' || typeof info.cacheName !== 'string') {
            return null;
        }
        return info;
    } catch {
        // No internet? Do not interrupt the user or stop the cached app from running.
        return null;
    }
}

async function isCompletebgexpertCache(cacheName, version) {
    try {
        if (!(await caches.has(cacheName))) return false;
        const cache = await caches.open(cacheName);
        const markerUrl = new URL('__bgexpert_cache_ready__', document.baseURI).href;
        const marker = await cache.match(markerUrl);
        if (!marker) return false;
        const details = await marker.json();
        return details.version === version;
    } catch {
        return false;
    }
}

async function waitForbgexpertCache(registration, cacheName, version) {
    // Ask the browser to check whether sw.js has changed. A new sw.js must use a new
    // CACHE_NAME; that installation downloads the candidate version into its own cache.
    try {
        await registration.update();
    } catch {
        // The test below will fail safely if the candidate cache is not available.
    }

    const deadline = Date.now() + 20000;
    while (Date.now() < deadline) {
        const worker = registration.installing || registration.waiting;
        if (worker && worker.state === 'redundant') return false;

        const complete = await isCompletebgexpertCache(cacheName, version);
        if (complete && (!worker || worker.state === 'installed' || worker.state === 'activated')) {
            return true;
        }

        await new Promise(resolve => setTimeout(resolve, 300));
    }
    return false;
}

function tellServiceWorkerToUseVersion(cacheName, version) {
    return new Promise(resolve => {
        const controller = navigator.serviceWorker.controller;
        if (!controller || typeof MessageChannel === 'undefined') {
            resolve({ ok: false });
            return;
        }

        const channel = new MessageChannel();
        const timeout = setTimeout(() => {
            channel.port1.close();
            resolve({ ok: false });
        }, 5000);

        channel.port1.onmessage = event => {
            clearTimeout(timeout);
            channel.port1.close();
            resolve(event.data || { ok: false });
        };

        controller.postMessage({
            type: 'BGEXPERT_SET_ACTIVE_CACHE',
            cacheName,
            version
        }, [channel.port2]);
    });
}

async function checkForbgexpertUpdate() {
    if (bgexpertUpdateCheckRunning || !navigator.serviceWorker || !navigator.onLine) return;
    bgexpertUpdateCheckRunning = true;

    try {
        const latest = await fetchLatestbgexpertVersion();
        if (!latest) return;

        // Reject unexpected cache names; these should be written only by the project owner.
        if (!latest.cacheName.startsWith(BGEXPERT_CACHE_PREFIX)) return;

        let installedVersion = localStorage.getItem('bgexpertAppVersion');
        if (!installedVersion) {
            installedVersion = BGEXPERT_APP_VERSION;
            localStorage.setItem('bgexpertAppVersion', installedVersion);
        }

        if (latest.version === installedVersion) return;
        // Remember a declined version so the same prompt does not appear on every launch.
        if (sessionStorage.getItem('bgexpertDeclinedVersion') === latest.version) return;

        const accepted = window.confirm(
            `نسخه جدید BGExpert (${latest.version}) موجود است.\n\n` +
            'آیا می‌خواهید نسخه جدید دانلود و فعال شود؟\n' +
            'اگر «لغو» را انتخاب کنید، نسخه فعلی حفظ می‌شود و برنامه آفلاین هم کار خواهد کرد.'
        );

        if (!accepted) {
            sessionStorage.setItem('bgexpertDeclinedVersion', latest.version);
            return;
        }

        const registration = bgexpertPwaRegistration ||
            await navigator.serviceWorker.getRegistration('./');
        if (!registration) {
            alert('ثبت PWA پیدا نشد. نسخه فعلی همچنان فعال می‌ماند.');
            return;
        }

        const ready = await waitForbgexpertCache(registration, latest.cacheName, latest.version);
        if (!ready) {
            alert('نسخه جدید کامل دانلود نشد. نسخه فعلی حفظ شده است. لطفاً بعداً دوباره امتحان کنید.');
            return;
        }

        const result = await tellServiceWorkerToUseVersion(latest.cacheName, latest.version);
        if (!result || !result.ok) {
            alert('تغییر نسخه انجام نشد؛ نسخه فعلی حفظ شده است. لطفاً برنامه را یک بار ببندید و دوباره باز کنید.');
            return;
        }

        localStorage.setItem('bgexpertAppVersion', latest.version);
        sessionStorage.removeItem('bgexpertDeclinedVersion');
        window.location.reload();
    } catch (error) {
        // Update-check errors must never prevent normal or offline app use.
        console.warn('bgexpert update check failed:', error);
    } finally {
        bgexpertUpdateCheckRunning = false;
    }
}

if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
        try {
            bgexpertPwaRegistration = await navigator.serviceWorker.register('./sw.js');

            // Ask the browser to preserve this site's stored data when possible.
            if (navigator.storage && typeof navigator.storage.persist === 'function') {
                navigator.storage.persist().then(granted => {
                    console.info('Persistent storage granted:', granted);
                }).catch(() => {});
            }

            // Delay slightly so the first page can finish initializing; this is non-blocking.
            setTimeout(() => checkForbgexpertUpdate(), 1500);
        } catch (error) {
            console.warn('Service Worker registration failed:', error);
        }
    });

    window.addEventListener('online', () => checkForbgexpertUpdate());
}



// ==================== PWA === END ===============================

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