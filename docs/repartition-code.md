# Repartition du Code par Personne

Ce document explique toutes les grandes parties du projet, les dossiers associes et le role de chaque personne dans l'architecture.

## Vue Globale du Projet

Le projet est une plateforme de gestion intelligente du trafic urbain basee sur une architecture microservices.

Objectif general:

- Authentifier les utilisateurs avec JWT.
- Centraliser les donnees via une passerelle GraphQL.
- Gerer les vehicules et leurs positions GPS.
- Analyser les zones de trafic.
- Gerer les incidents routiers.
- Envoyer des notifications automatiques.
- Fournir un dashboard frontend pour l'utilisateur.

Structure principale:

```text
Smart-Urban-Traffic-Management-Platform/
|-- backend/
|   |-- auth-service/
|   |-- graphql-gateway/
|   |-- vehicle-service/
|   |-- traffic-service/
|   |-- incident-service/
|   `-- notification-service/
|-- smart-traffic-frontend/
|-- docs/
|-- docker-compose.yml
`-- README.md
```

## Personne 1 - Backend Authentication & API Gateway

Responsabilite:

- Securite.
- Authentification.
- JWT.
- Roles.
- API Gateway GraphQL.
- Architecture centrale.

### Dossiers Responsables

```text
backend/auth-service/
backend/graphql-gateway/
docs/auth-api.md
docs/graphql.md
docs/uml.md
README.md
docker-compose.yml
```

### 1. Auth Service

Dossier:

```text
backend/auth-service/
```

Role du service:

- Gerer l'inscription utilisateur.
- Gerer la connexion utilisateur.
- Hasher les mots de passe avec `bcrypt`.
- Generer un JWT apres login/register.
- Verifier les tokens avec un middleware `authGuard`.
- Proteger les routes selon le role `ADMIN` ou `OPERATOR`.

Fichiers importants:

- `src/index.js`: demarre Express, active les middlewares, branche REST et GraphQL.
- `src/routes/authRoutes.js`: routes REST `/register`, `/login`, `/admin/users`.
- `src/routes/profileRoutes.js`: route REST `/profile`.
- `src/middleware/authGuard.js`: verifie le token JWT et les roles.
- `src/middleware/errorHandler.js`: gere les erreurs globales.
- `src/services/userService.js`: logique metier utilisateur.
- `src/utils/password.js`: hash et comparaison du mot de passe.
- `src/utils/jwt.js`: generation et verification JWT.
- `src/validators/authValidators.js`: validation avec `zod`.
- `src/graphql/schema.js`: schema GraphQL du service auth.
- `src/graphql/resolvers.js`: resolvers GraphQL login/register/users/me.
- `prisma/schema.prisma`: modele base de donnees `User`.
- `prisma/seed.js`: cree les comptes de test pour la connexion.

Base de donnees:

```text
users
|-- id
|-- username
|-- email
|-- password
|-- role
`-- created_at
```

Endpoints REST:

```http
POST /register
POST /login
GET /profile
GET /admin/users
GET /health
```

Seed data connexion:

```bash
cd backend/auth-service
npm run prisma:seed
```

| Role | Email | Mot de passe |
| --- | --- | --- |
| ADMIN | `admin@smarttraffic.local` | `admin123` |
| OPERATOR | `operator@smarttraffic.local` | `operator123` |

GraphQL:

```graphql
query {
  me {
    id
    username
    email
    role
  }
}
```

```graphql
mutation {
  login(email: "user@example.com", password: "secret123") {
    token
    user {
      id
      username
      role
    }
  }
}
```

Explication:

- Quand l'utilisateur s'inscrit, son mot de passe est hashe avant d'etre stocke.
- Quand l'utilisateur se connecte, le service compare le mot de passe envoye avec le hash stocke.
- Si les identifiants sont corrects, le service genere un JWT.
- Le JWT est ensuite envoye dans le header `Authorization: Bearer <token>`.
- Les routes protegees utilisent `authGuard`.
- Les routes admin utilisent aussi `requireRole("ADMIN")`.

### 2. GraphQL Gateway

Dossier:

```text
backend/graphql-gateway/
```

Role du gateway:

- Centraliser les microservices GraphQL.
- Composer les sous-graphes Apollo.
- Recevoir les requetes frontend/client.
- Rediriger les operations vers le bon service.
- Transmettre les informations utilisateur extraites du JWT aux services.

Fichiers importants:

- `src/index.js`: configuration Apollo Gateway, liste des services et serveur Express.
- `src/auth.js`: verification du token JWT.
- `.env.example`: URLs internes des services.

Services federes:

```text
auth-service          -> http://localhost:4001/graphql
vehicle-service       -> http://localhost:4002/graphql
traffic-service       -> http://localhost:4003/graphql
incident-service      -> http://localhost:4004/graphql
notification-service  -> http://localhost:4005/graphql
```

Endpoint principal:

```http
POST /graphql
GET /graphql
GET /health
```

Explication:

- Le client envoie ses requetes a `http://localhost:4000/graphql`.
- Le gateway analyse la requete.
- Il appelle le sous-service concerne.
- Il peut transmettre `x-user-id`, `x-user-role` et `x-user-email` aux services.
- Cela permet une architecture centralisee et professionnelle.

