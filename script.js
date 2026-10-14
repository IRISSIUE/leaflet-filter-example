import { loadSiteData } from "./data-loader.js";
import { normalizeText } from "./data-loader.js";

// ============================================
// Module-level state
// ============================================
const map = L.map("map").setView([20, 0], 2);
const markers = [];

// Initialize Leaflet map
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution: "&copy; OpenStreetMap contributors",
}).addTo(map);

// ============================================
// Main entry point
// ============================================

// Load data from external source, then add those sites/markers to the map
loadSiteData()
  .then(function (rows) {
    console.log("Loaded rows:", rows);
    addMarkersAndFiltersToMap(rows);
  })
  .catch(function (err) {
    console.error("Error loading CSV", err);
    document.getElementById("filters-list").textContent =
      "Error loading data.csv";
  });

// ============================================
// Main orchestrator
// ============================================

function addMarkersAndFiltersToMap(locations) {
  renderFiltersFromLocations(locations);

  var bounds = renderMarkersFromLocations(locations);

  if (bounds.length) map.fitBounds(bounds);

  filterSites();
}

// ============================================
// High-level functions
// ============================================

function renderFiltersFromLocations(locations) {
  var filtersHTMLElement = document.getElementById("filters-list");
  filtersHTMLElement.innerHTML = "";

  var fields = getFieldNames(locations);
  var filters = getFilterableFields(fields);

  if (!filters.length) {
    filtersHTMLElement.textContent = "No filter columns found";
    return;
  }

  filters.forEach(function (filter) {
    var id = generateFilterIDFromText(filter.key);
    var label = document.createElement("label");
    var input = document.createElement("input");
    input.type = "checkbox";
    input.id = id;
    input.dataset.col = filter.key;
    input.addEventListener("change", filterSites);
    label.appendChild(input);
    var span = document.createElement("span");
    span.style.marginLeft = "6px";
    span.textContent = filter.label;
    label.appendChild(span);
    filtersHTMLElement.appendChild(label);
  });
}

function renderMarkersFromLocations(locations) {
  var bounds = [];

  var fields = getFieldNames(locations);
  var filters = getFilterableFields(fields);

  locations.forEach(function (location) {
    const lat = parseFloat(location["Lat"]);
    const lon = parseFloat(location["Lon"]);
    if (!isFinite(lat) || !isFinite(lon)) {
      var filtersHTMLElement = document.getElementById("filters-list");
      filtersHTMLElement.innerHTML = "No Lat or Lon specified";
      return;
    }
    const name = location["Name"] ? location["Name"] : "";
    const desc = location["Description"] ? location["Description"] : "";

    var filterNames = {};
    filters.forEach(function (filter) {
      filterNames[filter.key] = parseBool(location[filter.key]);
    });

    var marker = L.marker([lat, lon]);
    var popupHtml = buildPopupHtml(name, desc, filterNames);
    marker.bindPopup(popupHtml);
    marker.addTo(map);

    markers.push({ marker: marker, data: filterNames });
    bounds.push([lat, lon]);
  });

  return bounds;
}

function filterSites() {
  // Show markers that match ALL checked filters (AND). When none checked, show all.
  var active = [];
  var inputs = document.querySelectorAll("#filters-list input[type=checkbox]");
  inputs.forEach(function (inp) {
    if (inp.checked) active.push(inp.dataset.col);
  });

  markers.forEach(function (m) {
    var visible;
    if (active.length === 0) {
      visible = true;
    } else {
      visible = active.every(function (col) {
        return !!m.data[col];
      });
    }
    var onMap = map.hasLayer(m.marker);
    if (visible && !onMap) map.addLayer(m.marker);
    if (!visible && onMap) map.removeLayer(m.marker);
  });
}

// ============================================
// Mid-level helpers
// ============================================

function getFieldNames(rows) {
  if (!rows.length) {
    return [];
  }
  return Object.keys(rows[0]);
}

function getFilterableFields(fields) {
  var filterPrefix = "filter:";
  var filters = [];

  fields.forEach(function (field) {
    var clean = normalizeText(field);
    var lower = clean.toLowerCase();
    if (lower.startsWith(filterPrefix)) {
      filters.push({
        key: clean,
        label: clean.slice(filterPrefix.length).trim() || clean,
      });
    }
  });

  return filters;
}

function findFieldName(fields, candidates) {
  var i;
  var j;
  for (i = 0; i < fields.length; i++) {
    var fieldLower = normalizeText(fields[i]).toLowerCase();
    for (j = 0; j < candidates.length; j++) {
      if (fieldLower === candidates[j]) {
        return fields[i];
      }
    }
  }
  return null;
}

function buildPopupHtml(infoName, infoDesc, filterValues) {
  var html =
    "<strong>" +
    (infoName || "Location") +
    "</strong>" +
    (infoDesc ? "<br>" + infoDesc : "");
  for (var key in filterValues) {
    if (filterValues[key]) {
      // strip "filter:" prefix from the filter key for display
      var label = String(key || "");
      var prefix = "filter:";
      var low = key.toLowerCase();
      if (low.indexOf(prefix) === 0) {
        label = label.slice(prefix.length).trim();
      }
      html += "<br><em>" + label + "</em>";
    }
  }
  return html;
}

// ============================================
// Low-level utilities
// ============================================

function parseBool(value) {
  var text = normalizeText(value).toLowerCase();
  return text === "1" || text === "true" || text === "yes" || text === "y";
}

function generateFilterIDFromText(text) {
  var input = String(text || "").toLowerCase();
  var out = "filter_";
  var i;
  for (i = 0; i < input.length; i++) {
    var ch = input[i];
    var code = input.charCodeAt(i);
    var isNumber = code >= 48 && code <= 57;
    var isLetter = code >= 97 && code <= 122;
    out += isNumber || isLetter ? ch : "_";
  }
  return out;
}
