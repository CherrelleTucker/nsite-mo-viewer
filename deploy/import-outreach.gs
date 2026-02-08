/**
 * Import Outreach Events
 * ======================
 * Migration from Potential Events & Outreach Ideas Tracker to MO-DB_Outreach
 *
 * Bind this script to MO-DB_Outreach spreadsheet, then:
 * 1. Set OUTREACH_SOURCE_ID in Script Properties (source tracker spreadsheet ID)
 * 2. Run importOutreachEvents() from the Apps Script editor
 */

// ============================================================================
// SCHEMA
// ============================================================================

var OUTREACH_SCHEMA = [
  'event_id',
  'name',
  'event_type',
  'status',
  'source',
  'start_date',
  'end_date',
  'deadline',
  'purpose',
  'solution_names',
  'team_members',
  'stakeholders',
  'location',
  'event_url',
  'presentation_url',
  'priority',
  'sector',
  'year',
  'notes',
  'search_query',
  'created_at',
  'created_by'
];

// ============================================================================
// MAIN IMPORT FUNCTION
// ============================================================================

/**
 * Main import function - run this from the Apps Script editor
 */
function importOutreachEvents() {
  Logger.log('='.repeat(50));
  Logger.log('Outreach Events Import');
  Logger.log('='.repeat(50));

  // Get source spreadsheet from Script Properties
  var sourceId = PropertiesService.getScriptProperties().getProperty('OUTREACH_SOURCE_ID');
  if (!sourceId) {
    throw new Error('Set OUTREACH_SOURCE_ID in Script Properties (File > Project properties > Script properties).');
  }

  // Target is this container spreadsheet
  var targetSS = SpreadsheetApp.getActiveSpreadsheet();
  var targetSheet = targetSS.getSheetByName('Outreach') || targetSS.getSheets()[0];

  Logger.log('Source: ' + sourceId);
  Logger.log('Target: ' + targetSS.getName() + ' (this spreadsheet)');

  // Open source spreadsheet
  var sourceSS = SpreadsheetApp.openById(sourceId);

  Logger.log('Source sheets: ' + sourceSS.getSheets().map(function(s) { return s.getName(); }).join(', '));

  // Load sector mapping first
  Logger.log('');
  Logger.log('Loading sector mapping...');
  var sectorMapping = importOutreachMapping_(sourceSS);
  Logger.log('  Found ' + Object.keys(sectorMapping).length + ' conference-sector mappings');

  // Import all event sheets
  Logger.log('');
  Logger.log('Importing events...');
  var allRecords = [];
  var idCounter = 1;

  // Year sheets
  var yearSheets = ['2025', '2026 Options', '2026 Targets', '2027', 'Unknown Date'];
  yearSheets.forEach(function(sheetName) {
    var records = importEventSheet_(sourceSS, sheetName, idCounter);
    allRecords = allRecords.concat(records);
    idCounter += records.length + 50;
  });

  // Highly specific conferences
  var specificRecords = importHighlySpecific_(sourceSS, idCounter);
  allRecords = allRecords.concat(specificRecords);

  // Apply sector mapping
  Logger.log('');
  Logger.log('Applying sector mappings...');
  var mappedCount = 0;
  allRecords.forEach(function(record) {
    var name = record.name;
    if (sectorMapping[name]) {
      record.sector = sectorMapping[name].sectors.join(', ');
      if (sectorMapping[name].priority) {
        var priorityMap = {1: 'high', 2: 'medium', 3: 'low'};
        record.priority = priorityMap[sectorMapping[name].priority] || 'medium';
      }
      mappedCount++;
    }
  });
  Logger.log('  Applied sector to ' + mappedCount + ' events');

  // Deduplicate by name
  Logger.log('');
  Logger.log('Deduplicating...');
  var seen = {};
  allRecords.forEach(function(record) {
    var nameLower = record.name.toLowerCase().trim();
    if (!seen[nameLower]) {
      seen[nameLower] = record;
    } else {
      // Keep the one with more filled fields
      var existingFilled = countFilledFields_(seen[nameLower]);
      var newFilled = countFilledFields_(record);
      if (newFilled > existingFilled) {
        seen[nameLower] = record;
      }
    }
  });

  var dedupedRecords = Object.values(seen);
  Logger.log('  Reduced ' + allRecords.length + ' to ' + dedupedRecords.length + ' unique events');

  // Sort by year and start_date
  dedupedRecords.sort(function(a, b) {
    if (a.year !== b.year) return (a.year || 9999) - (b.year || 9999);
    var dateA = a.start_date ? new Date(a.start_date) : new Date('2099-12-31');
    var dateB = b.start_date ? new Date(b.start_date) : new Date('2099-12-31');
    return dateA - dateB;
  });

  // Write to target sheet
  Logger.log('');
  Logger.log('Writing ' + dedupedRecords.length + ' records to target...');

  // Clear existing data and write headers
  targetSheet.clear();
  targetSheet.getRange(1, 1, 1, OUTREACH_SCHEMA.length).setValues([OUTREACH_SCHEMA]);

  // Write data
  if (dedupedRecords.length > 0) {
    var dataRows = dedupedRecords.map(function(record) {
      return OUTREACH_SCHEMA.map(function(col) {
        return record[col] || '';
      });
    });
    targetSheet.getRange(2, 1, dataRows.length, OUTREACH_SCHEMA.length).setValues(dataRows);
  }

  // Format header row
  var headerRange = targetSheet.getRange(1, 1, 1, OUTREACH_SCHEMA.length);
  headerRange.setFontWeight('bold');
  headerRange.setBackground('#f3f3f3');
  targetSheet.setFrozenRows(1);

  Logger.log('');
  Logger.log('Import complete!');
  Logger.log('Total records: ' + dedupedRecords.length);

  // Summary by status
  var statusCounts = {};
  dedupedRecords.forEach(function(r) {
    var status = r.status || 'unknown';
    statusCounts[status] = (statusCounts[status] || 0) + 1;
  });
  Logger.log('');
  Logger.log('Records by status:');
  Object.keys(statusCounts).forEach(function(status) {
    Logger.log('  ' + status + ': ' + statusCounts[status]);
  });

  // Summary by year
  var yearCounts = {};
  dedupedRecords.forEach(function(r) {
    var year = r.year || 'unknown';
    yearCounts[year] = (yearCounts[year] || 0) + 1;
  });
  Logger.log('');
  Logger.log('Records by year:');
  Object.keys(yearCounts).sort().forEach(function(year) {
    Logger.log('  ' + year + ': ' + yearCounts[year]);
  });

  return dedupedRecords.length;
}

