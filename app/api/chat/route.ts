import { createAgentUIStreamResponse } from 'ai';
import { resumeAgent } from '@/lib/agent';
import { auth } from '@/lib/auth';
import { runWithUserId, setCurrentUserId } from '@/lib/agent/tools/utils';

export const maxDuration = 60;

export async function POST(request: Request) {
  console.log('[chat/route] POST request received');
  const session = await auth();
  console.log('[chat/route] Session:', session?.user?.id ? `User ${session.user.id}` : 'No user');

  if (!session?.user?.id) {
    return new Response('Unauthorized', { status: 401 });
  }

  const userId = session.user.id;
  console.log('[chat/route] User ID:', userId);

  // Set the module-level fallback (for backward compatibility)
  setCurrentUserId(userId);

  const { messages } = await request.json();
  console.log('[chat/route] Starting agent with', messages.length, 'messages');

  // Wrap the response creation in the user context
  // This ensures all async operations (including tool executions) have access to userId
  return runWithUserId(userId, () => {
    return createAgentUIStreamResponse({
      agent: resumeAgent,
      uiMessages: messages,
    });
  });
}
