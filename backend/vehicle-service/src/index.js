require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const http = require("http");
const WebSocket = require("ws");
const { v4: uuidv4 } = require("uuid");
const { ApolloServer } = require("@apollo/server");
const { expressMiddleware } = require("@apollo/server/express4");
const { buildSubgraphSchema } = require("@apollo/subgraph");
const { gql } = require("graphql-tag");

const PORT = Number(process.env.PORT || 4002);

// In-memory storage for vehicles and positions. Small, simple, and easy to extend.
const vehicles = [
  { id: "v1", matricule: "AA-123-BB", type: "car", marque: "Renault", status: "ACTIVE", lat: 36.8065, lng: 10.1815 },
  { id: "v2", matricule: "CC-456-DD", type: "bus", marque: "Mercedes", status: "IDLE", lat: 36.81, lng: 10.19 }
];

const positions = [
  // sample position
  { id: uuidv4(), vehicle_id: "v1", latitude: 36.8065, longitude: 10.1815, speed: 20, created_at: new Date().toISOString() }
];

let broadcast = () => {};

function findVehicle(id) {
  return vehicles.find((vehicle) => vehicle.id === id);
}

function hasValidCoordinates(latitude, longitude) {
  return Number.isFinite(Number(latitude)) && Number.isFinite(Number(longitude));
}

const typeDefs = gql`
  type Vehicle @key(fields: "id") {
    id: ID!
    matricule: String!
    plate: String!
    type: String!
    marque: String!
    status: String!
    lat: Float!
    lng: Float!
  }

  type Query {
    getVehicles: [Vehicle!]!
    vehicle(id: ID!): Vehicle
  }

  type Mutation {
    createVehicle(matricule: String!, type: String, marque: String, status: String): Vehicle!
    updateVehicle(id: ID!, matricule: String, type: String, marque: String, status: String): Vehicle!
    deleteVehicle(id: ID!): Boolean!
    updateVehiclePosition(id: ID!, lat: Float!, lng: Float!, speed: Float): Vehicle!
  }
`;

const resolvers = {
  Query: {
    getVehicles: () => vehicles,
    vehicle: (_, { id }) => vehicles.find((vehicle) => vehicle.id === id)
  },
  Mutation: {
    createVehicle: (_, { matricule, type, marque, status }) => {
      const vehicle = {
        id: uuidv4(),
        matricule,
        type: type || "unknown",
        marque: marque || "unknown",
        status: status || "IDLE",
        lat: 0,
        lng: 0
      };
      vehicles.push(vehicle);
      return vehicle;
    },
    updateVehicle: (_, { id, matricule, type, marque, status }) => {
      const vehicle = findVehicle(id);
      if (!vehicle) {
        throw new Error("Vehicle not found");
      }

      if (matricule !== undefined) vehicle.matricule = matricule;
      if (type !== undefined) vehicle.type = type;
      if (marque !== undefined) vehicle.marque = marque;
      if (status !== undefined) vehicle.status = status;
      return vehicle;
    },
    deleteVehicle: (_, { id }) => {
      const index = vehicles.findIndex((vehicle) => vehicle.id === id);
      if (index === -1) {
        throw new Error("Vehicle not found");
      }

      vehicles.splice(index, 1);
      for (let i = positions.length - 1; i >= 0; i -= 1) {
        if (positions[i].vehicle_id === id) {
          positions.splice(i, 1);
        }
      }
      return true;
    },
    updateVehiclePosition: (_, { id, lat, lng, speed }) => {
      const vehicle = findVehicle(id);
      if (!vehicle) {
        throw new Error("Vehicle not found");
      }

      vehicle.lat = lat;
      vehicle.lng = lng;
      // also create a position record
      const pos = { id: uuidv4(), vehicle_id: id, latitude: lat, longitude: lng, speed: speed || 0, created_at: new Date().toISOString() };
      positions.push(pos);
      broadcast({ type: "position", data: pos });
      return vehicle;
    }
  },
  Vehicle: {
    plate: (vehicle) => vehicle.plate || vehicle.matricule,
    __resolveReference: (reference) => vehicles.find((vehicle) => vehicle.id === reference.id)
  }
};

