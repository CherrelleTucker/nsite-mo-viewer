/**
 * MO-DB_Contacts Management Menu
 * ==============================
 * Custom menu for adding/updating contacts without direct sheet manipulation.
 *
 * SETUP: Add this script to the MO-DB_Contacts Google Sheet
 * (Extensions > Apps Script > paste this code)
 */

// ============================================================================
// MENU SETUP
// ============================================================================

/**
 * Creates custom menu when spreadsheet opens
 */
function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('Contacts')
    .addItem('Add New Contact', 'showAddContactDialog')
    .addItem('Update Contact', 'showUpdateContactDialog')
    .addItem('Add Note to Contact', 'showAddNoteDialog')
    .addSeparator()
    .addItem('Find Contact by Email', 'showFindContactDialog')
    .addItem('Find Contacts by Solution', 'showFindBySolutionDialog')
    .addSeparator()
    .addSubMenu(ui.createMenu('Utilities')
      .addItem('Validate Emails', 'validateEmails')
      .addItem('Remove Duplicates', 'removeDuplicates')
      .addItem('Sort by Solution', 'sortBySolution'))
    .addToUi();
}

// ============================================================================
// COLUMN CONFIGURATION
// ============================================================================

/**
 * Expected column headers (update if schema changes)
 */
var COLUMNS = {
  CONTACT_ID: 'contact_id',
  NAME: 'name',
  EMAIL: 'email',
  PHONE: 'phone',
  DEPARTMENT: 'department',
  AGENCY: 'agency',
  ORGANIZATION: 'organization',
  SOLUTION: 'solution',
  ROLE: 'role',
  SURVEY_YEAR: 'survey_year',
  NEED_ID: 'need_id',
  NOTES: 'notes',
  LAST_UPDATED: 'last_updated'
};

/**
 * Valid role options
 */
var VALID_ROLES = [
  'Survey Submitter',
  'Primary SME',
  'Secondary SME',
  'Additional SME',
  'Stakeholder',
  'Solution Lead',
  'Project Manager',
  'Technical Contact',
  'Other'
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get the contacts sheet
 */
function getContactsSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheets()[0]; // First sheet
  return sheet;
}

/**
 * Get column index by header name
 */
function getColumnIndex(sheet, headerName) {
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  for (var i = 0; i < headers.length; i++) {
    if (headers[i].toString().toLowerCase() === headerName.toLowerCase()) {
      return i + 1; // 1-indexed
    }
  }
  return -1;
}

/**
 * Get all column indices
 */
function getColumnIndices(sheet) {
  var indices = {};
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  for (var i = 0; i < headers.length; i++) {
    indices[headers[i]] = i + 1;
  }
  return indices;
}

/**
 * Ensure notes and last_updated columns exist
 */
function ensureColumnsExist() {
  var sheet = getContactsSheet();
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

  var hasNotes = headers.indexOf('notes') !== -1;
  var hasLastUpdated = headers.indexOf('last_updated') !== -1;

  if (!hasNotes) {
    var lastCol = sheet.getLastColumn() + 1;
    sheet.getRange(1, lastCol).setValue('notes');
  }

  if (!hasLastUpdated) {
    var lastCol = sheet.getLastColumn() + 1;
    sheet.getRange(1, lastCol).setValue('last_updated');
  }
}

/**
 * Generate next contact ID
 */
function getNextContactId() {
  var sheet = getContactsSheet();
  var colIdx = getColumnIndex(sheet, 'contact_id');
  if (colIdx === -1) return 'C0001';

  var data = sheet.getRange(2, colIdx, sheet.getLastRow() - 1, 1).getValues();
  var maxNum = 0;

  for (var i = 0; i < data.length; i++) {
    var id = data[i][0];
    if (id && id.toString().startsWith('C')) {
      var num = parseInt(id.toString().substring(1), 10);
      if (num > maxNum) maxNum = num;
    }
  }

  return 'C' + String(maxNum + 1).padStart(4, '0');
}

/**
 * Find rows by email
 */
