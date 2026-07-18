const API = (() => {
  let _submitting = false;

  async function request(payload) {
    const url = CONFIG.WEB_APP_URL;
    const response = await fetch(url, {
      method: "POST",
      redirect: "follow",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    const text = await response.text();
    try {
      return JSON.parse(text);
    } catch {
      throw new Error("Server returned invalid JSON. Check Apps Script deployment.");
    }
  }

  async function getExpenses() {
    const url = `${CONFIG.WEB_APP_URL}?action=getExpenses&t=${Date.now()}`;
    const response = await fetch(url, { redirect: "follow" });
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    const text = await response.text();
    try {
      return JSON.parse(text);
    } catch {
      throw new Error("Server returned invalid JSON. Check Apps Script deployment.");
    }
  }

  async function saveExpense(data) {
    if (_submitting) throw new Error("Submission already in progress.");
    _submitting = true;
    try {
      return await request({ action: "saveExpense", data });
    } finally {
      _submitting = false;
    }
  }

  async function updateExpense(data) {
    return request({ action: "updateExpense", data });
  }

  async function deleteExpense(expenseId) {
    return request({ action: "deleteExpense", data: { expenseId } });
  }

  async function updatePayment(expenseId, status, paymentDate) {
    return request({ action: "updatePayment", data: { expenseId, status, paymentDate } });
  }

  async function uploadAttachment(expenseId, fileData, fileName, mimeType) {
    return request({ action: "uploadAttachment", data: { expenseId, fileData, fileName, mimeType } });
  }

  return { getExpenses, saveExpense, updateExpense, deleteExpense, updatePayment, uploadAttachment };
})();
