# Future Studio Foundation

This branch is a development preview. Do not merge it into main or deploy it
to the classroom production domain until the teacher explicitly approves activation.

## Available

- Tool registry with the existing chatbot at /tools/chatbot.
- Local classroom plan editor at /rooms (create, edit, copy, delete).
- Local artifact collection at /works (AI settings, text, safe web links).
- Workspace JSON backup and restore with schema and size validation.
- Chatbot AI settings can be stored as snapshots and reopened from the collection.

## Not Yet Available

- Shared classroom join codes, student accounts or online submissions.
- Teacher authentication, server-stored rules or student activity monitoring.
- Image, writing and voice tool implementations (shown as planned).
- Cross-device synchronization or persistent server storage.

The current implementation uses a separate localStorage key,
landomvalue-workspace-v1. Data belongs to this browser and this site origin.
Clearing browser data removes it. Export backups before moving to another origin.
Existing saved chatbot settings use their original key and are not modified by this hub.

## Development

Install dependencies with pnpm install, then run pnpm dev --port 3002.
Use pnpm exec tsc --noEmit and pnpm lint for checks.
The existing chat API still requires GEMINI_API_KEY on the server.
Do not expose this key in client code or JSON backups.

## Next Stage

Design authentication and tenant/room ownership before introducing a database.
Add server-authorized room membership, teacher policies and artifact permissions.
Keep tool adapters separate from room policy and artifact storage; replace local
storage behind a repository interface when server requirements are agreed.
External links must remain visibly separate from integrated tools, and must not
receive classroom policies or student data implicitly.

## Activation

Keep this branch separate from main. Review the lesson examples, privacy rules,
teacher access and browser-to-server migration before any production switch.
Production classroom capacity tests do not certify this future architecture.
