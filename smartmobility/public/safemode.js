// ============================================================
// SafeRoute AI — Safe Mode Engine
// ============================================================
// Scores routes by crime density along their polyline.
// Input: decoded polyline points + crime database.
// Output: safety score (0-100), warnings, heatmap data.
// ============================================================

const SafeMode = (() => {

  // ── Haversine distance (meters) between two lat/lng points ──
  function haversineDistance(lat1, lng1, lat2, lng2) {
    const R = 6371000; // Earth radius in meters
    const toRad = (deg) => (deg * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  // ── Recency decay multiplier ──
  function recencyWeight(timestamp) {
    const now = Date.now();
    const crimeTime = new Date(timestamp).getTime();
    const hoursAgo = (now - crimeTime) / (1000 * 60 * 60);

    if (hoursAgo <= 24)       return CONFIG.SAFE_MODE.RECENCY_WEIGHTS.HOURS_24;
    if (hoursAgo <= 24 * 7)   return CONFIG.SAFE_MODE.RECENCY_WEIGHTS.DAYS_7;
    if (hoursAgo <= 24 * 28)  return CONFIG.SAFE_MODE.RECENCY_WEIGHTS.WEEKS_4;
    if (hoursAgo <= 24 * 90)  return CONFIG.SAFE_MODE.RECENCY_WEIGHTS.MONTHS_3;
    return 0.1; // very old
  }

  // ── Sample points along a polyline at regular intervals ──
  function samplePolyline(path, intervalMeters) {
    const points = [];
    if (!path || path.length === 0) return points;

    points.push({ lat: path[0].lat(), lng: path[0].lng() });
    let accumulated = 0;

    for (let i = 1; i < path.length; i++) {
      const prev = path[i - 1];
      const curr = path[i];
      const segDist = haversineDistance(
        prev.lat(), prev.lng(), curr.lat(), curr.lng()
      );
      accumulated += segDist;

      if (accumulated >= intervalMeters) {
        points.push({ lat: curr.lat(), lng: curr.lng() });
        accumulated = 0;
      }
    }

    // Always include last point
    const last = path[path.length - 1];
    points.push({ lat: last.lat(), lng: last.lng() });
    return points;
  }

  // ── Score a single route ──
  function scoreRoute(route, crimes) {
    const path = route.overview_path;
    const samplePoints = samplePolyline(path, CONFIG.SAFE_MODE.SAMPLE_INTERVAL_M);
    const scanRadius = CONFIG.SAFE_MODE.SCAN_RADIUS_M;

    let totalRiskScore = 0;
    const encounteredCrimes = new Map(); // crime.id → crime object (dedup)

    for (const point of samplePoints) {
      for (const crime of crimes) {
        const dist = haversineDistance(point.lat, point.lng, crime.lat, crime.lng);
        if (dist <= scanRadius) {
          const crimeType = CRIME_TYPES[crime.type];
          if (!crimeType) continue;

          const severity = crimeType.severity;
          const recency = recencyWeight(crime.timestamp);
          // Proximity weight: closer = higher risk (linear falloff)
          const proximity = 1 - (dist / scanRadius);

          totalRiskScore += severity * recency * proximity;

          if (!encounteredCrimes.has(crime.id)) {
            encounteredCrimes.set(crime.id, {
              ...crime,
              distanceFromRoute: Math.round(dist),
              riskContribution: +(severity * recency * proximity).toFixed(2)
            });
          }
        }
      }
    }

    // Normalize to 0-100. Cap raw score at 100 for normalization.
    const maxExpectedScore = 150; // tuneable ceiling
    const normalizedRisk = Math.min(totalRiskScore / maxExpectedScore, 1);
    const safetyScore = Math.round((1 - normalizedRisk) * 100);

    // Build warnings sorted by risk contribution
    const warnings = Array.from(encounteredCrimes.values())
      .sort((a, b) => b.riskContribution - a.riskContribution)
      .map((c) => ({
        id: c.id,
        type: c.type,
        label: CRIME_TYPES[c.type]?.label || c.type,
        emoji: CRIME_TYPES[c.type]?.emoji || "⚠️",
        description: c.description,
        distanceFromRoute: c.distanceFromRoute,
        riskContribution: c.riskContribution
      }));

    return {
      safetyScore: Math.max(0, Math.min(100, safetyScore)),
      rawRiskScore: +totalRiskScore.toFixed(2),
      samplePointCount: samplePoints.length,
      crimesDetected: warnings.length,
      warnings
    };
  }

  // ── Rank multiple route alternatives ──
  function rankRoutes(routes, crimes) {
    return routes
      .map((route, index) => {
        const leg = route.legs[0];
        const score = scoreRoute(route, crimes);

        return {
          index,
          route,
          safetyScore: score.safetyScore,
          rawRiskScore: score.rawRiskScore,
          crimesDetected: score.crimesDetected,
          warnings: score.warnings,
          duration: leg.duration.text,
          durationValue: leg.duration.value,
          distance: leg.distance.text,
          distanceValue: leg.distance.value,
          summary: route.summary
        };
      })
      .sort((a, b) => b.safetyScore - a.safetyScore); // highest safety first
  }

  // ── Build heatmap data for Google Maps Visualization ──
  function buildHeatmapData(crimes) {
    return crimes.map((crime) => {
      const crimeType = CRIME_TYPES[crime.type];
      const severity = crimeType ? crimeType.severity : 5;
      const recency = recencyWeight(crime.timestamp);
      return {
        location: new google.maps.LatLng(crime.lat, crime.lng),
        weight: severity * recency
      };
    });
  }

  // ── Classify safety score into tier ──
  function classifyScore(score) {
    if (score >= 80) return { tier: "safe",     color: "#00D46A", label: "Safe" };
    if (score >= 50) return { tier: "moderate",  color: "#FFA502", label: "Moderate" };
    return              { tier: "risky",    color: "#FF4757", label: "Risky" };
  }

  return {
    scoreRoute,
    rankRoutes,
    buildHeatmapData,
    classifyScore,
    haversineDistance
  };
})();

// ── Node.js module export for testing ──
if (typeof module !== "undefined" && module.exports) {
  module.exports = SafeMode;
}
