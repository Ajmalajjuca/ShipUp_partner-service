export interface LocationCoordinates {
  latitude: number;
  longitude: number;
}

export interface GeoLocation {
  type: string;
  coordinates: number[];
}

export interface Address {
  street: string;
  city?: string;
  state?: string;
  postalCode?: string;
  latitude?: number;
  longitude?: number;
} 