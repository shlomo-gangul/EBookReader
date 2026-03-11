import type { Meta, StoryObj } from '@storybook/react';
import { StatsModal } from '../components/Stats/StatsModal';
import type { GlobalStats } from '../types';

const meta: Meta<typeof StatsModal> = {
  title: 'Stats/StatsModal',
  component: StatsModal,
  parameters: { backgrounds: { default: 'dark' } },
  args: { onClose: () => {} },
};
export default meta;

type Story = StoryObj<typeof StatsModal>;

const mockStats: GlobalStats = {
  totalSessions: 12,
  totalMs: 7200000, // 2 hours
  totalPages: 240,
  streak: 5,
  lastReadDate: '2026-03-11',
};

export const WithStats: Story = {
  args: { getGlobalStats: () => mockStats },
};

export const Empty: Story = {
  args: {
    getGlobalStats: () => ({
      totalSessions: 0,
      totalMs: 0,
      totalPages: 0,
      streak: 0,
      lastReadDate: '',
    }),
  },
};