function findRowsByEmail(email) {
  var sheet = getContactsSheet();
  var emailCol = getColumnIndex(sheet, 'email');
  if (emailCol === -1) return [];

  var data = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();
  var rows = [];

  for (var i = 0; i < data.length; i++) {
    if (data[i][emailCol - 1] &&
        data[i][emailCol - 1].toString().toLowerCase() === email.toLowerCase()) {
      rows.push({
        rowNum: i + 2, // 1-indexed, skip header
        data: data[i]
      });
    }
  }

  return rows;
}

/**
 * Get unique solutions list
 */
function getUniqueSolutions() {
  var sheet = getContactsSheet();
  var solCol = getColumnIndex(sheet, 'solution');
  if (solCol === -1) return [];

  var data = sheet.getRange(2, solCol, sheet.getLastRow() - 1, 1).getValues();
  var solutions = {};

  for (var i = 0; i < data.length; i++) {
    if (data[i][0]) {
      solutions[data[i][0]] = true;
    }
  }

  return Object.keys(solutions).sort();
}

// ============================================================================
// ADD CONTACT DIALOG
// ============================================================================

/**
 * Show add contact dialog
 */
function showAddContactDialog() {
  ensureColumnsExist();

  var solutions = getUniqueSolutions();
  var solutionOptions = solutions.map(function(s) {
    return '<option value="' + s + '">' + s + '</option>';
  }).join('');

  var roleOptions = VALID_ROLES.map(function(r) {
    return '<option value="' + r + '">' + r + '</option>';
  }).join('');

  var html = HtmlService.createHtmlOutput(`
    <style>
      body { font-family: Arial, sans-serif; padding: 15px; }
      .form-group { margin-bottom: 12px; }
      label { display: block; font-weight: bold; margin-bottom: 4px; }
      input, select, textarea { width: 100%; padding: 8px; box-sizing: border-box; }
      textarea { height: 60px; }
      .btn { padding: 10px 20px; margin-right: 10px; cursor: pointer; }
      .btn-primary { background: #1a73e8; color: white; border: none; }
      .btn-secondary { background: #f1f3f4; border: 1px solid #ccc; }
      .section { border-top: 1px solid #eee; padding-top: 12px; margin-top: 12px; }
      h3 { margin: 0 0 15px 0; color: #333; }
    </style>

    <h3>Add New Contact</h3>

    <div class="form-group">
      <label>Name *</label>
      <input type="text" id="name" required>
    </div>

    <div class="form-group">
      <label>Email *</label>
      <input type="email" id="email" required>
    </div>

    <div class="form-group">
      <label>Phone</label>
      <input type="text" id="phone">
    </div>

    <div class="section">
      <div class="form-group">
        <label>Department</label>
        <input type="text" id="department">
      </div>

      <div class="form-group">
        <label>Agency</label>
        <input type="text" id="agency">
      </div>

      <div class="form-group">
        <label>Organization</label>
        <input type="text" id="organization">
      </div>
    </div>

    <div class="section">
      <div class="form-group">
        <label>Solution *</label>
        <select id="solution">
          <option value="">-- Select or type new --</option>
          ${solutionOptions}
        </select>
        <input type="text" id="solution_new" placeholder="Or enter new solution name" style="margin-top: 5px;">
      </div>

      <div class="form-group">
        <label>Role *</label>
        <select id="role">
          ${roleOptions}
        </select>
      </div>

      <div class="form-group">
        <label>Survey Year</label>
        <input type="number" id="survey_year" min="2016" max="2030" placeholder="e.g., 2024">
      </div>
    </div>

    <div class="section">
      <div class="form-group">
        <label>Notes</label>
        <textarea id="notes" placeholder="Any notes about this contact..."></textarea>
      </div>
    </div>

    <div style="margin-top: 20px;">
      <button class="btn btn-primary" onclick="submitForm()">Add Contact</button>
      <button class="btn btn-secondary" onclick="google.script.host.close()">Cancel</button>
    </div>

    <script>
      function submitForm() {
        var solution = document.getElementById('solution').value ||
                       document.getElementById('solution_new').value;

        if (!document.getElementById('name').value ||
            !document.getElementById('email').value ||
            !solution) {
          alert('Please fill in required fields (Name, Email, Solution)');
          return;
        }

        var data = {
          name: document.getElementById('name').value,
          email: document.getElementById('email').value,
          phone: document.getElementById('phone').value,
          department: document.getElementById('department').value,
          agency: document.getElementById('agency').value,
          organization: document.getElementById('organization').value,
          solution: solution,
          role: document.getElementById('role').value,
          survey_year: document.getElementById('survey_year').value,
          notes: document.getElementById('notes').value
        };

        google.script.run
          .withSuccessHandler(function(result) {
            alert(result);
            google.script.host.close();
          })
          .withFailureHandler(function(error) {
            alert('Error: ' + error.message);
          })
          .addContact(data);
      }
    </script>
  `)
  .setWidth(450)
  .setHeight(650);

  SpreadsheetApp.getUi().showModalDialog(html, 'Add Contact');
}

