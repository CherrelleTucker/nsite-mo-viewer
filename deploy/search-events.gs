/**
 * Add Events to Database
 * ======================
 * Simple event entry for MO-DB_Outreach
 * No API keys or external accounts required
 */

function onOpen() {
  SpreadsheetApp.getUi().createMenu('Add Events')
    .addItem('Add New Event...', 'showAddEventDialog')
    .addItem('Add from URL...', 'showAddFromUrlDialog')
    .addSeparator()
    .addItem('Find Duplicates', 'findDuplicates')
    .addToUi();
}

// ============================================================================
// ADD EVENT DIALOG
// ============================================================================

function showAddEventDialog() {
  var html = HtmlService.createHtmlOutput(`
    <style>
      * { box-sizing: border-box; }
      body { font-family: Arial, sans-serif; padding: 20px; margin: 0; }
      h3 { margin: 0 0 15px 0; color: #333; }
      label { display: block; margin-bottom: 4px; font-weight: bold; color: #555; }
      input, select, textarea {
        width: 100%; padding: 8px; margin-bottom: 12px;
        border: 1px solid #ccc; border-radius: 4px; font-size: 14px;
      }
      input:focus, select:focus, textarea:focus { border-color: #4285f4; outline: none; }
      textarea { height: 70px; resize: vertical; }
      .row { display: flex; gap: 12px; }
      .row > div { flex: 1; }
      button {
        background: #4285f4; color: white; border: none;
        padding: 12px 24px; border-radius: 4px; cursor: pointer;
        font-size: 14px; width: 100%; margin-top: 8px;
      }
      button:hover { background: #3367d6; }
      .required { color: #d93025; }
    </style>

    <h3>Add New Event</h3>

    <label>Event Name <span class="required">*</span></label>
    <input type="text" id="name" placeholder="e.g., AGU Fall Meeting 2026">

    <div class="row">
      <div>
        <label>Type</label>
        <select id="eventType">
          <option value="conference">Conference</option>
          <option value="workshop">Workshop</option>
          <option value="webinar">Webinar</option>
          <option value="meeting">Meeting</option>
          <option value="site_visit">Site Visit</option>
        </select>
      </div>
      <div>
        <label>Status</label>
        <select id="status">
          <option value="potential">Potential</option>
          <option value="considering">Considering</option>
          <option value="confirmed">Confirmed</option>
        </select>
      </div>
    </div>

    <div class="row">
      <div>
        <label>Start Date</label>
        <input type="date" id="startDate">
      </div>
      <div>
        <label>End Date</label>
        <input type="date" id="endDate">
      </div>
      <div>
        <label>Year</label>
        <select id="year">
          <option value="2025">2025</option>
          <option value="2026" selected>2026</option>
          <option value="2027">2027</option>
          <option value="2028">2028</option>
        </select>
      </div>
    </div>

    <label>Location</label>
    <input type="text" id="location" placeholder="e.g., San Francisco, CA">

    <label>Event Website</label>
    <input type="url" id="eventUrl" placeholder="https://...">

    <div class="row">
      <div>
        <label>Sector</label>
        <select id="sector">
          <option value="">-- Select --</option>
          <option value="Agriculture">Agriculture</option>
          <option value="Water Resources">Water Resources</option>
          <option value="Disasters">Disasters</option>
          <option value="Ecological Conservation">Ecological Conservation</option>
          <option value="Climate">Climate</option>
          <option value="Wildland Fires">Wildland Fires</option>
          <option value="Land Use">Land Use</option>
          <option value="Energy">Energy</option>
        </select>
      </div>
      <div>
        <label>Priority</label>
        <select id="priority">
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="low">Low</option>
        </select>
      </div>
    </div>

    <label>Relevant Solutions</label>
    <input type="text" id="solutions" placeholder="e.g., HLS, OPERA, NISAR">

    <label>Notes</label>
    <textarea id="notes" placeholder="Any additional details..."></textarea>

    <button onclick="addEvent()">Add Event</button>

    <script>
      function addEvent() {
        var name = document.getElementById('name').value.trim();
        if (!name) { alert('Please enter an event name'); return; }

        var data = {
          name: name,
          event_type: document.getElementById('eventType').value,
          status: document.getElementById('status').value,
          start_date: document.getElementById('startDate').value,
          end_date: document.getElementById('endDate').value,
          year: parseInt(document.getElementById('year').value),
          location: document.getElementById('location').value.trim(),
          event_url: document.getElementById('eventUrl').value.trim(),
          sector: document.getElementById('sector').value,
          priority: document.getElementById('priority').value,
          solution_names: document.getElementById('solutions').value.trim(),
          notes: document.getElementById('notes').value.trim()
        };

        google.script.run
          .withSuccessHandler(function() {
            alert('Added: ' + name);
            document.getElementById('name').value = '';
            document.getElementById('startDate').value = '';
            document.getElementById('endDate').value = '';
            document.getElementById('location').value = '';
            document.getElementById('eventUrl').value = '';
            document.getElementById('solutions').value = '';
            document.getElementById('notes').value = '';
            document.getElementById('name').focus();
          })
          .withFailureHandler(function(err) { alert('Error: ' + err); })
          .addEvent(data);
      }
    </script>
  `).setWidth(480).setHeight(620);
  SpreadsheetApp.getUi().showModalDialog(html, 'Add Event');
}

