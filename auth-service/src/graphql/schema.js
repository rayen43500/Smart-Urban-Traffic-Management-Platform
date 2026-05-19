const { gql } = require("graphql-tag");

const typeDefs = gql`
  enum UserRole {
    ADMIN
    OPERATOR
  }

  type User @key(fields: "id") {
    id: ID!
    username: String!
    email: String!
    role: UserRole!
    createdAt: String!
  }

  type AuthPayload {
    token: String!
    user: User!
  }

  type Query {
    me: User
  }

  type Mutation {
    login(email: String!, password: String!): AuthPayload!
    register(username: String!, email: String!, password: String!, role: UserRole): AuthPayload!
  }
`;

module.exports = typeDefs;
