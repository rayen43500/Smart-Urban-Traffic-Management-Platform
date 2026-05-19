# UML Diagrams

## Use Case (Admin / Operator)
```mermaid
flowchart LR
  admin([Admin])
  operator([Operator])

  uc1([Manage Users])
  uc2([Monitor Traffic])
  uc3([Manage Vehicles])
  uc4([Create Incident])
  uc5([View Notifications])

  admin --> uc1
  admin --> uc2
  admin --> uc3
  admin --> uc4
  admin --> uc5

  operator --> uc2
  operator --> uc3
  operator --> uc4
  operator --> uc5
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
    +String plate
    +String status
    +Float lat
    +Float lng
  }

  class Incident {
    +String id
    +String type
    +String severity
    +String status
    +DateTime createdAt
  }

  class Notification {
    +String id
    +String message
    +String channel
    +DateTime createdAt
  }

  class TrafficZone {
    +String id
    +String name
    +Int congestionLevel
    +String status
  }

  User "1" --> "many" Incident : reports
  Incident --> Notification : triggers
  Vehicle --> TrafficZone : located_in
```

## Sequence Diagram - Login JWT
```mermaid
sequenceDiagram
  participant User
  participant AuthService
  participant Database

  User->>AuthService: POST /login
  AuthService->>Database: findUserByEmail
  Database-->>AuthService: user + hashed password
  AuthService->>AuthService: verify password
  AuthService-->>User: JWT + profile
```

## Sequence Diagram - Detection Incident
```mermaid
sequenceDiagram
  participant Sensor
  participant TrafficService
  participant IncidentService

  Sensor->>TrafficService: send traffic data
  TrafficService->>TrafficService: detect anomaly
  TrafficService->>IncidentService: createIncident
  IncidentService-->>TrafficService: incident
```

## Sequence Diagram - Notification Automatique
```mermaid
sequenceDiagram
  participant IncidentService
  participant NotificationService
  participant Operator

  IncidentService->>NotificationService: notify(incident)
  NotificationService->>NotificationService: create notification
  NotificationService-->>Operator: real-time alert
```

## Architecture Diagram
```mermaid
architecture-beta
  group core(cloud)[Core Platform]
  group data(database)[Databases]

  service gateway(server)[GraphQL Gateway] in core
  service auth(server)[Auth Service] in core
  service vehicle(server)[Vehicle Service] in core
  service traffic(server)[Traffic Service] in core
  service incident(server)[Incident Service] in core
  service notification(server)[Notification Service] in core

  service authdb(database)[Auth DB] in data

  gateway:R --> L:auth
  gateway:R --> L:vehicle
  gateway:R --> L:traffic
  gateway:R --> L:incident
  gateway:R --> L:notification

  auth:B --> T:authdb
```
