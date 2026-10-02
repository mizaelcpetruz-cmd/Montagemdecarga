import React, { useState, useEffect } from 'react';
import { Vehicle, VehicleType, VehicleStatus } from '../types';
import { X, Truck, Save, AlertCircle } from 'lucide-react';

interface VehicleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<Vehicle>) => Promise<void>;
  initialData?: Vehicle | null;
}

const VEHICLE_TYPES: Array<{ type: VehicleType; defaultWeight: number; defaultVolume: number; defaultPallets: number }> = [
  { type: 'Fiorino', defaultWeight: 650, defaultVolume: 3.3, defaultPallets: 1 },
  { type: 'VUC', defaultWeight: 3500, defaultVolume: 18.0, defaultPallets: 4 },
  { type: 'Toco', defaultWeight: 7500, defaultVolume: 32.0, defaultPallets: 8 },
  { type: 'Truck', defaultWeight: 14000, defaultVolume: 55.0, defaultPallets: 16 },
  { type: 'Carreta', defaultWeight: 27000, defaultVolume: 105.0, defaultPallets: 28 },
  { type: 'Bitrem', defaultWeight: 38000, defaultVolume: 120.0, defaultPallets: 36 },
];

const getInitialFormData = (data?: Vehicle | null): Partial<Vehicle> => {
  if (data) return { ...data };
  return {
    plate: '',
    model: '',
    vehicle_type: 'Truck',
    driver_name: '',
    driver_cpf: '',
    driver_phone: '',
    carrier: '',
    max_weight_kg: 14000,
    max_volume_m3: 55.0,
    max_pallets: 16,
    status: 'available' as VehicleStatus,
  };
};

