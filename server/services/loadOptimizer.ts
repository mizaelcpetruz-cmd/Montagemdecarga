import { SapOrder } from './sapServiceLayer.js';

export interface VehicleCapacity {
  id: string;
  plate: string;
  model: string;
  maxWeightKg: number;
  maxVolumeM3: number;
  maxPallets: number;
}

export interface OptimizationResult {
  recommendedOrders: SapOrder[];
  remainingOrders: SapOrder[];
  totalWeightKg: number;
  totalVolumeM3: number;
  totalPallets: number;
  totalValue: number;
  weightOccupancyPercent: number;
  volumeOccupancyPercent: number;
  palletOccupancyPercent: number;
  isOverLimit: boolean;
  warnings: string[];
}

export class LoadOptimizer {
  /**
   * Calcula as métricas de ocupação de um conjunto de pedidos em relação a um veículo
   */
  public static calculateOccupancy(
    vehicle: VehicleCapacity,
    orders: SapOrder[]
  ): OptimizationResult {
    let totalWeightKg = 0;
    let totalVolumeM3 = 0;
    let totalPallets = 0;
    let totalValue = 0;
    const warnings: string[] = [];

    for (const order of orders) {
      totalWeightKg += order.TotalWeightKg;
      totalVolumeM3 += order.TotalVolumeM3;
      totalPallets += order.EstimatedPallets;
      totalValue += order.DocTotal;
    }

    const weightOccupancyPercent = vehicle.maxWeightKg > 0 
      ? Number(((totalWeightKg / vehicle.maxWeightKg) * 100).toFixed(1))
      : 0;

    const volumeOccupancyPercent = vehicle.maxVolumeM3 > 0 
      ? Number(((totalVolumeM3 / vehicle.maxVolumeM3) * 100).toFixed(1))
      : 0;

    const palletOccupancyPercent = vehicle.maxPallets > 0 
      ? Number(((totalPallets / vehicle.maxPallets) * 100).toFixed(1))
      : 0;

    let isOverLimit = false;

    if (totalWeightKg > vehicle.maxWeightKg) {
      isOverLimit = true;
      warnings.push(`Peso excedido em ${(totalWeightKg - vehicle.maxWeightKg).toFixed(1)} kg (${weightOccupancyPercent}% da capacidade).`);
    }

    if (totalVolumeM3 > vehicle.maxVolumeM3) {
      isOverLimit = true;
      warnings.push(`Volume excedido em ${(totalVolumeM3 - vehicle.maxVolumeM3).toFixed(1)} m³ (${volumeOccupancyPercent}% da capacidade).`);
    }

    if (totalPallets > vehicle.maxPallets) {
      isOverLimit = true;
      warnings.push(`Quantidade de paletes excedida em ${totalPallets - vehicle.maxPallets} paletes (${palletOccupancyPercent}% da capacidade).`);
    }

    return {
      recommendedOrders: orders,
      remainingOrders: [],
      totalWeightKg: Number(totalWeightKg.toFixed(2)),
      totalVolumeM3: Number(totalVolumeM3.toFixed(2)),
      totalPallets,
      totalValue: Number(totalValue.toFixed(2)),
      weightOccupancyPercent,
      volumeOccupancyPercent,
      palletOccupancyPercent,
      isOverLimit,
      warnings,
    };
  }

  /**
   * Algoritmo de Auto-Otimização de Carga:
   * Seleciona a melhor combinação de pedidos para atingir a ocupação máxima
   * sem ultrapassar os limites físicos do veículo, priorizando proximidade geográfica (mesma cidade/UF) e vencimento (DocDueDate).
   */
  public static autoPackLoad(
    vehicle: VehicleCapacity,
    availableOrders: SapOrder[],
    targetCity?: string
  ): OptimizationResult {
    // 1. Filtragem e ordenação por prioridade: data mais antiga e cidades compatíveis
    const sorted = [...availableOrders].sort((a, b) => {
      // Prioridade se tiver mesma cidade destino
      if (targetCity) {
        const aCityMatch = a.ShipToCity.toLowerCase() === targetCity.toLowerCase() ? 1 : 0;
        const bCityMatch = b.ShipToCity.toLowerCase() === targetCity.toLowerCase() ? 1 : 0;
        if (aCityMatch !== bCityMatch) return bCityMatch - aCityMatch;
      }
      
      // Prioridade por data de entrega mais urgente
      const dateA = new Date(a.DocDueDate).getTime();
      const dateB = new Date(b.DocDueDate).getTime();
      if (dateA !== dateB) return dateA - dateB;

      // Desempate por valor
      return b.DocTotal - a.DocTotal;
    });

    const selected: SapOrder[] = [];
    const remaining: SapOrder[] = [];

    let currentWeight = 0;
    let currentVolume = 0;
    let currentPallets = 0;
    let currentValue = 0;

    for (const order of sorted) {
      const willExceedWeight = currentWeight + order.TotalWeightKg > vehicle.maxWeightKg;
      const willExceedVolume = currentVolume + order.TotalVolumeM3 > vehicle.maxVolumeM3;
      const willExceedPallets = currentPallets + order.EstimatedPallets > vehicle.maxPallets;

      if (!willExceedWeight && !willExceedVolume && !willExceedPallets) {
        selected.push(order);
        currentWeight += order.TotalWeightKg;
        currentVolume += order.TotalVolumeM3;
        currentPallets += order.EstimatedPallets;
        currentValue += order.DocTotal;
      } else {
        remaining.push(order);
      }
    }

    const occupancy = this.calculateOccupancy(vehicle, selected);
    occupancy.remainingOrders = remaining;

    return occupancy;
  }
}
