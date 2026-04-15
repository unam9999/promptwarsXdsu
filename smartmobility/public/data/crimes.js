// ============================================================
// SafeRoute AI — Bangalore Crime Incident Database
// ============================================================
// ~40 simulated incidents seeded around real Bangalore hotspots.
// Each incident has: id, lat, lng, type, severity, description,
// timestamp (recent dates for recency scoring), and verified flag.
//
// For the hackathon this is simulated data. Post-competition this
// could feed from NCRB, city police portals, or Safetipin.
// ============================================================

const CRIME_TYPES = {
  road_blockage:  { label: "Road Blockage",    severity: 10, emoji: "🚧" },
  carjacking:     { label: "Carjacking",       severity: 10, emoji: "🚗" },
  armed_robbery:  { label: "Armed Robbery",    severity: 9,  emoji: "🔫" },
  vehicle_robbery:{ label: "Vehicle Robbery",  severity: 8,  emoji: "🏍️" },
  looting:        { label: "Looting",          severity: 7,  emoji: "💰" },
  assault:        { label: "Assault",          severity: 5,  emoji: "👊" },
  chain_snatching:{ label: "Chain Snatching",  severity: 4,  emoji: "📿" },
  theft:          { label: "Theft",            severity: 3,  emoji: "🎒" }
};

