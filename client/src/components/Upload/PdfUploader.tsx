import React, { useCallback, useState } from 'react';
import { Upload, FileText, X, AlertCircle } from 'lucide-react';
import { Button, Spinner } from '../common';

interface PdfUploaderProps {
  onUpload: (file: File) => Promise<void>;
  onEpubUpload?: (file: File) => Promise<void>;
  onMobiUpload?: (file: File) => Promise<void>;
  isLoading: boolean;
}

export function PdfUploader({ onUpload, onEpubUpload, onMobiUpload, isLoading }: PdfUploaderProps) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  const validateFile = (file: File): boolean => {
    const name = file.name.toLowerCase();
    const isPdf = file.type.includes('pdf') || name.endsWith('.pdf');
    const isEpub = file.type === 'application/epub+zip' || name.endsWith('.epub');
    const isMobi = name.endsWith('.mobi') || name.endsWith('.azw') || name.endsWith('.azw3');

    if (!isPdf && !isEpub && !isMobi) {
      setError('Please select a PDF, EPUB, MOBI, or AZW3 file');
      return false;
    }
    if (file.size > 100 * 1024 * 1024) {
      setError('File size must be less than 100MB');
      return false;
    }
    setError(null);
    return true;
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const file = e.dataTransfer.files?.[0];
    if (file && validateFile(file)) {
      setSelectedFile(file);
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && validateFile(file)) {
      setSelectedFile(file);
    }
  }, []);

  const handleUpload = async () => {
    if (selectedFile) {
      try {
        const name = selectedFile.name.toLowerCase();
        const isEpub = name.endsWith('.epub');
        const isMobi = name.endsWith('.mobi') || name.endsWith('.azw') || name.endsWith('.azw3');

        if (isEpub && onEpubUpload) {
          await onEpubUpload(selectedFile);
        } else if (isMobi && onMobiUpload) {
          await onMobiUpload(selectedFile);
        } else {
          await onUpload(selectedFile);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Upload failed');
      }
    }
  };

  const handleClear = () => {
    setSelectedFile(null);
    setError(null);
  };

  return (
    <div className="w-full max-w-xl mx-auto">
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all ${
          dragActive
            ? 'border-blue-500 bg-blue-500/10'
            : 'border-slate-600 hover:border-slate-500'
        }`}
      >
        {isLoading ? (
          <div className="py-8">
            <Spinner size="lg" className="mx-auto" />
            <p className="mt-4 text-slate-400">Processing PDF...</p>
          </div>
        ) : selectedFile ? (
          <div className="py-4">
            <div className="flex items-center justify-center gap-3 mb-4">
              <FileText className="w-12 h-12 text-blue-400" />
              <div className="text-left">
                <p className="text-slate-100 font-medium">{selectedFile.name}</p>
                <p className="text-sm text-slate-400">
                  {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                </p>
              </div>
              <button
                onClick={handleClear}
                className="p-1 hover:bg-slate-700 rounded-full ml-2"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <Button onClick={handleUpload} disabled={isLoading}>
              <Upload className="w-4 h-4 mr-2" />
              Open File
            </Button>
          </div>
        ) : (
          <>
            <Upload className="w-12 h-12 mx-auto text-slate-500 mb-4" />
            <p className="text-slate-300 mb-2">
              Drag and drop your file here, or{' '}
              <label className="text-blue-400 hover:text-blue-300 cursor-pointer">
                browse
                <input
                  type="file"
                  accept=".pdf,.epub,.mobi,.azw,.azw3,application/pdf,application/epub+zip"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </label>
            </p>
            <p className="text-sm text-slate-500">PDF, EPUB, MOBI, or AZW3 files up to 100MB</p>
          </>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 mt-4 p-3 bg-red-900/20 border border-red-800 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}
    </div>
  );
}
