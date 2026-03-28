// ============================================================
// SoraTools – Authentication + RBAC System (auth.js)
// Pure client-side, multi-user, localStorage-based
// Roles: ceo > leader > staff
// ============================================================
'use strict';

// ── Keys ─────────────────────────────────────────────────────
const AUTH_USERS_KEY   = 'sora_auth_users';    // { [username]: UserRecord }
const AUTH_SESSION_KEY = 'sora_auth_session';  // current logged-in username

// ── Role Definitions ─────────────────────────────────────────
const ROLE_PERMS = {
  ceo:    new Set(['personal', 'chat', 'ads', 'meta', 'research', 'designer', 'admin']),
  leader: new Set(['personal', 'chat', 'ads', 'meta', 'research', 'designer']),
  staff:  new Set(['personal', 'chat']),
};

const ROLE_META = {
  ceo:    { label: 'CEO',    icon: 'fa-crown',    color: '#facc15', bg: 'rgba(250,204,21,0.15)',  order: 0 },
  leader: { label: 'Leader', icon: 'fa-user-tie', color: '#818cf8', bg: 'rgba(129,140,248,0.15)', order: 1 },
  staff:  { label: 'Staff',  icon: 'fa-user',     color: '#94a3b8', bg: 'rgba(148,163,184,0.12)', order: 2 },
};

// Role hierarchy (higher = more power)
const ROLE_RANK = { ceo: 3, leader: 2, staff: 1 };

// ── User data key factory (namespaced per user) ───────────────
function userKey(username, suffix) {
  return `sora_u_${username}_${suffix}`;
}

// ── Simple hash (FNV-1a double, hex) — NOT cryptographic ─────
function hashFNV(str) {
  let h = 0x811c9dc5 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  const salted = str + '__soratools_salt_2026__';
  let h2 = 0x811c9dc5 >>> 0;
  for (let i = 0; i < salted.length; i++) {
    h2 ^= salted.charCodeAt(i);
    h2 = Math.imul(h2, 0x01000193) >>> 0;
  }
  return (h ^ h2).toString(16).padStart(8, '0') +
         (h2 ^ (h >>> 4)).toString(16).padStart(8, '0');
}

// ── Storage helpers ───────────────────────────────────────────
function getUsers() {
  try { return JSON.parse(localStorage.getItem(AUTH_USERS_KEY) || '{}'); } catch { return {}; }
}
function saveUsers(users) {
  localStorage.setItem(AUTH_USERS_KEY, JSON.stringify(users));
}

// ── Role migration (old → new names) ─────────────────────────
// Runs once on load: 'admin' → 'ceo', 'user' → 'staff'
(function migrateRoles() {
  try {
    const users = getUsers();
    const ROLE_MAP = { admin: 'ceo', user: 'staff' };
    let changed = false;
    for (const u of Object.values(users)) {
      if (ROLE_MAP[u.role]) {
        u.role = ROLE_MAP[u.role];
        changed = true;
      }
      // If role is still unrecognized, default to staff
      if (!ROLE_META[u.role]) {
        u.role = 'staff';
        changed = true;
      }
    }
    if (changed) saveUsers(users);
  } catch (e) { /* silent */ }
})();

// ── Session ───────────────────────────────────────────────────
function getSession() {
  return sessionStorage.getItem(AUTH_SESSION_KEY) || localStorage.getItem(AUTH_SESSION_KEY + '_persist');
}
function setSession(username, persist = true) {
  sessionStorage.setItem(AUTH_SESSION_KEY, username);
  if (persist) localStorage.setItem(AUTH_SESSION_KEY + '_persist', username);
}
function clearSession() {
  sessionStorage.removeItem(AUTH_SESSION_KEY);
  localStorage.removeItem(AUTH_SESSION_KEY + '_persist');
}

