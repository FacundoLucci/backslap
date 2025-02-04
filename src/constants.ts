import { FeedbackConfig } from './types';

export const DEFAULT_CONFIG: FeedbackConfig = {
  position: 'bottom-right',
  theme: {
    primaryColor: '#4F46E5',
    buttonText: 'Send Feedback',
    modalTitle: 'Send Feedback'
  }
};

export const HOSTED_API_ENDPOINT = 'https://api.backslap.io/v1/feedback'; 