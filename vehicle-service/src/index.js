require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const { ApolloServer } = require("@apollo/server");
const { expressMiddleware } = require("@apollo/server/express4");
const { buildSubgraphSchema } = require("@apollo/subgraph");
const { gql } = require("graphql-tag");

const PORT = Number(process.env.PORT || 4002);

const vehicles = [
  { id: "v1", plate: "AA-123-BB", status: "ACTIVE", lat: 36.8065, lng: 10.1815 },
  { id: "v2", plate: "CC-456-DD", status: "IDLE", lat: 36.81, lng: 10.19 }
];

const typeDefs = gql`
  type Vehicle @key(fields: "id") {
    id: ID!
    plate: String!
    status: String!
    lat: Float!
    lng: Float!
  }

  type Query {
    getVehicles: [Vehicle!]!
    vehicle(id: ID!): Vehicle
  }

  type Mutation {
    updateVehiclePosition(id: ID!, lat: Float!, lng: Float!): Vehicle!
  }
`;

const resolvers = {
  Query: {
    getVehicles: () => vehicles,
    vehicle: (_, { id }) => vehicles.find((vehicle) => vehicle.id === id)
  },
  Mutation: {
    updateVehiclePosition: (_, { id, lat, lng }) => {
      const vehicle = vehicles.find((item) => item.id === id);
      if (!vehicle) {
        throw new Error("Vehicle not found");
      }

      vehicle.lat = lat;
      vehicle.lng = lng;
      return vehicle;
    }
  },
  Vehicle: {
    __resolveReference: (reference) => vehicles.find((vehicle) => vehicle.id === reference.id)
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
    console.log(`vehicle-service running on port ${PORT}`);
  });
}

startServer();