const CRIME_DATABASE = [
  // ── Mysore Road Corridor (known for road blockages at night) ──
  {
    id: 1,
    lat: 12.9485, lng: 77.5080,
    type: "road_blockage",
    description: "Armed gang blocking vehicles near Mysore Road toll after midnight",
    timestamp: "2026-04-14T23:30:00",
    verified: true
  },
  {
    id: 2,
    lat: 12.9420, lng: 77.4950,
    description: "Carjacking reported near Bidadi flyover — 2 SUVs targeted",
    type: "carjacking",
    timestamp: "2026-04-13T01:15:00",
    verified: true
  },
  {
    id: 3,
    lat: 12.9510, lng: 77.5180,
    type: "vehicle_robbery",
    description: "Bike stolen at knifepoint near RR Nagar junction",
    timestamp: "2026-04-11T22:00:00",
    verified: true
  },
  {
    id: 4,
    lat: 12.9460, lng: 77.5020,
    type: "armed_robbery",
    description: "Delivery driver robbed at gunpoint on Mysore Road service road",
    timestamp: "2026-04-08T00:45:00",
    verified: true
  },
  {
    id: 5,
    lat: 12.9530, lng: 77.5250,
    type: "road_blockage",
    description: "Log placed on road near Kengeri satellite town — vehicles ambushed",
    timestamp: "2026-03-28T02:00:00",
    verified: true
  },

  // ── Hosur Road / Electronic City corridor ──
  {
    id: 6,
    lat: 12.8650, lng: 77.6380,
    type: "carjacking",
    description: "Car stopped by fake police checkpoint near Attibele toll",
    timestamp: "2026-04-14T02:30:00",
    verified: true
  },
  {
    id: 7,
    lat: 12.8480, lng: 77.6620,
    type: "road_blockage",
    description: "Rocks placed on Electronic City expressway near Phase 2 exit",
    timestamp: "2026-04-12T23:45:00",
    verified: true
  },
  {
    id: 8,
    lat: 12.8750, lng: 77.6420,
    type: "vehicle_robbery",
    description: "Two-wheeler snatched near Bommasandra metro station",
    timestamp: "2026-04-10T21:00:00",
    verified: true
  },
  {
    id: 9,
    lat: 12.8550, lng: 77.6500,
    type: "armed_robbery",
    description: "IT employee robbed at knifepoint near Electronic City flyover",
    timestamp: "2026-04-05T23:30:00",
    verified: true
  },
  {
    id: 10,
    lat: 12.8900, lng: 77.6350,
    type: "chain_snatching",
    description: "Gold chain snatched from pedestrian on Hosur Road footpath",
    timestamp: "2026-04-09T19:15:00",
    verified: true
  },

  // ── Majestic / KR Market (crowded, petty crime) ──
  {
    id: 11,
    lat: 12.9767, lng: 77.5713,
    type: "chain_snatching",
    description: "Chain snatching incident near Majestic bus station entrance",
    timestamp: "2026-04-14T18:00:00",
    verified: true
  },
  {
    id: 12,
    lat: 12.9730, lng: 77.5750,
    type: "theft",
    description: "Wallet and phone pickpocketed in crowded KR Market lane",
    timestamp: "2026-04-13T16:30:00",
    verified: true
  },
  {
    id: 13,
    lat: 12.9780, lng: 77.5690,
    type: "assault",
    description: "Autorickshaw driver assaulted over fare dispute near Majestic",
    timestamp: "2026-04-11T22:30:00",
    verified: true
  },
  {
    id: 14,
    lat: 12.9632, lng: 77.5780,
    type: "looting",
    description: "Shop looted during power cut in KR Market area",
    timestamp: "2026-03-25T03:00:00",
    verified: false
  },
  {
    id: 15,
    lat: 12.9750, lng: 77.5720,
    type: "theft",
    description: "Laptop bag stolen from parked car near Majestic railway station",
    timestamp: "2026-04-06T14:00:00",
    verified: true
  },

  // ── Peenya Industrial Area ──
  {
    id: 16,
    lat: 13.0310, lng: 77.5180,
    type: "vehicle_robbery",
    description: "Tempo hijacked near Peenya 2nd Stage industrial estate",
    timestamp: "2026-04-13T03:00:00",
    verified: true
  },
  {
    id: 17,
    lat: 13.0280, lng: 77.5220,
    type: "armed_robbery",
    description: "Factory night-shift workers robbed at knifepoint near Peenya metro",
    timestamp: "2026-04-07T01:30:00",
    verified: true
  },
  {
    id: 18,
    lat: 13.0350, lng: 77.5150,
    type: "looting",
    description: "Warehouse break-in and goods looted in Peenya industrial zone",
    timestamp: "2026-03-20T04:00:00",
    verified: true
  },

  // ── Tumkur Road / Yeshwanthpur ──
  {
    id: 19,
    lat: 13.0210, lng: 77.5500,
    type: "vehicle_robbery",
    description: "Parked car broken into near Yeshwanthpur railway station",
    timestamp: "2026-04-12T20:00:00",
    verified: true
  },
  {
    id: 20,
    lat: 13.0500, lng: 77.5100,
    type: "road_blockage",
    description: "Stones placed on Tumkur Road near Nelamangala — night hours",
    timestamp: "2026-04-10T01:00:00",
    verified: true
  },
  {
    id: 21,
    lat: 13.0450, lng: 77.5150,
    type: "carjacking",
    description: "Truck driver carjacked on Tumkur National Highway service road",
    timestamp: "2026-03-30T02:30:00",
    verified: true
  },

  // ── Hebbal / Outer Ring Road North ──
  {
    id: 22,
    lat: 13.0350, lng: 77.5970,
    type: "road_blockage",
    description: "Temporary blockage by unknown group near Hebbal flyover ramp",
    timestamp: "2026-04-09T00:15:00",
    verified: false
  },
  {
    id: 23,
    lat: 13.0380, lng: 77.5940,
    type: "chain_snatching",
    description: "Chain snatched from woman on two-wheeler near Hebbal junction",
    timestamp: "2026-04-14T07:30:00",
    verified: true
  },

  // ── Silk Board / BTM / Bommanahalli ──
  {
    id: 24,
    lat: 12.9170, lng: 77.6230,
    type: "theft",
    description: "Phone snatched from hand near Silk Board bus stop",
    timestamp: "2026-04-13T08:00:00",
    verified: true
  },
  {
    id: 25,
    lat: 12.9100, lng: 77.6180,
    type: "chain_snatching",
    description: "Chain snatching from morning walker near BTM 2nd Stage park",
    timestamp: "2026-04-11T06:15:00",
    verified: true
  },
  {
    id: 26,
    lat: 12.8990, lng: 77.6180,
    type: "vehicle_robbery",
    description: "Scooter stolen from parking area in Bommanahalli market",
    timestamp: "2026-04-04T13:00:00",
    verified: true
  },

  // ── Marathahalli / Outer Ring Road East ──
  {
    id: 27,
    lat: 12.9567, lng: 77.7010,
    type: "vehicle_robbery",
    description: "Car window smashed and valuables stolen near Marathahalli bridge",
    timestamp: "2026-04-12T15:30:00",
    verified: true
  },
  {
    id: 28,
    lat: 12.9600, lng: 77.7050,
    type: "assault",
    description: "Cab driver assaulted and phone stolen near Marathahalli signal",
    timestamp: "2026-04-08T23:00:00",
    verified: true
  },

  // ── Whitefield / ITPL area ──
  {
    id: 29,
    lat: 12.9698, lng: 77.7500,
    type: "vehicle_robbery",
    description: "Bike theft from IT park basement parking in Whitefield",
    timestamp: "2026-04-10T14:00:00",
    verified: true
  },
  {
    id: 30,
    lat: 12.9730, lng: 77.7480,
    type: "theft",
    description: "Bag snatched from pedestrian near ITPL main gate",
    timestamp: "2026-04-06T20:30:00",
    verified: true
  },

  // ── KR Puram / Old Madras Road ──
  {
    id: 31,
    lat: 13.0050, lng: 77.7000,
    type: "armed_robbery",
    description: "Armed gang robbed jewellery shop near KR Puram railway gate",
    timestamp: "2026-04-03T21:00:00",
    verified: true
  },
  {
    id: 32,
    lat: 13.0080, lng: 77.6950,
    type: "looting",
    description: "Street vendor carts looted during late-night disturbance in KR Puram",
    timestamp: "2026-03-18T01:00:00",
    verified: false
  },

  // ── Shivajinagar / Commercial Street ──
  {
    id: 33,
    lat: 12.9857, lng: 77.6047,
    type: "chain_snatching",
    description: "Gold chain snatched in crowded Commercial Street market",
    timestamp: "2026-04-14T17:00:00",
    verified: true
  },
  {
    id: 34,
    lat: 12.9830, lng: 77.6080,
    type: "theft",
    description: "Phone pickpocketed near Shivajinagar bus stand",
    timestamp: "2026-04-10T09:30:00",
    verified: true
  },

  // ── Bannerghatta Road / JP Nagar ──
  {
    id: 35,
    lat: 12.8800, lng: 77.5950,
    type: "vehicle_robbery",
    description: "Parked car broken into at night in JP Nagar 6th Phase",
    timestamp: "2026-04-11T03:00:00",
    verified: true
  },
  {
    id: 36,
    lat: 12.8650, lng: 77.5980,
    type: "assault",
    description: "Pedestrian attacked by group near Bannerghatta National Park entrance",
    timestamp: "2026-03-22T20:00:00",
    verified: true
  },

  // ── Yelahanka / Airport Road ──
  {
    id: 37,
    lat: 13.1000, lng: 77.5960,
    type: "road_blockage",
    description: "Suspicious vehicle blocking airport service road near Yelahanka",
    timestamp: "2026-04-07T03:45:00",
    verified: false
  },
  {
    id: 38,
    lat: 13.0950, lng: 77.5900,
    type: "vehicle_robbery",
    description: "Cab driver's vehicle stolen near Yelahanka New Town",
    timestamp: "2026-04-02T22:00:00",
    verified: true
  },

  // ── Koramangala ──
  {
    id: 39,
    lat: 12.9352, lng: 77.6245,
    type: "theft",
    description: "Laptop stolen from cafe table in Koramangala 5th Block",
    timestamp: "2026-04-13T11:30:00",
    verified: true
  },
  {
    id: 40,
    lat: 12.9380, lng: 77.6270,
    type: "chain_snatching",
    description: "Chain snatched from jogger on Koramangala inner ring road footpath",
    timestamp: "2026-04-09T06:00:00",
    verified: true
  },

  // ── Devanahalli / Airport Zone ──
  {
    id: 41,
    lat: 13.1986, lng: 77.7066,
    type: "carjacking",
    description: "Car stopped by fake police near Devanahalli — passengers robbed",
    timestamp: "2026-03-15T01:00:00",
    verified: true
  },
  {
    id: 42,
    lat: 13.1800, lng: 77.6900,
    type: "armed_robbery",
    description: "Armed robbery of cargo vehicle on airport highway late night",
    timestamp: "2026-03-10T02:30:00",
    verified: true
  }
];
