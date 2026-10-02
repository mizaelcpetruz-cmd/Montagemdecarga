import React, { useState, useEffect } from 'react';
import { sapService, branchService } from '../services/api';
import { SapOrder, Branch } from '../types';
import { OrderDetailsModal } from '../components/OrderDetailsModal';
import { 
  Search, 
  RefreshCw, 
  Eye, 
  Server, 
  Building2, 
  Calendar,
  PackageCheck,
  FileCheck2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Filter,
  CalendarRange,
  User
} from 'lucide-react';

export const SapOrdersPage: React.FC = () => {
  const [orders, setOrders] = useState<SapOrder[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<number | 'all'>('all');
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [search, setSearch] = useState('');
  const [salesPerson, setSalesPerson] = useState('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [selectedOrder, setSelectedOrder] = useState<SapOrder | null>(null);

  // Paginação: 15 itens por página
  const [currentPage, setCurrentPage] = useState<number>(1);
  const PAGE_SIZE = 15;

  // Carrega lista de filiais ativas diretamente do banco de dados (resposta instantânea)
  useEffect(() => {
    const loadInitialBranches = async () => {
      try {
        const branchList = await branchService.list();
        const activeOnly = branchList.filter((b) => b.is_active === 1);
        setBranches(activeOnly);
      } catch (err) {
        console.error('Erro ao carregar filiais do banco:', err);
      }
    };
    loadInitialBranches();
  }, []);

  const handleFilterOrders = async () => {
    try {
      setLoading(true);
      setHasSearched(true);
      setCurrentPage(1);

      const branchParam = selectedBranchId === 'all' ? undefined : selectedBranchId;
      const ordersRes = await sapService.getOrders({ 
        search, 
        branchId: branchParam,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        salesPerson: salesPerson || undefined,
      });
      setOrders(ordersRes);
    } catch (err: any) {
      console.error('Erro ao buscar pedidos SAP:', err);
    } finally {
      setLoading(false);
    }
  };

  // Cálculos de Totais
  const totalWeight = orders.reduce((sum, o) => sum + (o.TotalWeightKg || 0), 0);
  const totalValue = orders.reduce((sum, o) => sum + (o.DocTotal || 0), 0);
  const totalPallets = orders.reduce((sum, o) => sum + (o.EstimatedPallets || 0), 0);

  // Paginação
  const totalPages = Math.max(1, Math.ceil(orders.length / PAGE_SIZE));
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const paginatedOrders = orders.slice(startIndex, startIndex + PAGE_SIZE);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      window.scrollTo({ top: 350, behavior: 'smooth' });
    }
  };

  // Gerador de páginas visíveis
  const getPageNumbers = () => {
    const pages: number[] = [];
    const maxVisible = 5;
    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);

    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  };

  return (
    <div className="space-y-6 w-full pb-16 transition-all duration-300">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <PackageCheck className="w-6 h-6 text-[#7b1fa2]" />
            <span>Pedidos de Venda SAP (Em Aberto)</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-purple-300/80 mt-0.5">
            Filtre por data, filial e vendedor para consultar os pedidos sem Nota Fiscal vinculada diretamente no SAP Business One.
          </p>
        </div>

        {hasSearched && (
          <button
            onClick={handleFilterOrders}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#7b1fa2] hover:bg-[#6b21a8] text-white text-xs font-bold shadow-md shadow-purple-950/20 transition-all cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Atualizar Consulta</span>
          </button>
        )}
      </div>

      {/* Informative Banner */}
      <div className="petruz-card p-4 flex flex-wrap items-center justify-between gap-4 border border-indigo-200/60 dark:border-indigo-900/40 bg-indigo-50/20 dark:bg-[#150a21]">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-950/20">
            <Server className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>SAP Service Layer</span>
              <span className="text-[10px] font-mono bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded border border-indigo-200 dark:border-indigo-800">
                /Orders & /SalesPersons
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1.5 rounded-xl border border-emerald-200 dark:border-emerald-800/60">
          <FileCheck2 className="w-4 h-4" />
          <span>Regra: Pedidos com Lista de Picking Liberada no SAP (Sem NF)</span>
        </div>
      </div>

      {/* Toolbar de Filtros (Data, Filial, Vendedor, Busca) */}
      <div className="petruz-card p-4 space-y-3 border border-purple-100 dark:border-[#361a47]">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 items-end">
          {/* Filial */}
          <div>
            <label className="text-[11px] font-bold text-slate-700 dark:text-purple-200 flex items-center gap-1.5 mb-1">
              <Building2 className="w-3.5 h-3.5 text-[#7b1fa2]" />
              <span>Filial Ativa:</span>
            </label>
            <select
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value === 'all' ? 'all' : Number(e.target.value))}
              className="bg-slate-50 dark:bg-[#130b1a] border border-slate-200 dark:border-[#361a47] rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:border-[#7b1fa2] transition-all cursor-pointer w-full"
            >
              <option value="all">🌐 Todas as Filiais ({branches.length})</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  🏢 [{b.code}] {b.name}
                </option>
              ))}
            </select>
          </div>

          {/* Vendedor */}
          <div>
            <label className="text-[11px] font-bold text-slate-700 dark:text-purple-200 flex items-center gap-1.5 mb-1">
              <User className="w-3.5 h-3.5 text-[#7b1fa2]" />
              <span>Vendedor:</span>
            </label>
            <input
              type="text"
              placeholder="Nome do vendedor..."
              value={salesPerson}
              onChange={(e) => setSalesPerson(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleFilterOrders();
              }}
              className="bg-slate-50 dark:bg-[#130b1a] border border-slate-200 dark:border-[#361a47] rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:border-[#7b1fa2] transition-all w-full"
            />
          </div>

          {/* Data Inicial */}
          <div>
            <label className="text-[11px] font-bold text-slate-700 dark:text-purple-200 flex items-center gap-1.5 mb-1">
              <Calendar className="w-3.5 h-3.5 text-[#7b1fa2]" />
              <span>Data Inicial:</span>
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-slate-50 dark:bg-[#130b1a] border border-slate-200 dark:border-[#361a47] rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:border-[#7b1fa2] transition-all cursor-pointer w-full"
            />
          </div>

          {/* Data Final */}
          <div>
            <label className="text-[11px] font-bold text-slate-700 dark:text-purple-200 flex items-center gap-1.5 mb-1">
              <Calendar className="w-3.5 h-3.5 text-[#7b1fa2]" />
              <span>Data Final:</span>
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-slate-50 dark:bg-[#130b1a] border border-slate-200 dark:border-[#361a47] rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:border-[#7b1fa2] transition-all cursor-pointer w-full"
            />
          </div>

          {/* Botão de Filtragem */}
          <div>
            <button
              type="button"
              onClick={handleFilterOrders}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-[#7b1fa2] hover:bg-[#6b21a8] text-white text-xs font-bold shadow-md shadow-purple-950/20 transition-all cursor-pointer h-[38px] active:scale-98 disabled:opacity-50"
            >
              <Filter className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>{loading ? 'Buscando...' : 'Filtrar Pedidos'}</span>
            </button>
          </div>
        </div>

        {/* Busca por texto adicional */}
        <div className="relative pt-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Pesquisar por Nº do pedido, cliente, vendedor, código, cidade, picking..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleFilterOrders();
            }}
            className="w-full bg-slate-50 dark:bg-[#130b1a] border border-slate-200 dark:border-[#361a47] rounded-xl pl-10 pr-4 py-2 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:border-[#7b1fa2] transition-all"
          />
        </div>
      </div>

      {!hasSearched ? (
        /* Card Informativo antes da primeira busca */
        <div className="petruz-card p-12 text-center text-slate-400 dark:text-purple-300/60 space-y-4 border-dashed border-2">
          <CalendarRange className="w-12 h-12 mx-auto text-[#7b1fa2] opacity-50" />
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-slate-800 dark:text-purple-200">
              Pronto para consultar pedidos de venda liberados
            </h3>
            <p className="text-xs max-w-md mx-auto">
              Defina o período e os filtros acima para consultar os pedidos com lista de picking liberada na Service Layer.
            </p>
          </div>
          <button
            type="button"
            onClick={handleFilterOrders}
            disabled={loading}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#7b1fa2] hover:bg-[#6b21a8] text-white text-xs font-bold shadow-md shadow-purple-950/20 transition-all cursor-pointer"
          >
            <Filter className="w-4 h-4" />
            <span>Buscar Pedidos Liberados no Picking</span>
          </button>
        </div>
      ) : (
        <>
          {/* Summary KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="petruz-card p-3.5 space-y-1">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-purple-300/70 uppercase">Pedidos Retornados</span>
              <div className="text-xl font-bold text-slate-900 dark:text-white font-mono">
                {orders.length} <span className="text-xs font-normal text-slate-400">pedidos</span>
              </div>
            </div>
            <div className="petruz-card p-3.5 space-y-1">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-purple-300/70 uppercase">Peso Total</span>
              <div className="text-xl font-bold text-slate-900 dark:text-white font-mono">
                {totalWeight.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} <span className="text-xs font-normal text-slate-400">kg</span>
              </div>
            </div>
            <div className="petruz-card p-3.5 space-y-1">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-purple-300/70 uppercase">Paletes Estimados</span>
              <div className="text-xl font-bold text-slate-900 dark:text-white font-mono">
                {totalPallets} <span className="text-xs font-normal text-slate-400">paletes</span>
              </div>
            </div>
            <div className="petruz-card p-3.5 space-y-1">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-purple-300/70 uppercase">Valor Total</span>
              <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                R$ {totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
          </div>

          {/* Orders Grid */}
          {loading ? (
            <div className="petruz-card p-12 text-center text-slate-400 space-y-3">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto text-[#7b1fa2]" />
              <p className="text-xs font-semibold">Consultando pedidos com picking liberado no SAP Service Layer...</p>
            </div>
          ) : orders.length === 0 ? (
            <div className="petruz-card p-12 text-center text-slate-400 dark:text-purple-300/60 space-y-3 border-dashed border-2">
              <PackageCheck className="w-10 h-10 mx-auto opacity-40 text-[#7b1fa2]" />
              <h3 className="text-sm font-bold text-slate-700 dark:text-purple-200">
                Nenhum pedido com picking liberado encontrado
              </h3>
              <p className="text-xs max-w-md mx-auto">
                Não existem pedidos de venda com lista de picking liberada para as datas e filtros informados.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {paginatedOrders.map((order) => (
                  <div
                    key={order.DocEntry}
                    className="petruz-card petruz-card-hover p-4 flex flex-col justify-between space-y-3 border border-slate-200/80 dark:border-[#361a47]"
                  >
                    <div>
                      <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 dark:border-[#361a47]">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs font-bold text-[#7b1fa2] dark:text-purple-400">
                            Pedido #{order.DocNum}
                          </span>
                          {order.PickListId && (
                            <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 flex items-center gap-1" title={`Lista de Picking SAP: #${order.PickListId}`}>
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              Picking #{order.PickListId}
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60 px-2 py-0.5 rounded-full uppercase">
                          {order.PickStatusDescription || 'Liberado'}
                        </span>
                      </div>

                      <div className="mt-3 space-y-1.5">
                        <div className="text-xs font-bold text-slate-900 dark:text-white truncate" title={order.CardName}>
                          {order.CardName}
                        </div>
                        <div className="text-[11px] text-slate-600 dark:text-purple-300/80 flex items-center gap-1.5 font-medium">
                          <Building2 className="w-3.5 h-3.5 text-[#7b1fa2] shrink-0" />
                          <span className="truncate">{order.BPLName || `Filial #${order.BPLId || '-'}`}</span>
                        </div>
                        <div className="text-[11px] text-slate-600 dark:text-purple-300/80 flex items-center gap-1.5 font-medium">
                          <User className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                          <span className="truncate">Vendedor: <strong className="text-slate-800 dark:text-slate-200">{order.SalesPersonName || 'Não informado'}</strong></span>
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-purple-300/70 flex items-center gap-1.5">
                          <span className="font-semibold text-slate-700 dark:text-slate-300">Destino:</span>
                          <span>{order.ShipToCity} - {order.ShipToState}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-purple-300/70 flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>Emissão: {order.DocDate ? new Date(order.DocDate).toLocaleDateString('pt-BR') : '-'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100 dark:border-[#361a47] space-y-3">
                      <div className="grid grid-cols-3 gap-2 text-center text-[10px] bg-slate-50 dark:bg-[#130b1a] p-2 rounded-xl border border-slate-100 dark:border-[#361a47]">
                        <div>
                          <div className="text-slate-500 dark:text-purple-300/60 font-medium">Peso</div>
                          <div className="font-bold text-slate-800 dark:text-slate-100 mt-0.5 font-mono">
                            {order.TotalWeightKg.toLocaleString('pt-BR')} kg
                          </div>
                        </div>
                        <div>
                          <div className="text-slate-500 dark:text-purple-300/60 font-medium">Volume</div>
                          <div className="font-bold text-slate-800 dark:text-slate-100 mt-0.5 font-mono">
                            {order.TotalVolumeM3.toFixed(2)} m³
                          </div>
                        </div>
                        <div>
                          <div className="text-slate-500 dark:text-purple-300/60 font-medium">Paletes</div>
                          <div className="font-bold text-slate-800 dark:text-slate-100 mt-0.5 font-mono">
                            {order.EstimatedPallets} un
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-[10px] text-slate-400 dark:text-purple-300/60 uppercase tracking-wider font-semibold">Valor Pedido</span>
                          <div className="text-sm font-bold text-emerald-700 dark:text-emerald-400 font-mono">
                            R$ {order.DocTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </div>
                        </div>

                        <button
                          onClick={() => setSelectedOrder(order)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-purple-200 dark:border-purple-800 text-[#7b1fa2] dark:text-purple-300 bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 dark:hover:bg-purple-900/50 text-xs font-bold transition-colors cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Ver Itens</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Rodapé com Paginação (15 em 15) */}
              {orders.length > PAGE_SIZE && (
                <div className="petruz-card p-4 flex flex-col sm:flex-row items-center justify-between gap-4 border border-slate-200 dark:border-[#361a47]">
                  <div className="text-xs text-slate-600 dark:text-purple-300/80">
                    Exibindo <strong className="text-slate-900 dark:text-white font-mono">{startIndex + 1}</strong> a{' '}
                    <strong className="text-slate-900 dark:text-white font-mono">{Math.min(startIndex + PAGE_SIZE, orders.length)}</strong> de{' '}
                    <strong className="text-slate-900 dark:text-white font-mono">{orders.length}</strong> pedidos
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* Primeira Página */}
                    <button
                      onClick={() => handlePageChange(1)}
                      disabled={currentPage === 1}
                      className="p-2 rounded-lg border border-slate-200 dark:border-[#361a47] bg-white dark:bg-[#1a0d24] text-slate-600 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-[#261536] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      title="Primeira Página"
                    >
                      <ChevronsLeft className="w-4 h-4" />
                    </button>

                    {/* Página Anterior */}
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="p-2 rounded-lg border border-slate-200 dark:border-[#361a47] bg-white dark:bg-[#1a0d24] text-slate-600 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-[#261536] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      title="Página Anterior"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>

                    {/* Botões de Numeração */}
                    <div className="flex items-center gap-1">
                      {getPageNumbers().map((num) => (
                        <button
                          key={num}
                          onClick={() => handlePageChange(num)}
                          className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                            currentPage === num
                              ? 'bg-[#7b1fa2] text-white shadow-sm'
                              : 'border border-slate-200 dark:border-[#361a47] bg-white dark:bg-[#1a0d24] text-slate-700 dark:text-purple-200 hover:bg-slate-50 dark:hover:bg-[#261536]'
                          }`}
                        >
                          {num}
                        </button>
                      ))}
                    </div>

                    {/* Próxima Página */}
                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="p-2 rounded-lg border border-slate-200 dark:border-[#361a47] bg-white dark:bg-[#1a0d24] text-slate-600 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-[#261536] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      title="Próxima Página"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>

                    {/* Última Página */}
                    <button
                      onClick={() => handlePageChange(totalPages)}
                      disabled={currentPage === totalPages}
                      className="p-2 rounded-lg border border-slate-200 dark:border-[#361a47] bg-white dark:bg-[#1a0d24] text-slate-600 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-[#261536] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      title="Última Página"
                    >
                      <ChevronsRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Modal de Detalhes do Pedido */}
      <OrderDetailsModal
        isOpen={!!selectedOrder}
        onClose={() => setSelectedOrder(null)}
        order={selectedOrder}
      />
    </div>
  );
};
