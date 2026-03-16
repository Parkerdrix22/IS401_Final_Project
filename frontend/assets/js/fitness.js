(function () {
  const API_BASE = window.location.port === '8080' ? 'http://localhost:3000' : window.location.origin;

  const childSelect = document.getElementById('child-select');
  const activityForm = document.getElementById('activity-form');
  const activityList = document.getElementById('activity-list');
  const chartEmptyMsg = document.getElementById('chart-empty-msg');
  const listEmptyMsg = document.getElementById('list-empty-msg');
  const formMsg = document.getElementById('activity-form-msg');

  let chart = null;

  async function api(method, path, body) {
    const opts = {
      method,
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    };
    if (body && (method === 'POST' || method === 'PUT')) opts.body = JSON.stringify(body);
    const res = await fetch(`${API_BASE}${path}`, opts);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Request failed');
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
      childSelect.innerHTML = '<option value="">— Choose a child —</option>' +
        children.map(c => `<option value="${c.childid}">${c.firstname} ${c.lastname}</option>`).join('');
      const saved = sessionStorage.getItem('fitness-childid');
      if (saved && children.some(c => String(c.childid) === saved)) {
        childSelect.value = saved;
        loadData();
      }
    } catch (e) {
      childSelect.innerHTML = '<option value="">— Error loading children —</option>';
    }
  }

  childSelect?.addEventListener('change', () => {
    const id = childSelect.value;
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
    const childid = childSelect?.value;
    if (!childid) return [];
    try {
      return await api('GET', `/activitylogs?childid=${childid}`);
    } catch {
      return [];
    }
  }

  function aggregateMinutesByDate(activities) {
    const byDate = {};
    activities.forEach(a => {
      const d = a.timecreated ? new Date(a.timecreated) : new Date();
      const key = d.toISOString().slice(0, 10);
      byDate[key] = (byDate[key] || 0) + (Number(a.duration) || 0);
    });
    return byDate;
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
    const byDate = aggregateMinutesByDate(activities);
    const labels = getLast14Days();
    const data = labels.map(d => byDate[d] || 0);

    const ctx = document.getElementById('minutes-chart');
    if (!ctx) return;

    const hasData = data.some(v => v > 0);
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
        maintainAspectRatio: true,
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

  function renderList(activities) {
    if (!activityList) return;
    const hasData = activities.length > 0;
    listEmptyMsg.style.display = hasData ? 'none' : 'block';
    activityList.style.display = hasData ? 'block' : 'none';

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
    const childid = childSelect?.value;
    if (!childid) {
      showFormMsg('Please select a child first.', 'error');
      return;
    }

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

    showFormMsg('Adding...', '');
    try {
      await api('POST', '/activitylogs', {
        childid: Number(childid),
        activitytype,
        duration,
        steps: steps ? parseInt(steps, 10) : null,
        caloriesburned: caloriesburned ? parseInt(caloriesburned, 10) : null,
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
