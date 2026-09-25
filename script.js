// App State
let dogs = [];
let currentDateTimeInput = null;
let currentDogData = { name: '', breed: '', size: '' };

// Pricing constants (single source of truth)
const NIGHTLY_RATE = 55;          // per 24-hour session, per pet (first pet)
const HOURLY_RATE = 5;            // per extra hour, per pet (first pet)
const ADDITIONAL_PET_FACTOR = 0.80; // additional pets pay 80% (20% off)
const HOLIDAY_FEE = 25;           // flat fee per stay when the holiday toggle is on

// DOM Elements
const form = document.getElementById('calculator-form');
const dropoffInput = document.getElementById('dropoff-date');
const pickupInput = document.getElementById('pickup-date');
const dogsContainer = document.getElementById('dogs-container');
const addDogBtn = document.getElementById('add-dog-btn');
const resultsDiv = document.getElementById('results');
const holidayToggle = document.getElementById('holiday-toggle');

// Modals
const datetimeModal = document.getElementById('datetime-modal');
const dogModal = document.getElementById('dog-modal');
const datePicker = document.getElementById('date-picker');
const timePicker = document.getElementById('time-picker');
const dogNameInput = document.getElementById('dog-name');
const dogBreedInput = document.getElementById('dog-breed');

// Performance utilities
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

function runWhenIdle(callback) {
    if ('requestIdleCallback' in window) {
        window.requestIdleCallback(callback);
    } else {
        setTimeout(callback, 1);
    }
}

// Optimized DOM ready
function domReady(callback) {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', callback);
    } else {
        callback();
    }
}

// Initialize with performance optimization
domReady(function() {
    // Initialize theme first (prevents flash)
    initializeTheme();

    // Critical path first
    setupEventListeners();
    document.getElementById('holiday-toggle-hint').textContent =
        `Adds a ${formatCurrency(HOLIDAY_FEE)} holiday fee to the stay`;

    // Non-critical in idle time
    runWhenIdle(() => {
        setupIntersectionObserver();
        setupFAQ();
        preloadCriticalResources();
    });
});

function setupEventListeners() {
    // Theme toggle
    document.getElementById('theme-toggle').addEventListener('click', toggleTheme);

    // Date inputs
    dropoffInput.addEventListener('click', () => openDateTimeModal(dropoffInput));
    pickupInput.addEventListener('click', () => openDateTimeModal(pickupInput));

    // DateTime modal
    document.getElementById('cancel-datetime-btn').addEventListener('click', closeDateTimeModal);
    document.getElementById('save-datetime-btn').addEventListener('click', saveDateTimeModal);

    // Quick time buttons
    document.querySelectorAll('.quick-time-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove previous selection
            document.querySelectorAll('.quick-time-btn').forEach(b => b.classList.remove('selected'));
            // Add selection to clicked button
            btn.classList.add('selected');
            // Set time picker value
            timePicker.value = btn.dataset.time;
        });
    });

    // Dog management
    addDogBtn.addEventListener('click', openDogModal);
    document.getElementById('cancel-dog-btn').addEventListener('click', closeDogModal);
    document.getElementById('save-dog-btn').addEventListener('click', saveDogModal);

    // Size selection
    document.querySelectorAll('.size-option').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.size-option').forEach(b => {
                b.style.borderColor = 'var(--surface0)';
            });
            btn.style.borderColor = 'var(--accent)';
            currentDogData.size = btn.dataset.size;
            updateSaveButton();
        });
    });

    // Form submission
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        calculateCost();
    });

    // Action buttons (initially hidden until results are shown)
    document.getElementById('print-estimate-btn').addEventListener('click', printEstimate);
    document.getElementById('save-calendar-btn').addEventListener('click', saveToCalendar);
    document.getElementById('clear-data-btn').addEventListener('click', clearAllData);

    // Modal click outside to close
    datetimeModal.addEventListener('click', (e) => {
        if (e.target === datetimeModal) closeDateTimeModal();
    });
    dogModal.addEventListener('click', (e) => {
        if (e.target === dogModal) closeDogModal();
    });

    // Input validation
    dogNameInput.addEventListener('input', updateSaveButton);
}

