import { describe, it, expect } from 'vitest';
import { FeedbackWidget } from '../FeedbackWidget';

describe('FeedbackWidget', () => {
  it('should initialize with default config', () => {
    const widget = new FeedbackWidget();
    expect(widget).toBeDefined();
  });

  it('should handle config updates', () => {
    const widget = new FeedbackWidget();
    const config = {
      position: 'top-right',
      theme: {
        primaryColor: '#000000'
      }
    };
    widget.setAttribute('config', JSON.stringify(config));
    expect(widget.getConfig().position).toBe('top-right');
  });

  it('should capture screenshots', async () => {
    // Add screenshot capture tests
  });

  it('should submit feedback', async () => {
    // Add feedback submission tests
  });
}); 