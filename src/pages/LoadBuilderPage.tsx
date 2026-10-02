import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { 
  loadService,
  branchService,
  settingsService
} from '../services/api';
import { Vehicle, SapOrder, Branch } from '../types';
import { PdfViewerModal } from '../components/PdfViewerModal';
import { OrderDetailsModal } from '../components/OrderDetailsModal';
import { OrderSelectorModal } from '../components/OrderSelectorModal';
import { VehicleSelectorModal } from '../components/VehicleSelectorModal';
import { 
  Truck, 
  FileText, 
  Eye, 
  AlertTriangle, 
  CheckCircle2, 
  Sparkles, 
  ArrowRight, 
  Plus, 
  AlertCircle,
  HelpCircle,
  X,
  Layers,
  Scale,
  MapPin,
  Building2
} from 'lucide-react';

export const LoadBuilderPage: React.FC = () => {
  // Filiais Petruz (4 Filiais)
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);

  // Veículo Selecionado
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [isVehicleSelectorOpen, setIsVehicleSelectorOpen] = useState(false);

  // Pedidos Selecionados na Carga
  const [selectedOrders, setSelectedOrders] = useState<SapOrder[]>([]);
  const [isOrderSelectorOpen, setIsOrderSelectorOpen] = useState(false);

  // Campos do Cabeçalho ERP / SAP
  const [routeDate, setRouteDate] = useState(new Date().toISOString().split('T')[0]);
  const [loadType] = useState('Venda');
  const [layoutTitle, setLayoutTitle] = useState('CONFERÊNCIA DE LOTES LOKFRIO');
  const [observations, setObservations] = useState('');

  // Carrega filiais ativas cadastradas e configurações de layout
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [branchesData, settingsData] = await Promise.allSettled([
          branchService.list(),
          settingsService.getSettings(),
        ]);

        if (branchesData.status === 'fulfilled') {
          const activeBranches = branchesData.value.filter((b) => b.is_active === 1);
          setBranches(activeBranches);
          if (activeBranches.length > 0) {
            setSelectedBranch(activeBranches[0]);
          }
        }

        if (settingsData.status === 'fulfilled' && (settingsData.value as any)?.pdf_conference_title) {
          setLayoutTitle((settingsData.value as any).pdf_conference_title);
        }
      } catch (err) {
        console.error('Erro ao carregar dados iniciais:', err);
      }
    };
    fetchInitialData();
  }, []);

  // Modal de Detalhes
  const [inspectedOrder, setInspectedOrder] = useState<SapOrder | null>(null);

  // Modal de Informações do Auto-Preenchimento
  const [isAutoPackInfoOpen, setIsAutoPackInfoOpen] = useState(false);

  // PDF Modal
  const [createdLoad, setCreatedLoad] = useState<{ id: string; load_number: string } | null>(null);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);

  // Limpa todos os dados da tela para a próxima montagem de carga
  const resetForm = () => {
    setSelectedVehicle(null);
    setSelectedOrders([]);
    setObservations('');
    setCreatedLoad(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Estados de Processamento
  const [isAutoPacking, setIsAutoPacking] = useState(false);
  const [isSavingLoad, setIsSavingLoad] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'warning' | 'error'; message: string } | null>(null);

  // Adiciona pedidos selecionados no modal de busca SAP
  const handleAddOrders = (newOrders: SapOrder[]) => {
    setSelectedOrders((prev) => {
      const existingIds = prev.map((o) => o.DocEntry);
      const uniqueNew = newOrders.filter((o) => !existingIds.includes(o.DocEntry));
      return [...prev, ...uniqueNew];
    });

    setNotification({
      type: 'success',
      message: `${newOrders.length} pedido(s) adicionado(s) à montagem de carga.`,
    });
  };

  // Remove um pedido individual da carga
  const handleRemoveOrder = (docEntry: number) => {
    const orderToRemove = selectedOrders.find((o) => o.DocEntry === docEntry);
    setSelectedOrders((prev) => prev.filter((o) => o.DocEntry !== docEntry));

    setNotification({
      type: 'success',
      message: `Pedido #${orderToRemove?.DocNum || docEntry} desvinculado do veículo.`,
    });
  };

  // Remove o veículo selecionado da montagem
  const handleRemoveVehicle = () => {
    if (selectedVehicle) {
      const plate = selectedVehicle.plate;
      setSelectedVehicle(null);
      setNotification({
        type: 'warning',
        message: `Veículo ${plate} removido da montagem de carga.`,
      });
    }
  };

  // Totais da Carga e Saldos
  const currentWeight = selectedOrders.reduce((acc, o) => acc + o.TotalWeightKg, 0);
  const currentVolume = selectedOrders.reduce((acc, o) => acc + o.TotalVolumeM3, 0);
  const currentPallets = selectedOrders.reduce((acc, o) => acc + o.EstimatedPallets, 0);
  const totalValue = selectedOrders.reduce((acc, o) => acc + o.DocTotal, 0);

  const maxWeight = selectedVehicle?.max_weight_kg || 0;
  const maxVolume = selectedVehicle?.max_volume_m3 || 0;

  const saldoPeso = Math.max(0, maxWeight - currentWeight);
  const saldoVolume = Math.max(0, maxVolume - currentVolume);

  const weightPercent = maxWeight > 0 ? Math.min(100, Math.round((currentWeight / maxWeight) * 100)) : 0;

  // Algoritmo de Auto-Preenchimento Otimizado
  const handleAutoPack = async () => {
    if (!selectedVehicle) {
      setNotification({ type: 'warning', message: 'Selecione um veículo primeiro clicando no campo Veículo.' });
      return;
    }

    try {
      setIsAutoPacking(true);
      const result = await loadService.autoOptimize(selectedVehicle.id);

      if (result.recommendedOrders && result.recommendedOrders.length > 0) {
        setSelectedOrders(result.recommendedOrders);

        setNotification({
          type: 'success',
          message: `Auto-Otimização: ${result.recommendedOrders.length} pedidos alocados (${result.weightOccupancyPercent}% do peso do veículo).`,
        });

        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.6 },
        });
      } else {
        setNotification({
          type: 'warning',
          message: 'Nenhum pedido compatível encontrado para a capacidade do veículo.',
        });
      }
    } catch (err: any) {
      setNotification({ type: 'error', message: 'Erro na auto-otimização: ' + err.message });
    } finally {
      setIsAutoPacking(false);
    }
  };

  // Finaliza a Carga e Emite PDF
  const handleFinalizeLoad = async () => {
    if (!selectedVehicle) {
      setNotification({ type: 'warning', message: 'Por favor, selecione um veículo.' });
      return;
    }

    if (selectedOrders.length === 0) {
      setNotification({ type: 'warning', message: 'Adicione ao menos um pedido clicando no botão Pedido.' });
      return;
    }

    try {
      setIsSavingLoad(true);
      const docEntries = selectedOrders.map((o) => o.DocEntry);
      const response = await loadService.create({
        vehicleId: selectedVehicle.id,
        docEntries,
        branchId: selectedBranch?.id || 1,
        docNumber: selectedBranch?.current_doc_number || 7195,
        observations: `${observations ? observations + ' • ' : ''}Tipo: ${loadType} • Rota: ${routeDate}`,
        orders: selectedOrders,
      });

      if (response.success && response.data) {
        setCreatedLoad({ id: response.data.id, load_number: response.data.load_number });
        setIsPdfModalOpen(true);

        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.5 },
        });

        setNotification({
          type: 'success',
          message: `Montagem ${response.data.load_number} finalizada! Documento PDF gerado com sucesso.`,
        });

        // Recarrega sequenciador da filial
        if (selectedBranch) {
          setSelectedBranch({
            ...selectedBranch,
            current_doc_number: selectedBranch.current_doc_number + 1,
          });
        }
      }
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.response?.data?.message || 'Erro ao criar montagem de carga.',
      });
    } finally {
      setIsSavingLoad(false);
    }
  };

  return (
    <div className="space-y-6 w-full pb-16 transition-all duration-300">
      {/* Page Heading */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
          Painel de Montagem de Carga
        </h1>
        <p className="text-xs text-slate-500 dark:text-purple-300/80 mt-0.5">
          Parâmetros operacionais do cabeçalho, roteirização e alocação de pedidos nos veículos.
        </p>
      </div>

      {/* Toast Notification */}
      {notification && (
        <div
          className={`p-3 rounded-xl text-xs flex items-center justify-between border animate-in fade-in ${
            notification.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800/80 text-emerald-800 dark:text-emerald-300'
              : notification.type === 'warning'
              ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800/80 text-amber-800 dark:text-amber-300'
              : 'bg-red-50 dark:bg-red-950/60 border-red-200 dark:border-red-800/80 text-red-800 dark:text-red-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            )}
            <span>{notification.message}</span>
          </div>
          <button onClick={() => setNotification(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white">
            ✕
          </button>
        </div>
      )}

      {/* Main Petruz Header Card (Cabeçalho com os campos da imagem) */}
      <div className="petruz-card p-5 space-y-5 border-t-4 border-t-[#7b1fa2]">
        {/* Cabeçalho Top Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-[#361a47] pb-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#7b1fa2]" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Cabeçalho da Montagem de Carga
            </h2>
          </div>

          {/* Seletor de Filial */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-50/60 dark:bg-[#200e30] border border-purple-200 dark:border-purple-800/60 text-xs font-semibold text-purple-900 dark:text-purple-200">
              <Building2 className="w-3.5 h-3.5 text-[#7b1fa2] dark:text-purple-400" />
              <span>Filial:</span>
              <select
                value={selectedBranch?.id || 1}
                onChange={(e) => {
                  const b = branches.find((item) => item.id === Number(e.target.value));
                  if (b) setSelectedBranch(b);
                }}
                className="bg-transparent font-bold text-[#7b1fa2] dark:text-purple-300 outline-none cursor-pointer"
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.id} className="bg-white dark:bg-[#1a0d24] text-slate-800 dark:text-white">
                    {b.code} - {b.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Form Grid Exatamente como na imagem do usuário */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-2.5 text-xs">
          {/* ================= Coluna 1 ================= */}
          <div className="space-y-2.5">
            {/* Nº Documento (Até 7 dígitos) */}
            <div className="grid grid-cols-[100px_1fr] items-center gap-2">
              <label className="text-[11px] font-semibold text-slate-700 dark:text-purple-200">
                Nº Documento
              </label>
              <input
                type="text"
                readOnly
                value={selectedBranch ? String(selectedBranch.current_doc_number) : '7195'}
                className="w-full bg-slate-100 dark:bg-[#150a1f] text-slate-800 dark:text-purple-200 font-bold border border-slate-200 dark:border-[#361a47] rounded-md px-2.5 py-1 text-xs font-mono select-none outline-none cursor-not-allowed shadow-inner"
              />
            </div>

            {/* Nº Veículo */}
            <div className="grid grid-cols-[100px_1fr] items-center gap-2">
              <label className="text-[11px] font-semibold text-slate-700 dark:text-purple-200">
                Nº Veículo
              </label>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setIsVehicleSelectorOpen(true)}
                  className={`flex-1 text-left px-2.5 py-1 rounded-md border text-xs font-medium transition-colors cursor-pointer flex items-center justify-between ${
                    selectedVehicle
                      ? 'bg-white dark:bg-[#200e30] border-purple-300 dark:border-purple-800 text-slate-900 dark:text-white hover:border-[#7b1fa2]'
                      : 'bg-white dark:bg-[#200e30] border-slate-300 dark:border-[#431f5c] text-slate-400 hover:border-[#7b1fa2]'
                  }`}
                >
                  <span className="truncate">
                    {selectedVehicle ? `VEI-${selectedVehicle.id.slice(0, 4).toUpperCase()} (${selectedVehicle.plate})` : 'Selecionar veículo...'}
                  </span>
                  <Truck className="w-3.5 h-3.5 text-[#7b1fa2] dark:text-purple-400 shrink-0 ml-1" />
                </button>
                {selectedVehicle && (
                  <button
                    type="button"
                    onClick={handleRemoveVehicle}
                    className="p-1 hover:bg-red-50 dark:hover:bg-red-950/60 text-red-500 rounded border border-transparent hover:border-red-200 dark:hover:border-red-900 transition-colors"
                    title="Remover veículo selecionado"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Descrição */}
            <div className="grid grid-cols-[100px_1fr] items-center gap-2">
              <label className="text-[11px] font-semibold text-slate-700 dark:text-purple-200">
                Descrição
              </label>
              <input
                type="text"
                readOnly
                value={selectedVehicle ? `${selectedVehicle.model} (${selectedVehicle.vehicle_type})` : ''}
                placeholder="-"
                className="w-full bg-slate-100 dark:bg-[#150a1f] text-slate-700 dark:text-purple-200 border border-slate-200 dark:border-[#361a47] rounded-md px-2.5 py-1 text-xs truncate select-none outline-none cursor-not-allowed shadow-inner"
              />
            </div>

            {/* Volume (Capacidade Máx) */}
            <div className="grid grid-cols-[100px_1fr] items-center gap-2">
              <label className="text-[11px] font-semibold text-slate-700 dark:text-purple-200">
                Volume
              </label>
              <input
                type="text"
                readOnly
                value={maxVolume > 0 ? `${maxVolume.toFixed(6)} m³` : '0,000000'}
                className="w-full bg-slate-100 dark:bg-[#150a1f] text-slate-700 dark:text-purple-200 border border-slate-200 dark:border-[#361a47] rounded-md px-2.5 py-1 text-xs font-mono text-right select-none outline-none cursor-not-allowed shadow-inner"
              />
            </div>

            {/* Peso (Capacidade Máx) */}
            <div className="grid grid-cols-[100px_1fr] items-center gap-2">
              <label className="text-[11px] font-semibold text-slate-700 dark:text-purple-200">
                Peso
              </label>
              <input
                type="text"
                readOnly
                value={maxWeight > 0 ? `${maxWeight.toFixed(6)} kg` : '0,000000'}
                className="w-full bg-slate-100 dark:bg-[#150a1f] text-slate-700 dark:text-purple-200 border border-slate-200 dark:border-[#361a47] rounded-md px-2.5 py-1 text-xs font-mono text-right select-none outline-none cursor-not-allowed shadow-inner"
              />
            </div>
          </div>

          {/* ================= Coluna 2 ================= */}
          <div className="space-y-2.5">
            {/* Data da Rota */}
            <div className="grid grid-cols-[100px_1fr] items-center gap-2">
              <label className="text-[11px] font-semibold text-slate-700 dark:text-purple-200">
                Data da Rota
              </label>
              <input
                type="date"
                value={routeDate}
                onChange={(e) => setRouteDate(e.target.value)}
                className="w-full bg-white dark:bg-[#200e30] text-slate-900 dark:text-white border border-slate-300 dark:border-[#431f5c] focus:border-[#7b1fa2] rounded-md px-2.5 py-1 text-xs outline-none"
              />
            </div>

            {/* Placa Veículo */}
            <div className="grid grid-cols-[100px_1fr] items-center gap-2">
              <label className="text-[11px] font-semibold text-slate-700 dark:text-purple-200">
                Placa Veículo
              </label>
              <input
                type="text"
                readOnly
                value={selectedVehicle ? selectedVehicle.plate : ''}
                placeholder="-"
                className="w-full bg-slate-100 dark:bg-[#150a1f] text-slate-700 dark:text-purple-200 border border-slate-200 dark:border-[#361a47] rounded-md px-2.5 py-1 text-xs font-mono font-bold select-none outline-none cursor-not-allowed shadow-inner"
              />
            </div>

            {/* Valor Carga */}
            <div className="grid grid-cols-[100px_1fr] items-center gap-2">
              <label className="text-[11px] font-semibold text-slate-700 dark:text-purple-200">
                Valor Carga
              </label>
              <input
                type="text"
                readOnly
                value={`R$ ${totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                className="w-full bg-slate-100 dark:bg-[#150a1f] text-emerald-700 dark:text-emerald-400 font-bold border border-slate-200 dark:border-[#361a47] rounded-md px-2.5 py-1 text-xs font-mono text-right select-none outline-none cursor-not-allowed shadow-inner"
              />
            </div>

            {/* Volume Carga */}
            <div className="grid grid-cols-[100px_1fr] items-center gap-2">
              <label className="text-[11px] font-semibold text-slate-700 dark:text-purple-200">
                Volume Carga
              </label>
              <input
                type="text"
                readOnly
                value={currentVolume > 0 ? `${currentVolume.toFixed(6)} m³` : '0,000000'}
                className="w-full bg-slate-100 dark:bg-[#150a1f] text-slate-700 dark:text-purple-200 border border-slate-200 dark:border-[#361a47] rounded-md px-2.5 py-1 text-xs font-mono text-right select-none outline-none cursor-not-allowed shadow-inner"
              />
            </div>

            {/* Peso Carga */}
            <div className="grid grid-cols-[100px_1fr] items-center gap-2">
              <label className="text-[11px] font-semibold text-slate-700 dark:text-purple-200">
                Peso Carga
              </label>
              <input
                type="text"
                readOnly
                value={currentWeight > 0 ? `${currentWeight.toFixed(6)} kg` : '0,000000'}
                className="w-full bg-slate-100 dark:bg-[#150a1f] text-slate-700 dark:text-purple-200 border border-slate-200 dark:border-[#361a47] rounded-md px-2.5 py-1 text-xs font-mono text-right select-none outline-none cursor-not-allowed shadow-inner"
              />
            </div>
          </div>

          {/* ================= Coluna 3 ================= */}
          <div className="space-y-2.5">
            {/* Tipo (Fixo: Venda) */}
            <div className="grid grid-cols-[100px_1fr] items-center gap-2">
              <label className="text-[11px] font-semibold text-slate-700 dark:text-purple-200">
                Tipo
              </label>
              <input
                type="text"
                readOnly
                value="Venda"
                className="w-full bg-amber-50/80 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 font-bold border border-amber-300 dark:border-amber-700/80 rounded-md px-2.5 py-1 text-xs select-none outline-none shadow-inner"
              />
            </div>

            {/* Título do Layout de Impressão */}
            <div className="grid grid-cols-[100px_1fr] items-center gap-2">
              <label className="text-[11px] font-semibold text-slate-700 dark:text-purple-200">
                Título Layout
              </label>
              <input
                type="text"
                value={layoutTitle}
                onChange={(e) => setLayoutTitle(e.target.value)}
                placeholder="CONFERÊNCIA DE LOTES LOKFRIO"
                className="w-full bg-white dark:bg-[#200e30] text-slate-900 dark:text-white border border-slate-300 dark:border-[#431f5c] focus:border-[#7b1fa2] rounded-md px-2.5 py-1 text-xs uppercase font-semibold outline-none"
                title="Nome que sairá no cabeçalho central do layout impresso / PDF"
              />
            </div>

            {/* Espaçador para alinhamento com as colunas 1 e 2 */}
            <div className="hidden md:block h-[26px]" />

            {/* Saldo Volume */}
            <div className="grid grid-cols-[100px_1fr] items-center gap-2">
              <label className="text-[11px] font-semibold text-slate-700 dark:text-purple-200">
                Saldo Volume
              </label>
              <input
                type="text"
                readOnly
                value={saldoVolume > 0 ? `${saldoVolume.toFixed(6)} m³` : '0,000000'}
                className={`w-full border rounded-md px-2.5 py-1 text-xs font-mono text-right select-none outline-none cursor-not-allowed shadow-inner ${
                  currentVolume > maxVolume && maxVolume > 0
                    ? 'bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 border-red-300 dark:border-red-800 font-bold'
                    : 'bg-slate-100 dark:bg-[#150a1f] text-slate-700 dark:text-purple-200 border-slate-200 dark:border-[#361a47]'
                }`}
              />
            </div>

            {/* Saldo Peso */}
            <div className="grid grid-cols-[100px_1fr] items-center gap-2">
              <label className="text-[11px] font-semibold text-slate-700 dark:text-purple-200">
                Saldo Peso
              </label>
              <input
                type="text"
                readOnly
                value={saldoPeso > 0 ? `${saldoPeso.toFixed(6)} kg` : '0,000000'}
                className={`w-full border rounded-md px-2.5 py-1 text-xs font-mono text-right select-none outline-none cursor-not-allowed shadow-inner ${
                  currentWeight > maxWeight && maxWeight > 0
                    ? 'bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 border-red-300 dark:border-red-800 font-bold'
                    : 'bg-slate-100 dark:bg-[#150a1f] text-slate-700 dark:text-purple-200 border-slate-200 dark:border-[#361a47]'
                }`}
              />
            </div>
          </div>
        </div>

        {/* Action Buttons Toolbar & Progress Bar */}
        <div className="pt-3 border-t border-slate-100 dark:border-[#361a47] space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {!selectedVehicle && (
                <button
                  onClick={() => setIsVehicleSelectorOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-[#431f5c] hover:border-slate-300 dark:hover:border-purple-500 text-slate-700 dark:text-purple-200 bg-white dark:bg-[#261536] hover:bg-slate-50 dark:hover:bg-[#371549] text-xs font-semibold shadow-sm transition-all cursor-pointer"
                >
                  <Truck className="w-3.5 h-3.5 text-[#7b1fa2] dark:text-purple-400" />
                  <span>Veículo</span>
                </button>
              )}

              <button
                onClick={() => setIsOrderSelectorOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#7b1fa2] hover:bg-[#6b21a8] text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Pedido</span>
              </button>

              {/* Auto-Preencher com Botão de Informação */}
              <div className="flex items-center">
                <button
                  onClick={handleAutoPack}
                  disabled={isAutoPacking || !selectedVehicle}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-l-lg border border-r-0 border-purple-200 dark:border-purple-800 text-[#7b1fa2] dark:text-purple-300 bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 dark:hover:bg-purple-900/50 text-xs font-bold transition-all disabled:opacity-50 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{isAutoPacking ? 'Calculando...' : 'Auto-Preencher'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsAutoPackInfoOpen(true)}
                  className="px-2 py-1.5 rounded-r-lg border border-purple-200 dark:border-purple-800 text-[#7b1fa2] dark:text-purple-300 bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 dark:hover:bg-purple-900/50 text-xs transition-colors cursor-pointer"
                  title="Como funciona o Auto-Preenchimento?"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-purple-300/70">
              <span>Paletes: <strong className="text-slate-800 dark:text-white">{currentPallets}p</strong></span>
              <span>•</span>
              <span>Ocupação: <strong className="text-[#7b1fa2] dark:text-purple-300">{weightPercent}%</strong></span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="flex items-center gap-4">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 w-20">Andamento</span>
            <div className="flex-1 bg-slate-100 dark:bg-[#261536] rounded-full h-2.5 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  weightPercent > 100 ? 'bg-red-500' : 'bg-[#7b1fa2]'
                }`}
                style={{ width: `${Math.min(weightPercent, 100)}%` }}
              />
            </div>
            <span className="text-xs font-bold text-[#7b1fa2] dark:text-purple-400 w-12 text-right">
              {weightPercent}%
            </span>
          </div>
        </div>

        {/* Orders List Section */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-200">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <span>Pedidos Vinculados ao Veículo ({selectedOrders.length})</span>
            </div>

            {selectedOrders.length > 0 && (
              <button
                onClick={() => setSelectedOrders([])}
                className="text-xs text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-medium cursor-pointer"
              >
                Desvincular Todos
              </button>
            )}
          </div>

          {selectedOrders.length === 0 ? (
            <div className="p-8 rounded-xl border border-dashed border-slate-200 dark:border-[#361a47] text-center bg-slate-50/50 dark:bg-[#1a0d24]/50">
              <div className="text-xs text-slate-500 dark:text-purple-300/70">
                Nenhum pedido vinculado à carga. Clique no botão <strong>Pedido</strong> para adicionar ou use <strong>Auto-Preencher</strong>.
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(
                selectedOrders.reduce((acc, order) => {
                  const routeKey = `${order.ShipToCity || 'Belém'} - ${order.ShipToState || 'PA'}`;
                  if (!acc[routeKey]) {
                    acc[routeKey] = [];
                  }
                  acc[routeKey].push(order);
                  return acc;
                }, {} as Record<string, SapOrder[]>)
              ).map(([routeKey, routeOrders]) => {
                const routeWeight = routeOrders.reduce((s, o) => s + (o.TotalWeightKg || 0), 0);
                const routeTotal = routeOrders.reduce((s, o) => s + (o.DocTotal || 0), 0);

                return (
                  <div
                    key={routeKey}
                    className="rounded-xl border border-purple-100 dark:border-[#361a47] overflow-hidden bg-white dark:bg-[#180c22] shadow-sm space-y-2 p-3"
                  >
                    {/* Route Section Header */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-purple-50 dark:border-[#30163f]">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-[#7b1fa2] shrink-0" />
                        <span className="font-bold text-xs text-slate-900 dark:text-white">
                          Rota: {routeKey}
                        </span>
                        <span className="text-[11px] text-slate-500 dark:text-purple-300/70 font-mono">
                          • {routeOrders.length} {routeOrders.length === 1 ? 'cliente' : 'clientes'} ({routeWeight.toLocaleString('pt-BR')} kg • R$ {routeTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {routeOrders.map((order) => (
                        <div
                          key={order.DocEntry}
                          className="p-3 rounded-lg border border-slate-100 dark:border-[#361a47] hover:border-purple-200 dark:hover:border-purple-600 bg-slate-50/50 dark:bg-[#1f102c] flex flex-wrap items-center justify-between gap-3 transition-colors"
                        >
                          <div>
                            <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                              <span className="font-mono text-[#7b1fa2] dark:text-purple-400">#{order.DocNum}</span>
                              <span>- {order.CardName}</span>
                              {order.PickListId && (
                                <span className="text-[10px] font-sans px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 font-semibold flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                  Pick #{order.PickListId}
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-purple-300/70 mt-0.5">
                              {order.CardCode} • {order.SalesPersonName ? `Vendedor: ${order.SalesPersonName} • ` : ''}Peso: <strong className="text-slate-700 dark:text-purple-200">{order.TotalWeightKg.toLocaleString('pt-BR')} kg</strong> • Vol: <strong className="text-slate-700 dark:text-purple-200">{order.TotalVolumeM3} m³</strong> • R$ {order.DocTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setInspectedOrder(order)}
                              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
                              title="Ver itens"
                            >
                              <Eye className="w-4 h-4" />
                            </button>

                            <button
                              onClick={() => handleRemoveOrder(order.DocEntry)}
                              className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-50 dark:bg-red-950/60 hover:bg-red-100 dark:hover:bg-red-900/80 text-red-600 dark:text-red-300 border border-red-200 dark:border-red-800/80 text-[10px] font-bold transition-colors cursor-pointer"
                              title="Remover pedido da carga"
                            >
                              <AlertTriangle className="w-3 h-3" />
                              <span>Desvincular</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Observações & Finalizar */}
        <div className="pt-3 border-t border-slate-100 dark:border-[#361a47] space-y-3">
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-purple-300/80 mb-1 uppercase tracking-wider">
              Observações do Romaneio / Expedição
            </label>
            <input
              type="text"
              placeholder="Ex: Carga liberada para doca 4. Agendamento prioritário..."
              value={observations}
              onChange={(e) => setObservations(e.target.value)}
              className="w-full bg-white dark:bg-[#130b1a] border border-slate-200 dark:border-[#361a47] rounded-xl px-3.5 py-2 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:border-[#7b1fa2]"
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="text-xs text-slate-500 dark:text-purple-300/70">
              {selectedOrders.length > 0 ? (
                <span>
                  <strong className="text-slate-800 dark:text-white">{selectedOrders.length} pedido(s)</strong> vinculados ({currentWeight.toLocaleString('pt-BR')} kg)
                </span>
              ) : (
                <span>Adicione pedidos para habilitar a emissão do PDF</span>
              )}
            </div>

            <button
              onClick={handleFinalizeLoad}
              disabled={isSavingLoad || selectedOrders.length === 0 || !selectedVehicle}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#7b1fa2] hover:bg-[#6b21a8] text-white font-bold text-xs shadow-md transition-all disabled:opacity-50 cursor-pointer"
            >
              <FileText className="w-4 h-4" />
              <span>{isSavingLoad ? 'Emitindo...' : 'Finalizar Montagem & Gerar PDF'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Modal Informativo: Como Funciona o Auto-Preencher */}
      {isAutoPackInfoOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white dark:bg-[#1d1026] border border-slate-200 dark:border-[#361a47] rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-[#361a47] bg-purple-50/50 dark:bg-[#1a0d24]">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-[#7b1fa2] text-white">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Como funciona o Auto-Preenchimento?
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-purple-300/70">
                    Otimização algorítmica de montagem de carga
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsAutoPackInfoOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#261536] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs text-slate-600 dark:text-purple-200/90 leading-relaxed">
              <p>
                O botão <strong>Auto-Preencher</strong> aplica um algoritmo de otimização combinatória (<em>Heurística da Mochila / Knapsack</em>) aos pedidos abertos no SAP:
              </p>

              <div className="space-y-3">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#130b1a] border border-slate-200 dark:border-[#361a47] flex items-start gap-3">
                  <Scale className="w-4 h-4 text-[#7b1fa2] dark:text-purple-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-900 dark:text-white block mb-0.5">1. Maximização de Capacidade</strong>
                    Calcula a melhor combinação de pedidos para atingir a maior ocupação possível de <strong>peso (kg)</strong> e <strong>volume (m³)</strong> sem ultrapassar o limite seguro do caminhão.
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#130b1a] border border-slate-200 dark:border-[#361a47] flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-900 dark:text-white block mb-0.5">2. Roteirização por Região</strong>
                    Prioriza pedidos destinados à mesma cidade e estado, reduzindo o tempo de entrega e os custos com frete.
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#130b1a] border border-slate-200 dark:border-[#361a47] flex items-start gap-3">
                  <Layers className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-900 dark:text-white block mb-0.5">3. Limite Físico de Paletes</strong>
                    Verifica a cubagem e assegura que a quantidade estimada de paletes não exceda o espaço do compartimento de carga.
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end px-6 py-3 border-t border-slate-100 dark:border-[#361a47] bg-slate-50/50 dark:bg-[#1a0d24]">
              <button
                onClick={() => setIsAutoPackInfoOpen(false)}
                className="px-4 py-2 rounded-xl bg-[#7b1fa2] hover:bg-[#6b21a8] text-white text-xs font-bold shadow-sm transition-colors cursor-pointer"
              >
                Entendi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modais */}
      <VehicleSelectorModal
        isOpen={isVehicleSelectorOpen}
        onClose={() => setIsVehicleSelectorOpen(false)}
        selectedVehicleId={selectedVehicle?.id}
        onSelectVehicle={(vehicle) => {
          setSelectedVehicle(vehicle);
          setNotification({ type: 'success', message: `Veículo ${vehicle.plate} selecionado.` });
        }}
      />

      <OrderSelectorModal
        isOpen={isOrderSelectorOpen}
        onClose={() => setIsOrderSelectorOpen(false)}
        alreadySelectedDocEntries={selectedOrders.map((o) => o.DocEntry)}
        onAddOrders={handleAddOrders}
        defaultBranchId={selectedBranch?.id}
      />

      <OrderDetailsModal
        isOpen={!!inspectedOrder}
        onClose={() => setInspectedOrder(null)}
        order={inspectedOrder}
      />

      {createdLoad && (
        <PdfViewerModal
          isOpen={isPdfModalOpen}
          onClose={() => {
            // Apenas fecha a prévia do PDF voltando para os lançamentos digitados na tela
            setIsPdfModalOpen(false);
          }}
          loadId={createdLoad.id}
          loadNumber={createdLoad.load_number}
          layoutTitle={layoutTitle}
          onFinalize={async () => {
            try {
              await loadService.finalize(createdLoad.id);
            } catch (_) {}
            setNotification({
              type: 'success',
              message: `Montagem ${createdLoad.load_number} finalizada e liberada com sucesso! Painel pronto para a próxima carga.`,
            });
            setIsPdfModalOpen(false);
            resetForm();
          }}
        />
      )}
    </div>
  );
};