/**
 * Add contact to sheet
 */
function addContact(data) {
  var sheet = getContactsSheet();
  var cols = getColumnIndices(sheet);

  // Check if email+solution+role combo already exists
  var existing = findRowsByEmail(data.email);
  for (var i = 0; i < existing.length; i++) {
    var row = existing[i].data;
    if (row[cols['solution'] - 1] === data.solution &&
        row[cols['role'] - 1] === data.role) {
      return 'Contact already exists with this email, solution, and role combination.';
    }
  }

  var contactId = existing.length > 0 ?
    existing[0].data[cols['contact_id'] - 1] :
    getNextContactId();

  var newRow = [];
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

  for (var i = 0; i < headers.length; i++) {
    var header = headers[i];
    switch(header) {
      case 'contact_id': newRow.push(contactId); break;
      case 'name': newRow.push(data.name); break;
      case 'email': newRow.push(data.email.toLowerCase()); break;
      case 'phone': newRow.push(data.phone || ''); break;
      case 'department': newRow.push(data.department || ''); break;
      case 'agency': newRow.push(data.agency || ''); break;
      case 'organization': newRow.push(data.organization || ''); break;
      case 'solution': newRow.push(data.solution); break;
      case 'role': newRow.push(data.role); break;
      case 'survey_year': newRow.push(data.survey_year || ''); break;
      case 'need_id': newRow.push(''); break;
      case 'notes': newRow.push(data.notes || ''); break;
      case 'last_updated': newRow.push(new Date().toISOString()); break;
      default: newRow.push('');
    }
  }

  sheet.appendRow(newRow);
  return 'Contact added successfully! ID: ' + contactId;
}

// ============================================================================
// UPDATE CONTACT DIALOG
// ============================================================================

/**
 * Show update contact dialog
 */
