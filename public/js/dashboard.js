// ═══════════════════════════════════════════════════════════
//  Dashboard Client — Poll management
// ═══════════════════════════════════════════════════════════

const API = window.location.origin + '/api';
const token = localStorage.getItem('token');
const user = JSON.parse(localStorage.getItem('user') || 'null');

// ─── Auth Guard ─────────────────────────────────────────
if (!token) {
  window.location.href = 'index.html';
}

// ─── Set nav user ───────────────────────────────────────
if (user) {
  document.getElementById('navUser').textContent = user.email;
}

// ─── Logout ─────────────────────────────────────────────
document.getElementById('logoutBtn').addEventListener('click', () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = 'index.html';
});

// ─── Modal Controls ─────────────────────────────────────
const createModal = document.getElementById('createModal');
const shareModal = document.getElementById('shareModal');

document.getElementById('openCreateModal').addEventListener('click', () => {
  createModal.classList.remove('hidden');
});

document.getElementById('cancelCreate').addEventListener('click', () => {
  createModal.classList.add('hidden');
});

document.getElementById('closeShareModal').addEventListener('click', () => {
  shareModal.classList.add('hidden');
});

// Close modals on overlay click
[createModal, shareModal].forEach(modal => {
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.classList.add('hidden');
  });
});

// ─── Dynamic Options ────────────────────────────────────
const optionsContainer = document.getElementById('optionsContainer');

document.getElementById('addOptionBtn').addEventListener('click', () => {
  const count = optionsContainer.children.length;
  if (count >= 10) {
    showToast('Maximum 10 options allowed.', 'error');
    return;
  }

  const row = document.createElement('div');
  row.className = 'input-row mb-16';
  row.innerHTML = `
    <input type="text" class="form-input option-input" placeholder="Option ${count + 1}" required maxlength="100">
    <button type="button" class="btn btn-icon btn-secondary remove-option-btn" title="Remove">✕</button>
  `;
  optionsContainer.appendChild(row);
  updateRemoveButtons();
});

optionsContainer.addEventListener('click', (e) => {
  if (e.target.classList.contains('remove-option-btn')) {
    e.target.parentElement.remove();
    updateRemoveButtons();
  }
});

function updateRemoveButtons() {
  const rows = optionsContainer.querySelectorAll('.input-row');
  rows.forEach((row, i) => {
    const btn = row.querySelector('.remove-option-btn');
    if (rows.length > 2) {
      btn.classList.remove('hidden');
    } else {
      btn.classList.add('hidden');
    }
    // Update placeholder
    row.querySelector('.option-input').placeholder = `Option ${i + 1}`;
  });
}

// ─── Create Poll ────────────────────────────────────────
document.getElementById('createPollForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = document.getElementById('submitPoll');

  const title = document.getElementById('pollTitle').value.trim();
  const description = document.getElementById('pollDesc').value.trim();
  const expiresIn = parseInt(document.getElementById('pollExpiry').value);

  const optionInputs = document.querySelectorAll('.option-input');
  const options = Array.from(optionInputs)
    .map(inp => inp.value.trim())
    .filter(v => v.length > 0);

  if (options.length < 2) {
    showToast('At least 2 options are required.', 'error');
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Creating...';

  try {
    const res = await fetch(`${API}/polls`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ title, description, options, expiresIn })
    });

    const data = await res.json();

    if (!res.ok) {
      showToast(data.error || 'Failed to create poll.', 'error');
      btn.disabled = false;
      btn.textContent = 'Create Poll';
      return;
    }

    // Show share modal
    createModal.classList.add('hidden');
    document.getElementById('shareCodeText').textContent = data.poll.shareCode;
    const voteLink = `${window.location.origin}/vote.html?code=${data.poll.shareCode}`;
    document.getElementById('shareLinkText').textContent = voteLink;
    document.getElementById('shareViewResults').href = `results.html?id=${data.poll.id}`;
    shareModal.classList.remove('hidden');

    // Reset form
    document.getElementById('createPollForm').reset();
    // Reset options to 2
    optionsContainer.innerHTML = `
      <div class="input-row mb-16">
        <input type="text" class="form-input option-input" placeholder="Option 1" required maxlength="100">
        <button type="button" class="btn btn-icon btn-secondary remove-option-btn hidden" title="Remove">✕</button>
      </div>
      <div class="input-row mb-16">
        <input type="text" class="form-input option-input" placeholder="Option 2" required maxlength="100">
        <button type="button" class="btn btn-icon btn-secondary remove-option-btn hidden" title="Remove">✕</button>
      </div>
    `;

    btn.disabled = false;
    btn.textContent = 'Create Poll';

    // Refresh poll list
    loadPolls();

  } catch (err) {
    showToast('Network error. Please try again.', 'error');
    btn.disabled = false;
    btn.textContent = 'Create Poll';
  }
});

// ─── Copy Buttons ───────────────────────────────────────
document.getElementById('copyCodeBtn').addEventListener('click', () => {
  navigator.clipboard.writeText(document.getElementById('shareCodeText').textContent);
  showToast('Share code copied!', 'success');
});

document.getElementById('copyLinkBtn').addEventListener('click', () => {
  navigator.clipboard.writeText(document.getElementById('shareLinkText').textContent);
  showToast('Vote link copied!', 'success');
});

// ─── Load Polls ─────────────────────────────────────────
async function loadPolls() {
  try {
    const res = await fetch(`${API}/polls/user/my-polls`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const data = await res.json();

    if (!res.ok) {
      showToast(data.error || 'Failed to load polls.', 'error');
      return;
    }

    const grid = document.getElementById('pollsGrid');
    const empty = document.getElementById('emptyState');

    if (data.polls.length === 0) {
      grid.innerHTML = '';
      empty.classList.remove('hidden');
      return;
    }

    empty.classList.add('hidden');
    grid.innerHTML = data.polls.map(poll => {
      const isExpired = poll.expiresAt && new Date() > new Date(poll.expiresAt);
      const statusClass = isExpired ? 'badge-expired' : 'badge-active';
      const statusText = isExpired ? 'Expired' : 'Active';
      const timeAgo = getTimeAgo(poll.createdAt);

      return `
        <div class="poll-card" onclick="openPoll('${poll._id}', '${poll.shareCode}')">
          <div class="poll-card-title">${escapeHtml(poll.title)}</div>
          <div class="poll-card-desc">${escapeHtml(poll.description || 'No description')}</div>
          <div class="poll-card-meta">
            <div style="display: flex; gap: 8px;">
              <span class="poll-badge ${statusClass}">${statusText}</span>
              <span class="poll-badge badge-options">${poll.options.length} options</span>
            </div>
            <span>${timeAgo}</span>
          </div>
        </div>
      `;
    }).join('');

  } catch (err) {
    showToast('Network error loading polls.', 'error');
  }
}

function openPoll(id, shareCode) {
  window.location.href = `results.html?id=${id}`;
}

// ─── Helpers ────────────────────────────────────────────
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function getTimeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function showToast(msg, type = 'info') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = msg;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
}

// ─── Init ───────────────────────────────────────────────
loadPolls();
