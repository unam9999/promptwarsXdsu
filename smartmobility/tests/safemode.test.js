// ============================================================
// SafeRoute AI — SafeMode Engine Unit Tests
// ============================================================
// Tests the pure mathematical functions in safemode.js
// without requiring Google Maps or a browser environment.
// ============================================================

// ── Mock globals that safemode.js depends on ──
global.CONFIG = {
  SAFE_MODE: {
    SCAN_RADIUS_M: 300,
    SAMPLE_INTERVAL_M: 300,
    RECENCY_WEIGHTS: {
      HOURS_24: 1.0,
      DAYS_7: 0.75,
      WEEKS_4: 0.5,
      MONTHS_3: 0.25,
    },
  },
};

global.CRIME_TYPES = {
  road_blockage: { label: "Road Blockage", severity: 10, emoji: "🚧" },
  carjacking: { label: "Carjacking", severity: 10, emoji: "🚗" },
  armed_robbery: { label: "Armed Robbery", severity: 9, emoji: "🔫" },
  vehicle_robbery: { label: "Vehicle Robbery", severity: 8, emoji: "🏍️" },
  assault: { label: "Assault", severity: 5, emoji: "👊" },
  chain_snatching: { label: "Chain Snatching", severity: 4, emoji: "📿" },
  theft: { label: "Theft", severity: 3, emoji: "🎒" },
};

// Mock google.maps.LatLng (used in buildHeatmapData)
global.google = {
  maps: {
    LatLng: class {
      constructor(lat, lng) {
        this._lat = lat;
        this._lng = lng;
      }
      lat() { return this._lat; }
      lng() { return this._lng; }
    },
  },
};

// ── Import SafeMode ──
const SafeMode = require("../public/safemode.js");


// ═══════════════════════════════════════════════════
//  haversineDistance
// ═══════════════════════════════════════════════════

describe("haversineDistance", () => {
  test("returns 0 for identical points", () => {
    const d = SafeMode.haversineDistance(12.9716, 77.5946, 12.9716, 77.5946);
    expect(d).toBe(0);
  });

  test("calculates known distance: Bengaluru to Mysuru (~145 km)", () => {
    // Bengaluru: 12.9716, 77.5946
    // Mysuru: 12.2958, 76.6394
    const d = SafeMode.haversineDistance(12.9716, 77.5946, 12.2958, 76.6394);
    // Expected: ~130-145 km (straight line)
    expect(d).toBeGreaterThan(120000);
    expect(d).toBeLessThan(160000);
  });

  test("calculates short distance: two nearby points (~1 km)", () => {
    // Two points roughly 1km apart in Bengaluru
    const d = SafeMode.haversineDistance(12.9716, 77.5946, 12.9806, 77.5946);
    expect(d).toBeGreaterThan(900);
    expect(d).toBeLessThan(1100);
  });

  test("is symmetric", () => {
    const d1 = SafeMode.haversineDistance(12.9716, 77.5946, 12.2958, 76.6394);
    const d2 = SafeMode.haversineDistance(12.2958, 76.6394, 12.9716, 77.5946);
    expect(d1).toBeCloseTo(d2, 5);
  });
});


// ═══════════════════════════════════════════════════
//  classifyScore
// ═══════════════════════════════════════════════════

describe("classifyScore", () => {
  test("score >= 80 is classified as safe", () => {
    expect(SafeMode.classifyScore(80).tier).toBe("safe");
    expect(SafeMode.classifyScore(100).tier).toBe("safe");
    expect(SafeMode.classifyScore(95).tier).toBe("safe");
  });

  test("score 50-79 is classified as moderate", () => {
    expect(SafeMode.classifyScore(50).tier).toBe("moderate");
    expect(SafeMode.classifyScore(65).tier).toBe("moderate");
    expect(SafeMode.classifyScore(79).tier).toBe("moderate");
  });

  test("score < 50 is classified as risky", () => {
    expect(SafeMode.classifyScore(0).tier).toBe("risky");
    expect(SafeMode.classifyScore(25).tier).toBe("risky");
    expect(SafeMode.classifyScore(49).tier).toBe("risky");
  });

  test("returns correct color for each tier", () => {
    expect(SafeMode.classifyScore(90).color).toBe("#00D46A");
    expect(SafeMode.classifyScore(60).color).toBe("#FFA502");
    expect(SafeMode.classifyScore(30).color).toBe("#FF4757");
  });

  test("returns correct label for each tier", () => {
    expect(SafeMode.classifyScore(90).label).toBe("Safe");
    expect(SafeMode.classifyScore(60).label).toBe("Moderate");
    expect(SafeMode.classifyScore(30).label).toBe("Risky");
  });
});


