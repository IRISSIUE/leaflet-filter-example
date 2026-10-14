const dataFileName = "data.csv";

// ============================================
// Main entry point
// ============================================

// Async function using the Promise helper
export async function loadSiteData() {
  const csvPath = dataFileName;
  const results = await parseCSV(csvPath);

  const rawFields =
    results.meta && results.meta.fields ? results.meta.fields : [];
  const fields = rawFields.map(function (field) {
    return normalizeText(field);
  });

  if (!fields.length) {
    throw new Error("No header fields found in CSV");
  }

  const rows = (results.data || []).map(function (row) {
    return normalizeRow(row, fields);
  });

  return rows;
}

// ============================================
// Helper functions
// ============================================

// Helper: wraps Papa.parse in a Promise
function parseCSV(csvPath) {
  return new Promise(function (resolve, reject) {
    Papa.parse(csvPath, {
      download: true,
      header: true,
      skipEmptyLines: true,
      transformHeader: function (header) {
        return normalizeText(header);
      },
      transform: function (value) {
        return normalizeText(value);
      },
      complete: function (results) {
        resolve(results);
      },
      error: function (err) {
        reject(err);
      },
    });
  });
}

// ============================================
// Utility functions
// ============================================

/*
    Ensure that all text values from the CSV are normalized by trimming whitespace 
    and converting undefined or null values to empty strings.
*/
export function normalizeText(value) {
  if (value === undefined || value === null) {
    return "";
  }
  return String(value).trim();
}

function normalizeRow(row, fields) {
  var out = {};

  fields.forEach(function (field) {
    out[field] = normalizeText(row[field]);
  });

  return out;
}
