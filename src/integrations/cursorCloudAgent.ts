import { Buffer } from 'node:buffer';
import type { FeedbackData } from '../types';

export interface CursorPromptImage {
  data: string;
  dimension: {
    width: number;
    height: number;
  };
}

export interface CursorAgentPrompt {
  text: string;
  images?: CursorPromptImage[];
}

export interface CursorAgentSource {
  repository: string;
  ref?: string;
}

export interface CursorAgentTarget {
  autoCreatePr?: boolean;
  openAsCursorGithubApp?: boolean;
  skipReviewerRequest?: boolean;
  branchName?: string;
}

export interface CursorAgentWebhook {
  url: string;
  secret?: string;
}

export interface CursorAgent {
  id: string;
  name: string;
  status: 'CREATING' | 'RUNNING' | 'FINISHED' | 'FAILED' | 'CANCELLED';
  source: CursorAgentSource;
  target?: CursorAgentTarget & {
    url?: string;
    prUrl?: string;
  };
  summary?: string;
  createdAt: string;
}

export interface CursorAgentListResponse {
  agents: CursorAgent[];
  nextCursor?: string;
}

export interface CursorAgentCreateRequest {
  prompt: CursorAgentPrompt;
  source: CursorAgentSource;
  target?: CursorAgentTarget;
  webhook?: CursorAgentWebhook;
  model?: string;
}

export interface CursorAgentFollowUpRequest {
  prompt: CursorAgentPrompt;
}

export interface CursorAgentClientOptions {
  baseUrl?: string;
  fetchImpl?: typeof fetch;
  defaultModel?: string;
  timeoutMs?: number;
}

const DEFAULT_BASE_URL = 'https://api.cursor.com';
const DEFAULT_TIMEOUT_MS = 60_000;

export class CursorAgentClient {
  private readonly baseUrl: string;
  private readonly authHeader: string;
  private readonly fetchImpl: typeof fetch;
  private readonly defaultModel?: string;
  private readonly timeoutMs: number;

  constructor(apiKey: string, options?: CursorAgentClientOptions) {
    if (!apiKey) {
      throw new Error('Cursor API key is required');
    }

    this.baseUrl = (options?.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, '');
    this.authHeader = `Basic ${Buffer.from(`${apiKey}:`).toString('base64')}`;
    this.fetchImpl = options?.fetchImpl ?? fetch;
    this.defaultModel = options?.defaultModel;
    this.timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  public async listAgents(params?: { limit?: number; cursor?: string }): Promise<CursorAgentListResponse> {
    const query = new URLSearchParams();
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.cursor) query.set('cursor', params.cursor);
    return this.request<CursorAgentListResponse>(`/v0/agents?${query.toString()}`);
  }

  public async getAgent(id: string): Promise<CursorAgent> {
    return this.request<CursorAgent>(`/v0/agents/${id}`);
  }

  public async getAgentConversation(id: string): Promise<unknown> {
    return this.request(`/v0/agents/${id}/conversation`);
  }

