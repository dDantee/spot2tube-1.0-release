import React, { useState, useEffect } from 'react';
import { X, ExternalLink, Music, Youtube, Share2, Sparkles, Loader2, AlertCircle } from 'lucide-react';
import { YouTubeVideo } from '../types';

interface VideoPlayerModalProps {
  video: YouTubeVideo | null;
  trackTitle?: string;
  trackArtist?: string;
  onClose: () => void;
  onCopy: (url: string, title: string) => void;
  onSwitchToLyrics?: (title: string, artist: string) => Promise<void> | void;
  isConverting?: boolean;
}

export const VideoPlayerModal: React.FC<VideoPlayerModalProps> = ({
  video,
  trackTitle,
  trackArtist,
  onClose,
  onCopy,
  onSwitchToLyrics,
  isConverting = false,
}) => {
  const [embedError, setEmbedError] = useState(false);
  const [isSearchingLyrics, setIsSearchingLyrics] = useState(false);

  // Auto-switch to lyrics if embedding is restricted or if the video is missing/fallback
  useEffect(() => {
    setEmbedError(false);
    setIsSearchingLyrics(false);

    // If the video itself has no ID or is a fallback search link, auto-switch to lyrics immediately
    if ((!video?.id || video.isFallback) && !isConverting && onSwitchToLyrics) {
      handleAutoLyrics();
    }

    // Listen to YouTube player API error messages
    const handleMessage = (e: MessageEvent) => {
      try {
        const data = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
        // YouTube error 150 or 101 means embedding is restricted by video owner
        if (
          data?.event === 'onError' &&
          (data.info === 150 || data.info === 101 || data.info === 100 || data.info === 2)
        ) {
          setEmbedError(true);
          if (onSwitchToLyrics && !isConverting && !isSearchingLyrics) {
            handleAutoLyrics();
          }
        }
      } catch {
        // ignore non-json messages
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [video?.id, video?.isFallback, isConverting]);

  const handleAutoLyrics = async () => {
    if (!onSwitchToLyrics || isSearchingLyrics || isConverting) return;
    setIsSearchingLyrics(true);
    try {
      await onSwitchToLyrics(trackTitle || video?.title || '', trackArtist || '');
      setEmbedError(false);
    } catch {
      // ignore
    } finally {
      setIsSearchingLyrics(false);
    }
  };

  if (!video) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-3xl bg-zinc-950 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 px-6 border-b border-zinc-800 bg-zinc-900/60">
          <div className="flex items-center gap-2 min-w-0">
            <Youtube className="w-5 h-5 text-red-500 shrink-0" />
            <h3 className="font-bold text-white text-sm sm:text-base truncate max-w-md">
              {video.title}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Video Embed or Fallback Notice */}
        <div className="relative aspect-video w-full bg-black flex items-center justify-center">
          {video.id && !embedError && !video.isFallback ? (
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${video.id}?autoplay=1&enablejsapi=1&rel=0`}
              title={video.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="absolute inset-0 w-full h-full border-0"
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-zinc-300 p-6 text-center max-w-md mx-auto">
              {isSearchingLyrics ? (
                <>
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mb-3 animate-spin">
                    <Loader2 className="w-6 h-6" />
                  </div>
                  <p className="font-bold text-white text-sm sm:text-base mb-1">
                    Cambiando automáticamente a versión Lyrics...
                  </p>
                  <p className="text-xs text-zinc-400">
                    Buscando la opción con más visitas que sí permite reproducción embebida.
                  </p>
                </>
              ) : isConverting ? (
                <>
                  <div className="w-12 h-12 rounded-2xl bg-zinc-800 border border-zinc-700 text-zinc-400 flex items-center justify-center mb-3">
                    <Loader2 className="w-6 h-6 animate-spin" />
                  </div>
                  <p className="font-semibold text-white text-sm mb-1">
                    Procesando la lista de reproducción...
                  </p>
                  <p className="text-xs text-zinc-400">
                    La versión Lyrics se buscará automáticamente en cuanto finalice el proceso actual.
                  </p>
                </>
              ) : (
                <>
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mb-3">
                    <AlertCircle className="w-6 h-6" />
                  </div>
                  <p className="font-semibold text-white text-sm sm:text-base mb-1">
                    Este video no se puede previsualizar en el reproductor embebido
                  </p>
                  <p className="text-xs text-zinc-400 mb-4">
                    Restricción de reproducción externa detectada. Reemplazando automáticamente por la versión Lyrics con más visitas...
                  </p>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleAutoLyrics}
                      disabled={isConverting || isSearchingLyrics}
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-[#1DB954] text-black font-bold text-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Buscar versión Lyrics ahora</span>
                    </button>
                    <a
                      href={video.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 rounded-xl bg-zinc-800 text-white font-semibold text-xs flex items-center gap-2"
                    >
                      <span>Abrir en YouTube</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer info & direct links */}
        <div className="p-4 px-6 bg-zinc-900/90 border-t border-zinc-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="text-xs text-zinc-400 flex items-center gap-2">
              <span className="font-semibold text-zinc-200 truncate">{video.channel}</span>
              {video.duration && <span>• {video.duration}</span>}
              {video.views && <span>• {video.views}</span>}
            </div>
            <p className="text-xs font-mono text-zinc-500 truncate max-w-sm sm:max-w-md mt-1">
              {video.url}
            </p>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center flex-wrap">
            {/* Lyrics switch button (disabled during conversion) */}
            {onSwitchToLyrics && (
              <button
                type="button"
                onClick={handleAutoLyrics}
                disabled={isConverting || isSearchingLyrics}
                title={
                  isConverting
                    ? 'No se puede cambiar mientras el programa sigue procesando canciones'
                    : 'Buscar versión Lyrics con más visitas'
                }
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                  isConverting || isSearchingLyrics
                    ? 'bg-zinc-800/40 text-zinc-500 border-zinc-800 cursor-not-allowed'
                    : 'bg-emerald-950/40 hover:bg-emerald-900/40 text-emerald-300 border-emerald-800/40 cursor-pointer'
                }`}
              >
                {isSearchingLyrics ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                )}
                <span>
                  {isConverting ? 'Procesando lista...' : 'Versión Lyrics'}
                </span>
              </button>
            )}

            {/* Copy direct YouTube link */}
            <button
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(video.url);
                } catch {
                  const textArea = document.createElement('textarea');
                  textArea.value = video.url;
                  document.body.appendChild(textArea);
                  textArea.select();
                  document.execCommand('copy');
                  document.body.removeChild(textArea);
                }
                onCopy(video.url, video.title);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold border border-zinc-700 transition-colors cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Copiar Enlace</span>
            </button>

            {/* Open in YouTube */}
            <a
              href={video.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-lg shadow-red-600/30 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>YouTube</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
