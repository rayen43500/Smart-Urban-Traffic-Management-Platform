/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GATEWAY_API?: string
  readonly VITE_AUTH_API?: string
  readonly VITE_VEHICLE_API?: string
  readonly VITE_TRAFFIC_API?: string
  readonly VITE_INCIDENT_API?: string
  readonly VITE_NOTIFICATION_API?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
