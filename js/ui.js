const UI = (() => {
  function initSidebar() {
    const hamburger = document.getElementById('hamburger');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    if (!hamburger || !sidebar) return;
    function toggle() {
      sidebar.classList.toggle('open');
      overlay.classList.toggle('show');
    }
    hamburger.addEventListener('click', toggle);
    overlay.addEventListener('click', toggle);
  }

  function initLogout() {
    const btn = document.getElementById('logoutBtn');
    if (btn) btn.addEventListener('click', Auth.logout);
  }

  function setUser() {
    const user = Auth.getUser();
    const el = document.getElementById('sidebarUser');
    const av = document.getElementById('sidebarAvatar');
    if (el) el.textContent = user;
    if (av) av.textContent = user.charAt(0).toUpperCase();
  }

  function populateDropdown(id, items, placeholder) {
    const el = document.getElementById(id);
    if (!el) return;
    while (el.options.length > 1) el.remove(1);
    items.forEach(item => {
      const opt = document.createElement('option');
      opt.value = item;
      opt.textContent = item;
      el.appendChild(opt);
    });
    if (placeholder) el.options[0].textContent = placeholder;
  }

  function renderPagination(containerId, infoId, total, page, rowsPerPage, onPageChange) {
    const container = document.getElementById(containerId);
    const info = document.getElementById(infoId);
    if (!container) return;
    const totalPages = Math.ceil(total / rowsPerPage);
    const start = total === 0 ? 0 : (page - 1) * rowsPerPage + 1;
    const end = Math.min(page * rowsPerPage, total);
    if (info) info.textContent = `Showing ${start}–${end} of ${total}`;
    container.innerHTML = '';
    const prev = document.createElement('button');
    prev.innerHTML = '&lsaquo;';
    prev.disabled = page <= 1;
    prev.addEventListener('click', () => onPageChange(page - 1));
    container.appendChild(prev);
    const maxVisible = 5;
    let startP = Math.max(1, page - Math.floor(maxVisible / 2));
    let endP = Math.min(totalPages, startP + maxVisible - 1);
    if (endP - startP < maxVisible - 1) startP = Math.max(1, endP - maxVisible + 1);
    for (let i = startP; i <= endP; i++) {
      const btn = document.createElement('button');
      btn.textContent = i;
      if (i === page) btn.classList.add('active');
      btn.addEventListener('click', () => onPageChange(i));
      container.appendChild(btn);
    }
    const next = document.createElement('button');
    next.innerHTML = '&rsaquo;';
    next.disabled = page >= totalPages;
    next.addEventListener('click', () => onPageChange(page + 1));
    container.appendChild(next);
  }

  function showModal(id) {
    const m = document.getElementById(id);
    if (m) m.classList.add('show');
  }

  function hideModal(id) {
    const m = document.getElementById(id);
    if (m) m.classList.remove('show');
  }

  function statusBadge(status) {
    const cls = status === 'Paid' ? 'badge-success' : 'badge-warning';
    return `<span class="badge ${cls}">${Utils.sanitizeHTML(status)}</span>`;
  }

  function fileIcon(fileName) {
    if (!fileName) return '📎';
    const ext = fileName.split('.').pop().toLowerCase();
    const map = { pdf: '📄', jpg: '🖼️', jpeg: '🖼️', png: '🖼️', doc: '📝', docx: '📝', xls: '📊', xlsx: '📊', zip: '🗜️' };
    return map[ext] || '📎';
  }

  return { initSidebar, initLogout, setUser, populateDropdown, renderPagination, showModal, hideModal, statusBadge, fileIcon };
})();
