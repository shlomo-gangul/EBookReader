import type { Meta, StoryObj } from '@storybook/react';
import { DictionaryPopup } from '../components/Reader/DictionaryPopup';

const meta: Meta<typeof DictionaryPopup> = {
  title: 'Reader/DictionaryPopup',
  component: DictionaryPopup,
  parameters: { backgrounds: { default: 'dark' } },
  args: {
    word: 'ephemeral',
    x: 400,
    y: 200,
    onClose: () => {},
    entry: null,
    isLoading: false,
    error: null,
  },
};
export default meta;

type Story = StoryObj<typeof DictionaryPopup>;

export const Loading: Story = {
  args: { isLoading: true },
};

export const WithDefinition: Story = {
  args: {
    entry: {
      word: 'ephemeral',
      phonetic: '/ɪˈfem.ər.əl/',
      meanings: [
        {
          partOfSpeech: 'adjective',
          definitions: [
            { definition: 'Lasting for a very short time; transitory.' },
            { definition: 'Existing only for a day, as certain plants or insects do.' },
          ],
        },
        {
          partOfSpeech: 'noun',
          definitions: [
            { definition: 'An ephemeral plant.' },
          ],
        },
      ],
    },
  },
};

export const NotFound: Story = {
  args: { error: 'No definition found' },
};
