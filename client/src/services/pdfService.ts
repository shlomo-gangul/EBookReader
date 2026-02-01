import * as pdfjsLib from 'pdfjs-dist';

// Set the worker source
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export interface PdfDocument {
  numPages: number;
  getPage: (pageNum: number) => Promise<PdfPage>;
  destroy: () => void;
}

export interface PdfPage {
  pageNumber: number;
  render: (canvas: HTMLCanvasElement, scale?: number) => Promise<void>;
  getTextContent: () => Promise<string>;
}

export async function loadPdf(source: File | string): Promise<PdfDocument> {
  let loadingTask;

  if (source instanceof File) {
    const arrayBuffer = await source.arrayBuffer();
    loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  } else {
    loadingTask = pdfjsLib.getDocument(source);
  }

  const pdf = await loadingTask.promise;

  return {
    numPages: pdf.numPages,
    getPage: async (pageNum: number): Promise<PdfPage> => {
      const page = await pdf.getPage(pageNum);

      return {
        pageNumber: pageNum,
        render: async (canvas: HTMLCanvasElement, scale = 1.5) => {
          const viewport = page.getViewport({ scale });
          const context = canvas.getContext('2d');

          if (!context) {
            throw new Error('Could not get canvas context');
          }

          canvas.height = viewport.height;
          canvas.width = viewport.width;

          await page.render({
            canvasContext: context,
            viewport: viewport,
          }).promise;
        },
        getTextContent: async () => {
          const textContent = await page.getTextContent();
          return textContent.items
            .map((item) => ('str' in item ? item.str : ''))
            .join(' ');
        },
      };
    },
    destroy: () => {
      pdf.destroy();
    },
  };
}

export async function renderPdfPageToImage(
  pdf: PdfDocument,
  pageNum: number,
  scale = 1.5
): Promise<string> {
  const page = await pdf.getPage(pageNum);
  const canvas = document.createElement('canvas');
  await page.render(canvas, scale);
  return canvas.toDataURL('image/png');
}

export async function extractPdfMetadata(file: File): Promise<{
  title?: string;
  author?: string;
  pageCount: number;
}> {
  const pdf = await loadPdf(file);
  const numPages = pdf.numPages;

  // Try to get metadata from the first page or document info
  let title: string | undefined;
  let author: string | undefined;

  try {
    // PDF.js doesn't expose metadata directly in the simplified interface
    // The title is often just the filename without extension
    title = file.name.replace(/\.pdf$/i, '');
  } catch {
    // Metadata extraction failed, use defaults
  }

  pdf.destroy();

  return {
    title,
    author,
    pageCount: numPages,
  };
}
