(function () {
  if (!Auth.requireAuth()) return;
  UI.initSidebar();
  UI.initLogout();
  UI.setUser();

  UI.populateDropdown('expCategory', CONFIG.CATEGORIES, 'Select category');
  UI.populateDropdown('expFounder', CONFIG.FOUNDERS, 'Select founder');
  UI.populateDropdown('expEmployee', CONFIG.EMPLOYEES, 'Select employee');

  document.getElementById('expDate').value = Utils.todayISO();

  document.getElementById('expStatus').addEventListener('change', function () {
    const pg = document.getElementById('payDateGroup');
    if (this.value === 'Paid') { pg.style.display = ''; document.getElementById('expPayDate').value = Utils.todayISO(); }
    else pg.style.display = 'none';
  });

  const dropZone = document.getElementById('fileDropZone');
  const fileInput = document.getElementById('expFile');
  let selectedFile = null;

  function showFilePreview(file) {
    selectedFile = file;
    document.getElementById('fileName').textContent = file.name;
    document.getElementById('fileSize').textContent = (file.size / 1024 / 1024).toFixed(2) + ' MB';
    document.getElementById('fileIcon').textContent = UI.fileIcon(file.name);
    document.getElementById('filePreviewBox').classList.remove('d-none');
    dropZone.style.display = 'none';
  }

  function clearFile() {
    selectedFile = null;
    fileInput.value = '';
    document.getElementById('filePreviewBox').classList.add('d-none');
    dropZone.style.display = '';
  }

  dropZone.addEventListener('click', () => fileInput.click());
  dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('drag-over'); });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
  dropZone.addEventListener('drop', e => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (!file) return;
    const err = Utils.validateFile(file);
    if (err) { Utils.showToast(err, 'error'); return; }
    showFilePreview(file);
  });
  fileInput.addEventListener('change', function () {
    if (!this.files[0]) return;
    const err = Utils.validateFile(this.files[0]);
    if (err) { Utils.showToast(err, 'error'); this.value = ''; return; }
    showFilePreview(this.files[0]);
  });
  document.getElementById('removeFile').addEventListener('click', clearFile);
  document.getElementById('cancelBtn').addEventListener('click', () => window.location.href = 'dashboard.html');
  document.getElementById('resetBtn').addEventListener('click', () => {
    document.getElementById('addExpenseForm').reset();
    clearFile();
    document.getElementById('expDate').value = Utils.todayISO();
    document.getElementById('payDateGroup').style.display = 'none';
    document.querySelectorAll('.form-error').forEach(e => e.classList.remove('show'));
  });

  function validateForm() {
    let valid = true;
    const fields = [
      { id: 'expDate', errId: 'expDateError', msg: 'Date is required.' },
      { id: 'expPurpose', errId: 'expPurposeError', msg: 'Purpose is required.' },
      { id: 'expCategory', errId: 'expCategoryError', msg: 'Category is required.' },
      { id: 'expFounder', errId: 'expFounderError', msg: 'Founder is required.' },
      { id: 'expEmployee', errId: 'expEmployeeError', msg: 'Employee is required.' },
      { id: 'expStatus', errId: 'expStatusError', msg: 'Payment status is required.' },
    ];
    fields.forEach(f => {
      const el = document.getElementById(f.id);
      const err = document.getElementById(f.errId);
      if (!el.value.trim()) { err.classList.add('show'); valid = false; }
      else err.classList.remove('show');
    });
    const amt = parseFloat(document.getElementById('expAmount').value);
    const amtErr = document.getElementById('expAmountError');
    if (!amt || amt <= 0) { amtErr.classList.add('show'); valid = false; }
    else amtErr.classList.remove('show');
    return valid;
  }

  document.getElementById('addExpenseForm').addEventListener('submit', async function (e) {
    e.preventDefault();
    if (!validateForm()) return;
    const btn = document.getElementById('saveBtn');
    btn.classList.add('btn-loading');
    btn.disabled = true;
    try {
      let fileData = null, fileName = null, mimeType = null;
      if (selectedFile) {
        fileData = await Utils.fileToBase64(selectedFile);
        fileName = selectedFile.name;
        mimeType = selectedFile.type;
      }
      const payload = {
        date: document.getElementById('expDate').value,
        purpose: document.getElementById('expPurpose').value.trim(),
        description: document.getElementById('expDescription').value.trim(),
        category: document.getElementById('expCategory').value,
        founder: document.getElementById('expFounder').value,
        employee: document.getElementById('expEmployee').value,
        amount: parseFloat(document.getElementById('expAmount').value),
        paymentStatus: document.getElementById('expStatus').value,
        paymentDate: document.getElementById('expPayDate').value || '',
        remarks: document.getElementById('expRemarks').value.trim(),
        fileData, fileName, mimeType
      };
      const res = await API.saveExpense(payload);
      if (res && res.success) {
        Utils.showToast('Expense saved successfully!', 'success');
        setTimeout(() => window.location.href = 'dashboard.html', 1200);
      } else {
        throw new Error(res?.message || 'Save failed.');
      }
    } catch (err) {
      Utils.showToast(err.message || 'Error saving expense.', 'error');
      btn.classList.remove('btn-loading');
      btn.disabled = false;
    }
  });
})();
