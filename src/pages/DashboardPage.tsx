import React, { useEffect, useState } from 'react';
import { 
  Plus, 
  FileText, 
  Eye,
  ArrowRight,
  PackageSearch,
  Truck,
  Layers
} from 'lucide-react';
import { loadService, sapService } from '../services/api';
import { LoadAssembly, SapOrder } from '../types';
import { PdfViewerModal } from '../components/PdfViewerModal';
import { OrderDetailsModal } from '../components/OrderDetailsModal';

interface DashboardPageProps {
  onNavigate: (tab: string) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate }) => {
  const [loads, setLoads] = useState<LoadAssembly[]>([]);
  const [sapOrders, setSapOrders] = useState<SapOrder[]>([]);
  const [selectedLoadForPdf, setSelectedLoadForPdf] = useState<{ id: string; num: string } | null>(null);
  const [inspectedOrder, setInspectedOrder] = useState<SapOrder | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [loadsRes, ordersRes] = await Promise.all([
          loadService.list(),
          sapService.getOrders(),
        ]);
        setLoads(loadsRes);
        setSapOrders(ordersRes);
      } catch (err) {
        console.error('Erro ao carregar dados do painel:', err);
      }
    };
    loadData();
  }, []);

  // Datas de referência (Hoje e Mês Atual)
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const currentMonthStr = now.toISOString().slice(0, 7); // ex: "2026-09"
  const monthName = now.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  // 1. Pedidos de Hoje (SAP)
  const todayOrders = sapOrders.filter(
    (o) => o.DocDate === todayStr || (o.DocDate && o.DocDate.startsWith(todayStr))
  );

  // 2. Cargas de Hoje (Montadas)
  const todayLoads = loads.filter((l) => {
    if (!l.created_at) return false;
    return l.created_at.startsWith(todayStr);
  });
  const todayMountedCount = todayLoads.filter((l) => l.status !== 'cancelled').length;

  // 3. Quantidade Total de Cargas no Mês
  const monthLoads = loads.filter((l) => {
    if (!l.created_at) return false;
    return l.created_at.slice(0, 7) === currentMonthStr || l.created_at.startsWith(currentMonthStr);
  });
  const totalMonthLoadsCount = monthLoads.length;

  return (
    <div className="space-y-6 w-full pb-16 transition-all duration-300">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Painel de Expedição
          </h1>
          <p className="text-xs text-slate-500 dark:text-purple-300/80 mt-0.5">
            Pedidos de hoje, cargas montadas no dia e total consolidado do mês.
          </p>
        </div>

        <button
          onClick={() => onNavigate('load-builder')}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#7b1fa2] hover:bg-[#6b21a8] text-white font-bold text-xs shadow-sm transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Montagem de Carga</span>
        </button>
      </div>

      {/* 2 KPI Cards Resumidos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* KPI 1: Cargas Montadas Hoje */}
        <div className="petruz-card p-5 text-center border-l-4 border-l-[#7b1fa2]">
          <div className="flex items-center justify-center gap-1.5 text-[11px] text-[#7b1fa2] dark:text-purple-300 font-bold uppercase tracking-wider">
            <Layers className="w-4 h-4" />
            <span>Cargas Montadas Hoje</span>
          </div>
          <div className="text-3xl font-black text-slate-900 dark:text-white mt-1.5">
            {todayMountedCount}
          </div>
          <div className="text-xs text-slate-500 dark:text-purple-300/70 mt-0.5">
            Criadas no dia
          </div>
        </div>

        {/* KPI 2: Quantidade Total no Mês */}
        <div className="petruz-card p-5 text-center border-l-4 border-l-indigo-600">
          <div className="flex items-center justify-center gap-1.5 text-[11px] text-indigo-600 dark:text-indigo-400 font-bold uppercase tracking-wider">
            <Truck className="w-4 h-4" />
            <span>Total no Mês</span>
          </div>
          <div className="text-3xl font-black text-slate-900 dark:text-white mt-1.5">
            {totalMonthLoadsCount}
          </div>
          <div className="text-xs text-slate-500 dark:text-purple-300/70 mt-0.5">
            Cargas em {monthName}
          </div>
        </div>
      </div>

      {/* Seção 1: Pedidos de Hoje (SAP) */}
      <div className="petruz-card p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="w-3 h-3 rounded-full bg-[#7b1fa2]" />
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Pedidos de Hoje ({new Date().toLocaleDateString('pt-BR')})
              </h2>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-50 dark:bg-purple-950/80 text-[#7b1fa2] dark:text-purple-300 border border-purple-200 dark:border-purple-800 font-bold">
                {todayOrders.length} Pedidos
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-purple-300/80 mt-0.5 pl-5.5">
              Pedidos de venda do SAP disponíveis para montagem de carga hoje.
            </p>
          </div>

          <button
            onClick={() => onNavigate('sap-orders')}
            className="flex items-center gap-1 text-xs text-[#7b1fa2] dark:text-purple-400 hover:text-[#5c137a] dark:hover:text-purple-300 font-bold cursor-pointer"
          >
            <span>Ver Todos</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {todayOrders.length === 0 ? (
          <div className="p-8 rounded-xl border border-dashed border-slate-200 dark:border-[#361a47] text-center bg-slate-50/50 dark:bg-[#1a0d24]/50">
            <PackageSearch className="w-8 h-8 text-slate-300 dark:text-purple-400/50 mx-auto mb-2" />
            <div className="text-xs text-slate-500 dark:text-purple-300/70">
              Nenhum pedido lançado na data de hoje.
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {todayOrders.map((order) => (
              <div
                key={order.DocEntry}
                className="p-3.5 rounded-xl border border-slate-200 dark:border-[#361a47] hover:border-purple-200 dark:hover:border-purple-600 bg-white dark:bg-[#1a0d24] flex flex-wrap items-center justify-between gap-3 transition-colors shadow-sm"
              >
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span className="font-mono text-[#7b1fa2] dark:text-purple-400">#{order.DocNum}</span>
                    <span>- {order.CardName}</span>
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-purple-300/70 mt-0.5">
                    Destino: <strong className="text-slate-700 dark:text-purple-200">{order.ShipToCity}/{order.ShipToState}</strong> • Peso: <strong className="text-slate-700 dark:text-purple-200">{order.TotalWeightKg.toLocaleString('pt-BR')} kg</strong> • Volume: <strong className="text-slate-700 dark:text-purple-200">{order.TotalVolumeM3} m³</strong> • R$ {order.DocTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setInspectedOrder(order)}
                    className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
                    title="Ver itens do pedido"
                  >
                    <Eye className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => onNavigate('load-builder')}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#7b1fa2] hover:bg-[#6b21a8] text-white text-[11px] font-bold shadow-sm transition-colors cursor-pointer"
                  >
                    <span>Montar Carga</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Seção 2: Cargas de Hoje (Montadas e Expedidas) */}
      <div className="petruz-card p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="w-3 h-3 rounded-full bg-emerald-600" />
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Cargas de Hoje (Montadas & Expedidas)
              </h2>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-bold">
                {todayLoads.length} Cargas Hoje
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-purple-300/80 mt-0.5 pl-5.5">
              Romaneios e montagens gerados ou despachados na data de hoje.
            </p>
          </div>

          <button
            onClick={() => onNavigate('loads-history')}
            className="flex items-center gap-1 text-xs text-[#7b1fa2] dark:text-purple-400 hover:text-[#5c137a] dark:hover:text-purple-300 font-bold cursor-pointer"
          >
            <span>Ver Histórico</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {todayLoads.length === 0 ? (
          <div className="p-8 rounded-xl border border-dashed border-slate-200 dark:border-[#361a47] text-center bg-slate-50/50 dark:bg-[#1a0d24]/50">
            <Truck className="w-8 h-8 text-slate-300 dark:text-purple-400/50 mx-auto mb-2" />
            <div className="text-xs text-slate-500 dark:text-purple-300/70">
              Nenhuma carga montada ou expedida hoje até o momento.
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {todayLoads.map((load) => (
              <div
                key={load.id}
                className="p-3.5 rounded-xl border border-slate-200 dark:border-[#361a47] hover:border-emerald-200 dark:hover:border-emerald-600 bg-white dark:bg-[#1a0d24] flex flex-wrap items-center justify-between gap-3 transition-colors shadow-sm"
              >
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span className="font-mono text-[#7b1fa2] dark:text-purple-400">{load.load_number}</span>
                    <span>- Veículo {load.plate} ({load.vehicle_model || load.vehicle_type})</span>
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-purple-300/70 mt-0.5">
                    Motorista: {load.driver_name} • {load.order_count} pedidos • {load.total_weight_kg.toLocaleString('pt-BR')} kg • R$ {load.total_value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase ${
                      load.status === 'closed'
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                        : load.status === 'cancelled'
                        ? 'bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800'
                        : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                    }`}
                  >
                    {load.status === 'closed' ? 'Expedida' : load.status === 'cancelled' ? 'Cancelada' : 'Montada (Rascunho)'}
                  </span>

                  <button
                    onClick={() => setSelectedLoadForPdf({ id: load.id, num: load.load_number })}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#7b1fa2] hover:bg-[#6b21a8] text-white text-[11px] font-semibold transition-colors cursor-pointer shadow-sm"
                    title="Visualizar PDF do Romaneio"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>PDF</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modais */}
      {selectedLoadForPdf && (
        <PdfViewerModal
          isOpen={true}
          onClose={() => setSelectedLoadForPdf(null)}
          loadId={selectedLoadForPdf.id}
          loadNumber={selectedLoadForPdf.num}
        />
      )}

      {inspectedOrder && (
        <OrderDetailsModal
          isOpen={true}
          onClose={() => setInspectedOrder(null)}
          order={inspectedOrder}
        />
      )}
    </div>
  );
};
