import React, { useState, useEffect, useMemo } from 'react';
import { loadService } from '../services/api';
import { LoadAssembly, LoadItem } from '../types';
import { PdfViewerModal } from '../components/PdfViewerModal';
import { DisassembleLoadModal } from '../components/DisassembleLoadModal';
import { 
  FileText, 
  Search, 
  RefreshCw, 
  Trash2, 
  Settings, 
  X, 
  CheckCircle2, 
  AlertCircle,
  Truck,
  Layers,
  Calendar,
  User,
  Users,
  FilterX
} from 'lucide-react';

export const LoadHistoryPage: React.FC = () => {
  const [loads, setLoads] = useState<LoadAssembly[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [salesPersonFilter, setSalesPersonFilter] = useState('');
  const [clientFilter, setClientFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedLoad, setSelectedLoad] = useState<LoadAssembly | null>(null);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);

  // Modal de gerenciamento / desvinculação de carga existente
  const [manageLoad, setManageLoad] = useState<LoadAssembly | null>(null);
  const [disassemblingLoad, setDisassemblingLoad] = useState<{ id: string; loadNumber: string } | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchLoads = async () => {
    try {
      setLoading(true);
      const res = await loadService.list();
      setLoads(res);
    } catch (err) {
      console.error('Erro ao buscar histórico de montagens:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLoads();
  }, []);

  // Extrai listas únicas de vendedores e clientes para sugestões rápidas (datalist)
  const uniqueSalesPersons = useMemo(() => {
    const set = new Set<string>();
    loads.forEach((l) => {
      (l.sales_persons || []).forEach((p) => p && set.add(p.trim()));
      (l.load_items || []).forEach((it: any) => {
        const sp = it.sales_person_name || it.items_json?.salesPersonName;
        if (sp && typeof sp === 'string') set.add(sp.trim());
      });
    });
    return Array.from(set).filter(Boolean).sort();
  }, [loads]);

  const uniqueClients = useMemo(() => {
    const set = new Set<string>();
    loads.forEach((l) => {
      (l.client_names || []).forEach((c) => c && set.add(c.trim()));
      (l.load_items || []).forEach((it: any) => {
        if (it.card_name && typeof it.card_name === 'string') set.add(it.card_name.trim());
      });
    });
    return Array.from(set).filter(Boolean).sort();
  }, [loads]);

  const filteredLoads = useMemo(() => {
    return loads.filter((l) => {
      // 1. Busca Geral (Manifesto, Placa, Motorista, Cidades Destino)
      if (search.trim()) {
        const s = search.trim().toLowerCase();
        const matchGeneral =
          l.load_number.toLowerCase().includes(s) ||
          (l.plate && l.plate.toLowerCase().includes(s)) ||
          (l.driver_name && l.driver_name.toLowerCase().includes(s)) ||
          (l.destination_cities && l.destination_cities.toLowerCase().includes(s));
        if (!matchGeneral) return false;
      }

      // 2. Filtro por Data Inicial / Final
      if (startDate) {
        const loadDate = l.created_at ? l.created_at.split('T')[0] : '';
        if (loadDate < startDate) return false;
      }
      if (endDate) {
        const loadDate = l.created_at ? l.created_at.split('T')[0] : '';
        if (loadDate > endDate) return false;
      }

      // 3. Filtro por Vendedor
      if (salesPersonFilter.trim()) {
        const sp = salesPersonFilter.trim().toLowerCase();
        const hasSp =
          (l.sales_persons && l.sales_persons.some((p) => p && p.toLowerCase().includes(sp))) ||
          (l.load_items &&
            l.load_items.some((it: any) => {
              const name = it.sales_person_name || it.items_json?.salesPersonName;
              return name && name.toLowerCase().includes(sp);
            })) ||
          (l.orders &&
            l.orders.some((it: any) => {
              const name = it.sales_person_name || it.items_json?.salesPersonName;
              return name && name.toLowerCase().includes(sp);
            }));
        if (!hasSp) return false;
      }

      // 4. Filtro por Cliente
      if (clientFilter.trim()) {
        const c = clientFilter.trim().toLowerCase();
        const hasClient =
          (l.client_names && l.client_names.some((name) => name && name.toLowerCase().includes(c))) ||
          (l.load_items &&
            l.load_items.some(
              (it: any) =>
                (it.card_name && it.card_name.toLowerCase().includes(c)) ||
                (it.card_code && it.card_code.toLowerCase().includes(c))
            )) ||
          (l.orders &&
            l.orders.some(
              (it: any) =>
                (it.card_name && it.card_name.toLowerCase().includes(c)) ||
                (it.card_code && it.card_code.toLowerCase().includes(c))
            ));
        if (!hasClient) return false;
      }

      return true;
    });
  }, [loads, search, startDate, endDate, salesPersonFilter, clientFilter]);

  const hasActiveFilters = Boolean(search || salesPersonFilter || clientFilter || startDate || endDate);

  const clearFilters = () => {
    setSearch('');
    setSalesPersonFilter('');
    setClientFilter('');
    setStartDate('');
    setEndDate('');
  };

  // Totais calculados sobre a lista filtrada
  const totalWeightFiltered = filteredLoads.reduce((sum, l) => sum + (l.total_weight_kg || 0), 0);
  const totalValueFiltered = filteredLoads.reduce((sum, l) => sum + (l.total_value || 0), 0);
  const totalOrdersFiltered = filteredLoads.reduce((sum, l) => sum + (l.order_count || 0), 0);

  const openPdf = (load: LoadAssembly) => {
    setSelectedLoad(load);
    setIsPdfModalOpen(true);
  };

  const openManageModal = async (load: LoadAssembly) => {
    try {
      const fullLoad = await loadService.getById(load.id);
      setManageLoad(fullLoad);
    } catch (err: any) {
      setNotification({ type: 'error', message: 'Erro ao carregar detalhes da montagem: ' + err.message });
    }
  };

  // Desvincular um pedido de uma carga existente
  const handleRemoveItemFromExistingLoad = async (itemId: string, docNum: number) => {
    if (!manageLoad) return;
    const confirmRemove = window.confirm(`Deseja desvincular o pedido #${docNum} desta carga? Os totais serão recalculados.`);
    if (!confirmRemove) return;

    try {
      await loadService.removeOrderItem(manageLoad.id, itemId);
      setNotification({ type: 'success', message: `Pedido #${docNum} desvinculado da carga.` });
      
      // Recarrega detalhes da carga
      const updatedFull = await loadService.getById(manageLoad.id);
      setManageLoad(updatedFull);
      fetchLoads();
    } catch (err: any) {
      setNotification({ type: 'error', message: err.response?.data?.message || 'Erro ao desvincular pedido.' });
    }
  };

  // Desmontar carga com justificativa obrigatória
  const handleConfirmDisassemble = async (justification: string) => {
    if (!disassemblingLoad) return;

    try {
      await loadService.deleteLoad(disassemblingLoad.id, justification);
      setNotification({
        type: 'success',
        message: `Montagem de Carga ${disassemblingLoad.loadNumber} desmontada com sucesso e veículo liberado!`,
      });
      setManageLoad(null);
      setDisassemblingLoad(null);
      fetchLoads();
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.response?.data?.message || 'Erro ao desmontar carga.',
      });
    }
  };

  return (
    <div className="space-y-6 w-full pb-16 transition-all duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5 tracking-tight">
            <Layers className="w-6 h-6 text-[#7b1fa2]" />
            <span>Histórico de Montagens</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-purple-300/80 mt-1">
            Consulte montagens de carga finalizadas, filtre por vendedor, período de datas e cliente.
          </p>
        </div>

        <button
          onClick={fetchLoads}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-[#1a0d24] border border-slate-200 dark:border-[#361a47] text-xs font-semibold text-slate-700 dark:text-purple-200 hover:bg-slate-50 dark:hover:bg-[#261536] transition-all shadow-xs cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#7b1fa2]' : ''}`} />
          <span>Atualizar Lista</span>
        </button>
      </div>

      {/* Notifications */}
      {notification && (
        <div
          className={`p-4 rounded-xl border text-xs flex items-center justify-between animate-in fade-in duration-200 ${
            notification.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
              : 'bg-red-50 dark:bg-red-950/60 border-red-200 dark:border-red-800 text-red-800 dark:text-red-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
            )}
            <span>{notification.message}</span>
          </div>
          <button onClick={() => setNotification(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white">
            ✕
          </button>
        </div>
      )}

      {/* Filter Bar */}
      <div className="petruz-card p-4 space-y-3.5 border border-slate-200/80 dark:border-[#361a47]">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-purple-200 flex items-center gap-2">
            <span>Filtros de Pesquisa</span>
          </span>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="inline-flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-semibold transition-colors cursor-pointer"
            >
              <FilterX className="w-3.5 h-3.5" />
              <span>Limpar Filtros</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* 1. Filtro por Vendedor */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-purple-300/80 mb-1 flex items-center gap-1">
              <User className="w-3.5 h-3.5 text-indigo-500" />
              <span>Vendedor</span>
            </label>
            <input
              type="text"
              list="salesperson-options"
              placeholder="Todos ou digite o vendedor..."
              value={salesPersonFilter}
              onChange={(e) => setSalesPersonFilter(e.target.value)}
              className="w-full bg-slate-50 dark:bg-[#130b1a] border border-slate-200 dark:border-[#361a47] rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:border-[#7b1fa2] transition-all"
            />
            <datalist id="salesperson-options">
              {uniqueSalesPersons.map((sp) => (
                <option key={sp} value={sp} />
              ))}
            </datalist>
          </div>

          {/* 2. Filtro por Cliente */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-purple-300/80 mb-1 flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-emerald-500" />
              <span>Cliente</span>
            </label>
            <input
              type="text"
              list="client-options"
              placeholder="Todos ou digite o cliente..."
              value={clientFilter}
              onChange={(e) => setClientFilter(e.target.value)}
              className="w-full bg-slate-50 dark:bg-[#130b1a] border border-slate-200 dark:border-[#361a47] rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:border-[#7b1fa2] transition-all"
            />
            <datalist id="client-options">
              {uniqueClients.map((cl) => (
                <option key={cl} value={cl} />
              ))}
            </datalist>
          </div>

          {/* 3. Filtro por Data Inicial */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-purple-300/80 mb-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-blue-500" />
              <span>Data Inicial</span>
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full bg-slate-50 dark:bg-[#130b1a] border border-slate-200 dark:border-[#361a47] rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:border-[#7b1fa2] transition-all cursor-pointer"
            />
          </div>

          {/* 4. Filtro por Data Final */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-purple-300/80 mb-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-blue-500" />
              <span>Data Final</span>
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full bg-slate-50 dark:bg-[#130b1a] border border-slate-200 dark:border-[#361a47] rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:border-[#7b1fa2] transition-all cursor-pointer"
            />
          </div>
        </div>

        {/* Busca por texto geral (Manifesto, Placa, Motorista, Destino) */}
        <div className="relative pt-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por número da montagem (ex: MC-2026-0001), placa, motorista ou destino..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-50 dark:bg-[#130b1a] border border-slate-200 dark:border-[#361a47] rounded-xl pl-10 pr-4 py-2 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:border-[#7b1fa2] transition-all"
          />
        </div>
      </div>

      {/* KPI Cards com os resultados filtrados */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="petruz-card p-3.5 space-y-1">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-purple-300/70 uppercase">Montagens</span>
          <div className="text-xl font-bold text-slate-900 dark:text-white font-mono">
            {filteredLoads.length} <span className="text-xs font-normal text-slate-400">cargas</span>
          </div>
        </div>
        <div className="petruz-card p-3.5 space-y-1">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-purple-300/70 uppercase">Pedidos Vinculados</span>
          <div className="text-xl font-bold text-slate-900 dark:text-white font-mono">
            {totalOrdersFiltered} <span className="text-xs font-normal text-slate-400">pedidos</span>
          </div>
        </div>
        <div className="petruz-card p-3.5 space-y-1">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-purple-300/70 uppercase">Peso Total</span>
          <div className="text-xl font-bold text-slate-900 dark:text-white font-mono">
            {totalWeightFiltered.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} <span className="text-xs font-normal text-slate-400">kg</span>
          </div>
        </div>
        <div className="petruz-card p-3.5 space-y-1">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-purple-300/70 uppercase">Valor Total</span>
          <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400 font-mono">
            R$ {totalValueFiltered.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="petruz-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-[#1a0d24] text-slate-600 dark:text-purple-300/80 font-semibold border-b border-slate-200 dark:border-[#361a47]">
              <tr>
                <th className="py-3 px-4">Nº Montagem</th>
                <th className="py-3 px-4">Data Emissão</th>
                <th className="py-3 px-4">Filial</th>
                <th className="py-3 px-4">Veículo / Motorista</th>
                <th className="py-3 px-4">Cliente</th>
                <th className="py-3 px-4">Vendedor</th>
                <th className="py-3 px-4 text-center">Pedidos</th>
                <th className="py-3 px-4 text-right">Peso (kg)</th>
                <th className="py-3 px-4 text-right">Volume</th>
                <th className="py-3 px-4 text-right">Valor Carga</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-[#361a47]/60 text-slate-700 dark:text-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={12} className="py-12 text-center text-slate-400 text-xs">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="w-6 h-6 animate-spin text-[#7b1fa2]" />
                      <span>Carregando histórico de montagens...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredLoads.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-12 text-center text-slate-400 text-xs">
                    Nenhuma montagem de carga localizada com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filteredLoads.map((load) => {
                  const clientsSummary = (load.client_names || []).slice(0, 2).join(', ');
                  const extraClients = (load.client_names || []).length > 2 ? ` +${(load.client_names || []).length - 2}` : '';
                  const vendorsSummary = (load.sales_persons || []).join(', ');

                  return (
                    <tr key={load.id} className="hover:bg-slate-50/80 dark:hover:bg-[#261536]/50 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-[#7b1fa2] dark:text-purple-400">
                        {load.load_number}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        {new Date(load.created_at).toLocaleString('pt-BR')}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-800 dark:text-purple-200 truncate max-w-[140px]" title={load.branch_name}>
                          {load.branch_name || 'Matriz'}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 dark:text-white">{load.plate}</div>
                        <div className="text-[11px] text-slate-500 dark:text-purple-300/70">{load.driver_name}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-slate-900 dark:text-white truncate max-w-[180px]" title={(load.client_names || []).join(', ')}>
                          {clientsSummary || 'Cliente SAP'}{extraClients}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="text-xs text-indigo-700 dark:text-indigo-400 font-semibold truncate max-w-[150px]" title={vendorsSummary || 'Não informado'}>
                          {vendorsSummary || '-'}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-center font-semibold">
                        {load.order_count}
                      </td>
                      <td className="py-3.5 px-4 text-right font-semibold">
                        {load.total_weight_kg.toLocaleString('pt-BR')} kg
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {load.total_volume_m3.toFixed(1)} m³
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
                        R$ {load.total_value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                            load.status === 'closed'
                              ? 'bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                              : load.status === 'cancelled'
                              ? 'bg-red-50 dark:bg-red-950/80 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800'
                              : 'bg-amber-50 dark:bg-amber-950/80 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                          }`}
                        >
                          {load.status === 'closed' ? 'Fechada' : load.status === 'cancelled' ? 'Cancelada' : 'Rascunho'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => openPdf(load)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#7b1fa2] hover:bg-[#6b21a8] text-white font-semibold text-[11px] shadow-sm transition-all cursor-pointer"
                            title="Visualizar / Imprimir PDF"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>PDF</span>
                          </button>
                          <button
                            onClick={() => openManageModal(load)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-[#361a47] bg-white dark:bg-[#1a0d24] hover:bg-slate-50 dark:hover:bg-[#261536] text-slate-700 dark:text-purple-200 font-semibold text-[11px] transition-all cursor-pointer"
                            title="Gerenciar / Desvincular Pedidos da Carga"
                          >
                            <Settings className="w-3.5 h-3.5" />
                            <span>Gerenciar</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Gerenciamento / Desvinculação de Pedidos da Carga */}
      {manageLoad && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-3 sm:p-6 overflow-y-auto">
          <div className="bg-white dark:bg-[#1d1026] border border-slate-200 dark:border-[#361a47] rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl animate-in fade-in zoom-in-95">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-[#361a47] bg-slate-50/60 dark:bg-[#1a0d24]">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-purple-50 dark:bg-[#261536] text-[#7b1fa2] dark:text-purple-400">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    Gerenciar Pedidos da Carga {manageLoad.load_number}
                    <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-[#261536] text-slate-700 dark:text-purple-300 font-mono">
                      Veículo: {manageLoad.plate}
                    </span>
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-purple-300/80">
                    Desvincule pedidos individuais para liberar peso ou desmonte a carga para liberar o veículo
                  </p>
                </div>
              </div>

              <button
                onClick={() => setManageLoad(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#261536] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4 flex-1 overflow-y-auto bg-[#f8f9fa] dark:bg-[#130b1a]">
              {/* Summary Bar */}
              <div className="grid grid-cols-4 gap-3 text-center text-xs">
                <div className="bg-white dark:bg-[#1a0d24] p-2.5 rounded-xl border border-slate-200 dark:border-[#361a47]">
                  <span className="text-[10px] text-slate-500 dark:text-purple-300/70 uppercase tracking-wider">Pedidos</span>
                  <div className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">{manageLoad.order_count}</div>
                </div>
                <div className="bg-white dark:bg-[#1a0d24] p-2.5 rounded-xl border border-slate-200 dark:border-[#361a47]">
                  <span className="text-[10px] text-slate-500 dark:text-purple-300/70 uppercase tracking-wider">Peso Total</span>
                  <div className="text-sm font-bold text-[#7b1fa2] dark:text-purple-400 mt-0.5">{manageLoad.total_weight_kg.toLocaleString('pt-BR')} kg</div>
                </div>
                <div className="bg-white dark:bg-[#1a0d24] p-2.5 rounded-xl border border-slate-200 dark:border-[#361a47]">
                  <span className="text-[10px] text-slate-500 dark:text-purple-300/70 uppercase tracking-wider">Volume</span>
                  <div className="text-sm font-bold text-indigo-600 dark:text-indigo-400 mt-0.5">{manageLoad.total_volume_m3.toFixed(1)} m³</div>
                </div>
                <div className="bg-white dark:bg-[#1a0d24] p-2.5 rounded-xl border border-slate-200 dark:border-[#361a47]">
                  <span className="text-[10px] text-slate-500 dark:text-purple-300/70 uppercase tracking-wider">Valor Total</span>
                  <div className="text-sm font-bold text-emerald-700 dark:text-emerald-400 mt-0.5">R$ {manageLoad.total_value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                </div>
              </div>

              {/* Items Table */}
              <div className="rounded-xl border border-slate-200 dark:border-[#361a47] overflow-hidden bg-white dark:bg-[#1a0d24]">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-[#261536] text-slate-600 dark:text-purple-300/80 font-semibold border-b border-slate-200 dark:border-[#361a47]">
                    <tr>
                      <th className="py-2.5 px-3">Nº Pedido SAP</th>
                      <th className="py-2.5 px-3">Cliente</th>
                      <th className="py-2.5 px-3">Vendedor</th>
                      <th className="py-2.5 px-3">Destino</th>
                      <th className="py-2.5 px-3 text-right">Peso (kg)</th>
                      <th className="py-2.5 px-3 text-right">Volume</th>
                      <th className="py-2.5 px-3 text-right">Valor Total</th>
                      <th className="py-2.5 px-3 text-center">Desvincular</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-[#361a47]/60 text-slate-700 dark:text-slate-200">
                    {manageLoad.orders && manageLoad.orders.length > 0 ? (
                      manageLoad.orders.map((item: LoadItem) => (
                        <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-[#261536]/40 transition-colors">
                          <td className="py-2.5 px-3 font-mono font-bold text-[#7b1fa2] dark:text-purple-400">
                            #{item.doc_num}
                          </td>
                          <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-white truncate max-w-[180px]">
                            {item.card_name}
                          </td>
                          <td className="py-2.5 px-3 text-indigo-600 dark:text-indigo-400 font-semibold text-[11px] truncate max-w-[140px]">
                            {item.sales_person_name || '-'}
                          </td>
                          <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">
                            {item.ship_to_city} - {item.ship_to_state}
                          </td>
                          <td className="py-2.5 px-3 text-right font-semibold">
                            {item.weight_kg.toLocaleString('pt-BR')} kg
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            {item.volume_m3.toFixed(2)} m³
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-emerald-700 dark:text-emerald-400">
                            R$ {item.doc_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <button
                              onClick={() => handleRemoveItemFromExistingLoad(item.id, item.doc_num)}
                              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-50 dark:bg-red-950/60 hover:bg-red-100 dark:hover:bg-red-900 text-red-600 dark:text-red-300 text-[11px] font-semibold border border-red-200 dark:border-red-800 transition-colors mx-auto cursor-pointer"
                              title="Desvincular este pedido da carga"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-red-500" />
                              <span>Desvincular</span>
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-slate-400 text-xs">
                          Nenhum pedido vinculado restante nesta carga.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-6 py-3.5 border-t border-slate-100 dark:border-[#361a47] bg-white dark:bg-[#1a0d24]">
              <button
                onClick={() => setDisassemblingLoad({ id: manageLoad.id, loadNumber: manageLoad.load_number })}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-red-50 dark:bg-red-950/80 hover:bg-red-100 dark:hover:bg-red-900 text-red-700 dark:text-red-300 text-xs font-bold border border-red-200 dark:border-red-800 transition-colors cursor-pointer"
              >
                <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
                <span>Desmontar Carga & Liberar Veículo</span>
              </button>

              <button
                onClick={() => setManageLoad(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-[#261536] hover:bg-slate-200 dark:hover:bg-[#361a47] transition-colors cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Disassemble Justification Modal */}
      {disassemblingLoad && (
        <DisassembleLoadModal
          isOpen={true}
          onClose={() => setDisassemblingLoad(null)}
          loadNumber={disassemblingLoad.loadNumber}
          onConfirm={handleConfirmDisassemble}
        />
      )}

      {/* PDF Modal */}
      {selectedLoad && (
        <PdfViewerModal
          isOpen={isPdfModalOpen}
          onClose={() => setIsPdfModalOpen(false)}
          loadId={selectedLoad.id}
          loadNumber={selectedLoad.load_number}
          isClosed={selectedLoad.status === 'closed'}
        />
      )}
    </div>
  );
};
