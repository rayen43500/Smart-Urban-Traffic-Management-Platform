# Auth REST API

Base URL locale: `http://localhost:4001`

## Seed Data Connexion

Pour creer les comptes de test:

```bash
cd backend/auth-service
npm run prisma:seed
```

Comptes disponibles:

| Role | Email | Mot de passe |
| --- | --- | --- |
| ADMIN | `admin@smarttraffic.local` | `admin123` |
| OPERATOR | `operator@smarttraffic.local` | `operator123` |

## Endpoints

### POST /register

```json
{
  "username": "operator",
  "email": "operator@smarttraffic.local",
  "password": "operator123",
  "role": "OPERATOR"
}
```

### POST /login

```json
{
  "email": "admin@smarttraffic.local",
  "password": "admin123"
}
```

Reponse:

```json
{
  "token": "jwt-token",
  "user": {
    "id": "uuid",
    "username": "admin",
    "email": "admin@smarttraffic.local",
    "role": "ADMIN"
  }
}
```

### GET /profile

Header requis:

```http
Authorization: Bearer <token>
```

### GET /admin/users

Header admin requis:

```http
Authorization: Bearer <admin-token>
```

## Notes

- Les mots de passe seed sont hashes avec `bcrypt`.
- Le seed utilise `upsert`, donc il peut etre relance sans creer de doublons.
- Si le mot de passe seed change, relancer `npm run prisma:seed` met a jour le hash.
