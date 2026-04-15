// ============================================================
// SafeRoute AI — Main Application
// ============================================================
// Orchestrates Google Maps, Safe Mode engine, and Gemini AI.
// ============================================================

let map;
let directionsService;
let directionsRenderers = [];
let heatmapLayer;
let autocompleteOrigin;
let autocompleteDestination;

let safeModeEnabled = false;
let currentRoutes = [];
let selectedRouteIndex = 0;

// ── DOM References ──
const $safeModeCheckbox = document.getElementById("safeModeCheckbox");
const $safeModeLabel    = document.getElementById("safeModeLabel");
const $modeIndicator    = document.getElementById("modeIndicator");
const $modeText         = document.getElementById("modeIndicatorText");
const $originInput      = document.getElementById("originInput");
const $destInput        = document.getElementById("destinationInput");
const $routeBtn         = document.getElementById("routeBtn");
const $resultsPanel     = document.getElementById("resultsPanel");
const $resultsTitle     = document.getElementById("resultsTitle");
const $resultsClose     = document.getElementById("resultsClose");
const $routeCards       = document.getElementById("routeCards");
const $scoreSection     = document.getElementById("scoreSection");
const $scoreRingFill    = document.getElementById("scoreRingFill");
const $scoreNumber      = document.getElementById("scoreNumber");
const $scoreTierText    = document.getElementById("scoreTierText");
const $scoreSummary     = document.getElementById("scoreSummary");
const $aiBriefing       = document.getElementById("aiBriefing");
const $aiBriefingText   = document.getElementById("aiBriefingText");
const $normalResult     = document.getElementById("normalResult");
const $normalRouteTitle = document.getElementById("normalRouteTitle");
const $normalRouteInfo  = document.getElementById("normalRouteInfo");
const $crimeLegend      = document.getElementById("crimeLegend");
const $toast            = document.getElementById("toast");
const $themeBtn         = document.getElementById("themeBtn");


// ═══════════════════════════════════════════════════
//  MAP INITIALIZATION
// ═══════════════════════════════════════════════════

function initMap() {
  map = new google.maps.Map(document.getElementById("map"), {
    center: CONFIG.MAP.CENTER,
    zoom: CONFIG.MAP.ZOOM,
    styles: CONFIG.MAP.STYLES,
    disableDefaultUI: true,
    zoomControl: true,
    zoomControlOptions: {
      position: google.maps.ControlPosition.RIGHT_CENTER
    },
    mapTypeControl: false,
    streetViewControl: false,
    fullscreenControl: false
  });

  directionsService = new google.maps.DirectionsService();

  // ── Apply saved theme on load ──
  const savedTheme = localStorage.getItem("saferoute-theme") || "dark";
  applyTheme(savedTheme);

  // ── Theme button ──
  $themeBtn.addEventListener("click", () => {
    const current = document.body.getAttribute("data-theme");
    applyTheme(current === "dark" ? "light" : "dark");
  });

  // ── Places Autocomplete ──
  const autocompleteOpts = {
    componentRestrictions: { country: "in" },
    fields: ["place_id", "formatted_address", "geometry", "name"]
  };

  autocompleteOrigin = new google.maps.places.Autocomplete($originInput, autocompleteOpts);
  autocompleteDestination = new google.maps.places.Autocomplete($destInput, autocompleteOpts);

  autocompleteOrigin.bindTo("bounds", map);
  autocompleteDestination.bindTo("bounds", map);

  // Enable route button when both inputs have values
  autocompleteOrigin.addListener("place_changed", checkInputs);
  autocompleteDestination.addListener("place_changed", checkInputs);
  $originInput.addEventListener("input", checkInputs);
  $destInput.addEventListener("input", checkInputs);

  // ── Heatmap Layer (hidden initially) ──
  heatmapLayer = new google.maps.visualization.HeatmapLayer({
    data: [],
    map: null,
    radius: 40,
    opacity: 0.6,
    gradient: [
      "rgba(0, 0, 0, 0)",
      "rgba(255, 165, 2, 0.4)",
      "rgba(255, 99, 72, 0.6)",
      "rgba(255, 71, 87, 0.8)",
      "rgba(255, 30, 50, 1)"
    ]
  });

  // ── Event listeners ──
  $safeModeCheckbox.addEventListener("change", toggleSafeMode);
  $routeBtn.addEventListener("click", getRoute);
  $resultsClose.addEventListener("click", closeResults);

  // Keyboard shortcut — Enter to search
  document.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !$routeBtn.disabled) {
      getRoute();
    }
  });
}


