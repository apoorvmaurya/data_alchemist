import { useCallback, useRef } from 'react';

interface WorkerMessage {
  type: string;
  payload: any;
}

interface WorkerResponse {
  type: string;
  success: boolean;
  data?: any;
  error?: string;
}

export function useWorker() {
  const workerRef = useRef<Worker | null>(null);

  const initializeWorker = useCallback(() => {
    if (!workerRef.current) {
      try {
        workerRef.current = new Worker(
          new URL('../workers/data-processor.worker.ts', import.meta.url),
          { type: 'module' }
        );
      } catch (error) {
        console.warn('Web Workers not supported, falling back to main thread');
        return null;
      }
    }
    return workerRef.current;
  }, []);

  const postMessage = useCallback((message: WorkerMessage): Promise<WorkerResponse> => {
    return new Promise((resolve, reject) => {
      const worker = initializeWorker();
      
      if (!worker) {
        reject(new Error('Worker not available'));
        return;
      }

      const handleMessage = (e: MessageEvent<WorkerResponse>) => {
        worker.removeEventListener('message', handleMessage);
        worker.removeEventListener('error', handleError);
        
        if (e.data.success) {
          resolve(e.data);
        } else {
          reject(new Error(e.data.error || 'Worker error'));
        }
      };

      const handleError = (error: ErrorEvent) => {
        worker.removeEventListener('message', handleMessage);
        worker.removeEventListener('error', handleError);
        reject(new Error(error.message));
      };

      worker.addEventListener('message', handleMessage);
      worker.addEventListener('error', handleError);
      worker.postMessage(message);
    });
  }, [initializeWorker]);

  const terminateWorker = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
    }
  }, []);

  return {
    postMessage,
    terminateWorker,
    isSupported: () => typeof Worker !== 'undefined'
  };
}