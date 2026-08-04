export interface AppliedProduct {
  productId: string;
  name: string;
  quantity: number;
  unit: string;
  estimatedPrice: number;
  realPrice: number;
}

// 1. La Entidad pura
export interface Task {
  id: string;
  dateTime: Date;
  name: string;
  description: string;
  affectedFields: string[];
  appliedProducts: AppliedProduct[];
}

// 2. El Contrato
// Path: farms/{farmId}/seasons/{seasonId}/tasks/{taskId}
export interface ITaskRepository {
  create(farmId: string, seasonId: string, task: Omit<Task, 'id'>): Promise<string>;
  getById(farmId: string, seasonId: string, id: string): Promise<Task | null>;
  update(farmId: string, seasonId: string, task: Task): Promise<string>;
  delete(farmId: string, seasonId: string, id: string): Promise<string>;
  listBySeason(farmId: string, seasonId: string): Promise<Task[]>;
}