// ============================================================================
// IMPORT HELPERS
// ============================================================================

/**
 * Import a single event sheet
 */
function importEventSheet_(sourceSS, sheetName, startId) {
  var sheet = sourceSS.getSheetByName(sheetName);
  if (!sheet) {
    Logger.log('  Sheet "' + sheetName + '" not found');
    return [];
  }

  var data = sheet.getDataRange().getValues();
  if (data.length < 2) {
    Logger.log('  Sheet "' + sheetName + '" is empty');
    return [];
  }

  var headers = data[0];
  var records = [];

  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var rowObj = {};
    headers.forEach(function(h, j) {
      rowObj[h] = row[j];
    });

    var name = cleanText_(rowObj['Name']);
    if (!name) continue;

    var startDate = rowObj['Start Date'];

    records.push({
      event_id: generateEventId_(startId + i, startDate),
      name: name,
      event_type: detectEventType_(name),
      status: determineStatus_(sheetName, startDate),
      source: 'import',
      start_date: parseDate_(startDate),
      end_date: parseDate_(rowObj['End Date']),
      deadline: parseDate_(rowObj['Relevant Deadlines']),
      purpose: cleanText_(rowObj['Purpose (Meeting? Presentation? What\'s the impact?)']),
      solution_names: cleanText_(rowObj['Relevant Solutions']),
      team_members: cleanText_(rowObj['Supporting the Project...']),
      stakeholders: cleanText_(rowObj['Stakeholders or Audience']),
      location: cleanText_(rowObj['Location/Venue']),
      event_url: cleanText_(rowObj['Link to Event']),
      presentation_url: cleanText_(rowObj['Link to shared drive with presentation (if applicable)']),
      priority: 'medium',
      sector: '',
      year: extractYear_(startDate, sheetName),
      notes: cleanText_(rowObj['Notes']),
      search_query: '',
      created_at: new Date().toISOString(),
      created_by: 'import_script'
    });
  }

  Logger.log('  Imported ' + records.length + ' records from ' + sheetName);
  return records;
}

/**
 * Import Highly Specific Conferences sheet
 */
