# Smart Traffic Frontend

Interface React/Vite pour la plateforme Smart Urban Traffic Management.

## Fonctionnalites

- Home operationnel avec acces connexion/inscription.
- Login/Register connectes au `auth-service`.
- Session JWT persistee dans `localStorage`.
- Chargement du profil securise.
- Dashboard avec vue globale, incidents, vehicules, trafic, alertes et gateway.
- CRUD incidents avec notifications automatiques.
- CRUD vehicules, ajout position GPS, simulation et historique.
- CRUD zones trafic et analyse densite/vitesse.
- Notifications manuelles et marquage comme lu.
- Vue endpoints pour tester les services et ouvrir Apollo Gateway.

## Variables

```bash
VITE_GATEWAY_API=http://localhost:4000/graphql
VITE_AUTH_API=http://localhost:4001
VITE_VEHICLE_API=http://localhost:4002
VITE_TRAFFIC_API=http://localhost:4003
VITE_INCIDENT_API=http://localhost:4004
VITE_NOTIFICATION_API=http://localhost:4005
```

## Lancement

```bash
npm install
npm run dev
```

URL locale: `http://localhost:5173`
