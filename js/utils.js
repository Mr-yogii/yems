const Utils = (() => {
  function formatCurrency(amount) {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2 }).format(amount || 0);
  }

  function parseDate(dateStr) {
    if (!dateStr || dateStr === "-") return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      const [y, m, d] = dateStr.split("-").map(Number);
      return new Date(y, m - 1, d);
    }
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d;
  }

  function formatDate(dateStr) {
    if (!dateStr) return "-";
    const d = parseDate(dateStr);
    if (!d) return dateStr;
    return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  }

  function todayISO() {
    return new Date().toISOString().split("T")[0];
  }

  function isToday(dateStr) {
    if (!dateStr) return false;
    const d = parseDate(dateStr);
    if (!d) return false;
    const today = new Date();
    return d.getDate() === today.getDate() &&
           d.getMonth() === today.getMonth() &&
           d.getFullYear() === today.getFullYear();
  }

  function currentMonthYear() {
    const d = new Date();
    return { month: d.getMonth(), year: d.getFullYear() };
  }

  function isCurrentMonth(dateStr) {
    if (!dateStr) return false;
    const d = parseDate(dateStr);
    if (!d) return false;
    const { month, year } = currentMonthYear();
    return d.getMonth() === month && d.getFullYear() === year;
  }

  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(",")[1]);
      reader.onerror = () => reject(new Error("Failed to read file."));
      reader.readAsDataURL(file);
    });
  }

  function validateFile(file) {
    if (!file) return null;
    if (file.size > CONFIG.MAX_UPLOAD_SIZE_BYTES) {
      return `File size exceeds ${CONFIG.MAX_UPLOAD_SIZE_MB}MB limit.`;
    }
    const ext = file.name.split(".").pop().toLowerCase();
    if (!CONFIG.ALLOWED_FILE_TYPES.includes(ext)) {
      return `File type ".${ext}" is not allowed.`;
    }
    return null;
  }

  function showToast(message, type = "info") {
    const existing = document.getElementById("ems-toast");
    if (existing) existing.remove();
    const toast = document.createElement("div");
    toast.id = "ems-toast";
    const colors = { success: "#0e9f6e", error: "#e02424", info: "#1a56db", warning: "#c27803" };
    const icons = { success: "check_circle", error: "error", info: "info", warning: "warning" };
    toast.style.cssText = `
      position:fixed;bottom:24px;right:24px;z-index:9999;
      display:flex;align-items:center;gap:10px;
      background:${colors[type] || colors.info};color:#fff;
      padding:14px 20px;border-radius:12px;
      font-family:'Poppins',sans-serif;font-size:14px;font-weight:500;
      box-shadow:0 8px 32px rgba(0,0,0,0.18);
      animation:slideInToast 0.3s ease;max-width:360px;
    `;
    toast.innerHTML = `<span class="material-symbols-outlined" style="font-size:20px">${icons[type] || "info"}</span>${message}`;
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.style.animation = "slideOutToast 0.3s ease forwards";
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }

  function debounce(fn, delay) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), delay);
    };
  }

  function groupBy(arr, key) {
    return arr.reduce((acc, item) => {
      const k = item[key] || "Unknown";
      if (!acc[k]) acc[k] = [];
      acc[k].push(item);
      return acc;
    }, {});
  }

  function sumBy(arr, key) {
    return arr.reduce((sum, item) => sum + (parseFloat(item[key]) || 0), 0);
  }

  function sanitizeHTML(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  function getMonthName(monthIndex) {
    return ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][monthIndex];
  }

  return { parseDate, formatCurrency, formatDate, todayISO, isToday, isCurrentMonth, fileToBase64, validateFile, showToast, debounce, groupBy, sumBy, sanitizeHTML, getMonthName };
})();
