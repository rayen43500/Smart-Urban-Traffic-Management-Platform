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

const PORT = Number(process.env.PORT || 4005);

const notifications = [
  {
    id: randomUUID(),
    message: "Incident detecte sur Avenue Centrale",
    channel: "DASHBOARD",
    source: "AUTO",
    incident_id: "sample-incident",
    read: false,
    created_at: new Date().toISOString()
  }
];

function findNotification(id) {
  return notifications.find((note) => note.id === id);
}

function createNotification({ message, channel, source, incident_id }) {
  return {
    id: randomUUID(),
    message,
    channel: channel || "DASHBOARD",
    source,
    incident_id: incident_id || null,
    read: false,
    created_at: new Date().toISOString()
  };
}

const typeDefs = gql`
  type Notification @key(fields: "id") {
    id: ID!
    message: String!
    channel: String!
    source: String!
    incidentId: String
    read: Boolean!
    createdAt: String!
  }

  type Query {
    getNotifications: [Notification!]!
  }

  type Mutation {
    createNotification(message: String!, channel: String, incidentId: String): Notification!
    markNotificationRead(id: ID!): Notification!
  }
`;

const resolvers = {
  Query: {
    getNotifications: () => notifications
  },
  Mutation: {
    createNotification: (_, { message, channel, incidentId }) => {
      const notification = createNotification({
        message,
        channel,
        source: "MANUAL",
        incident_id: incidentId
      });
      notifications.unshift(notification);
      return notification;
    },
    markNotificationRead: (_, { id }) => {
      const notification = findNotification(id);
      if (!notification) throw new Error("Notification not found");
      notification.read = true;
      return notification;
    }
  },
  Notification: {
    createdAt: (note) => note.created_at,
    incidentId: (note) => note.incident_id,
    __resolveReference: (reference) => notifications.find((note) => note.id === reference.id)
  }
};

async function startServer() {
  const app = express();
  app.use(cors());
  app.use(helmet());
  app.use(morgan("dev"));
  app.use(express.json());

  app.post("/notifications", (req, res) => {
    const { message, channel, incident_id } = req.body || {};
    if (!message) return res.status(400).json({ error: "message required" });
    const notification = createNotification({
      message,
      channel,
      source: "MANUAL",
      incident_id
    });
    notifications.unshift(notification);
    return res.status(201).json(notification);
  });

  app.post("/notifications/auto", (req, res) => {
    const { message, channel, incident_id } = req.body || {};
    if (!message) return res.status(400).json({ error: "message required" });
    const notification = createNotification({
      message,
      channel,
      source: "AUTO",
      incident_id
    });
    notifications.unshift(notification);
    return res.status(201).json(notification);
  });

  app.get("/notifications", (req, res) => {
    const { unread } = req.query || {};
    if (unread === "true") {
      return res.json(notifications.filter((note) => !note.read));
    }
    return res.json(notifications);
  });

  app.patch("/notifications/:id/read", (req, res) => {
    const notification = findNotification(req.params.id);
    if (!notification) return res.status(404).json({ error: "not found" });
    notification.read = true;
    return res.json(notification);
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
    console.log(`notification-service running on port ${PORT}`);
  });
}

startServer();
