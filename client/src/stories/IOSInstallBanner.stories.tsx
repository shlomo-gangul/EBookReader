import type { StoryObj } from '@storybook/react';

const meta = {
  title: 'Common/IOSInstallBanner',
  parameters: { backgrounds: { default: 'dark' } },
};
export default meta;

type Story = StoryObj;

// The real component only shows on iOS Safari. We render the inner UI directly for Storybook.
function IOSInstallBannerPreview() {
  return (
    <div className="fixed bottom-0 left-0 right-0 p-4 bg-slate-800 border-t border-slate-700 shadow-2xl">
      <div className="flex items-start gap-3 max-w-lg mx-auto">
        <div className="flex-shrink-0 w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-100">Install BookReader</p>
          <p className="text-xs text-slate-400 mt-1">
            Tap the Share button, then "Add to Home Screen" for the best reading experience.
          </p>
        </div>
        <button className="flex-shrink-0 p-1 hover:bg-slate-700 rounded-lg transition-colors">
          <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}

export const Default: Story = {
  render: () => <IOSInstallBannerPreview />,
};
