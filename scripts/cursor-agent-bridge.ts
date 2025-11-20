import { readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import {
  BackslapCursorAgentBridge,
  type BackslapFeedbackEvent,
  CursorAgentClient,
} from '../src/integrations/cursorCloudAgent';

interface FeedbackFileShape {
  feedback?: BackslapFeedbackEvent[];
  events?: BackslapFeedbackEvent[];
}

const DEFAULT_INPUT_PATH = 'data/sample-feedback.json';

const ensureEnv = (key: string): string => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
};

const parseArgs = () => {
  const [, , inputArg] = process.argv;
  return {
    inputPath: inputArg ?? DEFAULT_INPUT_PATH,
    dryRun: process.env.CURSOR_DRY_RUN === '1' || process.env.CURSOR_DRY_RUN === 'true',
  };
};

const loadFeedback = async (inputPath: string): Promise<BackslapFeedbackEvent[]> => {
  const filePath = path.isAbsolute(inputPath) ? inputPath : path.join(process.cwd(), inputPath);
  const raw = await readFile(filePath, 'utf-8');
  const parsed = JSON.parse(raw) as FeedbackFileShape | BackslapFeedbackEvent[];

  if (Array.isArray(parsed)) {
    return parsed;
  }

  if (parsed.feedback) {
    return parsed.feedback;
  }

  if (parsed.events) {
    return parsed.events;
  }

  throw new Error(`Unsupported feedback file format: expected array or { feedback: [] } - file ${filePath}`);
};

const main = async () => {
  const { inputPath, dryRun } = parseArgs();
  const apiKey = ensureEnv('CURSOR_API_KEY');
  const repository = ensureEnv('CURSOR_REPOSITORY');
  const ref = process.env.CURSOR_REF;
  const model = process.env.CURSOR_MODEL;
  const autoCreatePr = process.env.CURSOR_AUTO_CREATE_PR !== 'false';
  const branchTemplate = process.env.CURSOR_BRANCH_TEMPLATE;
  const webhookUrl = process.env.CURSOR_WEBHOOK_URL;
  const webhookSecret = process.env.CURSOR_WEBHOOK_SECRET;

  const feedbackEvents = await loadFeedback(inputPath);
  if (!feedbackEvents.length) {
    console.warn(`[cursor-agent-bridge] No feedback events found in ${inputPath}`);
    return;
  }

  console.log(`[cursor-agent-bridge] Loaded ${feedbackEvents.length} feedback events from ${inputPath}`);

  const client = new CursorAgentClient(apiKey, { defaultModel: model });
  const bridge = new BackslapCursorAgentBridge(client);

  for (const feedback of feedbackEvents) {
    if (dryRun) {
      console.log(`[cursor-agent-bridge] [dry-run] Would launch agent for feedback ${feedback.id}`);
      continue;
    }

    const agent = await bridge.createAgentFromFeedback(feedback, {
      repository,
      ref,
      autoCreatePr,
      branchTemplate: branchTemplate ?? 'cursor/${category}-${id}',
      model,
      webhook: webhookUrl
        ? {
            url: webhookUrl,
            secret: webhookSecret,
          }
        : undefined,
    });

    console.log(
      `[cursor-agent-bridge] Launched agent ${agent.id} (status: ${agent.status}) for feedback ${feedback.id}`
    );
  }
};

main().catch((error) => {
  console.error('[cursor-agent-bridge] Fatal error:', error);
  process.exit(1);
});
