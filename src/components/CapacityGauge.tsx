import React from 'react';
import { Scale, Box, Layers, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface CapacityGaugeProps {
  currentWeight: number;
  maxWeight: number;
  currentVolume: number;
  maxVolume: number;
  currentPallets: number;
  maxPallets: number;
  totalValue: number;
  orderCount: number;
}

export const CapacityGauge: React.FC<CapacityGaugeProps> = ({
  currentWeight,
  maxWeight,
  currentVolume,
  maxVolume,
  currentPallets,
  maxPallets,
  totalValue,
  orderCount,
}) => {
  const weightPercent = maxWeight > 0 ? (currentWeight / maxWeight) * 100 : 0;
  const volumePercent = maxVolume > 0 ? (currentVolume / maxVolume) * 100 : 0;
  const palletPercent = maxPallets > 0 ? (currentPallets / maxPallets) * 100 : 0;

  const isOverweight = currentWeight > maxWeight && maxWeight > 0;
  const isOvervolume = currentVolume > maxVolume && maxVolume > 0;
  const isOverpallets = currentPallets > maxPallets && maxPallets > 0;
  const hasOverLimit = isOverweight || isOvervolume || isOverpallets;

  const getProgressColor = (percent: number, isOver: boolean) => {
    if (isOver) return 'bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.6)]';
    if (percent >= 85) return 'bg-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.5)]';
    return 'bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.5)]';
  };

  const getTextColor = (percent: number, isOver: boolean) => {
    if (isOver) return 'text-red-400 font-bold';
    if (percent >= 85) return 'text-amber-400 font-semibold';
    return 'text-emerald-400 font-semibold';
  };

  return (
    <div className="glass-card rounded-2xl p-5 border border-slate-800 shadow-xl">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5 pb-4 border-b border-slate-800/80">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
            Ocupação da Carga em Tempo Real
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Monitoramento de peso por eixo, cubagem e paletização
          </p>
        </div>

        {hasOverLimit ? (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-950/60 border border-red-500/30 text-red-300 text-xs font-semibold animate-pulse">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <span>Capacidade Excedida! Ajuste os pedidos</span>
          </div>
        ) : orderCount > 0 ? (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-950/50 border border-emerald-500/30 text-emerald-300 text-xs font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Carga dentro dos limites operacionais</span>
          </div>
        ) : (
          <div className="text-xs text-slate-400">
            Nenhum pedido adicionado ainda
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Gauge 1: Peso */}
        <div className="bg-slate-900/80 rounded-xl p-4 border border-slate-800/60">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-slate-300 text-xs font-medium">
              <Scale className="w-4 h-4 text-sky-400" />
              <span>Peso Total (kg)</span>
            </div>
            <span className={`text-sm ${getTextColor(weightPercent, isOverweight)}`}>
              {weightPercent.toFixed(1)}%
            </span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden p-0.5 mb-2.5">
            <div
              className={`h-full rounded-full transition-all duration-500 ${getProgressColor(weightPercent, isOverweight)}`}
              style={{ width: `${Math.min(weightPercent, 100)}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold text-slate-200">{currentWeight.toLocaleString('pt-BR')} kg</span>
            <span>Máx: {maxWeight.toLocaleString('pt-BR')} kg</span>
          </div>
        </div>

        {/* Gauge 2: Volume */}
        <div className="bg-slate-900/80 rounded-xl p-4 border border-slate-800/60">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-slate-300 text-xs font-medium">
              <Box className="w-4 h-4 text-indigo-400" />
              <span>Cubagem / Volume (m³)</span>
            </div>
            <span className={`text-sm ${getTextColor(volumePercent, isOvervolume)}`}>
              {volumePercent.toFixed(1)}%
            </span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden p-0.5 mb-2.5">
            <div
              className={`h-full rounded-full transition-all duration-500 ${getProgressColor(volumePercent, isOvervolume)}`}
              style={{ width: `${Math.min(volumePercent, 100)}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold text-slate-200">{currentVolume.toFixed(2)} m³</span>
            <span>Máx: {maxVolume.toFixed(1)} m³</span>
          </div>
        </div>

        {/* Gauge 3: Paletes */}
        <div className="bg-slate-900/80 rounded-xl p-4 border border-slate-800/60">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-slate-300 text-xs font-medium">
              <Layers className="w-4 h-4 text-amber-400" />
              <span>Posições Paletes</span>
            </div>
            <span className={`text-sm ${getTextColor(palletPercent, isOverpallets)}`}>
              {palletPercent.toFixed(1)}%
            </span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden p-0.5 mb-2.5">
            <div
              className={`h-full rounded-full transition-all duration-500 ${getProgressColor(palletPercent, isOverpallets)}`}
              style={{ width: `${Math.min(palletPercent, 100)}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold text-slate-200">{currentPallets} un</span>
            <span>Máx: {maxPallets} un</span>
          </div>
        </div>
      </div>

      {/* Resumo de Valor e Pedidos */}
      <div className="mt-4 pt-4 border-t border-slate-800/60 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
        <div className="bg-slate-900/40 rounded-lg p-2 border border-slate-800/40">
          <div className="text-[11px] text-slate-400 uppercase tracking-wider">Pedidos SAP</div>
          <div className="text-base font-bold text-white mt-0.5">{orderCount}</div>
        </div>
        <div className="bg-slate-900/40 rounded-lg p-2 border border-slate-800/40">
          <div className="text-[11px] text-slate-400 uppercase tracking-wider">Valor Total Carga</div>
          <div className="text-base font-bold text-emerald-400 mt-0.5">
            R$ {totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
        <div className="bg-slate-900/40 rounded-lg p-2 border border-slate-800/40">
          <div className="text-[11px] text-slate-400 uppercase tracking-wider">Peso Restante</div>
          <div className="text-base font-bold text-sky-300 mt-0.5">
            {Math.max(0, maxWeight - currentWeight).toLocaleString('pt-BR')} kg
          </div>
        </div>
        <div className="bg-slate-900/40 rounded-lg p-2 border border-slate-800/40">
          <div className="text-[11px] text-slate-400 uppercase tracking-wider">Volume Restante</div>
          <div className="text-base font-bold text-indigo-300 mt-0.5">
            {Math.max(0, maxVolume - currentVolume).toFixed(2)} m³
          </div>
        </div>
      </div>
    </div>
  );
};