function openDateTimeModal(input) {
    currentDateTimeInput = input;
    datetimeModal.classList.remove('hidden');

    // Set default date to today if empty
    if (!datePicker.value) {
        datePicker.value = new Date().toISOString().split('T')[0];
    }
    // Set default time to 9:00 AM if empty
    if (!timePicker.value) {
        timePicker.value = '09:00';
    }
}

function closeDateTimeModal() {
    datetimeModal.classList.add('hidden');
    currentDateTimeInput = null;
}

function saveDateTimeModal() {
    if (!datePicker.value || !timePicker.value) return;

    const date = new Date(datePicker.value + 'T' + timePicker.value);
    const dateValue = date.toISOString();
    const displayValue = date.toLocaleDateString() + ' at ' +
                       date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    currentDateTimeInput.value = displayValue;
    currentDateTimeInput.dataset.dateValue = dateValue;

    closeDateTimeModal();
}

function openDogModal() {
    dogModal.classList.remove('hidden');
    currentDogData = { name: '', breed: '', size: '' };
    dogNameInput.value = '';
    dogBreedInput.value = '';

    // Reset size buttons
    document.querySelectorAll('.size-option').forEach(b => {
        b.style.borderColor = 'var(--surface0)';
    });

    updateSaveButton();
}

function closeDogModal() {
    dogModal.classList.add('hidden');
}

function saveDogModal() {
    if (!currentDogData.name || !currentDogData.size) return;

    const dog = {
        id: Date.now(),
        name: currentDogData.name,
        breed: currentDogData.breed || 'Not specified',
        size: currentDogData.size
    };

    dogs.push(dog);
    renderDogs();
    closeDogModal();
}

function updateSaveButton() {
    currentDogData.name = dogNameInput.value.trim();
    currentDogData.breed = dogBreedInput.value.trim();

    const saveBtn = document.getElementById('save-dog-btn');
    saveBtn.disabled = !currentDogData.name || !currentDogData.size;
}

function renderDogs() {
    dogsContainer.innerHTML = '';

    dogs.forEach(dog => {
        const dogCard = document.createElement('div');
        dogCard.className = 'dog-card';
        dogCard.innerHTML = `
            <div class="dog-info">
                <h4>${dog.name}</h4>
                <div class="dog-details">${dog.breed} • ${capitalizeFirst(dog.size)}</div>
            </div>
            <button type="button" class="remove-dog-btn" onclick="removeDog(${dog.id})">Remove</button>
        `;
        dogsContainer.appendChild(dogCard);
    });
}

function removeDog(id) {
    dogs = dogs.filter(dog => dog.id !== id);
    renderDogs();
}

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
}

function validateForm() {
    let isValid = true;

    // Clear previous errors
    hideError('dropoff-error');
    hideError('pickup-error');
    hideError('pets-error');
    setInputState(dropoffInput, '');
    setInputState(pickupInput, '');

    // Validate dropoff date
    if (!dropoffInput.dataset.dateValue) {
        showError('dropoff-error', 'Please select a drop-off date and time');
        setInputState(dropoffInput, 'error');
        isValid = false;
    } else {
        setInputState(dropoffInput, 'success');
    }

    // Validate pickup date
    if (!pickupInput.dataset.dateValue) {
        showError('pickup-error', 'Please select a pick-up date and time');
        setInputState(pickupInput, 'error');
        isValid = false;
    } else {
        setInputState(pickupInput, 'success');
    }

    // Validate pets
    if (dogs.length === 0) {
        showError('pets-error', 'Please add at least one pet');
        isValid = false;
    }

    // Validate date logic
    if (dropoffInput.dataset.dateValue && pickupInput.dataset.dateValue) {
        const dropoff = new Date(dropoffInput.dataset.dateValue);
        const pickup = new Date(pickupInput.dataset.dateValue);

        if (pickup <= dropoff) {
            showError('pickup-error', 'Pick-up time must be after drop-off time');
            setInputState(pickupInput, 'error');
            isValid = false;
        }
    }

    return isValid;
}

function showLoadingState() {
    const button = document.querySelector('.calculate-btn');
    const btnText = button.querySelector('.btn-text');
    const btnLoading = button.querySelector('.btn-loading');

    btnText.classList.add('hidden');
    btnLoading.classList.remove('hidden');
    button.disabled = true;
}

