const API_BASE = window.location.port === '8080'
  ? 'http://localhost:3000'
  : window.location.origin;

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
  const roleSelect = document.getElementById('register-role');
  const childrenSection = document.getElementById('children-section');
  const childrenList = document.getElementById('children-list');
  const addChildBtn = document.getElementById('add-child-btn');

  function createChildCard() {
    const count = childrenList.children.length + 1;
    const card = document.createElement('div');
    card.className = 'child-card';
    card.innerHTML = `
      <div class="child-card-header">
        <span class="child-card-title">Child ${count}</span>
        <button type="button" class="child-remove-btn" aria-label="Remove child ${count}">Remove</button>
      </div>
      <div class="child-field-row">
        <div>
          <label>First name</label>
          <input class="child-firstname" type="text" placeholder="First name" autocomplete="off">
        </div>
        <div>
          <label>Last name</label>
          <input class="child-lastname" type="text" placeholder="Last name" autocomplete="off">
        </div>
      </div>
      <label>Date of birth</label>
      <input class="child-birthdate" type="date">
      <div class="child-field-row">
        <div>
          <label>Height <span class="field-optional">(in, optional)</span></label>
          <input class="child-height" type="number" step="0.1" min="0" placeholder="e.g. 48">
        </div>
        <div>
          <label>Weight <span class="field-optional">(lbs, optional)</span></label>
          <input class="child-weight" type="number" step="0.1" min="0" placeholder="e.g. 70">
        </div>
      </div>
    `;
    card.querySelector('.child-remove-btn').addEventListener('click', () => {
      card.remove();
      renumberChildCards();
    });
    return card;
  }

  function renumberChildCards() {
    Array.from(childrenList.children).forEach((card, i) => {
      const title = card.querySelector('.child-card-title');
      if (title) title.textContent = `Child ${i + 1}`;
    });
  }

  function getChildrenData() {
    return Array.from(childrenList.children).map((card) => ({
      firstname: card.querySelector('.child-firstname')?.value.trim() || '',
      lastname:  card.querySelector('.child-lastname')?.value.trim()  || '',
      birthdate: card.querySelector('.child-birthdate')?.value        || '',
      height:    card.querySelector('.child-height')?.value  ? parseFloat(card.querySelector('.child-height').value)  : null,
      weight:    card.querySelector('.child-weight')?.value  ? parseFloat(card.querySelector('.child-weight').value)  : null,
    }));
  }

  function toggleChildrenSection() {
    if (!roleSelect || !childrenSection) return;
    if (roleSelect.value === 'parent') {
      childrenSection.classList.add('visible');
    } else {
      childrenSection.classList.remove('visible');
    }
  }

  if (roleSelect) {
    roleSelect.addEventListener('change', toggleChildrenSection);
    toggleChildrenSection();
  }

  if (addChildBtn) {
    addChildBtn.addEventListener('click', () => {
      childrenList.appendChild(createChildCard());
    });
  }

  registerForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const formData = new FormData(registerForm);
    const userrole = String(formData.get('userrole') || 'parent');
    const payload = {
      username:  String(formData.get('username')  || '').trim(),
      firstname: String(formData.get('firstname') || '').trim(),
      lastname:  String(formData.get('lastname')  || '').trim(),
      email:     String(formData.get('email')     || '').trim(),
      password:  String(formData.get('password')  || ''),
      userrole,
    };

    if (!payload.username || !payload.firstname || !payload.lastname || !payload.email || !payload.password) {
      showMessage('register-message', 'All fields are required.', 'error');
      return;
    }

    if (userrole === 'parent' && childrenList && childrenList.children.length > 0) {
      const children = getChildrenData();
      const hasIncomplete = children.some(
        (c) => (c.firstname || c.lastname || c.birthdate) && (!c.firstname || !c.lastname || !c.birthdate)
      );
      if (hasIncomplete) {
        showMessage('register-message', 'Please complete all required child fields (first name, last name, date of birth).', 'error');
        return;
      }
      const validChildren = children.filter((c) => c.firstname && c.lastname && c.birthdate);
      if (validChildren.length > 0) payload.children = validChildren;
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
