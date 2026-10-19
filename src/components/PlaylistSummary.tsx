import React, { useState } from 'react';
import {
  ExternalLink,
  Copy,
  Search,
  Music,
  PlaySquare,
  ChevronDown,
  Plus,
} from 'lucide-react';
import { SpotifyPlaylistData, ConvertedTrack, TrackLimit } from '../types';
import { generateYouTubeMixUrl } from '../utils/export';

interface PlaylistSummaryProps {
  playlist: SpotifyPlaylistData;
  tracks: ConvertedTrack[];
  searchTerm: string;
  onSearchChange: (val: string) => void;
  onOpenCopyModal: () => void;
  onShowToast: (msg: string) => void;
  onExpandLimit?: (newLimit: TrackLimit) => void;
  isConverting?: boolean;
}

export const PlaylistSummary: React.FC<PlaylistSummaryProps> = ({
  playlist,
  tracks,
  searchTerm,
  onSearchChange,
  onOpenCopyModal,
  onShowToast,
  onExpandLimit,
  isConverting,
}) => {
  const [showExpandMenu, setShowExpandMenu] = useState(false);

  const completedTracks = tracks.filter((t) => t.status === 'completed' && t.youtube?.id);
  const mixUrl = generateYouTubeMixUrl(tracks);

  const totalAvailable = playlist.allTracks?.length || playlist.totalTracks;
  const currentLoaded = tracks.length;
  const hasMoreTracks = totalAvailable > currentLoaded;

  const handleOpenMix = () => {
    if (mixUrl) {
      window.open(mixUrl, '_blank', 'noopener,noreferrer');
      onShowToast('¡Abriendo Mix instantáneo en YouTube!');
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 mb-6">
      <div className="p-6 rounded-3xl bg-zinc-900/90 border border-zinc-800/80 shadow-2xl backdrop-blur-lg">
        {/* Top Info Section */}
        <div className="flex flex-col md:flex-row items-start md:items-center gap-6 pb-6 border-b border-zinc-800/80">
          {/* Cover Art */}
          <div className="relative w-24 h-24 sm:w-32 sm:h-32 rounded-2xl overflow-hidden bg-zinc-800 shadow-xl shrink-0 group border border-zinc-700/50">
            {playlist.coverUrl ? (
              <img
                src={playlist.coverUrl}
                alt={playlist.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-tr from-[#1DB954]/20 to-red-500/20">
                <Music className="w-12 h-12 text-zinc-500" />
              </div>
            )}
            <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/70 backdrop-blur text-[10px] uppercase font-bold text-emerald-400 border border-white/10">
              {playlist.type}
            </div>
          </div>

          {/* Details */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="text-xs uppercase tracking-widest font-bold text-emerald-400">
                Spotify a YouTube
              </span>
              <span className="text-zinc-600">•</span>
              <span className="text-xs text-zinc-400">{playlist.owner || 'Curador oficial'}</span>
              {playlist.selectedLimit && (
                <>
                  <span className="text-zinc-600">•</span>
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-emerald-950/60 border border-emerald-800/40 text-emerald-300">
                    {playlist.selectedLimit === 'all'
                      ? 'Límite: Toda la Playlist'
                      : `Límite: ${playlist.selectedLimit} canciones`}
                  </span>
                </>
              )}
            </div>

            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-tight mb-2 truncate">
              {playlist.name}
            </h2>

            {playlist.description && (
              <p className="text-sm text-zinc-400 line-clamp-2 mb-3 font-normal">
                {playlist.description}
              </p>
            )}

            <div className="flex items-center gap-3 text-xs sm:text-sm text-zinc-300 font-medium flex-wrap">
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-800/80 border border-zinc-700/60">
                <Music className="w-3.5 h-3.5 text-emerald-400" />
                <span>
                  {hasMoreTracks ? `${currentLoaded} de ${totalAvailable} canciones` : `${tracks.length} canciones`}
                </span>
              </span>
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-950/40 text-red-300 border border-red-900/40">
                <PlaySquare className="w-3.5 h-3.5 text-red-400" />
                <span>{completedTracks.length} videos enlazados</span>
              </span>

              {/* Expand Limit Button (if there are more songs in Spotify) */}
              {hasMoreTracks && onExpandLimit && !isConverting && (
                <div className="relative">
                  <button
                    onClick={() => setShowExpandMenu(!showExpandMenu)}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-semibold text-xs transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Cargar más canciones</span>
                    <ChevronDown className="w-3 h-3" />
                  </button>

                  {showExpandMenu && (
                    <>
                      <div className="fixed inset-0 z-20" onClick={() => setShowExpandMenu(false)} />
                      <div className="absolute left-0 mt-2 w-48 rounded-xl bg-zinc-900 border border-zinc-700 shadow-2xl py-1.5 z-30">
                        {currentLoaded < 50 && totalAvailable >= 50 && (
                          <button
                            onClick={() => {
                              onExpandLimit(50);
                              setShowExpandMenu(false);
                            }}
                            className="w-full text-left px-3 py-2 text-xs text-zinc-200 hover:bg-zinc-800 cursor-pointer"
                          >
                            Ampliar a 50 canciones
                          </button>
                        )}
                        <button
                          onClick={() => {
                            onExpandLimit('all');
                            setShowExpandMenu(false);
                          }}
                          className="w-full text-left px-3 py-2 text-xs text-emerald-400 hover:bg-zinc-800 font-semibold cursor-pointer"
                        >
                          Cargar toda la playlist ({totalAvailable})
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Highlighted Mix Ready Banner (YouTube Only) */}
        {completedTracks.length > 0 && (
          <div className="mt-5 p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-red-950/40 via-zinc-900 to-zinc-900/90 border border-red-500/30 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-red-600 to-[#1DB954] p-[2px] shrink-0 shadow-md shadow-red-950/50">
                <div className="w-full h-full bg-zinc-950 rounded-[10px] flex items-center justify-center">
                  <PlaySquare className="w-5 h-5 text-red-400" />
                </div>
              </div>
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-2 flex-wrap">
                  <span>Mix Continuo de YouTube Disponible</span>
                  <span className="text-[10px] uppercase font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    {completedTracks.length} canciones
                  </span>
                </h4>
                <p className="text-xs text-zinc-400">
                  Reproduce todas las canciones seguidas como una lista de reproducción en YouTube:
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 w-full md:w-auto">
              {mixUrl && (
                <button
                  type="button"
                  onClick={handleOpenMix}
                  className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-600 text-white font-bold text-xs sm:text-sm shadow-lg shadow-red-600/30 transition-all hover:scale-[1.02] cursor-pointer"
                >
                  <PlaySquare className="w-4 h-4 fill-white text-transparent" />
                  <span>Abrir Mix en YouTube</span>
                  <ExternalLink className="w-3.5 h-3.5 opacity-80" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Action Controls & Search Toolbar */}
        <div className="pt-6 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          {/* Action Buttons */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Open Mix on YouTube */}
            {mixUrl && (
              <button
                onClick={handleOpenMix}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-600 text-white font-bold text-sm shadow-lg shadow-red-600/30 transition-all hover:scale-[1.02] cursor-pointer"
              >
                <PlaySquare className="w-4 h-4 fill-white text-transparent" />
                <span>Abrir Mix en YouTube</span>
                <ExternalLink className="w-3.5 h-3.5 opacity-80" />
              </button>
            )}

            {/* Copy All Links */}
            <button
              onClick={onOpenCopyModal}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-semibold text-sm border border-zinc-700 transition-all hover:scale-[1.02] cursor-pointer"
            >
              <Copy className="w-4 h-4 text-emerald-400" />
              <span>Copiar Enlaces</span>
            </button>
          </div>

          {/* Search in Playlist */}
          <div className="relative w-full lg:w-72">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Buscar en la lista..."
              className="w-full bg-zinc-950/80 border border-zinc-800 rounded-xl pl-10 pr-4 py-2 text-xs sm:text-sm text-white placeholder-zinc-500 focus:border-emerald-500 outline-none transition-colors"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
