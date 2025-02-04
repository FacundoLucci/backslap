import { describe, it, expect, beforeEach } from 'vitest';
import { FeedbackWidget } from '../FeedbackWidget';

describe('FeedbackWidget', () => {
  let widget: FeedbackWidget;

  beforeEach(() => {
    widget = new FeedbackWidget();
  });

  it('should initialize with default config', () => {
    expect(widget).toBeDefined();
  });

  it('should handle config updates', () => {
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

  it('should initialize closed', () => {
    expect(widget.isOpen).toBe(false);
  });
}); 