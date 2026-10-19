import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';

const app = express();
const PORT = 3000;

app.use(express.json());

// In-memory cache for YouTube searches to avoid repeated requests and speed up operations
const ytCache = new Map<string, any[]>();
const spotifyCache = new Map<string, any>();

interface TrackItem {
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

function formatDuration(ms?: number): string {
  if (!ms || isNaN(ms)) return '--:--';
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

// Extract Spotify ID and type from URL or URI
function parseSpotifyUrl(input: string): { type: 'playlist' | 'album' | 'track' | null; id: string | null } {
  const clean = input.trim();

  // Spotify URI: spotify:playlist:37i9dQZF1DXcBWIGoYBM5M
  const uriMatch = clean.match(/^spotify:(playlist|album|track):([a-zA-Z0-9]+)/);
  if (uriMatch) {
    return { type: uriMatch[1] as any, id: uriMatch[2] };
  }

  // Web URL: https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M?si=...
  const urlMatch = clean.match(/open\.spotify\.com\/(playlist|album|track)\/([a-zA-Z0-9]+)/);
  if (urlMatch) {
    return { type: urlMatch[1] as any, id: urlMatch[2] };
  }

  return { type: null, id: null };
}

// Fetch Spotify metadata via embed page
async function fetchSpotifyEntity(type: 'playlist' | 'album' | 'track', id: string) {
  const cacheKey = `${type}:${id}`;
  if (spotifyCache.has(cacheKey)) {
    return spotifyCache.get(cacheKey);
  }

  const embedUrl = `https://open.spotify.com/embed/${type}/${id}`;
  const response = await fetch(embedUrl, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
    },
  });

  if (!response.ok) {
    throw new Error(`Error ${response.status} al obtener datos de Spotify.`);
  }

  const html = await response.text();
  const nextDataMatch = html.match(/<script id="__NEXT_DATA__" type="application\/json">([^<]+)<\/script>/);

  if (!nextDataMatch) {
    throw new Error('No se pudo extraer la información del recurso de Spotify. Comprueba que el enlace sea público.');
  }

  const parsed = JSON.parse(nextDataMatch[1]);
  const pageProps = parsed.props?.pageProps;

  if (pageProps?.status === 404) {
    throw new Error('La playlist o recurso de Spotify no fue encontrado o es privado.');
  }

  const entity = pageProps?.state?.data?.entity;
  if (!entity) {
    throw new Error('No se encontraron canciones en este enlace de Spotify.');
  }

  let tracks: TrackItem[] = [];

  if (type === 'track') {
    const subtitle = entity.subtitle || entity.artists?.map((a: any) => a.name).join(', ') || '';
    tracks = [
      {
        id: entity.id || id,
        title: entity.title || entity.name || 'Desconocido',
        artist: subtitle,
        album: entity.album?.name,
        durationMs: entity.duration,
        durationFormatted: formatDuration(entity.duration),
        previewUrl: entity.audioPreview?.url || null,
        coverUrl: '', // Individual song thumbnails will come from the YouTube video
        searchQuery: `${subtitle ? subtitle + ' - ' : ''}${entity.title || entity.name} official`,
      },
    ];
  } else {
    const rawTrackList = entity.trackList || [];
    tracks = rawTrackList.map((item: any, idx: number) => {
      const title = item.title || item.name || `Canción ${idx + 1}`;
      const artist = item.subtitle || item.artists?.map((a: any) => a.name).join(', ') || 'Artista desconocido';
      const durationMs = item.duration;
      return {
        id: item.id || item.uri || `track-${idx}`,
        title,
        artist,
        durationMs,
        durationFormatted: formatDuration(durationMs),
        previewUrl: item.audioPreview?.url || null,
        coverUrl: '', // Keep clean so each track uses its resolved YouTube video thumbnail
        searchQuery: `${artist} - ${title} official`,
      };
    });
  }

