// ═══════════════════════════════════════════════════════════
//  Auth Client — Login / Register logic
// ═══════════════════════════════════════════════════════════

const API = window.location.origin + '/api';

// ─── Check if already logged in ─────────────────────────
(function checkAuth() {
  const token = localStorage.getItem('token');
  if (token) {
    window.location.href = 'dashboard.html';
  }
})();

// ─── Toggle Login / Register views ──────────────────────
document.getElementById('showRegister').addEventListener('click', (e) => {
  e.preventDefault();
  document.getElementById('loginView').classList.add('hidden');
  document.getElementById('registerView').classList.remove('hidden');
});

document.getElementById('showLogin').addEventListener('click', (e) => {
  e.preventDefault();
  document.getElementById('registerView').classList.add('hidden');
  document.getElementById('loginView').classList.remove('hidden');
});

// ─── Login ──────────────────────────────────────────────
document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = document.getElementById('loginBtn');
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;

  btn.disabled = true;
  btn.textContent = 'Signing in...';

  try {
    const res = await fetch(`${API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();

    if (!res.ok) {
      showToast(data.error || 'Login failed', 'error');
      btn.disabled = false;
      btn.textContent = 'Sign In';
      return;
    }

    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    showToast('Login successful!', 'success');

    setTimeout(() => {
      window.location.href = 'dashboard.html';
    }, 500);

  } catch (err) {
    showToast('Network error. Please try again.', 'error');
    btn.disabled = false;
    btn.textContent = 'Sign In';
  }
});

// ─── Register ───────────────────────────────────────────
document.getElementById('registerForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = document.getElementById('registerBtn');
  const email = document.getElementById('regEmail').value.trim();
  const password = document.getElementById('regPassword').value;
  const confirm = document.getElementById('regConfirm').value;

  if (password !== confirm) {
    showToast('Passwords do not match.', 'error');
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Creating account...';

  try {
    const res = await fetch(`${API}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();

    if (!res.ok) {
      showToast(data.error || 'Registration failed', 'error');
      btn.disabled = false;
      btn.textContent = 'Create Account';
      return;
    }

    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    showToast('Account created!', 'success');

    setTimeout(() => {
      window.location.href = 'dashboard.html';
    }, 500);

  } catch (err) {
    showToast('Network error. Please try again.', 'error');
    btn.disabled = false;
    btn.textContent = 'Create Account';
  }
});

// ─── Toast Helper ───────────────────────────────────────
function showToast(msg, type = 'info') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = msg;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
}