function showUpdateContactDialog() {
  var html = HtmlService.createHtmlOutput(`
    <style>
      body { font-family: Arial, sans-serif; padding: 15px; }
      .form-group { margin-bottom: 12px; }
      label { display: block; font-weight: bold; margin-bottom: 4px; }
      input, select, textarea { width: 100%; padding: 8px; box-sizing: border-box; }
      .btn { padding: 10px 20px; margin-right: 10px; cursor: pointer; }
      .btn-primary { background: #1a73e8; color: white; border: none; }
      .btn-secondary { background: #f1f3f4; border: 1px solid #ccc; }
      #results { margin-top: 15px; }
      .contact-card { border: 1px solid #ddd; padding: 10px; margin: 10px 0; border-radius: 4px; }
      .contact-card:hover { background: #f9f9f9; }
      .edit-btn { background: #34a853; color: white; border: none; padding: 5px 10px; cursor: pointer; }
    </style>

    <h3>Update Contact</h3>

    <div class="form-group">
      <label>Search by Email</label>
      <input type="email" id="search_email" placeholder="Enter email address">
      <button class="btn btn-primary" onclick="searchContact()" style="margin-top: 10px;">Search</button>
    </div>

    <div id="results"></div>

    <script>
      function searchContact() {
        var email = document.getElementById('search_email').value;
        if (!email) {
          alert('Please enter an email address');
          return;
        }

        document.getElementById('results').innerHTML = 'Searching...';

        google.script.run
          .withSuccessHandler(function(results) {
            if (results.length === 0) {
              document.getElementById('results').innerHTML = '<p>No contacts found with that email.</p>';
              return;
            }

            var html = '<h4>Found ' + results.length + ' record(s):</h4>';
            results.forEach(function(r, idx) {
              html += '<div class="contact-card">';
              html += '<strong>' + (r.name || 'No name') + '</strong><br>';
              html += 'Solution: ' + (r.solution || 'N/A') + '<br>';
              html += 'Role: ' + (r.role || 'N/A') + '<br>';
              html += '<button class="edit-btn" onclick="editContact(' + r.rowNum + ')">Edit</button>';
              html += '</div>';
            });

            document.getElementById('results').innerHTML = html;
          })
          .withFailureHandler(function(error) {
            document.getElementById('results').innerHTML = '<p style="color:red;">Error: ' + error.message + '</p>';
          })
          .searchContactByEmail(email);
      }

      function editContact(rowNum) {
        google.script.run
          .withSuccessHandler(function() {
            google.script.host.close();
          })
          .showEditContactDialog(rowNum);
      }
    </script>
  `)
  .setWidth(450)
  .setHeight(400);

  SpreadsheetApp.getUi().showModalDialog(html, 'Update Contact');
}

/**
 * Search contact by email
 */
function searchContactByEmail(email) {
  var rows = findRowsByEmail(email);
  var sheet = getContactsSheet();
  var cols = getColumnIndices(sheet);

  return rows.map(function(r) {
    return {
      rowNum: r.rowNum,
      name: r.data[cols['name'] - 1] || '',
      email: r.data[cols['email'] - 1] || '',
      solution: r.data[cols['solution'] - 1] || '',
      role: r.data[cols['role'] - 1] || ''
    };
  });
}

/**
 * Show edit dialog for specific row
 */
