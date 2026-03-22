(function () {
  const API_BASE = window.location.port === '8080' ? 'http://localhost:3000' : window.location.origin;

  const profileForm = document.getElementById('profile-form');
  const childForm = document.getElementById('child-form');
  const profileMsg = document.getElementById('profile-msg');
  const childMsg = document.getElementById('child-msg');
  const childrenList = document.getElementById('children-list');

  let currentUser = null;

  async function api(method, path, body) {
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

  function showMsg(el, text, type) {
    if (!el) return;
    el.textContent = text;
    el.className = `profile-msg ${type || ''}`.trim();
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
  }

  function setProfileForm(user) {
    document.getElementById('profile-username').value = user.username || '';
    document.getElementById('profile-firstname').value = user.firstname || '';
    document.getElementById('profile-lastname').value = user.lastname || '';
    document.getElementById('profile-email').value = user.email || '';
    document.getElementById('profile-password').value = '';
  }

  async function loadChildren() {
    if (!currentUser) return;
    const children = await api('GET', `/children?userid=${currentUser.userid}`);
    if (!childrenList) return;

    if (!children.length) {
      childrenList.innerHTML = '<li class="children-empty">No children added yet.</li>';
      return;
    }

    childrenList.innerHTML = children.map((child) => {
      const birthdate = child.birthdate ? new Date(child.birthdate).toLocaleDateString() : '—';
      return `<li class="children-item">
        <strong>${escapeHtml(child.firstname)} ${escapeHtml(child.lastname)}</strong>
        <span>Age ${child.age} • Birthdate ${escapeHtml(birthdate)}</span>
      </li>`;
    }).join('');
  }

  profileForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!currentUser) return;

    const payload = {
      username: document.getElementById('profile-username').value.trim(),
      firstname: document.getElementById('profile-firstname').value.trim(),
      lastname: document.getElementById('profile-lastname').value.trim(),
      email: document.getElementById('profile-email').value.trim(),
      userrole: currentUser.userrole || 'parent',
    };

    const newPassword = document.getElementById('profile-password').value;
    if (newPassword.trim()) payload.password = newPassword;

    try {
      const updated = await api('PUT', `/users/${currentUser.userid}`, payload);
      currentUser = { ...currentUser, ...updated };
      setProfileForm(currentUser);
      showMsg(profileMsg, 'Profile updated successfully.', 'success');
    } catch (err) {
      showMsg(profileMsg, err.message || 'Failed to update profile.', 'error');
    }
  });

  childForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!currentUser) return;

    const payload = {
      userid: currentUser.userid,
      firstname: document.getElementById('child-firstname').value.trim(),
      lastname: document.getElementById('child-lastname').value.trim(),
      birthdate: document.getElementById('child-birthdate').value,
      age: Number(document.getElementById('child-age').value),
      height: document.getElementById('child-height').value ? Number(document.getElementById('child-height').value) : null,
      weight: document.getElementById('child-weight').value ? Number(document.getElementById('child-weight').value) : null,
    };

    try {
      await api('POST', '/children', payload);
      childForm.reset();
      showMsg(childMsg, 'Child added successfully.', 'success');
      await loadChildren();
    } catch (err) {
      showMsg(childMsg, err.message || 'Failed to add child.', 'error');
    }
  });

  async function init() {
    try {
      currentUser = await api('GET', '/auth/me');
    } catch (_err) {
      window.location.assign('login.html');
      return;
    }

    setProfileForm(currentUser);
    await loadChildren();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