// ── AuthGuard ─────────────────────────────────────────────────
window.AuthGuard = {
  require(redirectTo = 'auth.html') {
    const u = getSession();
    if (!u) { window.location.replace(redirectTo); return null; }
    const users = getUsers();
    if (!users[u]) { clearSession(); window.location.replace(redirectTo); return null; }
    return users[u];
  },

  // Require a specific minimum role — redirect to personal.html if insufficient
  requireRole(minRole, redirectTo = 'personal.html') {
    const user = this.require();
    if (!user) return null;
    const userRank = ROLE_RANK[user.role] || 0;
    const minRank  = ROLE_RANK[minRole]   || 99;
    if (userRank < minRank) {
      window.location.replace(redirectTo);
      return null;
    }
    return user;
  },

  currentUser() {
    const u = getSession();
    if (!u) return null;
    return getUsers()[u] || null;
  },

  can(perm) {
    const user = this.currentUser();
    if (!user) return false;
    const perms = ROLE_PERMS[user.role] || ROLE_PERMS.staff;
    return perms.has(perm);
  },

  role() {
    return this.currentUser()?.role || 'staff';
  },

  logout() {
    clearSession();
    window.location.replace('auth.html');
  },

  storageKey(suffix) {
    const u = getSession();
    if (!u) return `sora_u_guest_${suffix}`;
    return userKey(u, suffix);
  },

  // Admin: update a user's role (CEO only, cannot demote self)
  updateUserRole(targetUsername, newRole) {
    const me = this.currentUser();
    if (!me || me.role !== 'ceo') return { ok: false, msg: 'Không có quyền.' };
    if (targetUsername === me.username) return { ok: false, msg: 'Không thể tự thay đổi vai trò của mình.' };
    if (!ROLE_META[newRole]) return { ok: false, msg: 'Vai trò không hợp lệ.' };
    const users = getUsers();
    if (!users[targetUsername]) return { ok: false, msg: 'Người dùng không tồn tại.' };
    users[targetUsername].role = newRole;
    saveUsers(users);
    return { ok: true };
  },

  // Admin: delete a user (CEO only, cannot delete self)
  deleteUser(targetUsername) {
    const me = this.currentUser();
    if (!me || me.role !== 'ceo') return { ok: false, msg: 'Không có quyền.' };
    if (targetUsername === me.username) return { ok: false, msg: 'Không thể xóa tài khoản của mình.' };
    const users = getUsers();
    if (!users[targetUsername]) return { ok: false, msg: 'Người dùng không tồn tại.' };
    delete users[targetUsername];
    saveUsers(users);
    return { ok: true };
  },

  // Admin: change any user's password (CEO only, or self with old password)
  changePassword(targetUsername, newPassword, oldPassword = null) {
    const me = this.currentUser();
    if (!me) return { ok: false, msg: 'Chưa đăng nhập.' };
    if (newPassword.length < 6) return { ok: false, msg: 'Mật khẩu mới tối thiểu 6 ký tự.' };

    const users = getUsers();
    const target = users[targetUsername];
    if (!target) return { ok: false, msg: 'Người dùng không tồn tại.' };

    // If changing own password: require old password confirmation
    if (targetUsername === me.username) {
      if (!oldPassword) return { ok: false, msg: 'Vui lòng nhập mật khẩu cũ.' };
      if (hashFNV(oldPassword) !== target.pwHash) return { ok: false, msg: 'Mật khẩu cũ không đúng.' };
    } else {
      // Changing another user's password: must be CEO
      if (me.role !== 'ceo') return { ok: false, msg: 'Chỉ CEO mới có thể đổi mật khẩu người khác.' };
    }

    target.pwHash = hashFNV(newPassword);
    saveUsers(users);
    return { ok: true };
  },

  getAllUsers() {
    return Object.values(getUsers());
  },

};

