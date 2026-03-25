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
  const base = { category: 'Fitness', goaltype: 'at_least', unit: 'minutes', goalName: 'Weekly Fitness Minutes' };
  if (template === 'nutrition_entries') return { category: 'Nutrition', goaltype: 'at_least', unit: 'entries', goalName: 'Nutrition Entries' };
  if (template === 'nutrition_healthy_entries') return { category: 'Nutrition', goaltype: 'at_least', unit: 'healthy entries', goalName: 'Healthy Nutrition Entries' };
  if (template === 'nutrition_servings') return { category: 'Nutrition', goaltype: 'at_least', unit: 'servings', goalName: 'Nutrition Servings' };
  if (template === 'fitness_minutes') return { category: 'Fitness', goaltype: 'at_least', unit: 'minutes', goalName: 'Fitness Minutes' };
  if (template === 'screentime_minutes') return { category: 'Screen Time', goaltype: 'at_most', unit: 'minutes', goalName: 'Screen Time Limit' };
  return { category: 'Custom', goaltype: 'manual', unit: 'points', goalName: 'Manual Goal' };
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
  const comingSoon = goal.comingSoon ? '<span class="goal-chip coming-soon">Coming Soon</span>' : '';
  const autoChip = goal.trackedAutomatically ? '<span class="goal-chip">Auto tracked</span>' : '<span class="goal-chip">Manual</span>';
  return `
    <article class="goal-item" data-goalid="${goal.goalid}" data-childid="${childId}">
      <div class="goal-item-header">
        <h4>${goal.category} goal</h4>
        <div class="goal-item-actions">
          ${autoChip}
          ${comingSoon}
          <button type="button" class="goal-action-btn" data-goal-edit="${goal.goalid}">Edit</button>
          <button type="button" class="goal-action-btn danger" data-goal-delete="${goal.goalid}">Delete</button>
        </div>
      </div>
      <p class="goal-meta">
        Type: ${goal.goaltype} | Target: ${goal.targetvalue} ${goal.unit} | Current: ${goal.value} ${goal.unit}
      </p>
      <div class="goal-progress-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${progress.width}">
        <div class="${progress.klass}" style="width:${progress.width}%"></div>
      </div>
      <p class="goal-status">${goal.status}</p>
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
  return `
    <section class="goals-child-card" data-childid="${child.childid}">
      <div class="goals-child-header">
        <h3>${child.firstname} ${child.lastname}</h3>
        <p>Age ${child.age ?? '-'}</p>
      </div>

      <div class="goals-weekly-summary">
        <div class="goals-summary-tile">
          <p class="goals-summary-label">Nutrition (week)</p>
          <p class="goals-summary-value">${child.weekly.nutrition_entries} entries</p>
        </div>
        <div class="goals-summary-tile">
          <p class="goals-summary-label">Fitness (week)</p>
          <p class="goals-summary-value">${child.weekly.fitness_minutes} minutes</p>
        </div>
        <div class="goals-summary-tile">
          <p class="goals-summary-label">Screen Time (week)</p>
          <p class="goals-summary-value">${screenHours} hours <span class="goal-chip coming-soon">Coming Soon</span></p>
        </div>
      </div>

      <div class="goals-list" id="goals-list-${child.childid}">
        ${child.goals.length ? child.goals.map((goal) => renderGoalItem(goal, child.childid)).join('') : '<p class="goals-empty">No goals yet. Add one below.</p>'}
      </div>

      <form class="goal-create-form" data-goal-form="${child.childid}">
        <h4>Add Goal</h4>
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
        showGoalsMessage('Goal added.', 'success');
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