// ═══════════════════════════════════════════════════
//  SAFE MODE TOGGLE
// ═══════════════════════════════════════════════════

function toggleSafeMode() {
  safeModeEnabled = $safeModeCheckbox.checked;

  // Update label
  $safeModeLabel.classList.toggle("active", safeModeEnabled);

  // Update mode indicator
  if (safeModeEnabled) {
    $modeIndicator.className = "mode-indicator safe";
    $modeText.textContent = "🛡️ Safe Mode Active";
    showHeatmap();
    $crimeLegend.classList.add("visible");
    showToast("Safe Mode enabled — crime heatmap active", "info");
  } else {
    $modeIndicator.className = "mode-indicator normal";
    $modeText.textContent = "📍 Normal Mode";
    hideHeatmap();
    $crimeLegend.classList.remove("visible");
    showToast("Normal Mode — fastest route", "info");
  }

  // Re-run route if we already have inputs
  if (currentRoutes.length > 0) {
    getRoute();
  }
}


// ═══════════════════════════════════════════════════
//  HEATMAP CONTROLS
// ═══════════════════════════════════════════════════

function showHeatmap() {
  const heatData = SafeMode.buildHeatmapData(CRIME_DATABASE);
  heatmapLayer.setData(heatData);
  heatmapLayer.setMap(map);
}

function hideHeatmap() {
  heatmapLayer.setMap(null);
}


// ═══════════════════════════════════════════════════
//  INPUT VALIDATION
// ═══════════════════════════════════════════════════

function checkInputs() {
  const hasOrigin = $originInput.value.trim().length > 2;
  const hasDest = $destInput.value.trim().length > 2;
  $routeBtn.disabled = !(hasOrigin && hasDest);
}


// ═══════════════════════════════════════════════════
//  ROUTE CALCULATION
// ═══════════════════════════════════════════════════

async function getRoute() {
  const origin = $originInput.value.trim();
  const destination = $destInput.value.trim();

  if (!origin || !destination) {
    showToast("Please enter both origin and destination", "error");
    return;
  }

  // Loading state
  $routeBtn.classList.add("loading");
  $routeBtn.disabled = true;
  clearRenderers();
  closeResults();

  try {
    const request = {
      origin,
      destination,
      travelMode: google.maps.TravelMode.DRIVING,
      provideRouteAlternatives: safeModeEnabled, // multiple routes only in Safe Mode
      drivingOptions: {
        departureTime: new Date(),
        trafficModel: google.maps.TrafficModel.BEST_GUESS
      }
    };

    directionsService.route(request, async (result, status) => {
      $routeBtn.classList.remove("loading");
      $routeBtn.disabled = false;

      if (status !== google.maps.DirectionsStatus.OK) {
        showToast(`Route not found: ${status}`, "error");
        return;
      }

      currentRoutes = result.routes;

      if (safeModeEnabled) {
        await renderSafeModeResults(result.routes, origin, destination);
      } else {
        renderNormalResult(result.routes[0]);
      }
    });
  } catch (err) {
    $routeBtn.classList.remove("loading");
    $routeBtn.disabled = false;
    showToast("Error calculating route", "error");
    console.error(err);
  }
}


// ═══════════════════════════════════════════════════
//  NORMAL MODE RENDERING
// ═══════════════════════════════════════════════════

function renderNormalResult(route) {
  clearRenderers();

  const renderer = new google.maps.DirectionsRenderer({
    map,
    directions: { routes: [route], request: {}, geocoded_waypoints: [] },
    routeIndex: 0,
    polylineOptions: {
      strokeColor: "#4A90D9",
      strokeWeight: 6,
      strokeOpacity: 0.9
    },
    suppressMarkers: false
  });

  // Rebuild a minimal DirectionsResult for the renderer
  const fakeResult = buildDirectionsResult([route]);
  renderer.setDirections(fakeResult);
  directionsRenderers.push(renderer);

  const leg = route.legs[0];

  // Show results
  $scoreSection.style.display = "none";
  $aiBriefing.style.display = "none";
  $routeCards.innerHTML = "";
  $normalResult.style.display = "flex";
  $normalRouteTitle.textContent = `via ${route.summary}`;
  $normalRouteInfo.textContent = `${leg.duration.text} · ${leg.distance.text}`;
  $resultsTitle.textContent = "Fastest Route";

  $resultsPanel.classList.add("visible");
  fitBounds(route);
}