// ── SoraUI – Sidebar & Role Rendering ────────────────────────
window.SoraUI = {
  roleMeta(role) {
    return ROLE_META[role] || ROLE_META.staff;
  },

  roleBadgeHTML(role) {
    const m = this.roleMeta(role);
    return `<span class="role-badge role-${role}" style="background:${m.bg};color:${m.color}">
              <i class="fa-solid ${m.icon}"></i> ${m.label}
            </span>`;
  },

  /**
   * Call once per page load to:
   * 1. Filter nav items by current user's role permissions
   * 2. Populate the user widget
   * 3. Wire up dropdown toggle
   */
  initSidebar() {
    const user = AuthGuard.currentUser();
    if (!user) return;

    const role  = user.role || 'staff';
    const perms = ROLE_PERMS[role] || ROLE_PERMS.staff;

    // 1. Filter nav items — show locked style instead of hiding
    // Role display names for tooltip
    const REQUIRED_ROLE_LABEL = {
      ads: 'Leader', research: 'Leader', designer: 'Leader', admin: 'CEO',
    };

    document.querySelectorAll('.nav-item[data-perm]').forEach(el => {
      const perm = el.dataset.perm;
      if (perm === 'admin') return; // Admin handled separately below

      if (!perms.has(perm)) {
        // Show as locked: grayed out, not clickable, lock icon appended
        el.classList.add('nav-item-locked');
        el.removeAttribute('href');
        el.style.cursor = 'not-allowed';
        el.title = `Cần quyền ${REQUIRED_ROLE_LABEL[perm] || 'cao hơn'} để sử dụng`;

        // Append lock badge if not already added
        if (!el.querySelector('.nav-lock')) {
          const lock = document.createElement('span');
          lock.className = 'nav-lock';
          lock.innerHTML = '<i class="fa-solid fa-lock"></i>';
          el.appendChild(lock);
        }
      }
    });

    // Hide "Quản trị" section completely if user has no admin perm
    if (!perms.has('admin')) {
      const adminLabel = document.getElementById('admin-nav-section');
      if (adminLabel) {
        adminLabel.style.display = 'none';
        const adminNav = adminLabel.nextElementSibling;
        if (adminNav) adminNav.style.display = 'none';
      }
    }

    // 2. User widget
    const avatarEl   = document.getElementById('sidebar-avatar');
    const nameEl     = document.getElementById('sidebar-name');
    const usernameEl = document.getElementById('sidebar-username');
    const badgeEl    = document.getElementById('sidebar-role-badge');

    if (avatarEl)   avatarEl.textContent   = user.avatar || '🦊';
    if (nameEl)     nameEl.textContent     = user.name   || user.username;
    if (usernameEl) usernameEl.textContent = '@' + user.username;
    if (badgeEl)    badgeEl.innerHTML      = this.roleBadgeHTML(role);

    // 3. Dropdown toggle
    const toggle   = document.getElementById('user-menu-toggle');
    const dropdown = document.getElementById('user-dropdown');
    if (toggle && dropdown) {
      toggle.addEventListener('click', e => {
        e.stopPropagation();
        dropdown.classList.toggle('open');
      });
      document.addEventListener('click', () => dropdown.classList.remove('open'));
      dropdown.addEventListener('click', e => e.stopPropagation());
    }
  },
};

// ── Register ──────────────────────────────────────────────────
window.doRegister = function () {
  const name   = document.getElementById('reg-name').value.trim();
  const user   = document.getElementById('reg-user').value.trim().toLowerCase();
  const pw     = document.getElementById('reg-pw').value;
  const pw2    = document.getElementById('reg-pw2').value;
  const avatar = document.querySelector('#avatar-pick .avatar-opt.selected')?.dataset.av || '🦊';

  hideMsg('reg-err'); hideMsg('reg-ok');

  if (!name)                        return showErr('reg-err', 'Vui lòng nhập tên hiển thị.');
  if (!user || user.length < 3)     return showErr('reg-err', 'Tên đăng nhập tối thiểu 3 ký tự.');
  if (!/^[a-z0-9_.]+$/.test(user)) return showErr('reg-err', 'Tên đăng nhập chỉ gồm chữ thường, số, dấu . và _');
  if (pw.length < 6)                return showErr('reg-err', 'Mật khẩu tối thiểu 6 ký tự.');
  if (pw !== pw2)                   return showErr('reg-err', 'Xác nhận mật khẩu không khớp.');

  const users = getUsers();
  if (users[user])                  return showErr('reg-err', 'Tên đăng nhập đã tồn tại.');

  // First registered user = CEO, subsequent users = Staff
  const isFirstUser = Object.keys(users).length === 0;
  users[user] = {
    username:  user,
    name,
    avatar,
    pwHash:    hashFNV(pw),
    createdAt: new Date().toISOString(),
    role:      isFirstUser ? 'ceo' : 'staff',
  };
  saveUsers(users);

  const roleLabel = isFirstUser ? '👑 CEO' : '🧑 Staff';
  showOk('reg-ok', `✅ Tạo tài khoản "${user}" thành công! Vai trò: ${roleLabel}`);
  setBtnLoading('reg-btn', true);

  setTimeout(() => {
    switchTab('login');
    document.getElementById('login-user').value = user;
    document.getElementById('login-pw').focus();
    setBtnLoading('reg-btn', false);
  }, 1600);
};

