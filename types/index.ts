export interface Client {
  ClientID: string;
  ClientName: string;
  PriorityLevel: number;
  RequestedTaskIDs: string[];
  GroupTag: string;
  AttributesJSON: string | object;
}

export interface Worker {
  WorkerID: string;
  WorkerName: string;
  Skills: string[];
  AvailableSlots: number[];
  MaxLoadPerPhase: number;
  WorkerGroup: string;
  QualificationLevel: number;
}

export interface Task {
  TaskID: string;
  TaskName: string;
  Category: string;
  Duration: number;
  RequiredSkills: string[];
  PreferredPhases: number[] | string;
  MaxConcurrent: number;
}

export interface ValidationError {
  id: string;
  type: 'error' | 'warning' | 'info';
  message: string;
  field?: string;
  rowIndex?: number;
  entity: 'client' | 'worker' | 'task';
  suggestions?: string[];
}

export interface BusinessRule {
  id: string;
  type: 'coRun' | 'slotRestriction' | 'loadLimit' | 'phaseWindow' | 'patternMatch' | 'precedenceOverride';
  name: string;
  description: string;
  parameters: Record<string, any>;
  isActive: boolean;
  createdBy: 'user' | 'ai';
}

export interface PriorityWeights {
  priorityLevel: number;
  taskFulfillment: number;
  fairness: number;
  workloadBalance: number;
  skillMatching: number;
  phaseOptimization: number;
}

export interface DataState {
  clients: Client[];
  workers: Worker[];
  tasks: Task[];
  validationErrors: ValidationError[];
  businessRules: BusinessRule[];
  priorityWeights: PriorityWeights;
}

export interface AIResponse {
  success: boolean;
  data?: any;
  message?: string;
  suggestions?: string[];
}