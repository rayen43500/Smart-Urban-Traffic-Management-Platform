# UML Diagrams

## Use Case - Admin / Operator

```mermaid
flowchart LR
  admin([Admin])
  operator([Operator])

  ucAuth([Register / Login / View Profile])
  ucUsers([Manage Users])
  ucGateway([Query GraphQL Gateway])
  ucVehicles([Manage Vehicles])
  ucGps([Simulate GPS and View History])
  ucTraffic([Analyze Traffic Zones])
  ucIncidents([Manage Incidents])
  ucNotifications([View and Mark Notifications])
  ucDashboard([Use Dashboard])

  admin --> ucAuth
  admin --> ucUsers
  admin --> ucGateway
  admin --> ucVehicles
  admin --> ucGps
  admin --> ucTraffic
  admin --> ucIncidents
  admin --> ucNotifications
  admin --> ucDashboard

  operator --> ucAuth
  operator --> ucGateway
  operator --> ucVehicles
  operator --> ucGps
  operator --> ucTraffic
  operator --> ucIncidents
  operator --> ucNotifications
  operator --> ucDashboard
```

## Class Diagram

```mermaid
classDiagram
  class User {
    +String id
    +String username
    +String email
    +String password
    +Role role
    +DateTime created_at
  }

  class Vehicle {
    +String id
    +String matricule
    +String type
    +String marque
    +String status
    +Float lat
    +Float lng
  }

  class Position {
    +String id
    +String vehicle_id
    +Float latitude
    +Float longitude
    +Float speed
    +DateTime created_at
  }

  class TrafficZone {
    +String id
    +String zone_name
    +Float latitude
    +Float longitude
    +Int density
    +String level
  }

  class Incident {
    +String id
    +String title
    +String description
    +String type
    +String status
    +Float latitude
    +Float longitude
    +DateTime created_at
  }

  class Notification {
    +String id
    +String user_id
    +String message
    +String channel
    +Boolean is_read
    +DateTime created_at
  }

  class Role {
    <<enumeration>>
    ADMIN
    OPERATOR
  }

  User "1" --> "many" Incident : reports
  User "1" --> "many" Notification : receives
  Vehicle "1" --> "many" Position : has
  Vehicle "many" --> "1" TrafficZone : located_in
  TrafficZone "1" --> "many" Incident : detects
  Incident "1" --> "many" Notification : triggers
```

## Sequence Diagram - Login JWT

```mermaid
sequenceDiagram
  actor User
  participant Frontend
  participant Gateway as GraphQL Gateway
  participant AuthService
  participant Database as Auth DB

  User->>Frontend: Submit email/password
  Frontend->>Gateway: mutation login
  Gateway->>AuthService: Forward login
  AuthService->>Database: findUserByEmail
  Database-->>AuthService: user + hashed password
  AuthService->>AuthService: bcrypt compare
  AuthService->>AuthService: sign JWT
  AuthService-->>Gateway: token + profile
  Gateway-->>Frontend: token + profile
  Frontend-->>User: authenticated dashboard
```

## Sequence Diagram - Detection Incident

```mermaid
sequenceDiagram
  participant VehicleService
  participant TrafficService
  participant IncidentService
  participant NotificationService

  VehicleService->>VehicleService: receive GPS position
  VehicleService-->>TrafficService: positions for zone analysis
  TrafficService->>TrafficService: calculate density and avg speed
  TrafficService->>TrafficService: classify Faible / Moyen / Eleve
  alt congestion or anomaly detected
    TrafficService->>IncidentService: createIncident
    IncidentService->>NotificationService: POST /notifications/auto
  end
```

## Sequence Diagram - Notification Automatique

```mermaid
sequenceDiagram
  participant IncidentService
  participant NotificationService
  participant Dashboard
  actor Operator

  IncidentService->>NotificationService: notify(incident)
  NotificationService->>NotificationService: create notification
  Dashboard->>NotificationService: GET /notifications
  NotificationService-->>Dashboard: notifications list
  Dashboard-->>Operator: real-time alert view
  Operator->>Dashboard: mark as read
  Dashboard->>NotificationService: PATCH /notifications/:id/read
```

## Architecture Diagram

```mermaid
flowchart TB
  subgraph Client
    dashboard[React Dashboard]
  end

  subgraph Gateway
    gql[GraphQL Gateway - Apollo]
  end

  subgraph Backend Microservices
    auth[Auth Service]
    vehicle[Vehicle Service]
    traffic[Traffic Service]
    incident[Incident Service]
    notification[Notification Service]
  end

  subgraph Databases
    authdb[(Auth PostgreSQL)]
    vehicledb[(Vehicle DB)]
    trafficdb[(Traffic DB)]
    incidentdb[(Incident DB)]
    notificationdb[(Notification DB)]
  end

  dashboard --> gql
  dashboard --> incident
  dashboard --> notification
  dashboard -. WebSocket .-> vehicle

  gql --> auth
  gql --> vehicle
  gql --> traffic
  gql --> incident
  gql --> notification

  incident --> notification

  auth --> authdb
  vehicle --> vehicledb
  traffic --> trafficdb
  incident --> incidentdb
  notification --> notificationdb
```
