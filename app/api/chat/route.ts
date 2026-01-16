import { createAgentUIStreamResponse } from 'ai';
import { resumeAgent } from '@/lib/agent';
import { auth } from '@/lib/auth';
import { setCurrentUserId } from '@/lib/agent/tools/utils';

export const maxDuration = 60;

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return new Response('Unauthorized', { status: 401 });
  }

  // Set the current user ID for tools to use
  setCurrentUserId(session.user.id);

  const { messages } = await request.json();

  return createAgentUIStreamResponse({
    agent: resumeAgent,
    uiMessages: messages,
  });
}