function hideLoadingState() {
    const button = document.querySelector('.calculate-btn');
    const btnText = button.querySelector('.btn-text');
    const btnLoading = button.querySelector('.btn-loading');

    btnText.classList.remove('hidden');
    btnLoading.classList.add('hidden');
    button.disabled = false;
}

function calculateCost() {
    // Validate form first
    if (!validateForm()) {
        return;
    }

    // Show loading state
    showLoadingState();

    // Simulate calculation delay for professional feel
    setTimeout(() => {
        const dropoff = new Date(dropoffInput.dataset.dateValue);
        const pickup = new Date(pickupInput.dataset.dateValue);

        const totalHours = (pickup - dropoff) / (1000 * 60 * 60);
        const twentyFourHourSessions = Math.floor(totalHours / 24);
        const extraHours = Math.max(0, totalHours - (twentyFourHourSessions * 24));

        // Updated pricing: $55 for 24-hour sessions
        const sessionCost = twentyFourHourSessions * NIGHTLY_RATE;
        const extraHoursCost = Math.ceil(extraHours) * HOURLY_RATE;
        const baseCost = sessionCost + extraHoursCost;

        // Multi-pet pricing: first pet full price, each additional pet at 80% (20% off).
        // Total = base x (1 + 0.20-off applied to each additional pet).
        const numDogs = dogs.length;
        const multiplier = 1 + (numDogs - 1) * ADDITIONAL_PET_FACTOR;
        const holidayFee = holidayToggle.checked ? HOLIDAY_FEE : 0;
        const totalCost = baseCost * multiplier + holidayFee;

        // Discount = what all pets would cost at full price minus the actual total.
        const fullPriceCost = baseCost * numDogs;
        const multiPetDiscount = numDogs > 1 ? fullPriceCost - baseCost * multiplier : 0;

        // Hide loading state
        hideLoadingState();

        displayResults(numDogs, twentyFourHourSessions, Math.ceil(extraHours),
                      sessionCost, extraHoursCost, baseCost, multiPetDiscount, fullPriceCost, holidayFee, totalCost);
    }, 800); // Professional delay
}

function formatCurrency(amount) {
    return '$' + amount.toFixed(2);
}

function generateQuoteNumber() {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 100).toString().padStart(2, '0');
    return `${year}${month}${day}-${random}`;
}

