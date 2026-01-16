import { createAgentUIStreamResponse } from 'ai';
import { resumeAgent } from '@/lib/agent';

export const maxDuration = 60;

export async function POST(request: Request) {
  const { messages } = await request.json();

  return createAgentUIStreamResponse({
    agent: resumeAgent,
    uiMessages: messages,
  });
}
