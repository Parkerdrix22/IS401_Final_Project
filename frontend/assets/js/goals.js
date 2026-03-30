const GOALS_API_BASE = window.location.port === '8080' ? 'http://localhost:3000' : window.location.origin;

const goalsState = {
  summary: null,
  activeChildId: null,
};

function currentWeekRange() {
  const now = new Date();
  const day = now.getDay(); // 0=Sun
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(now.getDate() - day);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return { start, end };
}

function formatDateInput(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function showGoalsMessage(text, type = '') {
  const el = document.getElementById('goals-message');
  if (!el) return;
  el.textContent = text;
  el.classList.remove('error', 'success');
  if (type) el.classList.add(type);
}

async function goalsRequest(method, path, body) {
  const res = await fetch(`${GOALS_API_BASE}${path}`, {
    method,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

function goalTemplateDefaults(template) {
  if (template === 'nutrition_entries') return { category: 'Nutrition', goaltype: 'at_least', unit: 'entries', goalName: 'Nutrition Entries', suggestedTarget: 14 };
  if (template === 'nutrition_healthy_entries') return { category: 'Nutrition', goaltype: 'at_least', unit: 'healthy entries', goalName: 'Healthy Nutrition Entries', suggestedTarget: 10 };
  if (template === 'nutrition_servings') return { category: 'Nutrition', goaltype: 'at_least', unit: 'servings', goalName: 'Nutrition Servings', suggestedTarget: 21 };
  if (template === 'fitness_minutes') return { category: 'Fitness', goaltype: 'at_least', unit: 'minutes', goalName: 'Fitness Minutes', suggestedTarget: 150 };
  if (template === 'screentime_minutes') return { category: 'Screen Time', goaltype: 'at_most', unit: 'minutes', goalName: 'Screen Time Limit', suggestedTarget: 420 };
  return { category: 'Custom', goaltype: 'manual', unit: 'points', goalName: 'Manual Goal', suggestedTarget: 1 };
}

function toTitleCase(text) {
  return String(text || '')
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

function formatGoalTypeLabel(goalType) {
  const normalized = String(goalType || '').toLowerCase();
  if (normalized === 'at_least') return 'Reach at least';
  if (normalized === 'at_most') return 'Keep under';
  return 'Track manually';
}

function normalizeStatus(goal) {
  const normalized = String(goal.status || '').toLowerCase();
  if (normalized.includes('completed')) return { label: 'Completed', klass: 'goal-status-badge done' };
  if (normalized.includes('on track')) return { label: 'On track', klass: 'goal-status-badge on-track' };
  if (normalized.includes('at risk')) return { label: 'Near limit', klass: 'goal-status-badge warning' };
  if (normalized.includes('over')) return { label: 'Over limit', klass: 'goal-status-badge danger' };
  return { label: toTitleCase(goal.status || 'In progress'), klass: 'goal-status-badge neutral' };
}

function progressStyle(goal) {
  const width = Math.max(0, Math.min(100, Number(goal.progressPercent || 0)));
  const status = String(goal.status || '').toLowerCase();
  const isOver = status.includes('over');
  return {
    width,
    klass: isOver ? 'goal-progress-fill danger' : 'goal-progress-fill',
  };
}

function renderGoalItem(goal, childId) {
  const progress = progressStyle(goal);
  const statusBadge = normalizeStatus(goal);
  const goalTypeLabel = formatGoalTypeLabel(goal.goaltype);
  const categoryLabel = toTitleCase(goal.category || 'Goal');
  return `
    <article class="goal-item" data-goalid="${goal.goalid}" data-childid="${childId}">
      <div class="goal-item-header">
        <h4>${categoryLabel} goal</h4>
        <div class="goal-item-actions">
          <button type="button" class="goal-action-btn" data-goal-edit="${goal.goalid}">Edit</button>
          <button type="button" class="goal-action-btn danger" data-goal-delete="${goal.goalid}">Delete</button>
        </div>
      </div>
      <p class="goal-meta">
        ${goalTypeLabel}: <strong>${goal.targetvalue} ${goal.unit}</strong> this week | Current: <strong>${goal.value} ${goal.unit}</strong>
      </p>
      <div class="goal-progress-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${progress.width}">
        <div class="${progress.klass}" style="width:${progress.width}%"></div>
      </div>
      <p class="goal-status"><span class="${statusBadge.klass}">${statusBadge.label}</span></p>
    </article>
  `;
}

function resolveActiveChildId(children) {
  if (!children.length) return null;
  const active = Number(goalsState.activeChildId);
  if (children.some((child) => Number(child.childid) === active)) {
    return active;
  }
  return Number(children[0].childid);
}

function renderChildCard(child) {
  const screenHours = (Number(child.weekly.screentime_minutes || 0) / 60).toFixed(1);
  const okrPercent = Number(child.okr?.percent || 0);
  const okrTrackedGoals = Number(child.okr?.trackedGoals || 0);
  return `
    <section class="goals-child-card" data-childid="${child.childid}">
      <div class="goals-child-header">
        <h3>${child.firstname} ${child.lastname}</h3>
        <p>Age ${child.age ?? '-'}</p>
      </div>

      <p class="goals-quick-summary">
        This week: Nutrition ${child.weekly.nutrition_entries} entries • Fitness ${child.weekly.fitness_minutes} min • Screen time ${screenHours} hr
      </p>

      <div class="goals-child-okr">
        <div>
          <p class="goals-summary-label">Weekly completion</p>
          <p class="goals-child-okr-value">${okrPercent}%</p>
        </div>
        <p class="goals-child-okr-meta">${okrTrackedGoals} auto-tracked goal${okrTrackedGoals === 1 ? '' : 's'}</p>
      </div>

      <h4 class="goals-section-title">Current goals</h4>
      <div class="goals-list" id="goals-list-${child.childid}">
        ${child.goals.length ? child.goals.map((goal) => renderGoalItem(goal, child.childid)).join('') : '<p class="goals-empty">No goals yet. Add one below.</p>'}
      </div>

      <details class="goal-create-details">
        <summary>Add a new goal</summary>
        <form class="goal-create-form" data-goal-form="${child.childid}">
          <p class="goals-form-hint">Pick a template first. Goal type and unit will auto-fill for you.</p>
          <div class="goal-form-grid">
            <label>
              Goal Template
              <select name="template" required>
                <option value="nutrition_entries">Nutrition entries (weekly)</option>
                <option value="nutrition_healthy_entries">Healthy nutrition entries (weekly)</option>
                <option value="nutrition_servings">Nutrition servings (weekly)</option>
                <option value="fitness_minutes">Fitness minutes (weekly)</option>
                <option value="screentime_minutes">Screen time max minutes (weekly)</option>
                <option value="manual">Manual self-reported goal</option>
              </select>
            </label>
            <label>
              Goal Type
              <select name="goaltype" required>
                <option value="at_least">At least</option>
                <option value="at_most">At most</option>
                <option value="manual">Manual</option>
              </select>
            </label>
            <label>
              Target Value
              <input type="number" name="targetvalue" min="1" required />
            </label>
            <label>
              Unit
              <input type="text" name="unit" maxlength="30" required />
            </label>
          </div>
          <button type="submit" class="auth-btn">Save Goal</button>
        </form>
      </details>
    </section>
  `;
}

function renderOkrCard(summary) {
  const root = document.getElementById('goals-okr');
  if (!root) return;

  const weekStart = summary.weekStart ? new Date(summary.weekStart) : null;
  const weekEnd = summary.weekEnd ? new Date(summary.weekEnd) : null;
  const rangeLabel = weekStart && weekEnd
    ? `${weekStart.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`
    : 'Current week';
  const percent = Number(summary.okr?.percent || 0);
  const trackedGoals = Number(summary.okr?.trackedGoals || 0);

  root.innerHTML = `
    <section class="goals-okr-card" aria-label="Weekly healthy habits completion">
      <p class="goals-okr-label">Weekly Healthy Habits Completion</p>
      <p class="goals-okr-percent">${percent}%</p>
      <p class="goals-okr-meta">${rangeLabel} • ${trackedGoals} auto-tracked goal${trackedGoals === 1 ? '' : 's'}</p>
      <div class="goals-okr-progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${percent}">
        <div class="goals-okr-progress-fill" style="width:${Math.max(0, Math.min(100, percent))}%"></div>
      </div>
    </section>
  `;
}

function renderChildTab(child, activeChildId) {
  const isActive = Number(child.childid) === Number(activeChildId);
  return `
    <button
      type="button"
      class="goals-child-tab${isActive ? ' active' : ''}"
      role="tab"
      id="goals-tab-${child.childid}"
      aria-controls="goals-panel-${child.childid}"
      aria-selected="${isActive ? 'true' : 'false'}"
      tabindex="${isActive ? '0' : '-1'}"
      data-child-tab="${child.childid}"
    >
      <span class="goals-child-tab-name">${child.firstname} ${child.lastname}</span>
      <span class="goals-child-tab-age">Age ${child.age ?? '-'}</span>
    </button>
  `;
}

function renderChildPanels(children, activeChildId) {
  return children.map((child) => {
    const isActive = Number(child.childid) === Number(activeChildId);
    return `
      <div
        class="goals-child-panel${isActive ? ' active' : ''}"
        role="tabpanel"
        id="goals-panel-${child.childid}"
        aria-labelledby="goals-tab-${child.childid}"
        data-child-panel="${child.childid}"
        ${isActive ? '' : 'hidden'}
      >
        ${renderChildCard(child)}
      </div>
    `;
  }).join('');
}

function activateChildTab(childId) {
  goalsState.activeChildId = Number(childId);

  document.querySelectorAll('[data-child-tab]').forEach((tab) => {
    const tabChildId = Number(tab.getAttribute('data-child-tab'));
    const isActive = tabChildId === goalsState.activeChildId;
    tab.classList.toggle('active', isActive);
    tab.setAttribute('aria-selected', isActive ? 'true' : 'false');
    tab.tabIndex = isActive ? 0 : -1;
  });

  document.querySelectorAll('[data-child-panel]').forEach((panel) => {
    const panelChildId = Number(panel.getAttribute('data-child-panel'));
    const isActive = panelChildId === goalsState.activeChildId;
    panel.classList.toggle('active', isActive);
    panel.hidden = !isActive;
  });
}

function bindChildTabs() {
  const tabs = Array.from(document.querySelectorAll('[data-child-tab]'));
  if (!tabs.length) return;

  const focusTabByIndex = (index) => {
    const normalized = (index + tabs.length) % tabs.length;
    const target = tabs[normalized];
    target.focus();
    activateChildTab(Number(target.getAttribute('data-child-tab')));
  };

  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => {
      activateChildTab(Number(tab.getAttribute('data-child-tab')));
    });

    tab.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        focusTabByIndex(index + 1);
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        focusTabByIndex(index - 1);
      } else if (event.key === 'Home') {
        event.preventDefault();
        focusTabByIndex(0);
      } else if (event.key === 'End') {
        event.preventDefault();
        focusTabByIndex(tabs.length - 1);
      }
    });
  });
}

