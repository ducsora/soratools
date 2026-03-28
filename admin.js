// ============================================================
// SoraTools – Admin Panel Logic (admin.js)
// CEO-only: manage users, assign roles, create/delete accounts
// ============================================================
'use strict';

// ── Auth guard: CEO only ──────────────────────────────────────
const __adminUser = AuthGuard.requireRole('ceo');
if (!__adminUser) throw new Error('CEO access required');

// ── Theme ─────────────────────────────────────────────────────
const themeToggle = document.getElementById('theme-toggle');
function initTheme() {
  if (!localStorage.getItem('theme')) localStorage.setItem('theme', 'dark');
  if (localStorage.getItem('theme') === 'dark') document.body.setAttribute('data-theme', 'dark');
  updateThemeIcon();
}
function updateThemeIcon() {
  const dark = document.body.getAttribute('data-theme') === 'dark';
  themeToggle.innerHTML = dark
    ? '<i class="fa-solid fa-sun"></i><span>Chế độ Sáng</span>'
    : '<i class="fa-solid fa-moon"></i><span>Chế độ Tối</span>';
}
themeToggle.addEventListener('click', () => {
  const dark = document.body.getAttribute('data-theme') === 'dark';
  dark ? document.body.removeAttribute('data-theme') : document.body.setAttribute('data-theme', 'dark');
  localStorage.setItem('theme', dark ? 'light' : 'dark');
  updateThemeIcon();
});

// ── Date ──────────────────────────────────────────────────────
document.getElementById('admin-date').textContent =
  new Date().toLocaleDateString('vi-VN', { weekday:'long', year:'numeric', month:'long', day:'numeric' });

// ── State ─────────────────────────────────────────────────────
let filterRole   = '';
let searchQuery  = '';
let editingUser  = null;

// ── Render stats ──────────────────────────────────────────────
function renderStats() {
  const users = AuthGuard.getAllUsers();
  document.getElementById('st-total').textContent  = users.length;
  document.getElementById('st-ceo').textContent    = users.filter(u => u.role === 'ceo').length;
  document.getElementById('st-leader').textContent = users.filter(u => u.role === 'leader').length;
  document.getElementById('st-staff').textContent  = users.filter(u => u.role === 'staff').length;
}

// ── Render user grid ──────────────────────────────────────────
function renderUsers() {
  renderStats();
  let users = AuthGuard.getAllUsers();
  const me  = __adminUser.username;

  // Sort: CEO first, then Leader, then Staff; alphabetically within same role
  const rankMap = { ceo: 0, leader: 1, staff: 2 };
  users.sort((a, b) => {
    const rd = (rankMap[a.role] || 2) - (rankMap[b.role] || 2);
    if (rd !== 0) return rd;
    return (a.name || a.username).localeCompare(b.name || b.username);
  });

  // Filter by role
  if (filterRole) users = users.filter(u => u.role === filterRole);

  // Filter by search
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    users = users.filter(u =>
      u.username.includes(q) || (u.name || '').toLowerCase().includes(q)
    );
  }

  const grid = document.getElementById('user-grid');
  if (!users.length) {
    grid.innerHTML = '<div class="empty-hint">Không tìm thấy tài khoản nào.</div>';
    return;
  }

  grid.innerHTML = users.map(u => {
    const meta    = SoraUI.roleMeta(u.role);
    const isSelf  = u.username === me;
    const joined  = new Date(u.createdAt).toLocaleDateString('vi-VN', { day:'numeric', month:'short', year:'numeric' });
    const canAct  = !isSelf;

    return `
    <div class="user-card role-card-${u.role}" data-username="${u.username}">
      <div class="uc-top">
        <div class="uc-avatar">${u.avatar || '🦊'}</div>
        <div style="flex:1;min-width:0">
          <div class="uc-name">${u.name || u.username} ${isSelf ? '<span class="self-badge">Bạn</span>' : ''}</div>
          <div class="uc-uname">@${u.username}</div>
        </div>
        <span class="role-badge role-${u.role}" style="background:${meta.bg};color:${meta.color};flex-shrink:0">
          <i class="fa-solid ${meta.icon}"></i> ${meta.label}
        </span>
      </div>
      <div class="uc-meta">
        <span><i class="fa-regular fa-calendar"></i> Tham gia ${joined}</span>
      </div>
      <div class="uc-perms">
        ${renderPermBadges(u.role)}
      </div>
      <div class="uc-actions">
        ${canAct ? `
          <button class="uc-btn uc-btn-edit" onclick="openEditModal('${u.username}')">
            <i class="fa-solid fa-user-gear"></i> Đổi vai trò
          </button>
          <button class="uc-btn uc-btn-pw" onclick="openPwModal('${u.username}')" title="Đổi mật khẩu">
            <i class="fa-solid fa-key"></i>
          </button>
          <button class="uc-btn uc-btn-del" onclick="confirmDelete('${u.username}', '${u.name || u.username}')">
            <i class="fa-solid fa-trash"></i>
          </button>
        ` : `
          <div class="uc-self-note"><i class="fa-solid fa-lock"></i> Không thể chỉnh sửa chính mình</div>
        `}
      </div>
    </div>`;
  }).join('');
}

