import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from 'react'
import { API_ENDPOINTS } from './config'
import './App.css'

type View = 'home' | 'login' | 'register' | 'dashboard'
type Section =
  | 'overview'
  | 'incidents'
  | 'vehicles'
  | 'traffic'
  | 'notifications'
  | 'gateway'

type Incident = {
  id: string
  title: string
  description: string
  type: string
  status: string
  latitude: number
  longitude: number
  created_at?: string
  createdAt?: string
}

type Notification = {
  id: string
  message: string
  channel: string
  source: string
  incident_id?: string | null
  incidentId?: string | null
  read: boolean
  created_at?: string
  createdAt?: string
}

type Vehicle = {
  id: string
  matricule: string
  type: string
  marque: string
  status: string
  lat: number
  lng: number
}

type VehiclePosition = {
  id: string
  vehicle_id: string
  latitude: number
  longitude: number
  speed: number
  created_at: string
}

type TrafficZone = {
  id: string
  zone_name: string
  latitude: number
  longitude: number
  density: number
  level: string
}

type TrafficAnalysis = {
  zone: TrafficZone
  density: number
  avgSpeed: number
  level: string
  nearbyCount: number
}

type AuthUser = {
  id: string
  username: string
  email: string
  role: string
}

const INCIDENT_TYPES = ['ACCIDENT', 'TRAVAUX', 'ROUTE_FERMEE', 'EMBOUTEILLAGE']
const INCIDENT_STATUSES = ['SIGNALE', 'EN_COURS', 'RESOLU']
const VEHICLE_STATUSES = ['ACTIVE', 'IDLE', 'MAINTENANCE']
const CHANNELS = ['DASHBOARD', 'SMS', 'EMAIL', 'SYSTEM']
const ROLES = ['OPERATOR', 'ADMIN']

const initialIncidentForm = {
  title: '',
  description: '',
  type: 'ACCIDENT',
  latitude: '',
  longitude: '',
}

const initialNotificationForm = {
  message: '',
  channel: 'DASHBOARD',
  incident_id: '',
}

const initialVehicleForm = {
  matricule: '',
  type: '',
  marque: '',
  status: 'IDLE',
}

const initialPositionForm = {
  vehicleId: '',
  latitude: '',
  longitude: '',
  speed: '',
}

const initialSimulationForm = {
  vehicleId: '',
  steps: '5',
  deltaLat: '0.0001',
  deltaLng: '0.0001',
  baseSpeed: '30',
}

const initialZoneForm = {
  zone_name: '',
  latitude: '',
  longitude: '',
}

const initialAnalyzeForm = {
  zoneId: '',
  radiusKm: '1',
  positionsJson: '[{"latitude":36.8065,"longitude":10.1815,"speed":25}]',
}

const initialLoginForm = {
  email: '',
  password: '',
}

const initialRegisterForm = {
  username: '',
  email: '',
  password: '',
  role: 'OPERATOR',
}

const navigation: { id: Section; label: string }[] = [
  { id: 'overview', label: 'Accueil' },
  { id: 'incidents', label: 'Incidents' },
  { id: 'vehicles', label: 'Vehicules' },
  { id: 'traffic', label: 'Trafic' },
  { id: 'notifications', label: 'Alertes' },
  { id: 'gateway', label: 'GraphQL' },
]

const serviceEndpoints = [
  { label: 'Auth', value: API_ENDPOINTS.auth },
  { label: 'Gateway', value: API_ENDPOINTS.gateway },
  { label: 'Vehicules', value: API_ENDPOINTS.vehicle },
  { label: 'Trafic', value: API_ENDPOINTS.traffic },
  { label: 'Incidents', value: API_ENDPOINTS.incident },
  { label: 'Notifications', value: API_ENDPOINTS.notification },
]

