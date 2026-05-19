# Auth Service REST API

Base URL:
- http://localhost:4001

## Endpoints

### POST /register
Create a new user.

Request:
```json
{
  "username": "operator1",
  "email": "operator1@demo.com",
  "password": "secret123",
  "role": "OPERATOR"
}
```

Response:
```json
{
  "token": "<JWT>",
  "user": {
    "id": "...",
    "username": "operator1",
    "email": "operator1@demo.com",
    "role": "OPERATOR"
  }
}
```

Note:
- `role` is only accepted when the requester is `ADMIN`.

### POST /login
Authenticate a user.

Request:
```json
{
  "email": "operator1@demo.com",
  "password": "secret123"
}
```

Response:
```json
{
  "token": "<JWT>",
  "user": {
    "id": "...",
    "username": "operator1",
    "email": "operator1@demo.com",
    "role": "OPERATOR"
  }
}
```

### GET /profile
Get the current user profile.

Header:
- Authorization: Bearer <JWT>

Response:
```json
{
  "id": "...",
  "username": "operator1",
  "email": "operator1@demo.com",
  "role": "OPERATOR"
}
```

### GET /admin/users
List users (ADMIN only).

Header:
- Authorization: Bearer <JWT>

Response:
```json
{
  "users": [
    {
      "id": "...",
      "username": "admin",
      "email": "admin@demo.com",
      "role": "ADMIN",
      "createdAt": "2026-05-19T10:00:00.000Z"
    }
  ]
}
```
