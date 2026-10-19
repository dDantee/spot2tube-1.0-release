import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Navbar } from './components/Navbar';
import { HeroInput } from './components/HeroInput';
import { ConversionProgress } from './components/ConversionProgress';
import { PlaylistSummary } from './components/PlaylistSummary';
import { TrackCard } from './components/TrackCard';
import { VideoPlayerModal } from './components/VideoPlayerModal';
import { CopyModal } from './components/CopyModal';
import { HistoryDrawer } from './components/HistoryDrawer';
import { Toast } from './components/Toast';
import { SpotifyPlaylistData, ConvertedTrack, YouTubeVideo, SavedConversion, TrackLimit } from './types';
import { generateYouTubeMixUrl } from './utils/export';
import { AlertTriangle, Music, RefreshCw } from 'lucide-react';

const STORAGE_KEY = 'spot2tube_history_v1';

export default function App() {
  const [playlistData, setPlaylistData] = useState<SpotifyPlaylistData | null>(null);
  const [convertedTracks, setConvertedTracks] = useState<ConvertedTrack[]>([]);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Conversion Progress
  const [currentProcessingTrack, setCurrentProcessingTrack] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);
  const [errorCount, setErrorCount] = useState(0);

  // Modals & Drawers
  const [selectedVideo, setSelectedVideo] = useState<YouTubeVideo | null>(null);
  const [isCopyModalOpen, setIsCopyModalOpen] = useState(false);
  const [isHistoryDrawerOpen, setIsHistoryDrawerOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // History
  const [history, setHistory] = useState<SavedConversion[]>([]);
  const abortConversionRef = useRef(false);

  // Load history from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setHistory(JSON.parse(stored));
      }
    } catch {
      // Ignore storage errors
    }
  }, []);

  const saveToHistory = (playlist: SpotifyPlaylistData, tracks: ConvertedTrack[]) => {
    try {
      const validItems = tracks
        .filter((t) => t.youtube?.url && t.youtube?.id)
        .map((t) => ({
          title: t.track.title,
          artist: t.track.artist,
          youtubeUrl: t.youtube!.url,
          youtubeTitle: t.youtube!.title,
          thumbnail: t.youtube!.thumbnail,
          videoId: t.youtube!.id,
        }));

      const newEntry: SavedConversion = {
        id: `${playlist.id}_${Date.now()}`,
        timestamp: Date.now(),
        playlistName: playlist.name,
        playlistType: playlist.type,
        coverUrl: playlist.coverUrl,
        totalTracks: tracks.length,
        youtubeMixUrl: generateYouTubeMixUrl(tracks) || undefined,
        items: validItems,
      };

      const updated = [newEntry, ...history.filter((h) => h.playlistName !== playlist.name)].slice(0, 20);
      setHistory(updated);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error('Error saving history:', e);
    }
  };

  const handleClearHistory = () => {
    setHistory([]);
    localStorage.removeItem(STORAGE_KEY);
    showToast('Historial vaciado');
  };

  const handleDeleteHistoryItem = (id: string) => {
    const updated = history.filter((h) => h.id !== id);
    setHistory(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    showToast('Elemento eliminado del historial');
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
  };

  const handleCopyYouTubeLink = async (url: string, title?: string) => {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      try {
        const textArea = document.createElement('textarea');
        textArea.value = url;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      } catch {
        // ignore
      }
    }
    showToast(`Enlace de YouTube copiado: ${url}`);
  };

  // Process tracks in batch chunks against /api/youtube/batch
  const startConversion = async (playlist: SpotifyPlaylistData) => {
    setIsConverting(true);
    abortConversionRef.current = false;
    setCompletedCount(0);
    setErrorCount(0);
    setCurrentIndex(0);

    const initialTracks: ConvertedTrack[] = playlist.tracks.map((t) => ({
      track: t,
      youtube: null,
      alternatives: [],
      status: 'pending',
    }));
    setConvertedTracks(initialTracks);

    const chunkSize = 4;
    const allTracks = [...playlist.tracks];
    const workingTracks = [...initialTracks];

    for (let i = 0; i < allTracks.length; i += chunkSize) {
      if (abortConversionRef.current) break;

      const chunk = allTracks.slice(i, i + chunkSize);
      setCurrentIndex(i);
      setCurrentProcessingTrack(`${chunk[0].artist} - ${chunk[0].title}`);

      // Mark this chunk as converting
      chunk.forEach((t) => {
        const foundIdx = workingTracks.findIndex((item) => item.track.id === t.id);
        if (foundIdx !== -1) {
          workingTracks[foundIdx] = { ...workingTracks[foundIdx], status: 'converting' };
        }
      });
      setConvertedTracks([...workingTracks]);

      try {
        const res = await fetch('/api/youtube/batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tracks: chunk.map((t) => ({
              id: t.id,
              title: t.title,
              artist: t.artist,
              searchQuery: t.searchQuery,
            })),
          }),
        });

        if (!res.ok) {
          throw new Error(`Error en servidor (${res.status})`);
        }

        const data = await res.json();
        const batchResults = data.results || {};

        chunk.forEach((t) => {
          const matchData = batchResults[t.id];
          const foundIdx = workingTracks.findIndex((item) => item.track.id === t.id);
          if (foundIdx !== -1) {
            if (matchData && matchData.primary) {
              workingTracks[foundIdx] = {
                ...workingTracks[foundIdx],
                status: 'completed',
                youtube: matchData.primary,
                alternatives: matchData.alternatives || [],
              };
              setCompletedCount((prev) => prev + 1);
            } else {
              workingTracks[foundIdx] = {
                ...workingTracks[foundIdx],
                status: 'error',
                error: 'No se encontró video en YouTube',
              };
              setErrorCount((prev) => prev + 1);
            }
          }
        });
      } catch (err) {
        console.error('Error converting chunk:', err);
        chunk.forEach((t) => {
          const foundIdx = workingTracks.findIndex((item) => item.track.id === t.id);
          if (foundIdx !== -1) {
            workingTracks[foundIdx] = {
              ...workingTracks[foundIdx],
              status: 'completed',
              youtube: {
                id: '',
                url: `https://www.youtube.com/results?search_query=${encodeURIComponent(t.searchQuery)}`,
                title: t.searchQuery,
                channel: 'Búsqueda en YouTube',
                duration: '',
                thumbnail: '',
                views: '',
                isFallback: true,
              },
              alternatives: [],
            };
            setCompletedCount((prev) => prev + 1);
          }
        });
      }

      setConvertedTracks([...workingTracks]);
    }

    setIsConverting(false);
    setCurrentProcessingTrack('');
    saveToHistory(playlist, workingTracks);
    showToast(`¡Conversión completada! Mix listo para abrir en YouTube.`);
  };

  // Convert Spotify URL with chosen limit
  const handleConvertUrl = async (url: string, limit: TrackLimit = 'all') => {
    setErrorMessage(null);
    setIsExtracting(true);
    setPlaylistData(null);
    setConvertedTracks([]);
    setSearchTerm('');

    try {
      const res = await fetch(`/api/spotify/extract?url=${encodeURIComponent(url)}`);
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'No se pudo leer la información de la playlist.');
      }

      const playlist: SpotifyPlaylistData = data.data;
      if (!playlist.tracks || playlist.tracks.length === 0) {
        throw new Error('Esta playlist no contiene canciones públicas accesibles.');
      }

      const allTracks = playlist.tracks;
      const targetTracks = typeof limit === 'number' ? allTracks.slice(0, limit) : allTracks;

      const preparedPlaylist: SpotifyPlaylistData = {
        ...playlist,
        allTracks: allTracks,
        selectedLimit: limit,
        tracks: targetTracks,
        totalTracks: targetTracks.length,
      };

      setPlaylistData(preparedPlaylist);
      setIsExtracting(false);

      // Start converting tracks to YouTube
      await startConversion(preparedPlaylist);
    } catch (err: any) {
      console.error('Error fetching playlist:', err);
      setErrorMessage(err.message || 'Error al conectar con Spotify.');
      setIsExtracting(false);
    }
  };


  // Expand limit from existing loaded tracks
  const handleExpandLimit = async (newLimit: TrackLimit) => {
    if (!playlistData || !playlistData.allTracks) return;

    const currentCount = convertedTracks.length;
    const allTracks = playlistData.allTracks;
    const targetCount = newLimit === 'all' ? allTracks.length : Math.min(newLimit, allTracks.length);

    if (targetCount <= currentCount) return;

    const additionalTracks = allTracks.slice(currentCount, targetCount);
    const newConvertedPlaceholders: ConvertedTrack[] = additionalTracks.map((t) => ({
      track: t,
      youtube: null,
      alternatives: [],
      status: 'pending',
    }));

    const updatedTracks = [...convertedTracks, ...newConvertedPlaceholders];
    setConvertedTracks(updatedTracks);

    const updatedPlaylist: SpotifyPlaylistData = {
      ...playlistData,
      selectedLimit: newLimit,
      tracks: allTracks.slice(0, targetCount),
      totalTracks: targetCount,
    };
    setPlaylistData(updatedPlaylist);

    setIsConverting(true);
    abortConversionRef.current = false;
    showToast(`Buscando las siguientes ${additionalTracks.length} canciones...`);

    const chunkSize = 4;
    for (let i = 0; i < additionalTracks.length; i += chunkSize) {
      if (abortConversionRef.current) break;

      const chunk = additionalTracks.slice(i, i + chunkSize);
      setCurrentIndex(currentCount + i);
      setCurrentProcessingTrack(`${chunk[0].artist} - ${chunk[0].title}`);

      try {
        const res = await fetch('/api/youtube/batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tracks: chunk.map((t) => ({
              id: t.id,
              title: t.title,
              artist: t.artist,
              searchQuery: t.searchQuery,
            })),
          }),
        });

        if (res.ok) {
          const data = await res.json();
          const batchResults = data.results || {};

          chunk.forEach((t) => {
            const matchData = batchResults[t.id];
            const foundIdx = updatedTracks.findIndex((item) => item.track.id === t.id);
            if (foundIdx !== -1) {
              if (matchData && matchData.primary) {
                updatedTracks[foundIdx] = {
                  ...updatedTracks[foundIdx],
                  status: 'completed',
                  youtube: matchData.primary,
                  alternatives: matchData.alternatives || [],
                };
              }
            }
          });
        }
      } catch (err) {
        console.error('Error fetching additional chunk:', err);
      }

      setConvertedTracks([...updatedTracks]);
    }

    setIsConverting(false);
    setCurrentProcessingTrack('');
    saveToHistory(updatedPlaylist, updatedTracks);
    showToast('¡Nuevas canciones agregadas y convertidas!');
  };

  const handleCancelConversion = () => {
    abortConversionRef.current = true;
    setIsConverting(false);
    showToast('Conversión pausada');
  };

  // User chooses an alternative YouTube video for a track
  const handleSelectAlternative = (trackId: string, video: YouTubeVideo) => {
    setConvertedTracks((prev) =>
      prev.map((item) => {
        if (item.track.id === trackId) {
          const currentPrimary = item.youtube;
          const newAlternatives = item.alternatives
            .filter((a) => a.id !== video.id)
            .concat(currentPrimary ? [currentPrimary] : []);
          return {
            ...item,
            youtube: video,
            alternatives: newAlternatives,
          };
        }
        return item;
      })
    );
    showToast(`Versión cambiada a: ${video.title.slice(0, 30)}...`);
  };

  // Switch a track to its top-viewed Lyrics version
  const handleSwitchToLyrics = async (trackId: string, title: string, artist: string) => {
    if (isConverting) {
      showToast('Espera a que finalice el procesamiento de canciones.');
      return;
    }

    try {
      showToast(`Buscando versión Lyrics con más visitas para "${title}"...`);
      const res = await fetch(
        `/api/youtube/lyrics?title=${encodeURIComponent(title)}&artist=${encodeURIComponent(artist)}`
      );
      const data = await res.json();

      if (data.success && data.primary) {
        setConvertedTracks((prev) =>
          prev.map((item) => {
            if (item.track.id === trackId) {
              return {
                ...item,
                status: 'completed',
                youtube: data.primary,
                alternatives: data.results?.slice(1) || [],
              };
            }
            return item;
          })
        );

        if (selectedVideo) {
          setSelectedVideo(data.primary);
        }

        showToast(`¡Cambiado a versión Lyrics con ${data.primary.views || 'más'} visitas!`);
      } else {
        showToast('No se encontró versión Lyrics alternativa');
      }
    } catch (err) {
      console.error('Error switching to lyrics:', err);
      showToast('Error al buscar versión Lyrics');
    }
  };

  const handleSelectHistoryItem = (item: SavedConversion) => {
    const pseudoPlaylist: SpotifyPlaylistData = {
      id: item.id,
      type: item.playlistType,
      name: item.playlistName,
      description: 'Cargada desde el historial local',
      owner: 'Historial',
      coverUrl: item.coverUrl,
      totalTracks: item.items.length,
      tracks: item.items.map((it, idx) => ({
        id: `hist_${idx}`,
        title: it.title,
        artist: it.artist,
        searchQuery: `${it.artist} - ${it.title} official`,
      })),
    };

    const pseudoConverted: ConvertedTrack[] = item.items.map((it, idx) => ({
      track: {
        id: `hist_${idx}`,
        title: it.title,
        artist: it.artist,
        searchQuery: `${it.artist} - ${it.title} official`,
      },
      youtube: {
        id: it.videoId,
        url: it.youtubeUrl,
        title: it.youtubeTitle,
        channel: 'YouTube',
        duration: '',
        thumbnail: it.thumbnail,
        views: '',
      },
      alternatives: [],
      status: 'completed',
    }));

    setPlaylistData(pseudoPlaylist);
    setConvertedTracks(pseudoConverted);
    showToast(`Cargada playlist "${item.playlistName}"`);
  };

  const handleReset = () => {
    setPlaylistData(null);
    setConvertedTracks([]);
    setErrorMessage(null);
    setSearchTerm('');
  };

  // Filtered tracks based on search term
  const filteredTracks = useMemo(() => {
    if (!searchTerm.trim()) return convertedTracks;
    const q = searchTerm.toLowerCase();
    return convertedTracks.filter(
      (item) =>
        item.track.title.toLowerCase().includes(q) ||
        item.track.artist.toLowerCase().includes(q) ||
        (item.youtube?.title && item.youtube.title.toLowerCase().includes(q))
    );
  }, [convertedTracks, searchTerm]);

  return (
    <div className="min-h-screen bg-[#090a0f] text-zinc-100 flex flex-col font-['Plus_Jakarta_Sans',sans-serif] selection:bg-emerald-500 selection:text-black">
      {/* Navbar */}
      <Navbar
        historyCount={history.length}
        onOpenHistory={() => setIsHistoryDrawerOpen(true)}
        onReset={handleReset}
      />

      {/* Main Content Area */}
      <main className="flex-1 pb-16">
        {/* Error Notification */}
        {errorMessage && (
          <div className="w-full max-w-3xl mx-auto px-4 mt-6">
            <div className="flex items-center gap-3 p-4 rounded-2xl bg-red-950/40 border border-red-800/60 text-red-300">
              <AlertTriangle className="w-5 h-5 shrink-0 text-red-400" />
              <div className="flex-1 text-sm">{errorMessage}</div>
              <button
                onClick={() => setErrorMessage(null)}
                className="text-red-400 hover:text-white text-xs font-semibold px-2 py-1 cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        )}

        {/* Hero & Input Section (Always available at top or when no playlist) */}
        {!playlistData && (
          <HeroInput
            onConvertUrl={handleConvertUrl}
            isLoading={isExtracting}
          />
        )}

        {/* When Playlist Loaded */}
        {playlistData && (
          <div className="pt-6 animate-in fade-in duration-300">
            {/* Top Bar with "Convertir otra playlist" */}
            <div className="max-w-5xl mx-auto px-4 mb-4 flex items-center justify-between">
              <button
                onClick={handleReset}
                className="flex items-center gap-2 text-xs font-semibold text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                <span>← Convertir otra playlist o cambiar límite</span>
              </button>
              {isConverting && (
                <span className="text-xs text-amber-400 font-semibold flex items-center gap-1.5 animate-pulse">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Convirtiendo en segundo plano...
                </span>
              )}
            </div>

            {/* Playlist Summary Banner & Bulk Tools */}
            <PlaylistSummary
              playlist={playlistData}
              tracks={convertedTracks}
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              onOpenCopyModal={() => setIsCopyModalOpen(true)}
              onShowToast={showToast}
              onExpandLimit={handleExpandLimit}
              isConverting={isConverting}
            />

            {/* Conversion Progress Bar */}
            {isConverting && (
              <ConversionProgress
                currentTrack={currentProcessingTrack}
                currentIndex={currentIndex}
                totalTracks={playlistData.tracks.length}
                completedCount={completedCount}
                errorCount={errorCount}
                onCancel={handleCancelConversion}
              />
            )}

            {/* Track List */}
            <div className="w-full max-w-5xl mx-auto px-4">
              <div className="flex items-center justify-between mb-3 text-xs text-zinc-400 font-semibold uppercase tracking-wider px-2">
                <span>Canción de Spotify</span>
                <span>Video de YouTube</span>
              </div>

              {filteredTracks.length === 0 ? (
                <div className="p-12 text-center rounded-2xl bg-zinc-900/40 border border-zinc-800 text-zinc-500">
                  <Music className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No se encontraron canciones que coincidan con &quot;{searchTerm}&quot;</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {filteredTracks.map((item, index) => (
                    <TrackCard
                      key={item.track.id}
                      item={item}
                      index={index}
                      onSelectVideo={(v) => setSelectedVideo(v)}
                      onSelectAlternative={handleSelectAlternative}
                      onCopyLink={handleCopyYouTubeLink}
                      onSwitchToLyrics={handleSwitchToLyrics}
                      isConverting={isConverting}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Video Player Modal */}
      <VideoPlayerModal
        video={selectedVideo}
        trackTitle={selectedVideo ? convertedTracks.find((it) => it.youtube?.id === selectedVideo.id)?.track.title : undefined}
        trackArtist={selectedVideo ? convertedTracks.find((it) => it.youtube?.id === selectedVideo.id)?.track.artist : undefined}
        onClose={() => setSelectedVideo(null)}
        onCopy={handleCopyYouTubeLink}
        onSwitchToLyrics={async (title, artist) => {
          if (isConverting) return;
          const matched = convertedTracks.find((it) => it.youtube?.id === selectedVideo?.id || it.track.title.toLowerCase() === title.toLowerCase());
          if (matched) {
            await handleSwitchToLyrics(matched.track.id, title, artist);
          }
        }}
        isConverting={isConverting}
      />

      {/* Bulk Copy Modal */}
      {isCopyModalOpen && playlistData && (
        <CopyModal
          tracks={convertedTracks}
          playlistName={playlistData.name}
          onClose={() => setIsCopyModalOpen(false)}
          onShowToast={showToast}
        />
      )}

      {/* History Drawer */}
      <HistoryDrawer
        isOpen={isHistoryDrawerOpen}
        history={history}
        onClose={() => setIsHistoryDrawerOpen(false)}
        onSelect={handleSelectHistoryItem}
        onClear={handleClearHistory}
        onDeleteItem={handleDeleteHistoryItem}
      />

      {/* Toast Alert */}
      <Toast message={toastMessage} onClose={() => setToastMessage(null)} />
    </div>
  );
}
