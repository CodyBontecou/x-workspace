# X Workspace store listing

Package: `dist/x-workspace-0.6.0.zip`.
Targets: Chrome Web Store and Microsoft Edge Add-ons. Firefox and Safari require separate ports and verification.

## Public listing

Name: X Workspace

Summary: Manage your Grok bots on X with focused floating chats, compact avatars, unread dots, and independent drafts.

Category: Productivity

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

Custom chat supports text messages and links. Open the native conversation for attachments, voice, search, and other rich features. Chats appear on x.com; following a link to an external site leaves the workspace. Drafts and message snapshots are held in memory and do not survive a full reload.

No developer backend or analytics. Messages are sent through X to the bot you select. X's own privacy policy and account requirements apply. X Workspace is independent of and not endorsed by X or xAI.

## Privacy practices and permission justifications

Single purpose: Manage existing X Grok bot conversations in a focused sidebar on x.com.

`storage`: Save workspace enabled state, pinned bot metadata, and the focused bot locally. Message text and custom drafts are not written to extension storage.

`https://x.com/*`: Discover bot rows and avatars, read native chat messages, display the workspace, and submit messages that the user chooses to send through X's own authenticated interface. No access to unrelated websites is requested.

`declarativeNetRequestWithHostAccess`: Remove only X-Frame-Options on x.com chat subframes initiated by x.com within the requesting workspace tab. This permits hidden native chat connections. Top-level navigation and Content Security Policy remain unchanged. Session rules are cleaned up when the workspace is disabled or the tab closes.

Remote code: Extension JavaScript is bundled in the uploaded ZIP; there is no remote script import, eval, or developer-operated remote backend. Native X pages load in hidden web frames to provide authenticated chat; disclose this integration in review notes. No X page code is copied into the extension package.

Data: Bot identifiers, names, avatars, unread states, message text, and drafts are processed locally to provide chat. Native X frames communicate with X, and user-submitted messages go to X. The extension developer receives none of that data. Do not describe the extension as never accessing personal communications or website content. Complete store data checkboxes according to the store's definitions and these facts.

## Reviewer testing notes

1. Sign into a reviewer-controlled X account with access to Grok bots and at least one existing bot session. No developer test credentials are included.
2. Unlock X Chat directly if the account requires a passcode. Open the inbox and let X render its bot sessions.
3. Visit X Home and click the white Grokbot launcher at the bottom right.
4. Open a bot. The focused chat uses the rail height; other bot icons sit beside the launcher. Hover an icon for its name.
5. Type an unsent draft, switch bots, and return. The draft should remain. Only send a message using your own test account if desired.
6. Follow a linked X post; the page changes while the custom chat stays open. Back restores the previous page.
7. Disable the workspace using its toolbar popup to remove the overlay and native connections.

All seven regression test files pass locally. Chrome/Arc live chat behavior was verified on October 22, 2026. Edge compatibility still requires a real Edge installation test before submission; no Edge-specific runtime result is claimed.

## Submission status

As of October 22, 2026:

- Chrome Web Store: the signed-in account is at developer registration. The Developer Agreement and Privacy Policies have not been accepted, and the displayed one-time $5 registration fee has not been paid. No item has been uploaded or submitted.
- Microsoft Edge Add-ons: Partner Center requires Microsoft sign-in. No item has been uploaded or submitted.
- Both screenshots are 1280×800 JPEG captures of the actual UI module with clearly labeled, synthetic demo conversations. No private chats are included.
- The 440×280 promotional image and PNG extension icons are original artwork. The production ZIP excludes tests, preview code, store materials, and repository metadata.

Store submission and approval are separate steps; record actual dashboard item IDs and review status here once available.
