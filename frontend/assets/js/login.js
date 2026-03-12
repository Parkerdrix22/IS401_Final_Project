document.addEventListener('DOMContentLoaded', function () {
  const form = document.getElementById('login-form');
  const identifierInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const identifierError = document.getElementById('email-error');
  const passwordError = document.getElementById('password-error');

  function clearErrors() {
    identifierError.textContent = '';
    passwordError.textContent = '';
    identifierInput.setAttribute('aria-invalid', 'false');
    passwordInput.setAttribute('aria-invalid', 'false');
  }

  function showError(element, message) {
    element.textContent = message;
    element.previousElementSibling?.setAttribute('aria-invalid', 'true');
  }

  async function postLogin(payload) {
    const endpoints = [`${window.location.protocol}//${window.location.hostname}:3000/auth/login`];
    let lastErr = null;

    for (const endpoint of endpoints) {
      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(payload),
        });

        if (res.status === 404) continue;

        const data = await res.json().catch(function () { return {}; });
        return { ok: res.ok, status: res.status, data };
      } catch (err) {
        lastErr = err;
      }
    }

    throw lastErr || new Error('Unable to reach login API.');
  }

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    clearErrors();

    let isValid = true;

    const identifier = identifierInput.value.trim();
    if (!identifier) {
      showError(identifierError, 'Please enter your username or email.');
      isValid = false;
    }

    const password = passwordInput.value;
    if (!password) {
      showError(passwordError, 'Please enter your password.');
      isValid = false;
    }

    if (!isValid) return;

    try {
      const result = await postLogin({ identifier, password });

      if (!result.ok) {
        const msg = result.data?.error || 'Invalid credentials.';
        showError(passwordError, msg);
        return;
      }

      sessionStorage.setItem('healthyHabitsLoggedIn', 'true');
      sessionStorage.setItem('healthyHabitsUser', result.data?.username || identifier);
      window.location.href = '/';
    } catch (err) {
      showError(passwordError, 'Could not connect to the server. Please try again.');
    }
  });
});