function showEditContactDialog(rowNum) {
  var sheet = getContactsSheet();
  var cols = getColumnIndices(sheet);
  var rowData = sheet.getRange(rowNum, 1, 1, sheet.getLastColumn()).getValues()[0];

  var roleOptions = VALID_ROLES.map(function(r) {
    var selected = (rowData[cols['role'] - 1] === r) ? 'selected' : '';
    return '<option value="' + r + '" ' + selected + '>' + r + '</option>';
  }).join('');

  var html = HtmlService.createHtmlOutput(`
    <style>
      body { font-family: Arial, sans-serif; padding: 15px; }
      .form-group { margin-bottom: 12px; }
      label { display: block; font-weight: bold; margin-bottom: 4px; }
      input, select, textarea { width: 100%; padding: 8px; box-sizing: border-box; }
      textarea { height: 80px; }
      .btn { padding: 10px 20px; margin-right: 10px; cursor: pointer; }
      .btn-primary { background: #1a73e8; color: white; border: none; }
      .btn-danger { background: #ea4335; color: white; border: none; }
      .btn-secondary { background: #f1f3f4; border: 1px solid #ccc; }
    </style>

    <h3>Edit Contact</h3>
    <input type="hidden" id="rowNum" value="${rowNum}">

    <div class="form-group">
      <label>Name</label>
      <input type="text" id="name" value="${rowData[cols['name'] - 1] || ''}">
    </div>

    <div class="form-group">
      <label>Email</label>
      <input type="email" id="email" value="${rowData[cols['email'] - 1] || ''}">
    </div>

    <div class="form-group">
      <label>Phone</label>
      <input type="text" id="phone" value="${rowData[cols['phone'] - 1] || ''}">
    </div>

    <div class="form-group">
      <label>Department</label>
      <input type="text" id="department" value="${rowData[cols['department'] - 1] || ''}">
    </div>

    <div class="form-group">
      <label>Agency</label>
      <input type="text" id="agency" value="${rowData[cols['agency'] - 1] || ''}">
    </div>

    <div class="form-group">
      <label>Organization</label>
      <input type="text" id="organization" value="${rowData[cols['organization'] - 1] || ''}">
    </div>

    <div class="form-group">
      <label>Solution</label>
      <input type="text" id="solution" value="${rowData[cols['solution'] - 1] || ''}">
    </div>

    <div class="form-group">
      <label>Role</label>
      <select id="role">${roleOptions}</select>
    </div>

    <div class="form-group">
      <label>Notes</label>
      <textarea id="notes">${rowData[cols['notes'] - 1] || ''}</textarea>
    </div>

    <div style="margin-top: 20px;">
      <button class="btn btn-primary" onclick="saveChanges()">Save Changes</button>
      <button class="btn btn-danger" onclick="deleteRow()">Delete</button>
      <button class="btn btn-secondary" onclick="google.script.host.close()">Cancel</button>
    </div>

    <script>
      function saveChanges() {
        var data = {
          rowNum: parseInt(document.getElementById('rowNum').value),
          name: document.getElementById('name').value,
          email: document.getElementById('email').value,
          phone: document.getElementById('phone').value,
          department: document.getElementById('department').value,
          agency: document.getElementById('agency').value,
          organization: document.getElementById('organization').value,
          solution: document.getElementById('solution').value,
          role: document.getElementById('role').value,
          notes: document.getElementById('notes').value
        };

        google.script.run
          .withSuccessHandler(function(result) {
            alert(result);
            google.script.host.close();
          })
          .withFailureHandler(function(error) {
            alert('Error: ' + error.message);
          })
          .updateContactRow(data);
      }

      function deleteRow() {
        if (confirm('Are you sure you want to delete this contact record?')) {
          var rowNum = parseInt(document.getElementById('rowNum').value);
          google.script.run
            .withSuccessHandler(function(result) {
              alert(result);
              google.script.host.close();
            })
            .deleteContactRow(rowNum);
        }
      }
    </script>
  `)
  .setWidth(450)
  .setHeight(600);

  SpreadsheetApp.getUi().showModalDialog(html, 'Edit Contact');
}

/**
 * Update contact row
 */
function updateContactRow(data) {
  var sheet = getContactsSheet();
  var cols = getColumnIndices(sheet);

  if (cols['name']) sheet.getRange(data.rowNum, cols['name']).setValue(data.name);
  if (cols['email']) sheet.getRange(data.rowNum, cols['email']).setValue(data.email.toLowerCase());
  if (cols['phone']) sheet.getRange(data.rowNum, cols['phone']).setValue(data.phone);
  if (cols['department']) sheet.getRange(data.rowNum, cols['department']).setValue(data.department);
  if (cols['agency']) sheet.getRange(data.rowNum, cols['agency']).setValue(data.agency);
  if (cols['organization']) sheet.getRange(data.rowNum, cols['organization']).setValue(data.organization);
  if (cols['solution']) sheet.getRange(data.rowNum, cols['solution']).setValue(data.solution);
  if (cols['role']) sheet.getRange(data.rowNum, cols['role']).setValue(data.role);
  if (cols['notes']) sheet.getRange(data.rowNum, cols['notes']).setValue(data.notes);
  if (cols['last_updated']) sheet.getRange(data.rowNum, cols['last_updated']).setValue(new Date().toISOString());

  return 'Contact updated successfully!';
}

/**
 * Delete contact row
 */
function deleteContactRow(rowNum) {
  var sheet = getContactsSheet();
  sheet.deleteRow(rowNum);
  return 'Contact deleted.';
}

// ============================================================================
// ADD NOTE DIALOG
// ============================================================================

/**
 * Show add note dialog
 */
