// Pet intake form: builds the per-pet sections, keeps a draft in this browser,
// validates, and prints. Nothing is sent anywhere.

const STORAGE_KEY = 'intake-form-draft';

const form = document.getElementById('intake-form');
const petsContainer = document.getElementById('pets');
const petTemplate = document.getElementById('pet-template');
const addPetBtn = document.getElementById('add-pet-btn');
const formError = document.getElementById('form-error');

let petCounter = 0;

document.addEventListener('DOMContentLoaded', () => {
    syncThemeUI();
    document.getElementById('theme-toggle').addEventListener('click', toggleTheme);
    document.querySelectorAll('.current-year').forEach(el => { el.textContent = new Date().getFullYear(); });

    const draft = loadDraft();
    if (draft && draft.pets && draft.pets.length) {
        draft.pets.forEach(pet => addPet(pet));
        Object.entries(draft.fields || {}).forEach(([name, value]) => {
            const el = form.elements[name];
            if (!el) return;
            if (el.type === 'checkbox') el.checked = value === true;
            else el.value = value;
        });
    } else {
        addPet();
    }

    addPetBtn.addEventListener('click', () => {
        const section = addPet();
        section.querySelector('input').focus();
        saveDraft();
    });

    petsContainer.addEventListener('click', (e) => {
        const btn = e.target.closest('.remove-pet-btn');
        if (!btn) return;
        if (petsContainer.children.length === 1) return;
        btn.closest('.pet-card').remove();
        renumberPets();
        saveDraft();
    });

    form.addEventListener('input', saveDraft);
    form.addEventListener('change', saveDraft);

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        if (!validate()) return;
        window.print();
    });

    document.getElementById('clear-form-btn').addEventListener('click', () => {
        if (!confirm('Clear everything on this form?')) return;
        form.reset();
        petsContainer.innerHTML = '';
        petCounter = 0;
        addPet();
        clearDraft();
        hideError();
        form.elements['owner-name'].focus();
    });
});

// ---------- Pet sections ----------

function addPet(values) {
    petCounter += 1;
    const fragment = petTemplate.content.cloneNode(true);
    const section = fragment.querySelector('.pet-card');
    const id = petCounter;

    // Give every control a unique name/id and wire its label
    section.querySelectorAll('[data-name]').forEach(control => {
        const base = control.dataset.name;
        control.name = `${base}-${id}`;
        if (control.type !== 'radio') {
            control.id = `${base}-${id}`;
            const label = control.closest('.field').querySelector('label');
            if (label) label.htmlFor = control.id;
        }
    });

    section.querySelectorAll('legend').forEach((legend, i) => {
        legend.id = `pet-${id}-legend-${i}`;
    });

    if (values) {
        Object.entries(values).forEach(([base, value]) => {
            const controls = section.querySelectorAll(`[name="${base}-${id}"]`);
            controls.forEach(control => {
                if (control.type === 'radio') control.checked = control.value === value;
                else control.value = value;
            });
        });
    }

    petsContainer.appendChild(fragment);
    renumberPets();
    return petsContainer.lastElementChild;
}

function renumberPets() {
    const cards = petsContainer.querySelectorAll('.pet-card');
    cards.forEach((card, i) => {
        const heading = card.querySelector('.pet-heading');
        const nameInput = card.querySelector('[name^="pet-name-"]');
        const name = nameInput && nameInput.value.trim();
        heading.textContent = cards.length > 1 ? `Pet ${i + 1}${name ? `: ${name}` : ''}` : (name ? `Your Pet: ${name}` : 'Your Pet');
        card.querySelector('.remove-pet-btn').style.display = cards.length > 1 ? '' : 'none';
        card.querySelector('.remove-pet-btn').setAttribute('aria-label', `Remove pet ${i + 1}`);
    });
}

// ---------- Draft persistence (this browser only) ----------

function collect() {
    const fields = {};
    Array.from(form.elements).forEach(el => {
        if (!el.name || el.closest('.pet-card')) return;
        if (el.type === 'checkbox') fields[el.name] = el.checked;
        else if (el.type !== 'button' && el.type !== 'submit') fields[el.name] = el.value;
    });

    const pets = Array.from(petsContainer.querySelectorAll('.pet-card')).map(card => {
        const pet = {};
        card.querySelectorAll('[name]').forEach(control => {
            const base = control.name.replace(/-\d+$/, '');
            if (control.type === 'radio') {
                if (control.checked) pet[base] = control.value;
            } else {
                pet[base] = control.value;
            }
        });
        return pet;
    });

    return { fields, pets };
}

function saveDraft() {
    renumberPets();
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(collect()));
    } catch (e) {
        // Private browsing or full storage: the form still works, it just won't be remembered
    }
}

function loadDraft() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch (e) {
        return null;
    }
}

function clearDraft() {
    try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
}

// ---------- Validation ----------

function validate() {
    hideError();
    form.querySelectorAll('[aria-invalid="true"]').forEach(el => el.removeAttribute('aria-invalid'));

    const missing = [];
    let firstInvalid = null;

    form.querySelectorAll('[required]').forEach(el => {
        const empty = el.type === 'checkbox' ? !el.checked : !el.value.trim();
        const badEmail = el.type === 'email' && el.value && !el.checkValidity();
        if (empty || badEmail) {
            el.setAttribute('aria-invalid', 'true');
            firstInvalid = firstInvalid || el;
            const label = labelFor(el);
            if (label && !missing.includes(label)) missing.push(label);
        }
    });

    if (firstInvalid) {
        const count = missing.length;
        showError(count === 1
            ? `Please complete: ${missing[0]}.`
            : `Please complete these ${count} items: ${missing.join(', ')}.`);
        firstInvalid.focus();
        firstInvalid.scrollIntoView({ block: 'center', behavior: 'smooth' });
        return false;
    }
    return true;
}

function labelFor(el) {
    if (el.type === 'checkbox') return 'each acknowledgment';
    const card = el.closest('.pet-card');
    const label = el.id ? form.querySelector(`label[for="${el.id}"]`) : null;
    let text = label ? label.textContent.replace(/\(optional\)/, '').replace(/—.*$/, '').trim() : el.name;
    if (card) {
        const heading = card.querySelector('.pet-heading').textContent;
        text = `${text} (${heading})`;
    }
    return text;
}

function showError(message) {
    formError.textContent = message;
    formError.classList.add('visible');
}

function hideError() {
    formError.textContent = '';
    formError.classList.remove('visible');
}

// ---------- Theme (same storage key as the main page) ----------

function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    document.querySelector('meta[name="theme-color"]').content = theme === 'dark' ? '#1A0D2E' : '#F0EAFF';
    document.getElementById('theme-toggle').setAttribute('aria-pressed', theme === 'dark' ? 'true' : 'false');
}

function syncThemeUI() {
    applyTheme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light');
}

function toggleTheme() {
    const newTheme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    applyTheme(newTheme);
    try { localStorage.setItem('preferred-theme', newTheme); } catch (e) {}
}
