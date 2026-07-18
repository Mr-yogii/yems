var SPREADSHEET_ID = "YOUR_GOOGLE_SHEET_ID";
var SHEET_NAME = "Expenses";
var FOLDER_NAME = "Expense Documents";
var SUBFOLDER_YEAR = String(new Date().getFullYear());

var SHEET_HEADERS = [
  "ExpenseID","Date","Purpose","Description","Category","Founder","Employee",
  "Amount","PaymentStatus","PaymentDate","Remarks","FileName","FileID","DriveURL",
  "CreatedTime","UpdatedTime"
];

function doGet(e) {
  var action = e && e.parameter ? e.parameter.action : "getExpenses";
  try {
    if (action === "getExpenses") {
      return buildResponse({ success: true, data: getExpenses() });
    }
    return buildResponse({ success: false, message: "Unknown GET action." });
  } catch (err) {
    return buildResponse({ success: false, message: err.message });
  }
}

function doPost(e) {
  try {
    var payload = JSON.parse(e.postData.contents);
    var action = payload.action;
    var data = payload.data || {};
    var result;
    if (action === "saveExpense") result = saveExpense(data);
    else if (action === "updateExpense") result = updateExpense(data);
    else if (action === "deleteExpense") result = deleteExpense(data.expenseId);
    else if (action === "updatePayment") result = updatePayment(data.expenseId, data.status, data.paymentDate);
    else if (action === "uploadAttachment") result = uploadAttachment(data.expenseId, data.fileData, data.fileName, data.mimeType);
    else result = { success: false, message: "Unknown action: " + action };
    return buildResponse(result);
  } catch (err) {
    return buildResponse({ success: false, message: err.message });
  }
}

function doOptions(e) {
  return buildResponse({ success: true });
}

function buildResponse(data) {
  var output = ContentService.createTextOutput(JSON.stringify(data));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}

function getSpreadsheet() {
  if (SPREADSHEET_ID && SPREADSHEET_ID !== "YOUR_GOOGLE_SHEET_ID") {
    return SpreadsheetApp.openById(SPREADSHEET_ID);
  }
  return SpreadsheetApp.getActiveSpreadsheet();
}

function getSheet() {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(SHEET_HEADERS);
    sheet.getRange(1, 1, 1, SHEET_HEADERS.length).setFontWeight("bold").setBackground("#1a56db").setFontColor("#ffffff");
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function formatCellValue(value, header) {
  if (value === null || value === undefined || value === "") return "";
  var dateHeaders = ["Date", "PaymentDate"];
  if (dateHeaders.indexOf(header) !== -1) {
    if (value instanceof Date && !isNaN(value.getTime())) {
      return Utilities.formatDate(value, Session.getScriptTimeZone(), "yyyy-MM-dd");
    }
    return String(value);
  }
  if (header === "Amount") {
    var n = parseFloat(value);
    return isNaN(n) ? "0" : String(n);
  }
  return String(value);
}

function getExpenses() {
  var sheet = getSheet();
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  var data = sheet.getRange(2, 1, lastRow - 1, SHEET_HEADERS.length).getValues();
  return data.filter(function(row) { return row[0] !== ""; }).map(function(row) {
    var obj = {};
    SHEET_HEADERS.forEach(function(h, i) { obj[h] = formatCellValue(row[i], h); });
    return obj;
  });
}

function generateExpenseID() {
  var sheet = getSheet();
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return "EXP-0001";
  var last = sheet.getRange(lastRow, 1).getValue();
  var num = last ? parseInt(String(last).replace("EXP-", "")) || 0 : 0;
  return "EXP-" + String(num + 1).padStart(4, "0");
}

function saveExpense(data) {
  if (!data.date || !data.purpose || !data.category || !data.founder || !data.employee || !data.amount || !data.paymentStatus) {
    return { success: false, message: "Missing required fields." };
  }
  if (isNaN(parseFloat(data.amount)) || parseFloat(data.amount) <= 0) {
    return { success: false, message: "Invalid amount." };
  }
  var sheet = getSheet();
  var expenseId = generateExpenseID();
  var now = new Date().toISOString();
  var fileName = "", fileId = "", driveUrl = "";
  if (data.fileData && data.fileName) {
    var uploadResult = uploadFileToDrive(expenseId, data.category, data.employee, data.amount, data.fileData, data.fileName, data.mimeType);
    fileName = uploadResult.fileName;
    fileId = uploadResult.fileId;
    driveUrl = uploadResult.driveUrl;
  }
  sheet.appendRow([
    expenseId, data.date, data.purpose, data.description || "", data.category,
    data.founder, data.employee, parseFloat(data.amount), data.paymentStatus,
    data.paymentDate || "", data.remarks || "", fileName, fileId, driveUrl, now, now
  ]);
  return { success: true, expenseId: expenseId, message: "Expense saved." };
}

function updateExpense(data) {
  if (!data.expenseId) return { success: false, message: "Expense ID required." };
  var sheet = getSheet();
  var rows = sheet.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    if (rows[i][0] === data.expenseId) {
      var now = new Date().toISOString();
      var fileName = rows[i][11], fileId = rows[i][12], driveUrl = rows[i][13];
      if (data.fileData && data.fileName) {
        if (fileId) { try { DriveApp.getFileById(fileId).setTrashed(true); } catch(e) {} }
        var uploadResult = uploadFileToDrive(data.expenseId, data.category, data.employee, data.amount, data.fileData, data.fileName, data.mimeType);
        fileName = uploadResult.fileName;
        fileId = uploadResult.fileId;
        driveUrl = uploadResult.driveUrl;
      }
      sheet.getRange(i + 1, 1, 1, SHEET_HEADERS.length).setValues([[
        data.expenseId, data.date, data.purpose, data.description || "", data.category,
        data.founder, data.employee, parseFloat(data.amount), data.paymentStatus,
        data.paymentDate || "", data.remarks || "", fileName, fileId, driveUrl,
        rows[i][14], now
      ]]);
      return { success: true, message: "Expense updated." };
    }
  }
  return { success: false, message: "Expense not found: " + data.expenseId };
}

