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
  let statusFilter = '';
  let pendingDeleteId = null;
  let editSelectedFile = null;

  UI.populateDropdown('editCategory', CONFIG.CATEGORIES, 'Select category');
  UI.populateDropdown('editFounder', CONFIG.FOUNDERS, 'Select founder');
  UI.populateDropdown('editEmployee', CONFIG.EMPLOYEES, 'Select employee');

  async function loadExpenses() {
    try {
      const res = await API.getExpenses();
      allExpenses = (res && res.data) ? res.data : [];
      applyAll();
    } catch (err) {
      Utils.showToast('Load failed: ' + (err.message || 'Unknown error'), 'error');
      document.getElementById('manageTableBody').innerHTML = `<tr><td colspan="10"><div class="empty-state"><span class="material-symbols-outlined">error</span><p>Could not load data: ${err.message}</p></div></td></tr>`;
    }
  }

  function applyAll() {
    let data = [...allExpenses];
    if (statusFilter) data = data.filter(e => e.PaymentStatus === statusFilter);
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      data = data.filter(e => [e.Purpose, e.Category, e.Founder, e.Employee, e.Remarks, e.ExpenseID].some(v => v && v.toLowerCase().includes(s)));
    }
    data = sortData(data, currentSort);
    filtered = data;
    currentPage = 1;
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

  function renderTable() {
    const tbody = document.getElementById('manageTableBody');
    if (!tbody) return;
    if (filtered.length === 0) { tbody.innerHTML = `<tr><td colspan="10"><div class="empty-state"><span class="material-symbols-outlined">inbox</span><p>No records found.</p></div></td></tr>`; document.getElementById('managePagination').innerHTML = ''; return; }
    const start = (currentPage - 1) * rowsPerPage;
    const page = filtered.slice(start, start + rowsPerPage);
    tbody.innerHTML = page.map(e => {
      const hasFile = e.FileName && e.DriveURL;
      return `<tr>
        <td data-label="Expense ID"><span style="font-family:monospace;font-size:12px">${Utils.sanitizeHTML(e.ExpenseID || '')}</span></td>
        <td data-label="Date">${Utils.formatDate(e.Date)}</td>
        <td data-label="Purpose" class="truncate" style="max-width:130px" title="${Utils.sanitizeHTML(e.Purpose || '')}">${Utils.sanitizeHTML(e.Purpose || '')}</td>
        <td data-label="Category">${Utils.sanitizeHTML(e.Category || '')}</td>
        <td data-label="Founder">${Utils.sanitizeHTML(e.Founder || '')}</td>
        <td data-label="Employee">${Utils.sanitizeHTML(e.Employee || '')}</td>
        <td data-label="Amount" style="font-weight:600">${Utils.formatCurrency(e.Amount)}</td>
        <td data-label="Status">${UI.statusBadge(e.PaymentStatus || 'Pending')}</td>
        <td data-label="Attachment">${hasFile ? `<a href="${Utils.sanitizeHTML(e.DriveURL)}" target="_blank" rel="noopener" style="font-size:12px;color:var(--primary)">${UI.fileIcon(e.FileName)} ${Utils.sanitizeHTML(e.FileName).substring(0,20)}</a>` : '<span style="color:var(--gray-300);font-size:12px">None</span>'}</td>
        <td data-label="Actions">
          <div class="td-actions" style="justify-content:center">
            <button class="action-btn view" data-id="${Utils.sanitizeHTML(e.ExpenseID)}" title="View"><span class="material-symbols-outlined">visibility</span></button>
            <button class="action-btn edit" data-id="${Utils.sanitizeHTML(e.ExpenseID)}" title="Edit"><span class="material-symbols-outlined">edit</span></button>
            <button class="action-btn delete" data-id="${Utils.sanitizeHTML(e.ExpenseID)}" title="Delete"><span class="material-symbols-outlined">delete</span></button>
            ${hasFile ? `<a class="action-btn download" href="${Utils.sanitizeHTML(e.DriveURL)}" target="_blank" rel="noopener" title="Download"><span class="material-symbols-outlined">download</span></a>` : ''}
          </div>
        </td>
      </tr>`;
    }).join('');
    UI.renderPagination('managePagination', 'managePagInfo', filtered.length, currentPage, rowsPerPage, p => { currentPage = p; renderTable(); });
    bindRowActions();
  }

  function bindRowActions() {
    document.querySelectorAll('.action-btn.view').forEach(btn => btn.addEventListener('click', () => openView(btn.dataset.id)));
    document.querySelectorAll('.action-btn.edit').forEach(btn => btn.addEventListener('click', () => openEdit(btn.dataset.id)));
    document.querySelectorAll('.action-btn.delete').forEach(btn => btn.addEventListener('click', () => openDelete(btn.dataset.id)));
  }

  function findById(id) {
    return allExpenses.find(e => e.ExpenseID === id);
  }

  function openView(id) {
    const e = findById(id);
    if (!e) return;
    document.getElementById('viewModalBody').innerHTML = `
      <div class="details-grid">
        ${row('Expense ID', e.ExpenseID)}${row('Date', Utils.formatDate(e.Date))}
        ${row('Purpose', e.Purpose)}${row('Category', e.Category)}
        ${row('Founder', e.Founder)}${row('Employee', e.Employee)}
        ${row('Amount', Utils.formatCurrency(e.Amount))}${row('Payment Status', UI.statusBadge(e.PaymentStatus))}
        ${row('Payment Date', Utils.formatDate(e.PaymentDate))}${row('Remarks', e.Remarks || '-')}
        ${row('Description', e.Description || '-', true)}
        ${e.FileName ? row('Attachment', `<a href="${Utils.sanitizeHTML(e.DriveURL)}" target="_blank" style="color:var(--primary)">${UI.fileIcon(e.FileName)} ${Utils.sanitizeHTML(e.FileName)}</a>`, true) : ''}
      </div>`;
    UI.showModal('viewModal');
  }

  function row(label, value, full) {
    return `<div${full ? ' style="grid-column:1/-1"' : ''}><div style="font-size:11px;font-weight:600;text-transform:uppercase;color:var(--gray-400);letter-spacing:.04em;margin-bottom:2px">${label}</div><div style="font-size:14px;color:var(--gray-800)">${value || '-'}</div></div>`;
  }

  function openEdit(id) {
    const e = findById(id);
    if (!e) return;
    editSelectedFile = null;
    document.getElementById('editExpenseId').value = e.ExpenseID;
    document.getElementById('editDate').value = e.Date || '';
    document.getElementById('editAmount').value = e.Amount || '';
    document.getElementById('editPurpose').value = e.Purpose || '';
    document.getElementById('editDescription').value = e.Description || '';
    document.getElementById('editCategory').value = e.Category || '';
    document.getElementById('editFounder').value = e.Founder || '';
    document.getElementById('editEmployee').value = e.Employee || '';
    document.getElementById('editStatus').value = e.PaymentStatus || 'Pending';
    document.getElementById('editPayDate').value = e.PaymentDate || '';
    document.getElementById('editRemarks').value = e.Remarks || '';
    document.getElementById('currentFileInfo').innerHTML = e.FileName ? `Current: <a href="${Utils.sanitizeHTML(e.DriveURL)}" target="_blank" style="color:var(--primary)">${UI.fileIcon(e.FileName)} ${Utils.sanitizeHTML(e.FileName)}</a>` : 'No attachment.';
    document.getElementById('editFilePreviewBox').classList.add('d-none');
    document.getElementById('editFileDropZone').style.display = '';
    document.querySelectorAll('#editExpenseForm .form-error').forEach(el => el.classList.remove('show'));
    UI.showModal('editModal');
  }

  function openDelete(id) {
    pendingDeleteId = id;
    document.getElementById('deleteExpIdLabel').textContent = id;
    UI.showModal('deleteModal');
  }

  const editDropZone = document.getElementById('editFileDropZone');
  const editFileInput = document.getElementById('editFile');
  editDropZone.addEventListener('click', () => editFileInput.click());
  editDropZone.addEventListener('dragover', e => { e.preventDefault(); editDropZone.classList.add('drag-over'); });
  editDropZone.addEventListener('dragleave', () => editDropZone.classList.remove('drag-over'));
  editDropZone.addEventListener('drop', e => {
    e.preventDefault(); editDropZone.classList.remove('drag-over');
    const file = e.dataTransfer.files[0]; if (!file) return;
    const err = Utils.validateFile(file); if (err) { Utils.showToast(err, 'error'); return; }
    showEditFilePreview(file);
  });
  editFileInput.addEventListener('change', function () {
    if (!this.files[0]) return;
    const err = Utils.validateFile(this.files[0]); if (err) { Utils.showToast(err, 'error'); this.value = ''; return; }
    showEditFilePreview(this.files[0]);
  });

  function showEditFilePreview(file) {
    editSelectedFile = file;
    document.getElementById('editFileName').textContent = file.name;
    document.getElementById('editFileSize').textContent = (file.size / 1024 / 1024).toFixed(2) + ' MB';
    document.getElementById('editFileIcon').textContent = UI.fileIcon(file.name);
    document.getElementById('editFilePreviewBox').classList.remove('d-none');
    editDropZone.style.display = 'none';
  }

  document.getElementById('editRemoveFile').addEventListener('click', () => {
    editSelectedFile = null; editFileInput.value = '';
    document.getElementById('editFilePreviewBox').classList.add('d-none');
    editDropZone.style.display = '';
  });

  document.getElementById('closeEditModal').addEventListener('click', () => UI.hideModal('editModal'));
  document.getElementById('cancelEditBtn').addEventListener('click', () => UI.hideModal('editModal'));
  document.getElementById('closeViewModal').addEventListener('click', () => UI.hideModal('viewModal'));
  document.getElementById('closeViewBtn').addEventListener('click', () => UI.hideModal('viewModal'));
  document.getElementById('closeDeleteModal').addEventListener('click', () => UI.hideModal('deleteModal'));
  document.getElementById('cancelDeleteBtn').addEventListener('click', () => UI.hideModal('deleteModal'));

  document.getElementById('saveEditBtn').addEventListener('click', async () => {
    const btn = document.getElementById('saveEditBtn');
    let valid = true;
    [['editDate','editDateError'],['editPurpose','editPurposeError'],['editCategory','editCategoryError'],['editFounder','editFounderError'],['editEmployee','editEmployeeError']].forEach(([fId,eId]) => {
      const el = document.getElementById(fId); const err = document.getElementById(eId);
      if (!el.value.trim()) { err.classList.add('show'); valid = false; } else err.classList.remove('show');
    });
    const amt = parseFloat(document.getElementById('editAmount').value);
    const amtErr = document.getElementById('editAmountError');
    if (!amt || amt <= 0) { amtErr.classList.add('show'); valid = false; } else amtErr.classList.remove('show');
    if (!valid) return;
    btn.classList.add('btn-loading'); btn.disabled = true;
    try {
      let fileData = null, fileName = null, mimeType = null;
      if (editSelectedFile) {
        fileData = await Utils.fileToBase64(editSelectedFile);
        fileName = editSelectedFile.name;
        mimeType = editSelectedFile.type;
      }
      const payload = {
        expenseId: document.getElementById('editExpenseId').value,
        date: document.getElementById('editDate').value,
        purpose: document.getElementById('editPurpose').value.trim(),
        description: document.getElementById('editDescription').value.trim(),
        category: document.getElementById('editCategory').value,
        founder: document.getElementById('editFounder').value,
        employee: document.getElementById('editEmployee').value,
        amount: parseFloat(document.getElementById('editAmount').value),
        paymentStatus: document.getElementById('editStatus').value,
        paymentDate: document.getElementById('editPayDate').value || '',
        remarks: document.getElementById('editRemarks').value.trim(),
        fileData, fileName, mimeType
      };
      const res = await API.updateExpense(payload);
      if (res && res.success) {
        Utils.showToast('Expense updated successfully!', 'success');
        UI.hideModal('editModal');
        loadExpenses();
      } else throw new Error(res?.message || 'Update failed.');
    } catch (err) {
      Utils.showToast(err.message || 'Error updating expense.', 'error');
    } finally {
      btn.classList.remove('btn-loading'); btn.disabled = false;
    }
  });

  document.getElementById('confirmDeleteBtn').addEventListener('click', async () => {
    if (!pendingDeleteId) return;
    const btn = document.getElementById('confirmDeleteBtn');
    btn.classList.add('btn-loading'); btn.disabled = true;
    try {
      const res = await API.deleteExpense(pendingDeleteId);
      if (res && res.success) {
        Utils.showToast('Expense deleted.', 'success');
        UI.hideModal('deleteModal');
        loadExpenses();
      } else throw new Error(res?.message || 'Delete failed.');
    } catch (err) {
      Utils.showToast(err.message || 'Error deleting expense.', 'error');
    } finally {
      btn.classList.remove('btn-loading'); btn.disabled = false; pendingDeleteId = null;
    }
  });

  document.getElementById('manageSearch').addEventListener('input', Utils.debounce(function () { searchTerm = this.value.trim(); applyAll(); }, 300));
  document.getElementById('manageSort').addEventListener('change', function () { currentSort = this.value; applyAll(); });
  document.getElementById('manageStatusFilter').addEventListener('change', function () { statusFilter = this.value; applyAll(); });
  document.getElementById('manageRowsPerPage').addEventListener('change', function () { rowsPerPage = parseInt(this.value); currentPage = 1; renderTable(); });
  document.getElementById('refreshBtn')?.addEventListener('click', loadExpenses);

  loadExpenses();
})();
