const API_BASE = (() => {
  const { protocol, hostname } = window.location;
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return `${protocol}//${hostname}:3000`;
  }
  return window.location.origin;
})();

function redirectToHome() {
  // Prefer app root; fallback keeps compatibility when opened as static files.
  window.location.assign('/');
  setTimeout(() => {
    window.location.assign('index.html');
  }, 300);
}

function showMessage(id, text, type) {
  const el = document.getElementById(id);
  if (!el) return;

  el.textContent = text;
  el.classList.remove('success', 'error');
  if (type) el.classList.add(type);
}

async function request(path, payload) {
  const response = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload)
  });

  let data = {};
  try {
    data = await response.json();
  } catch (_error) {
    data = {};
  }

  if (!response.ok) {
    const errorMessage = data.error || 'Request failed. Please try again.';
    throw new Error(errorMessage);
  }

  return data;
}

const loginForm = document.getElementById('login-form');
if (loginForm) {
  loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const formData = new FormData(loginForm);
    const payload = {
      username: String(formData.get('username') || '').trim(),
      password: String(formData.get('password') || '')
    };

    if (!payload.username || !payload.password) {
      showMessage('login-message', 'Username and password are required.', 'error');
      return;
    }

    showMessage('login-message', 'Signing in...', '');

    try {
      await request('/auth/login', payload);
      showMessage('login-message', 'Login successful. Redirecting...', 'success');
      setTimeout(redirectToHome, 500);
    } catch (error) {
      showMessage('login-message', error.message, 'error');
    }
  });
}

const registerForm = document.getElementById('register-form');
if (registerForm) {
  registerForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const formData = new FormData(registerForm);
    const payload = {
      username: String(formData.get('username') || '').trim(),
      firstname: String(formData.get('firstname') || '').trim(),
      lastname: String(formData.get('lastname') || '').trim(),
      email: String(formData.get('email') || '').trim(),
      password: String(formData.get('password') || '')
    };

    if (!payload.username || !payload.firstname || !payload.lastname || !payload.email || !payload.password) {
      showMessage('register-message', 'All fields are required.', 'error');
      return;
    }

    showMessage('register-message', 'Creating account...', '');

    try {
      await request('/auth/register', payload);
      showMessage('register-message', 'Account created. You can now sign in.', 'success');
      setTimeout(() => {
        window.location.href = 'login.html';
      }, 900);
    } catch (error) {
      showMessage('register-message', error.message, 'error');
    }
  });
}
