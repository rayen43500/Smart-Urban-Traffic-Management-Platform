const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const { ApolloServer } = require("@apollo/server");
const { expressMiddleware } = require("@apollo/server/express4");
const { buildSubgraphSchema } = require("@apollo/subgraph");
const config = require("./config");
const errorHandler = require("./middleware/errorHandler");
const authRoutes = require("./routes/authRoutes");
const profileRoutes = require("./routes/profileRoutes");
const typeDefs = require("./graphql/schema");
const resolvers = require("./graphql/resolvers");
const { getUserFromHeader } = require("./utils/jwt");

async function startServer() {
  const app = express();

  app.use(cors());
  app.use(helmet());
  app.use(morgan("dev"));
  app.use(express.json());

  app.use("/", authRoutes);
  app.use("/", profileRoutes);

  const server = new ApolloServer({
    schema: buildSubgraphSchema([{ typeDefs, resolvers }])
  });

  await server.start();

  app.use(
    "/graphql",
    expressMiddleware(server, {
      context: async ({ req }) => ({
        user: getUserFromHeader(req.headers.authorization)
      })
    })
  );

  app.get("/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.use(errorHandler);

  app.listen(config.port, () => {
    console.log(`auth-service running on port ${config.port}`);
  });
}

startServer();
