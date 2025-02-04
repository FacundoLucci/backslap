# BackSlap Feedback Widget

[![CI](https://github.com/FacundoLucci/backslap/actions/workflows/ci.yml/badge.svg)](https://github.com/FacundoLucci/backslap/actions/workflows/ci.yml)
[![npm version](https://badge.fury.io/js/backslap.svg)](https://badge.fury.io/js/backslap)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A lightweight, customizable feedback widget that captures user feedback and screenshots. Built with Web Components for framework-agnostic usage. Available as both an open-source widget and a hosted platform solution.

## Features

- 🎨 Customizable appearance and positioning
- 📸 Screenshot capture functionality
- 🔌 Framework agnostic
- 🎯 Easy integration
- 📱 Responsive design
- 🌐 Cross-browser support
- ☁️ Optional hosted platform with additional features

## Installation

### Self-Hosted Option
```bash
npm install @backslap/feedback-widget
```

### Hosted Platform
For a fully managed solution with additional features like:
- Dashboard for feedback management
- Team collaboration tools
- Integration connectors (Slack, Jira, etc.)
- Advanced analytics

Visit [backslap.io](https://backslap.io) to get started.

## Usage

```html
<feedback-widget></feedback-widget>
```

## Configuration

The widget can be configured via a `config` attribute:

```html
<feedback-widget id="feedback"></feedback-widget>
<script type="module">
  import '@facundo91/feedback-widget';
  
  const widget = document.getElementById('feedback');
  widget.setAttribute('config', JSON.stringify({
    apiEndpoint: 'https://your-api.com/feedback',
    position: 'bottom-right',
    theme: {
      primaryColor: '#0F172A',
      buttonText: 'Got Feedback?',
      modalTitle: 'Share Your Thoughts'
    }
  }));
</script>
```

### Custom Submission Handler

You can provide your own submission handler instead of using an API endpoint:

```typescript
import '@facundo91/feedback-widget';
import type { FeedbackData } from '@facundo91/feedback-widget';

const widget = document.getElementById('feedback');
widget.setAttribute('config', JSON.stringify({
  onSubmit: async (feedback: FeedbackData) => {
    // Handle the feedback submission your way
    console.log('Feedback received:', feedback);
    await yourCustomLogic(feedback);
  }
}));
```

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `apiEndpoint` | `string` | undefined | URL to send feedback data (or use our hosted endpoint) |
| `position` | `string` | 'bottom-right' | Widget position ('bottom-right', 'bottom-left', 'top-right', 'top-left') |
| `theme.primaryColor` | `string` | '#4F46E5' | Primary color for buttons |
| `theme.buttonText` | `string` | 'Send Feedback' | Text for the feedback button |
| `theme.modalTitle` | `string` | 'Send Feedback' | Title of the feedback modal |
| `onSubmit` | `function` | undefined | Custom submission handler |
| `apiKey` | `string` | undefined | API key for hosted platform users |

## Feedback Data Structure

```typescript
interface FeedbackData {
  message: string;        // User's feedback message
  screenshot: string;     // Base64 encoded screenshot (if captured)
  timestamp: string;      // ISO timestamp
  url: string;           // Current page URL
  userAgent: string;     // Browser user agent
  metadata?: Record<string, any>; // Optional custom metadata
}
```

## Development

```bash
# Install dependencies
npm install

# Build the library
npm run build

# Run tests
npm test

# Lint code
npm run lint
```

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request. For major changes, please open an issue first to discuss what you would like to change.

Please read our [Contributing Guide](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

### Development Setup

```bash
# Clone the repository
git clone https://github.com/FacundoLucci/backslap.git
cd backslap

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

### Testing

We use Jest for testing. Run the test suite with:

```bash
# Run tests
npm test

# Run tests in watch mode
npm test -- --watch

# Generate coverage report
npm run test:coverage
```

Please ensure all tests pass and add new tests for any new features.

## License

[MIT](LICENSE) © Facundo Lucci

## Support

If you need help or have any questions:

1. Check the [Issues](https://github.com/facundo91/feedback-widget/issues) page
2. Create a new issue if your problem isn't already listed
3. Reach out on [Twitter](https://twitter.com/facundolucci)

## Hosted vs Self-Hosted

### Self-Hosted
- Complete control over data and infrastructure
- Free and open source
- Requires own backend implementation
- Manual updates and maintenance

### Hosted Platform
- Instant setup with dashboard access
- Automatic updates and improvements
- Team collaboration features
- Integration connectors
- Premium support
- Usage-based pricing

Visit our [pricing page](https://backslap.io/pricing) to compare options.