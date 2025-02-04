import { FeedbackWidget } from './FeedbackWidget';
export type { FeedbackWidgetConfig, FeedbackData } from './FeedbackWidget';

// Auto-register the web component if in browser environment
if (typeof window !== 'undefined') {
  if (!customElements.get('feedback-widget')) {
    customElements.define('feedback-widget', FeedbackWidget);
  }
} 