import html2canvas from 'html2canvas';

export interface FeedbackWidgetConfig {
  apiEndpoint?: string;
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
  screenshot: string | null;
  timestamp: string;
  url: string;
  userAgent: string;
  metadata?: Record<string, any>;
}

export class FeedbackWidget extends HTMLElement {
  shadow: ShadowRoot;
  isOpen: boolean = false;
  private config: FeedbackWidgetConfig = {
    position: 'bottom-right',
    theme: {
      primaryColor: '#4F46E5',
      buttonText: 'Send Feedback',
      modalTitle: 'Send Feedback'
    }
  };

  static get observedAttributes() {
    return ['config'];
  }

  attributeChangedCallback(name: string, _oldValue: string, _newValue: string) {
    if (name === 'config') {
      this.loadConfig();
      this.render();
    }
  }

  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: 'open' });
    this.loadConfig();
    this.render();
  }
  
  loadConfig(): void {
    // Load config from data attributes
    const configAttr = this.getAttribute('config');
    if (configAttr) {
      try {
        const userConfig = JSON.parse(configAttr);
        this.config = {
          ...this.config,
          ...userConfig,
          theme: {
            ...this.config.theme,
            ...(userConfig.theme || {})
          }
        };
      } catch (e) {
        console.error('Invalid config format:', e);
      }
    }
  }
  
  render(): void {
    const { position = 'bottom-right', theme = {
      primaryColor: '#4F46E5',
      buttonText: 'Send Feedback',
      modalTitle: 'Send Feedback'
    }} = this.config;
    const positionStyles = this.getPositionStyles(position);

    this.shadow.innerHTML = `
      <style>
        .widget-container {
          position: fixed;
          ${positionStyles}
          z-index: 10000;
          font-family: system-ui, -apple-system, sans-serif;
          color: #1F2937; /* Base text color */
        }
        
        .feedback-button {
          background: ${theme.primaryColor ?? '#4F46E5'};
          color: white;
          border: none;
          padding: 12px 20px;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 500;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          transition: all 0.2s;
        }
        
        .feedback-button:hover {
          background: #4338CA;
          transform: translateY(-1px);
        }
        
        .feedback-modal {
          position: fixed;
          bottom: 80px;
          right: 20px;
          background: #1F2937; /* Dark background */
          border-radius: 8px;
          box-shadow: 0 4px 6px rgba(0,0,0,0.3);
          padding: 24px; /* Increased padding */
          width: 320px;
          display: none;
          color: #E5E7EB; /* Light text for dark background */
        }
        
        .feedback-modal.open {
          display: block;
        }
        
        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 15px;
        }
        
        .close-button {
          background: none;
          border: none;
          cursor: pointer;
          font-size: 20px;
          color: #9CA3AF; /* Lighter close button */
        }
        
        .modal-header h3 {
          color: #F3F4F6; /* Lighter color for header */
          margin: 0;
          font-size: 1.125rem;
        }
        
        textarea {
          width: 100%;
          min-height: 100px;
          max-height: 40vh;
          margin: 10px 0;
          padding: 8px;
          border: 1px solid #4B5563;
          border-radius: 4px;
          resize: none;
          color: #E5E7EB;
          background: #374151;
          box-sizing: border-box;
          overflow-y: auto;
        }
        
        textarea::placeholder {
          color: #9CA3AF;
        }
        
        .screenshot-preview {
          max-width: 100%;
          margin-top: 10px;
          border: 1px solid #4B5563;
          border-radius: 4px;
        }
        
        .actions {
          display: flex;
          gap: 10px;
          margin-top: 15px;
        }
        
        .submit-button {
          background: #4F46E5;
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 4px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          flex: 1;
        }
        
        .capture-button {
          background: #374151;
          border: 1px solid #4B5563;
          padding: 8px 16px;
          border-radius: 4px;
          cursor: pointer;
          color: #E5E7EB;
          display: none;
          white-space: nowrap;
          display: flex;
          align-items: center;
          gap: 6px;
          flex: 0 0 auto;
        }
        
        .capture-button.show {
          display: flex;
        }

        .shortcut-hint {
          font-size: 12px;
          color: #9CA3AF;
          white-space: nowrap;
        }

        .send-icon {
          width: 16px;
          height: 16px;
          fill: currentColor;
        }
      </style>
      
      <div class="widget-container">
        <button class="feedback-button">${theme.buttonText ?? 'Send Feedback'}</button>
        
        <div class="feedback-modal">
          <div class="modal-header">
            <h3>${theme.modalTitle ?? 'Send Feedback'}</h3>
            <button class="close-button">&times;</button>
          </div>
          
          <form id="feedback-form">
            <div id="screenshot-preview"></div>
            
            <textarea 
              placeholder="Describe your feedback here..."
              required
            ></textarea>
            
            <div class="actions">
              <button type="button" class="capture-button">
                <span>Retake Screenshot</span>
                <span class="shortcut-hint">(⌘/Ctrl + R)</span>
              </button>
              <button type="submit" class="submit-button">
                <span>Send</span>
                <svg class="send-icon" viewBox="0 0 24 24">
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                </svg>
              </button>
            </div>
          </form>
        </div>
      </div>
    `;
  }
  
  private getPositionStyles(position: string): string {
    switch (position) {
      case 'bottom-left':
        return 'bottom: 20px; left: 20px;';
      case 'top-right':
        return 'top: 20px; right: 20px;';
      case 'top-left':
        return 'top: 20px; left: 20px;';
      default:
        return 'bottom: 20px; right: 20px;';
    }
  }
  
  connectedCallback(): void {
    this.setupEventListeners();
  }
  
  setupEventListeners(): void {
    const feedbackButton = this.shadow.querySelector('.feedback-button');
    const closeButton = this.shadow.querySelector('.close-button');
    const captureButton = this.shadow.querySelector('.capture-button');
    const feedbackForm = this.shadow.getElementById('feedback-form');
    const textarea = this.shadow.querySelector('textarea');
    
    feedbackButton?.addEventListener('click', () => this.toggleModal());
    closeButton?.addEventListener('click', () => this.toggleModal());
    captureButton?.addEventListener('click', () => this.takeScreenshot());
    feedbackForm?.addEventListener('submit', (e) => this.handleSubmit(e));
    
    // Add keyboard shortcut for retaking screenshot
    window.addEventListener('keydown', (e) => {
      if (this.isOpen && (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'r') {
        e.preventDefault();
        this.takeScreenshot();
      }
    });

    // Add auto-resize listener for textarea
    textarea?.addEventListener('input', (e) => {
      const target = e.target as HTMLTextAreaElement;
      target.style.height = 'auto';
      target.style.height = Math.min(target.scrollHeight, window.innerHeight * 0.4) + 'px';
    });
  }
  
  toggleModal(): void {
    this.isOpen = !this.isOpen;
    const modal = this.shadow.querySelector('.feedback-modal');
    if (modal) {
      modal.classList.toggle('open', this.isOpen);
      if (this.isOpen) {
        this.takeScreenshot();
      }
    }
  }
  
  async takeScreenshot(): Promise<void> {
    try {
      const canvas = await html2canvas(document.documentElement, {
        backgroundColor: null,
        foreignObjectRendering: true,
        useCORS: true,
        allowTaint: false,
        ignoreElements: (element) => {
          return element.tagName.toLowerCase() === 'feedback-widget';
        },
        onclone: async (clonedDoc) => {
          // Force input values to be rendered
          clonedDoc.querySelectorAll('input, textarea, select').forEach((elem: Element) => {
            if (elem instanceof HTMLInputElement) {
              elem.setAttribute('value', elem.value);
              if (elem.type === 'checkbox' || elem.type === 'radio') {
                if (elem.checked) {
                  elem.setAttribute('checked', 'checked');
                }
              }
            } else if (elem instanceof HTMLTextAreaElement) {
              elem.innerHTML = elem.value;
            } else if (elem instanceof HTMLSelectElement) {
              Array.from(elem.options).forEach((option, index) => {
                if (index === elem.selectedIndex) {
                  option.setAttribute('selected', 'selected');
                } else {
                  option.removeAttribute('selected');
                }
              });
            }
          });

          // Give the browser a moment to render the changes
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      });
      
      const imgData: string = canvas.toDataURL('image/png');
      const previewEl = this.shadow.getElementById('screenshot-preview');
      const captureButton = this.shadow.querySelector('.capture-button');
      
      if (previewEl) {
        previewEl.innerHTML = `
          <img 
            src="${imgData}" 
            alt="Screenshot Preview" 
            class="screenshot-preview" 
          />
        `;
        captureButton?.classList.add('show');
      }
    } catch (error) {
      console.error('Error capturing screenshot:', error);
    }
  }
  
  async handleSubmit(e: Event): Promise<void> {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const textarea = form.querySelector('textarea');
    const screenshotImg = this.shadow.querySelector('.screenshot-preview');
    const previewEl = this.shadow.getElementById('screenshot-preview');
    
    if (!textarea) return;
    
    const feedback = {
      message: textarea.value,
      screenshot: screenshotImg ? screenshotImg.getAttribute('src') : null,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent,
    };
    
    try {
      if (this.config.onSubmit) {
        await this.config.onSubmit(feedback);
      } else if (this.config.apiEndpoint) {
        const response = await fetch(this.config.apiEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(feedback),
        });
        
        if (!response.ok) {
          throw new Error('Failed to submit feedback');
        }
      }
      
      // Reset form and close modal
      form.reset();
      if (previewEl) {
        previewEl.innerHTML = '';
      }
      this.toggleModal();
    } catch (error) {
      console.error('Error submitting feedback:', error);
      // TODO: Show error message to user
    }
  }

  public getConfig(): FeedbackWidgetConfig {
    return { ...this.config };
  }
}

customElements.define('feedback-widget', FeedbackWidget);
