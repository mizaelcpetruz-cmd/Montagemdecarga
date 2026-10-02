import React from 'react';
import { SapOrder } from '../types';
import { X, Package, MapPin, Calendar, DollarSign, FileText, User } from 'lucide-react';

interface OrderDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: SapOrder | null;
}

export const OrderDetailsModal: React.FC<OrderDetailsModalProps> = ({
  isOpen,
  onClose,
  order,
}) => {
  if (!isOpen || !order) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white dark:bg-[#1d1026] border border-slate-200 dark:border-[#361a47] rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-[#361a47] bg-slate-50/60 dark:bg-[#1a0d24]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-purple-50 dark:bg-[#261536] text-[#7b1fa2] dark:text-purple-400">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-white">Pedido SAP #{order.DocNum}</h2>
                <span className="text-[10px] font-mono bg-slate-100 dark:bg-[#261536] text-slate-700 dark:text-purple-300 px-2 py-0.5 rounded border border-slate-200 dark:border-[#431f5c]">
                  DocEntry: {order.DocEntry}
                </span>
                <span className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded">
                  Aberto
                </span>
                {order.PickListId && (
                  <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded flex items-center gap-1 font-mono">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Picking #{order.PickListId} ({order.PickStatusDescription || 'Liberado'})
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 mt-0.5">
                <p className="text-xs text-slate-500 dark:text-purple-300/70">{order.CardName} ({order.CardCode})</p>
                {order.SalesPersonName && (
                  <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold flex items-center gap-1">
                    <User className="w-3 h-3" />
                    Vendedor: {order.SalesPersonName}
                  </span>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#261536] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-50 dark:bg-[#130b1a] p-3 rounded-xl border border-slate-100 dark:border-[#361a47]">
              <div className="text-[11px] text-slate-500 dark:text-purple-300/70 flex items-center gap-1.5 mb-1">
                <DollarSign className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Valor Total</span>
              </div>
              <div className="text-sm font-bold text-emerald-700 dark:text-emerald-400">
                R$ {order.DocTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-[#130b1a] p-3 rounded-xl border border-slate-100 dark:border-[#361a47]">
              <div className="text-[11px] text-slate-500 dark:text-purple-300/70 flex items-center gap-1.5 mb-1">
                <Package className="w-3.5 h-3.5 text-[#7b1fa2] dark:text-purple-400" />
                <span>Peso Total</span>
              </div>
              <div className="text-sm font-bold text-slate-800 dark:text-slate-100">
                {order.TotalWeightKg.toLocaleString('pt-BR')} kg
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-[#130b1a] p-3 rounded-xl border border-slate-100 dark:border-[#361a47]">
              <div className="text-[11px] text-slate-500 dark:text-purple-300/70 flex items-center gap-1.5 mb-1">
                <MapPin className="w-3.5 h-3.5 text-amber-500" />
                <span>Destino</span>
              </div>
              <div className="text-xs font-semibold text-slate-800 dark:text-slate-100 truncate">
                {order.ShipToCity} - {order.ShipToState}
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-[#130b1a] p-3 rounded-xl border border-slate-100 dark:border-[#361a47]">
              <div className="text-[11px] text-slate-500 dark:text-purple-300/70 flex items-center gap-1.5 mb-1">
                <Calendar className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />
                <span>Entrega Prevista</span>
              </div>
              <div className="text-xs font-semibold text-slate-800 dark:text-slate-100">
                {new Date(order.DocDueDate).toLocaleDateString('pt-BR')}
              </div>
            </div>
          </div>

          {order.Comments && (
            <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60">
              <div className="text-xs font-semibold text-amber-800 dark:text-amber-300 flex items-center gap-1.5 mb-1">
                <FileText className="w-3.5 h-3.5" />
                <span>Observações do Pedido</span>
              </div>
              <p className="text-xs text-amber-900 dark:text-amber-200">{order.Comments}</p>
            </div>
          )}

          {/* Items Table */}
          <div>
            <h3 className="text-xs font-semibold text-slate-700 dark:text-purple-200 uppercase tracking-wider mb-2.5">
              Itens do Pedido ({order.DocumentLines?.length || 0})
            </h3>
            <div className="rounded-xl border border-slate-200 dark:border-[#361a47] overflow-hidden bg-white dark:bg-[#1a0d24] shadow-sm">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-[#261536] text-slate-600 dark:text-purple-300/80 font-semibold border-b border-slate-200 dark:border-[#361a47]">
                  <tr>
                    <th className="py-2.5 px-3">Item / Código</th>
                    <th className="py-2.5 px-3">Descrição</th>
                    <th className="py-2.5 px-3 text-center">Qtd</th>
                    <th className="py-2.5 px-3 text-right">Peso (kg)</th>
                    <th className="py-2.5 px-3 text-right">Volume (m³)</th>
                    <th className="py-2.5 px-3 text-right">Total (R$)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-[#361a47]/60 text-slate-700 dark:text-slate-200">
                  {order.DocumentLines?.map((line) => (
                    <tr key={line.LineNum} className="hover:bg-slate-50 dark:hover:bg-[#261536]/40">
                      <td className="py-2.5 px-3 font-mono font-medium text-[#7b1fa2] dark:text-purple-400">
                        {line.ItemCode}
                      </td>
                      <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-white">
                        {line.ItemDescription}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {line.Quantity} {line.UnitOfMeasure}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        {line.WeightKg.toLocaleString('pt-BR')} kg
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        {line.VolumeM3.toFixed(2)} m³
                      </td>
                      <td className="py-2.5 px-3 text-right font-semibold text-emerald-700 dark:text-emerald-400">
                        R$ {line.LineTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-3 border-t border-slate-100 dark:border-[#361a47] bg-white dark:bg-[#1a0d24]">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-purple-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-[#261536] hover:bg-slate-200 dark:hover:bg-[#361a47] transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
