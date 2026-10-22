# X Workspace privacy policy

Effective October 22, 2026.

X Workspace is an independent browser extension maintained by Cody Bontecou. It lets you manage Grok bot conversations within your existing X session. It is not affiliated with or endorsed by X or xAI.

## Information handled on your device

The extension reads bot names, conversation paths, avatars, unread indicators, and rendered messages on x.com to display the bot sidebar and custom chats. Recent observed message text, validated links, and bot metadata are cached in the browser's local extension storage so chats appear immediately after a reload while X reconnects. The cache retains up to 100 messages and about 80 KB per conversation for the 20 most recently updated conversations; snapshots expire after seven days. Cached messages are shared within the browser profile and are not synchronized to a server. Unsent custom drafts and unconfirmed outgoing messages stay in the current tab's memory and are discarded when that page is reloaded or closed.

Extension settings are saved in the browser's local extension storage. These include whether the workspace is enabled, saved bot pins and their names, paths and avatar metadata, and the focused conversation. Older versions may also have saved window sizes and positions. These preferences are shared between X accounts used in the same browser profile. They are not synchronized by this extension to a server.

## Messages and network activity

When you send a message, the extension submits it through X's native chat interface to the bot you selected. Hidden X conversation frames use your existing authenticated X session to load and update chats. X receives and processes this activity under its own privacy policy: https://x.com/en/privacy. Bot avatars may load from X's image CDN. Links you open navigate to their destination websites, whose privacy policies apply there.

Files you select, drop, or paste into the custom composer remain in the tab's memory, with local image previews, until you press Send. Sending transfers those files to X's native upload control and submits them to your selected bot. File contents and local image previews are not saved in extension storage. Unsent attachment drafts are discarded on reload or close; filenames or text labels in observed message history may be included in the recent message cache.

Inline history previews reuse images loaded by the live X conversation. Embedded raster images are decoded into temporary local image URLs with bounded memory use; approved X image CDN URLs may also load directly. Image contents and preview URLs are excluded from the saved message cache and are released when the connection's document is closed.

Document download cards may cache filenames, displayed file sizes, and a position within the message. Clicking a card invokes the matching file's native X download control. The extension does not cache document contents or download URLs.

The extension has no developer-operated backend, analytics, advertising, or telemetry. It does not sell user data, send conversation content to its developer, or use it to train models. It does not request permission to read cookies, passwords, payment information, or browsing history outside x.com.

## Browser permissions

- Access to x.com allows the extension to discover bots, display chats, and submit messages that you choose to send.
- Local storage saves the settings and recent message cache described above.
- The declarative network request permission removes the X-Frame-Options response header only for X chat subframes initiated by x.com in the workspace tab. This enables the hidden chat connections. It does not modify top-level pages or Content Security Policy.

## Your controls

Disable the workspace using the toolbar popup to remove its chat connections. Reload or close the X tab to discard custom drafts and in-memory state; recent cached history remains available on reload until it expires or is evicted by newer conversations. Uninstall the extension to remove its saved settings and cached messages. These actions do not delete messages or native drafts stored by X; manage those directly in X.

## Contact and changes

For privacy questions, open an issue at https://github.com/CodyBontecou/x-workspace/issues. Do not include private messages, credentials, or other sensitive information in a public issue. Changes to this policy will be published in this repository with an updated effective date.
