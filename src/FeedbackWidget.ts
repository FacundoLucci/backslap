import { toCanvas } from 'html-to-image';

// Extend DisplayMediaStreamOptions type to include additional properties
interface ExtendedDisplayMediaStreamOptions extends DisplayMediaStreamOptions {
  preferCurrentTab?: boolean;
  selfBrowserSurface?: 'include' | 'exclude';
  surfaceSwitching?: 'include' | 'exclude';
  monitorTypeSurfaces?: 'include' | 'exclude';
}

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
  // Vertical offset for viewport screenshot (in pixels, before DPR)
  private static readonly VIEWPORT_OFFSET = 2;

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
          background: #1F2937;
          border-radius: 8px;
          box-shadow: 0 4px 6px rgba(0,0,0,0.3);
          padding: 24px;
          width: calc(100vw - 88px);
          max-width: 320px;
          min-width: 252px;
          display: none;
          color: #E5E7EB;
          max-height: calc(100vh - 120px);
          overflow-y: auto;
          overscroll-behavior: contain;
        }
        
        .feedback-modal.open {
          display: block;
        }
        
        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
          margin-top: -6px;
          margin-right: -6px;
        }
        
        .header-title {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .header-title h3 {
          margin: 0;
          color: #F3F4F6;
          font-size: 1.125rem;
          font-weight: 500;
        }
        
        .header-actions {
          display: flex;
          gap: 8px;
          align-items: center;
        }
        
        .settings-button, .close-button {
          background: none;
          border: none;
          cursor: pointer;
          padding: 4px;
          color: #9CA3AF;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 4px;
          transition: all 0.2s;
          width: 28px;
          height: 28px;
        }
        
        .settings-button:hover, .close-button:hover {
          color: #E5E7EB;
          background: #374151;
        }
        
        .settings-button svg {
          width: 20px;
          height: 20px;
        }
        
        .close-button {
          font-size: 20px;
          line-height: 1;
        }
        
        .settings-panel {
          display: none;
          background: #374151;
          border-radius: 6px;
          padding: 16px;
          margin: 12px 0;
        }
        
        .settings-panel.open {
          display: block;
        }
        
        .settings-option {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #E5E7EB;
          font-size: 14px;
        }
        
        .settings-button.active {
          color: #818CF8;
          background: #1F2937;
        }
        
        .settings-button.active:hover {
          color: #A5B4FC;
        }
        
        textarea {
          width: 100%;
          min-height: 100px;
          max-height: 40vh;
          margin-top: 10px;
          margin-bottom: 0;
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
          max-height: 40vh;
          object-fit: contain;
        }

        .screenshot-actions {
          display: flex;
          flex-direction: column;
          gap: 4px;
          margin-top: 4px;
        }

        .screenshot-hint {
          font-size: 12px;
          color: #9CA3AF;
          text-align: left;
        }

        .try-advanced {
          color: #818CF8;
          text-decoration: underline;
          cursor: pointer;
          background: none;
          border: none;
          padding: 0;
          font: inherit;
          font-size: 12px;
        }

        .try-advanced:hover {
          color: #A5B4FC;
        }
        
        .actions {
          display: flex;
          gap: 10px;
          margin-top: 15px;
          align-items: center;
        }
        
        .submit-button {
          background: #4F46E5;
          color: white;
          border: 1px solid #4338CA;
          padding: 8px 16px;
          border-radius: 4px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          flex: 1;
          height: 36px;
          box-sizing: border-box;
        }
        
        .capture-button {
          background: #374151;
          border: 1px solid #4B5563;
          padding: 8px;
          border-radius: 4px;
          cursor: pointer;
          color: #E5E7EB;
          display: none;
          align-items: center;
          gap: 6px;
          flex: 0 0 auto;
          min-width: 0;
          height: 36px;
          box-sizing: border-box;
        }

        .capture-button svg {
          width: 16px;
          height: 16px;
          stroke-width: 2;
          stroke: currentColor;
          fill: none;
        }
        
        .capture-button.show {
          display: flex;
        }

        .shortcut-hint {
          font-size: 12px;
          color: #9CA3AF;
          white-space: nowrap;
          margin-left: 4px;
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
            <div class="header-title">
              <h3>${theme.modalTitle ?? 'Send Feedback'}</h3>
              <button class="settings-button" aria-label="Settings">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 15a3 3 0 100-6 3 3 0 000 6z" stroke-linecap="round" stroke-linejoin="round"/>
                  <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </button>
            </div>
            <div class="header-actions">
              <button class="close-button">&times;</button>
            </div>
          </div>
          
          <form id="feedback-form">
            <div class="settings-panel">
              <div class="settings-option">
                <label class="toggle-switch">
                  <input type="checkbox" id="full-page-toggle" ${this.isFullPage ? 'checked' : ''}>
                  <span class="toggle-slider"></span>
                </label>
                <span>Capture full page</span>
              </div>
            </div>

            <div id="screenshot-preview"></div>
            
            <div class="screenshot-actions">
              <div class="screenshot-hint">
                <button class="try-advanced">Look off? Try advanced capture mode</button>
              </div>
            </div>

            <textarea 
              placeholder="Describe your feedback here..."
              required
            ></textarea>
            
            <div class="actions">
              <button type="button" class="capture-button">
                <svg viewBox="0 0 16 16" fill="none">
                  <path d="M6,1 L2,1 L2,5" stroke-linecap="round" stroke-linejoin="round"/>
                  <path d="M1,10 L1,14 L5,14" stroke-linecap="round" stroke-linejoin="round"/>
                  <path d="M10,15 L14,15 L14,11" stroke-linecap="round" stroke-linejoin="round"/>
                  <path d="M15,6 L15,2 L11,2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                <span>Retake</span>
                <span class="shortcut-hint">⌘/Ctrl + R</span>
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
    const tryAdvancedButton = this.shadow.querySelector('.try-advanced');
    const settingsButton = this.shadow.querySelector('.settings-button');
    const settingsPanel = this.shadow.querySelector('.settings-panel');
    
    feedbackButton?.addEventListener('click', () => this.toggleModal());
    closeButton?.addEventListener('click', () => this.toggleModal());
    captureButton?.addEventListener('click', () => this.takeScreenshot());
    feedbackForm?.addEventListener('submit', (e) => this.handleSubmit(e));
    
    tryAdvancedButton?.addEventListener('click', () => {
      this.takeScreenshot(true);
    });

    settingsButton?.addEventListener('click', () => {
      settingsButton.classList.toggle('active');
      settingsPanel?.classList.toggle('open');
    });
    
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
  
  private async prepareDynamicContent(): Promise<HTMLCanvasElement> {
    // Force all custom web fonts to load
    await document.fonts?.ready;
    
    // Force all images to load
    const images = Array.from(document.images);
    await Promise.all(images.map(img => {
      if (img.complete) return Promise.resolve();
      return new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });
    }));

    // Create a deep clone of the document for capturing
    const clone = document.documentElement.cloneNode(true) as HTMLElement;
    
    // Add global styles for placeholders
    const globalStyle = document.createElement('style');
    globalStyle.textContent = `
      input::placeholder,
      textarea::placeholder {
        -webkit-text-fill-color: currentColor;
        opacity: 1 !important;
      }
    `;
    clone.appendChild(globalStyle);
    
    // Copy computed styles to the clone
    const copyStyles = (source: HTMLElement, target: HTMLElement) => {
      const computedStyle = window.getComputedStyle(source);
      const targetStyle = target.style;
      
      // Copy all computed styles
      for (let i = 0; i < computedStyle.length; i++) {
        const property = computedStyle[i];
        const value = computedStyle.getPropertyValue(property);
        targetStyle.setProperty(property, value);
      }

      // Copy CSS custom properties (variables)
      for (const property of computedStyle) {
        if (property.startsWith('--')) {
          const value = computedStyle.getPropertyValue(property);
          targetStyle.setProperty(property, value);
        }
      }

      // Special handling for form elements
      if (source instanceof HTMLInputElement || source instanceof HTMLTextAreaElement || source instanceof HTMLSelectElement) {
        const formElement = source;
        const clonedFormElement = target;
        
        // Copy form element specific properties
        if (formElement instanceof HTMLInputElement || formElement instanceof HTMLTextAreaElement) {
          (clonedFormElement as HTMLInputElement | HTMLTextAreaElement).value = formElement.value;
          
          // Handle placeholder styles
          const placeholder = formElement.getAttribute('placeholder');
          if (placeholder) {
            const computedStyle = window.getComputedStyle(formElement);
            const computedPlaceholderStyle = window.getComputedStyle(formElement, '::placeholder');
            
            // Create a unique class for this element
            const uniqueClass = `placeholder-${Math.random().toString(36).substring(7)}`;
            clonedFormElement.classList.add(uniqueClass);
            
            // Create style element for this specific element
            const styleEl = document.createElement('style');
            styleEl.textContent = `
              .${uniqueClass} {
                background-color: ${computedStyle.backgroundColor} !important;
                color: ${computedStyle.color} !important;
              }
              .${uniqueClass}::placeholder {
                color: ${computedPlaceholderStyle.color} !important;
                opacity: ${computedPlaceholderStyle.opacity || '1'} !important;
                -webkit-text-fill-color: ${computedPlaceholderStyle.color} !important;
              }
            `;
            
            // Add the style element to the clone
            clone.appendChild(styleEl);
          }
        }
        
        if (formElement instanceof HTMLInputElement && (formElement.type === 'checkbox' || formElement.type === 'radio')) {
          (clonedFormElement as HTMLInputElement).checked = formElement.checked;
        } else if (formElement instanceof HTMLSelectElement) {
          (clonedFormElement as HTMLSelectElement).selectedIndex = formElement.selectedIndex;
        }
      }

      // Recursively copy styles for children
      for (let i = 0; i < source.children.length; i++) {
        if (source.children[i] instanceof HTMLElement && 
            target.children[i] instanceof HTMLElement) {
          copyStyles(
            source.children[i] as HTMLElement,
            target.children[i] as HTMLElement
          );
        }
      }
    };

    // Copy styles from original document to clone
    copyStyles(document.documentElement, clone);

    // Get our feedback button
    const feedbackButton = this.shadow.querySelector('.feedback-button') as HTMLElement;
    const buttonRect = feedbackButton?.getBoundingClientRect();
    
    // Create a clone of our button with exact styles
    if (feedbackButton && buttonRect) {
      const buttonClone = document.createElement('button');
      buttonClone.textContent = feedbackButton.textContent || '';
      
      // Copy computed styles from our button
      const buttonStyle = window.getComputedStyle(feedbackButton);
      Object.values(buttonStyle).forEach(property => {
        buttonClone.style.setProperty(property, buttonStyle.getPropertyValue(property));
      });

      // Position the clone exactly where our button is, accounting for scroll position
      const absoluteLeft = buttonRect.left + window.scrollX;
      const absoluteTop = buttonRect.top + window.scrollY;

      buttonClone.style.position = 'absolute';  // Changed from 'fixed' to 'absolute'
      buttonClone.style.left = absoluteLeft + 'px';
      buttonClone.style.top = absoluteTop + 'px';
      buttonClone.style.width = buttonRect.width + 'px';
      buttonClone.style.height = buttonRect.height + 'px';
      buttonClone.style.zIndex = '10000';

      // Add the button clone to our cloned document
      clone.appendChild(buttonClone);
    }

    // Remove our feedback widget from the clone (except the button clone we just added)
    const widgetClone = clone.querySelector('feedback-widget');
    widgetClone?.remove();

    // Create a temporary container for the clone
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.width = document.documentElement.scrollWidth + 'px';
    container.style.height = document.documentElement.scrollHeight + 'px';
    container.appendChild(clone);
    document.body.appendChild(container);

    try {
      // Use the clone for html-to-image capture
      const resultCanvas = await toCanvas(clone, {
        backgroundColor: window.getComputedStyle(document.body).backgroundColor || '#ffffff',
        skipFonts: false,
        pixelRatio: window.devicePixelRatio || 1,
        width: document.documentElement.scrollWidth,
        height: document.documentElement.scrollHeight
      });

      // Clean up the temporary container
      document.body.removeChild(container);

      return resultCanvas;
    } catch (error) {
      // Clean up on error
      document.body.removeChild(container);
      throw error;
    }
  }
  
  private async captureScreenViaAPI(): Promise<string> {
    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: {
        displaySurface: 'browser',
      },
      audio: false,
      preferCurrentTab: true,
      selfBrowserSurface: 'include',
      surfaceSwitching: 'exclude',
      monitorTypeSurfaces: 'include'
    } as ExtendedDisplayMediaStreamOptions);

    const video = document.createElement('video');
    video.srcObject = stream;
    await video.play();

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get canvas context');
    
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    stream.getTracks().forEach(track => track.stop());
    
    return canvas.toDataURL('image/png');
  }

  async takeScreenshot(useScreenCaptureAPI: boolean = false): Promise<void> {
    const feedbackModal = this.shadow.querySelector('.feedback-modal') as HTMLElement;
    const originalDisplay = feedbackModal?.style.display || '';

    try {
      let imgData: string;

      // Hide the feedback modal before capture
      if (feedbackModal) {
        feedbackModal.style.display = 'none';
      }

      if (useScreenCaptureAPI) {
        try {
          imgData = await this.captureScreenViaAPI();
        } catch (error) {
          console.error('Screen Capture API failed:', error);
          // Fall back to DOM clone method if screen capture fails
          imgData = await this.captureViaHTML();
        }
      } else {
        imgData = await this.captureViaHTML();
      }

      // Update preview with captured image
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
    } finally {
      // Restore the feedback modal visibility
      if (feedbackModal) {
        feedbackModal.style.display = originalDisplay;
      }
    }
  }
  
  private async captureViaHTML(): Promise<string> {
    // Get the canvas with the cloned document
    const resultCanvas = await this.prepareDynamicContent();

    // Store current scroll position and calculate dimensions
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    if (!this.isFullPage) {
      // Create canvas for viewport screenshot
      const croppedCanvas = document.createElement('canvas');
      const ctx = croppedCanvas.getContext('2d');
      if (!ctx) throw new Error('Could not get canvas context');

      const dpr = window.devicePixelRatio || 1;
      croppedCanvas.width = viewportWidth * dpr;
      croppedCanvas.height = viewportHeight * dpr;

      // Calculate the exact scroll position considering DPR and offset
      const sourceX = Math.round(scrollX * dpr);
      const sourceY = Math.round((scrollY - FeedbackWidget.VIEWPORT_OFFSET) * dpr);
      const sourceWidth = Math.round(viewportWidth * dpr);
      const sourceHeight = Math.round(viewportHeight * dpr);

      // Draw the cropped portion
      ctx.drawImage(
        resultCanvas,
        sourceX,
        sourceY,
        sourceWidth,
        sourceHeight,
        0,
        0,
        sourceWidth,
        sourceHeight
      );

      return croppedCanvas.toDataURL('image/png', 1.0);
    } else {
      return resultCanvas.toDataURL('image/png', 1.0);
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
