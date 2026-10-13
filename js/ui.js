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