  const result = {
    id,
    type,
    name: entity.name || entity.title || 'Playlist de Spotify',
    description: entity.subtitle || entity.description || '',
    owner: entity.owner?.name || entity.subtitle || '',
    coverUrl: entity.coverArt?.sources?.[0]?.url || entity.visualIdentity?.image?.[0]?.url || '',
    totalTracks: tracks.length,
    tracks,
  };

  spotifyCache.set(cacheKey, result);
  return result;
}

// Parse numeric views from view strings in Spanish or English
function parseViewCount(str?: string): number {
  if (!str) return 0;
  const s = str.trim().toLowerCase();

  const bMatch = s.match(/([0-9]+(?:[.,][0-9]+)?)\s*(?:b|billon|billion)/);
  if (bMatch) return parseFloat(bMatch[1].replace(',', '.')) * 1_000_000_000;

  const mMatch = s.match(/([0-9]+(?:[.,][0-9]+)?)\s*(?:m|mill|millon|million)/);
  if (mMatch) return parseFloat(mMatch[1].replace(',', '.')) * 1_000_000;

  const kMatch = s.match(/([0-9]+(?:[.,][0-9]+)?)\s*(?:k|mil|thousand)/);
  if (kMatch) return parseFloat(kMatch[1].replace(',', '.')) * 1_000;

  const digits = s.replace(/[^0-9]/g, '');
  return digits ? parseInt(digits, 10) : 0;
}

// Clean text for word matching
function cleanWords(text: string): string[] {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\(.*?\)|\[.*?\]/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(
      (w) =>
        w.length > 1 &&
        !['feat', 'ft', 'official', 'video', 'audio', 'oficial', 'lyrics', 'letra', 'the', 'la', 'el', 'los', 'las', 'de', 'del', 'and', 'y'].includes(w)
    );
}

