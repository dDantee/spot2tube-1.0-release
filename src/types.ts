export interface SpotifyTrack {
  id: string;
  title: string;
  artist: string;
  album?: string;
  durationMs?: number;
  durationFormatted?: string;
  previewUrl?: string | null;
  coverUrl?: string;
  searchQuery: string;
}

export type TrackLimit = 25 | 50 | 'all';

export interface SpotifyPlaylistData {
  id: string;
  type: 'playlist' | 'album' | 'track';
  name: string;
  description: string;
  owner: string;
  coverUrl: string;
  totalTracks: number;
  tracks: SpotifyTrack[];
  allTracks?: SpotifyTrack[];
  selectedLimit?: TrackLimit;
}

export interface YouTubeVideo {
  id: string;
  url: string;
  musicUrl?: string;
  title: string;
  channel: string;
  duration: string;
  thumbnail: string;
  views: string;
  isFallback?: boolean;
}

export interface ConvertedTrack {
  track: SpotifyTrack;
  youtube: YouTubeVideo | null;
  alternatives: YouTubeVideo[];
  status: 'pending' | 'converting' | 'completed' | 'error';
  error?: string;
}

export interface SavedConversion {
  id: string;
  timestamp: number;
  playlistName: string;
  playlistType: 'playlist' | 'album' | 'track';
  coverUrl: string;
  totalTracks: number;
  youtubeMixUrl?: string;
  items: Array<{
    title: string;
    artist: string;
    youtubeUrl: string;
    youtubeTitle: string;
    thumbnail: string;
    videoId: string;
  }>;
}
