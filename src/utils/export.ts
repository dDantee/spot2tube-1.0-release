import { ConvertedTrack, SpotifyPlaylistData } from '../types';

export function generateYouTubeMixUrl(tracks: ConvertedTrack[]): string | null {
  const videoIds = tracks
    .map((t) => t.youtube?.id)
    .filter((id): id is string => Boolean(id && id.length > 0));

  if (videoIds.length === 0) return null;
  // YouTube watch_videos supports up to 50 video IDs in the URL query
  const subset = videoIds.slice(0, 50);
  return `https://www.youtube.com/watch_videos?video_ids=${subset.join(',')}`;
}


export function exportToTxt(
  playlistName: string,
  tracks: ConvertedTrack[],
  mode: 'simple' | 'detailed' = 'detailed'
): void {
  let content = `# Playlist: ${playlistName}\n# Converted with Spot2Tube\n# Total Tracks: ${tracks.length}\n\n`;

  if (mode === 'simple') {
    tracks.forEach((t) => {
      if (t.youtube?.url) {
        content += `${t.youtube.url}\n`;
      }
    });
  } else {
    tracks.forEach((t, i) => {
      const num = (i + 1).toString().padStart(2, '0');
      const ytUrl = t.youtube?.url || 'Enlace no disponible';
      content += `${num}. ${t.track.artist} - ${t.track.title}\n   YouTube: ${ytUrl}\n\n`;
    });
  }

  downloadBlob(content, `${sanitizeFilename(playlistName)}_youtube_links.txt`, 'text/plain;charset=utf-8');
}

export function exportToCsv(playlistName: string, tracks: ConvertedTrack[]): void {
  const headers = ['Posición', 'Título', 'Artista', 'Enlace YouTube', 'Título en YouTube', 'Canal', 'Duración'];
  const rows = tracks.map((t, idx) => [
    idx + 1,
    `"${(t.track.title || '').replace(/"/g, '""')}"`,
    `"${(t.track.artist || '').replace(/"/g, '""')}"`,
    `"${t.youtube?.url || ''}"`,
    `"${(t.youtube?.title || '').replace(/"/g, '""')}"`,
    `"${(t.youtube?.channel || '').replace(/"/g, '""')}"`,
    `"${t.youtube?.duration || t.track.durationFormatted || ''}"`,
  ]);

  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  downloadBlob(csvContent, `${sanitizeFilename(playlistName)}_youtube.csv`, 'text/csv;charset=utf-8');
}

export function exportToM3u(playlistName: string, tracks: ConvertedTrack[]): void {
  let m3u = `#EXTM3U\n#PLAYLIST:${playlistName}\n\n`;
  tracks.forEach((t) => {
    if (t.youtube?.url) {
      const durationSeconds = t.track.durationMs ? Math.round(t.track.durationMs / 1000) : -1;
      m3u += `#EXTINF:${durationSeconds},${t.track.artist} - ${t.track.title}\n`;
      m3u += `${t.youtube.url}\n\n`;
    }
  });

  downloadBlob(m3u, `${sanitizeFilename(playlistName)}.m3u`, 'audio/x-mpegurl;charset=utf-8');
}

export function exportToJson(playlist: SpotifyPlaylistData, tracks: ConvertedTrack[]): void {
  const data = {
    playlist: {
      name: playlist.name,
      id: playlist.id,
      totalTracks: tracks.length,
      exportedAt: new Date().toISOString(),
    },
    items: tracks.map((t) => ({
      spotify: {
        title: t.track.title,
        artist: t.track.artist,
        duration: t.track.durationFormatted,
      },
      youtube: t.youtube
        ? {
            id: t.youtube.id,
            url: t.youtube.url,
            title: t.youtube.title,
            channel: t.youtube.channel,
            duration: t.youtube.duration,
          }
        : null,
    })),
  };

  downloadBlob(JSON.stringify(data, null, 2), `${sanitizeFilename(playlist.name)}_data.json`, 'application/json');
}

function sanitizeFilename(name: string): string {
  return (name || 'playlist')
    .toLowerCase()
    .replace(/[^a-z0-9_-]/gi, '_')
    .replace(/_+/g, '_')
    .slice(0, 40);
}

function downloadBlob(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
