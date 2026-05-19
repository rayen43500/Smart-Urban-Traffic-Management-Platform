import { useEffect, useMemo, useState, type FormEvent } from 'react'
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

const INCIDENT_API =
  import.meta.env.VITE_INCIDENT_API || 'http://localhost:4004'
const NOTIFICATION_API =
  import.meta.env.VITE_NOTIFICATION_API || 'http://localhost:4005'

const INCIDENT_TYPES = ['ACCIDENT', 'TRAVAUX', 'ROUTE_FERMEE', 'EMBOUTEILLAGE']
const STATUSES = ['SIGNALE', 'EN_COURS', 'RESOLU']

const initialForm = {
  title: '',
  description: '',
  type: 'ACCIDENT',
  latitude: '',
  longitude: '',
}

function formatEnum(value: string) {
  return value
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

function App() {
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [form, setForm] = useState(initialForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState('')

  const stats = useMemo(() => {
    const total = incidents.length
    const signale = incidents.filter((item) => item.status === 'SIGNALE').length
    const enCours = incidents.filter((item) => item.status === 'EN_COURS').length
    const resolu = incidents.filter((item) => item.status === 'RESOLU').length
    return { total, signale, enCours, resolu }
  }, [incidents])

  useEffect(() => {
    void refreshAll()
  }, [])

  async function refreshAll() {
    setBusy(true)
    setError(null)
    try {
      const [incRes, noteRes] = await Promise.all([
        fetch(`${INCIDENT_API}/incidents`),
        fetch(`${NOTIFICATION_API}/notifications`),
      ])
      if (!incRes.ok || !noteRes.ok) {
        throw new Error('Impossible de charger les donnees')
      }
      const [incidentsData, notificationsData] = await Promise.all([
        incRes.json(),
        noteRes.json(),
      ])
      setIncidents(incidentsData)
      setNotifications(notificationsData)
      setLastUpdated(new Date().toLocaleTimeString())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setBusy(false)
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    const latitude = Number(form.latitude)
    const longitude = Number(form.longitude)

    if (!form.title || Number.isNaN(latitude) || Number.isNaN(longitude)) {
      setError('Titre, latitude et longitude sont requis')
      setBusy(false)
      return
    }

    const payload = {
      title: form.title,
      description: form.description,
      type: form.type,
      latitude,
      longitude,
    }

    try {
      const endpoint = editingId
        ? `${INCIDENT_API}/incidents/${editingId}`
        : `${INCIDENT_API}/incidents`
      const method = editingId ? 'PUT' : 'POST'

      const response = await fetch(endpoint, {
        method,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        throw new Error('Impossible de sauvegarder l incident')
      }

      setForm(initialForm)
      setEditingId(null)
      await refreshAll()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setBusy(false)
    }
  }

  async function updateStatus(id: string, status: string) {
    setBusy(true)
    setError(null)
    try {
      const response = await fetch(`${INCIDENT_API}/incidents/${id}/status`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!response.ok) {
        throw new Error('Impossible de changer le statut')
      }
      await refreshAll()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
      setBusy(false)
    }
  }

  async function deleteIncident(id: string) {
    setBusy(true)
    setError(null)
    try {
      const response = await fetch(`${INCIDENT_API}/incidents/${id}`, {
        method: 'DELETE',
      })
      if (!response.ok) {
        throw new Error('Impossible de supprimer l incident')
      }
      await refreshAll()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
      setBusy(false)
    }
  }

  async function markRead(id: string) {
    try {
      const response = await fetch(`${NOTIFICATION_API}/notifications/${id}/read`, {
        method: 'PATCH',
      })
      if (!response.ok) {
        throw new Error('Impossible de marquer comme lu')
      }
      setNotifications((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, read: true } : item,
        ),
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    }
  }

  function startEdit(incident: Incident) {
    setEditingId(incident.id)
    setForm({
      title: incident.title,
      description: incident.description,
      type: incident.type,
      latitude: String(incident.latitude),
      longitude: String(incident.longitude),
    })
  }

  function cancelEdit() {
    setEditingId(null)
    setForm(initialForm)
  }

  return (
    <div className="app">
      <header className="topbar">
        <div>
          <p className="eyebrow">Smart Urban Traffic</p>
          <h1>Gestion des incidents & alertes</h1>
          <p className="subtitle">
            Surveillez les incidents routiers, lancez les alertes et suivez les
            actions en temps reel.
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
          <span>Total incidents</span>
          <strong>{stats.total}</strong>
        </div>
        <div className="metric-card">
          <span>Signales</span>
          <strong>{stats.signale}</strong>
        </div>
        <div className="metric-card">
          <span>En cours</span>
          <strong>{stats.enCours}</strong>
        </div>
        <div className="metric-card">
          <span>Resolus</span>
          <strong>{stats.resolu}</strong>
        </div>
      </section>

      {error && <div className="banner">{error}</div>}

      <div className="main-grid">
        <section className="panel form-panel">
          <div className="panel-header">
            <h2>{editingId ? 'Modifier un incident' : 'Declarer un incident'}</h2>
            <p>Precisez le type, la localisation et la description.</p>
          </div>
          <form onSubmit={handleSubmit} className="incident-form">
            <label>
              Titre
              <input
                value={form.title}
                onChange={(event) =>
                  setForm({ ...form, title: event.target.value })
                }
                placeholder="Collision sur Avenue Centrale"
              />
            </label>
            <label>
              Type
              <select
                value={form.type}
                onChange={(event) =>
                  setForm({ ...form, type: event.target.value })
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
                value={form.description}
                onChange={(event) =>
                  setForm({ ...form, description: event.target.value })
                }
                placeholder="Details sur la voie impactee et le trafic."
                rows={3}
              />
            </label>
            <label>
              Latitude
              <input
                value={form.latitude}
                onChange={(event) =>
                  setForm({ ...form, latitude: event.target.value })
                }
                placeholder="36.8065"
              />
            </label>
            <label>
              Longitude
              <input
                value={form.longitude}
                onChange={(event) =>
                  setForm({ ...form, longitude: event.target.value })
                }
                placeholder="10.1815"
              />
            </label>
            <div className="form-actions">
              <button className="primary" type="submit" disabled={busy}>
                {editingId ? 'Mettre a jour' : 'Creer incident'}
              </button>
              {editingId ? (
                <button className="ghost" type="button" onClick={cancelEdit}>
                  Annuler
                </button>
              ) : null}
            </div>
          </form>
        </section>

        <section className="panel list-panel">
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
                      <span
                        className={`tag status-${incident.status.toLowerCase()}`}
                      >
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
                          updateStatus(incident.id, event.target.value)
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
                      <button
                        className="ghost"
                        type="button"
                        onClick={() => startEdit(incident)}
                      >
                        Modifier
                      </button>
                      <button
                        className="danger"
                        type="button"
                        onClick={() => deleteIncident(incident.id)}
                      >
                        Supprimer
                      </button>
                    </div>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>

        <aside className="panel notification-panel">
          <div className="panel-header">
            <h2>Alertes recentes</h2>
            <p>Historique et notifications automatiques.</p>
          </div>
          <div className="notification-list">
            {notifications.length === 0 ? (
              <div className="empty">Aucune notification.</div>
            ) : (
              notifications.map((note) => (
                <article
                  key={note.id}
                  className={`notification-item ${note.read ? 'read' : 'unread'}`}
                >
                  <div>
                    <p>{note.message}</p>
                    <div className="notification-meta">
                      <span>{note.channel}</span>
                      <span>{note.source}</span>
                    </div>
                  </div>
                  <button
                    className="ghost"
                    onClick={() => markRead(note.id)}
                    disabled={note.read}
                  >
                    {note.read ? 'Lu' : 'Marquer lu'}
                  </button>
                </article>
              ))
            )}
          </div>
        </aside>
      </div>
    </div>
  )
}

export default App