function displayResults(numDogs, sessions, extraHours, sessionCost, extraHoursCost, baseCost, multiPetDiscount, fullPriceCost, holidayFee, totalCost) {
    // Generate quote number
    document.getElementById('quote-number').textContent = generateQuoteNumber();

    // Build service period label from the billed breakdown (sessions + extra hours)
    // so it always reconciles with the line items below.
    const dayPart = sessions > 0 ? `${sessions} day${sessions !== 1 ? 's' : ''}` : '';
    const hourPart = extraHours > 0 ? `${extraHours} hr${extraHours !== 1 ? 's' : ''}` : '';
    let servicePeriod = [dayPart, hourPart].filter(Boolean).join(', ');
    if (!servicePeriod) servicePeriod = '0 hrs';

    // Update estimate details with actual booking info
    document.getElementById('service-period-display').textContent = servicePeriod;
    document.getElementById('dropoff-display').textContent = dropoffInput.value || '—';
    document.getElementById('pickup-display').textContent = pickupInput.value || '—';

    // Create pet names list
    const petNames = dogs.map(dog => `${dog.name} (${dog.breed})`).join(', ');
    document.getElementById('pets-list-display').textContent = petNames || '—';

    // Update line items with proper formatting
    document.getElementById('twenty-four-hour-count').textContent = sessions;
    document.getElementById('twenty-four-hour-cost').textContent = formatCurrency(sessionCost);
    document.getElementById('extra-hours-count').textContent = extraHours;
    document.getElementById('extra-hours-cost').textContent = formatCurrency(extraHoursCost);

    // Ensure subtotal calculation is explicit and bulletproof
    const calculatedSubtotal = sessionCost + extraHoursCost;
    document.getElementById('base-subtotal').textContent = formatCurrency(calculatedSubtotal);

    // Verify baseCost matches the explicit calculation
    if (baseCost !== calculatedSubtotal) {
        console.error('Subtotal mismatch detected:', { baseCost, calculatedSubtotal, sessionCost, extraHoursCost });
    }

    // Build per-pet pricing list: first pet full price, each additional pet 20% off.
    // Each pet block breaks down its own boarding + hourly components.
    const perPetHeader = document.getElementById('per-pet-header');
    const perPetContainer = document.getElementById('per-pet-breakdown');
    const multiDogRow = document.getElementById('multi-dog-row');
    const twentyFourRow = document.getElementById('twenty-four-hour-row');
    const extraHoursRow = document.getElementById('extra-hours-row');
    const baseSubtotalRow = document.getElementById('base-subtotal-row');
    perPetContainer.innerHTML = '';

    if (numDogs > 1) {
        // Hide the generic per-pet rate rows; each pet block below shows its own breakdown
        twentyFourRow.style.display = 'none';
        extraHoursRow.style.display = 'none';
        baseSubtotalRow.style.display = 'none';

        perPetHeader.style.display = 'block';
        dogs.forEach((dog, i) => {
            const isFirst = i === 0;
            const factor = isFirst ? 1 : ADDITIONAL_PET_FACTOR;
            const tag = isFirst ? 'full price' : '20% off';
            const petName = dog.name ? dog.name : `Pet ${i + 1}`;

            const petNightlyRate = NIGHTLY_RATE * factor;
            const petHourlyRate = HOURLY_RATE * factor;
            const petBoarding = sessions * petNightlyRate;
            const petHours = extraHours * petHourlyRate;
            const petTotal = petBoarding + petHours;

            let subRows = '';
            if (sessions > 0) {
                subRows += `
                    <div class="per-pet-sub">
                        <span class="sub-desc">24-Hour Boarding</span>
                        <span class="sub-calc">${sessions} × ${formatCurrency(petNightlyRate)}</span>
                        <span class="sub-amount">${formatCurrency(petBoarding)}</span>
                    </div>`;
            }
            if (extraHours > 0) {
                subRows += `
                    <div class="per-pet-sub">
                        <span class="sub-desc">Additional Hours</span>
                        <span class="sub-calc">${extraHours} × ${formatCurrency(petHourlyRate)}</span>
                        <span class="sub-amount">${formatCurrency(petHours)}</span>
                    </div>`;
            }

            const group = document.createElement('div');
            group.className = 'per-pet-group';
            group.innerHTML = `
                <div class="line-item per-pet-item">
                    <div class="item-description">${petName} <span class="per-pet-tag">(${tag})</span></div>
                    <div class="item-amount">${formatCurrency(petTotal)}</div>
                </div>
                ${subRows}
            `;
            perPetContainer.appendChild(group);
        });

        multiDogRow.style.display = 'flex';
        document.getElementById('multi-dog-surcharge').textContent = '-' + formatCurrency(multiPetDiscount);
    } else {
        // Single pet: show the standard rate rows, hide per-pet breakdown
        twentyFourRow.style.display = 'flex';
        extraHoursRow.style.display = 'flex';
        baseSubtotalRow.style.display = 'flex';
        perPetHeader.style.display = 'none';
        multiDogRow.style.display = 'none';
    }

    // Holiday fee: flat charge per stay, shown only when toggled on
    const holidayRow = document.getElementById('holiday-fee-row');
    if (holidayFee > 0) {
        holidayRow.style.display = 'flex';
        document.getElementById('holiday-fee-amount').textContent = formatCurrency(holidayFee);
    } else {
        holidayRow.style.display = 'none';
    }

    // Update total with proper formatting
    document.getElementById('total-cost').textContent = formatCurrency(totalCost);

    // Show results with smooth animation
    resultsDiv.classList.remove('hidden');

    // Smooth scroll to results
    setTimeout(() => {
        resultsDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
}

function setupIntersectionObserver() {
    // Optimized with root margin for better performance
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                // Use requestAnimationFrame for smooth animations
                requestAnimationFrame(() => {
                    entry.target.classList.add('visible');
                });
                observer.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: '50px 0px -10% 0px' // Trigger animations earlier
    });

    document.querySelectorAll('.fade-in').forEach(el => {
        observer.observe(el);
    });
}

