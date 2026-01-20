# Chat History Feature Design

## Overview

Implement persistent chat history similar to Claude/ChatGPT, where conversations are saved and accessible from the sidebar.

## Current State

- `Conversation` model exists in Prisma with `messages` JSON field
- API routes exist: GET/POST/PUT/DELETE at `/api/conversations`
- `ConversationList` component fetches and displays history in sidebar
- Chat page at `/chat/[id]` loads existing conversations
- **Missing**: No conversation creation on new chat, no message persistence

## Design Decisions

### 1. Conversation Creation
**Decision**: Create conversation on first message send

- When user sends first message at `/`, create conversation via POST `/api/conversations`
- Redirect browser to `/chat/{id}` after creation
- Avoids empty conversations cluttering history

### 2. Title Generation
**Decision**: Simple text extraction from first message

- Extract first ~50 characters of user's first message
- Cut at word boundary to avoid mid-word truncation
- Can enhance with AI-generated titles later

### 3. Message Persistence
**Decision**: Save after each message exchange

- After user message: PUT to save immediately
- After AI response completes: PUT to save again
- Ensures nothing lost if user closes tab

### 4. URL Handling
**Decision**: Redirect to `/chat/{id}` after creation

- Matches Claude/ChatGPT behavior
- Refreshing page reloads the conversation

### 5. Sidebar Updates
**Decision**: Instant update when conversation created

- Sidebar revalidates on route change (redirect triggers this)
- New conversation appears immediately in history

### 6. Conversation Actions
**Decision**: Three-dot menu with Rename and Delete

- **Rename**: Modal dialog with input field, Cancel/Save buttons
- **Delete**: Confirmation dialog, then remove conversation

## Data Flow

### New Chat Flow (starting at `/`)
1. User lands on `/` → ChatContainer renders with no `conversationId`
2. User types message and hits send
3. Before sending to `/api/chat`:
   - Call POST `/api/conversations` with title + initial message
   - Receive new conversation `id`
4. Redirect to `/chat/{id}`
5. Send message to `/api/chat` for AI processing
6. When AI response completes, PUT `/api/conversations/{id}` with updated messages
7. Sidebar shows new conversation (route change triggers refetch)

### Existing Chat Flow (at `/chat/{id}`)
1. Page loads conversation from database with `initialMessages`
2. User sends message → PUT to append user message
3. AI responds → PUT to append AI response

## Implementation

### Files to Modify

| File | Changes |
|------|---------|
| `components/chat/ChatContainer.tsx` | Add persistence logic, handle new chat creation, save on message exchange |
| `components/layout/ConversationList.tsx` | Add three-dot menu, rename modal, delete confirmation |
| `lib/utils.ts` | Add `generateTitle()` helper function |

### No Changes Needed
- API routes (already have GET/POST/PUT/DELETE)
- Prisma schema (Conversation model is ready)
- Chat page `/chat/[id]` (already loads from DB)

### New Components
- `RenameDialog` - Modal for renaming conversations (or inline in ConversationList)
- Reuse existing `DeleteConfirmDialog` pattern

## Edge Cases

- **User sends message then navigates away**: Conversation created with user message only (acceptable)
- **User refreshes during AI response**: Conversation loads, AI response lost (acceptable for v1)
- **Empty message**: Prevent submit (already handled by UI)
- **Conversation creation fails**: Show toast error, don't redirect, user can retry
- **Message save fails**: Show toast warning but don't block chat (messages still in memory)

## Future Enhancements

- AI-generated conversation titles
- Star/favorite conversations
- Search conversations
- Conversation folders/projects