// ═══════════════════════════════════════════════════
//  SAFE MODE RENDERING
// ═══════════════════════════════════════════════════

async function renderSafeModeResults(routes, origin, destination) {
  clearRenderers();

  // Rank routes by safety
  const ranked = SafeMode.rankRoutes(routes, CRIME_DATABASE);

  // Render polylines — safest in green, others dimmed
  ranked.forEach((r, idx) => {
    const tier = SafeMode.classifyScore(r.safetyScore);
    const isSafest = idx === 0;

    const color = isSafest ? tier.color : "#555";
    const weight = isSafest ? 7 : 4;
    const opacity = isSafest ? 0.95 : 0.4;
    const zIndex = isSafest ? 10 : 1;

    const polyline = new google.maps.Polyline({
      path: r.route.overview_path,
      strokeColor: color,
      strokeWeight: weight,
      strokeOpacity: opacity,
      zIndex,
      map
    });

    directionsRenderers.push(polyline);

    // Click to select
    polyline.addListener("click", () => {
      selectRoute(idx, ranked);
    });
  });

  // Add start/end markers
  const startLeg = ranked[0].route.legs[0];
  addMarker(startLeg.start_location, "🟢", "Origin");
  addMarker(startLeg.end_location, "🔴", "Destination");

  // Show safest route details
  selectedRouteIndex = 0;
  const safest = ranked[0];
  const tier = SafeMode.classifyScore(safest.safetyScore);

  // Update score ring
  updateScoreRing(safest.safetyScore, tier);

  // Build route cards
  renderRouteCards(ranked);

  // Show results panel
  $normalResult.style.display = "none";
  $scoreSection.style.display = "flex";
  $aiBriefing.style.display = "block";
  $resultsTitle.textContent = `Safe Mode — ${ranked.length} routes analyzed`;
  $resultsPanel.classList.add("visible");

  fitBounds(ranked[0].route);

  // Generate AI briefing (async, don't block)
  $aiBriefingText.innerHTML = '<span class="typing-dots">Generating safety analysis</span>';
  $aiBriefingText.classList.add("loading");

  try {
    const briefing = await GeminiAI.generateSafetyBriefing({
      origin,
      destination,
      duration: safest.duration,
      distance: safest.distance,
      safetyScore: safest.safetyScore,
      warnings: safest.warnings,
      isSafest: true,
      allRoutes: ranked
    });

    $aiBriefingText.textContent = briefing;
    $aiBriefingText.classList.remove("loading");
  } catch (err) {
    $aiBriefingText.textContent = "Unable to generate AI briefing. Check your Gemini API key.";
    $aiBriefingText.classList.remove("loading");
  }
}

function selectRoute(idx, ranked) {
  selectedRouteIndex = idx;
  const selected = ranked[idx];
  const tier = SafeMode.classifyScore(selected.safetyScore);

  // Update polyline styles
  directionsRenderers.forEach((renderer, i) => {
    if (renderer instanceof google.maps.Polyline) {
      const isSelected = i === idx;
      const rTier = SafeMode.classifyScore(ranked[i]?.safetyScore || 50);
      renderer.setOptions({
        strokeColor: isSelected ? rTier.color : "#555",
        strokeWeight: isSelected ? 7 : 4,
        strokeOpacity: isSelected ? 0.95 : 0.4,
        zIndex: isSelected ? 10 : 1
      });
    }
  });

  updateScoreRing(selected.safetyScore, tier);
  highlightCard(idx);
  fitBounds(selected.route);
}


// ═══════════════════════════════════════════════════
//  UI COMPONENTS
// ═══════════════════════════════════════════════════

function updateScoreRing(score, tier) {
  const circumference = 2 * Math.PI * 38; // r=38
  const offset = circumference - (score / 100) * circumference;

  $scoreRingFill.style.stroke = tier.color;
  // Animate with a small delay
  requestAnimationFrame(() => {
    $scoreRingFill.style.strokeDashoffset = offset;
  });

  $scoreNumber.textContent = score;
  $scoreNumber.style.color = tier.color;
  $scoreTierText.textContent = `${tier.label} Route Selected`;
  $scoreTierText.style.color = tier.color;
}

