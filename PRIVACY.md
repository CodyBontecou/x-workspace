# X Workspace privacy policy

Effective October 22, 2026.

X Workspace is an independent browser extension maintained by Cody Bontecou. It lets you manage Grok bot conversations within your existing X session. It is not affiliated with or endorsed by X or xAI.

## Information handled on your device

The extension reads bot names, conversation paths, avatars, unread indicators, and rendered messages on x.com to display the bot sidebar and custom chats. Message text and unsent custom drafts are held in the current tab's memory and are discarded when that page is reloaded or closed.

Extension settings are saved in the browser's local extension storage. These include whether the workspace is enabled, saved bot pins and their names, paths and avatar metadata, and the focused conversation. Older versions may also have saved window sizes and positions. These preferences are shared between X accounts used in the same browser profile. They are not synchronized by this extension to a server.

## Messages and network activity

When you send a message, the extension submits it through X's native chat interface to the bot you selected. Hidden X conversation frames use your existing authenticated X session to load and update chats. X receives and processes this activity under its own privacy policy: https://x.com/en/privacy. Bot avatars may load from X's image CDN. Links you open navigate to their destination websites, whose privacy policies apply there.

The extension has no developer-operated backend, analytics, advertising, or telemetry. It does not sell user data, send conversation content to its developer, or use it to train models. It does not request permission to read cookies, passwords, payment information, or browsing history outside x.com.

## Browser permissions

- Access to x.com allows the extension to discover bots, display chats, and submit messages that you choose to send.
- Local storage saves the settings described above.
- The declarative network request permission removes the X-Frame-Options response header only for X chat subframes initiated by x.com in the workspace tab. This enables the hidden chat connections. It does not modify top-level pages or Content Security Policy.

## Your controls

Disable the workspace using the toolbar popup to remove its chat connections. Reload or close the X tab to discard the extension's in-memory message snapshots and custom drafts. Uninstall the extension to remove its saved extension settings. These actions do not delete messages or native drafts stored by X; manage those directly in X.

## Contact and changes

For privacy questions, open an issue at https://github.com/CodyBontecou/x-workspace/issues. Do not include private messages, credentials, or other sensitive information in a public issue. Changes to this policy will be published in this repository with an updated effective date.
