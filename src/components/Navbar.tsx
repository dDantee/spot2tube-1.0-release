import React from 'react';
import { Music, Youtube, History, Sparkles } from 'lucide-react';

interface NavbarProps {
  historyCount: number;
  onOpenHistory: () => void;
  onReset: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ historyCount, onOpenHistory, onReset }) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <button
          onClick={onReset}
          className="flex items-center gap-3 group text-left transition-transform active:scale-95"
          title="Ir al inicio"
        >
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-[#1DB954] via-emerald-500 to-[#FF0000] p-[2px] shadow-lg shadow-emerald-950/40">
            <div className="w-full h-full bg-zinc-950 rounded-[10px] flex items-center justify-center gap-0.5">
              <Music className="w-4 h-4 text-[#1DB954] transition-transform group-hover:scale-110" />
              <Youtube className="w-4 h-4 text-[#FF0000] transition-transform group-hover:scale-110" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-lg tracking-tight text-white group-hover:text-emerald-400 transition-colors">
                Spot<span className="text-[#1DB954]">2</span><span className="text-[#FF0000]">Tube</span>
              </span>
              <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded bg-emerald-950/70 text-emerald-400 border border-emerald-500/30 shadow-sm">
                v1.0
              </span>
            </div>
            <p className="text-xs text-zinc-400 hidden sm:block">Spotify to YouTube Converter</p>
          </div>
        </button>

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenHistory}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-sm font-medium text-zinc-200 transition-colors"
          >
            <History className="w-4 h-4 text-emerald-400" />
            <span className="hidden sm:inline">Historial</span>
            {historyCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-semibold">
                {historyCount}
              </span>
            )}
          </button>

          <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-950/30 border border-emerald-800/40 text-xs font-medium text-emerald-400">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>Sin API Key Requerida</span>
          </div>
        </div>
      </div>
    </header>
  );
};