function renderRouteCards(ranked) {
  $routeCards.innerHTML = "";

  ranked.forEach((r, idx) => {
    const tier = SafeMode.classifyScore(r.safetyScore);
    const isSafest = idx === 0;
    const isSelected = idx === selectedRouteIndex;

    const card = document.createElement("div");
    card.className = `route-card ${isSelected ? "selected" : ""} ${tier.tier}`;
    card.setAttribute("data-index", idx);

    // Deduplicate warning labels
    const uniqueWarnings = [];
    const seenTypes = new Set();
    for (const w of r.warnings) {
      if (!seenTypes.has(w.type)) {
        seenTypes.add(w.type);
        uniqueWarnings.push(w);
      }
    }

    card.innerHTML = `
      ${isSafest ? '<div class="safest-tag">Safest</div>' : ""}
      <div class="route-card-header">
        <span class="route-label">Route ${idx + 1}</span>
        <span class="safety-badge ${tier.tier}">🛡️ ${r.safetyScore}</span>
      </div>
      <div class="route-meta">
        <div class="route-meta-item"><strong>${r.duration}</strong></div>
        <div class="route-meta-item"><strong>${r.distance}</strong></div>
      </div>
      <div class="route-summary-text">via ${r.summary}</div>
      ${uniqueWarnings.length > 0 ? `
        <div class="crime-chips">
          ${uniqueWarnings.slice(0, 3).map(w => `
            <span class="crime-chip">${w.emoji} ${w.label}</span>
          `).join("")}
        </div>
      ` : '<div style="font-size:11px; color: var(--safe);">✓ No incidents detected</div>'}
    `;

    card.addEventListener("click", () => selectRoute(idx, ranked));
    $routeCards.appendChild(card);
  });
}

function highlightCard(activeIdx) {
  document.querySelectorAll(".route-card").forEach((card) => {
    const idx = parseInt(card.getAttribute("data-index"));
    card.classList.toggle("selected", idx === activeIdx);
  });
}


// ═══════════════════════════════════════════════════
//  MAP HELPERS
// ═══════════════════════════════════════════════════

function buildDirectionsResult(routes) {
  return {
    routes,
    request: { travelMode: google.maps.TravelMode.DRIVING },
    geocoded_waypoints: []
  };
}

function addMarker(position, emoji, title) {
  const marker = new google.maps.Marker({
    position,
    map,
    title,
    label: {
      text: emoji,
      fontSize: "20px"
    },
    icon: {
      path: google.maps.SymbolPath.CIRCLE,
      scale: 0,
    }
  });
  directionsRenderers.push(marker);
}

function fitBounds(route) {
  const bounds = new google.maps.LatLngBounds();
  route.overview_path.forEach((p) => bounds.extend(p));
  map.fitBounds(bounds, {
    top: 100,
    bottom: 300,
    left: 400,
    right: 40
  });
}

function clearRenderers() {
  directionsRenderers.forEach((r) => {
    if (r.setMap) r.setMap(null);
    if (r.setDirections) r.setDirections({ routes: [] });
  });
  directionsRenderers = [];
}

function closeResults() {
  $resultsPanel.classList.remove("visible");
}


// ═══════════════════════════════════════════════════
//  THEME
// ═══════════════════════════════════════════════════

const LIGHT_MAP_STYLES = [
  { elementType: "geometry", stylers: [{ color: "#f5f5f5" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#f5f5f5" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#616161" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#ffffff" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#e0e0e0" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#dadada" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#c9e4f0" }] },
  { featureType: "poi", elementType: "geometry", stylers: [{ color: "#eeeeee" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#d4e9c2" }] },
  { featureType: "transit", elementType: "geometry", stylers: [{ color: "#e5e5e5" }] },
  { featureType: "administrative", elementType: "geometry.stroke", stylers: [{ color: "#c9c9c9" }] }
];

function applyTheme(theme) {
  document.body.setAttribute("data-theme", theme);
  localStorage.setItem("saferoute-theme", theme);

  const isDark = theme === "dark";
  $themeBtn.textContent = isDark ? "🌙" : "☀️";
  $themeBtn.title = isDark ? "Switch to Light Mode" : "Switch to Dark Mode";

  if (map) {
    map.setOptions({ styles: isDark ? CONFIG.MAP.STYLES : LIGHT_MAP_STYLES });
  }
}

// ═══════════════════════════════════════════════════
//  TOAST NOTIFICATIONS
// ═══════════════════════════════════════════════════

function showToast(message, type = "info") {
  $toast.textContent = message;
  $toast.className = `toast ${type} visible`;

  setTimeout(() => {
    $toast.classList.remove("visible");
  }, 3000);
}
