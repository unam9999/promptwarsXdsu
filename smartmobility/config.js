// ============================================================
// SafeRoute AI — Configuration
// ============================================================
// Single Google API key used for both Maps and Gemini.
// Ensure these APIs are enabled in your Google Cloud Console:
//   - Maps JavaScript API
//   - Directions API
//   - Places API
//   - Maps JavaScript API Visualization Library
//   - Generative Language API (Gemini)
// ============================================================

const CONFIG = {
  GOOGLE_API_KEY: "AIzaSyDwNKnkHqZld2RdXQac580rQZwN4rBaPcg",

  // Gemini model endpoint
  GEMINI_MODEL: "gemini-2.0-flash",
  GEMINI_ENDPOINT: "https://generativelanguage.googleapis.com/v1beta/models",

  // Safe Mode defaults
  SAFE_MODE: {
    SCAN_RADIUS_M: 300,        // meters — radius to scan around each route point
    SAMPLE_INTERVAL_M: 300,    // meters — sample a point every 300m along the polyline
    RECENCY_WEIGHTS: {
      HOURS_24: 1.0,
      DAYS_7: 0.75,
      WEEKS_4: 0.5,
      MONTHS_3: 0.25
    }
  },

  // Map defaults — centered on Bengaluru
  MAP: {
    CENTER: { lat: 12.9716, lng: 77.5946 },
    ZOOM: 12,
    STYLES: [
      { elementType: "geometry", stylers: [{ color: "#0B0F1A" }] },
      { elementType: "labels.text.stroke", stylers: [{ color: "#0B0F1A" }] },
      { elementType: "labels.text.fill", stylers: [{ color: "#6B7280" }] },
      {
        featureType: "road",
        elementType: "geometry",
        stylers: [{ color: "#1E2432" }]
      },
      {
        featureType: "road",
        elementType: "geometry.stroke",
        stylers: [{ color: "#2A3040" }]
      },
      {
        featureType: "road.highway",
        elementType: "geometry",
        stylers: [{ color: "#252D3D" }]
      },
      {
        featureType: "water",
        elementType: "geometry",
        stylers: [{ color: "#0E1A2B" }]
      },
      {
        featureType: "poi",
        elementType: "geometry",
        stylers: [{ color: "#111827" }]
      },
      {
        featureType: "poi.park",
        elementType: "geometry",
        stylers: [{ color: "#0F1D15" }]
      },
      {
        featureType: "transit",
        elementType: "geometry",
        stylers: [{ color: "#141824" }]
      }
    ]
  }
};
