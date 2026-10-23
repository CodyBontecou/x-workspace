# X Workspace store listing

Package: `dist/x-workspace-0.6.1.zip`.
Targets: Chrome Web Store and Microsoft Edge Add-ons. Firefox and Safari require separate ports and verification.

## Public listing

Name: X Workspace

Summary: Manage your Grok bots on X with focused floating chats, compact avatars, unread dots, and independent drafts.

Category: Productivity / Communication

Language: English

Website: https://github.com/CodyBontecou/x-workspace

Support: https://github.com/CodyBontecou/x-workspace/issues

Privacy policy: https://github.com/CodyBontecou/x-workspace/blob/main/PRIVACY.md

Description:

Keep your Grok bots close while you browse X. X Workspace adds a minimal bot rail and custom conversations to your existing X session.

- Open the Grokbot icon to see detected bot sessions, their avatars, and unread dots.
- Focus one conversation and give its messages the full height of the right rail.
- Switch bots using small avatars beside the launcher. Hover an icon to see its name.
- Read floating message pills above the composer, with separate drafts for each bot.
- Follow X message links in the same tab while preserving the chat and draft.
- Restore your focused bot after refreshing X.

Sign in to X and unlock X Chat first. You need existing Grok bot conversations in your X account; this extension does not create bots or provide a Grok subscription. Only sessions rendered by X can be discovered. Opening a conversation can update its native read state. Unread dots indicate newly observed messages, rather than a guaranteed server-side count.

Custom chat supports text messages, links, and file attachments through the paperclip, drag-and-drop, or image paste. Image attachments appear inline and open in a larger preview when clicked. PDFs and other document attachments appear as clickable download cards with filenames, file types, and sizes when available. Open the native conversation for voice, search, and other rich features. Chats appear on x.com; following a link to an external site leaves the workspace. Recent observed messages and file-card metadata are cached locally and appear immediately after refresh while X reconnects. Image previews come from the live connection and are not cached. Custom drafts, selected files, and unconfirmed outgoing messages do not survive a full reload.

No developer backend or analytics. Messages are sent through X to the bot you select. X's own privacy policy and account requirements apply. X Workspace is independent of and not endorsed by X or xAI.

## Privacy practices and permission justifications

Single purpose: Manage existing X Grok bot conversations in a focused sidebar on x.com.

`storage`: Save workspace enabled state, pinned bot metadata, and the focused bot locally. Recent observed message text and validated links are cached in local extension storage (up to 100 messages and about 80 KB per conversation, 20 conversations, seven-day expiry). Custom drafts and unconfirmed outgoing messages stay in memory. The cache is shared within the browser profile and is not synchronized.

`https://x.com/*`: Discover bot rows and avatars, read native chat messages, display the workspace, and submit messages that the user chooses to send through X's own authenticated interface. No access to unrelated websites is requested.

`declarativeNetRequestWithHostAccess`: Remove only X-Frame-Options on x.com chat subframes initiated by x.com within the requesting workspace tab. This permits hidden native chat connections. Top-level navigation and Content Security Policy remain unchanged. Session rules are cleaned up when the workspace is disabled or the tab closes.

Remote code: Extension JavaScript is bundled in the uploaded ZIP; there is no remote script import, eval, or developer-operated remote backend. Native X pages load in hidden web frames to provide authenticated chat; disclose this integration in review notes. No X page code is copied into the extension package.

Data: Bot identifiers, names, avatars, unread states, message text, and drafts are processed locally to provide chat. Native X frames communicate with X, and user-submitted messages go to X. The extension developer receives none of that data. Do not describe the extension as never accessing personal communications or website content. Complete store data checkboxes according to the store's definitions and these facts.

Dashboard disclosures for version 0.6.1: personally identifiable information, personal communications, user activity (local hover/press/pointer handling), and website content. These categories include local processing; no developer telemetry is collected. Remote-code explanation distinguishes bundled extension scripts from native X webpages loaded in hidden web frames.

## Reviewer testing notes

1. Sign into a reviewer-controlled X account with access to Grok bots and at least one existing bot session. No developer test credentials are included.
2. Unlock X Chat directly if the account requires a passcode. Open the inbox and let X render its bot sessions.
3. Visit X Home and click the white Grokbot launcher at the bottom right.
4. Open a bot. The focused chat uses the rail height; other bot icons sit beside the launcher. Hover an icon for its name.
5. Type an unsent draft, switch bots, and return. The draft should remain. Only send a message using your own test account if desired.
6. Follow a linked X post; the page changes while the custom chat stays open. Back restores the previous page.
7. Disable the workspace using its toolbar popup to remove the overlay and native connections.

All eleven regression test files pass locally. The cursor-follow animation, press continuity, reduced-motion behavior, and cleanup are covered by dedicated motion checks. Chrome/Arc live chat behavior was verified on October 22, 2026. Edge compatibility still requires a real Edge installation test before submission; no Edge-specific runtime result is claimed.

## Version 0.6.1 release notes

- Add springy cursor tracking, independent eye movement for supported SVG avatars, and soft press feedback to the bot dock and launcher.
- Scale movement to compact dock icons and respect reduced-motion and touch input.
- Bundle the motion module locally; no new permissions or external services.

## Submission status

Latest release preparation, October 23, 2026:

- Version 0.6.1 is packaged as `dist/x-workspace-0.6.1.zip`; all eleven regression tests and JavaScript syntax checks pass.
- Google account re-verification completed. The dashboard is gated by the EEA trader declaration and publisher verification; the user selected Trader and authorized the marketplace-rules agreement. Publisher verification was started with explicit user authorization and is waiting for the user to select a payments profile and complete identity or business-document verification. Version 0.6.1 was uploaded and accepted as draft item `elgkealcelkakfgggifocdkinanjmlnb`. The listing includes two screenshots, the icon and small promotional tile, permission explanations, privacy disclosures, and reviewer test instructions. Publisher verification and contact email verification are complete. Submitted for Chrome Web Store review on October 23, 2026. The dashboard confirmed "Your extension was submitted for review" and status "Pending review". Automatic publication after approval is enabled.
- No permissions changed in this update.

Previously observed status on October 22, 2026 (not re-verified):

- Chrome Web Store: the signed-in account is at developer registration. The Developer Agreement and Privacy Policies have not been accepted, and the displayed one-time $5 registration fee has not been paid. No item has been uploaded or submitted.
- Microsoft Edge Add-ons: Partner Center requires Microsoft sign-in. No item has been uploaded or submitted.
- Both screenshots are 1280×800 JPEG captures of the actual UI module with clearly labeled, synthetic demo conversations. No private chats are included.
- The 440×280 promotional image and PNG extension icons are original artwork. The production ZIP excludes tests, preview code, store materials, and repository metadata.

Store submission and approval are separate steps. Version 0.6.1 is pending review and is not yet approved or published.

Chrome item ID: `elgkealcelkakfgggifocdkinanjmlnb`.

Dashboard: https://chrome.google.com/webstore/devconsole/d3b1df21-3263-4d13-9344-9544dc3bef7d/elgkealcelkakfgggifocdkinanjmlnb/edit

Uploaded ZIP SHA256: `5f2da0973890cff95eafdb045731058aa5500f34e5838a3c9fb3c90e84d80e36`.