function renderGoalsPage(summary) {
  const root = document.getElementById('goals-children-list');
  if (!root) return;
  const children = summary.children || [];
  if (children.length === 0) {
    root.innerHTML = '<p class="goals-empty">No children found for this account.</p>';
    return;
  }

  const activeChildId = resolveActiveChildId(children);
  goalsState.activeChildId = activeChildId;

  root.innerHTML = `
    <div class="goals-children-tabs" role="tablist" aria-label="Children goals tabs">
      ${children.map((child) => renderChildTab(child, activeChildId)).join('')}
    </div>
    <div class="goals-children-panels">
      ${renderChildPanels(children, activeChildId)}
    </div>
  `;

  bindChildTabs();
}

function bindGoalForms() {
  const forms = document.querySelectorAll('[data-goal-form]');
  forms.forEach((form) => {
    const templateEl = form.querySelector('select[name="template"]');
    const goalTypeEl = form.querySelector('select[name="goaltype"]');
    const targetEl = form.querySelector('input[name="targetvalue"]');
    const unitEl = form.querySelector('input[name="unit"]');

    const applyTemplateDefaults = () => {
      const defaults = goalTemplateDefaults(String(templateEl?.value || ''));
      if (goalTypeEl) goalTypeEl.value = defaults.goaltype;
      if (unitEl) unitEl.value = defaults.unit;
      if (targetEl && !targetEl.value) targetEl.value = String(defaults.suggestedTarget || 1);
    };

    templateEl?.addEventListener('change', applyTemplateDefaults);
    applyTemplateDefaults();

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const childId = Number(form.getAttribute('data-goal-form'));
      const data = new FormData(form);
      const template = String(data.get('template') || '');
      const defaults = goalTemplateDefaults(template);
      const week = currentWeekRange();
      const payload = {
        childid: childId,
        category: defaults.category,
        targetvalue: Number(data.get('targetvalue') || 0),
        goaltype: String(data.get('goaltype') || defaults.goaltype),
        value: 0,
        unit: String(data.get('unit') || defaults.unit).trim(),
        start_date: `${formatDateInput(week.start)}T00:00:00`,
        end_date: `${formatDateInput(week.end)}T23:59:59`,
        frequency: 'Weekly',
        isactive: true,
      };

      if (!payload.targetvalue || !payload.unit) {
        showGoalsMessage('Please complete all required goal fields.', 'error');
        return;
      }

      try {
        await goalsRequest('POST', '/goals', payload);
        showGoalsMessage('Goal saved successfully.', 'success');
        await loadGoalsSummary();
      } catch (err) {
        showGoalsMessage(err.message, 'error');
      }
    });
  });
}

