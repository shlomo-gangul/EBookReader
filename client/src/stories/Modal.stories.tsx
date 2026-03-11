import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { Modal } from '../components/common/Modal';
import { Button } from '../components/common/Button';

const meta: Meta<typeof Modal> = {
  title: 'Common/Modal',
  component: Modal,
  parameters: { backgrounds: { default: 'dark' } },
};
export default meta;

type Story = StoryObj<typeof Modal>;

function ModalDemo({ title }: { title?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="p-8">
      <Button onClick={() => setOpen(true)}>Open Modal</Button>
      <Modal isOpen={open} onClose={() => setOpen(false)} title={title}>
        <p className="text-slate-300">
          This is the modal content. Press Escape or click outside to close.
        </p>
        <div className="mt-4 flex justify-end">
          <Button variant="secondary" onClick={() => setOpen(false)}>Close</Button>
        </div>
      </Modal>
    </div>
  );
}

export const WithTitle: Story = {
  render: () => <ModalDemo title="Reader Settings" />,
};

export const WithoutTitle: Story = {
  render: () => <ModalDemo />,
};
