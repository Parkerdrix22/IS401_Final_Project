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
  let activeChildId = null;

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
        childSelect.value = '';
      }

      activeChildId = childSelect.value ? Number(childSelect.value) : null;
      if (!activeChildId) {
        showFormMsg('Add a child in Profile to start logging activities.', 'error');
      } else {
        showFormMsg('', '');
      }
      loadData();
    } catch (_err) {
      childSelect.innerHTML = '<option value="">— Login to select a child —</option>';
      childSelect.disabled = true;
      activeChildId = null;
      showFormMsg('Please log in to track activities.', 'error');
      loadData();
    }
  }

  childSelect?.addEventListener('change', () => {
    const id = childSelect.value;
    activeChildId = id ? Number(id) : null;
    if (id) sessionStorage.setItem('fitness-childid', id);
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
      const date = a.timecreated ? new Date(a.timecreated).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
      const timeRange = (a.starttime && a.endtime)
        ? `${formatTime(a.starttime.slice(0, 5))} – ${formatTime(a.endtime.slice(0, 5))}`
        : `${a.duration || 0} min`;
      const notesHtml = a.notes ? `<div class="activity-item-notes">${escapeHtml(a.notes)}</div>` : '';
      return `
        <li class="activity-item" data-id="${a.activityid}">
          <div class="activity-item-main">
            <span class="activity-type">${escapeHtml(a.activitytype || '—')}</span>
            <span class="activity-duration">${timeRange}</span>
          </div>
          <div class="activity-item-meta">${escapeHtml(date)} · ${a.duration || 0} min</div>
          ${notesHtml}
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

  function timeDiffMinutes(start, end) {
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    return (eh * 60 + em) - (sh * 60 + sm);
  }

  function formatTime(timeStr) {
    if (!timeStr) return null;
    const [h, m] = timeStr.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const hour = h % 12 || 12;
    return `${hour}:${String(m).padStart(2, '0')} ${period}`;
  }

  activityForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const childid = activeChildId;
    if (!childid) {
      showFormMsg('Please select a child first.', 'error');
      return;
    }

    let activitytype = document.getElementById('activity-type')?.value?.trim();
    if (activitytype === 'Other') {
      activitytype = document.getElementById('activity-custom')?.value?.trim() || 'Other';
    }
    const starttime = document.getElementById('activity-start')?.value;
    const endtime = document.getElementById('activity-end')?.value;
    const notes = document.getElementById('activity-notes')?.value?.trim() || null;

    if (!activitytype) {
      showFormMsg('Please select an activity type.', 'error');
      return;
    }
    if (!starttime || !endtime) {
      showFormMsg('Please enter a start and end time.', 'error');
      return;
    }
    const duration = timeDiffMinutes(starttime, endtime);
    if (duration < 1) {
      showFormMsg('End time must be after start time.', 'error');
      return;
    }

    showFormMsg('Adding...', '');
    try {
      await api('POST', '/activitylogs', {
        childid: Number(childid),
        activitytype,
        duration,
        starttime,
        endtime,
        notes,
        timecreated: `${toLocalDateKey(selectedDate)}T${starttime}:00`,
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
