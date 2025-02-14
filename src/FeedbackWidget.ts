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
  defaultFullPage?: boolean;
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
  private isFullPage: boolean = false;

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
        this.isFullPage = !!userConfig.defaultFullPage;
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

        .capture-options {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 10px;
          color: #9CA3AF;
          font-size: 14px;
        }

        .toggle-switch {
          position: relative;
          display: inline-block;
          width: 36px;
          height: 20px;
        }

        .toggle-switch input {
          opacity: 0;
          width: 0;
          height: 0;
        }

        .toggle-slider {
          position: absolute;
          cursor: pointer;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: #4B5563;
          transition: .4s;
          border-radius: 20px;
        }

        .toggle-slider:before {
          position: absolute;
          content: "";
          height: 16px;
          width: 16px;
          left: 2px;
          bottom: 2px;
          background-color: white;
          transition: .4s;
          border-radius: 50%;
        }

        input:checked + .toggle-slider {
          background-color: #4F46E5;
        }

        input:checked + .toggle-slider:before {
          transform: translateX(16px);
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
            
            <div class="capture-options">
              <label class="toggle-switch">
                <input type="checkbox" id="full-page-toggle" ${this.isFullPage ? 'checked' : ''}>
                <span class="toggle-slider"></span>
              </label>
              <span>Capture full page</span>
            </div>

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

    const fullPageToggle = this.shadow.getElementById('full-page-toggle');
    fullPageToggle?.addEventListener('change', (e) => {
      this.isFullPage = (e.target as HTMLInputElement).checked;
      this.takeScreenshot();
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
      // Pre-screenshot preparation
      const prepareDynamicContent = () => {
        // Force all custom web fonts to load
        document.fonts?.ready;
        
        // Force all images to load
        const images = Array.from(document.images);
        return Promise.all(images.map(img => {
          if (img.complete) return Promise.resolve();
          return new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
          });
        }));
      };

      // Wait for dynamic content to be ready
      await prepareDynamicContent();

      const baseOptions = {
        backgroundColor: '#ffffff',
        foreignObjectRendering: true,
        useCORS: true,
        allowTaint: false,
        logging: false,
        scale: window.devicePixelRatio || 1,
        removeContainer: false,
        // Improved canvas rendering quality
        imageTimeout: 2000,
        pixelRatio: window.devicePixelRatio,
        // Better SVG handling
        svgRendering: true,
        // Improved text rendering
        letterRendering: true,
        // Handle fixed position elements better
        windowWidth: document.documentElement.clientWidth,
        windowHeight: document.documentElement.clientHeight,
        // Ignore the feedback widget itself
        ignoreElements: (element: Element) => {
          return element.tagName.toLowerCase() === 'feedback-widget' ||
                 (element instanceof HTMLElement && element.style.display === 'none');
        },
        onclone: async (clonedDoc: Document) => {
          // Helper function to copy all computed styles
          const copyComputedStyles = (originalElement: Element, clonedElement: HTMLElement) => {
            const computedStyle = window.getComputedStyle(originalElement);
            for (const prop of computedStyle) {
              try {
                const value = computedStyle.getPropertyValue(prop);
                if (value && value !== 'initial' && value !== 'none') {
                  clonedElement.style.setProperty(prop, value, 'important');
                }
              } catch (e) {
                // Some properties might not be settable, skip them
              }
            }

            // Handle pseudo-elements and states
            ['::before', '::after', ':hover', ':focus', ':active', '::placeholder'].forEach(pseudo => {
              const pseudoStyle = window.getComputedStyle(originalElement, pseudo);
              const styleText = Array.from(pseudoStyle).map(prop => {
                const value = pseudoStyle.getPropertyValue(prop);
                if (value && value !== 'initial' && value !== 'none') {
                  return `${prop}: ${value} !important;`;
                }
                return '';
              }).filter(Boolean).join('\n');

              if (styleText) {
                const styleEl = clonedDoc.createElement('style');
                styleEl.textContent = `
                  #${clonedElement.id}${pseudo} {
                    ${styleText}
                  }
                `;
                clonedDoc.head.appendChild(styleEl);
              }
            });
          };

          // Copy all font faces to ensure correct font rendering
          const fontFaces = Array.from(document.styleSheets)
            .filter(sheet => {
              try {
                return sheet.cssRules; // This will throw if it's a cross-origin stylesheet
              } catch (e) {
                return false;
              }
            })
            .flatMap(sheet => Array.from(sheet.cssRules))
            .filter(rule => rule instanceof CSSFontFaceRule)
            .map(rule => rule.cssText);

          if (fontFaces.length > 0) {
            const fontFaceStyle = clonedDoc.createElement('style');
            fontFaceStyle.textContent = fontFaces.join('\n');
            clonedDoc.head.appendChild(fontFaceStyle);
          }

          // Handle form elements
          clonedDoc.querySelectorAll('input, textarea, select').forEach((clonedElem: Element) => {
            if (clonedElem instanceof HTMLInputElement || clonedElem instanceof HTMLTextAreaElement) {
              if (!clonedElem.id) {
                clonedElem.id = `clone-${Math.random().toString(36).substr(2, 9)}`;
              }

              const selector = clonedElem.id ? 
                `#${clonedElem.id}` : 
                `${clonedElem.tagName.toLowerCase()}[name="${clonedElem.getAttribute('name') || ''}"]`;
              
              const originalElem = document.querySelector(selector);
              
              if (originalElem && clonedElem instanceof HTMLElement) {
                copyComputedStyles(originalElem, clonedElem);

                // Handle placeholders
                const placeholderStyle = clonedDoc.createElement('style');
                placeholderStyle.textContent = `
                  #${clonedElem.id}::placeholder {
                    color: ${window.getComputedStyle(originalElem).color} !important;
                    opacity: 0.7 !important;
                  }
                `;
                clonedDoc.head.appendChild(placeholderStyle);

                // Copy input values
                if (clonedElem instanceof HTMLInputElement) {
                  clonedElem.value = (originalElem as HTMLInputElement).value;
                  if (clonedElem.type === 'checkbox' || clonedElem.type === 'radio') {
                    clonedElem.checked = (originalElem as HTMLInputElement).checked;
                  }
                } else if (clonedElem instanceof HTMLTextAreaElement) {
                  clonedElem.value = (originalElem as HTMLTextAreaElement).value;
                }
              }
            } else if (clonedElem instanceof HTMLSelectElement) {
              const originalSelect = document.querySelector(`select[name="${clonedElem.getAttribute('name')}"]`);
              if (originalSelect instanceof HTMLSelectElement) {
                clonedElem.value = originalSelect.value;
              }
            }
          });

          // Handle iframes
          clonedDoc.querySelectorAll('iframe').forEach(iframe => {
            try {
              if (iframe.contentDocument) {
                const style = document.createElement('style');
                style.textContent = Array.from(iframe.contentDocument.styleSheets)
                  .flatMap(sheet => Array.from(sheet.cssRules))
                  .map(rule => rule.cssText)
                  .join('\n');
                iframe.contentDocument.head.appendChild(style);
              }
            } catch (e) {
              // Cross-origin iframe, can't access content
            }
          });

          // Add a delay to ensure all styles are applied
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      };

      const docElement = document.documentElement;
      const body = document.body;

      // Calculate dimensions including borders and padding
      const computeFullHeight = (element: Element): number => {
        if (element instanceof HTMLElement) {
          const styles = window.getComputedStyle(element);
          const marginTop = parseFloat(styles.marginTop);
          const marginBottom = parseFloat(styles.marginBottom);
          const height = element.getBoundingClientRect().height;
          return height + marginTop + marginBottom;
        }
        return 0;
      };

      // Calculate full page dimensions
      const contentHeight = Math.max(
        Array.from(body.children).reduce((acc, el) => acc + computeFullHeight(el), 0),
        docElement.scrollHeight,
        body.scrollHeight,
        window.innerHeight
      );
      
      const contentWidth = Math.max(
        body.getBoundingClientRect().width,
        docElement.getBoundingClientRect().width,
        docElement.scrollWidth,
        body.scrollWidth,
        window.innerWidth
      );

      const options = {
        ...baseOptions,
        width: contentWidth,
        height: contentHeight,
        windowWidth: contentWidth,
        windowHeight: contentHeight,
        x: 0,
        y: 0,
        scrollX: window.scrollX,
        scrollY: window.scrollY
      };

      let resultCanvas = await html2canvas(document.documentElement, options);
      
      if (!this.isFullPage) {
        // For viewport screenshots, create a new canvas with just the visible portion
        const viewportCanvas = document.createElement('canvas');
        const ctx = viewportCanvas.getContext('2d', { alpha: false });
        
        if (ctx) {
          const scale = window.devicePixelRatio || 1;
          const scrollY = window.scrollY || window.pageYOffset || docElement.scrollTop || 0;
          
          viewportCanvas.width = window.innerWidth * scale;
          viewportCanvas.height = window.innerHeight * scale;
          
          // Fill background first
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, viewportCanvas.width, viewportCanvas.height);
          
          // Enable image smoothing
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          
          // Draw only the visible portion
          ctx.drawImage(
            resultCanvas,
            0,
            scrollY * scale,
            window.innerWidth * scale,
            window.innerHeight * scale,
            0,
            0,
            window.innerWidth * scale,
            window.innerHeight * scale
          );
          
          resultCanvas = viewportCanvas;
        }
      }
      
      // Optimize image quality
      const imgData: string = resultCanvas.toDataURL('image/png', 1.0);
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
