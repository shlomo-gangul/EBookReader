// Utility to communicate with the text processor Web Worker
import type { SplitTextResult } from '../workers/textProcessor.worker';

// Vite's worker import syntax
import TextProcessorWorker from '../workers/textProcessor.worker?worker';

let workerInstance: Worker | null = null;

function getWorker(): Worker {
  if (!workerInstance) {
    workerInstance = new TextProcessorWorker();
  }
  return workerInstance;
}

export interface PageContent {
  pageNumber: number;
  content: string;
}

export function splitTextIntoPages(text: string, charsPerPage = 2000): Promise<PageContent[]> {
  return new Promise((resolve, reject) => {
    const w = getWorker();

    const handleMessage = (event: MessageEvent<SplitTextResult>) => {
      if (event.data.type === 'splitTextResult') {
        w.removeEventListener('message', handleMessage);
        w.removeEventListener('error', handleError);
        resolve(event.data.pages);
      }
    };

    const handleError = (error: ErrorEvent) => {
      w.removeEventListener('message', handleMessage);
      w.removeEventListener('error', handleError);
      reject(new Error(error.message));
    };

    w.addEventListener('message', handleMessage);
    w.addEventListener('error', handleError);

    w.postMessage({ type: 'splitText', text, charsPerPage });
  });
}

// Cleanup function to terminate worker when app unmounts
export function terminateWorker(): void {
  if (workerInstance) {
    workerInstance.terminate();
    workerInstance = null;
  }
}
