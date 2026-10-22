# X Workspace

A lightweight Chrome extension that puts your X feed and native X Chat side by side. Keep the feed in focus, resize your conversations pane, or collapse chat when you want more space.

Built with plain JavaScript and CSS. No build step, API keys, or backend.

## Install

1. Clone this repository or download and unzip its source.
2. Open `chrome://extensions` and enable **Developer mode**.
3. Click **Load unpacked** and select the repository folder containing `manifest.json`.
4. Open or refresh [X Home](https://x.com/home).

Sign in to X in the same browser profile. If X requests your chat passcode, enter it directly in X.

To update, pull the latest source, click **Reload** on the extension in `chrome://extensions`, and refresh X. Approve updated permissions if Chrome requests them.

## Features

- Compact navigation and a centered feed.
- Opening, closing, and resizing chat leaves the feed's position and width unchanged.
- Chat slides in and out from the right in 240 ms. Rapid toggles reverse smoothly; reduced-motion users get a short fade, and keyboard activation is immediate.
- Native X Chat in a right pane, with independent scrolling.
- Resize the pane from 400 to 640 px, subject to available space.
- Collapse and reopen chat while preserving the embedded conversation.
- Saved pane width and collapse preference.
- Unread conversation avatars along the top rim of **Open chat**, with three visible avatars and an overflow count. Click an avatar to open that conversation. Missing images use initials.
- Keyboard resizing: focus the divider and use arrow keys, Home, or End.
- Toolbar popup to enable or disable the layout.
- Chat fits in the right-hand gutter beside the centered feed when there is room. If the gutter is narrower than X Chat's 400 px minimum, the pane overlays part of the feed instead of moving it.

Standalone chat and sign-in pages retain X's normal layout.

## How it works

A content script adjusts X's outer layout and embeds `https://x.com/i/chat` in a same-origin iframe. Another instance of the script hides duplicate navigation inside that named frame. X handles authentication, passcodes, encryption, and message delivery.

Authenticated X responses can send `X-Frame-Options: deny`. Before loading the chat frame, the background worker installs a session rule that removes only that header for chat routes. The rule is limited to:

- `https://x.com/i/chat` and its subroutes.
- Subframe requests initiated by X.
- The requesting workspace tab.

Top-level pages and Content Security Policy remain unchanged. The rule is removed when the workspace is disabled or leaves the layout through SPA navigation, or when the tab closes. Session rules expire when the browser closes.

## Permissions and privacy

| Permission | Purpose |
| --- | --- |
| `storage` | Save layout preferences locally. |
| Host and content-script access on `https://x.com/*` | Adjust the layout and load native chat. |
| `declarativeNetRequestWithHostAccess` | Apply the scoped chat framing rule. |

The extension has no analytics, backend, API credentials, or cookie-reading permission. It does not extract or store message text. For unread badges, the embedded frame observes X's inbox indicators and passes only conversation titles, avatar URLs, and conversation paths to the parent page. This metadata stays in memory and is not saved to extension storage or sent to a backend. Avatar images load from X's image CDN. The declarative header rule does not expose request or response bodies to the extension. Content scripts have technical access to X's page DOM; all extension code is included in this repository for inspection.

The chat frame stays mounted with its dimensions preserved while collapsed, including when a page first opens with chat collapsed. This lets its inbox continue receiving updates. Unread badges follow X's own read state, including conversations manually marked unread. Group badges represent the conversation avatar rather than identifying the author of a particular group message.

Detection covers inbox rows X has rendered. Known unread rows are retained when X virtualizes them away, then cleared when a rendered row is marked read. Counts may lag if a conversation is read elsewhere while its row is unmounted, and unseen older unread rows cannot be counted until X renders them. Chat must be signed in and unlocked; this is an in-page indicator, not a system notification service.

## Development and testing

Use a current Node.js release to run the regression check:

```sh
node tests/frame-policy.test.mjs
node tests/unread.test.mjs
node --check background.js
node --check content.js
node --check unread.js
node --check popup.js
```

The regression check uses mocked Chrome APIs to verify rule installation before acknowledgement, tab/route/origin/resource scoping, rejection of unauthorized senders and disabled layouts, and cleanup. It does not replace a browser integration test.

Unread unit checks cover state reconciliation, virtualized rows, deduplication, metadata boundaries, and URL validation. A local browser fixture verified arrivals while collapsed, overflow, opening the selected conversation, clearing avatars on read, and loading an inbox on a page that starts collapsed. X's native unread dot was inspected against a real conversation; live incoming-message behavior with version 0.2.0 still needs verification in the installed extension.

The layout controls were checked in a local browser fixture, and native chat loading was confirmed by a user running version 0.1.1 on October 22, 2026. Message sending, calls, attachments, and every X account configuration have not been exhaustively tested.

For a manual check, load the unpacked extension, confirm your inbox appears, open a conversation, resize and collapse the pane, and navigate around X while checking that the feed and chat remain usable. Confirm the feed stays in the same place while toggling and resizing chat; check both a wide window with a full right gutter and a narrow window where chat must overlay the feed.

## Troubleshooting

If chat remains on the loading screen, reload the extension first, then refresh X. Use the pane's new-tab control to check your X sign-in or chat passcode. The reload control restarts the embedded chat.

X can change its selectors, chat application, or frame policies at any time. This is an early extension distributed as source; it is not a Chrome Web Store release. Bug reports and pull requests are welcome. Please remove private messages and account details from shared screenshots or logs.

## License

[MIT](LICENSE). This project is independent and is not affiliated with or endorsed by X.
