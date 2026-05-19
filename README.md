# Smart Urban Traffic Management Platform

Plateforme microservices pour superviser les vehicules urbains, analyser le trafic, gerer les incidents et envoyer des alertes via une passerelle GraphQL.

## Etat du projet

- Personne 1: authentification REST, JWT, bcrypt, roles ADMIN/OPERATOR, AuthGuard et API Gateway Apollo.
- Personne 2: gestion vehicules, suivi GPS, historique positions, simulation GPS, WebSocket positions et analyse trafic.
- Personne 3: gestion incidents, notifications automatiques et dashboard React.

## Architecture

- `backend/auth-service`: inscription, connexion, profil, roles, sous-graphe GraphQL.
- `backend/vehicle-service`: CRUD vehicules, positions GPS, historique, simulation, WebSocket.
- `backend/traffic-service`: CRUD zones trafic, calcul densite, classification Faible/Moyen/Eleve.
- `backend/incident-service`: CRUD incidents, changement statut, notification automatique.
- `backend/notification-service`: creation, historique et marquage des notifications.
- `backend/graphql-gateway`: Apollo Gateway centralisant les sous-graphes.
- `smart-traffic-frontend`: dashboard React/Vite pour incidents et alertes.

## Ports

- Gateway GraphQL: `http://localhost:4000/graphql`
- Auth REST/GraphQL: `http://localhost:4001`
- Vehicle REST/GraphQL/WebSocket: `http://localhost:4002`
- Traffic REST/GraphQL: `http://localhost:4003`
- Incident REST/GraphQL: `http://localhost:4004`
- Notification REST/GraphQL: `http://localhost:4005`
- Frontend dashboard: `http://localhost:5173`

## Quick Start Docker

```bash
docker-compose up --build
```

Le gateway et les services GraphQL exposent Apollo Sandbox sur `/graphql`.

## Developpement Local

```bash
cd backend/auth-service
npm install
copy .env.example .env
npx prisma generate
npx prisma migrate dev --name init
npm run prisma:seed
npm run dev
```

Comptes de test crees par le seed:

| Role | Email | Mot de passe |
| --- | --- | --- |
| ADMIN | `admin@smarttraffic.local` | `admin123` |
| OPERATOR | `operator@smarttraffic.local` | `operator123` |

```bash
cd backend/graphql-gateway
npm install
copy .env.example .env
npm run dev
```

```bash
cd smart-traffic-frontend
npm install
npm run dev
```

## Documentation

- Auth REST: `docs/auth-api.md`
- GraphQL Gateway: `docs/graphql.md`
- UML et architecture: `docs/uml.md`
- Repartition du code par personne: `docs/repartition-code.md`

## Branches Recommandees

- Personne 1: `feature/auth-graphql`
- Personne 2: `feature/vehicles-traffic`
- Personne 3: `feature/incidents-frontend`

## Demo Finale

Scenario conseille: login JWT, consultation GraphQL, creation vehicule, simulation GPS, analyse congestion, creation incident, notification automatique, dashboard.
