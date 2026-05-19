# Auth REST API

Base URL locale: `http://localhost:4001`

## Roles

- `ADMIN`: acces complet, gestion utilisateurs.
- `OPERATOR`: exploitation courante, monitoring, incidents et notifications.

## POST /register

Inscrit un utilisateur. Sans token admin, le role par defaut est `OPERATOR`.

```json
{
  "username": "operator1",
  "email": "operator1@example.com",
  "password": "secret123",
  "role": "OPERATOR"
}
```

Reponse:

```json
{
  "token": "jwt-token",
  "user": {
    "id": "uuid",
    "username": "operator1",
    "email": "operator1@example.com",
    "role": "OPERATOR"
  }
}
```

## POST /login

Connecte un utilisateur avec email et mot de passe.

```json
{
  "email": "operator1@example.com",
  "password": "secret123"
}
```

Reponse:

```json
{
  "token": "jwt-token",
  "user": {
    "id": "uuid",
    "username": "operator1",
    "email": "operator1@example.com",
    "role": "OPERATOR"
  }
}
```

## GET /profile

Necessite un header JWT:

```http
Authorization: Bearer <token>
```

Reponse:

```json
{
  "id": "uuid",
  "username": "operator1",
  "email": "operator1@example.com",
  "role": "OPERATOR"
}
```

## GET /admin/users

Reserve au role `ADMIN`.

## Securite

- Mots de passe hashes avec `bcrypt`.
- JWT signe avec `JWT_SECRET`.
- Validation des donnees avec `zod`.
- `authGuard` pour verifier le token.
- `requireRole("ADMIN")` pour proteger les routes sensibles.
