(function () {
  const API_BASE = window.location.port === '8080' ? 'http://localhost:3000' : window.location.origin;

  const childSelect = document.getElementById('child-select');
  const activityForm = document.getElementById('activity-form');
  const activityList = document.getElementById('activity-list');
  const chartEmptyMsg = document.getElementById('chart-empty-msg');
  const listEmptyMsg = document.getElementById('list-empty-msg');
  const formMsg = document.getElementById('activity-form-msg');

  let chart = null;
  let isLoggedIn = false;
  let activeChildId = null;
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
      const savedExists = saved && children.some(c => String(c.childid) === saved);
      if (savedExists) {
        activeChildId = Number(saved);
      } else if (children.length > 0) {
        activeChildId = Number(children[0].childid);
        sessionStorage.setItem('fitness-childid', String(activeChildId));
      } else {
        activeChildId = null;
      }
      if (childSelect) {
        childSelect.innerHTML = '<option value="">— Choose a child —</option>' +
          children.map(c => `<option value="${c.childid}">${c.firstname} ${c.lastname}</option>`).join('');
        childSelect.value = savedExists ? String(saved) : '';
        childSelect.disabled = false;
      }

      if (children.length === 0) {
        showFormMsg('No child profile found. Please add a child first.', 'error');
      } else {
        showFormMsg('', '');
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

  function addGuestActivity(payload) {
    const now = new Date().toISOString();
    guestActivities.unshift({
      activityid: `guest-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      activitytype: payload.activitytype,
      duration: payload.duration,
      steps: payload.steps,
      caloriesburned: payload.caloriesburned,
      timecreated: now,
    });
  }

  function hexToRgba(hex, alpha) {
    const normalized = hex.replace('#', '');
    const int = parseInt(normalized, 16);
    const r = (int >> 16) & 255;
    const g = (int >> 8) & 255;
    const b = int & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  function getActivityColor(type, alpha = 1) {
    const base = ACTIVITY_COLORS[type] || ACTIVITY_COLORS.Other;
    return hexToRgba(base, alpha);
  }

  function aggregateMinutesByDateAndType(activities, labels) {
    const labelSet = new Set(labels);
    const byType = {};
    activities.forEach(a => {
      const d = a.timecreated ? new Date(a.timecreated) : new Date();
      const key = d.toISOString().slice(0, 10);
      if (!labelSet.has(key)) return;
      const type = String(a.activitytype || 'Other').trim() || 'Other';
      if (!byType[type]) byType[type] = {};
      byType[type][key] = (byType[type][key] || 0) + (Number(a.duration) || 0);
    });
    return byType;
  }

  function getLast14Days() {
    const days = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push(d.toISOString().slice(0, 10));
    }
    return days;
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
        labels: labels.map(d => {
          const [y, m, day] = d.split('-');
          return `${m}/${day}`;
        }),
        datasets,
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
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
        ...payload,
      });
      showFormMsg('Activity added!', 'success');
      activityForm.reset();
      loadData();
    } catch (err) {
      showFormMsg(err.message || 'Failed to add activity', 'error');
    }
  });

  document.addEventListener('DOMContentLoaded', () => {
    loadChildren();
  });
})();
