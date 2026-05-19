# GraphQL Gateway

Endpoint principal: `http://localhost:4000/graphql`

Le gateway Apollo compose les sous-graphes:

- `auth-service`
- `vehicle-service`
- `traffic-service`
- `incident-service`
- `notification-service`

Pour les requetes protegees, envoyer:

```http
Authorization: Bearer <token>
```

## Auth

```graphql
mutation Login {
  login(email: "operator1@example.com", password: "secret123") {
    token
    user {
      id
      username
      email
      role
    }
  }
}
```

```graphql
query Me {
  me {
    id
    username
    email
    role
    createdAt
  }
}
```

## Vehicules

```graphql
query GetVehicles {
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
mutation CreateVehicle {
  createVehicle(
    matricule: "TU-1234"
    type: "bus"
    marque: "Mercedes"
    status: "ACTIVE"
  ) {
    id
    matricule
    status
  }
}
```

```graphql
mutation UpdateVehiclePosition {
  updateVehiclePosition(id: "v1", lat: 36.8065, lng: 10.1815, speed: 30) {
    id
    lat
    lng
  }
}
```

## Trafic

```graphql
query GetTrafficZones {
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

## Incidents

```graphql
query GetIncidents {
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
mutation CreateIncident {
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

```graphql
mutation UpdateIncidentStatus {
  updateIncidentStatus(id: "incident-id", status: "RESOLU") {
    id
    status
  }
}
```

## Notifications

```graphql
query GetNotifications {
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
mutation MarkNotificationRead {
  markNotificationRead(id: "notification-id") {
    id
    read
  }
}
```