function showAddNoteDialog() {
  ensureColumnsExist();

  var html = HtmlService.createHtmlOutput(`
    <style>
      body { font-family: Arial, sans-serif; padding: 15px; }
      .form-group { margin-bottom: 12px; }
      label { display: block; font-weight: bold; margin-bottom: 4px; }
      input, textarea { width: 100%; padding: 8px; box-sizing: border-box; }
      textarea { height: 120px; }
      .btn { padding: 10px 20px; margin-right: 10px; cursor: pointer; }
      .btn-primary { background: #1a73e8; color: white; border: none; }
      .btn-secondary { background: #f1f3f4; border: 1px solid #ccc; }
      #current-notes { background: #f5f5f5; padding: 10px; margin: 10px 0; border-radius: 4px; max-height: 150px; overflow-y: auto; }
    </style>

    <h3>Add Note to Contact</h3>

    <div class="form-group">
      <label>Search by Email</label>
      <input type="email" id="search_email" placeholder="Enter email address">
      <button class="btn btn-primary" onclick="searchContact()" style="margin-top: 10px;">Search</button>
    </div>

    <div id="contact-info" style="display: none;">
      <p><strong id="contact-name"></strong> - <span id="contact-solution"></span></p>

      <div class="form-group">
        <label>Current Notes:</label>
        <div id="current-notes">No notes yet.</div>
      </div>

      <div class="form-group">
        <label>Add Note:</label>
        <textarea id="new_note" placeholder="Enter your note..."></textarea>
      </div>

      <input type="hidden" id="rowNum">

      <button class="btn btn-primary" onclick="addNote()">Add Note</button>
      <button class="btn btn-secondary" onclick="google.script.host.close()">Cancel</button>
    </div>

    <script>
      var allResults = [];
      var currentIndex = 0;

      function searchContact() {
        var email = document.getElementById('search_email').value;
        if (!email) { alert('Please enter an email'); return; }

        google.script.run
          .withSuccessHandler(function(results) {
            if (results.length === 0) {
              alert('No contact found with that email.');
              return;
            }

            allResults = results;
            currentIndex = 0;
            showResult(0);
            document.getElementById('contact-info').style.display = 'block';
          })
          .searchContactWithNotes(email);
      }

      function showResult(idx) {
        var r = allResults[idx];
        document.getElementById('contact-name').textContent = r.name || 'No name';
        document.getElementById('contact-solution').textContent = r.solution + ' (' + r.role + ')';
        document.getElementById('current-notes').textContent = r.notes || 'No notes yet.';
        document.getElementById('rowNum').value = r.rowNum;
      }

      function addNote() {
        var newNote = document.getElementById('new_note').value;
        if (!newNote) { alert('Please enter a note'); return; }

        var rowNum = parseInt(document.getElementById('rowNum').value);
        var currentNotes = document.getElementById('current-notes').textContent;

        google.script.run
          .withSuccessHandler(function(result) {
            alert(result);
            google.script.host.close();
          })
          .appendNoteToContact(rowNum, newNote);
      }
    </script>
  `)
  .setWidth(450)
  .setHeight(450);

  SpreadsheetApp.getUi().showModalDialog(html, 'Add Note');
}

/**
 * Search contact with notes
 */
function searchContactWithNotes(email) {
  var rows = findRowsByEmail(email);
  var sheet = getContactsSheet();
  var cols = getColumnIndices(sheet);

  return rows.map(function(r) {
    return {
      rowNum: r.rowNum,
      name: r.data[cols['name'] - 1] || '',
      solution: r.data[cols['solution'] - 1] || '',
      role: r.data[cols['role'] - 1] || '',
      notes: r.data[cols['notes'] - 1] || ''
    };
  });
}

/**
 * Append note to contact
 */
function appendNoteToContact(rowNum, newNote) {
  var sheet = getContactsSheet();
  var cols = getColumnIndices(sheet);

  if (!cols['notes']) {
    return 'Error: Notes column not found';
  }

  var currentNotes = sheet.getRange(rowNum, cols['notes']).getValue() || '';
  var timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm');
  var updatedNotes = currentNotes + (currentNotes ? '\n\n' : '') + '[' + timestamp + '] ' + newNote;

  sheet.getRange(rowNum, cols['notes']).setValue(updatedNotes);

  if (cols['last_updated']) {
    sheet.getRange(rowNum, cols['last_updated']).setValue(new Date().toISOString());
  }

  return 'Note added successfully!';
}

