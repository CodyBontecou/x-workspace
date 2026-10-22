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
- Native X Chat in a right pane, with independent scrolling.
- Resize the pane from 400 to 640 px, subject to available space.
- Collapse and reopen chat while preserving the embedded conversation.
- Saved pane width and collapse preference.
- Keyboard resizing: focus the divider and use arrow keys, Home, or End.
- Toolbar popup to enable or disable the layout.
- Chat overlays the feed below 1100 px rather than squeezing both columns.

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

The extension has no analytics, backend, API credentials, or cookie-reading permission. It does not extract or store message text. The declarative header rule does not expose request or response bodies to the extension. Content scripts have technical access to X's page DOM; all extension code is included in this repository for inspection.

## Development and testing

Use a current Node.js release to run the regression check:

```sh
node tests/frame-policy.test.mjs
node --check background.js
node --check content.js
node --check popup.js
```

The regression check uses mocked Chrome APIs to verify rule installation before acknowledgement, tab/route/origin/resource scoping, rejection of unauthorized senders and disabled layouts, and cleanup. It does not replace a browser integration test.

The layout controls were checked in a local browser fixture, and native chat loading was confirmed by a user running version 0.1.1 on October 22, 2026. Message sending, calls, attachments, and every X account configuration have not been exhaustively tested.

For a manual check, load the unpacked extension, confirm your inbox appears, open a conversation, resize and collapse the pane, and navigate around X while checking that the feed and chat remain usable.

## Troubleshooting

If chat remains on the loading screen, reload the extension first, then refresh X. Use the pane's new-tab control to check your X sign-in or chat passcode. The reload control restarts the embedded chat.

X can change its selectors, chat application, or frame policies at any time. This is an early extension distributed as source; it is not a Chrome Web Store release. Bug reports and pull requests are welcome. Please remove private messages and account details from shared screenshots or logs.

## License

[MIT](LICENSE). This project is independent and is not affiliated with or endorsed by X.
