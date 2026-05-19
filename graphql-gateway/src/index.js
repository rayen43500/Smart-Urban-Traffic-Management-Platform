require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const { ApolloServer } = require("@apollo/server");
const { expressMiddleware } = require("@apollo/server/express4");
const { ApolloGateway, RemoteGraphQLDataSource } = require("@apollo/gateway");
const { getUserFromHeader } = require("./auth");

const PORT = Number(process.env.PORT || 4000);
const JWT_SECRET = process.env.JWT_SECRET || "";

const serviceList = [
  { name: "auth", url: process.env.AUTH_SERVICE_URL || "http://localhost:4001/graphql" },
  { name: "vehicle", url: process.env.VEHICLE_SERVICE_URL || "http://localhost:4002/graphql" },
  { name: "traffic", url: process.env.TRAFFIC_SERVICE_URL || "http://localhost:4003/graphql" },
  { name: "incident", url: process.env.INCIDENT_SERVICE_URL || "http://localhost:4004/graphql" },
  { name: "notification", url: process.env.NOTIFICATION_SERVICE_URL || "http://localhost:4005/graphql" }
];

async function startServer() {
  const app = express();
  app.use(cors());
  app.use(helmet());
  app.use(morgan("dev"));

  const gateway = new ApolloGateway({
    serviceList,
    buildService({ url }) {
      return new RemoteGraphQLDataSource({
        url,
        willSendRequest({ request, context }) {
          if (context.user) {
            request.http.headers.set("x-user-id", context.user.id);
            request.http.headers.set("x-user-role", context.user.role);
            request.http.headers.set("x-user-email", context.user.email || "");
          }
        }
      });
    }
  });

  const server = new ApolloServer({
    gateway,
    introspection: true
  });

  await server.start();

  app.use(
    "/graphql",
    expressMiddleware(server, {
      context: async ({ req }) => ({
        user: getUserFromHeader(req.headers.authorization, JWT_SECRET)
      })
    })
  );

  app.get("/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.listen(PORT, () => {
    console.log(`graphql-gateway running on port ${PORT}`);
  });
}

startServer();
