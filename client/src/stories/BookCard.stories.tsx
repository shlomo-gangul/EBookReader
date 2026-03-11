import type { Meta, StoryObj } from '@storybook/react';
import { BookCard } from '../components/Library/BookCard';
import type { Book } from '../types';

const meta: Meta<typeof BookCard> = {
  title: 'Library/BookCard',
  component: BookCard,
  parameters: { backgrounds: { default: 'dark' } },
  args: { onClick: () => {} },
};
export default meta;

type Story = StoryObj<typeof BookCard>;

const baseBook: Book = {
  id: '1',
  title: 'Pride and Prejudice',
  authors: [{ name: 'Jane Austen' }],
  source: 'gutenberg',
  subjects: ['Fiction', 'Romance'],
  language: 'en',
};

export const WithCover: Story = {
  args: {
    book: {
      ...baseBook,
      coverUrl: 'https://www.gutenberg.org/cache/epub/1342/pg1342.cover.medium.jpg',
    },
  },
};

export const WithoutCover: Story = {
  args: { book: baseBook },
};

export const LongTitle: Story = {
  args: {
    book: {
      ...baseBook,
      title: 'The Adventures of Sherlock Holmes: A Collection of Twelve Short Stories',
      authors: [{ name: 'Arthur Conan Doyle' }],
    },
  },
};

export const OpenLibrarySource: Story = {
  args: {
    book: { ...baseBook, source: 'openlibrary', publishDate: '1813' },
  },
};
