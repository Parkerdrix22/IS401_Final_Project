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
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

function renderHomeWelcome(user) {
  const welcomeEl = document.getElementById('home-welcome');
  if (!welcomeEl || !user) return;
  welcomeEl.textContent = `Welcome, ${user.username}!`;
  welcomeEl.style.display = 'block';
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
  } catch (_err) {
    setLoggedOutNav();
  }
});
