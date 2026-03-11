import React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

export function Modal({ isOpen, onClose, title, children }: ModalProps) {
  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 bg-slate-800 rounded-xl shadow-2xl max-w-lg w-[calc(100%-2rem)] max-h-[90vh] overflow-hidden focus:outline-none"
          aria-describedby={undefined}
        >
          <div className="flex items-center justify-between p-4 border-b border-slate-700">
            {title && (
              <Dialog.Title className="text-lg font-semibold text-slate-100">{title}</Dialog.Title>
            )}
            <Dialog.Close
              aria-label="Close dialog"
              className="p-1 rounded-lg hover:bg-slate-700 transition-colors ml-auto"
            >
              <X className="w-5 h-5 text-slate-400" aria-hidden="true" />
            </Dialog.Close>
          </div>
          <div className="p-4 overflow-y-auto max-h-[calc(90vh-4rem)]">
            {children}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
