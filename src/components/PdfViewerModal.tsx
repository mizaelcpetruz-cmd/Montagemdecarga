import React, { useState, useEffect } from 'react';
import { X, Download, Printer, CheckCircle, FileText, Loader2, AlertCircle, RefreshCw, Type } from 'lucide-react';
import { loadService } from '../services/api';

interface PdfViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  loadId: string;
  loadNumber: string;
  layoutTitle?: string;
  isClosed?: boolean;
  onFinalize?: () => void;
}

export const PdfViewerModal: React.FC<PdfViewerModalProps> = ({
  isOpen,
  onClose,
  loadId,
  loadNumber,
  layoutTitle = '',
  isClosed,
  onFinalize,
}) => {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [titleInput, setTitleInput] = useState(layoutTitle);
  const [activeTitle, setActiveTitle] = useState(layoutTitle);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (layoutTitle) {
      setTitleInput(layoutTitle);
      setActiveTitle(layoutTitle);
    }
  }, [layoutTitle, isOpen]);

  useEffect(() => {
    let currentBlobUrl: string | null = null;

    if (isOpen && loadId) {
      setLoading(true);
      setError(null);

      loadService
        .downloadPdfBlob(loadId, activeTitle.trim() || undefined)
        .then((blob) => {
          const url = URL.createObjectURL(blob);
          currentBlobUrl = url;
          setBlobUrl(url);
        })
        .catch((err) => {
          console.error('Erro ao carregar PDF:', err);
          setError('Não foi possível renderizar o PDF. Tente novamente.');
        })
        .finally(() => {
          setLoading(false);
        });
    }

    return () => {
      if (currentBlobUrl) {
        URL.revokeObjectURL(currentBlobUrl);
      }
    };
  }, [isOpen, loadId, activeTitle]);

  if (!isOpen) return null;

  const handleApplyTitle = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setActiveTitle(titleInput.trim());
  };

  const handlePrint = () => {
    const iframe = document.getElementById('pdf-frame') as HTMLIFrameElement;
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.print();
    } else if (blobUrl) {
      const printWindow = window.open(blobUrl, '_blank');
      if (printWindow) {
        printWindow.focus();
        printWindow.print();
      }
    }
  };

  const handleDownload = () => {
    if (!blobUrl) return;
    const a = document.createElement('a');
    a.href = blobUrl;
    const cleanTitle = (activeTitle || 'Conferencia_Lotes').replace(/[^a-zA-Z0-9_-]/g, '_');
    a.download = `${cleanTitle}_${loadNumber}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-2 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#1d1026] border border-purple-200 dark:border-[#361a47] rounded-2xl w-full max-w-6xl h-[94vh] flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
        {/* Modal Top Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 px-5 py-3 border-b border-slate-100 dark:border-[#361a47] bg-slate-50/90 dark:bg-[#1a0d24]">
          {/* Identificação da Carga */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="p-2 rounded-xl bg-purple-100 dark:bg-[#261536] text-[#7b1fa2] dark:text-purple-400 shadow-xs">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Layout de Impressão
                </h2>
                <span className="text-[11px] font-mono font-bold text-[#7b1fa2] dark:text-purple-300 px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-950/80">
                  {loadNumber}
                </span>
              </div>
              <p className="text-[10px] text-slate-500 dark:text-purple-300/70">
                Documento de Expedição & Romaneio Petruz Fruity
              </p>
            </div>
          </div>

          {/* Campo de Alteração Rápida do Título do Layout */}
          <form onSubmit={handleApplyTitle} className="flex items-center gap-1.5 flex-1 max-w-md mx-2">
            <div className="relative w-full">
              <Type className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={titleInput}
                onChange={(e) => setTitleInput(e.target.value)}
                onBlur={() => handleApplyTitle()}
                placeholder="Ex: CONFERÊNCIA DE LOTES LOKFRIO"
                className="w-full pl-8 pr-3 py-1.5 bg-white dark:bg-[#130b1a] border border-purple-200 dark:border-purple-900/80 focus:border-[#7b1fa2] rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-100 uppercase tracking-wide outline-none shadow-xs"
                title="Pressione Enter ou clique fora para atualizar o título no cabeçalho do PDF"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="p-1.5 rounded-xl border border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-950/60 hover:bg-purple-100 text-[#7b1fa2] dark:text-purple-300 text-xs font-bold transition-all cursor-pointer shadow-xs shrink-0"
              title="Atualizar Título no PDF"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </form>

          {/* Botões de Ação */}
          <div className="flex items-center gap-2 shrink-0">
            {!isClosed && onFinalize && (
              <button
                onClick={onFinalize}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
                title="Finalizar montagem e liberar para expedição"
              >
                <CheckCircle className="w-4 h-4" />
                <span>Finalizar & Liberar</span>
              </button>
            )}

            <button
              onClick={handlePrint}
              disabled={loading || !blobUrl}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-[#261536] hover:bg-slate-200 dark:hover:bg-[#361a47] text-slate-700 dark:text-purple-200 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
              title="Imprimir Documento"
            >
              <Printer className="w-4 h-4 text-slate-500 dark:text-purple-400" />
              <span className="hidden sm:inline">Imprimir</span>
            </button>

            <button
              onClick={handleDownload}
              disabled={loading || !blobUrl}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#7b1fa2] hover:bg-[#6b21a8] text-white text-xs font-bold shadow-sm transition-colors cursor-pointer disabled:opacity-50"
              title="Baixar Arquivo PDF"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Download PDF</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#261536] transition-colors ml-1 cursor-pointer"
              title="Fechar Visualização (Manter dados na tela)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* PDF Frame Preview */}
        <div className="flex-1 bg-slate-100 dark:bg-[#130b1a] p-2.5 relative flex items-center justify-center">
          {loading && (
            <div className="flex flex-col items-center justify-center gap-3 text-slate-600 dark:text-purple-300">
              <Loader2 className="w-8 h-8 animate-spin text-[#7b1fa2]" />
              <span className="text-xs font-semibold">Gerando Layout PDF com o título atualizado...</span>
            </div>
          )}

          {error && !loading && (
            <div className="flex flex-col items-center justify-center gap-3 text-red-600 dark:text-red-400 text-center p-6">
              <AlertCircle className="w-10 h-10" />
              <p className="text-xs font-semibold">{error}</p>
            </div>
          )}

          {blobUrl && !loading && !error && (
            <iframe
              id="pdf-frame"
              src={`${blobUrl}#toolbar=1&navpanes=0&scrollbar=1`}
              className="w-full h-full rounded-xl border border-slate-200 dark:border-[#361a47] bg-white shadow-inner"
              title="Visualizador de PDF de Conferência"
            />
          )}
        </div>
      </div>
    </div>
  );
};