function preloadCriticalResources() {
    // Preload any critical resources that might be needed
    const preloadLinks = [
        // Could add any critical images here
    ];

    preloadLinks.forEach(href => {
        if (href) {
            const link = document.createElement('link');
            link.rel = 'preload';
            link.as = 'image';
            link.href = href;
            document.head.appendChild(link);
        }
    });
}

// Optimized scroll handler for nav effects
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
}, 16); // ~60fps

window.addEventListener('scroll', handleScroll, { passive: true });

function setupFAQ() {
    document.querySelectorAll('.faq-question').forEach(btn => {
        btn.addEventListener('click', () => {
            const item = btn.parentElement;
            const answer = item.querySelector('.faq-answer');
            const wasOpen = item.classList.contains('open');

            // Close all other items
            document.querySelectorAll('.faq-item').forEach(i => {
                i.classList.remove('open');
                i.querySelector('.faq-answer').style.maxHeight = null;
            });

            // Open clicked item if it wasn't open
            if (!wasOpen) {
                item.classList.add('open');
                answer.style.maxHeight = answer.scrollHeight + 'px';
            }
        });
    });
}

function capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

// Theme management
function toggleTheme() {
    const html = document.documentElement;
    const currentTheme = html.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

    html.setAttribute('data-theme', newTheme);
    localStorage.setItem('preferred-theme', newTheme);

    // Update meta theme color
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (newTheme === 'dark') {
        metaTheme.content = '#1A0D2E';
    } else {
        metaTheme.content = '#F0EAFF';
    }
}

