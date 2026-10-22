from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
repo=Path(__file__).resolve().parents[2]
class Handler(SimpleHTTPRequestHandler):
 def __init__(self,*args,**kwargs):super().__init__(*args,directory=str(repo),**kwargs)
 def end_headers(self):
  self.send_header('Cache-Control','no-store')
  super().end_headers()
 def do_GET(self):
  if not self.path.startswith('/i/chat'):return super().do_GET()
  body='''<!doctype html><meta charset="utf-8"><body style="margin:0;background:#000;color:#eee;font:14px system-ui"><div data-testid="xchatEmbedRoute"></div><script>
const r=document.querySelector('[data-testid]').attachShadow({mode:'open'});
if(location.pathname==='/i/chat'){
r.innerHTML=`<a href="/i/chat/bots/research" aria-label="Research bot, Primary bot, unread"><div data-inbox-row><div><svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="15" fill="#ff6700"/></svg></div><span class="line-clamp-1">Research bot</span><i data-icon="icon-circle-fill" class="text-chat-accent"></i></div></a><a href="/i/chat/bots/coding" aria-label="Coding bot"><div data-inbox-row><div></div><span class="line-clamp-1">Coding bot</span></div></a>`;
window.addEventListener('message',e=>{if(e.data?.type!=='fixture:update')return;r.querySelector('a').setAttribute('aria-label','Research bot, Primary bot');r.querySelector('i')?.remove();});
}else{
r.innerHTML=`<style>:host{display:block;height:100vh}main{height:100%;display:flex;flex-direction:column;padding:16px;box-sizing:border-box}section{flex:1;overflow:auto}p{background:#202327;border-radius:12px;padding:12px}textarea{font:inherit;box-sizing:border-box;width:100%;padding:12px;color:white;background:#202327;border:0;border-radius:12px}button{padding:10px;margin-top:8px}</style><main><h3>Bot conversation</h3><section aria-label="Messages" data-testid="dm-message-scroller"><div data-dm-item-key="first"><div class="flex w-full flex-wrap justify-start"><p class="rounded-chat">How can I help?</p></div></div></section><form><textarea aria-label="Message" data-testid="dm-composer-textarea"></textarea><button type="button" data-testid="dm-composer-send-button">Send</button></form></main>`;
r.querySelector('.rounded-chat').innerHTML='How can I help?<br>Read <a href="/fixture/post/123">this post</a> from <a href="/fixture/profile/tpae">@tpae</a>, or visit https://example.com/docs.';
r.querySelector('[data-testid="dm-composer-send-button"]').onclick=e=>{e.preventDefault();const input=r.querySelector('textarea');if(!input.value.trim())return;const row=document.createElement('div');const messageStamp=Date.now();row.setAttribute('data-dm-item-key','pending-'+messageStamp);const align=document.createElement('div');align.className='flex w-full flex-wrap justify-end';const p=document.createElement('p');p.className='rounded-chat';p.textContent=input.value;align.append(p);row.append(align);r.querySelector('section').append(row);input.value='';setTimeout(()=>{row.setAttribute('data-dm-item-key','sent-'+messageStamp);const bot=document.createElement('div');bot.setAttribute('data-dm-item-key','reply-'+Date.now());bot.innerHTML='<div class=\"flex w-full flex-wrap justify-start\"><p class=\"rounded-chat\">Got it! This reply is from the local fixture.</p></div>';r.querySelector('section').append(bot);},300);};
}
</script><script src="/tests/fixtures/native-attachments.js"></script><script src="/avatars.js"></script><script src="/unread.js"></script><script src="/bots.js"></script><script src="/chat-bridge.js"></script><script src="/chat-transport.js"></script><script src="/floating-bots.js"></script><script src="/content.js"></script>'''
  self.send_response(200);self.send_header('Content-Type','text/html; charset=utf-8');self.end_headers();self.wfile.write(body.encode())
ThreadingHTTPServer(('127.0.0.1',8766),Handler).serve_forever()
