import React from 'react';
import { Loader2, CheckCircle2, AlertCircle, XCircle } from 'lucide-react';

interface ConversionProgressProps {
  currentTrack: string;
  currentIndex: number;
  totalTracks: number;
  completedCount: number;
  errorCount: number;
  onCancel?: () => void;
}

export const ConversionProgress: React.FC<ConversionProgressProps> = ({
  currentTrack,
  currentIndex,
  totalTracks,
  completedCount,
  errorCount,
  onCancel,
}) => {
  const percentage = totalTracks > 0 ? Math.min(100, Math.round((completedCount / totalTracks) * 100)) : 0;

  return (
    <div className="w-full max-w-4xl mx-auto px-4 mb-6">
      <div className="p-4 sm:p-5 rounded-2xl bg-zinc-900/90 border border-zinc-800 shadow-xl backdrop-blur">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500">
              <Loader2 className="w-5 h-5 animate-spin" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-white text-sm sm:text-base">
                  Buscando videos en YouTube...
                </h3>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-zinc-800 text-emerald-400">
                  {percentage}%
                </span>
              </div>
              <p className="text-xs text-zinc-400 truncate max-w-md">
                {currentTrack ? `Procesando: ${currentTrack}` : `Canción ${currentIndex + 1} de ${totalTracks}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{completedCount} encontradas</span>
            </div>
            {errorCount > 0 && (
              <div className="flex items-center gap-1.5 text-amber-400 font-medium">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>{errorCount} fallos</span>
              </div>
            )}
            {onCancel && (
              <button
                onClick={onCancel}
                className="flex items-center gap-1 text-zinc-400 hover:text-red-400 transition-colors ml-2"
                title="Detener conversión"
              >
                <XCircle className="w-4 h-4" />
                <span>Detener</span>
              </button>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-2.5 bg-zinc-950 rounded-full overflow-hidden border border-zinc-800/80 p-0.5">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 via-amber-500 to-red-500 rounded-full transition-all duration-300 shadow-sm"
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    </div>
  );
};
