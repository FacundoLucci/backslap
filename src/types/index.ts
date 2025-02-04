export interface FeedbackConfig {
  apiEndpoint?: string;
  apiKey?: string;
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  theme?: {
    primaryColor?: string;
    buttonText?: string;
    modalTitle?: string;
  };
  onSubmit?: (_feedback: FeedbackData) => Promise<void>;
}

export interface FeedbackData {
  message: string;
  screenshot?: string;
  timestamp: string;
  url: string;
  userAgent: string;
  metadata?: Record<string, any>;
} 