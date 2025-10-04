// ==UserScript==
// @name         Teams Auto First Reply (Support Chat only)
// @namespace    anna.teams.autoreply
// @version      2.2
// @description  Автоответ только в нужном чате; игнор "Customer Support Monotech 1"; надёжная отправка
// @match        https://teams.live.com/*
// @match        https://*.teams.microsoft.com/*
// @run-at       document-end
// @noframes
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  // ===== НАСТРОЙКИ =====
  const REPLY_TEXTS = [
    "Hello, we’re on it",
    "Hi, checking",
    "We're checking",
    "Hello team, we're looking into it"
  ];
  const IGNORE_SENDERS = [
    "Customer Support Monotech 1"
    // ,"shulya ania" // раскомментируй, если нужно игнорить себя
  ];
  // разрешаем ТОЛЬКО чат, у которого в шапке виден заголовок "Chat"
  const ALLOWED_CHATS = [/^chat$/i];

  const MIN_DELAY_SEC = 10;
  const MAX_DELAY_SEC = 175;
  const DEBUG = true;

  // ===== ХЕЛПЕРЫ =====
  const log = (...a)=>DEBUG && console.log('[AutoReply]', ...a);
  const rand = (a,b)=>Math.floor(Math.random()*(b-a+1))+a;
  const sleep = ms=>new Promise(r=>setTimeout(r,ms));
  const q  = (s,r=document)=>r.querySelector(s);
  const qa = (s,r=document)=>Array.from(r.querySelectorAll(s));
  const norm = s=>(s||'').toLowerCase().replace(/\s+/g,' ').trim();
  const lastSigByChat = new Map();

  // заголовок из центральной шапки
  function getActiveChatMeta(){
    const m = location.href.match(/\/chat\/([^/?#]+)/);
    const chatId = m ? decodeURIComponent(m[1]) : 'unknown';
    const header = q('[data-tid="threadHeader"],[data-tid="chatHeader"],[data-tid="thread-pane-header"],[role="banner"]') || document;
    const titleEl = q('[data-tid="threadTitle"],[data-tid="chat-header-title"],[role="heading"],h1,h2', header);
    const title = (titleEl?.textContent || '').trim();
    return { chatId, title };
  }
  const isAllowedChat = (title)=> ALLOWED_CHATS.some(rx=>rx.test(norm(title)));

  // поиск реального contenteditable (в т.ч. в iframe)
  function getInputBox(){
    const sels = [
      '[role="textbox"][aria-label*="Type"]',
      '[data-tid="messageComposeTextEditor"] div[contenteditable="true"]',
      '[data-tid*="composeTextEditor"] div[contenteditable="true"]',
      'div[contenteditable="true"][data-contents="true"]',
      'div[contenteditable="true"]'
    ];
    for(const s of sels){ const el = q(s); if(el) return el; }
    for(const f of qa('iframe')){
      try{
        const d = f.contentDocument || f.contentWindow?.document;
        if(!d) continue;
        for(const s of sels){ const el = d.querySelector(s); if(el) return el; }
      }catch(_){}
    }
    return null;
  }

  function getLastMessageInfo(){
    const pane = q('[role="main"],[data-tid="chat-pane"],[data-testid*="chat-pane"],[data-tid="threadPane"]') || document;
    const items = qa('[role="listitem"],[data-tid*="message"],[data-tid*="chatMessage"]', pane);
    if(!items.length) return {ok:false};

    const last = items[items.length-1];
    const bubble = q('[data-tid*="messageBody"],[data-tid*="messageText"],[role="group"],[data-tid*="content"]', last) || last;

    const rawLabel = (bubble.getAttribute('aria-label') || '').trim();
    const rawText  = (bubble.textContent || '').trim();

    let sender = '';
    const m1 = rawLabel.match(/^\s*(From|От|Від)\s+(.+?)[,:，：]/i);
    if(m1 && m1[2]) sender = m1[2].trim();
    if(!sender){
      const author = q('[data-tid*="author"],[data-tid*="messageAuthor"],[aria-label*="said"],[data-testid*="message-author"]', last);
      const aText = author?.textContent?.trim() || '';
      if(aText) sender = aText.replace(/\b(said|сказал|сказала)\b.*$/i,'').trim();
    }

    const isFromMe = /\b(You|Вы|Ти)\b/i.test(rawLabel) || last.getAttribute('data-is-author-me')==='true';
    const tsEl = q('time,[data-tid*="timestamp"],[data-testid*="message-timestamp"]', last);
    const ts = (tsEl?.getAttribute?.('datetime') || tsEl?.textContent || '').trim();
    const textShort = (rawLabel || rawText).slice(-200);
    const sig = `${textShort}||${ts}`;

    return { ok:true, sig, sender, isFromMe, rawLabel, rawText, preview: rawText.slice(0,80) };
  }

  // игнор Monotech даже если sender пустой
  const IGNORE_LOWER = IGNORE_SENDERS.map(s=>s.toLowerCase());
  function isIgnored(name,label,text){
    const hay = (name+' '+label+' '+text).toLowerCase();
    return IGNORE_LOWER.some(x=>hay.includes(x));
  }

  // надёжная вставка текста + отправка (Enter → клик по Send)
  async function typeAndSend(text){
    const box = getInputBox();
    if(!box){ log('❌ input box not found'); return false; }
    try{ box.scrollIntoView({block:'center'});}catch(_){}
    box.focus(); await sleep(30);

    const doc = box.ownerDocument || document;
    const sel = doc.getSelection(); const range = doc.createRange();
    range.selectNodeContents(box); range.collapse(false);
    sel.removeAllRanges(); sel.addRange(range);

    box.dispatchEvent(new InputEvent('beforeinput',{inputType:'insertText',data:text,bubbles:true,cancelable:true}));
    document.execCommand('insertText', false, text); await sleep(20);

    if(!((box.innerText||box.textContent||'').includes(text))){
      const curr = (box.innerText||box.textContent||'');
      if('innerText' in box) box.innerText = curr + text; else box.textContent = curr + text;
      box.dispatchEvent(new InputEvent('input',{bubbles:true,cancelable:true}));
    }

    let ok = box.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',code:'Enter',which:13,keyCode:13,bubbles:true}));
    if(!ok || (box.innerText||box.textContent||'').includes(text)){
      const sendBtn = (box.ownerDocument || document).querySelector('[data-tid="sendMessageButton"],[data-testid*="send"],button[aria-label*="Send"]');
      if(sendBtn){ sendBtn.click(); ok = true; }
    }
    log('↩️ send:', ok ? 'OK' : 'FAILED');
    return ok;
  }

  async function maybeAutoReply(){
    const { chatId, title } = getActiveChatMeta();
    if(!chatId) return;
    if(!isAllowedChat(title)) { log('skip: not an allowed chat →', title); return; }

    const info = getLastMessageInfo();
    if(!info.ok) return;
    log('last msg:', {title, sender:info.sender, my:info.isFromMe, preview:info.preview});

    if(info.isFromMe) return;
    if(isIgnored(info.sender, info.rawLabel, info.rawText)) { log('skip: sender ignored →', info.sender || '(by content)'); return; }
    if(lastSigByChat.get(chatId) === info.sig) return;

    const delayMs = rand(MIN_DELAY_SEC, MAX_DELAY_SEC) * 1000;
    log(`pending reply in ${Math.round(delayMs/1000)}s…`);
    await sleep(delayMs);

    const check = getLastMessageInfo();
    if(!check.ok || check.isFromMe) return;

    const reply = REPLY_TEXTS[rand(0, REPLY_TEXTS.length-1)];
    const ok = await typeAndSend(reply);
    if(ok){
      lastSigByChat.set(chatId, check.sig);
      log(`✅ replied in "${title}" to ${check.sender || 'unknown'}`);
    }
  }

  // запуск
  (function start(){
    console.log('[AutoReply] boot at', location.href);
    const mo = new MutationObserver(()=>{
      if(mo._p) return;
      mo._p = true;
      setTimeout(()=>{ maybeAutoReply().finally(()=>mo._p=false); }, 150);
    });
    mo.observe(document.documentElement, {childList:true, subtree:true});
    setInterval(maybeAutoReply, 2000);
    log('Started. AllowedChats=', ALLOWED_CHATS.map(r=>r.toString()), 'IgnoreSenders=', IGNORE_SENDERS);
  })();
})();
