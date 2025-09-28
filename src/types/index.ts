import { FeatureCollection } from 'geojson'

export interface User {
  id: string
  email: string
  first_name: string
  last_name: string
  full_name: string
  role: {
    id: string
    name: string
    description: string
  }
  created_at: string
  updated_at: string
  is_active: boolean
  organization?: {
    id: string
    name: string
  }
  is_superadmin: boolean
}

export interface Organization {
  id: string
  name: string
  description: string
  created_at: string
  updated_at: string
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface AuthResponse {
  access_token: string
  token_type: string
  user: User
  message: string
  success: boolean
}

export interface Location {
  id: string
  name: string
  description: string
  is_active: boolean
  source_url: string
  type: string
  created_at: string
  updated_at: string
  geom: {
    type: string
    coordinates: number[]
  }
  properties: {
    address: string
    city: string
    county: string
    state: string
    state_code: string
    status: string
    [key: string]: any 
  }
}

export interface Territory {
  id: string
  name: string
  description?: string
  geom: GeoJSON.Polygon | GeoJSON.MultiPolygon
  color?: string
  created_at: string
  updated_at: string
  properties: { [key: string]: any }
}

export interface Dataset {
  id: string
  name: string
  type: string
  count: number
}

export interface MapLayer {
  id: string
  name: string
  type:
    | 'territories'
    | 'current-locations'
    | 'potential-locations'
    | 'us-states'
    | 'rivers'
    | 'roads'
    | 'admin-boundaries'
    | 'customer-locations'
    | 'population-analysis'
    | 'custom'
    | 'expansion-analysis'
  visible: boolean
  data: FeatureCollection
  style?: any
  opacity: number
}

export interface Basemap {
  id: string
  name: string
  style: string | maplibregl.StyleSpecification
  icon: React.ReactNode
}

export interface MapState {
  center: [number, number]
  zoom: number
  bearing: number
  pitch: number
}

export type DrawingTool = 
  | 'draw_polygon' 
  | 'draw_point' 
  | 'draw_line_string' 
  | 'simple_select' 
  | 'direct_select'
  | 'trash'
  | 'none'