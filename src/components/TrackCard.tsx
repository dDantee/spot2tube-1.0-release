import React, { useState, useRef, useEffect } from 'react';
import {
  ExternalLink,
  Copy,
  Check,
  Play,
  Pause,
  Tv,
  ChevronDown,
  Youtube,
  AlertCircle,
  Loader2,
  Radio,
  Sparkles,
  Music,
} from 'lucide-react';
import { ConvertedTrack, YouTubeVideo } from '../types';

interface TrackCardProps {
  item: ConvertedTrack;
  index: number;
  onSelectVideo: (video: YouTubeVideo) => void;
  onSelectAlternative: (trackId: string, video: YouTubeVideo) => void;
  onCopyLink: (url: string, title: string) => void;
  onSwitchToLyrics?: (trackId: string, title: string, artist: string) => void;
  isConverting?: boolean;
}

export const TrackCard: React.FC<TrackCardProps> = ({
  item,
  index,
  onSelectVideo,
  onSelectAlternative,
  onCopyLink,
  onSwitchToLyrics,
  isConverting = false,
}) => {
  const [copied, setCopied] = useState(false);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const [showAlternatives, setShowAlternatives] = useState(false);
  const [hasImageError, setHasImageError] = useState(false);
  const [isAutoSwitching, setIsAutoSwitching] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const { track, youtube, alternatives, status } = item;

  // Automatically switch to lyrics version if image failed or thumbnail is missing, ONLY when not processing
  useEffect(() => {
    if (
      status === 'completed' &&
      !isConverting &&
      (hasImageError || !youtube?.thumbnail || youtube?.isFallback) &&
      !isAutoSwitching &&
      onSwitchToLyrics
    ) {
      setIsAutoSwitching(true);
      onSwitchToLyrics(track.id, track.title, track.artist);
    }
  }, [status, isConverting, hasImageError, youtube?.thumbnail, youtube?.isFallback]);

  const handleCopy = async () => {
    if (youtube?.url) {
      try {
        await navigator.clipboard.writeText(youtube.url);
      } catch {
        const textArea = document.createElement('textarea');
        textArea.value = youtube.url;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopied(true);
      onCopyLink(youtube.url, `${track.artist} - ${track.title}`);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const toggleAudioPreview = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!track.previewUrl) return;

    if (!audioRef.current) {
      audioRef.current = new Audio(track.previewUrl);
      audioRef.current.onended = () => setIsPlayingPreview(false);
    }

    if (isPlayingPreview) {
      audioRef.current.pause();
      setIsPlayingPreview(false);
    } else {
      audioRef.current.play().then(() => setIsPlayingPreview(true)).catch(console.error);
    }
  };

  return (
    <div className="group relative bg-zinc-900/60 hover:bg-zinc-900/95 border border-zinc-800/80 hover:border-zinc-700/80 rounded-2xl p-3.5 sm:p-4 transition-all duration-200">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3.5 sm:gap-4">
        {/* Left: Index + YouTube Thumbnail + Song Information */}
        <div className="flex items-center gap-3 sm:gap-3.5 flex-1 min-w-0">
          {/* Index Number */}
          <span className="font-mono text-xs font-bold text-zinc-500 w-5 sm:w-6 text-right shrink-0">
            {(index + 1).toString().padStart(2, '0')}
          </span>

          {/* YouTube Video Thumbnail */}
          <div className="shrink-0">
            {status === 'completed' && youtube?.thumbnail && !hasImageError ? (
              <div
                onClick={() => onSelectVideo(youtube)}
                className="relative w-24 sm:w-32 aspect-video rounded-xl overflow-hidden bg-zinc-950 border border-zinc-800 hover:border-red-500/50 cursor-pointer group/thumb shadow-sm transition-all"
                title="Haz clic para ver el video"
              >
                <img
                  src={youtube.thumbnail}
                  alt={youtube.title}
                  onError={() => {
                    setHasImageError(true);
                  }}
                  className="w-full h-full object-cover group-hover/thumb:scale-105 transition-transform duration-300"
                />
                {/* Play icon overlay on hover */}
                <div className="absolute inset-0 bg-black/30 group-hover/thumb:bg-black/50 flex items-center justify-center transition-colors">
                  <div className="w-7 h-7 rounded-full bg-red-600/90 text-white flex items-center justify-center shadow-lg group-hover/thumb:scale-110 transition-transform">
                    <Play className="w-3.5 h-3.5 fill-white text-transparent ml-0.5" />
                  </div>
                </div>
                {/* Duration badge */}
                {(youtube.duration || track.durationFormatted) && (
                  <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/80 backdrop-blur text-[10px] font-mono font-medium text-white">
                    {youtube.duration || track.durationFormatted}
                  </div>
                )}
              </div>
            ) : isAutoSwitching || (status === 'completed' && (hasImageError || !youtube?.thumbnail)) ? (
              <div
                className="w-24 sm:w-32 aspect-video rounded-xl bg-zinc-950 border border-emerald-500/40 p-1 flex flex-col items-center justify-center text-center animate-pulse"
                title="Cambiando automáticamente a versión Lyrics con más visitas"
              >
                <Loader2 className="w-4 h-4 text-emerald-400 animate-spin mb-0.5" />
                <span className="text-[9px] text-emerald-300 font-semibold leading-tight">Auto Lyrics</span>
              </div>
            ) : status === 'converting' ? (
              <div className="w-24 sm:w-32 aspect-video rounded-xl bg-zinc-950 border border-zinc-800 flex flex-col items-center justify-center text-zinc-500 animate-pulse">
                <Loader2 className="w-5 h-5 text-red-500 animate-spin mb-1" />
                <span className="text-[10px] text-zinc-400">Buscando...</span>
              </div>
            ) : status === 'error' ? (
              <div className="w-24 sm:w-32 aspect-video rounded-xl bg-zinc-950 border border-amber-900/40 flex flex-col items-center justify-center text-amber-500 p-1 text-center">
                <AlertCircle className="w-4 h-4 mb-0.5" />
                <span className="text-[9px]">Sin video</span>
              </div>
            ) : (
              <div className="w-24 sm:w-32 aspect-video rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-center text-zinc-600">
                <Youtube className="w-5 h-5 opacity-40" />
              </div>
            )}
          </div>

          {/* Titles & Info */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-bold text-white text-sm sm:text-base truncate group-hover:text-emerald-400 transition-colors">
                {track.title}
              </h4>

              {/* 30s Audio preview pill if available */}
              {track.previewUrl && (
                <button
                  type="button"
                  onClick={toggleAudioPreview}
                  className="inline-flex items-center gap-1 text-[10px] uppercase font-bold text-emerald-400 bg-emerald-950/60 hover:bg-emerald-900/60 border border-emerald-800/40 px-2 py-0.5 rounded-full transition-colors cursor-pointer"
                  title={isPlayingPreview ? 'Pausar audio' : 'Escuchar muestra de 30s'}
                >
                  {isPlayingPreview ? (
                    <>
                      <Pause className="w-2.5 h-2.5 fill-emerald-400" />
                      <span>Pausar</span>
                    </>
                  ) : (
                    <>
                      <Radio className="w-2.5 h-2.5 animate-pulse" />
                      <span>Muestra 30s</span>
                    </>
                  )}
                </button>
              )}
            </div>

            <p className="text-xs text-zinc-300 font-medium truncate mt-0.5">
              {track.artist}
            </p>

            {/* YouTube video info subtitle */}
            {status === 'completed' && youtube && (
              <div className="flex items-center gap-2 text-[11px] text-zinc-400 mt-1 truncate">
                <span className="flex items-center gap-1 text-red-400 font-semibold shrink-0">
                  <Youtube className="w-3 h-3" />
                  <span>YouTube:</span>
                </span>
                <span className="truncate text-zinc-300">{youtube.channel || youtube.title}</span>
                {youtube.views && (
                  <>
                    <span className="text-zinc-600">•</span>
                    <span className="text-zinc-400 shrink-0">{youtube.views}</span>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center justify-end gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-zinc-800/60 shrink-0">
          {status === 'completed' && youtube ? (
            <>
              {/* Play in Modal button */}
              <button
                type="button"
                onClick={() => onSelectVideo(youtube)}
                title="Reproducir video aquí"
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold border border-zinc-700 transition-colors cursor-pointer"
              >
                <Tv className="w-3.5 h-3.5 text-red-500" />
                <span className="hidden md:inline">Ver Video</span>
              </button>

              {/* Direct Link to YouTube */}
              <a
                href={youtube.url}
                target="_blank"
                rel="noopener noreferrer"
                title="Abrir directamente en YouTube"
                className="p-2 rounded-xl bg-red-600/10 hover:bg-red-600/20 text-red-400 hover:text-red-300 border border-red-500/20 transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
              </a>

              {/* Copy Direct YouTube Link */}
              <button
                type="button"
                onClick={handleCopy}
                title="Copiar enlace de YouTube"
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  copied
                    ? 'bg-emerald-500 text-black shadow-md shadow-emerald-500/30'
                    : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white border border-zinc-700'
                }`}
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                    <span>¡Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Copiar Enlace</span>
                  </>
                )}
              </button>

              {/* Alternatives dropdown toggle */}
              {alternatives && alternatives.length > 0 && (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowAlternatives(!showAlternatives)}
                    title="Elegir otra versión de video"
                    className="p-2 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-white border border-zinc-700/60 transition-colors cursor-pointer"
                  >
                    <ChevronDown
                      className={`w-4 h-4 transition-transform ${showAlternatives ? 'rotate-180' : ''}`}
                    />
                  </button>

                  {showAlternatives && (
                    <>
                      <div
                        className="fixed inset-0 z-20"
                        onClick={() => setShowAlternatives(false)}
                      />
                      <div className="absolute right-0 mt-2 w-72 rounded-xl bg-zinc-900 border border-zinc-700 shadow-2xl p-2 z-30 divide-y divide-zinc-800">
                        <div className="px-2 py-1 flex items-center justify-between text-[11px] uppercase font-bold tracking-wider text-zinc-400">
                          <span>Versiones alternativas</span>
                        </div>
                        {onSwitchToLyrics && (
                          <div className="py-1">
                            <button
                              type="button"
                              disabled={isConverting}
                              onClick={() => {
                                if (isConverting) return;
                                onSwitchToLyrics(track.id, track.title, track.artist);
                                setShowAlternatives(false);
                              }}
                              className={`w-full text-left p-2 rounded-lg flex items-center gap-2 text-xs font-semibold transition-colors border border-emerald-800/40 ${
                                isConverting
                                  ? 'bg-zinc-800/50 text-zinc-500 cursor-not-allowed border-zinc-800'
                                  : 'bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-300 cursor-pointer'
                              }`}
                              title={
                                isConverting
                                  ? 'Espera a que termine el procesamiento de la lista'
                                  : 'Buscar versión Lyrics con más visitas'
                              }
                            >
                              <Sparkles className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                              <span>
                                {isConverting
                                  ? 'Procesando lista... (espera)'
                                  : 'Forzar versión Lyrics (más visitas)'}
                              </span>
                            </button>
                          </div>
                        )}
                        <div className="pt-1.5 space-y-1">
                          {alternatives.map((alt) => (
                            <button
                              key={alt.id}
                              type="button"
                              onClick={() => {
                                onSelectAlternative(track.id, alt);
                                setShowAlternatives(false);
                              }}
                              className="w-full text-left p-2 rounded-lg hover:bg-zinc-800 flex items-center gap-2.5 transition-colors cursor-pointer"
                            >
                              {alt.thumbnail && (
                                <img
                                  src={alt.thumbnail}
                                  alt={alt.title}
                                  className="w-10 h-7 rounded object-cover shrink-0"
                                />
                              )}
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-medium text-white truncate">{alt.title}</p>
                                <p className="text-[10px] text-zinc-400 truncate">
                                  {alt.channel} {alt.duration ? `• ${alt.duration}` : ''}
                                </p>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
            </>
          ) : status === 'converting' ? (
            <div className="flex items-center gap-2 text-xs text-zinc-400 py-1">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-red-500" />
              <span>Buscando video...</span>
            </div>
          ) : status === 'error' ? (
            <span className="text-xs text-amber-400 font-medium">Video no disponible</span>
          ) : (
            <span className="text-xs text-zinc-500">En espera</span>
          )}
        </div>
      </div>
    </div>
  );
};
