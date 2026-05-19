require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const { ApolloServer } = require("@apollo/server");
const { expressMiddleware } = require("@apollo/server/express4");
const { buildSubgraphSchema } = require("@apollo/subgraph");
const { gql } = require("graphql-tag");

const PORT = Number(process.env.PORT || 4004);

const incidents = [
  { id: "i1", type: "ACCIDENT", severity: "HIGH", status: "OPEN", createdAt: new Date().toISOString() }
];

const typeDefs = gql`
  type Incident @key(fields: "id") {
    id: ID!
    type: String!
    severity: String!
    status: String!
    createdAt: String!
  }

  type Query {
    getIncidents: [Incident!]!
  }

  type Mutation {
    createIncident(type: String!, severity: String!): Incident!
  }
`;

const resolvers = {
  Query: {
    getIncidents: () => incidents
  },
  Mutation: {
    createIncident: (_, { type, severity }) => {
      const incident = {
        id: `i${incidents.length + 1}`,
        type,
        severity,
        status: "OPEN",
        createdAt: new Date().toISOString()
      };
      incidents.unshift(incident);
      return incident;
    }
  },
  Incident: {
    __resolveReference: (reference) => incidents.find((incident) => incident.id === reference.id)
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
    console.log(`incident-service running on port ${PORT}`);
  });
}

startServer();
