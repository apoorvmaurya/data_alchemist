import { Client, Worker, Task, ValidationError } from '@/types';

export class DataValidator {
  private clients: Client[] = [];
  private workers: Worker[] = [];
  private tasks: Task[] = [];
  private errors: ValidationError[] = [];

  constructor(clients: Client[], workers: Worker[], tasks: Task[]) {
    this.clients = clients;
    this.workers = workers;
    this.tasks = tasks;
    this.errors = [];
  }

  validateAll(): ValidationError[] {
    this.errors = [];
    
    this.validateClients();
    this.validateWorkers();
    this.validateTasks();
    this.validateCrossReferences();
    this.validateCapacityConstraints();
    
    return this.errors;
  }

  private validateClients(): void {
    const clientIds = new Set<string>();
    
    this.clients.forEach((client, index) => {
      // Check for missing required fields
      if (!client.ClientID) {
        this.addError('error', 'Missing ClientID', 'ClientID', index, 'client');
      }
      
      if (!client.ClientName) {
        this.addError('error', 'Missing ClientName', 'ClientName', index, 'client');
      }
      
      // Check for duplicate IDs
      if (clientIds.has(client.ClientID)) {
        this.addError('error', `Duplicate ClientID: ${client.ClientID}`, 'ClientID', index, 'client');
      }
      clientIds.add(client.ClientID);
      
      // Validate PriorityLevel range
      if (client.PriorityLevel < 1 || client.PriorityLevel > 5) {
        this.addError('error', 'PriorityLevel must be between 1-5', 'PriorityLevel', index, 'client');
      }
      
      // Validate RequestedTaskIDs format
      if (!Array.isArray(client.RequestedTaskIDs)) {
        this.addError('error', 'RequestedTaskIDs must be an array', 'RequestedTaskIDs', index, 'client');
      }
      
      // Validate AttributesJSON
      if (typeof client.AttributesJSON === 'string') {
        try {
          JSON.parse(client.AttributesJSON);
        } catch {
          this.addError('error', 'Invalid JSON in AttributesJSON', 'AttributesJSON', index, 'client');
        }
      }
    });
  }

  private validateWorkers(): void {
    const workerIds = new Set<string>();
    
    this.workers.forEach((worker, index) => {
      // Check for missing required fields
      if (!worker.WorkerID) {
        this.addError('error', 'Missing WorkerID', 'WorkerID', index, 'worker');
      }
      
      if (!worker.WorkerName) {
        this.addError('error', 'Missing WorkerName', 'WorkerName', index, 'worker');
      }
      
      // Check for duplicate IDs
      if (workerIds.has(worker.WorkerID)) {
        this.addError('error', `Duplicate WorkerID: ${worker.WorkerID}`, 'WorkerID', index, 'worker');
      }
      workerIds.add(worker.WorkerID);
      
      // Validate Skills format
      if (!Array.isArray(worker.Skills)) {
        this.addError('error', 'Skills must be an array', 'Skills', index, 'worker');
      }
      
      // Validate AvailableSlots format and values
      if (!Array.isArray(worker.AvailableSlots)) {
        this.addError('error', 'AvailableSlots must be an array', 'AvailableSlots', index, 'worker');
      } else {
        const invalidSlots = worker.AvailableSlots.filter(slot => !Number.isInteger(slot) || slot < 1);
        if (invalidSlots.length > 0) {
          this.addError('error', 'AvailableSlots must contain positive integers', 'AvailableSlots', index, 'worker');
        }
      }
      
      // Validate MaxLoadPerPhase
      if (!Number.isInteger(worker.MaxLoadPerPhase) || worker.MaxLoadPerPhase < 1) {
        this.addError('error', 'MaxLoadPerPhase must be a positive integer', 'MaxLoadPerPhase', index, 'worker');
      }
      
      // Check if worker is overloaded
      if (worker.AvailableSlots.length < worker.MaxLoadPerPhase) {
        this.addError('warning', 'Worker has more max load than available slots', 'MaxLoadPerPhase', index, 'worker');
      }
    });
  }