// ── Login ─────────────────────────────────────────────────────
window.doLogin = function () {
  const user = document.getElementById('login-user').value.trim().toLowerCase();
  const pw   = document.getElementById('login-pw').value;

  hideMsg('login-err');
  if (!user || !pw) return showErr('login-err', 'Vui lòng nhập đầy đủ thông tin.');

  const users = getUsers();
  const rec   = users[user];

  if (!rec || rec.pwHash !== hashFNV(pw)) {
    return showErr('login-err', 'Tên đăng nhập hoặc mật khẩu không đúng.');
  }

  setBtnLoading('login-btn', true);
  setSession(user, true);

  // Redirect based on role
  setTimeout(() => {
    window.location.replace('personal.html');
  }, 600);
};

// ── UI helpers ────────────────────────────────────────────────
window.switchTab = function (tab) {
  ['login', 'register'].forEach(t => {
    document.getElementById('tab-' + t)?.classList.toggle('active', t === tab);
    document.getElementById('panel-' + t)?.classList.toggle('active', t === tab);
  });
};

window.togglePw = function (inputId, iconId) {
  const inp  = document.getElementById(inputId);
  const icon = document.getElementById(iconId);
  if (!inp) return;
  if (inp.type === 'password') {
    inp.type = 'text';
    if (icon) icon.className = 'fa-solid fa-eye-slash toggle-pw';
  } else {
    inp.type = 'password';
    if (icon) icon.className = 'fa-solid fa-eye toggle-pw';
  }
};

window.pickAvatar = function (el) {
  document.querySelectorAll('.avatar-opt').forEach(x => x.classList.remove('selected'));
  el.classList.add('selected');
};

window.checkStrength = function (pw) {
  const bar   = document.getElementById('pw-strength');
  const fill  = document.getElementById('strength-fill');
  const label = document.getElementById('strength-label');
  if (!bar) return;
  bar.classList.toggle('show', pw.length > 0);
  if (!pw) return;

  let score = 0;
  if (pw.length >= 6)           score++;
  if (pw.length >= 10)          score++;
  if (/[A-Z]/.test(pw))         score++;
  if (/[0-9]/.test(pw))         score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;

  const levels = [
    { pct:'20%', color:'#ef4444', text:'Rất yếu' },
    { pct:'40%', color:'#f97316', text:'Yếu' },
    { pct:'60%', color:'#facc15', text:'Trung bình' },
    { pct:'80%', color:'#84cc16', text:'Mạnh' },
    { pct:'100%',color:'#22c55e', text:'Rất mạnh 💪' },
  ];
  const lv = levels[Math.min(score, 4)];
  fill.style.width = lv.pct;
  fill.style.background = lv.color;
  label.textContent = lv.text;
  label.style.color = lv.color;
};

function showErr(id, msg) {
  const el = document.getElementById(id);
  if (!el) return;
  el.querySelector('span').textContent = msg;
  el.classList.add('show');
}
function showOk(id, msg) {
  const el = document.getElementById(id);
  if (!el) return;
  el.querySelector('span').textContent = msg;
  el.classList.add('show');
}
function hideMsg(id) {
  document.getElementById(id)?.classList.remove('show');
}
function setBtnLoading(id, loading) {
  const btn = document.getElementById(id);
  if (!btn) return;
  btn.disabled = loading;
  if (loading) {
    btn.dataset.orig = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang xử lý...';
  } else {
    btn.innerHTML = btn.dataset.orig || btn.innerHTML;
  }
}

// ── Auto-redirect if already logged in ───────────────────────
(function () {
  if (window.location.pathname.includes('auth.html')) {
    const sess = getSession();
    if (sess && getUsers()[sess]) {
      window.location.replace('personal.html');
    }
  }
})();