// ── Permission badges per role ────────────────────────────────
const PERM_LABELS = {
  personal:  { icon:'fa-user',                  label:'Cá nhân' },
  chat:      { icon:'fa-robot',                 label:'Chat AI' },
  ads:       { icon:'fa-chart-column',          label:'Báo cáo Ads' },
  research:  { icon:'fa-magnifying-glass-chart',label:'Research' },
  designer:  { icon:'fa-pen-ruler',             label:'Post Designer' },
  admin:     { icon:'fa-shield-halved',         label:'Quản trị' },
};

function renderPermBadges(role) {
  const ROLE_PERMS_LOCAL = {
    ceo:    ['personal','chat','ads','research','designer','admin'],
    leader: ['personal','chat','ads','research','designer'],
    staff:  ['personal','chat'],
  };
  const allPerms = ['personal','chat','ads','research','designer','admin'];
  const has = new Set(ROLE_PERMS_LOCAL[role] || []);
  return allPerms.map(p => {
    const info = PERM_LABELS[p];
    const granted = has.has(p);
    return `<span class="perm-tag ${granted ? 'perm-on' : 'perm-off'}">
      <i class="fa-solid ${info.icon}"></i> ${info.label}
    </span>`;
  }).join('');
}

// ── Delete user ───────────────────────────────────────────────
window.confirmDelete = function (username, displayName) {
  if (!confirm(`⚠️ Xóa tài khoản "${displayName}" (@${username})?\n\nHành động này không thể hoàn tác.`)) return;
  const result = AuthGuard.deleteUser(username);
  if (result.ok) {
    showToast(`✅ Đã xóa tài khoản @${username}`, 'success');
    renderUsers();
  } else {
    showToast('❌ ' + result.msg, 'error');
  }
};

// ── Edit role modal ───────────────────────────────────────────
const editModal = document.getElementById('edit-modal');

window.openEditModal = function (username) {
  const users = AuthGuard.getAllUsers();
  const user  = users.find(u => u.username === username);
  if (!user) return;

  editingUser = user;
  hideMsg('edit-err');

  // Show user info
  const meta = SoraUI.roleMeta(user.role);
  document.getElementById('edit-user-info').innerHTML = `
    <div style="display:flex;align-items:center;gap:.75rem;padding:.75rem;background:var(--bg-color);border-radius:10px;border:1px solid var(--border-color)">
      <div style="font-size:2rem">${user.avatar || '🦊'}</div>
      <div>
        <div style="font-weight:700">${user.name || user.username}</div>
        <div style="color:var(--text-muted);font-size:.85rem">@${user.username}</div>
      </div>
      <span class="role-badge role-${user.role}" style="background:${meta.bg};color:${meta.color};margin-left:auto">
        <i class="fa-solid ${meta.icon}"></i> ${meta.label}
      </span>
    </div>`;

  // Select current role
  document.querySelectorAll('#edit-role-select .role-opt').forEach(opt => {
    opt.classList.toggle('selected', opt.dataset.role === user.role);
  });

  editModal.classList.add('active');
};

document.getElementById('close-edit-modal').addEventListener('click', () => editModal.classList.remove('active'));
document.getElementById('cancel-edit-btn').addEventListener('click', () => editModal.classList.remove('active'));
editModal.addEventListener('click', e => { if (e.target === editModal) editModal.classList.remove('active'); });

// Role option selection
document.querySelectorAll('#edit-role-select .role-opt').forEach(opt => {
  opt.addEventListener('click', () => {
    document.querySelectorAll('#edit-role-select .role-opt').forEach(x => x.classList.remove('selected'));
    opt.classList.add('selected');
  });
});

document.getElementById('save-edit-btn').addEventListener('click', () => {
  if (!editingUser) return;
  const selected = document.querySelector('#edit-role-select .role-opt.selected');
  if (!selected) return showErrMsg('edit-err', 'Vui lòng chọn vai trò.');
  const newRole = selected.dataset.role;
  const result  = AuthGuard.updateUserRole(editingUser.username, newRole);
  if (result.ok) {
    editModal.classList.remove('active');
    showToast(`✅ Đã cập nhật vai trò @${editingUser.username} → ${newRole.toUpperCase()}`, 'success');
    renderUsers();
  } else {
    showErrMsg('edit-err', result.msg);
  }
});

