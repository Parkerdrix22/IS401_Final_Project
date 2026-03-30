(function () {
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
        breakfast: { time: '', food: '' },
        lunch: { time: '', food: '' },
        dinner: { time: '', food: '' },
      },
      snacks: [],
      hydration: { waterOz: 0, milkOz: 0 },
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

  function buildDayLogFromData(entry, dateKey) {
    if (!entry || typeof entry !== 'object') return makeDefaultDayLog(dateKey);
    const fallback = makeDefaultDayLog(dateKey);
    return {
      date: dateKey,
      meals: {
        breakfast: {
          time: cleanText(entry?.meals?.breakfast?.time, 5),
          food: cleanText(entry?.meals?.breakfast?.food, 120),
        },
        lunch: {
          time: cleanText(entry?.meals?.lunch?.time, 5),
          food: cleanText(entry?.meals?.lunch?.food, 120),
        },
        dinner: {
          time: cleanText(entry?.meals?.dinner?.time, 5),
          food: cleanText(entry?.meals?.dinner?.food, 120),
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

  function getDerived(dayLog) {
    return {
      hydrationTotalOz:
        clampNumber(dayLog.hydration.waterOz, 0, 300) +
        clampNumber(dayLog.hydration.milkOz, 0, 300),
    };
  }

  function renderCurrentDate() {
    if (!dateEl) return;
    dateEl.textContent = selectedDate.toLocaleDateString(undefined, {
      month: 'long', day: 'numeric', year: 'numeric',
    });
    if (dateHeadingEl) {
      dateHeadingEl.textContent = selectedDate.toLocaleDateString(undefined, { weekday: 'long' });
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
  }

  function renderHydration(dayLog) {
    setInputValue('water-oz', dayLog.hydration.waterOz || '');
    setInputValue('milk-oz', dayLog.hydration.milkOz || '');
    if (hydrationTotalEl) {
      hydrationTotalEl.textContent = `${getDerived(dayLog).hydrationTotalOz} oz`;
    }
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
    snackListEl.innerHTML = dayLog.snacks.length
      ? dayLog.snacks.map(makeSnackRowHtml).join('')
      : '<p class="diet-muted-msg">No snacks added yet.</p>';
  }

  function readSnacksFromDom() {
    if (!snackListEl) return [];
    return Array.from(snackListEl.querySelectorAll('.snack-row')).map((row) => ({
      id: cleanText(row.getAttribute('data-snack-id'), 40) || makeSnackId(),
      time: cleanText(row.querySelector('.snack-time')?.value, 5),
      food: cleanText(row.querySelector('.snack-food')?.value, 120),
    }));
  }

  let saveStatusTimer = null;
  function showSaveStatus(text, type) {
    const el = document.getElementById('diet-save-status');
    if (!el) return;
    el.textContent = text;
    el.className = 'diet-save-status' + (type ? ` ${type}` : '');
    clearTimeout(saveStatusTimer);
    if (type === 'success') {
      saveStatusTimer = setTimeout(() => {
        el.textContent = '';
        el.className = 'diet-save-status';
      }, 3000);
    }
  }

  async function apiRequest(method, path, body) {
    const res = await fetch(`${API_BASE}${path}`, {
      method,
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
    return data;
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
    renderHydration(dayLog);

    apiRequest('PUT', '/dietlogs/day', {
      childid: Number(selectedChildId),
      date: selectedKey,
      data: dayLog,
    })
      .then(() => showSaveStatus('Saved', 'success'))
      .catch((err) => showSaveStatus('Save failed: ' + (err.message || 'unknown error'), 'error'));
  }

  function addSnackRow() {
    if (!selectedChildId) return;
    const selectedKey = getSelectedDateKey();
    const dayLog = currentDayLog ? buildDayLogFromData(currentDayLog, selectedKey) : makeDefaultDayLog(selectedKey);
    dayLog.snacks.push({ id: makeSnackId(), time: '', food: '' });
    currentDayLog = dayLog;
    renderSnacks(dayLog);
    saveSelectedDayFromDom();
  }

  function removeSnackRow(id) {
    if (!selectedChildId) return;
    const selectedKey = getSelectedDateKey();
    const dayLog = currentDayLog ? buildDayLogFromData(currentDayLog, selectedKey) : makeDefaultDayLog(selectedKey);
    dayLog.snacks = dayLog.snacks.filter((snack) => snack.id !== id);
    currentDayLog = dayLog;
    renderSnacks(dayLog);
    saveSelectedDayFromDom();
  }

  function setFormDisabled(disabled) {
    ['breakfast-time', 'breakfast-food', 'lunch-time', 'lunch-food', 'dinner-time', 'dinner-food', 'water-oz', 'milk-oz'].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.disabled = disabled;
    });
    if (addSnackBtn) addSnackBtn.disabled = disabled;
  }

  function loadSelectedDayIntoUi() {
    renderCurrentDate();
    const selectedKey = getSelectedDateKey();

    if (!selectedChildId) {
      setFormDisabled(true);
      const empty = makeDefaultDayLog(selectedKey);
      currentDayLog = empty;
      renderMeals(empty);
      renderHydration(empty);
      renderSnacks(empty);
      return;
    }

    setFormDisabled(false);
    showSaveStatus('Loading...', '');
    const token = `${selectedChildId}:${selectedKey}:${Date.now()}`;
    latestLoadToken = token;

    apiRequest('GET', `/dietlogs/day?childid=${encodeURIComponent(selectedChildId)}&date=${encodeURIComponent(selectedKey)}`)
      .then((payload) => {
        if (latestLoadToken !== token) return;
        const dayLog = buildDayLogFromData(payload?.data || null, selectedKey);
        currentDayLog = dayLog;
        renderMeals(dayLog);
        renderHydration(dayLog);
        renderSnacks(dayLog);
        showSaveStatus('', '');
      })
      .catch((err) => {
        if (latestLoadToken !== token) return;
        showSaveStatus('Failed to load: ' + (err.message || 'unknown error'), 'error');
        const empty = makeDefaultDayLog(selectedKey);
        currentDayLog = empty;
        renderMeals(empty);
        renderHydration(empty);
        renderSnacks(empty);
      });
  }

  function bindListeners() {
    ['breakfast-time', 'breakfast-food', 'lunch-time', 'lunch-food', 'dinner-time', 'dinner-food', 'water-oz', 'milk-oz'].forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('input', saveSelectedDayFromDom);
      el.addEventListener('change', saveSelectedDayFromDom);
    });

    addSnackBtn?.addEventListener('click', addSnackRow);

    snackListEl?.addEventListener('input', (event) => {
      if (event.target.classList.contains('snack-time') || event.target.classList.contains('snack-food')) {
        saveSelectedDayFromDom();
      }
    });

    snackListEl?.addEventListener('click', (event) => {
      if (!event.target.classList.contains('snack-remove-btn')) return;
      const id = event.target.closest('.snack-row')?.getAttribute('data-snack-id');
      if (id) removeSnackRow(id);
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
  }

  async function loadChildren() {
    if (!childSelectEl) return;
    try {
      const children = await apiRequest('GET', '/children');
      childSelectEl.innerHTML = '<option value="">-- Choose a child --</option>' +
        children.map((c) => `<option value="${c.childid}">${c.firstname} ${c.lastname}</option>`).join('');

      const saved = sessionStorage.getItem(CHILD_STORAGE_KEY);
      if (saved && children.some((c) => String(c.childid) === saved)) {
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
    loadChildren();
  }

  document.addEventListener('DOMContentLoaded', initialize);
})();
