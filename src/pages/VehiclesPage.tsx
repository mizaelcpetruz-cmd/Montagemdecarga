import React, { useState, useEffect } from 'react';
import { vehicleService } from '../services/api';
import { Vehicle } from '../types';
import { VehicleModal } from '../components/VehicleModal';
import { Truck, Plus, Edit2, Trash2, Scale, Box, Layers, User } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export const VehiclesPage: React.FC = () => {
  const { user } = useAuth();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [deletingVehicle, setDeletingVehicle] = useState<{ id: string; plate: string } | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchVehicles = async () => {
    try {
      const res = await vehicleService.list();
      setVehicles(res);
    } catch (err) {
      console.error('Erro ao buscar veículos:', err);
    }
  };

  useEffect(() => {
    fetchVehicles();
  }, []);

  const handleSaveVehicle = async (data: Partial<Vehicle>) => {
    if (editingVehicle) {
      await vehicleService.update(editingVehicle.id, data);
      setNotification({ type: 'success', message: 'Veículo atualizado com sucesso!' });
    } else {
      await vehicleService.create(data);
      setNotification({ type: 'success', message: 'Novo veículo cadastrado com sucesso!' });
    }
    fetchVehicles();
  };

  const handleConfirmDelete = async () => {
    if (!deletingVehicle) return;

    try {
      await vehicleService.delete(deletingVehicle.id);
      setNotification({ type: 'success', message: `Veículo ${deletingVehicle.plate} removido com sucesso.` });
      setDeletingVehicle(null);
      fetchVehicles();
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.response?.data?.message || 'Erro ao excluir veículo.',
      });
    }
  };

  const openNewModal = () => {
    setEditingVehicle(null);
    setIsModalOpen(true);
  };

  const openEditModal = (v: Vehicle) => {
    setEditingVehicle(v);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6 w-full pb-16 transition-all duration-300">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Veículos & Frota
          </h1>
          <p className="text-xs text-slate-500 dark:text-purple-300/80 mt-0.5">
            Cadastro de capacidades operacionais, motoristas e transportadoras.
          </p>
        </div>

        <button
          onClick={openNewModal}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#7b1fa2] hover:bg-[#6b21a8] text-white font-bold text-xs shadow-sm transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Cadastrar Veículo</span>
        </button>
      </div>

      {notification && (
        <div
          className={`p-3 rounded-xl text-xs flex items-center justify-between border ${
            notification.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
              : 'bg-red-50 dark:bg-red-950/60 border-red-200 dark:border-red-800 text-red-800 dark:text-red-300'
          }`}
        >
          <span>{notification.message}</span>
          <button onClick={() => setNotification(null)}>✕</button>
        </div>
      )}

      {/* Grid of Vehicles */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {vehicles.map((v) => (
          <div
            key={v.id}
            className="petruz-card petruz-card-hover p-5 flex flex-col justify-between space-y-4"
          >
            <div>
              {/* Placa & Status */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-[#361a47]">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-purple-50 dark:bg-[#261536] text-[#7b1fa2] dark:text-purple-400">
                    <Truck className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-mono text-sm font-bold text-slate-900 dark:text-white tracking-wider">
                      {v.plate}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-purple-300/70">{v.model}</div>
                  </div>
                </div>

                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                    v.status === 'available'
                      ? 'bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                      : v.status === 'loading'
                      ? 'bg-amber-50 dark:bg-amber-950/80 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                      : 'bg-purple-50 dark:bg-purple-950/80 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-800'
                  }`}
                >
                  {v.status === 'available'
                    ? 'Disponível'
                    : v.status === 'loading'
                    ? 'Carregando'
                    : 'Em Trânsito'}
                </span>
              </div>

              {/* Capacities */}
              <div className="grid grid-cols-3 gap-2 mt-3.5 text-center bg-slate-50 dark:bg-[#130b1a] p-2.5 rounded-xl border border-slate-100 dark:border-[#361a47]">
                <div>
                  <div className="text-[10px] text-slate-500 dark:text-purple-300/70 flex items-center justify-center gap-1">
                    <Scale className="w-3 h-3 text-[#7b1fa2] dark:text-purple-400" />
                    <span>Peso Máx</span>
                  </div>
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-100 mt-0.5">
                    {(v.max_weight_kg / 1000).toFixed(1)}t
                  </div>
                </div>

                <div>
                  <div className="text-[10px] text-slate-500 dark:text-purple-300/70 flex items-center justify-center gap-1">
                    <Box className="w-3 h-3 text-indigo-500" />
                    <span>Volume</span>
                  </div>
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-100 mt-0.5">
                    {v.max_volume_m3} m³
                  </div>
                </div>

                <div>
                  <div className="text-[10px] text-slate-500 dark:text-purple-300/70 flex items-center justify-center gap-1">
                    <Layers className="w-3 h-3 text-amber-500" />
                    <span>Paletes</span>
                  </div>
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-100 mt-0.5">
                    {v.max_pallets} un
                  </div>
                </div>
              </div>

              {/* Driver & Carrier */}
              <div className="mt-3.5 space-y-1 text-xs text-slate-600 dark:text-purple-300/80">
                <div className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  <span>
                    Motorista: <strong className="text-slate-900 dark:text-white">{v.driver_name}</strong>
                  </span>
                </div>
                {(v.driver_cpf || v.driver_phone) && (
                  <div className="text-[11px] text-slate-500 dark:text-purple-300/60 pl-5">
                    {v.driver_cpf && `CPF: ${v.driver_cpf}`}
                    {v.driver_cpf && v.driver_phone && ' • '}
                    {v.driver_phone && `Tel: ${v.driver_phone}`}
                  </div>
                )}
                <div className="text-[11px] text-slate-500 dark:text-purple-300/60 pl-5 truncate">
                  Transportadora: {v.carrier}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-3 border-t border-slate-100 dark:border-[#361a47] flex items-center justify-between">
              <span className="text-[10px] text-slate-400 dark:text-purple-300/60 font-semibold uppercase">
                {v.vehicle_type}
              </span>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => openEditModal(v)}
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-[#361a47] hover:bg-slate-100 dark:hover:bg-[#261536] text-slate-600 dark:text-purple-200 transition-colors"
                  title="Editar Veículo"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                {user?.role === 'admin' && (
                  <button
                    onClick={() => setDeletingVehicle({ id: v.id, plate: v.plate })}
                    className="p-1.5 rounded-lg border border-red-200 dark:border-red-900/60 hover:bg-red-50 dark:hover:bg-red-950/60 text-red-500 transition-colors cursor-pointer"
                    title="Excluir Veículo"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <VehicleModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveVehicle}
        initialData={editingVehicle}
      />

      {/* Modal de Confirmação de Exclusão de Veículo */}
      {deletingVehicle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#1a0d24] border border-red-200 dark:border-red-900/60 rounded-2xl w-full max-w-sm p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <div className="p-2.5 rounded-xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Excluir Veículo
                </h3>
                <p className="text-xs text-slate-500 dark:text-purple-300/80">
                  Placa: <strong className="font-mono text-slate-800 dark:text-white">{deletingVehicle.plate}</strong>
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-purple-200/80">
              Tem certeza que deseja remover este veículo da frota operacional? Esta ação não poderá ser desfeita.
            </p>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeletingVehicle(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-[#361a47] text-xs font-semibold text-slate-600 dark:text-purple-300 hover:bg-slate-50 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow transition-all cursor-pointer"
              >
                Confirmar Exclusão
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