// ── Create account modal ──────────────────────────────────────
const createModal = document.getElementById('create-modal');

document.getElementById('open-create-btn').addEventListener('click', () => {
  document.getElementById('c-name').value = '';
  document.getElementById('c-user').value = '';
  document.getElementById('c-pw').value   = '';
  hideMsg('create-err'); hideMsg('create-ok');
  // Default: Leader
  document.querySelectorAll('#c-role-select .role-opt').forEach(opt => {
    opt.classList.toggle('selected', opt.dataset.role === 'leader');
  });
  createModal.classList.add('active');
});
document.getElementById('close-create-modal').addEventListener('click', () => createModal.classList.remove('active'));
createModal.addEventListener('click', e => { if (e.target === createModal) createModal.classList.remove('active'); });

// Role pick in create modal
document.querySelectorAll('#c-role-select .role-opt').forEach(opt => {
  opt.addEventListener('click', () => {
    document.querySelectorAll('#c-role-select .role-opt').forEach(x => x.classList.remove('selected'));
    opt.classList.add('selected');
  });
});

document.getElementById('confirm-create-btn').addEventListener('click', () => {
  const name = document.getElementById('c-name').value.trim();
  const user = document.getElementById('c-user').value.trim().toLowerCase();
  const pw   = document.getElementById('c-pw').value.trim();
  const role = document.querySelector('#c-role-select .role-opt.selected')?.dataset.role || 'staff';

  hideMsg('create-err'); hideMsg('create-ok');

  if (!name)                        return showErrMsg('create-err', 'Vui lòng nhập tên hiển thị.');
  if (!user || user.length < 3)     return showErrMsg('create-err', 'Tên đăng nhập tối thiểu 3 ký tự.');
  if (!/^[a-z0-9_.]+$/.test(user)) return showErrMsg('create-err', 'Chỉ gồm chữ thường, số, dấu . và _');
  if (pw.length < 6)                return showErrMsg('create-err', 'Mật khẩu tối thiểu 6 ký tự.');

  // Use hashFNV via auth.js
  const allUsers = {};
  AuthGuard.getAllUsers().forEach(u => { allUsers[u.username] = u; });
  if (allUsers[user]) return showErrMsg('create-err', 'Tên đăng nhập đã tồn tại.');

  // Inject directly into localStorage
  try {
    const stored = JSON.parse(localStorage.getItem('sora_auth_users') || '{}');
    // Compute hash — replicate hashFNV from auth.js
    function hashFNVLocal(str) {
      let h = 0x811c9dc5 >>> 0;
      for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
      const salted = str + '__soratools_salt_2026__';
      let h2 = 0x811c9dc5 >>> 0;
      for (let i = 0; i < salted.length; i++) { h2 ^= salted.charCodeAt(i); h2 = Math.imul(h2, 0x01000193) >>> 0; }
      return (h ^ h2).toString(16).padStart(8,'0') + (h2^(h>>>4)).toString(16).padStart(8,'0');
    }
    stored[user] = {
      username: user, name, avatar: '🦊', pwHash: hashFNVLocal(pw),
      createdAt: new Date().toISOString(), role,
    };
    localStorage.setItem('sora_auth_users', JSON.stringify(stored));
  } catch(e) {
    return showErrMsg('create-err', 'Lỗi lưu dữ liệu: ' + e.message);
  }

  const roleLabel = { ceo:'CEO 👑', leader:'Leader 💼', staff:'Staff 🧑' }[role];
  const el = document.getElementById('create-ok');
  el.querySelector('span').textContent = `✅ Tạo tài khoản "@${user}" thành công! Vai trò: ${roleLabel}`;
  el.classList.add('show');

  setTimeout(() => {
    createModal.classList.remove('active');
    renderUsers();
  }, 1800);
});

// ── Filter & Search ───────────────────────────────────────────
document.querySelectorAll('.rpill').forEach(pill => {
  pill.addEventListener('click', () => {
    filterRole = pill.dataset.r;
    document.querySelectorAll('.rpill').forEach(p => p.classList.toggle('active', p === pill));
    renderUsers();
  });
});

document.getElementById('search-user').addEventListener('input', function () {
  searchQuery = this.value.trim();
  renderUsers();
});

// ── Toast notification ────────────────────────────────────────
function showToast(msg, type = 'success') {
  let toast = document.getElementById('sora-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'sora-toast';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.className = 'sora-toast ' + type;
  toast.classList.add('show');
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.remove('show'), 3000);
}

function showErrMsg(id, msg) {
  const el = document.getElementById(id);
  if (!el) return;
  el.querySelector('span').textContent = msg;
  el.classList.add('show');
}
function hideMsg(id) {
  document.getElementById(id)?.classList.remove('show');
}

