require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const { ApolloServer } = require("@apollo/server");
const { expressMiddleware } = require("@apollo/server/express4");
const { buildSubgraphSchema } = require("@apollo/subgraph");
const { gql } = require("graphql-tag");

const PORT = Number(process.env.PORT || 4003);

const zones = [
  { id: "z1", name: "Downtown", congestionLevel: 78, status: "BUSY" },
  { id: "z2", name: "Airport", congestionLevel: 35, status: "NORMAL" }
];

// traffic zones storage fields: id, zone_name, latitude, longitude, density, level
const trafficZones = [
  { id: "tz1", zone_name: "Downtown", latitude: 36.8065, longitude: 10.1815, density: 0, level: "Faible" }
];

function haversine(lat1, lon1, lat2, lon2) {
  function toRad(x) { return (x * Math.PI) / 180; }
  const R = 6371; // km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

const typeDefs = gql`
  type TrafficZone @key(fields: "id") {
    id: ID!
    name: String!
    congestionLevel: Int!
    status: String!
  }

  type Query {
    getTrafficZones: [TrafficZone!]!
  }
`;

const resolvers = {
  Query: {
    getTrafficZones: () => zones
  },
  TrafficZone: {
    __resolveReference: (reference) => zones.find((zone) => zone.id === reference.id)
  }
};

async function startServer() {
  const app = express();
  app.use(cors());
  app.use(helmet());
  app.use(morgan("dev"));
  app.use(express.json());

  // Zones CRUD
  app.post("/zones", (req, res) => {
    const { id, zone_name, latitude, longitude } = req.body;
    if (!zone_name || latitude == null || longitude == null) return res.status(400).json({ error: "zone_name, latitude and longitude required" });
    const newZone = { id: id || `tz_${Date.now()}`, zone_name, latitude, longitude, density: 0, level: "Faible" };
    trafficZones.push(newZone);
    res.status(201).json(newZone);
  });

  app.get("/zones", (req, res) => {
    res.json(trafficZones);
  });

  app.get("/zones/:id", (req, res) => {
    const z = trafficZones.find((t) => t.id === req.params.id);
    if (!z) return res.status(404).json({ error: "not found" });
    res.json(z);
  });

  app.put("/zones/:id", (req, res) => {
    const z = trafficZones.find((t) => t.id === req.params.id);
    if (!z) return res.status(404).json({ error: "not found" });
    const { zone_name, latitude, longitude } = req.body;
    if (zone_name) z.zone_name = zone_name;
    if (latitude != null) z.latitude = latitude;
    if (longitude != null) z.longitude = longitude;
    res.json(z);
  });

  app.delete("/zones/:id", (req, res) => {
    const idx = trafficZones.findIndex((t) => t.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: "not found" });
    const removed = trafficZones.splice(idx, 1)[0];
    res.json(removed);
  });

  // Analyze traffic for a zone using provided positions array in body
  app.post("/zones/:id/analyze", (req, res) => {
    const z = trafficZones.find((t) => t.id === req.params.id);
    if (!z) return res.status(404).json({ error: "not found" });
    const { positions = [], radiusKm = 1 } = req.body;
    if (!Array.isArray(positions)) return res.status(400).json({ error: "positions must be an array" });
    const nearby = positions.filter((p) => {
      const d = haversine(z.latitude, z.longitude, p.latitude, p.longitude);
      return d <= radiusKm;
    });
    const density = nearby.length;
    const avgSpeed = nearby.length ? Math.round(nearby.reduce((s, p) => s + (p.speed || 0), 0) / nearby.length) : 0;
    let level = "Faible";
    if (density >= 15 || avgSpeed <= 15) level = "Élevé";
    else if (density >= 5 || avgSpeed <= 30) level = "Moyen";
    z.density = density;
    z.level = level;
    res.json({ zone: z, density, avgSpeed, level, nearbyCount: nearby.length });
  });

  const server = new ApolloServer({
    schema: buildSubgraphSchema([{ typeDefs, resolvers }])
  });

  await server.start();

  app.use("/graphql", expressMiddleware(server));

  app.get("/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.listen(PORT, () => {
    console.log(`traffic-service running on port ${PORT}`);
  });
}

startServer();