function importHighlySpecific_(sourceSS, startId) {
  var sheetName = 'Highly Specific Conferences fro';
  var sheet = sourceSS.getSheetByName(sheetName);
  if (!sheet) {
    Logger.log('  Sheet "' + sheetName + '" not found');
    return [];
  }

  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];

  var headers = data[0];
  var records = [];

  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var rowObj = {};
    headers.forEach(function(h, j) {
      rowObj[h] = row[j];
    });

    var name = cleanText_(rowObj['Name']);
    if (!name) continue;

    var startDate = rowObj['Start Date'];
    var needId = rowObj['Need ID 2024'];

    records.push({
      event_id: generateEventId_(startId + i, startDate),
      name: name,
      event_type: detectEventType_(name),
      status: 'potential',
      source: 'import',
      start_date: parseDate_(startDate),
      end_date: parseDate_(rowObj['End Date']),
      deadline: parseDate_(rowObj['Relevant Deadlines']),
      purpose: cleanText_(rowObj['Purpose (Meeting? Presentation? What\'s the impact?)']),
      solution_names: cleanText_(rowObj['Relevant Solutions']),
      team_members: cleanText_(rowObj['Supporting the Project...']),
      stakeholders: cleanText_(rowObj['Stakeholders or Audience']),
      location: cleanText_(rowObj['Location/Venue']),
      event_url: cleanText_(rowObj['Link to Event']),
      presentation_url: cleanText_(rowObj['Link to shared drive with presentation (if applicable)']),
      priority: 'medium',
      sector: '',
      year: extractYear_(startDate, ''),
      notes: needId ? 'Need ID: ' + needId : '',
      search_query: '',
      created_at: new Date().toISOString(),
      created_by: 'import_script'
    });
  }

  Logger.log('  Imported ' + records.length + ' records from Highly Specific Conferences');
  return records;
}

/**
 * Import sector-to-conference mapping
 */
function importOutreachMapping_(sourceSS) {
  var sheetName = '2026 Outreach Mapping';
  var sheet = sourceSS.getSheetByName(sheetName);
  if (!sheet) return {};

  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return {};

  var headers = data[0];
  var mapping = {};

  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var sector = cleanText_(row[0]); // First column is sector
    if (!sector) continue;

    // Gather all conference names from the row
    var priority = null;
    for (var j = 1; j < headers.length; j++) {
      var header = headers[j];
      var value = cleanText_(row[j]);

      if (header === 'Priority' && value) {
        priority = parseInt(value, 10);
        continue;
      }

      if (value && !header.startsWith('Unnamed')) {
        if (!mapping[value]) {
          mapping[value] = {sectors: [], priority: null};
        }
        mapping[value].sectors.push(sector);
        if (priority) {
          mapping[value].priority = priority;
        }
      }
    }
  }

  return mapping;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function cleanText_(val) {
  if (val === null || val === undefined || val === '') return '';
  return String(val).trim();
}

function parseDate_(val) {
  if (!val) return '';
  if (val instanceof Date) {
    return Utilities.formatDate(val, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }
  try {
    var date = new Date(val);
    if (!isNaN(date.getTime())) {
      return Utilities.formatDate(date, Session.getScriptTimeZone(), 'yyyy-MM-dd');
    }
  } catch (e) {}
  return '';
}

function generateEventId_(index, dateVal) {
  var dateStr;
  if (dateVal && dateVal instanceof Date) {
    dateStr = Utilities.formatDate(dateVal, Session.getScriptTimeZone(), 'yyyyMMdd');
  } else if (dateVal) {
    try {
      var date = new Date(dateVal);
      if (!isNaN(date.getTime())) {
        dateStr = Utilities.formatDate(date, Session.getScriptTimeZone(), 'yyyyMMdd');
      } else {
        dateStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd');
      }
    } catch (e) {
      dateStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd');
    }
  } else {
    dateStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd');
  }

  var paddedIndex = ('0000' + index).slice(-4);
  return 'EVT_' + dateStr + '_' + paddedIndex;
}

function detectEventType_(name) {
  if (!name) return 'conference';
  var nameLower = name.toLowerCase();

  if (nameLower.includes('workshop')) return 'workshop';
  if (nameLower.includes('webinar') || nameLower.includes('virtual')) return 'webinar';
  if (nameLower.includes('meeting') || nameLower.includes('face to face') || nameLower.includes('f2f')) return 'meeting';
  if (nameLower.includes('visit') || nameLower.includes('tour')) return 'site_visit';

  return 'conference';
}

function determineStatus_(sheetName, startDate) {
  var today = new Date();

  if (sheetName === '2025') {
    if (startDate) {
      var eventDate = startDate instanceof Date ? startDate : new Date(startDate);
      if (!isNaN(eventDate.getTime()) && eventDate < today) {
        return 'attended';
      }
    }
    return 'confirmed';
  }

  if (sheetName === '2026 Targets') return 'confirmed';
  if (sheetName === '2026 Options') return 'potential';
  if (sheetName === '2027') return 'considering';

  return 'potential';
}

function extractYear_(startDate, sheetName) {
  if (startDate) {
    var date = startDate instanceof Date ? startDate : new Date(startDate);
    if (!isNaN(date.getTime())) {
      return date.getFullYear();
    }
  }

  // Extract from sheet name
  var match = sheetName.match(/(202\d)/);
  if (match) {
    return parseInt(match[1], 10);
  }

  return 0;
}

function countFilledFields_(record) {
  var count = 0;
  for (var key in record) {
    if (record[key]) count++;
  }
  return count;
}