async function startServer() {
  const app = express();
  app.use(cors());
  app.use(helmet());
  app.use(morgan("dev"));

  app.use(express.json());

  // REST endpoints for vehicle management
  app.post("/vehicles", (req, res) => {
    const { matricule, type, marque, status } = req.body;
    if (!matricule) return res.status(400).json({ error: "matricule required" });
    const id = uuidv4();
    const v = { id, matricule, type: type || "unknown", marque: marque || "unknown", status: status || "IDLE", lat: 0, lng: 0 };
    vehicles.push(v);
    res.status(201).json(v);
  });

  app.get("/vehicles", (req, res) => {
    res.json(vehicles);
  });

  app.get("/vehicles/:id", (req, res) => {
    const v = findVehicle(req.params.id);
    if (!v) return res.status(404).json({ error: "not found" });
    res.json(v);
  });

  app.put("/vehicles/:id", (req, res) => {
    const vehicle = findVehicle(req.params.id);
    if (!vehicle) return res.status(404).json({ error: "not found" });

    const { matricule, type, marque, status } = req.body || {};
    if (matricule !== undefined) vehicle.matricule = matricule;
    if (type !== undefined) vehicle.type = type;
    if (marque !== undefined) vehicle.marque = marque;
    if (status !== undefined) vehicle.status = status;

    res.json(vehicle);
  });

  app.delete("/vehicles/:id", (req, res) => {
    const index = vehicles.findIndex((vehicle) => vehicle.id === req.params.id);
    if (index === -1) return res.status(404).json({ error: "not found" });

    const [removed] = vehicles.splice(index, 1);
    for (let i = positions.length - 1; i >= 0; i -= 1) {
      if (positions[i].vehicle_id === removed.id) {
        positions.splice(i, 1);
      }
    }

    res.json(removed);
  });

  app.post("/vehicles/:id/position", (req, res) => {
    const { latitude, longitude, speed } = req.body;
    const vehicle = findVehicle(req.params.id);
    if (!vehicle) return res.status(404).json({ error: "vehicle not found" });
    if (!hasValidCoordinates(latitude, longitude)) {
      return res.status(400).json({ error: "latitude and longitude required" });
    }
    const pos = { id: uuidv4(), vehicle_id: vehicle.id, latitude, longitude, speed: speed || 0, created_at: new Date().toISOString() };
    positions.push(pos);
    vehicle.lat = latitude;
    vehicle.lng = longitude;
    // broadcast to websocket clients
    broadcast({ type: "position", data: pos });
    res.status(201).json(pos);
  });

  app.get("/vehicles/:id/history", (req, res) => {
    const hist = positions.filter((p) => p.vehicle_id === req.params.id).sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    res.json(hist);
  });

  // simple GPS simulation endpoint: create `steps` positions with incremental offset
  app.post("/vehicles/:id/simulate", (req, res) => {
    const { steps = 5, deltaLat = 0.0001, deltaLng = 0.0001, baseSpeed = 30 } = req.body || {};
    const vehicle = findVehicle(req.params.id);
    if (!vehicle) return res.status(404).json({ error: "vehicle not found" });
    const created = [];
    for (let i = 0; i < steps; i++) {
      const lat = vehicle.lat + deltaLat * (i + 1);
      const lng = vehicle.lng + deltaLng * (i + 1);
      const pos = { id: uuidv4(), vehicle_id: vehicle.id, latitude: lat, longitude: lng, speed: baseSpeed, created_at: new Date().toISOString() };
      positions.push(pos);
      vehicle.lat = lat;
      vehicle.lng = lng;
      created.push(pos);
      broadcast({ type: "position", data: pos });
    }
    res.json({ created });
  });


  const apolloServer = new ApolloServer({
    schema: buildSubgraphSchema([{ typeDefs, resolvers }])
  });

  await apolloServer.start();

  app.use("/graphql", expressMiddleware(apolloServer));

  app.get("/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // create HTTP server and attach WebSocket server for realtime updates
  const httpServer = http.createServer(app);
  const wss = new WebSocket.Server({ server: httpServer, path: "/ws" });

  broadcast = function broadcastMessage(obj) {
    const data = JSON.stringify(obj);
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) client.send(data);
    });
  };

  wss.on("connection", (ws) => {
    ws.send(JSON.stringify({ type: "welcome", message: "connected to vehicle-service" }));
    ws.on("message", (m) => {
      // echo or log incoming messages
      try {
        const parsed = JSON.parse(m.toString());
        console.log("ws recv:", parsed);
      } catch (e) {
        console.log("ws recv (raw):", m.toString());
      }
    });
  });

  httpServer.listen(PORT, () => {
    console.log(`vehicle-service running on port ${PORT}`);
  });
}

startServer();
