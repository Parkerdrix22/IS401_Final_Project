(function () {
  const API_BASE = window.location.port === '8080' ? 'http://localhost:3000' : window.location.origin;

  // DOM Elements
  const childSelect = document.getElementById('screentime-child-select');
  const screentimeForm = document.getElementById('screentime-form');
  const screentimeList = document.getElementById('screentime-list');
  const formMsg = document.getElementById('screentime-form-msg');
  const listEmptyMsg = document.getElementById('list-empty-msg');
  const weeklyChartEmptyMsg = document.getElementById('weekly-chart-empty-msg');
  const categoryChartEmptyMsg = document.getElementById('category-chart-empty-msg');
  const prevDayBtn = document.getElementById('screentime-prev-day');
  const nextDayBtn = document.getElementById('screentime-next-day');
  const dayHeadingEl = document.getElementById('screentime-date-heading');
  const dayDateEl = document.getElementById('screentime-current-date');
  const applyFiltersBtn = document.getElementById('screentime-apply-filters');
  const filterStartDateInput = document.getElementById('screentime-filter-startdate');
  const filterEndDateInput = document.getElementById('screentime-filter-enddate');
  const filterCategoryInput = document.getElementById('screentime-filter-category');

  // State
  let selectedDate = new Date();
  let activeChildId = null;
  let weeklyChart = null;
  let categoryChart = null;
  let allEntries = [];

  // API Helper
  async function api(method, path, body) {
    const opts = {
      method,
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    };
    if (body && (method === 'POST' || method === 'PUT')) {
      opts.body = JSON.stringify(body);
    }
    const res = await fetch(`${API_BASE}${path}`, opts);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Request failed');
    return data;
  }

  // Utility Functions
  function showFormMsg(text, type) {
    if (!formMsg) return;
    formMsg.textContent = text;
    formMsg.className = 'screentime-msg' + (type ? ` ${type}` : '');
  }

  function toLocalDateKey(date) {
    const d = date instanceof Date ? date : new Date(date);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  function normalizeToDateOnly(date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  function getWeekDates(anchorDate) {
    const start = normalizeToDateOnly(anchorDate);
    start.setDate(start.getDate() - start.getDay());
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      days.push(d);
    }
    return days;
  }

  function formatDurationForDisplay(minutes) {
    if (minutes < 60) {
      return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  }

  function renderSelectedDay() {
    if (dayHeadingEl) {
      dayHeadingEl.textContent = selectedDate.toLocaleDateString(undefined, { weekday: 'long' });
    }
    if (dayDateEl) {
      dayDateEl.textContent = selectedDate.toLocaleDateString(undefined, {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });
    }
  }

  // Load Children
  async function loadChildren() {
    if (!childSelect) return;
    try {
      const children = await api('GET', '/children');
      childSelect.disabled = false;
      childSelect.innerHTML = '<option value="">— Choose a child —</option>' +
        children.map((c) => `<option value="${c.childid}">${c.firstname} ${c.lastname}</option>`).join('');

      const saved = sessionStorage.getItem('screentime-childid');
      if (saved && children.some((c) => String(c.childid) === saved)) {
        childSelect.value = saved;
      } else if (children.length > 0) {
        childSelect.value = String(children[0].childid);
        sessionStorage.setItem('screentime-childid', childSelect.value);
      } else {
        childSelect.value = '';
      }

      activeChildId = childSelect.value ? Number(childSelect.value) : null;
      if (!activeChildId) {
        showFormMsg('Add a child in Profile to start logging screen time.', 'error');
      } else {
        showFormMsg('', '');
        loadScreenTimeEntries();
      }
    } catch (err) {
      console.error('Failed to load children:', err);
      showFormMsg('Error loading children. Please try again.', 'error');
    }
  }

  // Load Screen Time Entries
  async function loadScreenTimeEntries() {
    if (!activeChildId) return;
    try {
      const entries = await api('GET', `/screentimelog?childid=${activeChildId}`);
      allEntries = Array.isArray(entries) ? entries : [];
      renderWeeklyChart();
      renderCategoryChart();
      renderCurrentDayEntries();
    } catch (err) {
      console.error('Failed to load screen time entries:', err);
      allEntries = [];
      renderWeeklyChart();
      renderCategoryChart();
      renderCurrentDayEntries();
    }
  }

  // Render Weekly Chart
  function renderWeeklyChart() {
    const weekDates = getWeekDates(selectedDate);
    const weekLabels = weekDates.map((d) => d.toLocaleDateString(undefined, { weekday: 'short' }));

    const minutesByDay = {};
    weekDates.forEach((d) => {
      minutesByDay[toLocalDateKey(d)] = 0;
    });

    allEntries.forEach((entry) => {
      const dateKey = toLocalDateKey(entry.timecreated || new Date());
      const entryDate = normalizeToDateOnly(new Date(entry.timecreated || new Date()));
      const entryDateKey = toLocalDateKey(entryDate);

      if (minutesByDay.hasOwnProperty(entryDateKey)) {
        const duration = entry.durationunit === 'hours' 
          ? entry.duration * 60 
          : entry.duration;
        minutesByDay[entryDateKey] += duration;
      }
    });

    const data = weekDates.map((d) => minutesByDay[toLocalDateKey(d)]);
    const hasData = data.some((val) => val > 0);

    const canvas = document.getElementById('weekly-screentime-chart');
    if (!canvas) return;

    if (!hasData) {
      if (weeklyChartEmptyMsg) weeklyChartEmptyMsg.style.display = 'block';
      if (weeklyChart) {
        weeklyChart.destroy();
        weeklyChart = null;
      }
      return;
    }

    if (weeklyChartEmptyMsg) weeklyChartEmptyMsg.style.display = 'none';

    const ctx = canvas.getContext('2d');
    if (weeklyChart) weeklyChart.destroy();

    weeklyChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: weekLabels,
        datasets: [{
          label: 'Screen Time (minutes)',
          data,
          backgroundColor: '#2e9a57',
          borderColor: '#1d7b43',
          borderWidth: 1.5,
          borderRadius: 6,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { color: '#4b6a5d' },
            grid: { color: '#e5ece8' },
          },
          x: {
            ticks: { color: '#4b6a5d' },
            grid: { display: false },
          },
        },
      },
    });
  }

  // Render Category Chart
  function renderCategoryChart() {
    const dateKey = toLocalDateKey(selectedDate);
    const dayEntries = allEntries.filter((entry) => {
      const entryDateKey = toLocalDateKey(normalizeToDateOnly(new Date(entry.timecreated || new Date())));
      return entryDateKey === dateKey;
    });

    const categoryMinutes = {};
    dayEntries.forEach((entry) => {
      const category = entry.activitytype || 'Other';
      const duration = entry.durationunit === 'hours' 
        ? entry.duration * 60 
        : entry.duration;
      categoryMinutes[category] = (categoryMinutes[category] || 0) + duration;
    });

    const categories = Object.keys(categoryMinutes);
    const hasData = categories.length > 0;

    const canvas = document.getElementById('category-chart');
    if (!canvas) return;

    if (!hasData) {
      if (categoryChartEmptyMsg) categoryChartEmptyMsg.style.display = 'block';
      if (categoryChart) {
        categoryChart.destroy();
        categoryChart = null;
      }
      return;
    }

    if (categoryChartEmptyMsg) categoryChartEmptyMsg.style.display = 'none';

    const colors = ['#2e9a57', '#43b86e', '#1d7b43', '#0f4d2f', '#5fc985', '#b8e5c7'];
    const data = categories.map((cat) => categoryMinutes[cat]);

    const ctx = canvas.getContext('2d');
    if (categoryChart) categoryChart.destroy();

    categoryChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: categories,
        datasets: [{
          data,
          backgroundColor: colors.slice(0, categories.length),
          borderColor: '#ffffff',
          borderWidth: 2,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: { color: '#173226', boxWidth: 12, padding: 12 },
          },
        },
      },
    });
  }

  // Render Current Day Entries
  function renderCurrentDayEntries() {
    const dateKey = toLocalDateKey(selectedDate);
    const filteredEntries = allEntries.filter((entry) => {
      const entryDateKey = toLocalDateKey(normalizeToDateOnly(new Date(entry.timecreated || new Date())));
      return entryDateKey === dateKey;
    });

    if (listEmptyMsg) {
      listEmptyMsg.style.display = filteredEntries.length === 0 ? 'block' : 'none';
    }

    if (!screentimeList) return;
    screentimeList.innerHTML = filteredEntries
      .map((entry) => {
        const dateObj = new Date(entry.timecreated || new Date());
        const timeStr = dateObj.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
        const duration = formatDurationForDisplay(
          entry.durationunit === 'hours' 
            ? entry.duration * 60 
            : entry.duration
        );
        return `
          <li class="screentime-item">
            <div class="screentime-item-main">
              <div class="screentime-item-category">${entry.activitytype || 'Other'}</div>
              <div class="screentime-item-duration">${duration}</div>
              <div class="screentime-item-meta">${timeStr}</div>
              ${entry.notes ? `<div class="screentime-item-notes">"${entry.notes}"</div>` : ''}
            </div>
            <button type="button" class="screentime-delete" data-id="${entry.screenid || entry.id}" aria-label="Delete entry">×</button>
          </li>
        `;
      })
      .join('');

    // Add event listeners for delete buttons
    screentimeList.querySelectorAll('.screentime-delete').forEach((btn) => {
      btn.addEventListener('click', handleDeleteEntry);
    });
  }

  // Handle Screen Time Form Submission
  async function handleSubmit(e) {
    e.preventDefault();

    if (!activeChildId) {
      showFormMsg('Please select a child first.', 'error');
      return;
    }

    const category = document.getElementById('screentime-category').value;
    const durationValue = Number(document.getElementById('screentime-duration-value').value);
    const durationUnit = document.getElementById('screentime-duration-unit').value;
    const notes = document.getElementById('screentime-notes').value.trim();

    if (!category || !durationValue) {
      showFormMsg('Please fill in all required fields.', 'error');
      return;
    }

    try {
      await api('POST', '/screentimelog', {
        childid: activeChildId,
        date: toLocalDateKey(selectedDate),
        devicetype: 'Unknown',
        activitytype: category,
        duration: durationValue,
        durationunit: durationUnit,
        notes: notes || null,
      });

      showFormMsg('Screen time entry added successfully!', 'success');
      screentimeForm.reset();
      await loadScreenTimeEntries();
      setTimeout(() => showFormMsg('', ''), 3000);
    } catch (err) {
      console.error('Failed to add entry:', err);
      showFormMsg(err.message || 'Failed to add entry. Please try again.', 'error');
    }
  }

  // Handle Entry Deletion
  async function handleDeleteEntry(e) {
    e.preventDefault();
    const id = e.target.dataset.id;
    if (!id) return;

    if (!confirm('Are you sure you want to delete this entry?')) return;

    try {
      await api('DELETE', `/screentimelog/${id}`);
      await loadScreenTimeEntries();
    } catch (err) {
      console.error('Failed to delete entry:', err);
      alert('Failed to delete entry. Please try again.');
    }
  }

  // Handle Child Selection Change
  function handleChildChange() {
    const newChildId = childSelect.value ? Number(childSelect.value) : null;
    if (newChildId !== activeChildId) {
      activeChildId = newChildId;
      if (childSelect.value) {
        sessionStorage.setItem('screentime-childid', childSelect.value);
      }
      selectedDate = new Date();
      renderSelectedDay();
      loadScreenTimeEntries();
    }
  }

  // Handle Date Navigation
  function handlePrevDay() {
    selectedDate.setDate(selectedDate.getDate() - 1);
    renderSelectedDay();
    renderCategoryChart();
    renderCurrentDayEntries();
  }

  function handleNextDay() {
    selectedDate.setDate(selectedDate.getDate() + 1);
    renderSelectedDay();
    renderCategoryChart();
    renderCurrentDayEntries();
  }

  // Handle Apply Filters
  async function handleApplyFilters() {
    const startDateStr = filterStartDateInput.value;
    const endDateStr = filterEndDateInput.value;
    const category = filterCategoryInput.value;

    if (!activeChildId) {
      showFormMsg('Please select a child first.', 'error');
      return;
    }

    try {
      let path = `/screentimelog?childid=${activeChildId}`;
      if (startDateStr) path += `&startdate=${startDateStr}`;
      if (endDateStr) path += `&enddate=${endDateStr}`;
      if (category) path += `&category=${encodeURIComponent(category)}`;

      const entries = await api('GET', path);
      allEntries = Array.isArray(entries) ? entries : [];
      renderWeeklyChart();
      renderCategoryChart();
      renderCurrentDayEntries();
    } catch (err) {
      console.error('Failed to apply filters:', err);
      showFormMsg('Failed to apply filters. Please try again.', 'error');
    }
  }

  // Event Listeners
  if (childSelect) {
    childSelect.addEventListener('change', handleChildChange);
  }
  if (screentimeForm) {
    screentimeForm.addEventListener('submit', handleSubmit);
  }
  if (prevDayBtn) {
    prevDayBtn.addEventListener('click', handlePrevDay);
  }
  if (nextDayBtn) {
    nextDayBtn.addEventListener('click', handleNextDay);
  }
  if (applyFiltersBtn) {
    applyFiltersBtn.addEventListener('click', handleApplyFilters);
  }

  // Initialize
  renderSelectedDay();
  loadChildren();
})();
