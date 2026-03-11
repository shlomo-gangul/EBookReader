import type { Meta, StoryObj } from '@storybook/react';
import { Button } from '../components/common/Button';

const meta: Meta<typeof Button> = {
  title: 'Common/Button',
  component: Button,
  parameters: { backgrounds: { default: 'dark' } },
  tags: ['autodocs'],
  argTypes: {
    variant: { control: 'select', options: ['primary', 'secondary', 'ghost'] },
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
    disabled: { control: 'boolean' },
  },
};
export default meta;

type Story = StoryObj<typeof Button>;

export const Primary: Story = {
  args: { variant: 'primary', size: 'md', children: 'Read Book' },
};

export const Secondary: Story = {
  args: { variant: 'secondary', size: 'md', children: 'Download' },
};

export const Ghost: Story = {
  args: { variant: 'ghost', size: 'md', children: 'Cancel' },
};

export const Small: Story = {
  args: { variant: 'primary', size: 'sm', children: 'Go' },
};

export const Large: Story = {
  args: { variant: 'primary', size: 'lg', children: 'Start Reading' },
};

export const Disabled: Story = {
  args: { variant: 'primary', size: 'md', children: 'Loading...', disabled: true },
};