  public async createAgent(payload: CursorAgentCreateRequest): Promise<CursorAgent> {
    const body = {
      ...payload,
      model: payload.model ?? this.defaultModel,
    };
    return this.request<CursorAgent>('/v0/agents', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  public async followUp(id: string, payload: CursorAgentFollowUpRequest): Promise<{ id: string }> {
    return this.request<{ id: string }>(`/v0/agents/${id}/followup`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  public async deleteAgent(id: string): Promise<{ id: string }> {
    return this.request<{ id: string }>(`/v0/agents/${id}`, {
      method: 'DELETE',
    });
  }

  private async request<T = unknown>(
    path: string,
    init?: {
      method?: string;
      body?: BodyInit | null;
    }
  ): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await this.fetchImpl(`${this.baseUrl}${path}`, {
        method: init?.method ?? 'GET',
        headers: this.buildHeaders(init?.body != null),
        body: init?.body,
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Cursor API error (${response.status}): ${errorText || response.statusText}`);
      }

      if (response.status === 204) {
        return undefined as T;
      }

      return (await response.json()) as T;
    } finally {
      clearTimeout(timeout);
    }
  }

  private buildHeaders(hasBody: boolean): HeadersInit {
    const headers: Record<string, string> = {
      Authorization: this.authHeader,
      Accept: 'application/json',
    };

    if (hasBody) {
      headers['Content-Type'] = 'application/json';
    }

    return headers;
  }
}

export interface BackslapFeedbackEvent extends FeedbackData {
  id: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  component?: string;
  category?: 'bug' | 'feature' | 'question' | 'other';
}

export interface FeedbackToCursorOptions {
  repository: string;
  ref?: string;
  autoCreatePr?: boolean;
  branchTemplate?: string;
  model?: string;
  webhook?: CursorAgentWebhook;
}

export class BackslapCursorAgentBridge {
  constructor(private readonly client: CursorAgentClient) {}

  public async createAgentFromFeedback(
    feedback: BackslapFeedbackEvent,
    options: FeedbackToCursorOptions
  ): Promise<CursorAgent> {
    const prompt = this.buildPrompt(feedback);
    const images = await this.extractPromptImages(feedback);

    const branchName = this.interpolateTemplate(
      options.branchTemplate ?? 'cursor/${category}-${id}',
      feedback
    );

    return this.client.createAgent({
      prompt: {
        text: prompt,
        images,
      },
      source: {
        repository: options.repository,
        ref: options.ref,
      },
      target: {
        autoCreatePr: options.autoCreatePr ?? true,
        branchName,
      },
      webhook: options.webhook,
      model: options.model,
    });
  }

  private buildPrompt(feedback: BackslapFeedbackEvent): string {
    const severity = feedback.severity ?? 'untriaged';
    const category = feedback.category ?? 'bug';
    const metadata = feedback.metadata ? JSON.stringify(feedback.metadata, null, 2) : 'None';

    return [
      `Customer feedback needs a PR fix.`,
      `Feedback ID: ${feedback.id}`,
      `Category: ${category}`,
      `Severity: ${severity}`,
      `Page URL: ${feedback.url}`,
      `User Agent: ${feedback.userAgent}`,
      `Metadata: ${metadata}`,
      '',
      'Message:',
      feedback.message,
      '',
      'Acceptance criteria:',
      '1. Reproduce the issue based on the provided context and URL.',
      '2. Add a regression test (unit or integration) that fails before the fix.',
      '3. Implement the fix with clean, accessible UI changes where applicable.',
      '4. Include a succinct summary referencing the feedback ID in the PR description.',
      '5. Link any relevant screenshots or assets that helped debug the issue.',
    ].join('\n');
  }

  private async extractPromptImages(feedback: BackslapFeedbackEvent): Promise<CursorPromptImage[] | undefined> {
    if (!feedback.screenshot) {
      return undefined;
    }

    const match = feedback.screenshot.match(/^data:(?<mime>[^;]+);base64,(?<data>.+)$/);
    const base64Data = match?.groups?.data;

    if (!base64Data) {
      return undefined;
    }

    try {
      type ImageSizeModule = typeof import('image-size');
      const imported = (await import('image-size')) as ImageSizeModule;
      const imageSizeFn = imported.imageSize ?? imported.default;

      if (!imageSizeFn) {
        return undefined;
      }

      const buffer = Buffer.from(base64Data, 'base64');
      const dimensions = imageSizeFn(buffer);

      if (!dimensions.width || !dimensions.height) {
        return undefined;
      }

      return [
        {
          data: base64Data,
          dimension: {
            width: dimensions.width,
            height: dimensions.height,
          },
        },
      ];
    } catch {
      return undefined;
    }
  }

  private interpolateTemplate(template: string, feedback: BackslapFeedbackEvent): string {
    const slugify = (value: string) =>
      value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'feedback';

    return template
      .replace(/\${id}/g, feedback.id)
      .replace(/\${category}/g, slugify(feedback.category ?? 'feedback'))
      .replace(/\${severity}/g, slugify(feedback.severity ?? 'untriaged'));
  }
}