export const VehicleModal: React.FC<VehicleModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
}) => {
  const [formData, setFormData] = useState<Partial<Vehicle>>(() => getInitialFormData(initialData));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setFormData(getInitialFormData(initialData));
      setError(null);
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleTypeChange = (type: VehicleType) => {
    const defaultSpecs = VEHICLE_TYPES.find((v) => v.type === type);
    setFormData((prev) => ({
      ...prev,
      vehicle_type: type,
      max_weight_kg: defaultSpecs ? defaultSpecs.defaultWeight : prev.max_weight_kg,
      max_volume_m3: defaultSpecs ? defaultSpecs.defaultVolume : prev.max_volume_m3,
      max_pallets: defaultSpecs ? defaultSpecs.defaultPallets : prev.max_pallets,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.plate || !formData.model || !formData.driver_name) {
      setError('Por favor, preencha todos os campos obrigatórios (Placa, Modelo e Motorista).');
      return;
    }

    try {
      setLoading(true);
      await onSave(formData);
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao salvar veículo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white dark:bg-[#1d1026] border border-slate-200 dark:border-[#361a47] rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-[#361a47] bg-slate-50/60 dark:bg-[#1a0d24]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-purple-50 dark:bg-[#261536] text-[#7b1fa2] dark:text-purple-400">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {initialData ? 'Editar Veículo' : 'Cadastrar Novo Veículo & Frota'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-purple-300/70">Parametrização de limites de carga e motorista</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#261536] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Tipo de Veículo Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-purple-200 uppercase tracking-wider mb-2">
              Categoria do Veículo (Ajusta capacidades automáticas)
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {VEHICLE_TYPES.map((v) => (
                <button
                  type="button"
                  key={v.type}
                  onClick={() => handleTypeChange(v.type)}
                  className={`py-2 px-2 rounded-xl text-xs font-semibold border transition-all text-center ${
                    formData.vehicle_type === v.type
                      ? 'bg-[#7b1fa2] border-[#7b1fa2] text-white shadow-sm'
                      : 'bg-white dark:bg-[#130b1a] border-slate-200 dark:border-[#361a47] text-slate-600 dark:text-purple-200 hover:border-purple-300'
                  }`}
                >
                  {v.type}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-purple-200 mb-1">
                Placa do Veículo *
              </label>
              <input
                type="text"
                placeholder="Ex: ABC-1D23"
                value={formData.plate || ''}
                onChange={(e) => setFormData({ ...formData, plate: e.target.value.toUpperCase() })}
                className="w-full bg-slate-50 dark:bg-[#130b1a] border border-slate-200 dark:border-[#361a47] rounded-xl px-3.5 py-2 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:border-[#7b1fa2] uppercase font-mono"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-purple-200 mb-1">
                Modelo / Fabricante *
              </label>
              <input
                type="text"
                placeholder="Ex: MERCEDES-BENZ ATEGO 2430"
                value={formData.model || ''}
                onChange={(e) => setFormData({ ...formData, model: e.target.value.toUpperCase() })}
                className="w-full bg-slate-50 dark:bg-[#130b1a] border border-slate-200 dark:border-[#361a47] rounded-xl px-3.5 py-2 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:border-[#7b1fa2] uppercase"
                required
              />
            </div>
          </div>

          {/* Capacidades */}
          <div className="p-4 rounded-xl bg-purple-50/40 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/60">
            <h4 className="text-xs font-bold text-[#7b1fa2] dark:text-purple-300 uppercase tracking-wider mb-2.5">
              Capacidades Operacionais
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] text-slate-600 dark:text-purple-300/80 mb-1">Peso Máximo (kg) *</label>
                <input
                  type="number"
                  step="100"
                  value={formData.max_weight_kg || ''}
                  onChange={(e) => setFormData({ ...formData, max_weight_kg: Number(e.target.value) })}
                  className="w-full bg-white dark:bg-[#130b1a] border border-slate-200 dark:border-[#361a47] rounded-lg px-3 py-1.5 text-sm text-slate-800 dark:text-slate-100 font-semibold focus:outline-none focus:border-[#7b1fa2]"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-600 dark:text-purple-300/80 mb-1">Volume Máximo (m³) *</label>
                <input
                  type="number"
                  step="0.5"
                  value={formData.max_volume_m3 || ''}
                  onChange={(e) => setFormData({ ...formData, max_volume_m3: Number(e.target.value) })}
                  className="w-full bg-white dark:bg-[#130b1a] border border-slate-200 dark:border-[#361a47] rounded-lg px-3 py-1.5 text-sm text-slate-800 dark:text-slate-100 font-semibold focus:outline-none focus:border-[#7b1fa2]"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-600 dark:text-purple-300/80 mb-1">Posições Paletes *</label>
                <input
                  type="number"
                  value={formData.max_pallets || ''}
                  onChange={(e) => setFormData({ ...formData, max_pallets: Number(e.target.value) })}
                  className="w-full bg-white dark:bg-[#130b1a] border border-slate-200 dark:border-[#361a47] rounded-lg px-3 py-1.5 text-sm text-slate-800 dark:text-slate-100 font-semibold focus:outline-none focus:border-[#7b1fa2]"
                  required
                />
              </div>
            </div>
          </div>

          {/* Dados do Motorista & Transportadora */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-purple-200 mb-1">
                Nome do Motorista *
              </label>
              <input
                type="text"
                placeholder="Nome completo"
                value={formData.driver_name || ''}
                onChange={(e) => setFormData({ ...formData, driver_name: e.target.value.toUpperCase() })}
                className="w-full bg-slate-50 dark:bg-[#130b1a] border border-slate-200 dark:border-[#361a47] rounded-xl px-3.5 py-2 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:border-[#7b1fa2] uppercase"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-purple-200 mb-1">
                CPF do Motorista
              </label>
              <input
                type="text"
                placeholder="000.000.000-00"
                value={formData.driver_cpf || ''}
                onChange={(e) => setFormData({ ...formData, driver_cpf: e.target.value })}
                className="w-full bg-slate-50 dark:bg-[#130b1a] border border-slate-200 dark:border-[#361a47] rounded-xl px-3.5 py-2 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:border-[#7b1fa2]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-purple-200 mb-1">
                Telefone de Contato
              </label>
              <input
                type="text"
                placeholder="(00) 00000-0000"
                value={formData.driver_phone || ''}
                onChange={(e) => setFormData({ ...formData, driver_phone: e.target.value })}
                className="w-full bg-slate-50 dark:bg-[#130b1a] border border-slate-200 dark:border-[#361a47] rounded-xl px-3.5 py-2 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:border-[#7b1fa2]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-purple-200 mb-1">
                Transportadora *
              </label>
              <input
                type="text"
                placeholder="Nome da transportadora"
                value={formData.carrier || ''}
                onChange={(e) => setFormData({ ...formData, carrier: e.target.value.toUpperCase() })}
                className="w-full bg-slate-50 dark:bg-[#130b1a] border border-slate-200 dark:border-[#361a47] rounded-xl px-3.5 py-2 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:border-[#7b1fa2] uppercase"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-purple-200 mb-1">
                Status Operacional
              </label>
              <select
                value={formData.status || 'available'}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as VehicleStatus })}
                className="w-full bg-slate-50 dark:bg-[#130b1a] border border-slate-200 dark:border-[#361a47] rounded-xl px-3.5 py-2 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:border-[#7b1fa2]"
              >
                <option value="available">Disponível para Carga</option>
                <option value="loading">Em Carregamento</option>
                <option value="in_transit">Em Trânsito</option>
                <option value="maintenance">Em Manutenção</option>
              </select>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-[#361a47]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 dark:text-purple-300 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#261536] transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#7b1fa2] hover:bg-[#6b21a8] text-white text-xs font-bold shadow-sm transition-all disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{loading ? 'Salvando...' : 'Salvar Veículo'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
