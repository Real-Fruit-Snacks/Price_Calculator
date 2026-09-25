// App State
let dogs = [];
let currentDateTimeInput = null;
let currentDogData = { name: '', breed: '', size: '' };
let lastEstimate = null;          // the most recent calculation; the card and receipt render from this
let lastFocusedElement = null;    // element to return focus to when a dialog closes
let scrollLockY = 0;

// Pricing constants (single source of truth — the page text is filled from these at startup)
const NIGHTLY_RATE = 55;            // per 24-hour session, per pet (first pet)
const HOURLY_RATE = 5;              // per extra hour, per pet (first pet)
const ADDITIONAL_PET_FACTOR = 0.80; // additional pets pay 80% (20% off)
const HOLIDAY_FEE_RATE = 0.05;      // holiday stays add 5% on top of the stay total
const DEPOSIT_AMOUNT = 50;          // due at booking for longer stays
const DEPOSIT_MIN_DAYS = 3;         // stays of this many 24-hour days or more need the deposit

const MINUTES_PER_DAY = 24 * 60;

// DOM Elements
const form = document.getElementById('calculator-form');
const dropoffInput = document.getElementById('dropoff-date');
const pickupInput = document.getElementById('pickup-date');
const dogsContainer = document.getElementById('dogs-container');
const addDogBtn = document.getElementById('add-dog-btn');
const resultsDiv = document.getElementById('results');
const holidayToggle = document.getElementById('holiday-toggle');
const calcStatus = document.getElementById('calc-status');

// Modals
const datetimeModal = document.getElementById('datetime-modal');
const dogModal = document.getElementById('dog-modal');
const datePicker = document.getElementById('date-picker');
const timePicker = document.getElementById('time-picker');
const dogNameInput = document.getElementById('dog-name');
const dogBreedInput = document.getElementById('dog-breed');

const currencyFormatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

function throttle(func, limit) {
    let inThrottle;
    return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    }
}

function prefersReducedMotion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function domReady(callback) {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', callback);
    } else {
        callback();
    }
}

domReady(function() {
    // The theme itself is applied by the inline script in <head> before first paint;
    // this only syncs the toggle button and the browser chrome colour.
    syncThemeUI();

    setupEventListeners();
    fillPricingText();
    setupIntersectionObserver();
    setupFAQ();
    setupMobileNav();

    document.querySelectorAll('.current-year').forEach(el => {
        el.textContent = new Date().getFullYear();
    });
});

// Every rate shown in the copy comes from the constants above, so a price change is a one-line edit.
function fillPricingText() {
    const fill = (selector, text) => document.querySelectorAll(selector).forEach(el => { el.textContent = text; });
    fill('.nightly-rate-value', formatCurrency(NIGHTLY_RATE, true));
    fill('.hourly-rate-value', formatCurrency(HOURLY_RATE, true));
    fill('.pet-discount-value', formatPercent(1 - ADDITIONAL_PET_FACTOR));
    fill('.holiday-fee-value', formatPercent(HOLIDAY_FEE_RATE));
    fill('.deposit-value', formatCurrency(DEPOSIT_AMOUNT, true));
    fill('.deposit-days-value', String(DEPOSIT_MIN_DAYS));
    fill('.second-pet-rate-value', formatCurrency(NIGHTLY_RATE * ADDITIONAL_PET_FACTOR, true));
    fill('.two-pet-total-value', formatCurrency(NIGHTLY_RATE * (1 + ADDITIONAL_PET_FACTOR), true));
    fill('.hour-cap-value', String(maxExtraHours()));

    document.getElementById('twenty-four-hour-rate').textContent = '× ' + formatCurrency(NIGHTLY_RATE);
    document.getElementById('extra-hours-rate').textContent = '× ' + formatCurrency(HOURLY_RATE);
    document.getElementById('holiday-toggle-hint').textContent =
        `Adds a ${formatPercent(HOLIDAY_FEE_RATE)} holiday fee to the stay total`;
}

// Extra hours beyond this many would cost as much as another full day, so they roll into one.
function maxExtraHours() {
    return Math.ceil(NIGHTLY_RATE / HOURLY_RATE) - 1;
}