// Robust YouTube search function using YouTube internal API (zero redirects) with scrape fallback
async function fetchYouTubeVideos(query: string): Promise<any[]> {
  const cleanQ = query.trim();

  // 1. Primary method: YouTube internal JSON endpoint (Fast, structured, ZERO redirects)
  try {
    const apiUrl = 'https://www.youtube.com/youtubei/v1/search?prettyPrint=false';
    const res = await fetch(apiUrl, {
      method: 'POST',
      redirect: 'manual', // Prevent redirect loops (Node fetch limit)
      headers: {
        'Content-Type': 'application/json',
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
        Cookie: 'SOCS=CAESEwgDEgk2ODEwMTcwMzYaAmVzIAEaBgiA_LyaBg; PREF=hl=es&gl=ES',
      },
      body: JSON.stringify({
        context: {
          client: {
            hl: 'es',
            gl: 'ES',
            clientName: 'WEB',
            clientVersion: '2.20240313.01.00',
          },
        },
        query: cleanQ,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      const contents =
        data.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents;
      const items: any[] = [];

      if (contents && Array.isArray(contents)) {
        for (const section of contents) {
          const itemSection = section.itemSectionRenderer?.contents;
          if (itemSection && Array.isArray(itemSection)) {
            for (const item of itemSection) {
              if (item.videoRenderer) {
                const v = item.videoRenderer;
                const videoId = v.videoId;
                if (videoId) {
                  const title =
                    v.title?.runs?.map((r: any) => r.text).join('') || v.title?.simpleText || '';
                  const channel = v.ownerText?.runs?.map((r: any) => r.text).join('') || '';
                  const duration = v.lengthText?.simpleText || '';
                  const thumbnails = v.thumbnail?.thumbnails || [];
                  const thumbnail = thumbnails[thumbnails.length - 1]?.url || '';
                  const viewsStr =
                    v.shortViewCountText?.simpleText || v.viewCountText?.simpleText || '';
                  const viewCount = parseViewCount(viewsStr);

                  items.push({
                    id: videoId,
                    url: `https://www.youtube.com/watch?v=${videoId}`,
                    musicUrl: `https://music.youtube.com/watch?v=${videoId}`,
                    title,
                    channel,
                    duration,
                    thumbnail,
                    views: viewsStr,
                    viewCount,
                  });

                  if (items.length >= 25) break;
                }
              }
            }
          }
          if (items.length >= 25) break;
        }
      }

      if (items.length > 0) {
        return items;
      }
    }
  } catch (apiErr) {
    console.warn('YouTubei API failed, attempting fallback scrape:', apiErr);
  }

  // 2. Secondary fallback: HTML scrape with manual redirect limit to avoid redirect loops
  try {
    const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(cleanQ)}`;
    const res = await fetch(url, {
      redirect: 'manual', // Never loop indefinitely
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
        Cookie: 'SOCS=CAESEwgDEgk2ODEwMTcwMzYaAmVzIAEaBgiA_LyaBg; PREF=hl=es&gl=ES',
      },
    });

    if (res.ok) {
      const html = await res.text();
      const match =
        html.match(/var ytInitialData = ({[\s\S]+?});<\/script>/) ||
        html.match(/ytInitialData\s*=\s*({.+?});/);

      if (match) {
        const data = JSON.parse(match[1]);
        const contents =
          data.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents;
        const items: any[] = [];

        if (contents && Array.isArray(contents)) {
          for (const section of contents) {
            const itemSection = section.itemSectionRenderer?.contents;
            if (itemSection && Array.isArray(itemSection)) {
              for (const item of itemSection) {
                if (item.videoRenderer) {
                  const v = item.videoRenderer;
                  const videoId = v.videoId;
                  if (videoId) {
                    const title =
                      v.title?.runs?.map((r: any) => r.text).join('') || v.title?.simpleText || '';
                    const channel = v.ownerText?.runs?.map((r: any) => r.text).join('') || '';
                    const duration = v.lengthText?.simpleText || '';
                    const thumbnails = v.thumbnail?.thumbnails || [];
                    const thumbnail = thumbnails[thumbnails.length - 1]?.url || '';
                    const viewsStr =
                      v.shortViewCountText?.simpleText || v.viewCountText?.simpleText || '';
                    const viewCount = parseViewCount(viewsStr);

                    items.push({
                      id: videoId,
                      url: `https://www.youtube.com/watch?v=${videoId}`,
                      musicUrl: `https://music.youtube.com/watch?v=${videoId}`,
                      title,
                      channel,
                      duration,
                      thumbnail,
                      views: viewsStr,
                      viewCount,
                    });

                    if (items.length >= 25) break;
                  }
                }
              }
            }
            if (items.length >= 25) break;
          }
        }
        return items;
      }
    }
  } catch (scrapeErr) {
    console.warn('Fallback HTML scrape failed:', scrapeErr);
  }

  return [];
}