// ============================================================================
// ADD FROM URL DIALOG
// ============================================================================

function showAddFromUrlDialog() {
  var html = HtmlService.createHtmlOutput(`
    <style>
      * { box-sizing: border-box; }
      body { font-family: Arial, sans-serif; padding: 20px; margin: 0; }
      h3 { margin: 0 0 10px 0; color: #333; }
      p { color: #666; font-size: 13px; margin: 0 0 15px 0; }
      label { display: block; margin-bottom: 4px; font-weight: bold; color: #555; }
      input, select {
        width: 100%; padding: 8px; margin-bottom: 12px;
        border: 1px solid #ccc; border-radius: 4px; font-size: 14px;
      }
      .row { display: flex; gap: 12px; }
      .row > div { flex: 1; }
      button {
        background: #4285f4; color: white; border: none;
        padding: 12px 24px; border-radius: 4px; cursor: pointer;
        font-size: 14px; width: 100%; margin-top: 8px;
      }
      button:hover { background: #3367d6; }
    </style>

    <h3>Add from URL</h3>
    <p>Paste an event website URL. The event name will be pulled from the page title.</p>

    <label>Event URL</label>
    <input type="url" id="url" placeholder="https://conference-website.com">

    <div class="row">
      <div>
        <label>Sector</label>
        <select id="sector">
          <option value="">-- Select --</option>
          <option value="Agriculture">Agriculture</option>
          <option value="Water Resources">Water Resources</option>
          <option value="Disasters">Disasters</option>
          <option value="Ecological Conservation">Ecological Conservation</option>
          <option value="Climate">Climate</option>
          <option value="Wildland Fires">Wildland Fires</option>
          <option value="Land Use">Land Use</option>
          <option value="Energy">Energy</option>
        </select>
      </div>
      <div>
        <label>Year</label>
        <select id="year">
          <option value="2025">2025</option>
          <option value="2026" selected>2026</option>
          <option value="2027">2027</option>
          <option value="2028">2028</option>
        </select>
      </div>
    </div>

    <button onclick="addFromUrl()">Add Event</button>

    <script>
      function addFromUrl() {
        var url = document.getElementById('url').value.trim();
        if (!url) { alert('Please enter a URL'); return; }

        google.script.run
          .withSuccessHandler(function(name) {
            alert('Added: ' + name);
            document.getElementById('url').value = '';
          })
          .withFailureHandler(function(err) { alert('Error: ' + err); })
          .addEventFromUrl(url, document.getElementById('sector').value, parseInt(document.getElementById('year').value));
      }
    </script>
  `).setWidth(400).setHeight(320);
  SpreadsheetApp.getUi().showModalDialog(html, 'Add from URL');
}

