import React from 'react';
import { X, Trash2, ExternalLink, PlaySquare, Clock, Music } from 'lucide-react';
import { SavedConversion } from '../types';

interface HistoryDrawerProps {
  isOpen: boolean;
  history: SavedConversion[];
  onClose: () => void;
  onSelect: (item: SavedConversion) => void;
  onClear: () => void;
  onDeleteItem: (id: string) => void;
}

export const HistoryDrawer: React.FC<HistoryDrawerProps> = ({
  isOpen,
  history,
  onClose,
  onSelect,
  onClear,
  onDeleteItem,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-zinc-950 border-l border-zinc-800 shadow-2xl flex flex-col">
          {/* Header */}
          <div className="p-5 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/60">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-emerald-400" />
              <h3 className="font-bold text-white text-base">Historial de Conversiones</h3>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {history.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-center text-zinc-500">
                <Music className="w-10 h-10 mb-2 opacity-30" />
                <p className="text-sm font-medium">Aún no hay playlists convertidas</p>
                <p className="text-xs text-zinc-600 mt-1">
                  Convierte una playlist de Spotify para guardarla aquí.
                </p>
              </div>
            ) : (
              history.map((item) => (
                <div
                  key={item.id}
                  className="group relative p-3.5 rounded-2xl bg-zinc-900/70 hover:bg-zinc-900 border border-zinc-800/80 hover:border-zinc-700 transition-all"
                >
                  <div className="flex items-center gap-3">
                    {/* Cover */}
                    <div className="w-12 h-12 rounded-xl bg-zinc-800 overflow-hidden shrink-0 border border-zinc-700/50">
                      {item.coverUrl ? (
                        <img
                          src={item.coverUrl}
                          alt={item.playlistName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-zinc-600">
                          <Music className="w-5 h-5" />
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <h4 className="font-bold text-sm text-white truncate group-hover:text-emerald-400 transition-colors">
                        {item.playlistName}
                      </h4>
                      <div className="flex items-center gap-2 text-xs text-zinc-400 mt-0.5">
                        <span>{item.totalTracks} canciones</span>
                        <span>•</span>
                        <span>{new Date(item.timestamp).toLocaleDateString()}</span>
                      </div>
                    </div>

                    {/* Delete button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteItem(item.id);
                      }}
                      className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-zinc-800 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                      title="Eliminar de historial"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Actions inside card */}
                  <div className="mt-3 pt-2.5 border-t border-zinc-800/60 flex items-center justify-between">
                    <button
                      onClick={() => {
                        onSelect(item);
                        onClose();
                      }}
                      className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer"
                    >
                      Ver canciones convertidas →
                    </button>

                    {item.youtubeMixUrl && (
                      <a
                        href={item.youtubeMixUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-[11px] font-semibold text-red-400 hover:text-red-300"
                      >
                        <PlaySquare className="w-3.5 h-3.5" />
                        <span>Abrir Mix</span>
                      </a>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {history.length > 0 && (
            <div className="p-4 border-t border-zinc-800 bg-zinc-900/60 flex items-center justify-between">
              <span className="text-xs text-zinc-500">{history.length} guardadas</span>
              <button
                onClick={onClear}
                className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-red-400 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Vaciar historial</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