// Scrape YouTube search for matching videos with forced most-viewed selection when no exact match exists
async function searchYouTube(query: string, targetTitle?: string, targetArtist?: string, maxResults = 4) {
  const cleanQuery = query.trim();
  const cacheKey = `${cleanQuery}__${targetTitle || ''}__${targetArtist || ''}`;
  if (ytCache.has(cacheKey)) {
    return ytCache.get(cacheKey)!;
  }

  let candidates = await fetchYouTubeVideos(cleanQuery);

  // If no candidates found, fallback to simpler search query
  if (candidates.length === 0 && (targetTitle || targetArtist)) {
    const fallbackQuery = `${targetArtist || ''} ${targetTitle || ''}`.trim();
    if (fallbackQuery && fallbackQuery !== cleanQuery) {
      candidates = await fetchYouTubeVideos(fallbackQuery);
    }
  }

  if (candidates.length === 0) {
    const fallback = [
      {
        id: '',
        url: `https://www.youtube.com/results?search_query=${encodeURIComponent(cleanQuery)}`,
        title: cleanQuery,
        channel: 'Búsqueda en YouTube',
        duration: '',
        thumbnail: '',
        views: '',
        viewCount: 0,
        isFallback: true,
      },
    ];
    return fallback;
  }

  // Calculate matching scores and view weighting
  const titleWords = cleanWords(targetTitle || cleanQuery);
  const artistWords = cleanWords(targetArtist || '');

  const scoredCandidates = candidates.map((item) => {
    const vTitle = item.title.toLowerCase();
    const vChannel = item.channel.toLowerCase();
    const combined = `${vTitle} ${vChannel}`;

    let matchedTitleWords = 0;
    for (const w of titleWords) {
      if (combined.includes(w)) matchedTitleWords++;
    }
    const titleRatio = titleWords.length > 0 ? matchedTitleWords / titleWords.length : 0.5;

    let matchedArtistWords = 0;
    for (const w of artistWords) {
      if (combined.includes(w)) matchedArtistWords++;
    }
    const artistRatio = artistWords.length > 0 ? matchedArtistWords / artistWords.length : 0.5;

    const views = item.viewCount || 0;
    const viewScore = views > 0 ? Math.log10(views) * 8 : 0;

    let bonus = 0;
    if (combined.includes('official') || combined.includes('oficial') || combined.includes('vevo') || combined.includes('topic')) {
      bonus += 15;
    }
    if (vTitle.includes('reaction') || vTitle.includes('reaccion') || vTitle.includes('review') || vTitle.includes('tutorial')) {
      bonus -= 40;
    }

    const keywordScore = titleRatio * 60 + artistRatio * 40;
    const totalScore = keywordScore + viewScore + bonus;

    return {
      item,
      matchedTitleWords,
      titleRatio,
      artistRatio,
      views,
      keywordScore,
      totalScore,
    };
  });

  // Check if we have strong matches
  const strongMatches = scoredCandidates.filter((s) => s.titleRatio >= 0.5);

  let sortedItems: any[] = [];

  if (strongMatches.length > 0) {
    // Sort strong matches by totalScore (official video with high views wins)
    strongMatches.sort((a, b) => b.totalScore - a.totalScore);
    const rest = scoredCandidates.filter((s) => !strongMatches.includes(s));
    rest.sort((a, b) => b.views - a.views);
    sortedItems = [...strongMatches, ...rest].map((s) => s.item);
  } else {
    // Force selection of the video with the MOST VIEWS that matches the searched title
    scoredCandidates.sort((a, b) => {
      if (a.matchedTitleWords > 0 && b.matchedTitleWords === 0) return -1;
      if (b.matchedTitleWords > 0 && a.matchedTitleWords === 0) return 1;
      if (b.views !== a.views) return b.views - a.views;
      return b.matchedTitleWords - a.matchedTitleWords;
    });

    sortedItems = scoredCandidates.map((s) => s.item);
  }

  // If primary item has no thumbnail or no id, fall back to lyrics video automatically
  if (sortedItems.length === 0 || !sortedItems[0]?.id || !sortedItems[0]?.thumbnail) {
    if (targetTitle) {
      const lyricsFallback = await searchYouTubeLyrics(targetTitle, targetArtist || '', maxResults);
      if (lyricsFallback.length > 0 && lyricsFallback[0]?.id) {
        ytCache.set(cacheKey, lyricsFallback);
        return lyricsFallback;
      }
    }
  }

  const finalResults = sortedItems.slice(0, maxResults);
  ytCache.set(cacheKey, finalResults);
  return finalResults;
}

