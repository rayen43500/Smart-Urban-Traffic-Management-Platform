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
