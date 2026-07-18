(function () {
  if (!Auth.requireAuth()) return;
  UI.initSidebar();
  UI.initLogout();
  UI.setUser();

  const dateEl = document.getElementById('dashDate');
  if (dateEl) dateEl.textContent = new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  let charts = {};
  let refreshTimer = null;

  function destroyCharts() {
    Object.values(charts).forEach(c => { if (c) c.destroy(); });
    charts = {};
  }

  function buildMonthlyChart(expenses) {
    const ctx = document.getElementById('chartMonthly');
    if (!ctx) return;
    const monthMap = {};
    expenses.forEach(e => {
      if (!e.Date) return;
      const d = Utils.parseDate(e.Date);
      if (!d) return;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthMap[key] = (monthMap[key] || 0) + (parseFloat(e.Amount) || 0);
    });
    const sorted = Object.keys(monthMap).sort().slice(-12);
    const labels = sorted.map(k => {
      const [y, m] = k.split('-');
      return `${Utils.getMonthName(parseInt(m) - 1)} ${y}`;
    });
    const data = sorted.map(k => monthMap[k]);
    charts.monthly = new Chart(ctx, {
      type: 'bar',
      data: { labels, datasets: [{ label: 'Expenses (₹)', data, backgroundColor: CONFIG.CHART_COLORS.primary, borderRadius: 6 }] },
      options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { callback: v => '₹' + v.toLocaleString('en-IN') } } } }
    });
  }

  function buildDoughnutChart(canvasId, label, map) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;
    const labels = Object.keys(map);
    const data = labels.map(k => map[k]);
    charts[canvasId] = new Chart(ctx, {
      type: 'doughnut',
      data: { labels, datasets: [{ data, backgroundColor: CONFIG.CHART_COLORS.palette, borderWidth: 2, borderColor: '#fff' }] },
      options: { responsive: true, plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } } } }
    });
  }

  function buildBarChart(canvasId, label, map) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;
    const labels = Object.keys(map);
    const data = labels.map(k => map[k]);
    charts[canvasId] = new Chart(ctx, {
      type: 'bar',
      data: { labels, datasets: [{ label: 'Amount (₹)', data, backgroundColor: CONFIG.CHART_COLORS.palette.slice(0, labels.length), borderRadius: 5 }] },
      options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { callback: v => '₹' + v.toLocaleString('en-IN') } } } }
    });
  }

  function buildStatusChart(paid, pending) {
    const ctx = document.getElementById('chartStatus');
    if (!ctx) return;
    charts.status = new Chart(ctx, {
      type: 'pie',
      data: {
        labels: ['Paid', 'Pending'],
        datasets: [{ data: [paid, pending], backgroundColor: [CONFIG.CHART_COLORS.success, CONFIG.CHART_COLORS.warning], borderWidth: 2, borderColor: '#fff' }]
      },
      options: { responsive: true, plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } } } }
    });
  }

  function renderRecentTable(expenses) {
    const tbody = document.getElementById('recentTableBody');
    if (!tbody) return;
    const recent = expenses.slice(-10).reverse();
    if (recent.length === 0) { tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state"><span class="material-symbols-outlined">inbox</span><p>No expenses found.</p></div></td></tr>`; return; }
    tbody.innerHTML = recent.map(e => `
      <tr>
        <td data-label="Date">${Utils.formatDate(e.Date)}</td>
        <td data-label="Expense ID"><span style="font-family:monospace;font-size:12px">${Utils.sanitizeHTML(e.ExpenseID || '')}</span></td>
        <td data-label="Purpose" class="truncate" style="max-width:160px">${Utils.sanitizeHTML(e.Purpose || '')}</td>
        <td data-label="Category">${Utils.sanitizeHTML(e.Category || '')}</td>
        <td data-label="Employee">${Utils.sanitizeHTML(e.Employee || '')}</td>
        <td data-label="Amount" style="font-weight:600">${Utils.formatCurrency(e.Amount)}</td>
        <td data-label="Status">${UI.statusBadge(e.PaymentStatus || 'Pending')}</td>
      </tr>`).join('');
  }

  function renderLatestFiles(expenses) {
    const box = document.getElementById('latestFiles');
    if (!box) return;
    const files = expenses.filter(e => e.FileName).slice(-8).reverse();
    if (files.length === 0) { box.innerHTML = `<div class="empty-state"><span class="material-symbols-outlined">folder_open</span><p>No files uploaded yet.</p></div>`; return; }
    box.innerHTML = files.map(e => `
      <div class="file-row">
        <div class="file-row-icon">${UI.fileIcon(e.FileName)}</div>
        <div style="flex:1;overflow:hidden">
          <div class="file-row-name" title="${Utils.sanitizeHTML(e.FileName || '')}">${Utils.sanitizeHTML(e.FileName || '')}</div>
          <div class="file-row-meta">${Utils.formatDate(e.Date)} &mdash; ${Utils.sanitizeHTML(e.Employee || '')}</div>
        </div>
        ${e.DriveURL ? `<a class="file-row-link" href="${Utils.sanitizeHTML(e.DriveURL)}" target="_blank" rel="noopener">Open</a>` : ''}
      </div>`).join('');
  }

  function updateStats(expenses) {
    const total = Utils.sumBy(expenses, 'Amount');
    const todayExp = expenses.filter(e => Utils.isToday(e.Date));
    const monthExp = expenses.filter(e => Utils.isCurrentMonth(e.Date));
    const paid = expenses.filter(e => e.PaymentStatus === 'Paid');
    const pending = expenses.filter(e => e.PaymentStatus !== 'Paid');
    document.getElementById('statTotal').textContent = Utils.formatCurrency(total);
    document.getElementById('statTotalCount').textContent = `${expenses.length} records`;
    document.getElementById('statToday').textContent = Utils.formatCurrency(Utils.sumBy(todayExp, 'Amount'));
    document.getElementById('statTodayCount').textContent = `${todayExp.length} today`;
    document.getElementById('statMonth').textContent = Utils.formatCurrency(Utils.sumBy(monthExp, 'Amount'));
    document.getElementById('statMonthCount').textContent = `${monthExp.length} this month`;
    document.getElementById('statPaid').textContent = Utils.formatCurrency(Utils.sumBy(paid, 'Amount'));
    document.getElementById('statPaidCount').textContent = `${paid.length} paid`;
    document.getElementById('statPending').textContent = Utils.formatCurrency(Utils.sumBy(pending, 'Amount'));
    document.getElementById('statPendingCount').textContent = `${pending.length} pending`;
    document.getElementById('statTransactions').textContent = expenses.length;
  }

  async function loadDashboard() {
    try {
      const res = await API.getExpenses();
      const expenses = (res && res.data) ? res.data : [];
      destroyCharts();
      updateStats(expenses);
      renderRecentTable(expenses);
      renderLatestFiles(expenses);
      const catMap = {};
      expenses.forEach(e => { if (e.Category) catMap[e.Category] = (catMap[e.Category] || 0) + (parseFloat(e.Amount) || 0); });
      const founderMap = {};
      expenses.forEach(e => { if (e.Founder) founderMap[e.Founder] = (founderMap[e.Founder] || 0) + (parseFloat(e.Amount) || 0); });
      const empMap = {};
      expenses.forEach(e => { if (e.Employee) empMap[e.Employee] = (empMap[e.Employee] || 0) + (parseFloat(e.Amount) || 0); });
      const paidAmt = Utils.sumBy(expenses.filter(e => e.PaymentStatus === 'Paid'), 'Amount');
      const pendingAmt = Utils.sumBy(expenses.filter(e => e.PaymentStatus !== 'Paid'), 'Amount');
      buildMonthlyChart(expenses);
      buildDoughnutChart('chartCategory', 'Category', catMap);
      buildBarChart('chartFounder', 'Founder', founderMap);
      buildBarChart('chartEmployee', 'Employee', empMap);
      buildStatusChart(paidAmt, pendingAmt);
    } catch (err) {
      Utils.showToast('Failed to load dashboard data. Check your Apps Script URL in config.js.', 'error');
    }
  }

  document.getElementById('refreshBtn')?.addEventListener('click', () => { loadDashboard(); Utils.showToast('Dashboard refreshed.', 'info'); });

  loadDashboard();
  refreshTimer = setInterval(loadDashboard, CONFIG.DASHBOARD_REFRESH_INTERVAL);
  window.addEventListener('beforeunload', () => clearInterval(refreshTimer));
})();
