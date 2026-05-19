# Smart Urban Traffic Management Platform

## Architecture Microservices
Chaque service possede :
- Sa propre base de donnees
- Ses propres APIs
- Son propre dossier

Communication :
- REST interne
- GraphQL Gateway
- WebSocket temps reel

## Structure des dossiers
smart-traffic-platform/
|
|-- auth-service/
|-- vehicle-service/
|-- traffic-service/
|-- incident-service/
|-- notification-service/
|-- graphql-gateway/
|-- frontend-dashboard/
|-- docker-compose.yml
`-- README.md

## Personne 1 - Backend Authentication & API Gateway
Responsable :
- Securite + GraphQL + Architecture centrale

### Taches principales
1) Service Authentification
Developper tout le systeme de securite.

Fonctionnalites :
- Inscription utilisateur
- Connexion utilisateur
- Hash password avec bcrypt
- Generation JWT
- Middleware AuthGuard

Gestion des roles :
- ADMIN
- OPERATOR

Endpoints :
- POST /register
- POST /login
- GET /profile

Base de donnees :
Table users :
- id
- username
- email
- password
- role
- created_at

2) API Gateway GraphQL
Creer la passerelle principale GraphQL.

Responsabilites :
- Centraliser tous les microservices
- Fusionner les donnees
- Gerer les requetes GraphQL
- Securiser les acces JWT

Implementation :
- Apollo Gateway
- GraphQL Resolvers
- GraphQL Schema

Exemples de requetes :
- getVehicles
- getIncidents
- login
- createIncident

3) Gestion de securite
Implementer :
- JWT verification
- Authorization par role
- Validation des donnees
- Gestion globale des erreurs

4) Documentation
Responsable de :
- README principal
- Documentation GraphQL
- Diagramme architecture globale

Livrables Personne 1 :
- Service Auth complet
- API Gateway GraphQL
- JWT securise
- Documentation API
- GraphQL Playground

Note : poucher chaque etape de ce projet avec commit claire.

## UML a Realiser
Diagrammes demandes :
- Diagramme de cas d'utilisation (Admin, Operator)
- Diagramme de classes (User, Vehicle, Incident, Notification, TrafficZone)
- Diagramme de sequence (Login JWT, Detection incident, Notification automatique)
- Diagramme d'architecture (Microservices, Gateway GraphQL)

## Bonus Fortement Recommandes
1) Docker Compose
Permet lancer tous les services facilement :
- docker-compose up

2) WebSocket
Mise a jour temps reel :
- Position vehicules
- Incidents
- Notifications

3) Carte Interactive
Afficher :
- Vehicules
- Zones congestionnees
- Incidents

4) CI/CD
GitHub Actions :
- Tests automatiques
- Build automatique

## Repartition GitHub
Branche par personne :
- Personne 1 : feature/auth-graphql
- Personne 2 : feature/vehicles-traffic
- Personne 3 : feature/incidents-frontend

## Presentation Finale
Demonstration a preparer :
- Login JWT
- Dashboard
- Creation vehicule
- Simulation GPS
- Detection congestion
- Creation incident
- Notification temps reel
- Requetes GraphQL

## Resultat Final Attendu
Une plateforme moderne capable de :
- Superviser les vehicules urbains
- Analyser le trafic
- Detecter les incidents
- Envoyer des alertes intelligentes
- Fournir un dashboard temps reel
- Centraliser toutes les donnees via GraphQL
- Avec une architecture professionnelle basee sur les microservices