function bindGoalActions() {
  document.querySelectorAll('[data-goal-delete]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const goalId = Number(btn.getAttribute('data-goal-delete'));
      if (!goalId) return;
      if (!window.confirm('Delete this goal?')) return;
      try {
        await goalsRequest('DELETE', `/goals/${goalId}`);
        showGoalsMessage('Goal deleted.', 'success');
        await loadGoalsSummary();
      } catch (err) {
        showGoalsMessage(err.message, 'error');
      }
    });
  });

  document.querySelectorAll('[data-goal-edit]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const goalId = Number(btn.getAttribute('data-goal-edit'));
      if (!goalId || !goalsState.summary) return;

      let existingGoal = null;
      for (const child of goalsState.summary.children || []) {
        const match = (child.goals || []).find((g) => Number(g.goalid) === goalId);
        if (match) {
          existingGoal = match;
          break;
        }
      }
      if (!existingGoal) return;

      const targetInput = window.prompt('Update target value', String(existingGoal.targetvalue));
      if (targetInput === null) return;
      const nextTarget = Number(targetInput);
      if (!Number.isFinite(nextTarget) || nextTarget <= 0) {
        showGoalsMessage('Target value must be a positive number.', 'error');
        return;
      }

      const unitInput = window.prompt('Update unit', String(existingGoal.unit || ''));
      if (unitInput === null) return;

      const valueInput = window.prompt(
        'Update current value (used for manual goals)',
        String(existingGoal.value || 0)
      );
      if (valueInput === null) return;
      const nextValue = Number(valueInput);
      if (!Number.isFinite(nextValue) || nextValue < 0) {
        showGoalsMessage('Current value must be 0 or more.', 'error');
        return;
      }

      try {
        await goalsRequest('PUT', `/goals/${goalId}`, {
          category: existingGoal.category,
          targetvalue: nextTarget,
          goaltype: existingGoal.goaltype,
          value: nextValue,
          unit: unitInput.trim() || existingGoal.unit,
          start_date: existingGoal.start_date,
          end_date: existingGoal.end_date,
          frequency: existingGoal.frequency,
          isactive: existingGoal.isactive,
        });
        showGoalsMessage('Goal updated.', 'success');
        await loadGoalsSummary();
      } catch (err) {
        showGoalsMessage(err.message, 'error');
      }
    });
  });
}

async function loadGoalsSummary() {
  const summary = await goalsRequest('GET', '/goals/summary');
  goalsState.summary = summary;
  renderOkrCard(summary);
  renderGoalsPage(summary);
  bindGoalForms();
  bindGoalActions();
}

document.addEventListener('DOMContentLoaded', async () => {
  try {
    await loadGoalsSummary();
  } catch (err) {
    showGoalsMessage(err.message || 'Could not load goals data.', 'error');
  }
});
