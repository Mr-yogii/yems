(function () {
  if (!Auth.requireAuth()) return;
  UI.initSidebar();
  UI.initLogout();
  UI.setUser();

  let allExpenses = [];
  let filtered = [];
  let currentPage = 1;
  let rowsPerPage = CONFIG.DEFAULT_ROWS_PER_PAGE;
  let currentSort = 'date_desc';
  let searchTerm = '';

  CONFIG.FOUNDERS.forEach(f => { const o = document.createElement('option'); o.value = f; o.textContent = f; document.getElementById('filterFounder').appendChild(o); });
  CONFIG.EMPLOYEES.forEach(f => { const o = document.createElement('option'); o.value = f; o.textContent = f; document.getElementById('filterEmployee').appendChild(o); });
  CONFIG.CATEGORIES.forEach(f => { const o = document.createElement('option'); o.value = f; o.textContent = f; document.getElementById('filterCategory').appendChild(o); });

  async function loadExpenses() {
    try {
      const res = await API.getExpenses();
      allExpenses = (res && res.data) ? res.data : [];
      applyAll();
    } catch {
      Utils.showToast('Failed to load expenses.', 'error');
    }
  }

  function applyAll() {
    let data = [...allExpenses];
    const from = document.getElementById('filterDateFrom').value;
    const to = document.getElementById('filterDateTo').value;
    const founder = document.getElementById('filterFounder').value;
    const employee = document.getElementById('filterEmployee').value;
    const category = document.getElementById('filterCategory').value;
    const status = document.getElementById('filterStatus').value;
    if (from) data = data.filter(e => e.Date >= from);
    if (to) data = data.filter(e => e.Date <= to);
    if (founder) data = data.filter(e => e.Founder === founder);
    if (employee) data = data.filter(e => e.Employee === employee);
    if (category) data = data.filter(e => e.Category === category);
    if (status) data = data.filter(e => e.PaymentStatus === status);
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      data = data.filter(e => [e.Purpose, e.Category, e.Founder, e.Employee, e.Remarks].some(v => v && v.toLowerCase().includes(s)));
    }
    data = sortData(data, currentSort);
    filtered = data;
    currentPage = 1;
    updateSummary();
    renderTable();
  }

  function sortData(data, sort) {
    return data.slice().sort((a, b) => {
      if (sort === 'date_desc') return (b.Date || '').localeCompare(a.Date || '');
      if (sort === 'date_asc') return (a.Date || '').localeCompare(b.Date || '');
      if (sort === 'amount_desc') return (parseFloat(b.Amount) || 0) - (parseFloat(a.Amount) || 0);
      if (sort === 'amount_asc') return (parseFloat(a.Amount) || 0) - (parseFloat(b.Amount) || 0);
      if (sort === 'founder_asc') return (a.Founder || '').localeCompare(b.Founder || '');
      if (sort === 'employee_asc') return (a.Employee || '').localeCompare(b.Employee || '');
      if (sort === 'status_asc') return (a.PaymentStatus || '').localeCompare(b.PaymentStatus || '');
      return 0;
    });
  }

  function updateSummary() {
    document.getElementById('sumCount').textContent = filtered.length;
    document.getElementById('sumTotal').textContent = Utils.formatCurrency(Utils.sumBy(filtered, 'Amount'));
    document.getElementById('sumPaid').textContent = Utils.formatCurrency(Utils.sumBy(filtered.filter(e => e.PaymentStatus === 'Paid'), 'Amount'));
    document.getElementById('sumPending').textContent = Utils.formatCurrency(Utils.sumBy(filtered.filter(e => e.PaymentStatus !== 'Paid'), 'Amount'));
  }

  function renderTable() {
    const tbody = document.getElementById('reportTableBody');
    if (!tbody) return;
    if (filtered.length === 0) { tbody.innerHTML = `<tr><td colspan="10"><div class="empty-state"><span class="material-symbols-outlined">inbox</span><p>No matching records found.</p></div></td></tr>`; document.getElementById('reportPagination').innerHTML = ''; document.getElementById('reportPagInfo').textContent = ''; return; }
    const start = (currentPage - 1) * rowsPerPage;
    const page = filtered.slice(start, start + rowsPerPage);
    tbody.innerHTML = page.map(e => `
      <tr>
        <td data-label="Expense ID"><span style="font-family:monospace;font-size:12px">${Utils.sanitizeHTML(e.ExpenseID || '')}</span></td>
        <td data-label="Date">${Utils.formatDate(e.Date)}</td>
        <td data-label="Purpose" class="truncate" style="max-width:140px" title="${Utils.sanitizeHTML(e.Purpose || '')}">${Utils.sanitizeHTML(e.Purpose || '')}</td>
        <td data-label="Category">${Utils.sanitizeHTML(e.Category || '')}</td>
        <td data-label="Founder">${Utils.sanitizeHTML(e.Founder || '')}</td>
        <td data-label="Employee">${Utils.sanitizeHTML(e.Employee || '')}</td>
        <td data-label="Amount" style="font-weight:600">${Utils.formatCurrency(e.Amount)}</td>
        <td data-label="Status">${UI.statusBadge(e.PaymentStatus || 'Pending')}</td>
        <td data-label="Payment Date">${Utils.formatDate(e.PaymentDate)}</td>
        <td data-label="Remarks" class="truncate" style="max-width:120px">${Utils.sanitizeHTML(e.Remarks || '')}</td>
      </tr>`).join('');
    UI.renderPagination('reportPagination', 'reportPagInfo', filtered.length, currentPage, rowsPerPage, p => { currentPage = p; renderTable(); });
  }

  document.getElementById('applyFiltersBtn').addEventListener('click', applyAll);
  document.getElementById('clearFiltersBtn').addEventListener('click', () => {
    ['filterDateFrom', 'filterDateTo'].forEach(id => document.getElementById(id).value = '');
    ['filterFounder', 'filterEmployee', 'filterCategory', 'filterStatus'].forEach(id => document.getElementById(id).value = '');
    document.getElementById('reportSearch').value = '';
    searchTerm = '';
    applyAll();
  });
  document.getElementById('reportSearch').addEventListener('input', Utils.debounce(function () { searchTerm = this.value.trim(); applyAll(); }, 300));
  document.getElementById('reportSort').addEventListener('change', function () { currentSort = this.value; applyAll(); });
  document.getElementById('reportRowsPerPage').addEventListener('change', function () { rowsPerPage = parseInt(this.value); currentPage = 1; renderTable(); });
  document.getElementById('refreshBtn')?.addEventListener('click', loadExpenses);

  function getExportData() {
    return filtered.map(e => ({
      'Expense ID': e.ExpenseID || '', Date: e.Date || '', Purpose: e.Purpose || '',
      Category: e.Category || '', Founder: e.Founder || '', Employee: e.Employee || '',
      Amount: parseFloat(e.Amount) || 0, 'Payment Status': e.PaymentStatus || '',
      'Payment Date': e.PaymentDate || '', Remarks: e.Remarks || '',
      'File Name': e.FileName || '', 'Drive URL': e.DriveURL || ''
    }));
  }

  document.getElementById('exportExcel').addEventListener('click', () => {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(getExportData()), 'Expenses');
    XLSX.writeFile(wb, `Expenses_${Utils.todayISO()}.xlsx`);
  });

  document.getElementById('exportCSV').addEventListener('click', () => {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(getExportData()), 'Expenses');
    XLSX.writeFile(wb, `Expenses_${Utils.todayISO()}.csv`);
  });

  document.getElementById('exportPDF').addEventListener('click', async () => {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFontSize(14);
    doc.text('Expense Report - ' + CONFIG.ORG_NAME, 14, 14);
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString('en-IN')}`, 14, 22);
    const headers = [['ID', 'Date', 'Purpose', 'Category', 'Employee', 'Amount', 'Status']];
    const rows = filtered.map(e => [e.ExpenseID || '', e.Date || '', e.Purpose || '', e.Category || '', e.Employee || '', Utils.formatCurrency(e.Amount), e.PaymentStatus || '']);
    let y = 30;
    headers[0].forEach((h, i) => { doc.setFont(undefined, 'bold'); doc.text(h, 14 + i * 40, y); });
    y += 6;
    rows.forEach(row => {
      row.forEach((cell, i) => { doc.setFont(undefined, 'normal'); doc.text(String(cell).substring(0, 18), 14 + i * 40, y); });
      y += 6;
      if (y > 190) { doc.addPage(); y = 14; }
    });
    doc.save(`Expenses_${Utils.todayISO()}.pdf`);
  });

  document.getElementById('printReport').addEventListener('click', () => window.print());

  loadExpenses();
})();