// Search specifically for the top-viewed Lyrics version of a song
async function searchYouTubeLyrics(title: string, artist = '', maxResults = 4) {
  const lyricsQuery = `${artist ? artist + ' - ' : ''}${title} lyrics`.trim();
  const cacheKey = `lyrics__${lyricsQuery}`;
  if (ytCache.has(cacheKey)) {
    return ytCache.get(cacheKey)!;
  }

  try {
    let candidates = await fetchYouTubeVideos(lyricsQuery);
    if (candidates.length === 0 && artist) {
      candidates = await fetchYouTubeVideos(`${title} lyrics`);
    }

    if (candidates.length === 0) {
      const fallback = [
        {
          id: '',
          url: `https://www.youtube.com/results?search_query=${encodeURIComponent(lyricsQuery)}`,
          title: `${title} (Lyrics)`,
          channel: 'YouTube Lyrics',
          duration: '',
          thumbnail: '',
          views: '',
          viewCount: 0,
          isFallback: true,
        },
      ];
      return fallback;
    }

    const titleWords = cleanWords(title);
    const artistWords = cleanWords(artist);

    // Score candidates with heavy preference for lyrics & view count
    const scored = candidates.map((item) => {
      const vTitle = item.title.toLowerCase();
      const vChannel = item.channel.toLowerCase();
      const combined = `${vTitle} ${vChannel}`;

      let matchedTitleWords = 0;
      for (const w of titleWords) {
        if (combined.includes(w)) matchedTitleWords++;
      }
      const titleRatio = titleWords.length > 0 ? matchedTitleWords / titleWords.length : 0.5;

      let matchedArtistWords = 0;
      for (const w of artistWords) {
        if (combined.includes(w)) matchedArtistWords++;
      }
      const artistRatio = artistWords.length > 0 ? matchedArtistWords / artistWords.length : 0.5;

      const views = item.viewCount || 0;
      let lyricsBonus = 0;
      if (combined.includes('lyrics') || combined.includes('lyric') || combined.includes('letra') || combined.includes('letras')) {
        lyricsBonus += 30;
      }

      // Heavy penalty for non-music videos
      if (vTitle.includes('reaction') || vTitle.includes('tutorial') || vTitle.includes('review') || vTitle.includes('interview')) {
        lyricsBonus -= 50;
      }

      return {
        item,
        matchedTitleWords,
        titleRatio,
        artistRatio,
        views,
        // Sort priority: views + lyrics bonus + title match
        rankScore: (views > 0 ? Math.log10(views) * 15 : 0) + lyricsBonus + (titleRatio * 30),
      };
    });

    // Sort by highest view count / rank score
    scored.sort((a, b) => {
      if (a.matchedTitleWords > 0 && b.matchedTitleWords === 0) return -1;
      if (b.matchedTitleWords > 0 && a.matchedTitleWords === 0) return 1;
      return b.rankScore - a.rankScore;
    });

    const finalResults = scored.map((s) => s.item).slice(0, maxResults);
    ytCache.set(cacheKey, finalResults);
    return finalResults;
  } catch (err) {
    console.warn('Error in searchYouTubeLyrics, returning fallback:', err);
    const fallback = [
      {
        id: '',
        url: `https://www.youtube.com/results?search_query=${encodeURIComponent(lyricsQuery)}`,
        title: `${title} (Lyrics)`,
        channel: 'YouTube Lyrics',
        duration: '',
        thumbnail: '',
        views: '',
        viewCount: 0,
        isFallback: true,
      },
    ];
    return fallback;
  }
}

// API Routes
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Endpoint: Extract Spotify playlist or tracks
app.get('/api/spotify/extract', async (req: Request, res: Response) => {
  try {
    const url = req.query.url as string;
    if (!url) {
      return res.status(400).json({ error: 'Debes proporcionar un enlace de Spotify.' });
    }

    const { type, id } = parseSpotifyUrl(url);
    if (!type || !id) {
      return res.status(400).json({
        error: 'El enlace proporcionado no es un enlace válido de Spotify (Playlist, Álbum o Canción).',
      });
    }

    const data = await fetchSpotifyEntity(type, id);
    res.json({ success: true, data });
  } catch (err: any) {
    console.error('Error in /api/spotify/extract:', err);
    res.status(500).json({ error: err.message || 'Error al procesar la playlist de Spotify.' });
  }
});

