# X Workspace

A Chrome extension for managing your X Grok bots in an expandable right-hand rail. Click a bot to open its conversation directly beneath its avatar, with floating message pills and an independent draft.

Plain JavaScript and CSS. No build step, API keys, or backend.

## Install

1. Clone or download this repository.
2. Open `chrome://extensions`, enable **Developer mode**, and choose **Load unpacked**.
3. Select the repository folder containing `manifest.json`.
4. Open or refresh [X Home](https://x.com/home).

Sign in to X in the same browser profile. If X needs your chat passcode, unlock it directly in X. After updating the source, reload the extension and reload the full X page.

## Using your bots

- Click the white **Grokbot icon** at the bottom right to show all detected bots. The bottom-aligned list fades upward on open and downward on close. Avatars align on the right with names to their left and purple unread dots. Click again or press Escape to hide the entire rail.
- Click a bot row to focus its conversation. Its name and avatar stay above the chat, which uses the available height of the right rail. Other bots become small avatars to the left of the Grokbot icon, with unread dots and names on hover. The avatar row scrolls horizontally when needed.
- Click another avatar to switch the focused chat. Click the focused bot's header to collapse it and return to the full bot list. Connections, history, and drafts remain alive when switching.
- Incoming messages use dark floating pills; outgoing messages use blue pills. History scrolls above the composer, which stays at the bottom of the focused chat.
- The full list retains its short fade/slide transition. Keyboard activation is instant; reduced motion retains a gentle opacity change.
- Each bot has its own composer and in-memory draft. Collapsing a conversation keeps its connection, history, and draft alive. Replies received while its conversation or the full rail is collapsed add an unread dot; opening the conversation clears the dot.
- The focused bot is saved locally and restored after refresh as bots are discovered. Older multi-chat layouts restore the most recently opened available bot; old floating-window coordinates are ignored. The full rail starts hidden after refresh. Recent message history and bot metadata are cached locally so conversations appear immediately after refresh while X reconnects. Drafts are not saved across page reloads.
- Enter sends; Shift+Enter adds a line. The **⋯** menu beside each composer contains **Load earlier messages**, **Open in X**, and **Reconnect**.
- Use the paperclip, drop files onto the composer, or paste an image to attach files. Image thumbnails and filenames appear above the draft, with a remove button on each. Each bot keeps its own attachment draft. You can send files with or without text. Up to six files are allowed: 25 MB each for images/documents/audio, 200 MB for video, and 200 MB total. X may reject unsupported formats. Files stay in tab memory until Send, then upload through X's native attachment control before submission. Upload failures preserve your local draft; review X's draft or reconnect before retrying. Reloading discards unsent files.
- Native linked text, post links, and @mentions retain their destinations. Plain HTTP/HTTPS and www addresses are clickable too. Normal clicks open in the current tab. X links navigate through X's router, preserving expanded chats, message history, connections, and unsent drafts; Back and Forward work normally. External links replace the X page, so the sidebar is unavailable until you return to X. Modifier and middle clicks retain normal browser behavior.
- **Load earlier messages** asks the hidden X session to load older history. Up to 250 observed messages are retained per chat as X virtualizes rows away.
- Image attachments render inline with their filenames. Click an image to open a larger preview; close it with the close button or Escape. Previews come from the live X connection and reload when X reconnects; cached history keeps filename labels only. Unavailable or unsupported images retain their text labels.
- PDFs and other document attachments appear as clickable download cards with filenames, file-type badges, and sizes when X provides them. Clicking uses X's native download action. Cached file metadata stays visible while reconnecting; downloads become available when the live connection is ready. If an older attachment has been virtualized out of X's history, load earlier messages or use **Open in X** to retrieve it.
- **Open in X** is available for voice, search, routines, other rich media, or connection troubleshooting. The custom composer supports text and file attachments; native interactive cards appear as plain text activity.
- **Reconnect** reconnects that bot's X session. If no bots have loaded, expanding the rail retries discovery and offers a link to your full X inbox.
- The feed keeps its centered layout. The rail has no panel background or search field. Previously saved pins still sort first.

The toolbar popup enables or disables the workspace. Standalone X Chat and sign-in routes retain X's normal layout. Navigating into X Chat from a message link keeps the existing workspace mounted; sign-in flows still use X's normal layout.

## How it works

The visible chat UI is extension-owned DOM, including the message log and composer. No native X conversation is displayed inside the rail.

A hidden, sized X inbox frame discovers sessions from `/i/chat/bots/<session>` links. The **Primary bot** accessibility label is a fallback; only the primary session carries that label, so it cannot identify the other bot sessions. Detection covers inbox rows X has rendered. Open your X inbox and scroll it to discover older rows, then refresh bots. Detection does not independently prove bot ownership.

Each open bot has a separate hidden X conversation frame as its connection. It opens the inbox first, then selects the bot through X's own navigation. X handles authentication, decryption, and delivery. A content script reads the rendered message rows and forwards bounded text snapshots with validated link ranges to the custom UI. Links allow HTTP/HTTPS destinations; native HTML, event handlers, and executable URL schemes are never copied. Sending updates X's native textarea through its input event, waits for its Send control, and clicks that control once. X's Send button has its own click handler rather than a form-submit handler. The bridge waits up to eight seconds for X to clear the composer before acknowledging submission. Requests and responses are checked against their frame, origin, and conversation path. Requests carry unique IDs to prevent duplicate submission within a connection. Different existing native drafts are preserved rather than overwritten.

The custom UI distinguishes handing a message to X from its appearance in message history. A submission or connection failure preserves the draft. An uncertain submission is never automatically retried; check the conversation in X before manually retrying. X's selectors and behavior can change, so this is an in-page integration rather than a supported X messaging API.

Hidden frames retain dimensions so X can render and update. Collapsing a conversation keeps its connection mounted; disabling the workspace removes its connections. Opening a chat may update X's own read state. The rail's unread dots track newly observed bot messages, not a guaranteed server-side unread count. Incoming streaming text can update an existing message without creating a new unread count.

Authenticated X responses can send `X-Frame-Options: deny`. The background worker installs a session rule removing only that header for chat routes before frames navigate. The rule is limited to `https://x.com/i/chat` and its subroutes, X-initiated subframe requests, and the requesting workspace tab. Top-level pages and Content Security Policy remain unchanged. The rule is removed when the workspace is disabled, excluded by navigation, or its tab closes. Session rules expire when the browser closes.

## Permissions and privacy

| Permission | Purpose |
| --- | --- |
| `storage` | Save settings, bot metadata, conversation state, and recent message history locally. |
| Access on `https://x.com/*` | Adjust the feed, discover bots, and connect to native X Chat. |
| `declarativeNetRequestWithHostAccess` | Install the scoped chat framing rule. |

There are no analytics, backend, API credentials, or cookie-reading permissions. Recent observed message text and validated links are cached in local extension storage; custom drafts and unconfirmed outgoing messages stay in the current tab’s memory. The cache retains up to 100 messages and about 80 KB per conversation for the 20 most recently updated conversations, expires after seven days, and is not synchronized or sent to a separate backend. Cached conversations reconnect quietly in the background; connection errors remain visible, and sending stays disabled until the live connection is ready. Message caches, like saved preferences, are shared within the browser profile. Messages you submit are delivered through X to the chosen bot. X itself manages its native drafts and history.

Read the full [privacy policy](PRIVACY.md).

Legacy pins save only conversation paths, titles, and avatar URLs or sanitized SVG geometry. Conversation preferences save paths and expanded/collapsed state for up to 100 bots. Older saved window arrangements may still be present but their coordinates are unused. Pins and preferences are shared across X accounts in the same browser profile. Native bot avatars are static shape/color snapshots; only allowlisted drawing elements and local references are copied. Scripts, styles, event handlers, and external SVG references are excluded. Image avatars are restricted to HTTPS X image CDN URLs.

## Development and testing

Run with a current Node.js release:

```sh
node tests/frame-policy.test.mjs
node tests/unread.test.mjs
node tests/bots.test.mjs
node tests/inbox-markup.test.mjs
node tests/chat-bridge.test.mjs
node tests/chat-transport.test.mjs
node tests/message-cache.test.mjs
node tests/navigation.test.mjs
node --check avatars.js
node --check chat-bridge.js
node --check chat-transport.js
node --check message-cache.js
node --check floating-bots.js
node --check navigation.js
node --check navigation-main.js
node --check content.js
node --check background.js
```

Tests cover framing scope and cleanup, bot detection, SVG sanitization, virtualized message merging, author alignment, native link labels and destinations, URL detection and unsafe-link rejection, safe metadata, per-conversation/frame/origin isolation, draft protection, native input/submission, duplicate request prevention, connection cancellation/teardown, message cache restoration and reconciliation, cache size/expiry limits, and storage failure handling.

For a local browser fixture, start:

```sh
python3 tests/fixtures/serve-floating.py
```

Open `http://127.0.0.1:8766/tests/fixtures/floating-bots.html`. It uses fake conversations and local replies; no messages go to X. Browser checks verified custom sending and replies, independent drafts, inline conversation toggling, rapid animation reversal, collapsed unread dots, and inbox updates. The feed-scroll fixture also covers page scroll behavior.

Native bot routes, SVG avatars, message-row IDs, message alignment, and the textarea composer were inspected against a live X inbox in Arc on October 22, 2026. A user-authorized message was sent through the custom composer to Quote Post Scout, and the outgoing message and bot response were verified in fresh live history. Regression tests cover X's native type="button" Send handler, delayed acknowledgement, and replacing a temporary outgoing row ID without showing a duplicate. Live verification covers the observed account and X markup; X behavior can still change.

## Troubleshooting

If bots are missing or a chat stays on connecting, use **Open X inbox** / **Open in X** to check sign-in and unlock chat, then refresh bots or reconnect. Reload the extension before refreshing X after source updates. Unseen older sessions and messages cannot appear until X renders them.

Each bot you have opened keeps a native X connection until the page reloads or the workspace is disabled, including while collapsed, so replies can update unread dots. Resource use grows with the number of connected bots. The connecting notice appears during the initial connection or an explicit reconnect; temporary composer changes do not restart it. Identical normalized connection/message states do not trigger another UI update.

## Store packaging

Run `python3 scripts/package.py` to create `dist/x-workspace-0.6.0.zip` and its SHA256 checksum. The ZIP includes only production extension files. A separate store kit includes the package, listing copy, privacy policy, icons, promotional image, and two 1280×800 screenshots with demo conversations.

The current generated bot icon master and its prompt are in `icons/bot/`. Run `python3 scripts/export-bot-icons.py` with Pillow installed to export 16, 32, 48, 128, 256, and 512 pixel PNGs. The manifest uses this icon family. The earlier vector design remains in `icons/icon.svg`; `scripts/generate-store-assets.py` regenerates that earlier family and the promotional artwork. Store screenshot previews use the actual UI module in `store/preview.html`, served by the local fixture server, without contacting X. See [store listing and submission status](store/listing.md).

## License

[MIT](LICENSE). Independent of and not endorsed by X.