function deleteExpense(expenseId) {
  if (!expenseId) return { success: false, message: "Expense ID required." };
  var sheet = getSheet();
  var rows = sheet.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    if (rows[i][0] === expenseId) {
      var fileId = rows[i][12];
      if (fileId) { try { DriveApp.getFileById(fileId).setTrashed(true); } catch(e) {} }
      sheet.deleteRow(i + 1);
      return { success: true, message: "Expense deleted." };
    }
  }
  return { success: false, message: "Expense not found: " + expenseId };
}

function updatePayment(expenseId, status, paymentDate) {
  if (!expenseId || !status) return { success: false, message: "Expense ID and status required." };
  var sheet = getSheet();
  var rows = sheet.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    if (rows[i][0] === expenseId) {
      sheet.getRange(i + 1, 9).setValue(status);
      sheet.getRange(i + 1, 10).setValue(paymentDate || "");
      sheet.getRange(i + 1, 16).setValue(new Date().toISOString());
      return { success: true, message: "Payment status updated." };
    }
  }
  return { success: false, message: "Expense not found." };
}

function uploadAttachment(expenseId, fileData, fileName, mimeType) {
  if (!expenseId || !fileData || !fileName) return { success: false, message: "Missing file data." };
  var expense = getExpenses().find(function(e) { return e.ExpenseID === expenseId; });
  if (!expense) return { success: false, message: "Expense not found." };
  var result = uploadFileToDrive(expenseId, expense.Category, expense.Employee, expense.Amount, fileData, fileName, mimeType);
  var sheet = getSheet();
  var rows = sheet.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    if (rows[i][0] === expenseId) {
      if (rows[i][12]) { try { DriveApp.getFileById(rows[i][12]).setTrashed(true); } catch(e) {} }
      sheet.getRange(i + 1, 12).setValue(result.fileName);
      sheet.getRange(i + 1, 13).setValue(result.fileId);
      sheet.getRange(i + 1, 14).setValue(result.driveUrl);
      sheet.getRange(i + 1, 16).setValue(new Date().toISOString());
      break;
    }
  }
  return { success: true, fileName: result.fileName, fileId: result.fileId, driveUrl: result.driveUrl };
}

function uploadFileToDrive(expenseId, category, employee, amount, fileData, fileName, mimeType) {
  var rootFolder = getOrCreateFolder(DriveApp.getRootFolder(), FOLDER_NAME);
  var yearFolder = getOrCreateFolder(rootFolder, SUBFOLDER_YEAR);
  var cat = category || "Others";
  var catFolder = getOrCreateFolder(yearFolder, cat);
  var ext = fileName.split(".").pop();
  var emp = String(employee || "").replace(/\s+/g, "");
  var amt = String(parseFloat(amount) || 0).split(".")[0];
  var newName = expenseId + "_" + cat + "_" + emp + "_" + amt + "." + ext;
  var bytes = Utilities.base64Decode(fileData);
  var blob = Utilities.newBlob(bytes, mimeType || "application/octet-stream", newName);
  var file = catFolder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return { fileName: newName, fileId: file.getId(), driveUrl: file.getUrl() };
}

function getOrCreateFolder(parent, name) {
  var iter = parent.getFoldersByName(name);
  if (iter.hasNext()) return iter.next();
  return parent.createFolder(name);
}