// Endpoint: Search YouTube specifically for top-viewed Lyrics video
app.get('/api/youtube/lyrics', async (req: Request, res: Response) => {
  try {
    const title = (req.query.title as string) || '';
    const artist = (req.query.artist as string) || '';

    if (!title) {
      return res.status(400).json({ error: 'Parámetro "title" requerido.' });
    }

    const results = await searchYouTubeLyrics(title, artist, 4);
    res.json({ success: true, results, primary: results[0] || null });
  } catch (err: any) {
    console.error('Error in /api/youtube/lyrics:', err);
    // Graceful fallback response instead of 500 error
    const fallback = {
      id: '',
      url: `https://www.youtube.com/results?search_query=${encodeURIComponent(
        `${(req.query.artist as string) || ''} ${(req.query.title as string) || ''} lyrics`
      )}`,
      title: `${(req.query.title as string) || 'Canción'} (Lyrics)`,
      channel: 'YouTube',
      duration: '',
      thumbnail: '',
      views: '',
      isFallback: true,
    };
    res.json({ success: true, results: [fallback], primary: fallback });
  }
});

// Endpoint: Search YouTube for single track
app.get('/api/youtube/search', async (req: Request, res: Response) => {
  try {
    const query = req.query.q as string;
    const title = req.query.title as string | undefined;
    const artist = req.query.artist as string | undefined;

    if (!query) {
      return res.status(400).json({ error: 'Parámetro de búsqueda "q" requerido.' });
    }

    const results = await searchYouTube(query, title, artist, 4);
    res.json({ success: true, results, primary: results[0] });
  } catch (err: any) {
    console.error('Error in /api/youtube/search:', err);
    const fallback = {
      id: '',
      url: `https://www.youtube.com/results?search_query=${encodeURIComponent(
        (req.query.q as string) || ''
      )}`,
      title: (req.query.q as string) || 'Búsqueda en YouTube',
      channel: 'YouTube',
      duration: '',
      thumbnail: '',
      views: '',
      isFallback: true,
    };
    res.json({ success: true, results: [fallback], primary: fallback });
  }
});

// Endpoint: Batch search YouTube for multiple tracks
app.post('/api/youtube/batch', async (req: Request, res: Response) => {
  try {
    const { tracks } = req.body as {
      tracks: Array<{ id: string; title?: string; artist?: string; searchQuery: string }>;
    };
    if (!tracks || !Array.isArray(tracks)) {
      return res.status(400).json({ error: 'Formato inválido. Se espera { tracks: [...] }' });
    }

    // Process in chunks of 4 to prevent rate limiting while remaining fast
    const chunkSize = 4;
    const results: Record<string, { primary: any; alternatives: any[] }> = {};

    for (let i = 0; i < tracks.length; i += chunkSize) {
      const chunk = tracks.slice(i, i + chunkSize);
      await Promise.all(
        chunk.map(async (t) => {
          try {
            const matches = await searchYouTube(t.searchQuery, t.title, t.artist, 4);
            results[t.id] = {
              primary: matches[0] || null,
              alternatives: matches.slice(1),
            };
          } catch (e: any) {
            results[t.id] = {
              primary: {
                id: '',
                url: `https://www.youtube.com/results?search_query=${encodeURIComponent(t.searchQuery)}`,
                title: t.searchQuery,
                channel: 'Búsqueda en YouTube',
                duration: '',
                thumbnail: '',
                views: '',
                viewCount: 0,
                isFallback: true,
              },
              alternatives: [],
            };
          }
        })
      );
    }

    res.json({ success: true, results });
  } catch (err: any) {
    console.error('Error in /api/youtube/batch:', err);
    res.status(500).json({ error: err.message || 'Error en la búsqueda masiva de YouTube.' });
  }
});

// Mount Vite or serve static
async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static('dist'));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve('dist/index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Spot2Tube Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(console.error);
