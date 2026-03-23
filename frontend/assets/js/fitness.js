(function () {
  const API_BASE = window.location.port === '8080' ? 'http://localhost:3000' : window.location.origin;

  const childSelect = document.getElementById('child-select');
  const activityForm = document.getElementById('activity-form');
  const activityList = document.getElementById('activity-list');
  const chartEmptyMsg = document.getElementById('chart-empty-msg');
  const listEmptyMsg = document.getElementById('list-empty-msg');
  const formMsg = document.getElementById('activity-form-msg');
  const prevDayBtn = document.getElementById('fitness-prev-day');
  const nextDayBtn = document.getElementById('fitness-next-day');
  const dayNameEl = document.getElementById('fitness-day-name');
  const dayDateEl = document.getElementById('fitness-day-date');

  let chart = null;
  let selectedDate = new Date();

  async function api(method, path, body) {
    const opts = {
      method,
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    };
    if (body && (method === 'POST' || method === 'PUT')) opts.body = JSON.stringify(body);
    const res = await fetch(`${API_BASE}${path}`, opts);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const error = new Error(data.error || 'Request failed');
      error.status = res.status;
      throw error;
    }
    return data;
  }

  function showFormMsg(text, type) {
    if (!formMsg) return;
    formMsg.textContent = text;
    formMsg.className = 'fitness-msg' + (type ? ' ' + type : '');
  }

  async function loadChildren() {
    try {
      const children = await api('GET', '/children');
      isLoggedIn = true;
      const saved = sessionStorage.getItem('fitness-childid');
      if (saved && children.some(c => String(c.childid) === saved)) {
        childSelect.value = saved;
        loadData();
      } else if (children.length > 0) {
        childSelect.value = String(children[0].childid);
        sessionStorage.setItem('fitness-childid', childSelect.value);
        loadData();
      }
      loadData();
    } catch (e) {
      const status = Number(e?.status || 0);
      activeChildId = null;
      if (status === 401) {
        isLoggedIn = false;
        if (childSelect) {
          childSelect.innerHTML = '<option value="">— Login to select a child —</option>';
          childSelect.disabled = true;
        }
        showFormMsg('', '');
        loadData();
        return;
      }
      isLoggedIn = true;
      if (childSelect) {
        childSelect.innerHTML = '<option value="">— Error loading children —</option>';
        childSelect.disabled = true;
      }
      activeChildId = null;
      showFormMsg('Failed to load child profile.', 'error');
    }
  }

  childSelect?.addEventListener('change', () => {
    if (!isLoggedIn) return;
    const id = childSelect.value;
    if (id) {
      activeChildId = Number(id);
      sessionStorage.setItem('fitness-childid', id);
    } else {
      activeChildId = null;
    }
    loadData();
  });

  const activityTypeSelect = document.getElementById('activity-type');
  const customActivityRow = document.getElementById('custom-activity-row');
  const customActivityInput = document.getElementById('activity-custom');

  activityTypeSelect?.addEventListener('change', () => {
    customActivityRow.style.display = activityTypeSelect.value === 'Other' ? 'block' : 'none';
    if (activityTypeSelect.value !== 'Other') customActivityInput.value = '';
  });

  async function loadActivities() {
    if (!isLoggedIn) return guestActivities;
    const childid = activeChildId;
    if (!childid) return [];
    try {
      return await api('GET', `/activitylogs?childid=${childid}`);
    } catch {
      return [];
    }
  }

  function toLocalDateKey(value) {
    const d = value ? new Date(value) : new Date();
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
    start.setDate(start.getDate() - start.getDay()); // Sunday
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      days.push(d);
    }
    return days;
  }

  function renderSelectedDay() {
    if (dayNameEl) {
      dayNameEl.textContent = selectedDate.toLocaleDateString(undefined, { weekday: 'long' });
    }
    if (dayDateEl) {
      dayDateEl.textContent = selectedDate.toLocaleDateString(undefined, {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });
    }
  }

  function aggregateMinutesByDate(activities) {
    const byDate = {};
    activities.forEach(a => {
      const key = toLocalDateKey(a.timecreated);
      byDate[key] = (byDate[key] || 0) + (Number(a.duration) || 0);
    });
    return byType;
  }

  function getLast14Days() {
    return getWeekDates(selectedDate).map(toLocalDateKey);
  }

  function renderChart(activities) {
    const labels = getLast14Days();
    const byType = aggregateMinutesByDateAndType(activities, labels);
    const typeNames = Object.keys(byType);
    const datasets = typeNames.map(type => ({
      label: type,
      data: labels.map(d => byType[type][d] || 0),
      backgroundColor: getActivityColor(type, 0.72),
      borderColor: getActivityColor(type, 1),
      borderWidth: 1,
    }));

    const ctx = document.getElementById('minutes-chart');
    if (!ctx) return;

    const hasData = datasets.some(ds => ds.data.some(v => v > 0));
    chartEmptyMsg.style.display = hasData ? 'none' : 'block';
    ctx.parentElement.style.display = hasData ? 'block' : 'none';

    if (chart) chart.destroy();
    if (!hasData) return;

    chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: getWeekDates(selectedDate).map(d => d.toLocaleDateString(undefined, { weekday: 'short' })),
        datasets: [{
          label: 'Minutes',
          data,
          backgroundColor: 'rgba(46, 154, 87, 0.7)',
          borderColor: 'rgba(46, 154, 87, 1)',
          borderWidth: 1,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: true },
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { stepSize: 10 },
          },
        },
      },
    });
  }

  function renderList(activities) {
    if (!activityList) return;
    const hasData = activities.length > 0;
    listEmptyMsg.style.display = hasData ? 'none' : 'block';
    activityList.style.display = hasData ? 'block' : 'none';
    listEmptyMsg.textContent = 'No activities yet. Log an activity above to get started.';

    activityList.innerHTML = activities.map(a => {
      const date = a.timecreated ? new Date(a.timecreated).toLocaleString() : '—';
      const steps = a.steps != null ? ` • ${a.steps} steps` : '';
      const cal = a.caloriesburned != null ? ` • ${a.caloriesburned} cal` : '';
      return `
        <li class="activity-item" data-id="${a.activityid}">
          <div class="activity-item-main">
            <span class="activity-type">${escapeHtml(a.activitytype || '—')}</span>
            <span class="activity-duration">${a.duration || 0} min</span>
          </div>
          <div class="activity-item-meta">${escapeHtml(date)}${steps}${cal}</div>
          <button type="button" class="activity-delete" aria-label="Delete activity">×</button>
        </li>
      `;
    }).join('');

    activityList.querySelectorAll('.activity-delete').forEach(btn => {
      btn.addEventListener('click', async () => {
        const li = btn.closest('.activity-item');
        const id = li?.dataset?.id;
        if (!id) return;
        if (id.startsWith('guest-')) {
          guestActivities = guestActivities.filter(a => String(a.activityid) !== id);
          loadData();
          return;
        }
        try {
          await api('DELETE', `/activitylogs/${id}`);
          li.remove();
          const remaining = activityList.querySelectorAll('.activity-item');
          if (remaining.length === 0) {
            listEmptyMsg.style.display = 'block';
            activityList.style.display = 'none';
          }
          loadData();
        } catch (e) {
          showFormMsg('Failed to delete activity', 'error');
        }
      });
    });
  }

  function escapeHtml(s) {
    const div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }

  async function loadData() {
    renderSelectedDay();
    const activities = await loadActivities();
    renderChart(activities);
    renderList(activities);
  }

  activityForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    let activitytype = document.getElementById('activity-type')?.value?.trim();
    if (activitytype === 'Other') {
      activitytype = document.getElementById('activity-custom')?.value?.trim() || 'Other';
    }
    const duration = parseInt(document.getElementById('activity-duration')?.value, 10);
    const steps = document.getElementById('activity-steps')?.value;
    const caloriesburned = document.getElementById('activity-calories')?.value;

    if (!activitytype || !duration || duration < 1) {
      showFormMsg('Please enter activity type and duration.', 'error');
      return;
    }

    const payload = {
      activitytype,
      duration,
      steps: steps ? parseInt(steps, 10) : null,
      caloriesburned: caloriesburned ? parseInt(caloriesburned, 10) : null,
    };

    if (!isLoggedIn) {
      addGuestActivity(payload);
      showFormMsg('Added for preview only. Log in to save records.', 'success');
      activityForm.reset();
      loadData();
      return;
    }

    const childid = activeChildId;
    if (!childid) {
      showFormMsg('Please select a child first.', 'error');
      return;
    }

    showFormMsg('Adding...', '');
    try {
      await api('POST', '/activitylogs', {
        childid: Number(childid),
        activitytype,
        duration,
        steps: steps ? parseInt(steps, 10) : null,
        caloriesburned: caloriesburned ? parseInt(caloriesburned, 10) : null,
        timecreated: `${toLocalDateKey(selectedDate)}T12:00:00`,
      });
      showFormMsg('Activity added!', 'success');
      activityForm.reset();
      loadData();
    } catch (err) {
      showFormMsg(err.message || 'Failed to add activity', 'error');
    }
  });

  document.addEventListener('DOMContentLoaded', () => {
    selectedDate = normalizeToDateOnly(new Date());
    prevDayBtn?.addEventListener('click', () => {
      selectedDate.setDate(selectedDate.getDate() - 1);
      selectedDate = normalizeToDateOnly(selectedDate);
      loadData();
    });
    nextDayBtn?.addEventListener('click', () => {
      selectedDate.setDate(selectedDate.getDate() + 1);
      selectedDate = normalizeToDateOnly(selectedDate);
      loadData();
    });
    loadChildren();
  });
})();
