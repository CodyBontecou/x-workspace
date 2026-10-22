// Fake native upload controls for exercising the real bridge without sending to X.
if (location.pathname.startsWith('/i/chat/bots/')) {
  const form = r.querySelector('form'), input = form.querySelector('textarea'), send = form.querySelector('button');
  const picker = document.createElement('input'); picker.type = 'file'; picker.multiple = true; picker.hidden = true;
  const previews = document.createElement('div');
  form.prepend(picker, previews);
  let attachments = [], uploading = false;
  const update = () => { send.disabled = uploading || (!input.value.trim() && !attachments.length); };
  const render = () => {
    previews.replaceChildren();
    for (const file of attachments) {
      const row = document.createElement('div'); row.textContent = file.name + (uploading ? '. Uploading...' : '');
      const remove = document.createElement('button'); remove.type = 'button'; remove.setAttribute('aria-label', `Remove ${file.name}`); remove.textContent = '×';
      remove.onclick = () => { attachments = attachments.filter(item => item !== file); render(); update(); };
      row.append(remove); previews.append(row);
    }
  };
  picker.onchange = () => {
    attachments = Array.from(picker.files); uploading = true; render(); update();
    if (!new URL(parent.location.href).searchParams.has('uploadFailure')) setTimeout(() => { uploading = false; render(); update(); }, 400);
  };
  input.addEventListener('input', update);
  send.onclick = event => {
    event.preventDefault(); if (send.disabled) return;
    const row = document.createElement('div'); row.setAttribute('data-dm-item-key', 'attachment-' + crypto.randomUUID());
    const align = document.createElement('div'); align.className = 'flex w-full flex-wrap justify-end';
    const bubble = document.createElement('p'); bubble.className = 'rounded-chat';
    bubble.textContent = [input.value, ...attachments.map(file => `[${file.name}]`)].filter(Boolean).join('\n');
    align.append(bubble); row.append(align); r.querySelector('section').append(row);
    input.value = ''; attachments = []; picker.value = ''; render(); update();
  };
  update();
}
