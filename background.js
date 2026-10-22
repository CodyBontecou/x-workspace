// Install the exception before the iframe navigates. Never modify top-level pages,
// other origins, or non-chat routes. Session rules disappear on browser shutdown.
const pending = new Map();
const ruleId = tabId => tabId + 1;
function enqueue(tabId, task) {
  const next = (pending.get(tabId) || Promise.resolve()).catch(() => {}).then(task);
  pending.set(tabId, next);
  next.finally(() => { if (pending.get(tabId) === next) pending.delete(tabId); }).catch(() => {});
  return next;
}
async function remove(tabId) {
  await chrome.declarativeNetRequest.updateSessionRules({ removeRuleIds: [ruleId(tabId)] });
}
chrome.runtime.onMessage.addListener((message, sender, reply) => {
  if (!['xw-prepare-chat', 'xw-release-chat'].includes(message?.type)) return;
  if (sender.frameId !== 0 || !Number.isInteger(sender.tab?.id) || sender.tab.id < 0) return;
  try { if (new URL(sender.url).origin !== 'https://x.com') return; } catch { return; }
  const tabId = sender.tab.id;
  enqueue(tabId, async () => {
    if (message.type === 'xw-release-chat') { await remove(tabId); return { ok: true }; }
    const { enabled } = await chrome.storage.local.get({ enabled: true });
    if (!enabled) { await remove(tabId); return { ok: false, error: 'Workspace is disabled.' }; }
    await chrome.declarativeNetRequest.updateSessionRules({
      removeRuleIds: [ruleId(tabId)],
      addRules: [{
        id: ruleId(tabId), priority: 1,
        action: { type: 'modifyHeaders', responseHeaders: [{ header: 'x-frame-options', operation: 'remove' }] },
        condition: {
          regexFilter: '^https://x\\.com/i/chat([/?].*)?$',
          initiatorDomains: ['x.com'], resourceTypes: ['sub_frame'], tabIds: [tabId]
        }
      }]
    });
    return { ok: true };
  }).then(reply, () => reply({ ok: false, error: 'Could not enable chat embedding. Reload the extension and accept its updated permissions.' }));
  return true;
});
chrome.tabs.onRemoved.addListener(tabId => enqueue(tabId, () => remove(tabId)));