function setupEventListeners() {
    document.getElementById('theme-toggle').addEventListener('click', toggleTheme);

    // Date fields open the picker with a click or the keyboard
    [dropoffInput, pickupInput].forEach(input => {
        input.addEventListener('click', () => openDateTimeModal(input));
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
                e.preventDefault();
                openDateTimeModal(input);
            }
        });
    });

    // DateTime modal
    document.getElementById('cancel-datetime-btn').addEventListener('click', closeDateTimeModal);
    document.getElementById('save-datetime-btn').addEventListener('click', saveDateTimeModal);
    timePicker.addEventListener('input', clearQuickTimeSelection);

    document.querySelectorAll('.quick-time-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            clearQuickTimeSelection();
            btn.classList.add('selected');
            btn.setAttribute('aria-pressed', 'true');
            timePicker.value = btn.dataset.time;
        });
    });

    // Dog management
    addDogBtn.addEventListener('click', openDogModal);
    document.getElementById('cancel-dog-btn').addEventListener('click', closeDogModal);
    document.getElementById('save-dog-btn').addEventListener('click', saveDogModal);
    dogsContainer.addEventListener('click', (e) => {
        const btn = e.target.closest('.remove-dog-btn');
        if (btn) removeDog(Number(btn.dataset.id));
    });

    // Size selection
    document.querySelectorAll('.size-option').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.size-option').forEach(b => {
                b.classList.remove('selected');
                b.setAttribute('aria-pressed', 'false');
            });
            btn.classList.add('selected');
            btn.setAttribute('aria-pressed', 'true');
            currentDogData.size = btn.dataset.size;
            updateSaveButton();
        });
    });

    // Holiday switch
    holidayToggle.addEventListener('change', () => {
        holidayToggle.setAttribute('aria-checked', holidayToggle.checked ? 'true' : 'false');
        invalidateEstimate();
    });

    form.addEventListener('submit', function(e) {
        e.preventDefault();
        calculateCost();
    });

    document.getElementById('print-estimate-btn').addEventListener('click', printEstimate);
    document.getElementById('save-calendar-btn').addEventListener('click', saveToCalendar);
    document.getElementById('clear-data-btn').addEventListener('click', clearAllData);

    // Dialog behaviour shared by both modals: click outside, Escape, Enter, focus trapping
    [datetimeModal, dogModal].forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal(modal);
        });
        modal.addEventListener('keydown', (e) => handleModalKeydown(e, modal));
    });

    dogNameInput.addEventListener('input', updateSaveButton);
    dogBreedInput.addEventListener('input', updateSaveButton);
}

// ---------- Dialogs ----------

