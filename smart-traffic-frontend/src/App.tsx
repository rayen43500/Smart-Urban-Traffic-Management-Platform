import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { API_ENDPOINTS } from './config'
import './App.css'

type Incident = {
  id: string
  title: string
  description: string
  type: string
  status: string
  latitude: number
  longitude: number
  created_at: string
}

type Notification = {
  id: string
  message: string
  channel: string
  source: string
  incident_id: string | null
  read: boolean
  created_at: string
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

const INCIDENT_API = API_ENDPOINTS.incident
const NOTIFICATION_API = API_ENDPOINTS.notification
const VEHICLE_API = API_ENDPOINTS.vehicle
const TRAFFIC_API = API_ENDPOINTS.traffic
const AUTH_API = API_ENDPOINTS.auth
const GATEWAY_API = API_ENDPOINTS.gateway

const INCIDENT_TYPES = ['ACCIDENT', 'TRAVAUX', 'ROUTE_FERMEE', 'EMBOUTEILLAGE']
const STATUSES = ['SIGNALE', 'EN_COURS', 'RESOLU']
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

const sections = [
  { id: 'incidents', label: 'Incidents' },
  { id: 'notifications', label: 'Notifications' },
  { id: 'vehicles', label: 'Vehicles' },
  { id: 'traffic', label: 'Traffic' },
  { id: 'auth', label: 'Auth' },
  { id: 'gateway', label: 'Gateway' },
]

function formatEnum(value: string) {
  return value
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

function App() {
  const [activeSection, setActiveSection] = useState('incidents')
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [zones, setZones] = useState<TrafficZone[]>([])
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
  const [vehicleHistory, setVehicleHistory] = useState<VehiclePosition[]>([])
  const [zoneForm, setZoneForm] = useState(initialZoneForm)
  const [zoneEditingId, setZoneEditingId] = useState<string | null>(null)
  const [analyzeForm, setAnalyzeForm] = useState(initialAnalyzeForm)
  const [analysisResult, setAnalysisResult] = useState<TrafficAnalysis | null>(
    null,
  )
  const [loginForm, setLoginForm] = useState(initialLoginForm)
  const [registerForm, setRegisterForm] = useState(initialRegisterForm)
  const [authToken, setAuthToken] = useState(
    () => localStorage.getItem('auth_token') || '',
  )
  const [authUser, setAuthUser] = useState<AuthUser | null>(null)
  const [adminUsers, setAdminUsers] = useState<AuthUser[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState('')

  const stats = useMemo(() => {
    const totalIncidents = incidents.length
    const totalNotifications = notifications.length
    const totalVehicles = vehicles.length
    const totalZones = zones.length
    const signale = incidents.filter((item) => item.status === 'SIGNALE').length
    const enCours = incidents.filter((item) => item.status === 'EN_COURS').length
    return { totalIncidents, totalNotifications, totalVehicles, totalZones, signale, enCours }
  }, [incidents, notifications, vehicles, zones])

  useEffect(() => {
    void refreshAll()
  }, [])

  function storeToken(token: string) {
    setAuthToken(token)
    localStorage.setItem('auth_token', token)
  }

  function clearToken() {
    setAuthToken('')
    setAuthUser(null)
    setAdminUsers([])
    localStorage.removeItem('auth_token')
  }

  async function fetchJson(url: string, options?: RequestInit) {
    const response = await fetch(url, options)
    if (!response.ok) {
      const message = await response.text().catch(() => '')
      throw new Error(message || `HTTP ${response.status}`)
    }
    if (response.status === 204) return null
    return response.json()
  }

  async function loadIncidents() {
    const data = await fetchJson(`${INCIDENT_API}/incidents`)
    setIncidents(data)
  }

  async function loadNotifications() {
    const data = await fetchJson(`${NOTIFICATION_API}/notifications`)
    setNotifications(data)
  }

  async function loadVehicles() {
    const data = await fetchJson(`${VEHICLE_API}/vehicles`)
    setVehicles(data)
  }

  async function loadZones() {
    const data = await fetchJson(`${TRAFFIC_API}/zones`)
    setZones(data)
  }

  async function refreshAll() {
    setBusy(true)
    setError(null)
    const tasks = [
      { name: 'incidents', run: loadIncidents },
      { name: 'notifications', run: loadNotifications },
      { name: 'vehicles', run: loadVehicles },
      { name: 'zones', run: loadZones },
    ]

    const results = await Promise.allSettled(tasks.map((task) => task.run()))
    const failed = tasks
      .map((task, index) => (results[index].status === 'rejected' ? task.name : null))
      .filter((name): name is string => Boolean(name))
    if (failed.length) {
      setError(`Services indisponibles: ${failed.join(', ')}`)
    }
    setLastUpdated(new Date().toLocaleTimeString())
    setBusy(false)
  }

  async function submitIncident(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError(null)

    const latitude = Number(incidentForm.latitude)
    const longitude = Number(incidentForm.longitude)
    if (!incidentForm.title || Number.isNaN(latitude) || Number.isNaN(longitude)) {
      setError('Titre, latitude et longitude sont requis')
      setBusy(false)
      return
    }

    const payload = {
      title: incidentForm.title,
      description: incidentForm.description,
      type: incidentForm.type,
      latitude,
      longitude,
    }

    try {
      const endpoint = incidentEditingId
        ? `${INCIDENT_API}/incidents/${incidentEditingId}`
        : `${INCIDENT_API}/incidents`
      const method = incidentEditingId ? 'PUT' : 'POST'

      await fetchJson(endpoint, {
        method,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      })

      setIncidentForm(initialIncidentForm)
      setIncidentEditingId(null)
      await loadIncidents()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setBusy(false)
    }
  }

  async function updateIncidentStatus(id: string, status: string) {
    setBusy(true)
    setError(null)
    try {
      await fetchJson(`${INCIDENT_API}/incidents/${id}/status`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      await loadIncidents()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
      setBusy(false)
    }
  }

  async function deleteIncident(id: string) {
    setBusy(true)
    setError(null)
    try {
      await fetchJson(`${INCIDENT_API}/incidents/${id}`, {
        method: 'DELETE',
      })
      await loadIncidents()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
      setBusy(false)
    }
  }

  function startIncidentEdit(incident: Incident) {
    setIncidentEditingId(incident.id)
    setIncidentForm({
      title: incident.title,
      description: incident.description,
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
    setBusy(true)
    setError(null)
    if (!notificationForm.message) {
      setError('Message requis')
      setBusy(false)
      return
    }

    try {
      await fetchJson(`${NOTIFICATION_API}/notifications`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          message: notificationForm.message,
          channel: notificationForm.channel,
          incident_id: notificationForm.incident_id || undefined,
        }),
      })
      setNotificationForm(initialNotificationForm)
      await loadNotifications()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setBusy(false)
    }
  }

  async function markNotificationRead(id: string) {
    try {
      await fetchJson(`${NOTIFICATION_API}/notifications/${id}/read`, {
        method: 'PATCH',
      })
      setNotifications((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, read: true } : item,
        ),
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    }
  }

  async function submitVehicle(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    if (!vehicleForm.matricule) {
      setError('Matricule requis')
      setBusy(false)
      return
    }

    try {
      const endpoint = vehicleEditingId
        ? `${VEHICLE_API}/vehicles/${vehicleEditingId}`
        : `${VEHICLE_API}/vehicles`
      const method = vehicleEditingId ? 'PUT' : 'POST'
      await fetchJson(endpoint, {
        method,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(vehicleForm),
      })

      setVehicleForm(initialVehicleForm)
      setVehicleEditingId(null)
      await loadVehicles()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setBusy(false)
    }
  }

  async function deleteVehicle(id: string) {
    setBusy(true)
    setError(null)
    try {
      await fetchJson(`${VEHICLE_API}/vehicles/${id}`, { method: 'DELETE' })
      await loadVehicles()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
      setBusy(false)
    }
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
    setBusy(true)
    setError(null)
    if (!positionForm.vehicleId) {
      setError('Selectionner un vehicule')
      setBusy(false)
      return
    }

    const latitude = Number(positionForm.latitude)
    const longitude = Number(positionForm.longitude)
    const speed = Number(positionForm.speed || 0)
    if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
      setError('Latitude et longitude requises')
      setBusy(false)
      return
    }

    try {
      await fetchJson(`${VEHICLE_API}/vehicles/${positionForm.vehicleId}/position`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ latitude, longitude, speed }),
      })
      setPositionForm({ ...positionForm, latitude: '', longitude: '', speed: '' })
      await loadVehicles()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setBusy(false)
    }
  }

  async function loadVehicleHistory() {
    setBusy(true)
    setError(null)
    if (!vehicleHistoryId) {
      setError('Selectionner un vehicule')
      setBusy(false)
      return
    }
    try {
      const data = await fetchJson(`${VEHICLE_API}/vehicles/${vehicleHistoryId}/history`)
      setVehicleHistory(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setBusy(false)
    }
  }

  async function simulateVehicle(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    if (!simulationForm.vehicleId) {
      setError('Selectionner un vehicule')
      setBusy(false)
      return
    }
    try {
      await fetchJson(`${VEHICLE_API}/vehicles/${simulationForm.vehicleId}/simulate`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          steps: Number(simulationForm.steps),
          deltaLat: Number(simulationForm.deltaLat),
          deltaLng: Number(simulationForm.deltaLng),
          baseSpeed: Number(simulationForm.baseSpeed),
        }),
      })
      await loadVehicles()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setBusy(false)
    }
  }

  async function submitZone(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    const latitude = Number(zoneForm.latitude)
    const longitude = Number(zoneForm.longitude)
    if (!zoneForm.zone_name || Number.isNaN(latitude) || Number.isNaN(longitude)) {
      setError('Nom, latitude et longitude requis')
      setBusy(false)
      return
    }

    try {
      const endpoint = zoneEditingId
        ? `${TRAFFIC_API}/zones/${zoneEditingId}`
        : `${TRAFFIC_API}/zones`
      const method = zoneEditingId ? 'PUT' : 'POST'
      await fetchJson(endpoint, {
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
      await loadZones()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setBusy(false)
    }
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
    setBusy(true)
    setError(null)
    try {
      await fetchJson(`${TRAFFIC_API}/zones/${id}`, { method: 'DELETE' })
      await loadZones()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
      setBusy(false)
    }
  }

  async function analyzeZone(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    if (!analyzeForm.zoneId) {
      setError('Selectionner une zone')
      setBusy(false)
      return
    }

    let positions: { latitude: number; longitude: number; speed?: number }[] = []
    try {
      const parsed = JSON.parse(analyzeForm.positionsJson)
      if (!Array.isArray(parsed)) throw new Error('positions invalides')
      positions = parsed
    } catch (err) {
      setError('Positions JSON invalides')
      setBusy(false)
      return
    }

    try {
      const data = await fetchJson(`${TRAFFIC_API}/zones/${analyzeForm.zoneId}/analyze`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          positions,
          radiusKm: Number(analyzeForm.radiusKm),
        }),
      })
      setAnalysisResult(data)
      await loadZones()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setBusy(false)
    }
  }

  async function loginUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const data = await fetchJson(`${AUTH_API}/login`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(loginForm),
      })
      storeToken(data.token)
      setAuthUser(data.user)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setBusy(false)
    }
  }

  async function registerUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const data = await fetchJson(`${AUTH_API}/register`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(registerForm),
      })
      storeToken(data.token)
      setAuthUser(data.user)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setBusy(false)
    }
  }

  async function loadProfile() {
    setBusy(true)
    setError(null)
    if (!authToken) {
      setError('Token manquant')
      setBusy(false)
      return
    }

    try {
      const data = await fetchJson(`${AUTH_API}/profile`, {
        headers: { authorization: `Bearer ${authToken}` },
      })
      setAuthUser(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setBusy(false)
    }
  }

  async function loadUsers() {
    setBusy(true)
    setError(null)
    if (!authToken) {
      setError('Token manquant')
      setBusy(false)
      return
    }
    try {
      const data = await fetchJson(`${AUTH_API}/admin/users`, {
        headers: { authorization: `Bearer ${authToken}` },
      })
      setAdminUsers(data.users || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="app">
      <header className="topbar">
        <div>
          <p className="eyebrow">Smart Urban Traffic</p>
          <h1>Control center multi-services</h1>
          <p className="subtitle">
            Interfaces completes pour incidents, vehicules, trafic, notifications
            et authentication.
          </p>
        </div>
        <div className="meta">
          <button className="ghost" onClick={refreshAll} disabled={busy}>
            Actualiser
          </button>
          <span className="updated">Maj {lastUpdated || '--:--'}</span>
        </div>
      </header>

      <section className="metrics">
        <div className="metric-card">
          <span>Incidents</span>
          <strong>{stats.totalIncidents}</strong>
          <em>{stats.signale} signales</em>
        </div>
        <div className="metric-card">
          <span>Notifications</span>
          <strong>{stats.totalNotifications}</strong>
          <em>{notifications.filter((item) => !item.read).length} non lues</em>
        </div>
        <div className="metric-card">
          <span>Vehicules</span>
          <strong>{stats.totalVehicles}</strong>
          <em>Etat temps reel</em>
        </div>
        <div className="metric-card">
          <span>Zones trafic</span>
          <strong>{stats.totalZones}</strong>
          <em>{stats.enCours} incidents en cours</em>
        </div>
      </section>

      <div className="tabs">
        {sections.map((section) => (
          <button
            key={section.id}
            className={`tab ${activeSection === section.id ? 'active' : ''}`}
            onClick={() => setActiveSection(section.id)}
            type="button"
          >
            {section.label}
          </button>
        ))}
      </div>

      {error && <div className="banner">{error}</div>}

      {activeSection === 'incidents' && (
        <section className="section-grid incident-grid">
          <div className="panel">
            <div className="panel-header">
              <h2>{incidentEditingId ? 'Modifier incident' : 'Declarer incident'}</h2>
              <p>Precisez le type, la localisation et la description.</p>
            </div>
            <form onSubmit={submitIncident} className="incident-form">
              <label>
                Titre
                <input
                  value={incidentForm.title}
                  onChange={(event) =>
                    setIncidentForm({ ...incidentForm, title: event.target.value })
                  }
                  placeholder="Collision sur Avenue Centrale"
                />
              </label>
              <label>
                Type
                <select
                  value={incidentForm.type}
                  onChange={(event) =>
                    setIncidentForm({ ...incidentForm, type: event.target.value })
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
                  value={incidentForm.description}
                  onChange={(event) =>
                    setIncidentForm({
                      ...incidentForm,
                      description: event.target.value,
                    })
                  }
                  placeholder="Details sur la voie impactee et le trafic."
                  rows={3}
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
              <div className="form-actions">
                <button className="primary" type="submit" disabled={busy}>
                  {incidentEditingId ? 'Mettre a jour' : 'Creer incident'}
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
              <h2>Liste des incidents</h2>
              <p>Suivi du statut, localisation et actions rapides.</p>
            </div>
            <div className="incident-list">
              {incidents.length === 0 ? (
                <div className="empty">Aucun incident pour le moment.</div>
              ) : (
                incidents.map((incident) => (
                  <article className="incident-item" key={incident.id}>
                    <div className="incident-main">
                      <div>
                        <h3>{incident.title}</h3>
                        <p>{incident.description || 'Aucune description.'}</p>
                      </div>
                      <div className="tags">
                        <span className={`tag type-${incident.type.toLowerCase()}`}>
                          {formatEnum(incident.type)}
                        </span>
                        <span className={`tag status-${incident.status.toLowerCase()}`}>
                          {formatEnum(incident.status)}
                        </span>
                      </div>
                    </div>
                    <div className="incident-meta">
                      <div>
                        <span>Lat</span>
                        <strong>{incident.latitude.toFixed(4)}</strong>
                      </div>
                      <div>
                        <span>Lng</span>
                        <strong>{incident.longitude.toFixed(4)}</strong>
                      </div>
                      <div>
                        <span>Statut</span>
                        <select
                          value={incident.status}
                          onChange={(event) =>
                            updateIncidentStatus(incident.id, event.target.value)
                          }
                        >
                          {STATUSES.map((status) => (
                            <option key={status} value={status}>
                              {formatEnum(status)}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="incident-actions">
                        <button className="ghost" type="button" onClick={() => startIncidentEdit(incident)}>
                          Modifier
                        </button>
                        <button className="danger" type="button" onClick={() => deleteIncident(incident.id)}>
                          Supprimer
                        </button>
                      </div>
                    </div>
                  </article>
                ))
              )}
            </div>
          </div>
        </section>
      )}

      {activeSection === 'notifications' && (
        <section className="section-grid notification-grid">
          <div className="panel">
            <div className="panel-header">
              <h2>Envoyer une notification</h2>
              <p>Diffusez une alerte manuelle vers les equipes terrain.</p>
            </div>
            <form onSubmit={submitNotification} className="incident-form">
              <label className="full">
                Message
                <textarea
                  value={notificationForm.message}
                  onChange={(event) =>
                    setNotificationForm({
                      ...notificationForm,
                      message: event.target.value,
                    })
                  }
                  placeholder="Incident resolu dans la zone nord."
                  rows={3}
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
                Incident ID (optionnel)
                <input
                  value={notificationForm.incident_id}
                  onChange={(event) =>
                    setNotificationForm({
                      ...notificationForm,
                      incident_id: event.target.value,
                    })
                  }
                  placeholder="incident-id"
                />
              </label>
              <div className="form-actions">
                <button className="primary" type="submit" disabled={busy}>
                  Envoyer
                </button>
              </div>
            </form>
          </div>

          <div className="panel">
            <div className="panel-header">
              <h2>Historique des notifications</h2>
              <p>Marquez les alertes traitees.</p>
            </div>
            <div className="notification-list">
              {notifications.length === 0 ? (
                <div className="empty">Aucune notification.</div>
              ) : (
                notifications.map((note) => (
                  <article key={note.id} className={`notification-item ${note.read ? 'read' : 'unread'}`}>
                    <div>
                      <p>{note.message}</p>
                      <div className="notification-meta">
                        <span>{note.channel}</span>
                        <span>{note.source}</span>
                      </div>
                    </div>
                    <button className="ghost" onClick={() => markNotificationRead(note.id)} disabled={note.read}>
                      {note.read ? 'Lu' : 'Marquer lu'}
                    </button>
                  </article>
                ))
              )}
            </div>
          </div>
        </section>
      )}

      {activeSection === 'vehicles' && (
        <section className="section-grid vehicle-grid">
          <div className="panel vehicle-list">
            <div className="panel-header">
              <h2>Flotte vehicules</h2>
              <p>Creer, modifier et supprimer les vehicules.</p>
            </div>
            <div className="data-list">
              {vehicles.length === 0 ? (
                <div className="empty">Aucun vehicule.</div>
              ) : (
                vehicles.map((vehicle) => (
                  <article className="data-item" key={vehicle.id}>
                    <div className="incident-main">
                      <div>
                        <h3>{vehicle.matricule}</h3>
                        <p>{vehicle.marque} - {vehicle.type}</p>
                      </div>
                      <div className="tags">
                        <span className={`tag status-${vehicle.status.toLowerCase()}`}>{vehicle.status}</span>
                      </div>
                    </div>
                    <div className="incident-meta">
                      <div>
                        <span>Lat</span>
                        <strong>{vehicle.lat.toFixed(4)}</strong>
                      </div>
                      <div>
                        <span>Lng</span>
                        <strong>{vehicle.lng.toFixed(4)}</strong>
                      </div>
                      <div className="incident-actions">
                        <button className="ghost" type="button" onClick={() => startVehicleEdit(vehicle)}>
                          Modifier
                        </button>
                        <button className="danger" type="button" onClick={() => deleteVehicle(vehicle.id)}>
                          Supprimer
                        </button>
                      </div>
                    </div>
                  </article>
                ))
              )}
            </div>
          </div>

          <div className="panel">
            <div className="panel-header">
              <h2>{vehicleEditingId ? 'Modifier vehicule' : 'Nouveau vehicule'}</h2>
              <p>Enregistrez un vehicule et son statut.</p>
            </div>
            <form onSubmit={submitVehicle} className="incident-form">
              <label>
                Matricule
                <input
                  value={vehicleForm.matricule}
                  onChange={(event) =>
                    setVehicleForm({ ...vehicleForm, matricule: event.target.value })
                  }
                  placeholder="AA-123-BB"
                />
              </label>
              <label>
                Type
                <input
                  value={vehicleForm.type}
                  onChange={(event) =>
                    setVehicleForm({ ...vehicleForm, type: event.target.value })
                  }
                  placeholder="car"
                />
              </label>
              <label>
                Marque
                <input
                  value={vehicleForm.marque}
                  onChange={(event) =>
                    setVehicleForm({ ...vehicleForm, marque: event.target.value })
                  }
                  placeholder="Renault"
                />
              </label>
              <label>
                Statut
                <select
                  value={vehicleForm.status}
                  onChange={(event) =>
                    setVehicleForm({ ...vehicleForm, status: event.target.value })
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
                  {vehicleEditingId ? 'Mettre a jour' : 'Creer vehicule'}
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
              <h2>Positions et historique</h2>
              <p>Mettre a jour la position et simuler un trajet.</p>
            </div>
            <form onSubmit={submitPosition} className="form-stack">
              <label>
                Vehicule
                <select
                  value={positionForm.vehicleId}
                  onChange={(event) =>
                    setPositionForm({ ...positionForm, vehicleId: event.target.value })
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
                  Lat
                  <input
                    value={positionForm.latitude}
                    onChange={(event) =>
                      setPositionForm({ ...positionForm, latitude: event.target.value })
                    }
                    placeholder="36.8065"
                  />
                </label>
                <label>
                  Lng
                  <input
                    value={positionForm.longitude}
                    onChange={(event) =>
                      setPositionForm({ ...positionForm, longitude: event.target.value })
                    }
                    placeholder="10.1815"
                  />
                </label>
              </div>
              <label>
                Vitesse
                <input
                  value={positionForm.speed}
                  onChange={(event) =>
                    setPositionForm({ ...positionForm, speed: event.target.value })
                  }
                  placeholder="30"
                />
              </label>
              <button className="primary" type="submit" disabled={busy}>
                Mettre a jour position
              </button>
            </form>

            <form onSubmit={simulateVehicle} className="form-stack">
              <div className="divider"></div>
              <label>
                Simulation vehicule
                <select
                  value={simulationForm.vehicleId}
                  onChange={(event) =>
                    setSimulationForm({ ...simulationForm, vehicleId: event.target.value })
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
                      setSimulationForm({ ...simulationForm, steps: event.target.value })
                    }
                  />
                </label>
                <label>
                  Vitesse
                  <input
                    value={simulationForm.baseSpeed}
                    onChange={(event) =>
                      setSimulationForm({ ...simulationForm, baseSpeed: event.target.value })
                    }
                  />
                </label>
              </div>
              <div className="field-row">
                <label>
                  Delta lat
                  <input
                    value={simulationForm.deltaLat}
                    onChange={(event) =>
                      setSimulationForm({ ...simulationForm, deltaLat: event.target.value })
                    }
                  />
                </label>
                <label>
                  Delta lng
                  <input
                    value={simulationForm.deltaLng}
                    onChange={(event) =>
                      setSimulationForm({ ...simulationForm, deltaLng: event.target.value })
                    }
                  />
                </label>
              </div>
              <button className="ghost" type="submit" disabled={busy}>
                Lancer simulation
              </button>
            </form>

            <div className="divider"></div>
            <div className="form-stack">
              <label>
                Historique vehicule
                <select
                  value={vehicleHistoryId}
                  onChange={(event) => setVehicleHistoryId(event.target.value)}
                >
                  <option value="">Selectionner</option>
                  {vehicles.map((vehicle) => (
                    <option key={vehicle.id} value={vehicle.id}>
                      {vehicle.matricule}
                    </option>
                  ))}
                </select>
              </label>
              <button className="ghost" type="button" onClick={loadVehicleHistory}>
                Charger historique
              </button>
              {vehicleHistory.length > 0 ? (
                <div className="history-list">
                  {vehicleHistory.map((pos) => (
                    <div key={pos.id} className="history-item">
                      <span>{pos.latitude.toFixed(4)}</span>
                      <span>{pos.longitude.toFixed(4)}</span>
                      <span>{pos.speed} km/h</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="muted">Aucun historique charge.</p>
              )}
            </div>
          </div>
        </section>
      )}

      {activeSection === 'traffic' && (
        <section className="section-grid traffic-grid">
          <div className="panel">
            <div className="panel-header">
              <h2>{zoneEditingId ? 'Modifier zone' : 'Nouvelle zone'}</h2>
              <p>Ajouter une zone et suivre le niveau de trafic.</p>
            </div>
            <form onSubmit={submitZone} className="incident-form">
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
              <label>
                Latitude
                <input
                  value={zoneForm.latitude}
                  onChange={(event) =>
                    setZoneForm({ ...zoneForm, latitude: event.target.value })
                  }
                  placeholder="36.8065"
                />
              </label>
              <label>
                Longitude
                <input
                  value={zoneForm.longitude}
                  onChange={(event) =>
                    setZoneForm({ ...zoneForm, longitude: event.target.value })
                  }
                  placeholder="10.1815"
                />
              </label>
              <div className="form-actions">
                <button className="primary" type="submit" disabled={busy}>
                  {zoneEditingId ? 'Mettre a jour' : 'Creer zone'}
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
              <h2>Zones trafic</h2>
              <p>Controlez les parametres et les niveaux.</p>
            </div>
            <div className="data-list">
              {zones.length === 0 ? (
                <div className="empty">Aucune zone.</div>
              ) : (
                zones.map((zone) => (
                  <article className="data-item" key={zone.id}>
                    <div className="incident-main">
                      <div>
                        <h3>{zone.zone_name}</h3>
                        <p>Lat {zone.latitude.toFixed(4)} / Lng {zone.longitude.toFixed(4)}</p>
                      </div>
                      <div className="tags">
                        <span className={`tag status-${zone.level.toLowerCase()}`}>{zone.level}</span>
                      </div>
                    </div>
                    <div className="incident-meta">
                      <div>
                        <span>Density</span>
                        <strong>{zone.density}</strong>
                      </div>
                      <div>
                        <span>Niveau</span>
                        <strong>{zone.level}</strong>
                      </div>
                      <div className="incident-actions">
                        <button className="ghost" type="button" onClick={() => startZoneEdit(zone)}>
                          Modifier
                        </button>
                        <button className="danger" type="button" onClick={() => deleteZone(zone.id)}>
                          Supprimer
                        </button>
                      </div>
                    </div>
                  </article>
                ))
              )}
            </div>
          </div>

          <div className="panel">
            <div className="panel-header">
              <h2>Analyse de trafic</h2>
              <p>Calculez la densite et le niveau autour d'une zone.</p>
            </div>
            <form onSubmit={analyzeZone} className="form-stack">
              <label>
                Zone
                <select
                  value={analyzeForm.zoneId}
                  onChange={(event) =>
                    setAnalyzeForm({ ...analyzeForm, zoneId: event.target.value })
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
                Rayon (km)
                <input
                  value={analyzeForm.radiusKm}
                  onChange={(event) =>
                    setAnalyzeForm({ ...analyzeForm, radiusKm: event.target.value })
                  }
                />
              </label>
              <label className="full">
                Positions JSON
                <textarea
                  rows={4}
                  value={analyzeForm.positionsJson}
                  onChange={(event) =>
                    setAnalyzeForm({ ...analyzeForm, positionsJson: event.target.value })
                  }
                />
              </label>
              <button className="primary" type="submit" disabled={busy}>
                Lancer analyse
              </button>
            </form>
            {analysisResult ? (
              <div className="analysis-card">
                <h3>Resultat</h3>
                <div className="analysis-grid">
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
              </div>
            ) : null}
          </div>
        </section>
      )}

      {activeSection === 'auth' && (
        <section className="section-grid auth-grid">
          <div className="panel">
            <div className="panel-header">
              <h2>Connexion</h2>
              <p>Acceder au profile securise.</p>
            </div>
            <form onSubmit={loginUser} className="form-stack">
              <label>
                Email
                <input
                  value={loginForm.email}
                  onChange={(event) =>
                    setLoginForm({ ...loginForm, email: event.target.value })
                  }
                  placeholder="user@mail.com"
                />
              </label>
              <label>
                Password
                <input
                  type="password"
                  value={loginForm.password}
                  onChange={(event) =>
                    setLoginForm({ ...loginForm, password: event.target.value })
                  }
                />
              </label>
              <button className="primary" type="submit" disabled={busy}>
                Login
              </button>
              {authToken ? (
                <button className="ghost" type="button" onClick={clearToken}>
                  Logout
                </button>
              ) : null}
            </form>
          </div>

          <div className="panel">
            <div className="panel-header">
              <h2>Inscription</h2>
              <p>Creer un nouvel utilisateur.</p>
            </div>
            <form onSubmit={registerUser} className="form-stack">
              <label>
                Username
                <input
                  value={registerForm.username}
                  onChange={(event) =>
                    setRegisterForm({ ...registerForm, username: event.target.value })
                  }
                />
              </label>
              <label>
                Email
                <input
                  value={registerForm.email}
                  onChange={(event) =>
                    setRegisterForm({ ...registerForm, email: event.target.value })
                  }
                />
              </label>
              <label>
                Password
                <input
                  type="password"
                  value={registerForm.password}
                  onChange={(event) =>
                    setRegisterForm({ ...registerForm, password: event.target.value })
                  }
                />
              </label>
              <label>
                Role
                <select
                  value={registerForm.role}
                  onChange={(event) =>
                    setRegisterForm({ ...registerForm, role: event.target.value })
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
                Register
              </button>
            </form>
          </div>

          <div className="panel">
            <div className="panel-header">
              <h2>Profil & admin</h2>
              <p>Verifier le token et l acces admin.</p>
            </div>
            <div className="form-stack">
              <button className="ghost" type="button" onClick={loadProfile}>
                Charger profil
              </button>
              <button className="ghost" type="button" onClick={loadUsers}>
                Lister utilisateurs
              </button>
              {authUser ? (
                <div className="profile-card">
                  <h3>{authUser.username}</h3>
                  <p>{authUser.email}</p>
                  <span className="tag">{authUser.role}</span>
                </div>
              ) : (
                <p className="muted">Aucun profil charge.</p>
              )}
              {adminUsers.length > 0 ? (
                <div className="data-list">
                  {adminUsers.map((user) => (
                    <div className="history-item" key={user.id}>
                      <span>{user.username}</span>
                      <span>{user.role}</span>
                      <span>{user.email}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="muted">Aucun utilisateur admin charge.</p>
              )}
            </div>
          </div>
        </section>
      )}

      {activeSection === 'gateway' && (
        <section className="section-grid gateway-grid">
          <div className="panel">
            <div className="panel-header">
              <h2>Gateway GraphQL</h2>
              <p>Acces unifie aux services via Apollo Gateway.</p>
            </div>
            <div className="gateway-card">
              <div>
                <span>Endpoint</span>
                <strong>{GATEWAY_API}</strong>
              </div>
              <button className="primary" type="button" onClick={() => window.open(GATEWAY_API, '_blank')}>
                Ouvrir Gateway
              </button>
            </div>
          </div>
        </section>
      )}
    </div>
  )
}

export default App
