import React, { useState, useEffect } from 'react';
import { Vehicle } from '../types';
import { vehicleService } from '../services/api';
import { X, Search, Truck, Plus, Scale, Box, Layers, Check } from 'lucide-react';
import { VehicleModal } from './VehicleModal';

interface VehicleSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedVehicleId?: string;
  onSelectVehicle: (vehicle: Vehicle) => void;
}

export const VehicleSelectorModal: React.FC<VehicleSelectorModalProps> = ({
  isOpen,
  onClose,
  selectedVehicleId,
  onSelectVehicle,
}) => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const fetchVehicles = async () => {
    try {
      setLoading(true);
      const list = await vehicleService.list();
      setVehicles(list);
    } catch (err) {
      console.error('Erro ao buscar veículos:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchVehicles();
      setSearch('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredVehicles = vehicles.filter(
    (v) =>
      v.plate.toLowerCase().includes(search.toLowerCase()) ||
      v.model.toLowerCase().includes(search.toLowerCase()) ||
      v.driver_name.toLowerCase().includes(search.toLowerCase()) ||
      v.carrier.toLowerCase().includes(search.toLowerCase())
  );

  const handleVehicleCreated = async (data: Partial<Vehicle>) => {
    const res = await vehicleService.create(data);
    if (res.success && res.data) {
      await fetchVehicles();
      onSelectVehicle(res.data);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white dark:bg-[#1d1026] border border-slate-200 dark:border-[#361a47] rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-[#361a47] bg-slate-50/60 dark:bg-[#1a0d24]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-purple-50 dark:bg-[#261536] text-[#7b1fa2] dark:text-purple-400">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Selecionar Veículo de Transporte</h2>
              <p className="text-xs text-slate-500 dark:text-purple-300/70">
                Escolha o caminhão para a montagem de carga
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#261536] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action & Search Bar */}
        <div className="p-4 bg-slate-50/60 dark:bg-[#1a0d24] border-b border-slate-100 dark:border-[#361a47] flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por placa, modelo, motorista..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white dark:bg-[#130b1a] border border-slate-200 dark:border-[#361a47] rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:border-[#7b1fa2]"
            />
          </div>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#7b1fa2] hover:bg-[#6b21a8] text-white text-xs font-bold shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Veículo</span>
          </button>
        </div>

        {/* Vehicle List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#f8f9fa] dark:bg-[#130b1a]">
          {loading ? (
            <div className="py-12 text-center text-xs text-slate-400">Carregando frota...</div>
          ) : filteredVehicles.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              Nenhum veículo localizado.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {filteredVehicles.map((v) => {
                const isSelected = v.id === selectedVehicleId;
                return (
                  <div
                    key={v.id}
                    onClick={() => {
                      onSelectVehicle(v);
                      onClose();
                    }}
                    className={`p-4 rounded-xl border cursor-pointer transition-all flex flex-col justify-between space-y-3 ${
                      isSelected
                        ? 'bg-purple-50/70 dark:bg-purple-950/40 border-[#7b1fa2] shadow-sm'
                        : 'bg-white dark:bg-[#1a0d24] border-slate-200 dark:border-[#361a47] hover:border-purple-300 dark:hover:border-purple-600 hover:shadow-sm'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-base font-bold text-slate-900 dark:text-white tracking-wider">
                          {v.plate}
                        </span>
                        <span
                          className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${
                            v.status === 'available'
                              ? 'bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                              : 'bg-amber-50 dark:bg-amber-950/80 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                          }`}
                        >
                          {v.vehicle_type}
                        </span>
                      </div>

                      <div className="text-xs font-semibold text-slate-800 dark:text-slate-100 mt-1">{v.model}</div>
                      <div className="text-[11px] text-slate-500 dark:text-purple-300/70 truncate mt-0.5">
                        Motorista: <strong className="text-slate-700 dark:text-slate-200">{v.driver_name}</strong>
                      </div>
                      <div className="text-[10px] text-slate-400 dark:text-purple-300/60 truncate">
                        {v.carrier}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 dark:border-[#361a47] flex items-center justify-between text-[11px] text-slate-600 dark:text-purple-200">
                      <div className="flex items-center gap-1">
                        <Scale className="w-3.5 h-3.5 text-[#7b1fa2] dark:text-purple-400" />
                        <span>{(v.max_weight_kg / 1000).toFixed(1)}t</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Box className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
                        <span>{v.max_volume_m3}m³</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Layers className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                        <span>{v.max_pallets} paletes</span>
                      </div>

                      {isSelected && (
                        <span className="text-xs text-[#7b1fa2] dark:text-purple-400 font-bold flex items-center gap-0.5">
                          <Check className="w-3.5 h-3.5" /> Selecionado
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-3 border-t border-slate-100 dark:border-[#361a47] bg-white dark:bg-[#1a0d24]">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 dark:text-purple-300 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#261536] transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>

      {/* Modal de Cadastro de Veículo */}
      <VehicleModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSave={handleVehicleCreated}
      />
    </div>
  );
};
