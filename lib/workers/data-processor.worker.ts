// Web Worker for heavy data processing tasks
import { Client, Worker, Task, ValidationError } from '@/types';

interface ProcessingMessage {
  type: 'VALIDATE_DATA' | 'PARSE_FILE' | 'TRANSFORM_DATA';
  payload: any;
}

interface ProcessingResponse {
  type: string;
  success: boolean;
  data?: any;
  error?: string;
}

self.onmessage = function(e: MessageEvent<ProcessingMessage>) {
  const { type, payload } = e.data;
  
  try {
    switch (type) {
      case 'VALIDATE_DATA':
        const validationResult = validateDataInWorker(payload);
        postMessage({
          type: 'VALIDATION_COMPLETE',
          success: true,
          data: validationResult
        } as ProcessingResponse);
        break;
        
      case 'PARSE_FILE':
        const parseResult = parseFileInWorker(payload);
        postMessage({
          type: 'PARSE_COMPLETE',
          success: true,
          data: parseResult
        } as ProcessingResponse);
        break;
        
      case 'TRANSFORM_DATA':
        const transformResult = transformDataInWorker(payload);
        postMessage({
          type: 'TRANSFORM_COMPLETE',
          success: true,
          data: transformResult
        } as ProcessingResponse);
        break;
        
      default:
        postMessage({
          type: 'ERROR',
          success: false,
          error: `Unknown message type: ${type}`
        } as ProcessingResponse);
    }
  } catch (error) {
    postMessage({
      type: 'ERROR',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    } as ProcessingResponse);
  }
};

function validateDataInWorker(data: { clients: Client[], workers: Worker[], tasks: Task[] }): ValidationError[] {
  const errors: ValidationError[] = [];
  const { clients, workers, tasks } = data;
  
  // Validate clients
  const clientIds = new Set<string>();
  clients.forEach((client, index) => {
    if (!client.ClientID) {
      errors.push({
        id: `client-${index}-id`,
        type: 'error',
        message: 'Missing ClientID',
        field: 'ClientID',
        rowIndex: index,
        entity: 'client'
      });
    }
    
    if (clientIds.has(client.ClientID)) {
      errors.push({
        id: `client-${index}-duplicate`,
        type: 'error',
        message: `Duplicate ClientID: ${client.ClientID}`,
        field: 'ClientID',
        rowIndex: index,
        entity: 'client'
      });
    }
    clientIds.add(client.ClientID);
    
    if (client.PriorityLevel < 1 || client.PriorityLevel > 5) {
      errors.push({
        id: `client-${index}-priority`,
        type: 'error',
        message: 'PriorityLevel must be between 1-5',
        field: 'PriorityLevel',
        rowIndex: index,
        entity: 'client'
      });
    }
  });
  
  // Validate workers
  const workerIds = new Set<string>();
  workers.forEach((worker, index) => {
    if (!worker.WorkerID) {
      errors.push({
        id: `worker-${index}-id`,
        type: 'error',
        message: 'Missing WorkerID',
        field: 'WorkerID',
        rowIndex: index,
        entity: 'worker'
      });
    }
    
    if (workerIds.has(worker.WorkerID)) {
      errors.push({
        id: `worker-${index}-duplicate`,
        type: 'error',
        message: `Duplicate WorkerID: ${worker.WorkerID}`,
        field: 'WorkerID',
        rowIndex: index,
        entity: 'worker'
      });
    }
    workerIds.add(worker.WorkerID);
    
    if (!Array.isArray(worker.Skills)) {
      errors.push({
        id: `worker-${index}-skills`,
        type: 'error',
        message: 'Skills must be an array',
        field: 'Skills',
        rowIndex: index,
        entity: 'worker'
      });
    }
  });
  
  // Validate tasks
  const taskIds = new Set<string>();
  tasks.forEach((task, index) => {
    if (!task.TaskID) {
      errors.push({
        id: `task-${index}-id`,
        type: 'error',
        message: 'Missing TaskID',
        field: 'TaskID',
        rowIndex: index,
        entity: 'task'
      });
    }
    
    if (taskIds.has(task.TaskID)) {
      errors.push({
        id: `task-${index}-duplicate`,
        type: 'error',
        message: `Duplicate TaskID: ${task.TaskID}`,
        field: 'TaskID',
        rowIndex: index,
        entity: 'task'
      });
    }
    taskIds.add(task.TaskID);
    
    if (task.Duration < 1) {
      errors.push({
        id: `task-${index}-duration`,
        type: 'error',
        message: 'Duration must be positive',
        field: 'Duration',
        rowIndex: index,
        entity: 'task'
      });
    }
  });
  
  return errors;
}

function parseFileInWorker(payload: { fileContent: string, fileType: string }): any {
  // Implement file parsing logic here
  // This is a placeholder for the actual implementation
  return { success: true, data: [] };
}

function transformDataInWorker(payload: { data: any[], mapping: Record<string, string> }): any {
  // Implement data transformation logic here
  // This is a placeholder for the actual implementation
  return { success: true, data: payload.data };
}

export {};