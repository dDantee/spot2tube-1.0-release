import React, { useState } from 'react';
import { Clipboard, Loader2, Music, ArrowRight, SlidersHorizontal, Check, Info } from 'lucide-react';
import { TrackLimit } from '../types';

interface HeroInputProps {
  onConvertUrl: (url: string, limit: TrackLimit) => void;
  isLoading: boolean;
}

const LIMIT_OPTIONS: Array<{ value: TrackLimit; label: string; desc: string; icon: string }> = [
  { value: 25, label: '25 canciones', desc: 'Súper rápido (~10s)', icon: '⚡' },
  { value: 50, label: '50 canciones', desc: 'Recomendado (~20s)', icon: '🎯' },
  { value: 'all', label: 'Toda la playlist', desc: 'Completa al 100%', icon: '🚀' },
];

export const HeroInput: React.FC<HeroInputProps> = ({ onConvertUrl, isLoading }) => {
  const [url, setUrl] = useState('');
  const [limit, setLimit] = useState<TrackLimit>('all');
  const [copiedSuccess, setCopiedSuccess] = useState(false);

  const handleSubmitUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    onConvertUrl(url.trim(), limit);
  };

  const handlePasteClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setUrl(text.trim());
        setCopiedSuccess(true);
        setTimeout(() => setCopiedSuccess(false), 2000);
      }
    } catch {
      // In case permissions are not granted
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto text-center px-4 pt-8 pb-8">
      {/* Title & Tagline */}
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 text-xs font-medium text-zinc-300 mb-5 shadow-inner">
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
        <span>Convertidor directo de Spotify a enlaces de YouTube</span>
        <span className="text-[10px] uppercase font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/25">
          v1.0
        </span>
      </div>

      <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-tight sm:leading-none mb-3">
        Convierte tu playlist de{' '}
        <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#1DB954] to-emerald-400">Spotify</span>
        {' '}en enlaces de{' '}
        <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF0000] via-red-500 to-amber-500">YouTube</span>
      </h1>

      <p className="text-sm sm:text-base text-zinc-400 max-w-2xl mx-auto mb-7 font-normal">
        Pega el enlace de cualquier playlist, álbum o canción pública de Spotify. Obtenemos al instante cada video oficial de YouTube con su miniatura, enlace directo, reproductor integrado y mix continuo.
      </p>

      {/* Main Conversion Box (En móvil y desktop: 1. Pegar enlace ARRIBA, 2. Cuántas canciones DEBAJO con disclaimer) */}
      <form onSubmit={handleSubmitUrl} className="w-full bg-zinc-900/90 border border-zinc-800/90 rounded-3xl p-4 sm:p-6 shadow-2xl backdrop-blur-md text-left">
        {/* 1. OPCIÓN DE PEGAR ENLACE (ARRIBA) */}
        <div className="mb-5">
          <label className="block text-xs font-bold uppercase tracking-wider text-zinc-300 mb-2 flex items-center gap-2">
            <Music className="w-4 h-4 text-[#1DB954]" />
            <span>1. Pega el enlace de Spotify</span>
          </label>
          <div className="relative flex items-center bg-zinc-950 border border-zinc-800 rounded-2xl p-2 sm:p-2.5 focus-within:border-emerald-500/80 focus-within:ring-2 focus-within:ring-emerald-500/20 transition-all">
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://open.spotify.com/playlist/..."
              disabled={isLoading}
              className="w-full bg-transparent text-white placeholder-zinc-500 text-sm sm:text-base outline-none px-2 pr-12"
            />
            {url ? (
              <button
                type="button"
                onClick={() => setUrl('')}
                className="text-xs text-zinc-400 hover:text-white px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition-colors cursor-pointer shrink-0"
              >
                Borrar
              </button>
            ) : (
              <button
                type="button"
                onClick={handlePasteClipboard}
                title="Pegar del portapapeles"
                className="text-zinc-400 hover:text-emerald-400 px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-semibold shrink-0"
              >
                {copiedSuccess ? (
                  <Check className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Clipboard className="w-4 h-4" />
                )}
                <span>{copiedSuccess ? '¡Pegado!' : 'Pegar enlace'}</span>
              </button>
            )}
          </div>
        </div>

        {/* 2. OPCIÓN DE CUÁNTAS CANCIONES BUSCAR (POR DEBAJO DE LA OPCIÓN DE ENLACE) */}
        <div className="mb-5 pt-4 border-t border-zinc-800/80">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-300">
                2. ¿Cuántas canciones buscar?
              </span>
            </div>
            <span className="text-[11px] text-zinc-400 font-medium hidden sm:inline">
              Seleccionado: <strong className="text-emerald-400">{limit === 'all' ? 'Toda la playlist' : `${limit} canciones`}</strong>
            </span>
          </div>

          {/* Grid de 3 opciones: 25 / 50 / Toda la playlist */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {LIMIT_OPTIONS.map((opt) => {
              const isSelected = limit === opt.value;
              return (
                <button
                  key={String(opt.value)}
                  type="button"
                  onClick={() => setLimit(opt.value)}
                  className={`flex flex-col items-center justify-center p-3 rounded-2xl border text-center transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-gradient-to-br from-emerald-500/20 to-emerald-950/40 border-emerald-500 text-white shadow-lg shadow-emerald-950/50 ring-1 ring-emerald-500/50'
                      : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold text-xs sm:text-sm">
                    <span className="text-sm">{opt.icon}</span>
                    <span className={isSelected ? 'text-emerald-300' : 'text-zinc-200'}>
                      {opt.value === 'all' ? 'Toda la Playlist' : `${opt.value}`}
                    </span>
                  </div>
                  <span className="text-[10px] text-zinc-500 mt-0.5 truncate w-full hidden sm:block">
                    {opt.desc}
                  </span>
                </button>
              );
            })}
          </div>

          {/* PEQUEÑO DISCLAIMER DEBAJO DE LA OPCIÓN */}
          <div className="mt-3 flex items-center gap-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-300/90 text-xs">
            <Info className="w-4 h-4 shrink-0 text-amber-400" />
            <p className="leading-snug">
              El máximo para ser procesado por YouTube es de 50 canciones.
            </p>
          </div>
        </div>

        {/* 3. BOTÓN DE CONVERTIR */}
        <button
          type="submit"
          disabled={isLoading || !url.trim()}
          className="w-full flex items-center justify-center gap-2 px-6 py-4 rounded-2xl bg-gradient-to-r from-emerald-500 via-[#1DB954] to-emerald-400 hover:from-emerald-400 hover:to-emerald-500 text-black font-extrabold text-sm sm:text-base shadow-xl shadow-emerald-500/20 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Cargando playlist...</span>
            </>
          ) : (
            <>
              <span>
                Convertir {limit === 'all' ? 'Playlist Completa' : `(${limit} canciones)`} a YouTube
              </span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>
    </div>
  );
};
