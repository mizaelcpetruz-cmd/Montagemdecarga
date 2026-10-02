export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'supervisor' | 'operator';
  is_active?: number;
  created_at?: string;
  updated_at?: string;
}


export type VehicleType = 'Fiorino' | 'VUC' | 'Toco' | 'Truck' | 'Carreta' | 'Bitrem';
export type VehicleStatus = 'available' | 'loading' | 'in_transit' | 'maintenance';

export interface Vehicle {
  id: string;
  plate: string;
  model: string;
  vehicle_type: VehicleType;
  driver_name: string;
  driver_cpf: string;
  driver_phone?: string;
  carrier: string;
  max_weight_kg: number;
  max_volume_m3: number;
  max_pallets: number;
  status: VehicleStatus;
  created_at: string;
  updated_at: string;
}

export interface SapOrderLine {
  LineNum: number;
  ItemCode: string;
  ItemDescription: string;
  Quantity: number;
  Price: number;
  LineTotal: number;
  WeightKg: number;
  VolumeM3: number;
  UnitOfMeasure: string;
}

export interface SapOrder {
  DocEntry: number;
  DocNum: number;
  CardCode: string;
  CardName: string;
  DocDate: string;
  DocDueDate: string;
  DocTotal: number;
  NumAtCard?: string;
  Comments?: string;
  ShipToCity: string;
  ShipToState: string;
  BPLId?: number;
  BPLName?: string;
  SalesPersonCode?: number;
  SalesPersonName?: string;
  PickListId?: number;
  PickStatus?: string;
  PickStatusDescription?: string;
  TotalWeightKg: number;
  TotalVolumeM3: number;
  EstimatedPallets: number;
  DocumentStatus: 'bost_Open' | 'bost_Close';
  DocumentLines: SapOrderLine[];
}

export interface CapacityOccupancy {
  totalWeightKg: number;
  totalVolumeM3: number;
  totalPallets: number;
  totalValue: number;
  weightOccupancyPercent: number;
  volumeOccupancyPercent: number;
  palletOccupancyPercent: number;
  isOverLimit: boolean;
  warnings: string[];
  recommendedOrders?: SapOrder[];
  remainingOrders?: SapOrder[];
}

export interface LoadAssembly {
  id: string;
  load_number: string;
  vehicle_id: string;
  status: 'draft' | 'closed' | 'shipped' | 'cancelled';
  total_weight_kg: number;
  total_volume_m3: number;
  total_pallets: number;
  total_value: number;
  order_count: number;
  destination_cities?: string;
  observations?: string;
  created_by: string;
  created_at: string;
  closed_at?: string;
  // Join properties
  plate?: string;
  vehicle_model?: string;
  vehicle_type?: VehicleType;
  driver_name?: string;
  driver_cpf?: string;
  driver_phone?: string;
  carrier?: string;
  vehicle_max_weight?: number;
  vehicle_max_volume?: number;
  vehicle_max_pallets?: number;
  branch_id?: number;
  doc_number?: number;
  branch_name?: string;
  branch_code?: string;
  branch_cnpj?: string;
  branch_logo_url?: string;
  client_names?: string[];
  sales_persons?: string[];
  items?: LoadItem[];
  load_items?: any[];
  sap_doc_entry?: number;
  sap_sync_status?: 'pending' | 'synced' | 'already_exists' | 'error';
  sap_synced_at?: string;
  orders?: LoadItem[];
}

export interface Branch {
  id: number;
  code: string;
  name: string;
  cnpj?: string;
  logo_url?: string;
  current_doc_number: number;
  is_active: number;
  created_at?: string;
}

export interface SystemSettings {
  pdf_conference_title?: string;
  global_doc_number?: string;
  default_branch_id?: string;
}

export interface LoadItem {
  id: string;
  load_id: string;
  doc_entry: number;
  doc_num: number;
  card_code: string;
  card_name: string;
  ship_to_city: string;
  ship_to_state: string;
  weight_kg: number;
  volume_m3: number;
  pallets: number;
  doc_total: number;
  doc_date: string;
  num_at_card?: string;
  sales_person_name?: string;
  sales_person_code?: number;
  items_json?: any;
  items_details?: SapOrderLine[];
}

export interface SapStatus {
  connected: boolean;
  mode: 'real' | 'mock';
  serverUrl: string;
  companyDb: string;
  message: string;
  lastChecked: string;
}

export interface AuditLog {
  id: string;
  user_id: string;
  user_name: string;
  action: string;
  details: string;
  ip_address: string;
  created_at: string;
}