// ═══════════════════════════════════════════════════
//  scoreRoute (with mock path)
// ═══════════════════════════════════════════════════

describe("scoreRoute", () => {
  // Create a mock route path (simulating Google Maps LatLng objects)
  const mockLatLng = (lat, lng) => ({
    lat: () => lat,
    lng: () => lng,
  });

  const mockRoute = {
    overview_path: [
      mockLatLng(12.9716, 77.5946), // start
      mockLatLng(12.9750, 77.5946), // ~378m north
      mockLatLng(12.9780, 77.5946), // ~712m north
    ],
    legs: [
      {
        duration: { text: "5 mins", value: 300 },
        distance: { text: "1.2 km", value: 1200 },
      },
    ],
    summary: "Test Route",
  };

  test("returns perfect score when no crimes are nearby", () => {
    const result = SafeMode.scoreRoute(mockRoute, []);
    expect(result.safetyScore).toBe(100);
    expect(result.crimesDetected).toBe(0);
    expect(result.warnings).toHaveLength(0);
  });

  test("detects crime within scan radius", () => {
    const nearbyCrime = [
      {
        id: 99,
        lat: 12.9720,
        lng: 77.5946,
        type: "theft",
        description: "Test theft",
        timestamp: new Date().toISOString(), // recent
      },
    ];

    const result = SafeMode.scoreRoute(mockRoute, nearbyCrime);
    expect(result.safetyScore).toBeLessThan(100);
    expect(result.crimesDetected).toBe(1);
    expect(result.warnings[0].type).toBe("theft");
  });

  test("ignores crime outside scan radius", () => {
    const farCrime = [
      {
        id: 100,
        lat: 13.0000, // ~3km away
        lng: 77.5946,
        type: "armed_robbery",
        description: "Far away robbery",
        timestamp: new Date().toISOString(),
      },
    ];

    const result = SafeMode.scoreRoute(mockRoute, farCrime);
    expect(result.safetyScore).toBe(100);
    expect(result.crimesDetected).toBe(0);
  });

  test("higher severity crimes reduce score more", () => {
    const theftNear = [
      {
        id: 101,
        lat: 12.9718,
        lng: 77.5946,
        type: "theft", // severity 3
        description: "Minor theft",
        timestamp: new Date().toISOString(),
      },
    ];

    const robberyNear = [
      {
        id: 102,
        lat: 12.9718,
        lng: 77.5946,
        type: "armed_robbery", // severity 9
        description: "Armed robbery",
        timestamp: new Date().toISOString(),
      },
    ];

    const theftResult = SafeMode.scoreRoute(mockRoute, theftNear);
    const robberyResult = SafeMode.scoreRoute(mockRoute, robberyNear);

    expect(robberyResult.safetyScore).toBeLessThan(theftResult.safetyScore);
  });

  test("safety score is clamped between 0 and 100", () => {
    const result = SafeMode.scoreRoute(mockRoute, []);
    expect(result.safetyScore).toBeLessThanOrEqual(100);
    expect(result.safetyScore).toBeGreaterThanOrEqual(0);
  });
});


// ═══════════════════════════════════════════════════
//  rankRoutes
// ═══════════════════════════════════════════════════

describe("rankRoutes", () => {
  const mockLatLng = (lat, lng) => ({
    lat: () => lat,
    lng: () => lng,
  });

  const safeRoute = {
    overview_path: [
      mockLatLng(12.9716, 77.5946),
      mockLatLng(12.9750, 77.5946),
    ],
    legs: [
      {
        duration: { text: "10 mins", value: 600 },
        distance: { text: "3 km", value: 3000 },
      },
    ],
    summary: "Safe Route",
  };

  const riskyRoute = {
    overview_path: [
      mockLatLng(12.9767, 77.5713), // Near Majestic (crime hotspot)
      mockLatLng(12.9730, 77.5750),
    ],
    legs: [
      {
        duration: { text: "8 mins", value: 480 },
        distance: { text: "2.5 km", value: 2500 },
      },
    ],
    summary: "Risky Route",
  };

  const crimes = [
    {
      id: 200,
      lat: 12.9767,
      lng: 77.5713,
      type: "chain_snatching",
      description: "Test snatching",
      timestamp: new Date().toISOString(),
    },
  ];

  test("ranks safer route first", () => {
    const ranked = SafeMode.rankRoutes([riskyRoute, safeRoute], crimes);
    expect(ranked[0].summary).toBe("Safe Route");
    expect(ranked[0].safetyScore).toBeGreaterThanOrEqual(ranked[1].safetyScore);
  });

  test("returns all routes", () => {
    const ranked = SafeMode.rankRoutes([riskyRoute, safeRoute], crimes);
    expect(ranked).toHaveLength(2);
  });
});