// ── Change Password modal ────────────────────────────────────
const pwModal = document.getElementById('pw-modal');
let pwTargetUser = null;

window.openPwModal = function (username) {
  const user = AuthGuard.getAllUsers().find(u => u.username === username);
  if (!user) return;
  pwTargetUser = user;
  hideMsg('pw-err'); hideMsg('pw-ok');
  document.getElementById('pw-new').value = '';
  document.getElementById('pw-confirm').value = '';
  updateStrengthBar('');

  const meta = SoraUI.roleMeta(user.role);
  document.getElementById('pw-user-info').innerHTML = `
    <div style="display:flex;align-items:center;gap:.75rem;padding:.75rem;background:var(--bg-color);border-radius:10px;border:1px solid var(--border-color)">
      <div style="font-size:2rem">${user.avatar || '🦊'}</div>
      <div>
        <div style="font-weight:700">${user.name || user.username}</div>
        <div style="color:var(--text-muted);font-size:.85rem">@${user.username}</div>
      </div>
      <span class="role-badge role-${user.role}" style="background:${meta.bg};color:${meta.color};margin-left:auto">
        <i class="fa-solid ${meta.icon}"></i> ${meta.label}
      </span>
    </div>`;

  pwModal.classList.add('active');
};

document.getElementById('close-pw-modal').addEventListener('click', () => pwModal.classList.remove('active'));
document.getElementById('cancel-pw-btn').addEventListener('click', () => pwModal.classList.remove('active'));
pwModal.addEventListener('click', e => { if (e.target === pwModal) pwModal.classList.remove('active'); });

// Password strength
function getPwStrength(pw) {
  if (!pw) return { score: 0, label: 'Chưa nhập', color: 'var(--border-color)' };
  let score = 0;
  if (pw.length >= 6)  score++;
  if (pw.length >= 10) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  const levels = [
    { label: 'Rất yếu', color: '#ef4444' },
    { label: 'Yếu',    color: '#f97316' },
    { label: 'Trung bình', color: '#eab308' },
    { label: 'Tốt',    color: '#22c55e' },
    { label: 'Mạnh',   color: '#10b981' },
    { label: 'Rất mạnh', color: '#06b6d4' },
  ];
  return { score, ...levels[Math.min(score, levels.length - 1)] };
}
function updateStrengthBar(pw) {
  const s = getPwStrength(pw);
  document.getElementById('pw-strength-bar').style.width   = pw ? (s.score / 5 * 100) + '%' : '0';
  document.getElementById('pw-strength-bar').style.background = s.color;
  document.getElementById('pw-strength-label').textContent = s.label;
  document.getElementById('pw-strength-label').style.color = s.color;
}
document.getElementById('pw-new').addEventListener('input', function() {
  updateStrengthBar(this.value);
  hideMsg('pw-err');
});
document.getElementById('pw-confirm').addEventListener('input', () => hideMsg('pw-err'));

// Toggle visibility
window.togglePwVis = function(inputId, btnId) {
  const input = document.getElementById(inputId);
  const btn   = document.getElementById(btnId);
  const show  = input.type === 'password';
  input.type  = show ? 'text' : 'password';
  btn.innerHTML = show ? '<i class="fa-solid fa-eye-slash"></i>' : '<i class="fa-solid fa-eye"></i>';
};

// Save password
document.getElementById('save-pw-btn').addEventListener('click', () => {
  hideMsg('pw-err'); hideMsg('pw-ok');
  if (!pwTargetUser) return;

  const newPw  = document.getElementById('pw-new').value.trim();
  const cfmPw  = document.getElementById('pw-confirm').value.trim();

  if (!newPw)            return showErrMsg('pw-err', 'Vui lòng nhập mật khẩu mới.');
  if (newPw.length < 6)  return showErrMsg('pw-err', 'Mật khẩu mới tối thiểu 6 ký tự.');
  if (newPw !== cfmPw)   return showErrMsg('pw-err', 'Xác nhận mật khẩu không khớp.');

  const result = AuthGuard.changePassword(pwTargetUser.username, newPw);
  if (result.ok) {
    const okEl = document.getElementById('pw-ok');
    okEl.querySelector('span').textContent = `✅ Đã cập nhật mật khẩu cho @${pwTargetUser.username}`;
    okEl.classList.add('show');
    document.getElementById('pw-new').value     = '';
    document.getElementById('pw-confirm').value = '';
    updateStrengthBar('');
    setTimeout(() => pwModal.classList.remove('active'), 1800);
    showToast(`✅ Đã đổi mật khẩu @${pwTargetUser.username}`, 'success');
  } else {
    showErrMsg('pw-err', result.msg);
  }
});

// ── Init ────────────────────────────────────────────
initTheme();
SoraUI.initSidebar();
renderUsers();