// ============================================================================
// FIND DIALOGS
// ============================================================================

/**
 * Show find contact dialog
 */
function showFindContactDialog() {
  var html = HtmlService.createHtmlOutput(`
    <style>
      body { font-family: Arial, sans-serif; padding: 15px; }
      .form-group { margin-bottom: 12px; }
      label { display: block; font-weight: bold; margin-bottom: 4px; }
      input { width: 100%; padding: 8px; box-sizing: border-box; }
      .btn { padding: 10px 20px; cursor: pointer; background: #1a73e8; color: white; border: none; }
      .result { background: #f5f5f5; padding: 15px; margin-top: 15px; border-radius: 4px; }
      .result h4 { margin: 0 0 10px 0; }
      .result p { margin: 5px 0; }
    </style>

    <h3>Find Contact</h3>

    <div class="form-group">
      <label>Email Address</label>
      <input type="email" id="email" placeholder="Enter email to search">
    </div>

    <button class="btn" onclick="search()">Search</button>

    <div id="results"></div>

    <script>
      function search() {
        var email = document.getElementById('email').value;
        if (!email) { alert('Please enter an email'); return; }

        google.script.run
          .withSuccessHandler(function(results) {
            if (results.length === 0) {
              document.getElementById('results').innerHTML = '<p>No contact found.</p>';
              return;
            }

            var html = '';
            results.forEach(function(r) {
              html += '<div class="result">';
              html += '<h4>' + (r.name || 'No name') + '</h4>';
              html += '<p><strong>Email:</strong> ' + r.email + '</p>';
              html += '<p><strong>Solution:</strong> ' + r.solution + '</p>';
              html += '<p><strong>Role:</strong> ' + r.role + '</p>';
              html += '<p><strong>Dept:</strong> ' + (r.department || 'N/A') + '</p>';
              html += '<p><strong>Notes:</strong> ' + (r.notes || 'None') + '</p>';
              html += '</div>';
            });

            document.getElementById('results').innerHTML = html;
          })
          .getFullContactInfo(email);
      }
    </script>
  `)
  .setWidth(450)
  .setHeight(500);

  SpreadsheetApp.getUi().showModalDialog(html, 'Find Contact');
}

/**
 * Get full contact info
 */
function getFullContactInfo(email) {
  var rows = findRowsByEmail(email);
  var sheet = getContactsSheet();
  var cols = getColumnIndices(sheet);

  return rows.map(function(r) {
    return {
      name: r.data[cols['name'] - 1] || '',
      email: r.data[cols['email'] - 1] || '',
      solution: r.data[cols['solution'] - 1] || '',
      role: r.data[cols['role'] - 1] || '',
      department: r.data[cols['department'] - 1] || '',
      notes: r.data[cols['notes'] - 1] || ''
    };
  });
}

/**
 * Show find by solution dialog
 */
