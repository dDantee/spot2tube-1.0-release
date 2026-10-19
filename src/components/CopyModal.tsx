import React, { useState } from 'react';
import { X, Copy, Check, FileText, Code2, Link2 } from 'lucide-react';
import { ConvertedTrack } from '../types';

interface CopyModalProps {
  tracks: ConvertedTrack[];
  playlistName: string;
  onClose: () => void;
  onShowToast: (msg: string) => void;
}

type FormatType = 'urls' | 'detailed' | 'markdown' | 'json';

export const CopyModal: React.FC<CopyModalProps> = ({ tracks, playlistName, onClose, onShowToast }) => {
  const [format, setFormat] = useState<FormatType>('urls');
  const [copied, setCopied] = useState(false);

  const getFormattedContent = (): string => {
    const valid = tracks.filter((t) => t.youtube?.url);

    if (format === 'urls') {
      return valid.map((t) => t.youtube!.url).join('\n');
    }

    if (format === 'detailed') {
      return valid
        .map((t, idx) => `${idx + 1}. ${t.track.artist} - ${t.track.title}: ${t.youtube!.url}`)
        .join('\n');
    }

    if (format === 'markdown') {
      return valid
        .map((t) => `- [${t.track.artist} - ${t.track.title}](${t.youtube!.url})`)
        .join('\n');
    }

    if (format === 'json') {
      const items = valid.map((t) => ({
        song: t.track.title,
        artist: t.track.artist,
        youtubeUrl: t.youtube!.url,
        videoId: t.youtube!.id,
      }));
      return JSON.stringify(items, null, 2);
    }

    return '';
  };

  const content = getFormattedContent();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      onShowToast('¡Todos los enlaces de YouTube fueron copiados al portapapeles!');
      setTimeout(() => setCopied(false), 2500);
    } catch {
      try {
        const textArea = document.createElement('textarea');
        textArea.value = content;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        setCopied(true);
        onShowToast('¡Todos los enlaces de YouTube fueron copiados al portapapeles!');
        setTimeout(() => setCopied(false), 2500);
      } catch {
        onShowToast('Error al copiar al portapapeles');
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-2xl bg-zinc-950 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-zinc-800 bg-zinc-900/60">
          <div>
            <h3 className="font-bold text-white text-base sm:text-lg">
              Copiar Enlaces de YouTube
            </h3>
            <p className="text-xs text-zinc-400">
              {tracks.filter((t) => t.youtube?.url).length} enlaces generados de &quot;{playlistName}&quot;
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Format Selector */}
        <div className="p-4 border-b border-zinc-800/80 bg-zinc-900/30 flex items-center gap-2 overflow-x-auto">
          <button
            onClick={() => setFormat('urls')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              format === 'urls'
                ? 'bg-emerald-500 text-black shadow'
                : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
            }`}
          >
            <Link2 className="w-3.5 h-3.5" />
            <span>Solo URLs</span>
          </button>

          <button
            onClick={() => setFormat('detailed')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              format === 'detailed'
                ? 'bg-emerald-500 text-black shadow'
                : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Título + Enlace</span>
          </button>

          <button
            onClick={() => setFormat('markdown')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              format === 'markdown'
                ? 'bg-emerald-500 text-black shadow'
                : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>Markdown</span>
          </button>

          <button
            onClick={() => setFormat('json')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              format === 'json'
                ? 'bg-emerald-500 text-black shadow'
                : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>JSON</span>
          </button>
        </div>

        {/* Text Area / Preview */}
        <div className="p-4 flex-1 overflow-hidden flex flex-col">
          <textarea
            readOnly
            value={content}
            className="w-full flex-1 bg-zinc-900 border border-zinc-800 rounded-xl p-3.5 text-xs sm:text-sm text-zinc-200 font-mono resize-none focus:outline-none"
            rows={12}
          />
        </div>

        {/* Footer */}
        <div className="p-4 px-6 bg-zinc-900/80 border-t border-zinc-800 flex items-center justify-between">
          <span className="text-xs text-zinc-400">
            {tracks.filter((t) => t.youtube?.url).length} líneas listas
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              Cerrar
            </button>
            <button
              onClick={handleCopy}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer ${
                copied
                  ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/30'
                  : 'bg-gradient-to-r from-emerald-500 to-[#1DB954] text-black hover:opacity-95 shadow-md shadow-emerald-500/20'
              }`}
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>¡Copiado con Éxito!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copiar Todos</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
