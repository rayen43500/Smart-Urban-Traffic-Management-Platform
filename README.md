# Smart Urban Traffic Management Platform

Modern microservices platform to supervise urban vehicles, analyze traffic, detect incidents, and send intelligent alerts through a GraphQL gateway.

## Services
- auth-service: REST auth + GraphQL subgraph (users, login, roles)
- vehicle-service: GraphQL subgraph for vehicles
- traffic-service: GraphQL subgraph for traffic zones
- incident-service: GraphQL subgraph for incidents
- notification-service: GraphQL subgraph for notifications
- graphql-gateway: Apollo Gateway that composes subgraphs
- frontend-dashboard: placeholder for the UI

## Architecture
- Each service has its own API and database
- Internal communication via REST and GraphQL federation
- Real-time updates via WebSocket (planned)

## Quick start (Docker)
1) Start all services:
   docker-compose up --build
2) Gateway: http://localhost:4000/graphql
3) Auth service REST: http://localhost:4001

## Local development (example)
Auth service:
- cd auth-service
- npm install
- cp .env.example .env
- npx prisma generate
- npx prisma migrate dev --name init
- npm run dev

Gateway:
- cd graphql-gateway
- npm install
- cp .env.example .env
- npm run dev

## Documentation
- GraphQL: docs/graphql.md
- UML diagrams: docs/uml.md

## Branching
- Personne 1: feature/auth-graphql
- Personne 2: feature/vehicles-traffic
- Personne 3: feature/incidents-frontend