function formatEnum(value: string) {
  return value
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

function formatDate(value?: string) {
  if (!value) return '--'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '--'
  return date.toLocaleString()
}

function coerceMessage(payload: unknown, fallback: string) {
  if (typeof payload === 'string' && payload.trim()) return payload
  if (payload && typeof payload === 'object') {
    const candidate = payload as { message?: unknown; error?: unknown }
    if (typeof candidate.message === 'string') return candidate.message
    if (typeof candidate.error === 'string') return candidate.error
  }
  return fallback
}

function safeNumber(value: number | undefined): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

function App() {
  const [view, setView] = useState<View>(() =>
    localStorage.getItem('auth_token') ? 'dashboard' : 'home',
  )
  const [activeSection, setActiveSection] = useState<Section>('overview')
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [zones, setZones] = useState<TrafficZone[]>([])
  const [vehicleHistory, setVehicleHistory] = useState<VehiclePosition[]>([])
  const [analysisResult, setAnalysisResult] = useState<TrafficAnalysis | null>(
    null,
  )

  const [incidentForm, setIncidentForm] = useState(initialIncidentForm)
  const [incidentEditingId, setIncidentEditingId] = useState<string | null>(null)
  const [notificationForm, setNotificationForm] = useState(
    initialNotificationForm,
  )
  const [vehicleForm, setVehicleForm] = useState(initialVehicleForm)
  const [vehicleEditingId, setVehicleEditingId] = useState<string | null>(null)
  const [positionForm, setPositionForm] = useState(initialPositionForm)
  const [simulationForm, setSimulationForm] = useState(initialSimulationForm)
  const [vehicleHistoryId, setVehicleHistoryId] = useState('')
  const [zoneForm, setZoneForm] = useState(initialZoneForm)
  const [zoneEditingId, setZoneEditingId] = useState<string | null>(null)
  const [analyzeForm, setAnalyzeForm] = useState(initialAnalyzeForm)
  const [loginForm, setLoginForm] = useState(initialLoginForm)
  const [registerForm, setRegisterForm] = useState(initialRegisterForm)

  const [authToken, setAuthToken] = useState(
    () => localStorage.getItem('auth_token') || '',
  )
  const [authUser, setAuthUser] = useState<AuthUser | null>(null)
  const [adminUsers, setAdminUsers] = useState<AuthUser[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [lastUpdated, setLastUpdated] = useState('')

  const stats = useMemo(() => {
    const openIncidents = incidents.filter(
      (incident) => incident.status !== 'RESOLU',
    ).length
    const unreadAlerts = notifications.filter((note) => !note.read).length
    const activeVehicles = vehicles.filter(
      (vehicle) => vehicle.status === 'ACTIVE',
    ).length
    const highTraffic = zones.filter((zone) =>
      ['ELEVE', 'ELEVEE', 'ÉLEVÉ', 'ÉLEVÉE'].includes(zone.level.toUpperCase()),
    ).length

    return {
      openIncidents,
      unreadAlerts,
      activeVehicles,
      highTraffic,
      totalIncidents: incidents.length,
      totalVehicles: vehicles.length,
      totalZones: zones.length,
    }
  }, [incidents, notifications, vehicles, zones])

  const currentPositions = useMemo(
    () =>
      vehicles.map((vehicle) => ({
        latitude: safeNumber(vehicle.lat),
        longitude: safeNumber(vehicle.lng),
        speed: vehicle.status === 'ACTIVE' ? 32 : 0,
      })),
    [vehicles],
  )

  const latestIncidents = incidents.slice(0, 4)
  const latestNotifications = notifications.slice(0, 5)

  useEffect(() => {
    void refreshAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (authToken) {
      void loadProfile(authToken, true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authToken])

  function setSession(token: string, user: AuthUser) {
    localStorage.setItem('auth_token', token)
    setAuthToken(token)
    setAuthUser(user)
    setView('dashboard')
    setActiveSection('overview')
    setNotice(`Connecte: ${user.username}`)
  }

  function logout() {
    localStorage.removeItem('auth_token')
    setAuthToken('')
    setAuthUser(null)
    setAdminUsers([])
    setView('home')
    setNotice('Session fermee')
  }

  async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
    const response = await fetch(url, options)
    const text = await response.text()
    const payload = text ? JSON.parse(text) : null

    if (!response.ok) {
      throw new Error(coerceMessage(payload, `HTTP ${response.status}`))
    }

    return payload as T
  }

  async function runAction(action: () => Promise<void>) {
    setBusy(true)
    setError('')
    setNotice('')
    try {
      await action()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setBusy(false)
    }
  }

  async function loadIncidents() {
    const data = await fetchJson<Incident[]>(`${API_ENDPOINTS.incident}/incidents`)
    setIncidents(data)
  }

  async function loadNotifications() {
    const data = await fetchJson<Notification[]>(
      `${API_ENDPOINTS.notification}/notifications`,
    )
    setNotifications(data)
  }

  async function loadVehicles() {
    const data = await fetchJson<Vehicle[]>(`${API_ENDPOINTS.vehicle}/vehicles`)
    setVehicles(data)
  }

  async function loadZones() {
    const data = await fetchJson<TrafficZone[]>(`${API_ENDPOINTS.traffic}/zones`)
    setZones(data)
  }

  async function refreshAll() {
    setBusy(true)
    setError('')

    const tasks = [
      { name: 'incidents', run: loadIncidents },
      { name: 'notifications', run: loadNotifications },
      { name: 'vehicules', run: loadVehicles },
      { name: 'trafic', run: loadZones },
    ]

    const results = await Promise.allSettled(tasks.map((task) => task.run()))
    const failed = tasks
      .map((task, index) =>
        results[index].status === 'rejected' ? task.name : null,
      )
      .filter((name): name is string => Boolean(name))

    if (failed.length > 0) {
      setError(`Services indisponibles: ${failed.join(', ')}`)
    }

    setLastUpdated(new Date().toLocaleTimeString())
    setBusy(false)
  }

  async function submitLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    await runAction(async () => {
      const data = await fetchJson<{ token: string; user: AuthUser }>(
        `${API_ENDPOINTS.auth}/login`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(loginForm),
        },
      )
      setSession(data.token, data.user)
      setLoginForm(initialLoginForm)
    })
  }

  async function submitRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    await runAction(async () => {
      const data = await fetchJson<{ token: string; user: AuthUser }>(
        `${API_ENDPOINTS.auth}/register`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(registerForm),
        },
      )
      setSession(data.token, data.user)
      setRegisterForm(initialRegisterForm)
    })
  }

  async function loadProfile(token = authToken, quiet = false) {
    if (!token) {
      setError('Token manquant')
      return
    }

    if (!quiet) {
      setBusy(true)
      setError('')
    }

    try {
      const data = await fetchJson<AuthUser>(`${API_ENDPOINTS.auth}/profile`, {
        headers: { authorization: `Bearer ${token}` },
      })
      setAuthUser(data)
      if (!quiet) setNotice('Profil charge')
    } catch (err) {
      if (!quiet) {
        setError(err instanceof Error ? err.message : 'Erreur inconnue')
      }
      if (quiet) {
        localStorage.removeItem('auth_token')
        setAuthToken('')
        setView('home')
      }
    } finally {
      if (!quiet) setBusy(false)
    }
  }

  async function loadAdminUsers() {
    await runAction(async () => {
      const data = await fetchJson<{ users: AuthUser[] }>(
        `${API_ENDPOINTS.auth}/admin/users`,
        {
          headers: { authorization: `Bearer ${authToken}` },
        },
      )
      setAdminUsers(data.users || [])
      setNotice('Utilisateurs charges')
    })
  }

  async function submitIncident(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const latitude = Number(incidentForm.latitude)
    const longitude = Number(incidentForm.longitude)

    if (!incidentForm.title || Number.isNaN(latitude) || Number.isNaN(longitude)) {
      setError('Titre, latitude et longitude sont requis')
      return
    }

    await runAction(async () => {
      const endpoint = incidentEditingId
        ? `${API_ENDPOINTS.incident}/incidents/${incidentEditingId}`
        : `${API_ENDPOINTS.incident}/incidents`
      const method = incidentEditingId ? 'PUT' : 'POST'

      await fetchJson<Incident>(endpoint, {
        method,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          title: incidentForm.title,
          description: incidentForm.description,
          type: incidentForm.type,
          latitude,
          longitude,
        }),
      })

      setIncidentForm(initialIncidentForm)
      setIncidentEditingId(null)
      setNotice(incidentEditingId ? 'Incident modifie' : 'Incident cree')
      await Promise.all([loadIncidents(), loadNotifications()])
    })
  }

  async function updateIncidentStatus(id: string, status: string) {
    await runAction(async () => {
      await fetchJson<Incident>(`${API_ENDPOINTS.incident}/incidents/${id}/status`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      setNotice('Statut mis a jour')
      await Promise.all([loadIncidents(), loadNotifications()])
    })
  }

  async function deleteIncident(id: string) {
    await runAction(async () => {
      await fetchJson<Incident>(`${API_ENDPOINTS.incident}/incidents/${id}`, {
        method: 'DELETE',
      })
      setNotice('Incident supprime')
      await loadIncidents()
    })
  }

  function startIncidentEdit(incident: Incident) {
    setIncidentEditingId(incident.id)
    setIncidentForm({
      title: incident.title,
      description: incident.description || '',
      type: incident.type,
      latitude: String(incident.latitude),
      longitude: String(incident.longitude),
    })
  }

  function cancelIncidentEdit() {
    setIncidentEditingId(null)
    setIncidentForm(initialIncidentForm)
  }

  async function submitNotification(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!notificationForm.message) {
      setError('Message requis')
      return
    }

    await runAction(async () => {
      await fetchJson<Notification>(`${API_ENDPOINTS.notification}/notifications`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          message: notificationForm.message,
          channel: notificationForm.channel,
          incident_id: notificationForm.incident_id || undefined,
        }),
      })
      setNotificationForm(initialNotificationForm)
      setNotice('Notification envoyee')
      await loadNotifications()
    })
  }

  async function markNotificationRead(id: string) {
    await runAction(async () => {
      await fetchJson<Notification>(
        `${API_ENDPOINTS.notification}/notifications/${id}/read`,
        { method: 'PATCH' },
      )
      setNotifications((previous) =>
        previous.map((note) => (note.id === id ? { ...note, read: true } : note)),
      )
      setNotice('Notification marquee comme lue')
    })
  }

  async function submitVehicle(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!vehicleForm.matricule) {
      setError('Matricule requis')
      return
    }

    await runAction(async () => {
      const endpoint = vehicleEditingId
        ? `${API_ENDPOINTS.vehicle}/vehicles/${vehicleEditingId}`
        : `${API_ENDPOINTS.vehicle}/vehicles`
      const method = vehicleEditingId ? 'PUT' : 'POST'

      await fetchJson<Vehicle>(endpoint, {
        method,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(vehicleForm),
      })

      setVehicleForm(initialVehicleForm)
      setVehicleEditingId(null)
      setNotice(vehicleEditingId ? 'Vehicule modifie' : 'Vehicule cree')
      await loadVehicles()
    })
  }

  async function deleteVehicle(id: string) {
    await runAction(async () => {
      await fetchJson<Vehicle>(`${API_ENDPOINTS.vehicle}/vehicles/${id}`, {
        method: 'DELETE',
      })
      setNotice('Vehicule supprime')
      await loadVehicles()
    })
  }

  function startVehicleEdit(vehicle: Vehicle) {
    setVehicleEditingId(vehicle.id)
    setVehicleForm({
      matricule: vehicle.matricule,
      type: vehicle.type,
      marque: vehicle.marque,
      status: vehicle.status,
    })
  }

  function cancelVehicleEdit() {
    setVehicleEditingId(null)
    setVehicleForm(initialVehicleForm)
  }

  async function submitPosition(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const latitude = Number(positionForm.latitude)
    const longitude = Number(positionForm.longitude)
    const speed = Number(positionForm.speed || 0)

    if (!positionForm.vehicleId) {
      setError('Selectionner un vehicule')
      return
    }

    if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
      setError('Latitude et longitude requises')
      return
    }

    await runAction(async () => {
      await fetchJson<VehiclePosition>(
        `${API_ENDPOINTS.vehicle}/vehicles/${positionForm.vehicleId}/position`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ latitude, longitude, speed }),
        },
      )
      setPositionForm({ ...positionForm, latitude: '', longitude: '', speed: '' })
      setNotice('Position mise a jour')
      await loadVehicles()
    })
  }

  async function simulateVehicle(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!simulationForm.vehicleId) {
      setError('Selectionner un vehicule')
      return
    }

    await runAction(async () => {
      await fetchJson<{ created: VehiclePosition[] }>(
        `${API_ENDPOINTS.vehicle}/vehicles/${simulationForm.vehicleId}/simulate`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            steps: Number(simulationForm.steps),
            deltaLat: Number(simulationForm.deltaLat),
            deltaLng: Number(simulationForm.deltaLng),
            baseSpeed: Number(simulationForm.baseSpeed),
          }),
        },
      )
      setNotice('Simulation GPS lancee')
      await loadVehicles()
    })
  }

  async function loadVehicleHistory() {
    if (!vehicleHistoryId) {
      setError('Selectionner un vehicule')
      return
    }

    await runAction(async () => {
      const data = await fetchJson<VehiclePosition[]>(
        `${API_ENDPOINTS.vehicle}/vehicles/${vehicleHistoryId}/history`,
      )
      setVehicleHistory(data)
      setNotice('Historique charge')
    })
  }

  async function submitZone(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const latitude = Number(zoneForm.latitude)
    const longitude = Number(zoneForm.longitude)

    if (!zoneForm.zone_name || Number.isNaN(latitude) || Number.isNaN(longitude)) {
      setError('Nom, latitude et longitude requis')
      return
    }

    await runAction(async () => {
      const endpoint = zoneEditingId
        ? `${API_ENDPOINTS.traffic}/zones/${zoneEditingId}`
        : `${API_ENDPOINTS.traffic}/zones`
      const method = zoneEditingId ? 'PUT' : 'POST'

      await fetchJson<TrafficZone>(endpoint, {
        method,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          zone_name: zoneForm.zone_name,
          latitude,
          longitude,
        }),
      })

      setZoneForm(initialZoneForm)
      setZoneEditingId(null)
      setNotice(zoneEditingId ? 'Zone modifiee' : 'Zone creee')
      await loadZones()
    })
  }

  function startZoneEdit(zone: TrafficZone) {
    setZoneEditingId(zone.id)
    setZoneForm({
      zone_name: zone.zone_name,
      latitude: String(zone.latitude),
      longitude: String(zone.longitude),
    })
  }

  function cancelZoneEdit() {
    setZoneEditingId(null)
    setZoneForm(initialZoneForm)
  }

  async function deleteZone(id: string) {
    await runAction(async () => {
      await fetchJson<TrafficZone>(`${API_ENDPOINTS.traffic}/zones/${id}`, {
        method: 'DELETE',
      })
      setNotice('Zone supprimee')
      await loadZones()
    })
  }

  function useVehiclePositionsForAnalysis() {
    setAnalyzeForm((current) => ({
      ...current,
      positionsJson: JSON.stringify(currentPositions, null, 2),
    }))
  }

  async function analyzeZone(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!analyzeForm.zoneId) {
      setError('Selectionner une zone')
      return
    }

    let positions: { latitude: number; longitude: number; speed?: number }[]
    try {
      const parsed = JSON.parse(analyzeForm.positionsJson)
      if (!Array.isArray(parsed)) {
        throw new Error('invalid positions')
      }
      positions = parsed
    } catch {
      setError('Positions JSON invalides')
      return
    }

    await runAction(async () => {
      const data = await fetchJson<TrafficAnalysis>(
        `${API_ENDPOINTS.traffic}/zones/${analyzeForm.zoneId}/analyze`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            positions,
            radiusKm: Number(analyzeForm.radiusKm),
          }),
        },
      )
      setAnalysisResult(data)
      setNotice('Analyse terminee')
      await loadZones()
    })
  }

  if (view !== 'dashboard') {
    return (
      <div className="app public-shell">
        <header className="public-header">
          <button className="brand-button" type="button" onClick={() => setView('home')}>
            <span className="brand-mark">ST</span>
            <span>Smart Traffic</span>
          </button>
          <div className="header-actions">
            <button
              className={view === 'login' ? 'primary' : 'ghost'}
              type="button"
              onClick={() => setView('login')}
            >
              Connexion
            </button>
            <button
              className={view === 'register' ? 'primary' : 'ghost'}
              type="button"
              onClick={() => setView('register')}
            >
              Inscription
            </button>
          </div>
        </header>

        <main className="home-layout">
          <section className="home-copy">
            <p className="eyebrow">Microservices urbains</p>
            <h1>Centre de supervision du trafic intelligent</h1>
            <p className="subtitle">
              Authentification, flotte, zones de trafic, incidents et alertes
              reunis dans une interface claire pour les operateurs.
            </p>

            <div className="home-actions">
              <button className="primary" type="button" onClick={() => setView('login')}>
                Se connecter
              </button>
              <button className="ghost" type="button" onClick={() => setView('register')}>
                Creer un compte
              </button>
            </div>

            <div className="status-strip">
              <div>
                <span>Incidents ouverts</span>
                <strong>{stats.openIncidents}</strong>
              </div>
              <div>
                <span>Vehicules actifs</span>
                <strong>{stats.activeVehicles}</strong>
              </div>
              <div>
                <span>Alertes non lues</span>
                <strong>{stats.unreadAlerts}</strong>
              </div>
            </div>
          </section>

          <section className="auth-panel">
            {view === 'home' ? (
              <>
                <div className="panel-header">
                  <h2>Acces plateforme</h2>
                  <p>Session JWT, profil securise et tableau de bord.</p>
                </div>
                <div className="choice-list">
                  <button className="choice-row" type="button" onClick={() => setView('login')}>
                    <span>Connexion operateur</span>
                    <strong>Login</strong>
                  </button>
                  <button className="choice-row" type="button" onClick={() => setView('register')}>
                    <span>Nouveau compte</span>
                    <strong>Register</strong>
                  </button>
                  <button className="choice-row" type="button" onClick={() => window.open(API_ENDPOINTS.gateway, '_blank')}>
                    <span>Gateway GraphQL</span>
                    <strong>Open</strong>
                  </button>
                </div>
              </>
            ) : null}

            {view === 'login' ? (
              <>
                <div className="panel-header">
                  <h2>Connexion</h2>
                  <p>Le token JWT sera conserve pour la session.</p>
                </div>
                <form className="form-stack" onSubmit={submitLogin}>
                  <label>
                    Email
                    <input
                      autoComplete="email"
                      value={loginForm.email}
                      onChange={(event) =>
                        setLoginForm({ ...loginForm, email: event.target.value })
                      }
                      placeholder="operator@example.com"
                    />
                  </label>
                  <label>
                    Mot de passe
                    <input
                      autoComplete="current-password"
                      type="password"
                      value={loginForm.password}
                      onChange={(event) =>
                        setLoginForm({ ...loginForm, password: event.target.value })
                      }
                    />
                  </label>
                  <button className="primary" type="submit" disabled={busy}>
                    Entrer
                  </button>
                </form>
              </>
            ) : null}

            {view === 'register' ? (
              <>
                <div className="panel-header">
                  <h2>Inscription</h2>
                  <p>Un compte non-admin devient operateur par defaut.</p>
                </div>
                <form className="form-stack" onSubmit={submitRegister}>
                  <label>
                    Username
                    <input
                      autoComplete="username"
                      value={registerForm.username}
                      onChange={(event) =>
                        setRegisterForm({
                          ...registerForm,
                          username: event.target.value,
                        })
                      }
                    />
                  </label>
                  <label>
                    Email
                    <input
                      autoComplete="email"
                      value={registerForm.email}
                      onChange={(event) =>
                        setRegisterForm({
                          ...registerForm,
                          email: event.target.value,
                        })
                      }
                    />
                  </label>
                  <label>
                    Mot de passe
                    <input
                      autoComplete="new-password"
                      type="password"
                      value={registerForm.password}
                      onChange={(event) =>
                        setRegisterForm({
                          ...registerForm,
                          password: event.target.value,
                        })
                      }
                    />
                  </label>
                  <label>
                    Role demande
                    <select
                      value={registerForm.role}
                      onChange={(event) =>
                        setRegisterForm({
                          ...registerForm,
                          role: event.target.value,
                        })
                      }
                    >
                      {ROLES.map((role) => (
                        <option key={role} value={role}>
                          {role}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button className="primary" type="submit" disabled={busy}>
                    Creer la session
                  </button>
                </form>
              </>
            ) : null}

            {error ? <div className="banner danger">{error}</div> : null}
            {notice ? <div className="banner success">{notice}</div> : null}
          </section>
        </main>
      </div>
    )
  }

  return (
    <div className="app dashboard-shell">
      <header className="app-header">
        <button className="brand-button" type="button" onClick={() => setActiveSection('overview')}>
          <span className="brand-mark">ST</span>
          <span>Smart Traffic</span>
        </button>
        <div className="header-actions">
          <button className="ghost" type="button" onClick={refreshAll} disabled={busy}>
            Actualiser
          </button>
          <button className="ghost" type="button" onClick={() => void loadProfile()}>
            Profil
          </button>
          <button className="danger" type="button" onClick={logout}>
            Deconnexion
          </button>
        </div>
      </header>

      <section className="operator-bar">
        <div>
          <p className="eyebrow">Session active</p>
          <h1>{authUser ? authUser.username : 'Operateur'}</h1>
        </div>
        <div className="operator-meta">
          <span>{authUser?.role || 'JWT'}</span>
          <span>Maj {lastUpdated || '--:--'}</span>
        </div>
      </section>

      <section className="metrics">
        <article className="metric-card">
          <span>Incidents ouverts</span>
          <strong>{stats.openIncidents}</strong>
        </article>
        <article className="metric-card">
          <span>Alertes non lues</span>
          <strong>{stats.unreadAlerts}</strong>
        </article>
        <article className="metric-card">
          <span>Vehicules actifs</span>
          <strong>{stats.activeVehicles}</strong>
        </article>
        <article className="metric-card">
          <span>Zones elevees</span>
          <strong>{stats.highTraffic}</strong>
        </article>
      </section>

      <div className="workspace">
        <aside className="side-nav" aria-label="Navigation principale">
          {navigation.map((item) => (
            <button
              key={item.id}
              className={activeSection === item.id ? 'active' : ''}
              type="button"
              onClick={() => setActiveSection(item.id)}
            >
              {item.label}
            </button>
          ))}
        </aside>

        <main className="content-area">
          {error ? <div className="banner danger">{error}</div> : null}
          {notice ? <div className="banner success">{notice}</div> : null}

          {activeSection === 'overview' ? (
            <section className="content-grid overview-grid">
              <div className="panel span-2">
                <div className="panel-header split">
                  <div>
                    <p className="eyebrow">Vue operationnelle</p>
                    <h2>Priorites du reseau</h2>
                  </div>
                  <button
                    className="primary"
                    type="button"
                    onClick={() => setActiveSection('incidents')}
                  >
                    Declarer incident
                  </button>
                </div>
                <div className="map-surface">
                  {vehicles.slice(0, 8).map((vehicle, index) => (
                    <span
                      key={vehicle.id}
                      className="map-point vehicle"
                      style={{
                        left: `${18 + (index * 17) % 68}%`,
                        top: `${22 + (index * 13) % 58}%`,
                      }}
                      title={vehicle.matricule}
                    />
                  ))}
                  {incidents.slice(0, 8).map((incident, index) => (
                    <span
                      key={incident.id}
                      className="map-point incident"
                      style={{
                        left: `${24 + (index * 19) % 62}%`,
                        top: `${18 + (index * 23) % 60}%`,
                      }}
                      title={incident.title}
                    />
                  ))}
                </div>
              </div>

              <div className="panel">
                <div className="panel-header">
                  <h2>Incidents recents</h2>
                </div>
                <div className="stack-list">
                  {latestIncidents.length === 0 ? (
                    <div className="empty">Aucun incident.</div>
                  ) : (
                    latestIncidents.map((incident) => (
                      <article className="row-item" key={incident.id}>
                        <div>
                          <h3>{incident.title}</h3>
                          <p>{formatEnum(incident.type)}</p>
                        </div>
                        <span className={`tag status-${incident.status.toLowerCase()}`}>
                          {formatEnum(incident.status)}
                        </span>
                      </article>
                    ))
                  )}
                </div>
              </div>

              <div className="panel">
                <div className="panel-header">
                  <h2>Alertes recentes</h2>
                </div>
                <div className="stack-list">
                  {latestNotifications.length === 0 ? (
                    <div className="empty">Aucune alerte.</div>
                  ) : (
                    latestNotifications.map((note) => (
                      <article className="row-item" key={note.id}>
                        <div>
                          <h3>{note.message}</h3>
                          <p>{note.channel} / {note.source}</p>
                        </div>
                        <span className={note.read ? 'mini-status' : 'mini-status hot'}>
                          {note.read ? 'Lu' : 'Nouveau'}
                        </span>
                      </article>
                    ))
                  )}
                </div>
              </div>
            </section>
          ) : null}

          {activeSection === 'incidents' ? (
            <section className="content-grid two-col">
              <div className="panel">
                <div className="panel-header">
                  <h2>{incidentEditingId ? 'Modifier incident' : 'Nouvel incident'}</h2>
                </div>
                <form onSubmit={submitIncident} className="form-grid">
                  <label>
                    Titre
                    <input
                      value={incidentForm.title}
                      onChange={(event) =>
                        setIncidentForm({
                          ...incidentForm,
                          title: event.target.value,
                        })
                      }
                      placeholder="Collision avenue centrale"
                    />
                  </label>
                  <label>
                    Type
                    <select
                      value={incidentForm.type}
                      onChange={(event) =>
                        setIncidentForm({
                          ...incidentForm,
                          type: event.target.value,
                        })
                      }
                    >
                      {INCIDENT_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {formatEnum(type)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="full">
                    Description
                    <textarea
                      rows={3}
                      value={incidentForm.description}
                      onChange={(event) =>
                        setIncidentForm({
                          ...incidentForm,
                          description: event.target.value,
                        })
                      }
                    />
                  </label>
                  <label>
                    Latitude
                    <input
                      value={incidentForm.latitude}
                      onChange={(event) =>
                        setIncidentForm({
                          ...incidentForm,
                          latitude: event.target.value,
                        })
                      }
                      placeholder="36.8065"
                    />
                  </label>
                  <label>
                    Longitude
                    <input
                      value={incidentForm.longitude}
                      onChange={(event) =>
                        setIncidentForm({
                          ...incidentForm,
                          longitude: event.target.value,
                        })
                      }
                      placeholder="10.1815"
                    />
                  </label>
                  <div className="form-actions full">
                    <button className="primary" type="submit" disabled={busy}>
                      {incidentEditingId ? 'Enregistrer' : 'Creer'}
                    </button>
                    {incidentEditingId ? (
                      <button className="ghost" type="button" onClick={cancelIncidentEdit}>
                        Annuler
                      </button>
                    ) : null}
                  </div>
                </form>
              </div>

              <div className="panel">
                <div className="panel-header">
                  <h2>Liste incidents</h2>
                </div>
                <div className="stack-list">
                  {incidents.length === 0 ? (
                    <div className="empty">Aucun incident.</div>
                  ) : (
                    incidents.map((incident) => (
                      <article className="row-item tall" key={incident.id}>
                        <div>
                          <h3>{incident.title}</h3>
                          <p>{incident.description || 'Aucune description'}</p>
                          <div className="meta-grid">
                            <span>{incident.latitude.toFixed(4)}</span>
                            <span>{incident.longitude.toFixed(4)}</span>
                            <span>{formatDate(incident.created_at || incident.createdAt)}</span>
                          </div>
                        </div>
                        <div className="item-actions">
                          <span className={`tag type-${incident.type.toLowerCase()}`}>
                            {formatEnum(incident.type)}
                          </span>
                          <select
                            value={incident.status}
                            onChange={(event) =>
                              void updateIncidentStatus(incident.id, event.target.value)
                            }
                          >
                            {INCIDENT_STATUSES.map((status) => (
                              <option key={status} value={status}>
                                {formatEnum(status)}
                              </option>
                            ))}
                          </select>
                          <button className="ghost" type="button" onClick={() => startIncidentEdit(incident)}>
                            Modifier
                          </button>
                          <button className="danger" type="button" onClick={() => void deleteIncident(incident.id)}>
                            Supprimer
                          </button>
                        </div>
                      </article>
                    ))
                  )}
                </div>
              </div>
            </section>
          ) : null}

          {activeSection === 'vehicles' ? (
            <section className="content-grid vehicle-grid">
              <div className="panel span-2">
                <div className="panel-header split">
                  <div>
                    <h2>Flotte vehicules</h2>
                    <p>{stats.totalVehicles} vehicules enregistres</p>
                  </div>
                  <button className="ghost" type="button" onClick={() => setVehicleHistory([])}>
                    Nettoyer historique
                  </button>
                </div>
                <div className="fleet-grid">
                  {vehicles.length === 0 ? (
                    <div className="empty">Aucun vehicule.</div>
                  ) : (
                    vehicles.map((vehicle) => (
                      <article className="vehicle-tile" key={vehicle.id}>
                        <div>
                          <h3>{vehicle.matricule}</h3>
                          <p>{vehicle.marque} / {vehicle.type}</p>
                        </div>
                        <span className={`tag status-${vehicle.status.toLowerCase()}`}>
                          {vehicle.status}
                        </span>
                        <div className="meta-grid">
                          <span>Lat {safeNumber(vehicle.lat).toFixed(4)}</span>
                          <span>Lng {safeNumber(vehicle.lng).toFixed(4)}</span>
                        </div>
                        <div className="tile-actions">
                          <button className="ghost" type="button" onClick={() => startVehicleEdit(vehicle)}>
                            Modifier
                          </button>
                          <button className="danger" type="button" onClick={() => void deleteVehicle(vehicle.id)}>
                            Supprimer
                          </button>
                        </div>
                      </article>
                    ))
                  )}
                </div>
              </div>

              <div className="panel">
                <div className="panel-header">
                  <h2>{vehicleEditingId ? 'Modifier vehicule' : 'Nouveau vehicule'}</h2>
                </div>
                <form onSubmit={submitVehicle} className="form-stack">
                  <label>
                    Matricule
                    <input
                      value={vehicleForm.matricule}
                      onChange={(event) =>
                        setVehicleForm({
                          ...vehicleForm,
                          matricule: event.target.value,
                        })
                      }
                      placeholder="TU-1234"
                    />
                  </label>
                  <label>
                    Type
                    <input
                      value={vehicleForm.type}
                      onChange={(event) =>
                        setVehicleForm({ ...vehicleForm, type: event.target.value })
                      }
                      placeholder="bus"
                    />
                  </label>
                  <label>
                    Marque
                    <input
                      value={vehicleForm.marque}
                      onChange={(event) =>
                        setVehicleForm({
                          ...vehicleForm,
                          marque: event.target.value,
                        })
                      }
                      placeholder="Mercedes"
                    />
                  </label>
                  <label>
                    Statut
                    <select
                      value={vehicleForm.status}
                      onChange={(event) =>
                        setVehicleForm({
                          ...vehicleForm,
                          status: event.target.value,
                        })
                      }
                    >
                      {VEHICLE_STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="form-actions">
                    <button className="primary" type="submit" disabled={busy}>
                      {vehicleEditingId ? 'Enregistrer' : 'Creer'}
                    </button>
                    {vehicleEditingId ? (
                      <button className="ghost" type="button" onClick={cancelVehicleEdit}>
                        Annuler
                      </button>
                    ) : null}
                  </div>
                </form>
              </div>

              <div className="panel">
                <div className="panel-header">
                  <h2>Positions GPS</h2>
                </div>
                <form onSubmit={submitPosition} className="form-stack">
                  <label>
                    Vehicule
                    <select
                      value={positionForm.vehicleId}
                      onChange={(event) =>
                        setPositionForm({
                          ...positionForm,
                          vehicleId: event.target.value,
                        })
                      }
                    >
                      <option value="">Selectionner</option>
                      {vehicles.map((vehicle) => (
                        <option key={vehicle.id} value={vehicle.id}>
                          {vehicle.matricule}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="field-row">
                    <label>
                      Latitude
                      <input
                        value={positionForm.latitude}
                        onChange={(event) =>
                          setPositionForm({
                            ...positionForm,
                            latitude: event.target.value,
                          })
                        }
                      />
                    </label>
                    <label>
                      Longitude
                      <input
                        value={positionForm.longitude}
                        onChange={(event) =>
                          setPositionForm({
                            ...positionForm,
                            longitude: event.target.value,
                          })
                        }
                      />
                    </label>
                  </div>
                  <label>
                    Vitesse
                    <input
                      value={positionForm.speed}
                      onChange={(event) =>
                        setPositionForm({
                          ...positionForm,
                          speed: event.target.value,
                        })
                      }
                    />
                  </label>
                  <button className="primary" type="submit" disabled={busy}>
                    Ajouter position
                  </button>
                </form>

                <div className="section-divider" />

                <form onSubmit={simulateVehicle} className="form-stack">
                  <label>
                    Simulation
                    <select
                      value={simulationForm.vehicleId}
                      onChange={(event) =>
                        setSimulationForm({
                          ...simulationForm,
                          vehicleId: event.target.value,
                        })
                      }
                    >
                      <option value="">Selectionner</option>
                      {vehicles.map((vehicle) => (
                        <option key={vehicle.id} value={vehicle.id}>
                          {vehicle.matricule}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="field-row">
                    <label>
                      Steps
                      <input
                        value={simulationForm.steps}
                        onChange={(event) =>
                          setSimulationForm({
                            ...simulationForm,
                            steps: event.target.value,
                          })
                        }
                      />
                    </label>
                    <label>
                      Vitesse
                      <input
                        value={simulationForm.baseSpeed}
                        onChange={(event) =>
                          setSimulationForm({
                            ...simulationForm,
                            baseSpeed: event.target.value,
                          })
                        }
                      />
                    </label>
                  </div>
                  <button className="ghost" type="submit" disabled={busy}>
                    Simuler
                  </button>
                </form>
              </div>

              <div className="panel span-2">
                <div className="panel-header split">
                  <h2>Historique positions</h2>
                  <div className="inline-controls">
                    <select
                      value={vehicleHistoryId}
                      onChange={(event) => setVehicleHistoryId(event.target.value)}
                    >
                      <option value="">Vehicule</option>
                      {vehicles.map((vehicle) => (
                        <option key={vehicle.id} value={vehicle.id}>
                          {vehicle.matricule}
                        </option>
                      ))}
                    </select>
                    <button className="ghost" type="button" onClick={() => void loadVehicleHistory()}>
                      Charger
                    </button>
                  </div>
                </div>
                <div className="history-grid">
                  {vehicleHistory.length === 0 ? (
                    <div className="empty">Aucun historique charge.</div>
                  ) : (
                    vehicleHistory.map((position) => (
                      <div className="history-row" key={position.id}>
                        <span>{position.latitude.toFixed(4)}</span>
                        <span>{position.longitude.toFixed(4)}</span>
                        <span>{position.speed} km/h</span>
                        <span>{formatDate(position.created_at)}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </section>
          ) : null}

          {activeSection === 'traffic' ? (
            <section className="content-grid two-col">
              <div className="panel">
                <div className="panel-header">
                  <h2>{zoneEditingId ? 'Modifier zone' : 'Nouvelle zone'}</h2>
                </div>
                <form onSubmit={submitZone} className="form-stack">
                  <label>
                    Nom zone
                    <input
                      value={zoneForm.zone_name}
                      onChange={(event) =>
                        setZoneForm({ ...zoneForm, zone_name: event.target.value })
                      }
                      placeholder="Downtown"
                    />
                  </label>
                  <div className="field-row">
                    <label>
                      Latitude
                      <input
                        value={zoneForm.latitude}
                        onChange={(event) =>
                          setZoneForm({
                            ...zoneForm,
                            latitude: event.target.value,
                          })
                        }
                      />
                    </label>
                    <label>
                      Longitude
                      <input
                        value={zoneForm.longitude}
                        onChange={(event) =>
                          setZoneForm({
                            ...zoneForm,
                            longitude: event.target.value,
                          })
                        }
                      />
                    </label>
                  </div>
                  <div className="form-actions">
                    <button className="primary" type="submit" disabled={busy}>
                      {zoneEditingId ? 'Enregistrer' : 'Creer'}
                    </button>
                    {zoneEditingId ? (
                      <button className="ghost" type="button" onClick={cancelZoneEdit}>
                        Annuler
                      </button>
                    ) : null}
                  </div>
                </form>
              </div>

              <div className="panel">
                <div className="panel-header">
                  <h2>Analyse trafic</h2>
                </div>
                <form onSubmit={analyzeZone} className="form-stack">
                  <label>
                    Zone
                    <select
                      value={analyzeForm.zoneId}
                      onChange={(event) =>
                        setAnalyzeForm({
                          ...analyzeForm,
                          zoneId: event.target.value,
                        })
                      }
                    >
                      <option value="">Selectionner</option>
                      {zones.map((zone) => (
                        <option key={zone.id} value={zone.id}>
                          {zone.zone_name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Rayon km
                    <input
                      value={analyzeForm.radiusKm}
                      onChange={(event) =>
                        setAnalyzeForm({
                          ...analyzeForm,
                          radiusKm: event.target.value,
                        })
                      }
                    />
                  </label>
                  <label>
                    Positions JSON
                    <textarea
                      rows={5}
                      value={analyzeForm.positionsJson}
                      onChange={(event) =>
                        setAnalyzeForm({
                          ...analyzeForm,
                          positionsJson: event.target.value,
                        })
                      }
                    />
                  </label>
                  <div className="form-actions">
                    <button className="primary" type="submit" disabled={busy}>
                      Analyser
                    </button>
                    <button className="ghost" type="button" onClick={useVehiclePositionsForAnalysis}>
                      Positions actuelles
                    </button>
                  </div>
                </form>
                {analysisResult ? (
                  <div className="analysis-summary">
                    <div>
                      <span>Densite</span>
                      <strong>{analysisResult.density}</strong>
                    </div>
                    <div>
                      <span>Vitesse moyenne</span>
                      <strong>{analysisResult.avgSpeed} km/h</strong>
                    </div>
                    <div>
                      <span>Niveau</span>
                      <strong>{analysisResult.level}</strong>
                    </div>
                    <div>
                      <span>Vehicules</span>
                      <strong>{analysisResult.nearbyCount}</strong>
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="panel span-2">
                <div className="panel-header">
                  <h2>Zones trafic</h2>
                </div>
                <div className="fleet-grid">
                  {zones.length === 0 ? (
                    <div className="empty">Aucune zone.</div>
                  ) : (
                    zones.map((zone) => (
                      <article className="vehicle-tile" key={zone.id}>
                        <div>
                          <h3>{zone.zone_name}</h3>
                          <p>{zone.latitude.toFixed(4)} / {zone.longitude.toFixed(4)}</p>
                        </div>
                        <span className={`tag status-${zone.level.toLowerCase()}`}>
                          {zone.level}
                        </span>
                        <div className="meta-grid">
                          <span>Densite {zone.density}</span>
                          <span>Niveau {zone.level}</span>
                        </div>
                        <div className="tile-actions">
                          <button className="ghost" type="button" onClick={() => startZoneEdit(zone)}>
                            Modifier
                          </button>
                          <button className="danger" type="button" onClick={() => void deleteZone(zone.id)}>
                            Supprimer
                          </button>
                        </div>
                      </article>
                    ))
                  )}
                </div>
              </div>
            </section>
          ) : null}

          {activeSection === 'notifications' ? (
            <section className="content-grid two-col">
              <div className="panel">
                <div className="panel-header">
                  <h2>Nouvelle notification</h2>
                </div>
                <form onSubmit={submitNotification} className="form-stack">
                  <label>
                    Message
                    <textarea
                      rows={4}
                      value={notificationForm.message}
                      onChange={(event) =>
                        setNotificationForm({
                          ...notificationForm,
                          message: event.target.value,
                        })
                      }
                    />
                  </label>
                  <label>
                    Canal
                    <select
                      value={notificationForm.channel}
                      onChange={(event) =>
                        setNotificationForm({
                          ...notificationForm,
                          channel: event.target.value,
                        })
                      }
                    >
                      {CHANNELS.map((channel) => (
                        <option key={channel} value={channel}>
                          {channel}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Incident ID
                    <input
                      value={notificationForm.incident_id}
                      onChange={(event) =>
                        setNotificationForm({
                          ...notificationForm,
                          incident_id: event.target.value,
                        })
                      }
                    />
                  </label>
                  <button className="primary" type="submit" disabled={busy}>
                    Envoyer
                  </button>
                </form>
              </div>

              <div className="panel">
                <div className="panel-header">
                  <h2>Historique alertes</h2>
                </div>
                <div className="stack-list">
                  {notifications.length === 0 ? (
                    <div className="empty">Aucune notification.</div>
                  ) : (
                    notifications.map((note) => (
                      <article className={`row-item tall ${note.read ? '' : 'unread'}`} key={note.id}>
                        <div>
                          <h3>{note.message}</h3>
                          <p>{note.channel} / {note.source}</p>
                          <div className="meta-grid">
                            <span>{formatDate(note.created_at || note.createdAt)}</span>
                            <span>{note.incident_id || note.incidentId || 'Sans incident'}</span>
                          </div>
                        </div>
                        <button
                          className="ghost"
                          type="button"
                          disabled={note.read}
                          onClick={() => void markNotificationRead(note.id)}
                        >
                          {note.read ? 'Lu' : 'Marquer lu'}
                        </button>
                      </article>
                    ))
                  )}
                </div>
              </div>
            </section>
          ) : null}

          {activeSection === 'gateway' ? (
            <section className="content-grid gateway-grid">
              <div className="panel">
                <div className="panel-header split">
                  <div>
                    <h2>Gateway GraphQL</h2>
                    <p>{API_ENDPOINTS.gateway}</p>
                  </div>
                  <button className="primary" type="button" onClick={() => window.open(API_ENDPOINTS.gateway, '_blank')}>
                    Ouvrir
                  </button>
                </div>
              </div>

              <div className="panel">
                <div className="panel-header split">
                  <h2>Profil securise</h2>
                  <div className="inline-controls">
                    <button className="ghost" type="button" onClick={() => void loadProfile()}>
                      Charger profil
                    </button>
                    <button className="ghost" type="button" onClick={() => void loadAdminUsers()}>
                      Users admin
                    </button>
                  </div>
                </div>
                {authUser ? (
                  <article className="profile-row">
                    <div>
                      <h3>{authUser.username}</h3>
                      <p>{authUser.email}</p>
                    </div>
                    <span className="tag">{authUser.role}</span>
                  </article>
                ) : (
                  <div className="empty">Aucun profil charge.</div>
                )}
                {adminUsers.length > 0 ? (
                  <div className="history-grid">
                    {adminUsers.map((user) => (
                      <div className="history-row" key={user.id}>
                        <span>{user.username}</span>
                        <span>{user.role}</span>
                        <span>{user.email}</span>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="panel">
                <div className="panel-header">
                  <h2>Endpoints services</h2>
                </div>
                <div className="endpoint-grid">
                  {serviceEndpoints.map((endpoint) => (
                    <div className="endpoint-row" key={endpoint.label}>
                      <span>{endpoint.label}</span>
                      <strong>{endpoint.value}</strong>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          ) : null}
        </main>
      </div>
    </div>
  )
}

export default App
