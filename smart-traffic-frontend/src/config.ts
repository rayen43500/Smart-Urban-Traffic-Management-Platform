export const API_ENDPOINTS = {
  gateway: import.meta.env.VITE_GATEWAY_API || 'http://localhost:4000/graphql',
  auth: import.meta.env.VITE_AUTH_API || 'http://localhost:4001',
  vehicle: import.meta.env.VITE_VEHICLE_API || 'http://localhost:4002',
  traffic: import.meta.env.VITE_TRAFFIC_API || 'http://localhost:4003',
  incident: import.meta.env.VITE_INCIDENT_API || 'http://localhost:4004',
  notification: import.meta.env.VITE_NOTIFICATION_API || 'http://localhost:4005',
} as const

export type ApiServiceName = keyof typeof API_ENDPOINTS