  private validateTasks(): void {
    const taskIds = new Set<string>();
    
    this.tasks.forEach((task, index) => {
      // Check for missing required fields
      if (!task.TaskID) {
        this.addError('error', 'Missing TaskID', 'TaskID', index, 'task');
      }
      
      if (!task.TaskName) {
        this.addError('error', 'Missing TaskName', 'TaskName', index, 'task');
      }
      
      // Check for duplicate IDs
      if (taskIds.has(task.TaskID)) {
        this.addError('error', `Duplicate TaskID: ${task.TaskID}`, 'TaskID', index, 'task');
      }
      taskIds.add(task.TaskID);
      
      // Validate Duration
      if (!Number.isInteger(task.Duration) || task.Duration < 1) {
        this.addError('error', 'Duration must be a positive integer', 'Duration', index, 'task');
      }
      
      // Validate RequiredSkills format
      if (!Array.isArray(task.RequiredSkills)) {
        this.addError('error', 'RequiredSkills must be an array', 'RequiredSkills', index, 'task');
      }
      
      // Validate MaxConcurrent
      if (!Number.isInteger(task.MaxConcurrent) || task.MaxConcurrent < 1) {
        this.addError('error', 'MaxConcurrent must be a positive integer', 'MaxConcurrent', index, 'task');
      }
      
      // Validate PreferredPhases format
      if (typeof task.PreferredPhases === 'string') {
        if (!this.isValidPhaseRange(task.PreferredPhases)) {
          this.addError('error', 'Invalid PreferredPhases format', 'PreferredPhases', index, 'task');
        }
      } else if (!Array.isArray(task.PreferredPhases)) {
        this.addError('error', 'PreferredPhases must be an array or range string', 'PreferredPhases', index, 'task');
      }
    });
  }

  private validateCrossReferences(): void {
    const taskIds = new Set(this.tasks.map(t => t.TaskID));
    const allWorkerSkills = new Set(this.workers.flatMap(w => w.Skills));
    
    // Validate client requested tasks exist
    this.clients.forEach((client, index) => {
      if (Array.isArray(client.RequestedTaskIDs)) {
        const invalidTasks = client.RequestedTaskIDs.filter(taskId => !taskIds.has(taskId));
        if (invalidTasks.length > 0) {
          this.addError('error', `Unknown task references: ${invalidTasks.join(', ')}`, 'RequestedTaskIDs', index, 'client');
        }
      }
    });
    
    // Validate task required skills are available
    this.tasks.forEach((task, index) => {
      if (Array.isArray(task.RequiredSkills)) {
        const unavailableSkills = task.RequiredSkills.filter(skill => !allWorkerSkills.has(skill));
        if (unavailableSkills.length > 0) {
          this.addError('error', `No workers have required skills: ${unavailableSkills.join(', ')}`, 'RequiredSkills', index, 'task');
        }
      }
    });
  }

  private validateCapacityConstraints(): void {
    // Check phase-slot saturation
    const phaseSlots = new Map<number, number>();
    
    this.workers.forEach(worker => {
      if (Array.isArray(worker.AvailableSlots)) {
        worker.AvailableSlots.forEach(phase => {
          phaseSlots.set(phase, (phaseSlots.get(phase) || 0) + worker.MaxLoadPerPhase);
        });
      }
    });
    
    // Check if total task duration exceeds available slots per phase
    const phaseDemand = new Map<number, number>();
    this.tasks.forEach(task => {
      if (Array.isArray(task.PreferredPhases)) {
        task.PreferredPhases.forEach((phase: number) => {
          phaseDemand.set(phase, (phaseDemand.get(phase) || 0) + task.Duration);
        });
      }
    });
    
    phaseDemand.forEach((demand, phase) => {
      const available = phaseSlots.get(phase) || 0;
      if (demand > available) {
        this.addError('warning', `Phase ${phase} is oversaturated: ${demand} duration needed, ${available} slots available`, undefined, undefined, 'task');
      }
    });
  }

  private isValidPhaseRange(range: string): boolean {
    // Check if it's a range like "1-3" or "2-5"
    const rangePattern = /^\d+-\d+$/;
    return rangePattern.test(range);
  }

  private addError(type: 'error' | 'warning' | 'info', message: string, field?: string, rowIndex?: number, entity?: 'client' | 'worker' | 'task'): void {
    this.errors.push({
      id: `${Date.now()}-${Math.random()}`,
      type,
      message,
      field,
      rowIndex,
      entity: entity || 'client'
    });
  }
}

export function parsePhaseRange(phases: string | number[]): number[] {
  if (Array.isArray(phases)) {
    return phases;
  }
  
  if (typeof phases === 'string') {
    if (phases.includes('-')) {
      const [start, end] = phases.split('-').map(Number);
      return Array.from({ length: end - start + 1 }, (_, i) => start + i);
    }
    
    try {
      return JSON.parse(phases);
    } catch {
      return [];
    }
  }
  
  return [];
}