### Livrables Personne 1

- Authentification complete.
- JWT securise.
- Roles `ADMIN` et `OPERATOR`.
- Middleware de securite.
- Gateway GraphQL.
- Documentation API.
- Diagrammes UML et architecture.

## Personne 2 - Gestion des Vehicules & Gestion du Trafic

Responsabilite:

- Vehicules.
- GPS tracking.
- Simulation de positions.
- Historique des deplacements.
- Analyse du trafic.
- Detection de congestion.

### Dossiers Responsables

```text
backend/vehicle-service/
backend/traffic-service/
```

### 1. Vehicle Service

Dossier:

```text
backend/vehicle-service/
```

Role du service:

- Ajouter un vehicule.
- Lister les vehicules.
- Afficher le detail d'un vehicule.
- Modifier un vehicule.
- Supprimer un vehicule.
- Ajouter une position GPS.
- Consulter l'historique GPS.
- Simuler le deplacement GPS.
- Envoyer les positions en temps reel avec WebSocket.

Fichiers importants:

- `src/index.js`: contient l'API REST, le sous-graphe GraphQL, le stockage temporaire et WebSocket.
- `package.json`: dependances du service, dont `ws` et `uuid`.
- `Dockerfile`: image Docker du service.

Donnees gerees:

```text
vehicles
|-- id
|-- matricule
|-- type
|-- marque
|-- status
|-- lat
`-- lng

positions
|-- id
|-- vehicle_id
|-- latitude
|-- longitude
|-- speed
`-- created_at
```

Endpoints REST:

```http
POST /vehicles
GET /vehicles
GET /vehicles/:id
PUT /vehicles/:id
DELETE /vehicles/:id
POST /vehicles/:id/position
GET /vehicles/:id/history
POST /vehicles/:id/simulate
GET /health
```

WebSocket:

```text
ws://localhost:4002/ws
```

GraphQL:

```graphql
query {
  getVehicles {
    id
    matricule
    plate
    type
    marque
    status
    lat
    lng
  }
}
```

```graphql
mutation {
  updateVehiclePosition(id: "v1", lat: 36.8065, lng: 10.1815, speed: 30) {
    id
    lat
    lng
  }
}
```

Explication:

- Chaque vehicule possede une position actuelle.
- Chaque nouvelle position est ajoutee dans l'historique.
- L'endpoint `/simulate` cree plusieurs positions automatiquement.
- WebSocket diffuse les nouvelles positions aux clients connectes.
- Le champ GraphQL `plate` est lie a `matricule` pour rester compatible avec le diagramme UML.

### 2. Traffic Service

Dossier:

```text
backend/traffic-service/
```

Role du service:

- Creer une zone de trafic.
- Lister les zones.
- Modifier une zone.
- Supprimer une zone.
- Analyser les positions autour d'une zone.
- Calculer la densite.
- Calculer la vitesse moyenne.
- Classer le niveau de trafic: `Faible`, `Moyen`, `Eleve`.

Fichiers importants:

- `src/index.js`: API REST, schema GraphQL, resolvers et algorithme de congestion.
- `package.json`: dependances Express/Apollo.
- `Dockerfile`: image Docker du service.

Donnees gerees:

```text
traffic_zones
|-- id
|-- zone_name
|-- latitude
|-- longitude
|-- density
`-- level
```

Endpoints REST:

```http
POST /zones
GET /zones
GET /zones/:id
PUT /zones/:id
DELETE /zones/:id
POST /zones/:id/analyze
GET /health
```

GraphQL:

```graphql
query {
  getTrafficZones {
    id
    name
    zoneName
    latitude
    longitude
    density
    level
    congestionLevel
    status
  }
}
```

Explication:

- Le service utilise une formule Haversine pour calculer la distance entre une zone et les positions GPS.
- Il compte les positions proches dans un rayon donne.
- Il calcule la vitesse moyenne.
- Si la densite est elevee ou la vitesse faible, le niveau devient `Eleve`.
- Sinon le niveau devient `Moyen` ou `Faible`.

### Livrables Personne 2

- Service vehicules complet.
- CRUD vehicules.
- Tracking GPS.
- Historique positions.
- Simulation GPS.
- WebSocket positions.
- Service trafic.
- Analyse congestion.

## Personne 3 - Incidents, Notifications & Frontend

Responsabilite:

- Gestion des incidents routiers.
- Notifications automatiques.
- Dashboard utilisateur.
- Interface frontend.

### Dossiers Responsables

```text
backend/incident-service/
backend/notification-service/
smart-traffic-frontend/
```

### 1. Incident Service

Dossier:

```text
backend/incident-service/
```

Role du service:

- Declarer un incident.
- Lister les incidents.
- Modifier un incident.
- Supprimer un incident.
- Changer le statut d'un incident.
- Envoyer automatiquement une notification quand un incident est cree ou mis a jour.

Fichiers importants:

- `src/index.js`: API REST, schema GraphQL, resolvers et appel notification.
- `package.json`: dependances Express/Apollo.
- `.env.example`: configuration du port et de l'URL notification.

Types d'incidents:

```text
ACCIDENT
TRAVAUX
ROUTE_FERMEE
EMBOUTEILLAGE
```

Statuts:

```text
SIGNALE
EN_COURS
RESOLU
```

Donnees gerees:

```text
incidents
|-- id
|-- title
|-- description
|-- type
|-- status
|-- latitude
|-- longitude
`-- created_at
```

Endpoints REST:

```http
POST /incidents
GET /incidents
PUT /incidents/:id
DELETE /incidents/:id
PATCH /incidents/:id/status
GET /health
```

GraphQL:

```graphql
query {
  getIncidents {
    id
    title
    description
    type
    status
    latitude
    longitude
    createdAt
  }
}
```

```graphql
mutation {
  createIncident(
    title: "Accident Avenue Centrale"
    description: "Collision mineure"
    type: "ACCIDENT"
    latitude: 36.8065
    longitude: 10.1815
  ) {
    id
    title
    status
  }
}
```

Explication:

- Lorsqu'un incident est cree, son statut commence par `SIGNALE`.
- Le service valide le type et les coordonnees.
- Ensuite il appelle le notification-service via `/notifications/auto`.
- Cela cree une alerte automatique visible dans le dashboard.

### 2. Notification Service

Dossier:

```text
backend/notification-service/
```

Role du service:

- Creer une notification manuelle.
- Recevoir une notification automatique depuis incident-service.
- Lister l'historique.
- Filtrer les notifications non lues.
- Marquer une notification comme lue.

Fichiers importants:

- `src/index.js`: API REST, schema GraphQL, resolvers et stockage notifications.
- `package.json`: dependances Express/Apollo.
- `Dockerfile`: image Docker du service.

Donnees gerees:

```text
notifications
|-- id
|-- user_id
|-- message
|-- channel
|-- source
|-- incident_id
|-- is_read
`-- created_at
```

Endpoints REST:

```http
POST /notifications
POST /notifications/auto
GET /notifications
PATCH /notifications/:id/read
GET /health
```

GraphQL:

```graphql
query {
  getNotifications {
    id
    message
    channel
    source
    incidentId
    read
    createdAt
  }
}
```

```graphql
mutation {
  markNotificationRead(id: "notification-id") {
    id
    read
  }
}
```

Explication:

- `source` vaut `AUTO` pour les alertes envoyees automatiquement.
- `source` vaut `MANUAL` pour les notifications creees manuellement.
- Une notification commence avec `read: false`.
- L'endpoint `/notifications/:id/read` permet de la marquer comme lue.

### 3. Frontend Dashboard

Dossier:

```text
smart-traffic-frontend/
```

Role du frontend:

- Afficher les statistiques incidents.
- Afficher la liste des incidents.
- Creer un incident.
- Modifier un incident.
- Supprimer un incident.
- Changer le statut d'un incident.
- Afficher les notifications.
- Marquer une notification comme lue.

Fichiers importants:

- `src/App.tsx`: logique principale du dashboard.
- `src/App.css`: mise en page du dashboard.
- `src/index.css`: theme global, couleurs, typographie et boutons.
- `src/main.tsx`: point d'entree React.
- `package.json`: scripts `dev`, `build`, `lint`.

Fonctions importantes dans `App.tsx`:

- `refreshAll()`: charge incidents et notifications.
- `handleSubmit()`: cree ou modifie un incident.
- `updateStatus()`: change le statut d'un incident.
- `deleteIncident()`: supprime un incident.
- `markRead()`: marque une notification comme lue.
- `startEdit()`: remplit le formulaire pour modifier un incident.
- `cancelEdit()`: annule la modification.

Variables API:

```text
VITE_INCIDENT_API=http://localhost:4004
VITE_NOTIFICATION_API=http://localhost:4005
```

Explication:

- Le frontend communique directement avec `incident-service` et `notification-service`.
- Apres chaque action importante, il recharge les donnees.
- Les compteurs du dashboard sont calcules depuis la liste des incidents.
- Le frontend est correct pour la partie incidents et notifications.
- Les pages login/register, carte interactive, vehicules et statistiques trafic peuvent etre ajoutees en extension.

### Livrables Personne 3

- Service incidents.
- Service notifications.
- Notifications automatiques.
- Dashboard React.
- UI gestion incidents.
- UI historique notifications.

## Communication Entre Services

### REST Interne

Exemple:

```text
incident-service -> notification-service
```

Quand un incident est cree ou change de statut, `incident-service` appelle:

```http
POST /notifications/auto
```

### GraphQL Gateway

Exemple:

```text
Frontend / client -> graphql-gateway -> microservices
```

Le gateway expose un endpoint unique:

```http
http://localhost:4000/graphql
```

### WebSocket

Le service vehicules expose:

```text
ws://localhost:4002/ws
```

Il diffuse les nouvelles positions GPS aux clients connectes.

## Docker Compose

Fichier:

```text
docker-compose.yml
```

Role:

- Lancer PostgreSQL pour auth-service.
- Lancer tous les microservices backend.
- Lancer le gateway GraphQL.
- Lancer le frontend.

Commande:

```bash
docker-compose up --build
```

## Documentation Associee

- `docs/auth-api.md`: documentation REST du service auth.
- `docs/graphql.md`: exemples de requetes GraphQL.
- `docs/uml.md`: diagrammes UML et architecture.
- `docs/repartition-code.md`: repartition complete du code par personne.

## Scenario de Presentation

1. Lancer le projet avec Docker Compose.
2. Ouvrir le gateway GraphQL sur `http://localhost:4000/graphql`.
3. Faire un register/login et recuperer un JWT.
4. Tester `me` avec le JWT.
5. Creer un vehicule.
6. Simuler une position GPS.
7. Analyser une zone de trafic.
8. Creer un incident.
9. Montrer que la notification automatique est creee.
10. Ouvrir le dashboard React.
11. Modifier le statut d'un incident.
12. Marquer une notification comme lue.

## Resume Rapide par Personne

| Personne | Partie | Dossiers | Resultat |
| --- | --- | --- | --- |
| Personne 1 | Auth + Gateway | `backend/auth-service`, `backend/graphql-gateway` | Securite, JWT, roles, GraphQL central |
| Personne 2 | Vehicules + Trafic | `backend/vehicle-service`, `backend/traffic-service` | GPS, simulation, WebSocket, analyse congestion |
| Personne 3 | Incidents + Notifications + Frontend | `backend/incident-service`, `backend/notification-service`, `smart-traffic-frontend` | Alertes, dashboard, gestion incidents |

## Points Restants Possibles

- Ajouter une vraie base de donnees pour chaque microservice.
- Ajouter login/register dans le frontend.
- Ajouter Apollo Client dans le frontend.
- Ajouter une carte interactive Leaflet.
- Ajouter tests automatiques.
- Ajouter GitHub Actions CI/CD.
