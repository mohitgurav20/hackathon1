// ═══════════════════════════════════════════════════════════
//  Results Client — Live results with Socket.io
// ═══════════════════════════════════════════════════════════

const API = window.location.origin + '/api';
const token = localStorage.getItem('token');
let pollId = null;
let timerInterval = null;

// ─── Logout ─────────────────────────────────────────────
document.getElementById('logoutBtn').addEventListener('click', () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = 'index.html';
});

// ─── Get poll ID from URL ────────────────────────────────
const params = new URLSearchParams(window.location.search);
pollId = params.get('id');

if (!pollId) {
  showState('errorState');
  document.getElementById('errorMessage').textContent = 'No poll ID provided.';
} else {
  loadResults();
  connectSocket();
}

// ─── Load Results ────────────────────────────────────────
async function loadResults() {
  try {
    const res = await fetch(`${API}/vote/results/${pollId}`);
    const data = await res.json();

    if (!res.ok) {
      showState('errorState');
      document.getElementById('errorMessage').textContent = data.error || 'Failed to load results.';
      return;
    }

    renderResults(data);
    showState('resultsState');
  } catch (err) {
    showState('errorState');
    document.getElementById('errorMessage').textContent = 'Network error.';
  }
}

// ─── Render Results ──────────────────────────────────────
function renderResults(data) {
  const { poll, results, totalVotes } = data;

  document.getElementById('pollTitle').textContent = poll.title;
  document.getElementById('pollDesc').textContent = poll.description || '';
  document.getElementById('totalVotes').textContent = totalVotes;
  document.getElementById('optionCount').textContent = results.length;

  const leading = results.reduce((max, r) => r.percentage > max ? r.percentage : max, 0);
  document.getElementById('leadingPct').textContent = `${leading}%`;

  // Share code/link
  const shareCode = new URLSearchParams(window.location.search).get('code') || '';
  document.getElementById('shareCode').textContent =
    `${window.location.origin}/vote.html?id=${pollId}`;

  // Timer
  if (poll.expiresAt) {
    document.getElementById('pollTimer').classList.remove('hidden');
    updateTimer(poll.expiresAt);
    timerInterval = setInterval(() => updateTimer(poll.expiresAt), 1000);
  }

  // Render bars
  const list = document.getElementById('resultsList');
  list.innerHTML = results.map(opt => `
    <div class="result-item">
      <div class="result-header">
        <span class="result-label">${escapeHtml(opt.text)}</span>
        <span class="result-count">${opt.votes} vote${opt.votes !== 1 ? 's' : ''}</span>
      </div>
      <div class="result-bar-bg">
        <div class="result-bar-fill" id="bar-${opt.id}" style="width: 0%"></div>
        <span class="result-percentage">${opt.percentage}%</span>
      </div>
    </div>
  `).join('');

  // Animate bars after paint
  requestAnimationFrame(() => {
    results.forEach(opt => {
      const bar = document.getElementById(`bar-${opt.id}`);
      if (bar) bar.style.width = `${opt.percentage}%`;
    });
  });
}

// ─── Socket.io Real-time Updates ────────────────────────
function connectSocket() {
  try {
    const socket = io(window.location.origin);

    socket.on('connect', () => {
      socket.emit('join-poll', pollId);
    });

    socket.on('vote-update', async () => {
      // Reload results on any new vote
      const res = await fetch(`${API}/vote/results/${pollId}`);
      const data = await res.json();
      if (res.ok) renderResults(data);
    });

    socket.on('disconnect', () => {
      console.log('Socket disconnected');
    });
  } catch (e) {
    console.warn('Socket.io not available, polling disabled.');
  }
}

// ─── Copy Share Link ────────────────────────────────────
document.getElementById('copyShareBtn').addEventListener('click', () => {
  const link = `${window.location.origin}/vote.html?id=${pollId}`;
  navigator.clipboard.writeText(link);
  showToast('Vote link copied!', 'success');
});

// ─── Timer ──────────────────────────────────────────────
function updateTimer(expiresAt) {
  const remaining = new Date(expiresAt).getTime() - Date.now();
  const el = document.getElementById('timerText');
  if (remaining <= 0) {
    el.textContent = 'Closed';
    clearInterval(timerInterval);
    return;
  }
  const hrs = Math.floor(remaining / 3600000);
  const mins = Math.floor((remaining % 3600000) / 60000);
  const secs = Math.floor((remaining % 60000) / 1000);
  el.textContent = hrs > 0 ? `${hrs}h ${mins}m left` : `${mins}m ${secs}s left`;
}

// ─── Helpers ────────────────────────────────────────────
function showState(stateId) {
  ['loadingState', 'errorState', 'resultsState'].forEach(id => {
    document.getElementById(id).classList.toggle('hidden', id !== stateId);
  });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function showToast(msg, type = 'info') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = msg;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
}
