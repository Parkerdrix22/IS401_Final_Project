(function () {
  const API_BASE = window.location.port === '8080' ? 'http://localhost:3000' : window.location.origin;

  const childSelect = document.getElementById('child-select');
  const activityForm = document.getElementById('activity-form');
  const activitySubmitBtn = activityForm?.querySelector('button[type="submit"]');
  const activityList = document.getElementById('activity-list');
  const chartEmptyMsg = document.getElementById('chart-empty-msg');
  const listEmptyMsg = document.getElementById('list-empty-msg');
  const formMsg = document.getElementById('activity-form-msg');
<<<<<<< HEAD
  const authHint = document.getElementById('fitness-auth-hint');
=======
  const prevDayBtn = document.getElementById('fitness-prev-day');
  const nextDayBtn = document.getElementById('fitness-next-day');
  const dayNameEl = document.getElementById('fitness-day-name');
  const dayDateEl = document.getElementById('fitness-day-date');
>>>>>>> main

  let chart = null;
  let selectedDate = new Date();
  let activeChildId = null;
<<<<<<< HEAD
  let childrenCache = [];
  let guestActivities = [];
  const ACTIVITY_COLORS = {
    Running: '#E4572E',
    Walking: '#4C78A8',
    Swimming: '#2E86AB',
    Cycling: '#59A14F',
    Playtime: '#F28E2B',
    Sports: '#B07AA1',
    Dance: '#EDC948',
    Yoga: '#76B7B2',
    Other: '#9C755F',
  };
=======
>>>>>>> main

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

  function showFormMsg(text, type) {
    if (!formMsg) return;
    formMsg.textContent = text;
    formMsg.className = 'fitness-msg' + (type ? ` ${type}` : '');
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
    for (let i = 0; i < 7; i += 1) {
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

  function setAuthHint(text) {
    if (authHint) authHint.textContent = text || '';
  }

  function updateSubmitDisabled() {
    if (!activitySubmitBtn) return;
    if (!isLoggedIn) {
      activitySubmitBtn.disabled = false;
      return;
    }
    activitySubmitBtn.disabled = childrenCache.length === 0 || activeChildId == null;
  }

  async function loadChildren() {
    if (!childSelect) return;
    try {
      const children = await api('GET', '/children');
      childSelect.disabled = false;
      childSelect.innerHTML = '<option value="">— Choose a child —</option>' +
        children.map((c) => `<option value="${c.childid}">${c.firstname} ${c.lastname}</option>`).join('');

      const saved = sessionStorage.getItem('fitness-childid');
      if (saved && children.some((c) => String(c.childid) === saved)) {
        childSelect.value = saved;
      } else if (children.length > 0) {
        childSelect.value = String(children[0].childid);
        sessionStorage.setItem('fitness-childid', childSelect.value);
      } else {
<<<<<<< HEAD
        activeChildId = null;
      }
      childrenCache = children;
      setAuthHint('');
      if (childSelect) {
        childSelect.innerHTML = '<option value="">— Choose a child —</option>' +
          children.map(c => `<option value="${c.childid}">${c.firstname} ${c.lastname}</option>`).join('');
        childSelect.value = activeChildId != null ? String(activeChildId) : '';
        childSelect.disabled = false;
      }

      if (children.length === 0) {
        showFormMsg('No child profile found. Add a child under your account to log activity.', 'error');
=======
        childSelect.value = '';
      }

      activeChildId = childSelect.value ? Number(childSelect.value) : null;
      if (!activeChildId) {
        showFormMsg('Add a child in Profile to start logging activities.', 'error');
>>>>>>> main
      } else {
        showFormMsg('', '');
      }
      updateSubmitDisabled();
      loadData();
    } catch (_err) {
      childSelect.innerHTML = '<option value="">— Login to select a child —</option>';
      childSelect.disabled = true;
      activeChildId = null;
<<<<<<< HEAD
      childrenCache = [];
      if (status === 401) {
        isLoggedIn = false;
        if (childSelect) {
          childSelect.innerHTML = '<option value="">— Login to select a child —</option>';
          childSelect.disabled = true;
        }
        setAuthHint('Log in to save activities to your account. You can still preview the form below.');
        showFormMsg('', '');
        updateSubmitDisabled();
        loadData();
        return;
      }
      isLoggedIn = true;
      if (childSelect) {
        childSelect.innerHTML = '<option value="">— Error loading children —</option>';
        childSelect.disabled = true;
      }
      activeChildId = null;
      setAuthHint('');
      showFormMsg('Failed to load child profile.', 'error');
      updateSubmitDisabled();
=======
      showFormMsg('Please log in to track activities.', 'error');
      loadData();
>>>>>>> main
    }
  }

  childSelect?.addEventListener('change', () => {
    const id = childSelect.value;
<<<<<<< HEAD
    if (id) {
      activeChildId = Number(id);
      sessionStorage.setItem('fitness-childid', id);
    } else {
      activeChildId = null;
    }
    updateSubmitDisabled();
=======
    activeChildId = id ? Number(id) : null;
    if (id) sessionStorage.setItem('fitness-childid', id);
>>>>>>> main
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
    if (!activeChildId) return [];
    try {
      return await api('GET', `/activitylogs?childid=${activeChildId}`);
    } catch {
      return [];
    }
  }

  function aggregateMinutesByDate(activities) {
    const byDate = {};
    activities.forEach((a) => {
      const key = toLocalDateKey(a.timecreated);
      byDate[key] = (byDate[key] || 0) + (Number(a.duration) || 0);
    });
    return byDate;
  }

  function renderChart(activities) {
    const weekDates = getWeekDates(selectedDate);
    const weekKeys = weekDates.map(toLocalDateKey);
    const byDate = aggregateMinutesByDate(activities);
    const data = weekKeys.map((key) => byDate[key] || 0);

    const ctx = document.getElementById('minutes-chart');
    if (!ctx) return;

    const hasData = data.some((v) => v > 0);
    chartEmptyMsg.style.display = hasData ? 'none' : 'block';
    ctx.parentElement.style.display = hasData ? 'block' : 'none';

    if (chart) chart.destroy();
    if (!hasData) return;

    chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: weekDates.map((d) => d.toLocaleDateString(undefined, { weekday: 'short' })),
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
          legend: { display: false },
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

  function escapeHtml(s) {
    const div = document.createElement('div');
    div.textContent = s || '';
    return div.innerHTML;
  }

  function renderList(activities) {
    if (!activityList) return;
    const hasData = activities.length > 0;
    listEmptyMsg.style.display = hasData ? 'none' : 'block';
    activityList.style.display = hasData ? 'block' : 'none';

    activityList.innerHTML = activities.map((a) => {
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

    activityList.querySelectorAll('.activity-delete').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const li = btn.closest('.activity-item');
        const id = li?.dataset?.id;
        if (!id) return;
        try {
          await api('DELETE', `/activitylogs/${id}`);
          loadData();
        } catch (_err) {
          showFormMsg('Failed to delete activity', 'error');
        }
      });
    });
  }

  async function loadData() {
    renderSelectedDay();
    const activities = await loadActivities();
    renderChart(activities);
    renderList(activities);
  }

  activityForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
<<<<<<< HEAD
    const typeSelectVal = document.getElementById('activity-type')?.value?.trim();
    let activitytype = typeSelectVal;
    if (typeSelectVal === 'Other') {
      const custom = document.getElementById('activity-custom')?.value?.trim();
      if (!custom) {
        showFormMsg('Please enter a name for your custom activity.', 'error');
        return;
      }
      activitytype = custom;
=======
    const childid = activeChildId;
    if (!childid) {
      showFormMsg('Please select a child first.', 'error');
      return;
    }

    let activitytype = document.getElementById('activity-type')?.value?.trim();
    if (activitytype === 'Other') {
      activitytype = document.getElementById('activity-custom')?.value?.trim() || 'Other';
>>>>>>> main
    }
    const duration = parseInt(document.getElementById('activity-duration')?.value, 10);
    const steps = document.getElementById('activity-steps')?.value;
    const caloriesburned = document.getElementById('activity-calories')?.value;

    if (!activitytype || !Number.isFinite(duration) || duration < 1) {
      showFormMsg('Please enter activity type and duration.', 'error');
      return;
    }

<<<<<<< HEAD
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
      if (customActivityRow) customActivityRow.style.display = 'none';
      loadData();
      return;
    }

    const childid = activeChildId;
    if (!childid) {
      showFormMsg('Please select a child first.', 'error');
      return;
    }

=======
>>>>>>> main
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
      showFormMsg('Activity saved for this child.', 'success');
      activityForm.reset();
      if (customActivityRow) customActivityRow.style.display = 'none';
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
