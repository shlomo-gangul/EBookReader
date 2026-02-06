// Web Worker for text processing - runs off main thread
// Handles splitting large texts into pages without blocking UI

export interface SplitTextMessage {
  type: 'splitText';
  text: string;
  charsPerPage: number;
}

export interface SplitTextResult {
  type: 'splitTextResult';
  pages: Array<{ pageNumber: number; content: string }>;
}

self.onmessage = (event: MessageEvent<SplitTextMessage>) => {
  const { type, text, charsPerPage } = event.data;

  if (type === 'splitText') {
    const pages = splitTextIntoPages(text, charsPerPage);
    self.postMessage({ type: 'splitTextResult', pages } as SplitTextResult);
  }
};

function splitTextIntoPages(text: string, charsPerPage = 2000) {
  // Normalize line endings and split by double newlines
  const normalizedText = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const paragraphs = normalizedText.split(/\n\n+/);
  const pageContents: Array<{ pageNumber: number; content: string }> = [];
  let currentContent = '';
  let pageNumber = 1;

  for (const paragraph of paragraphs) {
    if (currentContent.length + paragraph.length > charsPerPage && currentContent.length > 0) {
      pageContents.push({
        pageNumber: pageNumber++,
        content: currentContent.trim(),
      });
      currentContent = paragraph;
    } else {
      currentContent += (currentContent ? '\n\n' : '') + paragraph;
    }
  }

  if (currentContent.trim()) {
    pageContents.push({
      pageNumber: pageNumber,
      content: currentContent.trim(),
    });
  }

  return pageContents;
}
