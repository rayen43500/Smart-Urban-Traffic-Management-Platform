require("dotenv").config();

const { randomUUID } = require("crypto");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const { ApolloServer } = require("@apollo/server");
const { expressMiddleware } = require("@apollo/server/express4");
const { buildSubgraphSchema } = require("@apollo/subgraph");
const { gql } = require("graphql-tag");

const PORT = Number(process.env.PORT || 4004);
const NOTIFICATION_SERVICE_URL = process.env.NOTIFICATION_SERVICE_URL || "";

const INCIDENT_TYPES = ["ACCIDENT", "TRAVAUX", "ROUTE_FERMEE", "EMBOUTEILLAGE"];
const INCIDENT_STATUSES = ["SIGNALE", "EN_COURS", "RESOLU"];

const incidents = [
  {
    id: randomUUID(),
    title: "Accident Avenue Centrale",
    description: "Collision mineure, voie partiellement bloquee",
    type: "ACCIDENT",
    status: "SIGNALE",
    latitude: 36.8065,
    longitude: 10.1815,
    created_at: new Date().toISOString()
  }
];

function normalizeEnum(value, allowed) {
  if (!value && value !== 0) return null;
  const cleaned = String(value)
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[-\s]+/g, "_")
    .toUpperCase();
  return allowed.includes(cleaned) ? cleaned : null;
}

function hasValidCoordinates(latitude, longitude) {
  return Number.isFinite(latitude) && Number.isFinite(longitude);
}

function findIncident(id) {
  return incidents.find((incident) => incident.id === id);
}

async function sendAutoNotification(payload) {
  if (!NOTIFICATION_SERVICE_URL) return;
  try {
    await fetch(`${NOTIFICATION_SERVICE_URL}/notifications/auto`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload)
    });
  } catch (error) {
    console.warn("notification-service unreachable", error.message);
  }
}

const typeDefs = gql`
  type Incident @key(fields: "id") {
    id: ID!
    title: String!
    description: String
    type: String!
    status: String!
    latitude: Float!
    longitude: Float!
    createdAt: String!
  }

  type Query {
    getIncidents: [Incident!]!
  }

  type Mutation {
    createIncident(
      title: String!
      description: String
      type: String!
      latitude: Float!
      longitude: Float!
    ): Incident!
    updateIncidentStatus(id: ID!, status: String!): Incident!
  }
`;

const resolvers = {
  Query: {
    getIncidents: () => incidents
  },
  Mutation: {
    createIncident: async (_, { title, description, type, latitude, longitude }) => {
      const normalizedType = normalizeEnum(type, INCIDENT_TYPES);
      if (!normalizedType || !title || !hasValidCoordinates(latitude, longitude)) {
        throw new Error("Invalid incident payload");
      }
      const incident = {
        id: randomUUID(),
        title,
        description: description || "",
        type: normalizedType,
        status: "SIGNALE",
        latitude,
        longitude,
        created_at: new Date().toISOString()
      };
      incidents.unshift(incident);
      await sendAutoNotification({
        message: `Incident signale: ${incident.title}`,
        channel: "SYSTEM",
        incident_id: incident.id
      });
      return incident;
    },
    updateIncidentStatus: async (_, { id, status }) => {
      const incident = findIncident(id);
      if (!incident) {
        throw new Error("Incident not found");
      }
      const normalizedStatus = normalizeEnum(status, INCIDENT_STATUSES);
      if (!normalizedStatus) {
        throw new Error("Invalid status");
      }
      incident.status = normalizedStatus;
      await sendAutoNotification({
        message: `Incident ${incident.title} -> ${incident.status}`,
        channel: "SYSTEM",
        incident_id: incident.id
      });
      return incident;
    }
  },
  Incident: {
    createdAt: (incident) => incident.created_at,
    __resolveReference: (reference) => incidents.find((incident) => incident.id === reference.id)
  }
};

async function startServer() {
  const app = express();
  app.use(cors());
  app.use(helmet());
  app.use(morgan("dev"));
  app.use(express.json());

  app.post("/incidents", async (req, res) => {
    const { title, description, type, latitude, longitude } = req.body || {};
    const normalizedType = normalizeEnum(type, INCIDENT_TYPES);
    if (!title || !normalizedType || !hasValidCoordinates(latitude, longitude)) {
      return res.status(400).json({ error: "title, type, latitude, longitude required" });
    }

    const incident = {
      id: randomUUID(),
      title,
      description: description || "",
      type: normalizedType,
      status: "SIGNALE",
      latitude,
      longitude,
      created_at: new Date().toISOString()
    };
    incidents.unshift(incident);

    await sendAutoNotification({
      message: `Incident signale: ${incident.title}`,
      channel: "SYSTEM",
      incident_id: incident.id
    });

    return res.status(201).json(incident);
  });

  app.get("/incidents", (req, res) => {
    const { status, type } = req.query || {};
    let result = incidents.slice();

    if (status) {
      const normalizedStatus = normalizeEnum(status, INCIDENT_STATUSES);
      if (!normalizedStatus) {
        return res.status(400).json({ error: "invalid status filter" });
      }
      result = result.filter((incident) => incident.status === normalizedStatus);
    }

    if (type) {
      const normalizedType = normalizeEnum(type, INCIDENT_TYPES);
      if (!normalizedType) {
        return res.status(400).json({ error: "invalid type filter" });
      }
      result = result.filter((incident) => incident.type === normalizedType);
    }

    return res.json(result);
  });

  app.put("/incidents/:id", (req, res) => {
    const incident = findIncident(req.params.id);
    if (!incident) return res.status(404).json({ error: "not found" });

    const { title, description, type, latitude, longitude } = req.body || {};
    if (type) {
      const normalizedType = normalizeEnum(type, INCIDENT_TYPES);
      if (!normalizedType) return res.status(400).json({ error: "invalid type" });
      incident.type = normalizedType;
    }
    if (title) incident.title = title;
    if (description !== undefined) incident.description = description || "";
    if (latitude !== undefined || longitude !== undefined) {
      if (!hasValidCoordinates(Number(latitude), Number(longitude))) {
        return res.status(400).json({ error: "latitude and longitude required" });
      }
      incident.latitude = Number(latitude);
      incident.longitude = Number(longitude);
    }

    return res.json(incident);
  });

  app.delete("/incidents/:id", (req, res) => {
    const idx = incidents.findIndex((incident) => incident.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: "not found" });
    const removed = incidents.splice(idx, 1)[0];
    return res.json(removed);
  });

  app.patch("/incidents/:id/status", async (req, res) => {
    const incident = findIncident(req.params.id);
    if (!incident) return res.status(404).json({ error: "not found" });
    const normalizedStatus = normalizeEnum(req.body?.status, INCIDENT_STATUSES);
    if (!normalizedStatus) {
      return res.status(400).json({ error: "status must be SIGNALE, EN_COURS, RESOLU" });
    }
    incident.status = normalizedStatus;

    await sendAutoNotification({
      message: `Incident ${incident.title} -> ${incident.status}`,
      channel: "SYSTEM",
      incident_id: incident.id
    });

    return res.json(incident);
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
    console.log(`incident-service running on port ${PORT}`);
  });
}

startServer();