function initializeTheme() {
    const savedTheme = localStorage.getItem('preferred-theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    // Use saved theme, or default to light (system preference override)
    const theme = savedTheme || 'light';

    document.documentElement.setAttribute('data-theme', theme);

    // Update meta theme color
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (theme === 'dark') {
        metaTheme.content = '#1A0D2E';
    } else {
        metaTheme.content = '#F0EAFF';
    }
}

// Action button functions
function printEstimate() {
    // Populate print receipt with current data
    updatePrintReceipt();

    // Trigger print
    window.print();
}

function saveToCalendar() {
    if (!dropoffInput.dataset.dateValue || !pickupInput.dataset.dateValue) {
        alert('Please complete the estimate first.');
        return;
    }

    const dropoff = new Date(dropoffInput.dataset.dateValue);
    const pickup = new Date(pickupInput.dataset.dateValue);

    // Format dates for calendar
    const startDate = dropoff.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const endDate = pickup.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

    // Create calendar event data
    const eventTitle = `Dog Sitting - ${dogs.map(d => d.name).join(', ')}`;
    const eventDescription = `Pet care service at Danni's House.\\n\\nPets: ${dogs.map(d => `${d.name} (${d.breed}, ${capitalizeFirst(d.size)})`).join(', ')}\\n\\nEstimated cost: ${document.getElementById('total-cost').textContent}`;

    // Generate .ics file content
    const icsContent = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Dog Sitting At Danni\'s House//EN',
        'BEGIN:VEVENT',
        `UID:${Date.now()}@dannishouse.com`,
        `DTSTART:${startDate}`,
        `DTEND:${endDate}`,
        `SUMMARY:${eventTitle}`,
        `DESCRIPTION:${eventDescription}`,
        'STATUS:TENTATIVE',
        'END:VEVENT',
        'END:VCALENDAR'
    ].join('\\r\\n');

    // Create download link
    const blob = new Blob([icsContent], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `dog-sitting-${dogs[0]?.name || 'booking'}-${dropoff.getFullYear()}-${(dropoff.getMonth() + 1).toString().padStart(2, '0')}-${dropoff.getDate().toString().padStart(2, '0')}.ics`;
    link.click();
    URL.revokeObjectURL(url);
}

function clearAllData() {
    if (confirm('Are you sure you want to clear all data? This will remove all pets and dates.')) {
        // Reset form
        dropoffInput.value = '';
        pickupInput.value = '';
        dropoffInput.dataset.dateValue = '';
        pickupInput.dataset.dateValue = '';

        // Clear dogs
        dogs = [];
        renderDogs();

        // Reset holiday toggle
        holidayToggle.checked = false;

        // Hide results
        resultsDiv.classList.add('hidden');

        // Clear any validation states
        document.querySelectorAll('.input-error').forEach(el => el.classList.add('hidden'));
        document.querySelectorAll('.form-input').forEach(el => {
            el.classList.remove('error', 'success');
        });
    }
}

function updatePrintReceipt() {
    const now = new Date();
    const quoteNum = document.getElementById('quote-number').textContent;

    // Update header
    document.getElementById('receipt-date').textContent = now.toLocaleDateString();
    document.getElementById('receipt-quote-number').textContent = quoteNum;

    // Update service details
    if (dropoffInput.value && pickupInput.value) {
        document.getElementById('receipt-dropoff').textContent = dropoffInput.value;
        document.getElementById('receipt-pickup').textContent = pickupInput.value;
    }
    document.getElementById('receipt-num-pets').textContent = dogs.length;

    // Update table breakdown
    const breakdown = document.getElementById('receipt-breakdown');
    breakdown.innerHTML = '';

    // Get current estimate values
    const twentyFourCount = parseInt(document.getElementById('twenty-four-hour-count').textContent) || 0;
    const extraCount = parseInt(document.getElementById('extra-hours-count').textContent) || 0;

    if (dogs.length === 1) {
        // Single pet: simple rate breakdown
        if (twentyFourCount > 0) {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>24-Hour Boarding</td>
                <td>${twentyFourCount}</td>
                <td>${formatCurrency(NIGHTLY_RATE)}</td>
                <td>${formatCurrency(twentyFourCount * NIGHTLY_RATE)}</td>
            `;
            breakdown.appendChild(row);
        }
        if (extraCount > 0) {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>Additional Hours</td>
                <td>${extraCount}</td>
                <td>${formatCurrency(HOURLY_RATE)}</td>
                <td>${formatCurrency(extraCount * HOURLY_RATE)}</td>
            `;
            breakdown.appendChild(row);
        }
    } else {
        // Multiple pets: per-pet breakdown with discounted rates for additional pets
        dogs.forEach((dog, i) => {
            const isFirst = i === 0;
            const factor = isFirst ? 1 : ADDITIONAL_PET_FACTOR;
            const tag = isFirst ? 'full price' : '20% off';
            const petName = dog.name ? dog.name : `Pet ${i + 1}`;
            const petNightlyRate = NIGHTLY_RATE * factor;
            const petHourlyRate = HOURLY_RATE * factor;

            // Pet header row
            const headerRow = document.createElement('tr');
            headerRow.innerHTML = `
                <td colspan="4"><strong>${petName} (${tag})</strong></td>
            `;
            breakdown.appendChild(headerRow);

            if (twentyFourCount > 0) {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td style="padding-left:1.5em;">24-Hour Boarding</td>
                    <td>${twentyFourCount}</td>
                    <td>${formatCurrency(petNightlyRate)}</td>
                    <td>${formatCurrency(twentyFourCount * petNightlyRate)}</td>
                `;
                breakdown.appendChild(row);
            }
            if (extraCount > 0) {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td style="padding-left:1.5em;">Additional Hours</td>
                    <td>${extraCount}</td>
                    <td>${formatCurrency(petHourlyRate)}</td>
                    <td>${formatCurrency(extraCount * petHourlyRate)}</td>
                `;
                breakdown.appendChild(row);
            }
        });

        const discount = document.getElementById('multi-dog-surcharge').textContent;
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>Multi-Pet Discount (you save)</td>
            <td>—</td>
            <td>—</td>
            <td>${discount}</td>
        `;
        breakdown.appendChild(row);
    }

    if (document.getElementById('holiday-fee-row').style.display !== 'none') {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>Holiday Fee</td>
            <td>1</td>
            <td>${formatCurrency(HOLIDAY_FEE)}</td>
            <td>${formatCurrency(HOLIDAY_FEE)}</td>
        `;
        breakdown.appendChild(row);
    }

    // Update total
    document.getElementById('receipt-total').textContent = document.getElementById('total-cost').textContent;
}

// Smooth scrolling for navigation links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    });
});