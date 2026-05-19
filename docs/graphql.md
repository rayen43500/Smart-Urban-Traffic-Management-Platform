# GraphQL Gateway Documentation

Gateway endpoint:
- http://localhost:4000/graphql

Auth header:
- Authorization: Bearer <JWT>

## Queries

### getVehicles
```graphql
query {
  getVehicles {
    id
    plate
    status
    lat
    lng
  }
}
```

### getIncidents
```graphql
query {
  getIncidents {
    id
    type
    severity
    status
    createdAt
  }
}
```

### getTrafficZones
```graphql
query {
  getTrafficZones {
    id
    name
    congestionLevel
    status
  }
}
```

### getNotifications
```graphql
query {
  getNotifications {
    id
    message
    channel
    createdAt
  }
}
```

### me
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

## Mutations

### login
```graphql
mutation {
  login(email: "admin@demo.com", password: "secret123") {
    token
    user {
      id
      username
      role
    }
  }
}
```

### register
```graphql
mutation {
  register(username: "admin", email: "admin@demo.com", password: "secret123", role: ADMIN) {
    token
    user {
      id
      username
      role
    }
  }
}
```

### createIncident
```graphql
mutation {
  createIncident(type: "ACCIDENT", severity: "HIGH") {
    id
    status
    createdAt
  }
}
```

### updateVehiclePosition
```graphql
mutation {
  updateVehiclePosition(id: "v1", lat: 36.8, lng: 10.17) {
    id
    status
    lat
    lng
  }
}
```
