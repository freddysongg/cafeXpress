export interface Location {
  lat?: number;
  lon?: number;
}

export interface PreferencesEmbedding {
  vector: number[];
  metadata: {
    type: 'user' | 'preferences' | 'cafe';
    id: string;
    createdAt?: Date;
  };
}

export interface UserBody {
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  password: string;
  description?: string;
  location?: Location;
  preferencesEmbedding?: PreferencesEmbedding;
}
