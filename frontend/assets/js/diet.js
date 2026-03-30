(
function () {
  const STORAGE_KEY = 'dietLogs:v1';
  const API_BASE = window.location.port === '8080' ? 'http://localhost:3000' : window.location.origin;
  const CHILD_STORAGE_KEY = 'diet-childid';

  const dateEl = document.getElementById('diet-current-date');
  const dateHeadingEl = document.getElementById('diet-date-heading');
  const prevDayBtn = document.getElementById('diet-prev-day');
  const nextDayBtn = document.getElementById('diet-next-day');
  const childSelectEl = document.getElementById('diet-child-select');
  const snackListEl = document.getElementById('snack-list');
  const addSnackBtn = document.getElementById('add-snack-btn');
  const hydrationTotalEl = document.getElementById('hydration-total-value');

  let selectedDate = new Date();
  let selectedChildId = '';
  let currentDayLog = null;
  let latestLoadToken = '';

  function formatDateKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function getSelectedDateKey() {
    return formatDateKey(selectedDate);
  }

  function shiftSelectedDate(days) {
    const next = new Date(selectedDate);
    next.setDate(next.getDate() + days);
    selectedDate = new Date(next.getFullYear(), next.getMonth(), next.getDate());
  }

  function makeSnackId() {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  function makeDefaultDayLog(dateKey) {
    return {
      date: dateKey,
      meals: {
        breakfast: { time: '', food: '', imageData: '' },
        lunch: { time: '', food: '', imageData: '' },
        dinner: { time: '', food: '', imageData: '' },
      },
      snacks: [],
      hydration: {
        waterOz: 0,
        milkOz: 0,
      },
    };
  }

  function clampNumber(value, min, max) {
    const n = Number(value);
    if (!Number.isFinite(n)) return 0;
    return Math.max(min, Math.min(max, Math.floor(n)));
  }

  function cleanText(value, maxLen) {
    return String(value || '').trim().slice(0, maxLen);
  }

  function escapeAttr(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function loadStore() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') return parsed;
      return {};
    } catch (_err) {
      return {};
    }
  }

  function saveStore(store) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  }

  function getChildLogs(store, childId) {
    if (!childId) return {};
    const childLogs = store[childId];
    if (childLogs && typeof childLogs === 'object' && !Array.isArray(childLogs)) return childLogs;
    return {};
  }

  function buildDayLogFromData(entry, dateKey) {
    if (!entry || typeof entry !== 'object') return makeDefaultDayLog(dateKey);
    const fallback = makeDefaultDayLog(dateKey);
    return {
      date: dateKey,
      meals: {
        breakfast: {
          time: cleanText(entry?.meals?.breakfast?.time, 5),
          food: cleanText(entry?.meals?.breakfast?.food, 120),
          imageData: normalizeImageData(entry?.meals?.breakfast?.imageData),
        },
        lunch: {
          time: cleanText(entry?.meals?.lunch?.time, 5),
          food: cleanText(entry?.meals?.lunch?.food, 120),
          imageData: normalizeImageData(entry?.meals?.lunch?.imageData),
        },
        dinner: {
          time: cleanText(entry?.meals?.dinner?.time, 5),
          food: cleanText(entry?.meals?.dinner?.food, 120),
          imageData: normalizeImageData(entry?.meals?.dinner?.imageData),
        },
      },
      snacks: Array.isArray(entry.snacks)
        ? entry.snacks.map((snack) => ({
            id: cleanText(snack?.id, 40) || makeSnackId(),
            time: cleanText(snack?.time, 5),
            food: cleanText(snack?.food, 120),
          }))
        : fallback.snacks,
      hydration: {
        waterOz: clampNumber(entry?.hydration?.waterOz, 0, 300),
        milkOz: clampNumber(entry?.hydration?.milkOz, 0, 300),
      },
    };
  }

  function readLocalDayLog(childId, dateKey) {
    const store = loadStore();
    const entry = getChildLogs(store, childId)[dateKey];
    return buildDayLogFromData(entry, dateKey);
  }

  function writeLocalDayLog(childId, dateKey, dayLog) {
    if (!childId) return;
    const store = loadStore();
    if (!store[childId] || typeof store[childId] !== 'object') {
      store[childId] = {};
    }
    store[childId][dateKey] = {
      date: dateKey,
      meals: dayLog.meals,
      snacks: dayLog.snacks,
      hydration: dayLog.hydration,
    };
    saveStore(store);
  }

  function getDerived(dayLog) {
    const hydrationTotalOz = clampNumber(dayLog.hydration.waterOz, 0, 300) +
      clampNumber(dayLog.hydration.milkOz, 0, 300);

    return { hydrationTotalOz };
  }

  function normalizeImageData(value) {
    if (typeof value !== 'string') return '';
    const trimmed = value.trim();
    return trimmed.startsWith('data:image/') ? trimmed : '';
  }

  function renderCurrentDate() {
    if (!dateEl) return;
    dateEl.textContent = selectedDate.toLocaleDateString(undefined, {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
    if (dateHeadingEl) {
      dateHeadingEl.textContent = selectedDate.toLocaleDateString(undefined, {
        weekday: 'long',
      });
    }
  }

  function setInputValue(id, value) {
    const el = document.getElementById(id);
    if (!el) return;
    el.value = value ?? '';
  }

  function renderMeals(dayLog) {
    setInputValue('breakfast-time', dayLog.meals.breakfast.time);
    setInputValue('breakfast-food', dayLog.meals.breakfast.food);
    setInputValue('lunch-time', dayLog.meals.lunch.time);
    setInputValue('lunch-food', dayLog.meals.lunch.food);
    setInputValue('dinner-time', dayLog.meals.dinner.time);
    setInputValue('dinner-food', dayLog.meals.dinner.food);
    renderMealImages(dayLog);
  }

  function getMealSlotEl(meal) {
    return document.querySelector(`.diet-meal-card[data-meal="${meal}"] .meal-image-slot`);
  }

  function renderMealImages(dayLog) {
    ['breakfast', 'lunch', 'dinner'].forEach((meal) => {
      const slot = getMealSlotEl(meal);
      if (!slot) return;
      const imageData = normalizeImageData(dayLog?.meals?.[meal]?.imageData);
      if (imageData) {
        slot.innerHTML = `<img class="meal-image-preview" src="${imageData}" alt="${meal} meal image">`;
      } else {
        slot.textContent = `Add ${meal} image`;
      }
    });
  }

  function renderHydration(dayLog) {
    setInputValue('water-oz', dayLog.hydration.waterOz || '');
    setInputValue('milk-oz', dayLog.hydration.milkOz || '');
    const total = getDerived(dayLog).hydrationTotalOz;
    if (hydrationTotalEl) hydrationTotalEl.textContent = `${total} oz`;
  }

  function makeSnackRowHtml(snack) {
    return `
      <div class="snack-row" data-snack-id="${snack.id}">
        <div class="form-row">
          <label>Snack time</label>
          <input class="diet-input snack-time" type="time" value="${escapeAttr(snack.time)}">
        </div>
        <div class="form-row snack-food-col">
          <label>Snack</label>
          <input class="diet-input snack-food" type="text" maxlength="120" placeholder="e.g. Apple slices" value="${escapeAttr(snack.food)}">
        </div>
        <button class="snack-remove-btn" type="button" aria-label="Remove snack">Remove</button>
      </div>
    `;
  }

  function renderSnacks(dayLog) {
    if (!snackListEl) return;

    if (!dayLog.snacks.length) {
      snackListEl.innerHTML = '<p class="diet-muted-msg">No snacks added yet.</p>';
      return;
    }

    snackListEl.innerHTML = dayLog.snacks.map(makeSnackRowHtml).join('');
  }

  function readSnacksFromDom() {
    if (!snackListEl) return [];
    const rows = snackListEl.querySelectorAll('.snack-row');
    const snacks = [];
    rows.forEach((row) => {
      const id = cleanText(row.getAttribute('data-snack-id'), 40) || makeSnackId();
      const timeEl = row.querySelector('.snack-time');
      const foodEl = row.querySelector('.snack-food');
      snacks.push({
        id,
        time: cleanText(timeEl?.value, 5),
        food: cleanText(foodEl?.value, 120),
      });
    });
    return snacks;
  }

  function saveSelectedDayFromDom() {
    if (!selectedChildId) return;
    const selectedKey = getSelectedDateKey();
    const dayLog = currentDayLog ? buildDayLogFromData(currentDayLog, selectedKey) : makeDefaultDayLog(selectedKey);

    dayLog.meals.breakfast.time = cleanText(document.getElementById('breakfast-time')?.value, 5);
    dayLog.meals.breakfast.food = cleanText(document.getElementById('breakfast-food')?.value, 120);
    dayLog.meals.lunch.time = cleanText(document.getElementById('lunch-time')?.value, 5);
    dayLog.meals.lunch.food = cleanText(document.getElementById('lunch-food')?.value, 120);
    dayLog.meals.dinner.time = cleanText(document.getElementById('dinner-time')?.value, 5);
    dayLog.meals.dinner.food = cleanText(document.getElementById('dinner-food')?.value, 120);

    dayLog.hydration.waterOz = clampNumber(document.getElementById('water-oz')?.value, 0, 300);
    dayLog.hydration.milkOz = clampNumber(document.getElementById('milk-oz')?.value, 0, 300);

    dayLog.snacks = readSnacksFromDom();
    currentDayLog = dayLog;
    writeLocalDayLog(selectedChildId, selectedKey, dayLog);
    renderHydration(dayLog);
    saveDayLogToServer(selectedChildId, selectedKey, dayLog).catch(() => {});
  }

  function addSnackRow() {
    if (!selectedChildId) return;
    const selectedKey = getSelectedDateKey();
    const dayLog = currentDayLog ? buildDayLogFromData(currentDayLog, selectedKey) : makeDefaultDayLog(selectedKey);
    dayLog.snacks.push({ id: makeSnackId(), time: '', food: '' });
    currentDayLog = dayLog;
    writeLocalDayLog(selectedChildId, selectedKey, dayLog);
    renderSnacks(dayLog);
    saveSelectedDayFromDom();
  }

  function removeSnackRow(id) {
    if (!selectedChildId) return;
    const selectedKey = getSelectedDateKey();
    const dayLog = currentDayLog ? buildDayLogFromData(currentDayLog, selectedKey) : makeDefaultDayLog(selectedKey);
    dayLog.snacks = dayLog.snacks.filter((snack) => snack.id !== id);
    currentDayLog = dayLog;
    writeLocalDayLog(selectedChildId, selectedKey, dayLog);
    renderSnacks(dayLog);
    saveSelectedDayFromDom();
  }

  function setFormDisabled(disabled) {
    const ids = [
      'breakfast-time', 'breakfast-food',
      'lunch-time', 'lunch-food',
      'dinner-time', 'dinner-food',
      'water-oz', 'milk-oz',
    ];

    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.disabled = disabled;
    });

    ['breakfast', 'lunch', 'dinner'].forEach((meal) => {
      const input = document.getElementById(`${meal}-image-input`);
      if (input) input.disabled = disabled;
      const slot = getMealSlotEl(meal);
      if (!slot) return;
      slot.setAttribute('aria-disabled', disabled ? 'true' : 'false');
      slot.tabIndex = 0;
      slot.classList.toggle('is-disabled', disabled);
    });

    if (addSnackBtn) addSnackBtn.disabled = disabled;
  }

  function clearSelectedDayUi() {
    const empty = makeDefaultDayLog(getSelectedDateKey());
    currentDayLog = empty;
    renderMeals(empty);
    renderHydration(empty);
    renderSnacks(empty);
  }

  function loadSelectedDayIntoUi() {
    renderCurrentDate();
    const selectedKey = getSelectedDateKey();

    if (!selectedChildId) {
      setFormDisabled(true);
      clearSelectedDayUi();
      return;
    }

    setFormDisabled(false);
    const token = `${selectedChildId}:${selectedKey}:${Date.now()}`;
    latestLoadToken = token;

    fetchDayLogFromServer(selectedChildId, selectedKey)
      .then((dayLog) => {
        if (latestLoadToken !== token) return;
        currentDayLog = dayLog;
        writeLocalDayLog(selectedChildId, selectedKey, dayLog);
        renderMeals(dayLog);
        renderHydration(dayLog);
        renderSnacks(dayLog);
      })
      .catch(() => {
        if (latestLoadToken !== token) return;
        const fallback = readLocalDayLog(selectedChildId, selectedKey);
        currentDayLog = fallback;
        renderMeals(fallback);
        renderHydration(fallback);
        renderSnacks(fallback);
      });
  }

  function bindListeners() {
    const mealAndHydrationIds = [
      'breakfast-time', 'breakfast-food',
      'lunch-time', 'lunch-food',
      'dinner-time', 'dinner-food',
      'water-oz', 'milk-oz',
    ];

    mealAndHydrationIds.forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('input', saveSelectedDayFromDom);
      el.addEventListener('change', saveSelectedDayFromDom);
    });

    addSnackBtn?.addEventListener('click', addSnackRow);

    snackListEl?.addEventListener('input', (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      if (target.classList.contains('snack-time') || target.classList.contains('snack-food')) {
        saveSelectedDayFromDom();
      }
    });

    snackListEl?.addEventListener('click', (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      if (!target.classList.contains('snack-remove-btn')) return;

      const row = target.closest('.snack-row');
      const id = row?.getAttribute('data-snack-id');
      if (!id) return;
      removeSnackRow(id);
    });

    prevDayBtn?.addEventListener('click', () => {
      saveSelectedDayFromDom();
      shiftSelectedDate(-1);
      loadSelectedDayIntoUi();
    });

    nextDayBtn?.addEventListener('click', () => {
      saveSelectedDayFromDom();
      shiftSelectedDate(1);
      loadSelectedDayIntoUi();
    });

    childSelectEl?.addEventListener('change', () => {
      selectedChildId = String(childSelectEl.value || '');
      if (selectedChildId) {
        sessionStorage.setItem(CHILD_STORAGE_KEY, selectedChildId);
      } else {
        sessionStorage.removeItem(CHILD_STORAGE_KEY);
      }
      loadSelectedDayIntoUi();
    });

    ['breakfast', 'lunch', 'dinner'].forEach((meal) => {
      const inputEl = document.getElementById(`${meal}-image-input`);
      const slotEl = getMealSlotEl(meal);
      if (!inputEl || !slotEl) return;

      const openPicker = () => {
        if (!selectedChildId || inputEl.disabled) {
          window.alert('Please select a child first to add meal images.');
          return;
        }
        inputEl.click();
      };

      slotEl.addEventListener('click', openPicker);
      slotEl.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          openPicker();
        }
      });

      inputEl.addEventListener('change', () => {
        const file = inputEl.files && inputEl.files[0];
        if (!file || !selectedChildId || !file.type.startsWith('image/')) return;
        const reader = new FileReader();
        reader.onload = () => {
          if (typeof reader.result !== 'string') return;
          const selectedKey = getSelectedDateKey();
          const dayLog = currentDayLog ? buildDayLogFromData(currentDayLog, selectedKey) : makeDefaultDayLog(selectedKey);
          dayLog.meals[meal].imageData = reader.result;
          currentDayLog = dayLog;
          writeLocalDayLog(selectedChildId, selectedKey, dayLog);
          saveDayLogToServer(selectedChildId, selectedKey, dayLog).catch(() => {});
          renderMeals(dayLog);
          inputEl.value = '';
        };
        reader.readAsDataURL(file);
      });
    });
  }

  async function apiRequest(method, path, body) {
    const res = await fetch(`${API_BASE}${path}`, {
      method,
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Request failed');
    return data;
  }

  async function fetchDayLogFromServer(childId, dateKey) {
    const payload = await apiRequest('GET', `/dietlogs/day?childid=${encodeURIComponent(childId)}&date=${encodeURIComponent(dateKey)}`);
    const serverData = payload?.data;
    if (serverData && typeof serverData === 'object') {
      return buildDayLogFromData(serverData, dateKey);
    }
    return readLocalDayLog(childId, dateKey);
  }

  async function saveDayLogToServer(childId, dateKey, dayLog) {
    await apiRequest('PUT', '/dietlogs/day', {
      childid: Number(childId),
      date: dateKey,
      data: dayLog,
    });
  }

  async function loadChildren() {
    if (!childSelectEl) return;

    try {
      const children = await apiRequest('GET', '/children');
      childSelectEl.innerHTML = '<option value="">-- Choose a child --</option>' +
        children.map((child) => `<option value="${child.childid}">${child.firstname} ${child.lastname}</option>`).join('');

      const saved = sessionStorage.getItem(CHILD_STORAGE_KEY);
      if (saved && children.some((child) => String(child.childid) === saved)) {
        selectedChildId = saved;
      } else if (children.length > 0) {
        selectedChildId = String(children[0].childid);
        sessionStorage.setItem(CHILD_STORAGE_KEY, selectedChildId);
      } else {
        selectedChildId = '';
      }

      childSelectEl.value = selectedChildId;
    } catch (_err) {
      childSelectEl.innerHTML = '<option value="">-- Unable to load children --</option>';
      selectedChildId = '';
    }

    loadSelectedDayIntoUi();
  }

  function initialize() {
    selectedDate = new Date();
    selectedDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
    bindListeners();
    loadSelectedDayIntoUi();
    loadChildren();
  }

  document.addEventListener('DOMContentLoaded', initialize);
})();