function showFindBySolutionDialog() {
  var solutions = getUniqueSolutions();
  var options = solutions.map(function(s) {
    return '<option value="' + s + '">' + s + '</option>';
  }).join('');

  var html = HtmlService.createHtmlOutput(`
    <style>
      body { font-family: Arial, sans-serif; padding: 15px; }
      .form-group { margin-bottom: 12px; }
      label { display: block; font-weight: bold; margin-bottom: 4px; }
      select { width: 100%; padding: 8px; }
      .btn { padding: 10px 20px; cursor: pointer; background: #1a73e8; color: white; border: none; }
      table { width: 100%; border-collapse: collapse; margin-top: 15px; }
      th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 12px; }
      th { background: #f5f5f5; }
    </style>

    <h3>Find Contacts by Solution</h3>

    <div class="form-group">
      <label>Solution</label>
      <select id="solution">
        <option value="">-- Select Solution --</option>
        ${options}
      </select>
    </div>

    <button class="btn" onclick="search()">Search</button>

    <div id="results"></div>

    <script>
      function search() {
        var solution = document.getElementById('solution').value;
        if (!solution) { alert('Please select a solution'); return; }

        google.script.run
          .withSuccessHandler(function(results) {
            if (results.length === 0) {
              document.getElementById('results').innerHTML = '<p>No contacts found.</p>';
              return;
            }

            var html = '<p>Found ' + results.length + ' contacts:</p>';
            html += '<table><tr><th>Name</th><th>Email</th><th>Role</th></tr>';
            results.forEach(function(r) {
              html += '<tr>';
              html += '<td>' + (r.name || '-') + '</td>';
              html += '<td>' + r.email + '</td>';
              html += '<td>' + r.role + '</td>';
              html += '</tr>';
            });
            html += '</table>';

            document.getElementById('results').innerHTML = html;
          })
          .getContactsBySolution(solution);
      }
    </script>
  `)
  .setWidth(500)
  .setHeight(500);

  SpreadsheetApp.getUi().showModalDialog(html, 'Find by Solution');
}

/**
 * Get contacts by solution
 */
function getContactsBySolution(solution) {
  var sheet = getContactsSheet();
  var cols = getColumnIndices(sheet);
  var data = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();

  var results = [];
  for (var i = 0; i < data.length; i++) {
    if (data[i][cols['solution'] - 1] === solution) {
      results.push({
        name: data[i][cols['name'] - 1] || '',
        email: data[i][cols['email'] - 1] || '',
        role: data[i][cols['role'] - 1] || ''
      });
    }
  }

  return results;
}

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Validate all email addresses
 */
function validateEmails() {
  var sheet = getContactsSheet();
  var emailCol = getColumnIndex(sheet, 'email');
  if (emailCol === -1) {
    SpreadsheetApp.getUi().alert('Email column not found');
    return;
  }

  var data = sheet.getRange(2, emailCol, sheet.getLastRow() - 1, 1).getValues();
  var invalid = [];

  for (var i = 0; i < data.length; i++) {
    var email = data[i][0];
    if (!email || !email.toString().includes('@')) {
      invalid.push('Row ' + (i + 2) + ': ' + (email || '(empty)'));
    }
  }

  if (invalid.length === 0) {
    SpreadsheetApp.getUi().alert('All emails are valid!');
  } else {
    SpreadsheetApp.getUi().alert('Found ' + invalid.length + ' invalid emails:\n\n' + invalid.slice(0, 20).join('\n'));
  }
}

/**
 * Remove duplicate rows (same email + solution + role)
 */
function removeDuplicates() {
  var ui = SpreadsheetApp.getUi();
  var response = ui.alert('Remove Duplicates',
    'This will remove rows with duplicate email + solution + role combinations. Continue?',
    ui.ButtonSet.YES_NO);

  if (response !== ui.Button.YES) return;

  var sheet = getContactsSheet();
  var cols = getColumnIndices(sheet);
  var data = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();

  var seen = {};
  var rowsToDelete = [];

  for (var i = 0; i < data.length; i++) {
    var key = [
      data[i][cols['email'] - 1],
      data[i][cols['solution'] - 1],
      data[i][cols['role'] - 1]
    ].join('|||');

    if (seen[key]) {
      rowsToDelete.push(i + 2);
    } else {
      seen[key] = true;
    }
  }

  // Delete from bottom up
  for (var i = rowsToDelete.length - 1; i >= 0; i--) {
    sheet.deleteRow(rowsToDelete[i]);
  }

  ui.alert('Removed ' + rowsToDelete.length + ' duplicate rows.');
}

/**
 * Sort sheet by solution name
 */
function sortBySolution() {
  var sheet = getContactsSheet();
  var solCol = getColumnIndex(sheet, 'solution');
  if (solCol === -1) {
    SpreadsheetApp.getUi().alert('Solution column not found');
    return;
  }

  var range = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn());
  range.sort({column: solCol, ascending: true});

  SpreadsheetApp.getUi().alert('Sorted by solution name.');
}
