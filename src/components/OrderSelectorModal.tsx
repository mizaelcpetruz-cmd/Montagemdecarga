import React, { useState, useEffect } from 'react';
import { SapOrder, Branch } from '../types';
import { sapService, branchService } from '../services/api';
import { X, Search, Plus, PackageSearch, RefreshCw, Eye, Building2 } from 'lucide-react';
import { OrderDetailsModal } from './OrderDetailsModal';

interface OrderSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  alreadySelectedDocEntries: number[];
  onAddOrders: (orders: SapOrder[]) => void;
  defaultBranchId?: number;
}

export const OrderSelectorModal: React.FC<OrderSelectorModalProps> = ({
  isOpen,
  onClose,
  alreadySelectedDocEntries,
  onAddOrders,
  defaultBranchId,
}) => {
  const [allOrders, setAllOrders] = useState<SapOrder[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<number | 'all'>(defaultBranchId || 'all');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [loading, setLoading] = useState(false);
  const [inspectedOrder, setInspectedOrder] = useState<SapOrder | null>(null);

  // Carrega filiais ativas do sistema
  useEffect(() => {
    const loadBranches = async () => {
      try {
        const list = await branchService.list();
        const activeOnly = list.filter((b) => b.is_active === 1);
        setBranches(activeOnly);
      } catch (err) {
        console.error('Erro ao carregar filiais:', err);
      }
    };
    if (isOpen) {
      loadBranches();
    }
  }, [isOpen]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const branchParam = selectedBranchId === 'all' ? undefined : selectedBranchId;
      const orders = await sapService.getOrders({
        branchId: branchParam,
        search,
      });
      setAllOrders(orders);
    } catch (err) {
      console.error('Erro ao buscar pedidos SAP:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      if (defaultBranchId && selectedBranchId === 'all') {
        setSelectedBranchId(defaultBranchId);
      }
      setSelectedIds([]);
      setSearch('');
      setSelectedCity('');
    }
  }, [isOpen, defaultBranchId]);

  useEffect(() => {
    if (isOpen) {
      fetchOrders();
    }
  }, [isOpen, selectedBranchId, search]);

  if (!isOpen) return null;

  const availableOrders = allOrders.filter(
    (o) => !alreadySelectedDocEntries.includes(o.DocEntry)
  );

  const filteredOrders = availableOrders.filter((o) => {
    const matchesCity = selectedCity === '' || o.ShipToCity === selectedCity;
    return matchesCity;
  });

  const uniqueCities = Array.from(new Set(availableOrders.map((o) => o.ShipToCity)));

  const toggleSelect = (docEntry: number) => {
    setSelectedIds((prev) =>
      prev.includes(docEntry) ? prev.filter((id) => id !== docEntry) : [...prev, docEntry]
    );
  };

  const handleSelectAllFiltered = () => {
    const ids = filteredOrders.map((o) => o.DocEntry);
    setSelectedIds(ids);
  };

  const handleToggleSelectRoute = (routeOrders: SapOrder[]) => {
    const routeDocEntries = routeOrders.map((o) => o.DocEntry);
    const allSelected = routeDocEntries.every((id) => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds((prev) => prev.filter((id) => !routeDocEntries.includes(id)));
    } else {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...routeDocEntries])));
    }
  };

  const handleConfirm = () => {
    const toAdd = allOrders.filter((o) => selectedIds.includes(o.DocEntry));
    onAddOrders(toAdd);
    onClose();
  };

  // Agrupamento de pedidos por rota (Cidade / Estado)
  const ordersByRoute = filteredOrders.reduce((acc, order) => {
    const routeKey = `${order.ShipToCity || 'Belém'} - ${order.ShipToState || 'PA'}`;
    if (!acc[routeKey]) {
      acc[routeKey] = [];
    }
    acc[routeKey].push(order);
    return acc;
  }, {} as Record<string, SapOrder[]>);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white dark:bg-[#1d1026] border border-slate-200 dark:border-[#361a47] rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-[#361a47] bg-slate-50/60 dark:bg-[#1a0d24]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-50 dark:bg-[#261536] text-[#7b1fa2] dark:text-purple-400">
              <PackageSearch className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Buscar Pedidos no SAP Service Layer
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 font-mono">
                  {availableOrders.length} liberados no picking
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-purple-300/70">
                Selecione os pedidos de venda com lista de picking liberada (separados por rota)
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#261536] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filters Toolbar */}
        <div className="p-4 bg-slate-50/60 dark:bg-[#1a0d24] border-b border-slate-100 dark:border-[#361a47] flex flex-wrap items-center gap-3">
          {/* Seletor de Filial Ativa */}
          <div className="flex items-center gap-2 min-w-[220px]">
            <Building2 className="w-4 h-4 text-[#7b1fa2]" />
            <select
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value === 'all' ? 'all' : Number(e.target.value))}
              className="bg-white dark:bg-[#130b1a] border border-slate-200 dark:border-[#361a47] rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:border-[#7b1fa2] cursor-pointer w-full"
            >
              <option value="all">🌐 Todas as Filiais Ativas</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  🏢 [{b.code}] {b.name}
                </option>
              ))}
            </select>
          </div>

          <div className="relative flex-1 min-w-[180px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por Nº do Picking, Pedido, Cliente, Vendedor..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white dark:bg-[#130b1a] border border-slate-200 dark:border-[#361a47] rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:border-[#7b1fa2]"
            />
          </div>

          <select
            value={selectedCity}
            onChange={(e) => setSelectedCity(e.target.value)}
            className="bg-white dark:bg-[#130b1a] border border-slate-200 dark:border-[#361a47] rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:border-[#7b1fa2] cursor-pointer"
          >
            <option value="">🗺️ Todas as Rotas / Cidades ({uniqueCities.length})</option>
            {uniqueCities.map((city) => (
              <option key={city} value={city}>
                Rota: {city}
              </option>
            ))}
          </select>

          <button
            onClick={fetchOrders}
            disabled={loading}
            className="p-2 rounded-xl bg-white dark:bg-[#130b1a] border border-slate-200 dark:border-[#361a47] hover:bg-slate-50 dark:hover:bg-[#261536] text-slate-600 dark:text-purple-300 transition-colors cursor-pointer"
            title="Atualizar Pedidos"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#7b1fa2]' : ''}`} />
          </button>

          {filteredOrders.length > 0 && (
            <button
              onClick={handleSelectAllFiltered}
              className="text-xs text-[#7b1fa2] dark:text-purple-300 hover:text-[#5c137a] font-bold px-2 py-1 cursor-pointer"
            >
              Marcar Todos ({filteredOrders.length})
            </button>
          )}
        </div>

        {/* Orders Table Grouped by Route */}
        <div className="flex-1 overflow-y-auto p-4 bg-[#f8f9fa] dark:bg-[#130b1a]">
          {loading ? (
            <div className="py-16 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
              <div className="w-6 h-6 border-2 border-[#7b1fa2] border-t-transparent rounded-full animate-spin" />
              <span>Consultando pedidos com picking liberado no SAP...</span>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="py-16 text-center text-xs text-slate-400">
              Nenhum pedido liberado no picking localizado.
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(ordersByRoute).map(([routeKey, routeOrders]) => {
                const isAllRouteSelected = routeOrders.every((o) => selectedIds.includes(o.DocEntry));
                const routeWeight = routeOrders.reduce((s, o) => s + (o.TotalWeightKg || 0), 0);
                const routeTotal = routeOrders.reduce((s, o) => s + (o.DocTotal || 0), 0);

                return (
                  <div key={routeKey} className="rounded-xl border border-slate-200 dark:border-[#361a47] overflow-hidden bg-white dark:bg-[#1a0d24] shadow-sm">
                    {/* Route Section Header */}
                    <div className="bg-purple-50/80 dark:bg-[#261536] px-4 py-2.5 border-b border-purple-100 dark:border-[#3d1d52] flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-[#7b1fa2]" />
                        <span className="font-bold text-xs text-slate-900 dark:text-white">
                          Rota: {routeKey}
                        </span>
                        <span className="text-[11px] text-slate-500 dark:text-purple-300/70 font-mono">
                          • {routeOrders.length} {routeOrders.length === 1 ? 'cliente' : 'clientes'} ({routeWeight.toLocaleString('pt-BR')} kg • R$ {routeTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleToggleSelectRoute(routeOrders)}
                        className="text-[11px] font-bold text-[#7b1fa2] dark:text-purple-300 hover:text-purple-700 dark:hover:text-white cursor-pointer px-2.5 py-0.5 rounded-lg bg-white/90 dark:bg-[#1a0d24] border border-purple-200 dark:border-purple-800 transition-colors"
                      >
                        {isAllRouteSelected ? 'Desmarcar Rota' : 'Marcar Rota Completa'}
                      </button>
                    </div>

                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50/70 dark:bg-[#1f102c] text-slate-600 dark:text-purple-300/80 font-semibold border-b border-slate-200 dark:border-[#361a47]">
                        <tr>
                          <th className="py-2 px-3 w-10 text-center">Sel.</th>
                          <th className="py-2 px-3 text-center font-bold text-emerald-700 dark:text-emerald-400">Nº Picking</th>
                          <th className="py-2 px-3">Nº Pedido SAP</th>
                          <th className="py-2 px-3">Cliente</th>
                          <th className="py-2 px-3">Vendedor</th>
                          <th className="py-2 px-3 text-right">Peso (kg)</th>
                          <th className="py-2 px-3 text-right">Volume (m³)</th>
                          <th className="py-2 px-3 text-center">Paletes</th>
                          <th className="py-2 px-3 text-right">Valor (R$)</th>
                          <th className="py-2 px-3 text-center">Ver</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-[#361a47]/60 text-slate-700 dark:text-slate-200">
                        {routeOrders.map((order) => {
                          const isChecked = selectedIds.includes(order.DocEntry);
                          return (
                            <tr
                              key={order.DocEntry}
                              onClick={() => toggleSelect(order.DocEntry)}
                              className={`cursor-pointer transition-colors ${
                                isChecked ? 'bg-purple-50/70 dark:bg-purple-950/40 font-semibold text-slate-900 dark:text-white' : 'hover:bg-slate-50/80 dark:hover:bg-[#261536]/30'
                              }`}
                            >
                              <td className="py-2.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => toggleSelect(order.DocEntry)}
                                  className="rounded border-slate-300 text-[#7b1fa2] focus:ring-0 w-4 h-4 cursor-pointer"
                                />
                              </td>
                              <td className="py-2.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                                {order.PickListId ? (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 font-mono font-bold text-xs border border-emerald-200 dark:border-emerald-800/80 shadow-xs" title={`Lista de Picking SAP: #${order.PickListId} (${order.PickStatusDescription || 'Liberado'})`}>
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                    #{order.PickListId}
                                  </span>
                                ) : (
                                  <span className="text-slate-400 font-mono text-xs">-</span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 font-mono font-bold text-[#7b1fa2] dark:text-purple-400">
                                #{order.DocNum}
                              </td>
                              <td className="py-2.5 px-3">
                                <div className="font-semibold text-slate-900 dark:text-white truncate max-w-[200px]">{order.CardName}</div>
                                <div className="text-[10px] text-slate-400 dark:text-purple-300/60 font-mono">
                                  {order.CardCode}
                                </div>
                              </td>
                              <td className="py-2.5 px-3">
                                <span className="text-indigo-600 dark:text-indigo-400 font-medium truncate max-w-[130px] block" title={`Vendedor: ${order.SalesPersonName || '-'}`}>
                                  {order.SalesPersonName || '-'}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-right font-semibold">
                                {order.TotalWeightKg.toLocaleString('pt-BR')} kg
                              </td>
                              <td className="py-2.5 px-3 text-right">
                                {order.TotalVolumeM3.toFixed(2)} m³
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                {order.EstimatedPallets} un
                              </td>
                              <td className="py-2.5 px-3 text-right font-bold text-emerald-700 dark:text-emerald-400">
                                R$ {order.DocTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </td>
                              <td className="py-2.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                                <button
                                  type="button"
                                  onClick={() => setInspectedOrder(order)}
                                  className="p-1 rounded-lg text-slate-400 hover:text-[#7b1fa2] dark:hover:text-purple-300 hover:bg-purple-50 dark:hover:bg-[#261536] transition-colors cursor-pointer"
                                  title="Ver Itens do Pedido"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-slate-100 dark:border-[#361a47] bg-white dark:bg-[#1a0d24]">
          <div className="text-xs text-slate-500 dark:text-purple-300/70">
            <strong className="text-slate-800 dark:text-white">{selectedIds.length}</strong> pedido(s) selecionado(s)
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 dark:text-purple-300 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#261536] transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirm}
              disabled={selectedIds.length === 0}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#7b1fa2] hover:bg-[#6b21a8] text-white text-xs font-bold shadow-sm transition-all disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              <span>Adicionar ({selectedIds.length}) à Carga</span>
            </button>
          </div>
        </div>
      </div>

      <OrderDetailsModal
        isOpen={!!inspectedOrder}
        onClose={() => setInspectedOrder(null)}
        order={inspectedOrder}
      />
    </div>
  );
};