function focusableIn(modal) {
    return Array.from(modal.querySelectorAll(
        'button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )).filter(el => el.offsetParent !== null);
}

function openModal(modal, initialFocus) {
    lastFocusedElement = document.activeElement;
    modal.classList.remove('hidden');
    lockScroll();
    (initialFocus || focusableIn(modal)[0] || modal).focus();
}

function closeModal(modal) {
    if (modal === datetimeModal) currentDateTimeInput = null;
    modal.classList.add('hidden');
    unlockScroll();
    if (lastFocusedElement && typeof lastFocusedElement.focus === 'function') {
        lastFocusedElement.focus();
    }
    lastFocusedElement = null;
}

function handleModalKeydown(e, modal) {
    if (e.key === 'Escape') {
        e.preventDefault();
        closeModal(modal);
        return;
    }
    if (e.key === 'Enter' && e.target.tagName === 'INPUT') {
        e.preventDefault();
        if (modal === datetimeModal) saveDateTimeModal();
        else saveDogModal();
        return;
    }
    if (e.key === 'Tab') {
        const items = focusableIn(modal);
        if (items.length === 0) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
        }
    }
}

// Keep the page from scrolling under an open dialog (overflow:hidden alone does not stop iOS)
function lockScroll() {
    scrollLockY = window.scrollY;
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollLockY}px`;
    document.body.style.width = '100%';
}

function unlockScroll() {
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.width = '';
    window.scrollTo({ top: scrollLockY, behavior: 'instant' });
}

// ---------- Date & time picker ----------

function toLocalDateString(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function toLocalTimeString(date) {
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function clearQuickTimeSelection() {
    document.querySelectorAll('.quick-time-btn').forEach(b => {
        b.classList.remove('selected');
        b.setAttribute('aria-pressed', 'false');
    });
}

function openDateTimeModal(input) {
    currentDateTimeInput = input;
    const isDropoff = input === dropoffInput;

    document.getElementById('datetime-title').textContent = isDropoff ? 'Drop-off Date & Time' : 'Pick-up Date & Time';
    document.getElementById('datetime-subtitle').textContent = isDropoff
        ? 'When will you bring your pet to us?'
        : 'When will you pick your pet up?';

    // Start from this field's saved value; otherwise from a sensible default
    let start;
    if (input.dataset.dateValue) {
        start = new Date(input.dataset.dateValue);
    } else if (!isDropoff && dropoffInput.dataset.dateValue) {
        start = new Date(dropoffInput.dataset.dateValue);
        start.setDate(start.getDate() + 1);          // pick-up defaults to one day after drop-off
    } else {
        start = new Date();
        start.setHours(9, 0, 0, 0);
    }

    datePicker.min = toLocalDateString(new Date());
    datePicker.value = toLocalDateString(start);
    timePicker.value = toLocalTimeString(start);

    clearQuickTimeSelection();
    const match = document.querySelector(`.quick-time-btn[data-time="${timePicker.value}"]`);
    if (match) {
        match.classList.add('selected');
        match.setAttribute('aria-pressed', 'true');
    }

    openModal(datetimeModal, datePicker);
}

function closeDateTimeModal() {
    closeModal(datetimeModal);
}

function saveDateTimeModal() {
    if (!datePicker.value || !timePicker.value || !currentDateTimeInput) return;

    const date = new Date(datePicker.value + 'T' + timePicker.value);
    currentDateTimeInput.value = formatDateTime(date);
    currentDateTimeInput.dataset.dateValue = date.toISOString();

    invalidateEstimate();
    closeDateTimeModal();
}

function formatDateTime(date) {
    return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) + ' at ' +
           date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

// ---------- Pets ----------

function openDogModal() {
    currentDogData = { name: '', breed: '', size: '' };
    dogNameInput.value = '';
    dogBreedInput.value = '';
    document.querySelectorAll('.size-option').forEach(b => {
        b.classList.remove('selected');
        b.setAttribute('aria-pressed', 'false');
    });
    updateSaveButton();
    openModal(dogModal, dogNameInput);
}

function closeDogModal() {
    closeModal(dogModal);
}

function saveDogModal() {
    if (!currentDogData.name || !currentDogData.size) return;

    dogs.push({
        id: Date.now(),
        name: currentDogData.name,
        breed: currentDogData.breed || 'Breed not specified',
        size: currentDogData.size
    });

    renderDogs();
    invalidateEstimate();
    closeDogModal();
}

function updateSaveButton() {
    currentDogData.name = dogNameInput.value.trim();
    currentDogData.breed = dogBreedInput.value.trim();

    const ready = currentDogData.name && currentDogData.size;
    document.getElementById('save-dog-btn').disabled = !ready;

    const hint = document.getElementById('dog-modal-hint');
    if (ready) {
        hint.textContent = '';
    } else if (!currentDogData.name && !currentDogData.size) {
        hint.textContent = 'Enter a name and choose a size to continue.';
    } else if (!currentDogData.name) {
        hint.textContent = 'Enter a name to continue.';
    } else {
        hint.textContent = 'Choose a size to continue.';
    }
}

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function renderDogs() {
    dogsContainer.innerHTML = '';

    dogs.forEach(dog => {
        const dogCard = document.createElement('div');
        dogCard.className = 'dog-card';
        dogCard.innerHTML = `
            <div class="dog-info">
                <strong class="dog-name">${escapeHtml(dog.name)}</strong>
                <div class="dog-details">${escapeHtml(dog.breed)} • ${capitalizeFirst(dog.size)}</div>
            </div>
            <button type="button" class="remove-dog-btn" data-id="${dog.id}" aria-label="Remove ${escapeHtml(dog.name)}">Remove</button>
        `;
        dogsContainer.appendChild(dogCard);
    });

    if (dogs.length > 0) hideError('pets-error');
}

function removeDog(id) {
    dogs = dogs.filter(dog => dog.id !== id);
    renderDogs();
    invalidateEstimate();
}

// ---------- Validation ----------

function showError(elementId, message) {
    const errorElement = document.getElementById(elementId);
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.classList.remove('hidden');
    }
}

function hideError(elementId) {
    const errorElement = document.getElementById(elementId);
    if (errorElement) {
        errorElement.classList.add('hidden');
    }
}

function setInputState(input, state) {
    input.classList.remove('error', 'success');
    if (state) input.classList.add(state);
    input.setAttribute('aria-invalid', state === 'error' ? 'true' : 'false');
}

function validateForm() {
    let firstInvalid = null;

    hideError('dropoff-error');
    hideError('pickup-error');
    hideError('pets-error');
    setInputState(dropoffInput, '');
    setInputState(pickupInput, '');

    if (!dropoffInput.dataset.dateValue) {
        showError('dropoff-error', 'Please select a drop-off date and time');
        setInputState(dropoffInput, 'error');
        firstInvalid = firstInvalid || dropoffInput;
    } else {
        setInputState(dropoffInput, 'success');
    }

    if (!pickupInput.dataset.dateValue) {
        showError('pickup-error', 'Please select a pick-up date and time');
        setInputState(pickupInput, 'error');
        firstInvalid = firstInvalid || pickupInput;
    } else {
        setInputState(pickupInput, 'success');
    }

    if (dropoffInput.dataset.dateValue && pickupInput.dataset.dateValue) {
        const dropoff = new Date(dropoffInput.dataset.dateValue);
        const pickup = new Date(pickupInput.dataset.dateValue);

        if (pickup <= dropoff) {
            showError('pickup-error', 'Pick-up time must be after drop-off time');
            setInputState(pickupInput, 'error');
            firstInvalid = firstInvalid || pickupInput;
        }
    }

    if (dogs.length === 0) {
        showError('pets-error', 'Please add at least one pet');
        firstInvalid = firstInvalid || addDogBtn;
    }

    if (firstInvalid) {
        firstInvalid.focus();
        return false;
    }
    return true;
}

// ---------- Calculation ----------

function setLoadingState(loading) {
    const button = document.querySelector('.calculate-btn');
    button.querySelector('.btn-text').classList.toggle('hidden', loading);
    button.querySelector('.btn-loading').classList.toggle('hidden', !loading);
    button.disabled = loading;
}

// Length of stay in whole minutes of local wall-clock time, so a 9am-to-9am night is
// always 24 hours even when the clocks change in between.
function stayMinutes(dropoff, pickup) {
    const elapsed = (pickup - dropoff) / 60000;
    const dstShift = dropoff.getTimezoneOffset() - pickup.getTimezoneOffset();
    return Math.round(elapsed + dstShift);
}

// Split a stay into billed 24-hour days and extra hours. Extra hours are rounded up to the
// next hour, and once they would cost as much as a full day they become another day instead.
function billableUnits(totalMinutes) {
    let days = Math.floor(totalMinutes / MINUTES_PER_DAY);
    let extraHours = Math.ceil((totalMinutes % MINUTES_PER_DAY) / 60);
    if (extraHours * HOURLY_RATE >= NIGHTLY_RATE) {
        days += 1;
        extraHours = 0;
    }
    return { days, extraHours };
}

function roundMoney(amount) {
    return Math.round(amount * 100) / 100;
}

function buildEstimate() {
    const dropoff = new Date(dropoffInput.dataset.dateValue);
    const pickup = new Date(pickupInput.dataset.dateValue);
    const { days, extraHours } = billableUnits(stayMinutes(dropoff, pickup));

    // Per-pet lines: the first pet pays full price, each additional pet pays 80%
    const pets = dogs.map((dog, i) => {
        const factor = i === 0 ? 1 : ADDITIONAL_PET_FACTOR;
        const nightlyRate = roundMoney(NIGHTLY_RATE * factor);
        const hourlyRate = roundMoney(HOURLY_RATE * factor);
        const boarding = roundMoney(days * nightlyRate);
        const hours = roundMoney(extraHours * hourlyRate);
        return {
            name: dog.name,
            breed: dog.breed,
            size: dog.size,
            isFirst: i === 0,
            nightlyRate,
            hourlyRate,
            boarding,
            hours,
            total: roundMoney(boarding + hours)
        };
    });

    const baseCost = roundMoney(days * NIGHTLY_RATE + extraHours * HOURLY_RATE);   // one pet at full price
    const stayCost = roundMoney(pets.reduce((sum, p) => sum + p.total, 0));
    const multiPetDiscount = pets.length > 1 ? roundMoney(baseCost * pets.length - stayCost) : 0;
    const holidayFee = holidayToggle.checked ? roundMoney(stayCost * HOLIDAY_FEE_RATE) : 0;
    const totalCost = roundMoney(stayCost + holidayFee);
    const depositDue = days >= DEPOSIT_MIN_DAYS ? DEPOSIT_AMOUNT : 0;

    return {
        generatedAt: new Date(),
        dropoff,
        pickup,
        dropoffLabel: dropoffInput.value,
        pickupLabel: pickupInput.value,
        days,
        extraHours,
        pets,
        baseCost,
        stayCost,
        multiPetDiscount,
        holidayFee,
        totalCost,
        depositDue,
        balanceDue: roundMoney(totalCost - depositDue)
    };
}

function calculateCost() {
    if (!validateForm()) return;

    setLoadingState(true);
    announce('Calculating your estimate…');

    // Brief pause so the button visibly responds before the estimate appears
    setTimeout(() => {
        lastEstimate = buildEstimate();
        setLoadingState(false);
        displayResults(lastEstimate);
    }, 400);
}

// Any change to the inputs makes the estimate on screen out of date, so hide it until recalculated
function invalidateEstimate() {
    if (!lastEstimate) return;
    lastEstimate = null;
    resultsDiv.classList.add('hidden');
}

function announce(message) {
    if (!calcStatus) return;
    calcStatus.textContent = '';
    // A tiny delay makes screen readers re-announce identical messages
    setTimeout(() => { calcStatus.textContent = message; }, 50);
}

function formatCurrency(amount, whole) {
    if (whole && Number.isInteger(amount)) {
        return currencyFormatter.format(amount).replace(/\.00$/, '');
    }
    return currencyFormatter.format(amount);
}

function formatPercent(rate) {
    return Math.round(rate * 1000) / 10 + '%';
}

function servicePeriodLabel(days, extraHours) {
    const dayPart = days > 0 ? `${days} day${days !== 1 ? 's' : ''}` : '';
    const hourPart = extraHours > 0 ? `${extraHours} hr${extraHours !== 1 ? 's' : ''}` : '';
    return [dayPart, hourPart].filter(Boolean).join(', ') || '0 hrs';
}

function formatEstimateDate(date) {
    return date.toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' });
}

function displayResults(est) {
    document.getElementById('estimate-date').textContent = formatEstimateDate(est.generatedAt);
    document.getElementById('service-period-display').textContent = servicePeriodLabel(est.days, est.extraHours);
    document.getElementById('dropoff-display').textContent = est.dropoffLabel || '—';
    document.getElementById('pickup-display').textContent = est.pickupLabel || '—';
    document.getElementById('pets-list-display').textContent =
        est.pets.map(p => `${p.name} (${p.breed})`).join(', ') || '—';

    // Single-pet rate rows
    document.getElementById('twenty-four-hour-count').textContent = est.days;
    document.getElementById('twenty-four-hour-cost').textContent = formatCurrency(est.days * NIGHTLY_RATE);
    document.getElementById('extra-hours-count').textContent = est.extraHours;
    document.getElementById('extra-hours-cost').textContent = formatCurrency(est.extraHours * HOURLY_RATE);
    document.getElementById('base-subtotal').textContent = formatCurrency(est.baseCost);

    const perPetHeader = document.getElementById('per-pet-header');
    const perPetContainer = document.getElementById('per-pet-breakdown');
    const multiDogRow = document.getElementById('multi-dog-row');
    const singlePetRows = [
        document.getElementById('twenty-four-hour-row'),
        document.getElementById('extra-hours-row'),
        document.getElementById('base-subtotal-row')
    ];
    perPetContainer.innerHTML = '';

    const multiPet = est.pets.length > 1;
    singlePetRows.forEach(row => { row.style.display = multiPet ? 'none' : 'flex'; });
    perPetHeader.style.display = multiPet ? 'block' : 'none';
    multiDogRow.style.display = multiPet ? 'block' : 'none';

    if (multiPet) {
        est.pets.forEach(p => {
            const tag = p.isFirst ? 'full price' : `${formatPercent(1 - ADDITIONAL_PET_FACTOR)} off`;
            let subRows = '';
            if (est.days > 0) {
                subRows += `
                    <div class="per-pet-sub">
                        <span class="sub-desc">24-Hour Boarding</span>
                        <span class="sub-calc">${est.days} × ${formatCurrency(p.nightlyRate)}</span>
                        <span class="sub-amount">${formatCurrency(p.boarding)}</span>
                    </div>`;
            }
            if (est.extraHours > 0) {
                subRows += `
                    <div class="per-pet-sub">
                        <span class="sub-desc">Additional Hours</span>
                        <span class="sub-calc">${est.extraHours} × ${formatCurrency(p.hourlyRate)}</span>
                        <span class="sub-amount">${formatCurrency(p.hours)}</span>
                    </div>`;
            }

            const group = document.createElement('div');
            group.className = 'per-pet-group';
            group.innerHTML = `
                <div class="line-item per-pet-item">
                    <div class="item-description">${escapeHtml(p.name)} <span class="per-pet-tag">(${tag})</span></div>
                    <div class="item-amount">${formatCurrency(p.total)}</div>
                </div>
                ${subRows}
            `;
            perPetContainer.appendChild(group);
        });

        // The discounted rates are already in each pet's lines above, so this is a note, not a deduction
        document.getElementById('multi-dog-surcharge').textContent = formatCurrency(est.multiPetDiscount);
    }

    const holidayRow = document.getElementById('holiday-fee-row');
    holidayRow.style.display = est.holidayFee > 0 ? 'flex' : 'none';
    document.getElementById('holiday-fee-amount').textContent = formatCurrency(est.holidayFee);

    document.getElementById('total-cost').textContent = formatCurrency(est.totalCost);

    const depositRow = document.getElementById('deposit-row');
    depositRow.classList.toggle('hidden', est.depositDue === 0);
    document.getElementById('deposit-due').textContent = formatCurrency(est.depositDue);
    document.getElementById('balance-due').textContent = formatCurrency(est.balanceDue);

    resultsDiv.classList.remove('hidden');
    announce(`Estimate ready. Total ${formatCurrency(est.totalCost)}.`);

    setTimeout(() => {
        resultsDiv.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
        resultsDiv.focus({ preventScroll: true });
    }, 100);
}

// ---------- Page behaviour ----------

function setupIntersectionObserver() {
    const targets = document.querySelectorAll('.fade-in');
    if (!('IntersectionObserver' in window) || prefersReducedMotion()) {
        targets.forEach(el => el.classList.add('visible'));
        return;
    }

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                requestAnimationFrame(() => entry.target.classList.add('visible'));
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1, rootMargin: '50px 0px -10% 0px' });

    targets.forEach(el => observer.observe(el));
}

let scrolled = false;
const handleScroll = throttle(() => {
    const nav = document.querySelector('nav');
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;

    if (scrollTop > 50 && !scrolled) {
        nav.classList.add('scrolled');
        scrolled = true;
    } else if (scrollTop <= 50 && scrolled) {
        nav.classList.remove('scrolled');
        scrolled = false;
    }
}, 16);

window.addEventListener('scroll', handleScroll, { passive: true });

function setupMobileNav() {
    const menuBtn = document.getElementById('nav-menu-btn');
    const links = document.getElementById('nav-links');
    if (!menuBtn || !links) return;

    const setOpen = (open) => {
        links.classList.toggle('open', open);
        menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
        menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    };

    menuBtn.addEventListener('click', () => setOpen(!links.classList.contains('open')));
    links.querySelectorAll('a').forEach(a => a.addEventListener('click', () => setOpen(false)));
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && links.classList.contains('open')) {
            setOpen(false);
            menuBtn.focus();
        }
    });
    document.addEventListener('click', (e) => {
        if (links.classList.contains('open') && !e.target.closest('nav')) setOpen(false);
    });
}

function setupFAQ() {
    const items = Array.from(document.querySelectorAll('.faq-item'));

    items.forEach((item, i) => {
        const btn = item.querySelector('.faq-question');
        const answer = item.querySelector('.faq-answer');
        answer.id = answer.id || `faq-answer-${i + 1}`;
        btn.setAttribute('aria-expanded', 'false');
        btn.setAttribute('aria-controls', answer.id);

        btn.addEventListener('click', () => {
            const wasOpen = item.classList.contains('open');

            items.forEach(other => {
                other.classList.remove('open');
                other.querySelector('.faq-answer').style.maxHeight = null;
                other.querySelector('.faq-question').setAttribute('aria-expanded', 'false');
            });

            if (!wasOpen) {
                item.classList.add('open');
                answer.style.maxHeight = answer.scrollHeight + 'px';
                btn.setAttribute('aria-expanded', 'true');
            }
        });
    });
}

function capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

// ---------- Theme ----------

function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    document.querySelector('meta[name="theme-color"]').content = theme === 'dark' ? '#1A0D2E' : '#F0EAFF';
    const toggle = document.getElementById('theme-toggle');
    toggle.setAttribute('aria-pressed', theme === 'dark' ? 'true' : 'false');
    toggle.setAttribute('aria-label', theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
}

function syncThemeUI() {
    applyTheme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light');
}

function toggleTheme() {
    const newTheme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    applyTheme(newTheme);
    try {
        localStorage.setItem('preferred-theme', newTheme);
    } catch (e) {
        // Storage can be unavailable in private browsing; the theme still applies for this visit
    }
}

// ---------- Print & calendar ----------

function printEstimate() {
    if (!lastEstimate) return;
    updatePrintReceipt(lastEstimate);

    const originalTitle = document.title;
    document.title = `Estimate - Dog Sitting At Danni's House - ${formatEstimateDate(lastEstimate.generatedAt)}`;
    window.print();
    document.title = originalTitle;
}

