const yearEl = document.getElementById("current-year");
const API_BASE = window.location.port === '8080' ? 'http://localhost:3000' : window.location.origin;

if (yearEl) {
  yearEl.textContent = String(new Date().getFullYear());
}

// Mobile menu toggle
document.addEventListener('DOMContentLoaded', function() {
  const menuToggle = document.querySelector('.mobile-menu-toggle');
  const navLinks = document.querySelector('.nav-links');

  if (menuToggle) {
    menuToggle.addEventListener('click', function() {
      menuToggle.classList.toggle('active');
      navLinks.classList.toggle('active');
    });

    // Close menu when a link is clicked
    const links = navLinks.querySelectorAll('.nav-link');
    links.forEach(link => {
      link.addEventListener('click', function() {
        menuToggle.classList.remove('active');
        navLinks.classList.remove('active');
      });
    });
  }
});

async function request(method, path, body) {
  const options = {
    method,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  };
  if (body) options.body = JSON.stringify(body);
  const res = await fetch(`${API_BASE}${path}`, options);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || 'Request failed');
    err.status = res.status;
    throw err;
  }
  return data;
}

function isProtectedPage() {
  const page = window.location.pathname.split('/').pop() || '';
  return ['diet.html', 'fitness.html', 'screentime.html', 'goals.html', 'profile.html'].includes(page);
}

function renderHomeWelcome(user) {
  const welcomeEl = document.getElementById('home-welcome');
  if (!welcomeEl || !user) return;
  const displayName = user.firstname || user.username;
  welcomeEl.textContent = `Welcome, ${displayName}!`;
  welcomeEl.style.display = 'block';
}

function renderFamilySnapshot(summary) {
  const section = document.getElementById('family-snapshot');
  const loginStreakEl = document.getElementById('login-streak-summary');
  const listEl = document.getElementById('children-streak-list');
  if (!section || !loginStreakEl || !listEl) return;

  section.style.display = 'block';
  loginStreakEl.textContent = `Login streak: ${summary.loginStreak.current} day(s) current, ${summary.loginStreak.longest} day(s) longest`;

  if (!Array.isArray(summary.children) || summary.children.length === 0) {
    listEl.innerHTML = '<p class="snapshot-subtitle">No child profiles yet. Add a child to begin tracking streaks.</p>';
    return;
  }

  listEl.innerHTML = summary.children.map((child) => {
    const name = `${child.firstname} ${child.lastname}`;
    const nutrition = child.streaks?.nutrition ?? { current: 0, longest: 0 };
    const fitness = child.streaks?.fitness ?? { current: 0, longest: 0 };
    const healthy = child.streaks?.healthyHabits ?? { current: 0, longest: 0 };
    return `
      <article class="child-streak-card">
        <h3>${name}</h3>
        <p class="child-streak-meta">Age ${child.age ?? '-'}</p>
        <div class="streak-grid">
          <div class="streak-item">
            <span class="streak-icon" aria-hidden="true">🔥</span>
            <div>
              <p class="streak-label">Nutrition</p>
              <p class="streak-value">${nutrition.current} current / ${nutrition.longest} longest</p>
            </div>
          </div>
          <div class="streak-item">
            <span class="streak-icon" aria-hidden="true">💪</span>
            <div>
              <p class="streak-label">Fitness</p>
              <p class="streak-value">${fitness.current} current / ${fitness.longest} longest</p>
            </div>
          </div>
          <div class="streak-item">
            <span class="streak-icon" aria-hidden="true">⭐</span>
            <div>
              <p class="streak-label">Healthy Habits</p>
              <p class="streak-value">${healthy.current} current / ${healthy.longest} longest</p>
            </div>
          </div>
        </div>
      </article>
    `;
  }).join('');
}

function setLoggedOutNav() {
  const navAuthLi = document.querySelector('.nav-auth');
  if (!navAuthLi) return;
  navAuthLi.innerHTML = '<a href="login.html" class="nav-link">Login</a>';
}

function setLoggedInNav(user) {
  const navAuthLi = document.querySelector('.nav-auth');
  if (!navAuthLi) return;

  navAuthLi.innerHTML = `
    <a href="profile.html" class="nav-link">Profile</a>
    <span class="nav-auth-divider">|</span>
    <a href="#" class="nav-link" data-logout="true">Logout</a>
  `;

  const logoutLink = navAuthLi.querySelector('[data-logout="true"]');
  if (logoutLink) logoutLink.onclick = async (event) => {
    event.preventDefault();
    try {
      await request('POST', '/auth/logout');
    } catch (_err) {
      // logout should still redirect even if session already expired
    }
    window.location.assign('index.html');
  };

  renderHomeWelcome(user);
}

document.addEventListener('DOMContentLoaded', async () => {
  const navAuth = document.querySelector('.nav-auth a');
  if (!navAuth) return;
  try {
    const user = await request('GET', '/auth/me');
    setLoggedInNav(user);
    if (document.getElementById('family-snapshot')) {
      const summary = await request('GET', '/streaks/summary');
      renderFamilySnapshot(summary);
    }
  } catch (err) {
    setLoggedOutNav();
    if (err?.status === 401 && isProtectedPage()) {
      window.location.assign('login.html');
    }
  }
});
