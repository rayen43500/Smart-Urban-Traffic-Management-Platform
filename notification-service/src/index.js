require("dotenv").config();

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
  { id: "n1", message: "Incident detected", channel: "SMS", createdAt: new Date().toISOString() }
];

const typeDefs = gql`
  type Notification @key(fields: "id") {
    id: ID!
    message: String!
    channel: String!
    createdAt: String!
  }

  type Query {
    getNotifications: [Notification!]!
  }
`;

const resolvers = {
  Query: {
    getNotifications: () => notifications
  },
  Notification: {
    __resolveReference: (reference) => notifications.find((note) => note.id === reference.id)
  }
};

async function startServer() {
  const app = express();
  app.use(cors());
  app.use(helmet());
  app.use(morgan("dev"));

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