// ============================================================================
// CORE FUNCTIONS
// ============================================================================

function addEvent(data) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

  if (isDuplicate_(data.name)) {
    throw new Error('Event already exists: ' + data.name);
  }

  var timestamp = new Date().toISOString();
  var newRow = headers.map(function(h) {
    switch (h) {
      case 'event_id': return generateEventId_();
      case 'name': return data.name;
      case 'event_type': return data.event_type || 'conference';
      case 'status': return data.status || 'potential';
      case 'source': return 'manual';
      case 'start_date': return data.start_date || '';
      case 'end_date': return data.end_date || '';
      case 'year': return data.year || 2026;
      case 'location': return data.location || '';
      case 'event_url': return data.event_url || '';
      case 'sector': return data.sector || '';
      case 'priority': return data.priority || 'medium';
      case 'solution_names': return data.solution_names || '';
      case 'notes': return data.notes || '';
      case 'created_at': return timestamp;
      case 'created_by': return 'manual';
      default: return '';
    }
  });

  sheet.appendRow(newRow);
}

function addEventFromUrl(url, sector, year) {
  var response = UrlFetchApp.fetch(url, { muteHttpExceptions: true, followRedirects: true });
  var html = response.getContentText();

  // Get title from page
  var title = '';
  var match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (match) {
    title = match[1]
      .replace(/\s*[-|–—:]\s*.*/g, '') // Remove suffix
      .replace(/&amp;/g, '&')
      .replace(/&nbsp;/g, ' ')
      .replace(/&#\d+;/g, '')
      .trim();
  }

  if (!title) {
    var ogMatch = html.match(/<meta[^>]+property="og:title"[^>]+content="([^"]+)"/i);
    if (ogMatch) title = ogMatch[1].trim();
  }

  if (!title) throw new Error('Could not get event name from page');

  if (isDuplicate_(title)) {
    throw new Error('Event already exists: ' + title);
  }

  var desc = '';
  var descMatch = html.match(/<meta[^>]+name="description"[^>]+content="([^"]+)"/i);
  if (descMatch) desc = descMatch[1].substring(0, 500);

  addEvent({
    name: title,
    event_type: detectType_(title),
    status: 'potential',
    source: 'url',
    year: year || 2026,
    event_url: url,
    sector: sector || '',
    notes: desc
  });

  return title;
}

function findDuplicates() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var nameCol = headers.indexOf('name');
  if (nameCol === -1) { SpreadsheetApp.getUi().alert('No "name" column'); return; }

  var seen = {};
  var dupes = [];
  for (var i = 1; i < data.length; i++) {
    var name = data[i][nameCol];
    if (!name) continue;
    var key = name.toString().toLowerCase().trim();
    if (seen[key]) {
      dupes.push('Row ' + (i + 1) + ': ' + name);
    } else {
      seen[key] = true;
    }
  }

  if (dupes.length === 0) {
    SpreadsheetApp.getUi().alert('No duplicates found!');
  } else {
    SpreadsheetApp.getUi().alert('Found ' + dupes.length + ' duplicate(s):\n\n' + dupes.slice(0, 15).join('\n'));
  }
}

// ============================================================================
// HELPERS
// ============================================================================

function isDuplicate_(name) {
  if (!name) return false;
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var nameCol = headers.indexOf('name');
  if (nameCol === -1) return false;

  var key = name.toLowerCase().trim();
  for (var i = 1; i < data.length; i++) {
    var existing = data[i][nameCol];
    if (existing && existing.toString().toLowerCase().trim() === key) return true;
  }
  return false;
}

function generateEventId_() {
  var d = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd');
  var r = Math.floor(Math.random() * 9000) + 1000;
  return 'EVT_' + d + '_' + r;
}

function detectType_(name) {
  if (!name) return 'conference';
  var n = name.toLowerCase();
  if (n.includes('workshop')) return 'workshop';
  if (n.includes('webinar')) return 'webinar';
  if (n.includes('meeting')) return 'meeting';
  return 'conference';
}