// iCalendar text escaping (RFC 5545 §3.3.11)
function icsEscape(text) {
    return String(text)
        .replace(/\\/g, '\\\\')
        .replace(/;/g, '\\;')
        .replace(/,/g, '\\,')
        .replace(/\r?\n/g, '\\n');
}

// Lines longer than 75 octets must be folded onto continuation lines
function icsFold(line) {
    const parts = [];
    let rest = line;
    while (rest.length > 75) {
        parts.push(rest.slice(0, 75));
        rest = ' ' + rest.slice(75);
    }
    parts.push(rest);
    return parts.join('\r\n');
}

function icsDate(date) {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

function saveToCalendar() {
    if (!lastEstimate) return;
    const est = lastEstimate;

    const petList = est.pets.map(p => `${p.name} (${p.breed}, ${capitalizeFirst(p.size)})`).join(', ');
    const description = [
        `Dog sitting at Danni's House.`,
        ``,
        `Pets: ${petList}`,
        `Drop-off: ${est.dropoffLabel}`,
        `Pick-up: ${est.pickupLabel}`,
        `Estimated cost: ${formatCurrency(est.totalCost)}` + (est.depositDue ? ` (${formatCurrency(est.depositDue)} deposit due at booking)` : ''),
        ``,
        `This is an estimate; final pricing is confirmed at booking.`
    ].join('\n');

    const lines = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Dog Sitting At Danni\'s House//Estimate//EN',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
        'BEGIN:VEVENT',
        `UID:${est.dropoff.getTime()}-${est.generatedAt.getTime()}@dannishouse`,
        `DTSTAMP:${icsDate(est.generatedAt)}`,
        `DTSTART:${icsDate(est.dropoff)}`,
        `DTEND:${icsDate(est.pickup)}`,
        `SUMMARY:${icsEscape(`Dog Sitting at Danni's House - ${est.pets.map(p => p.name).join(', ')}`)}`,
        `DESCRIPTION:${icsEscape(description)}`,
        'STATUS:TENTATIVE',
        'END:VEVENT',
        'END:VCALENDAR'
    ].map(icsFold);

    const blob = new Blob([lines.join('\r\n') + '\r\n'], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `dog-sitting-${toLocalDateString(est.dropoff)}.ics`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
}

function clearAllData() {
    if (!confirm('Clear all pets and dates?')) return;

    dropoffInput.value = '';
    pickupInput.value = '';
    delete dropoffInput.dataset.dateValue;
    delete pickupInput.dataset.dateValue;

    dogs = [];
    renderDogs();

    holidayToggle.checked = false;
    holidayToggle.setAttribute('aria-checked', 'false');

    lastEstimate = null;
    resultsDiv.classList.add('hidden');

    document.querySelectorAll('.input-error').forEach(el => el.classList.add('hidden'));
    [dropoffInput, pickupInput].forEach(input => setInputState(input, ''));

    dropoffInput.focus();
}

function receiptRow(cells, options = {}) {
    const row = document.createElement('tr');
    if (options.className) row.className = options.className;
    cells.forEach((text, i) => {
        const td = document.createElement('td');
        td.textContent = text;
        if (i === 0 && options.indent) td.className = 'indent';
        row.appendChild(td);
    });
    return row;
}

function updatePrintReceipt(est) {
    document.getElementById('receipt-date').textContent = formatEstimateDate(est.generatedAt);
    document.getElementById('receipt-dropoff').textContent = est.dropoffLabel;
    document.getElementById('receipt-pickup').textContent = est.pickupLabel;
    document.getElementById('receipt-period').textContent = servicePeriodLabel(est.days, est.extraHours);
    document.getElementById('receipt-pets').textContent =
        est.pets.map(p => `${p.name} (${p.breed}, ${capitalizeFirst(p.size)})`).join(', ');

    const breakdown = document.getElementById('receipt-breakdown');
    breakdown.innerHTML = '';

    const addLines = (p, indent) => {
        if (est.days > 0) {
            breakdown.appendChild(receiptRow(
                ['24-Hour Boarding', est.days, formatCurrency(p.nightlyRate), formatCurrency(p.boarding)], { indent }));
        }
        if (est.extraHours > 0) {
            breakdown.appendChild(receiptRow(
                ['Additional Hours', est.extraHours, formatCurrency(p.hourlyRate), formatCurrency(p.hours)], { indent }));
        }
    };

    if (est.pets.length === 1) {
        addLines(est.pets[0], false);
    } else {
        est.pets.forEach(p => {
            const tag = p.isFirst ? 'full price' : `${formatPercent(1 - ADDITIONAL_PET_FACTOR)} off`;
            const header = document.createElement('tr');
            header.className = 'pet-row';
            const td = document.createElement('td');
            td.colSpan = 4;
            td.textContent = `${p.name} (${tag})`;
            header.appendChild(td);
            breakdown.appendChild(header);
            addLines(p, true);
        });
        breakdown.appendChild(receiptRow(
            ['Multi-pet discount (already applied above)', '—', '—', `you save ${formatCurrency(est.multiPetDiscount)}`],
            { className: 'note-row' }));
    }

    if (est.holidayFee > 0) {
        breakdown.appendChild(receiptRow(
            ['Holiday Fee', '—', formatPercent(HOLIDAY_FEE_RATE), formatCurrency(est.holidayFee)]));
    }

    document.getElementById('receipt-total').textContent = formatCurrency(est.totalCost);

    document.querySelectorAll('#print-receipt .deposit-row').forEach(row => {
        row.style.display = est.depositDue > 0 ? '' : 'none';
    });
    document.getElementById('receipt-deposit').textContent = formatCurrency(est.depositDue);
    document.getElementById('receipt-balance').textContent = formatCurrency(est.balanceDue);
    document.getElementById('receipt-payment-note').textContent = est.depositDue > 0
        ? `Cash preferred, Venmo accepted. ${formatCurrency(DEPOSIT_AMOUNT, true)} deposit due at booking; balance due at pick-up.`
        : 'Cash preferred, Venmo accepted. Payment due at pick-up.';
}
