(() => {
  'use strict';

  if (window.__subFetcherLauncherLoaded) return;
  window.__subFetcherLauncherLoaded = true;

  const API_URL = '/api/v1/plugin/sub-fetcher/config';
  const TOKEN_KEY = 'Vue_Naive_access_token';
  const CLIENT_KEY = 'SUB_FETCHER_CLIENT';
  const ACTION_MARKER = 'data-sub-fetcher-action';
  const FALLBACK_MARKER = 'data-sub-fetcher-fallback';
  const CLIENTS = {
    clash: { label: 'Clash', filename: 'clash.yaml' },
    v2ray: { label: 'v2rayN', filename: 'v2rayn.txt' },
    singbox: { label: 'sing-box', filename: 'sing-box.json' },
    surge: { label: 'Surge', filename: 'surge.conf' },
  };
  const ACTION_TEXTS = ['复制订阅地址', '复制订阅', '一键订阅'];
  const configCache = new Map();
  const pendingRequests = new Map();
  let cacheToken = null;
  let panel;
  let panelEpoch = 0;
  let retryCount = 0;
  let retryTimer;

  function userError(message) {
    const error = new Error(message);
    error.isSubFetcherUserError = true;
    return error;
  }

  function staleRequest() {
    const error = new Error('Stale sub-fetcher request');
    error.isSubFetcherStaleRequest = true;
    return error;
  }

  function invalidatePanelActions() {
    panelEpoch += 1;
  }

  function getAccessToken() {
    try {
      const saved = window.localStorage.getItem(TOKEN_KEY);
      if (!saved) return '';
      const wrapper = JSON.parse(saved);
      if (typeof wrapper === 'string') return wrapper;
      if (!wrapper || typeof wrapper !== 'object') return '';
      for (const key of ['value', 'token', 'access_token']) {
        if (typeof wrapper[key] === 'string' && wrapper[key]) return wrapper[key];
      }
    } catch (_) {
      // A malformed local value is treated as an expired login.
    }
    return '';
  }

  function syncCacheSession(token) {
    if (cacheToken !== token) {
      configCache.clear();
      pendingRequests.clear();
      cacheToken = token;
      invalidatePanelActions();
    }
  }

  function savedClient() {
    try {
      const client = window.localStorage.getItem(CLIENT_KEY);
      return Object.prototype.hasOwnProperty.call(CLIENTS, client) ? client : 'clash';
    } catch (_) {
      return 'clash';
    }
  }

  function persistClient(client) {
    try {
      window.localStorage.setItem(CLIENT_KEY, client);
    } catch (_) {
      // The panel remains usable when storage is unavailable.
    }
  }

  function findSubscriptionAction() {
    // Xboard's current theme renders subscription actions as clickable divs.
    // Prefer the smallest matching element so a surrounding card is not used.
    const elements = document.querySelectorAll(
      'button, a, [role="button"], [class~="cursor-pointer"]',
    );
    return Array.from(elements)
      .filter((element) => {
      const text = (element.textContent || '').replace(/\s+/g, '');
      return ACTION_TEXTS.some((candidate) => text.includes(candidate));
      })
      .sort((left, right) => (left.textContent || '').length - (right.textContent || '').length)[0];
  }

  function makeAction(isFallback) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = isFallback ? 'sf-fallback' : 'sf-launcher';
    button.setAttribute(isFallback ? FALLBACK_MARKER : ACTION_MARKER, 'true');
    button.textContent = '安全下载';
    button.addEventListener('click', () => openPanel(button));
    return button;
  }

  function removeFallback() {
    const fallback = document.querySelector(`[${FALLBACK_MARKER}]`);
    if (fallback) fallback.remove();
  }

  function injectAction() {
    const target = findSubscriptionAction();
    if (target) {
      removeFallback();
      if (!document.querySelector(`[${ACTION_MARKER}]`)) {
        const action = makeAction(false);
        target.insertAdjacentElement('afterend', action);
      }
      return true;
    }
    return false;
  }

  function addFallback() {
    if (!getAccessToken() || document.querySelector(`[${FALLBACK_MARKER}]`)) return;
    document.body.appendChild(makeAction(true));
  }

  function tryInjection() {
    if (injectAction()) {
      retryCount = 0;
      window.clearTimeout(retryTimer);
      return;
    }
    if (retryCount >= 18) {
      addFallback();
      return;
    }
    retryCount += 1;
    window.clearTimeout(retryTimer);
    retryTimer = window.setTimeout(tryInjection, 500);
  }

  function injectStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .sf-launcher,.sf-fallback{font:inherit;line-height:1.4;cursor:pointer}
      .sf-launcher{margin-left:8px;padding:6px 10px;border:1px solid currentColor;border-radius:6px;background:transparent;color:inherit;opacity:.88}
      .sf-launcher:hover,.sf-launcher:focus-visible{opacity:1;outline:2px solid currentColor;outline-offset:2px}
      .sf-fallback{position:fixed;right:16px;bottom:16px;z-index:2147483645;padding:7px 10px;border:1px solid rgba(128,128,128,.5);border-radius:6px;background:Canvas;color:CanvasText;box-shadow:0 2px 10px rgba(0,0,0,.16);font-size:13px;opacity:.85}
      .sf-panel{position:fixed;z-index:2147483646;right:16px;top:72px;width:min(360px,calc(100vw - 32px));max-height:calc(100vh - 88px);overflow:auto;padding:16px;border:1px solid rgba(128,128,128,.45);border-radius:8px;background:Canvas;color:CanvasText;box-shadow:0 12px 32px rgba(0,0,0,.22);font:inherit;letter-spacing:0}
      .sf-panel[hidden]{display:none}.sf-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px}.sf-title{font-weight:600}.sf-close{width:28px;height:28px;padding:0;border:0;border-radius:4px;background:transparent;color:inherit;font:inherit;font-size:20px;line-height:1;cursor:pointer}.sf-close:hover,.sf-close:focus-visible{background:rgba(128,128,128,.16);outline:2px solid currentColor;outline-offset:1px}
      .sf-label{display:block;margin-bottom:6px;font-size:13px}.sf-select{width:100%;height:36px;padding:0 8px;border:1px solid rgba(128,128,128,.55);border-radius:4px;background:transparent;color:inherit;font:inherit}.sf-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:14px}.sf-button{min-height:36px;padding:7px 10px;border:1px solid rgba(128,128,128,.65);border-radius:4px;background:transparent;color:inherit;font:inherit;cursor:pointer}.sf-button--primary{background:ButtonFace;font-weight:600}.sf-button:disabled{cursor:wait;opacity:.62}.sf-status{min-height:20px;margin:10px 0 0;font-size:13px;color:inherit;opacity:.78}.sf-preview{width:100%;margin-top:10px;padding:0;border:0;background:transparent;color:inherit;text-align:left;font:inherit;font-size:13px;cursor:pointer}.sf-code{height:180px;overflow:auto;margin:8px 0 0;padding:10px;border:1px solid rgba(128,128,128,.45);border-radius:4px;background:rgba(128,128,128,.08);color:inherit;font:12px/1.45 ui-monospace,SFMono-Regular,Menlo,monospace;white-space:pre-wrap;word-break:break-word}.sf-code[hidden]{display:none}@media(max-width:480px){.sf-panel{right:12px;top:56px;width:calc(100vw - 24px);max-height:calc(100vh - 68px)}.sf-fallback{right:12px;bottom:12px}}
    `;
    document.head.appendChild(style);
  }

  function setStatus(message) {
    panel.querySelector('.sf-status').textContent = message || '';
  }

  function setLoading(loading) {
    panel.querySelectorAll('.sf-button, .sf-select').forEach((element) => {
      element.disabled = loading;
    });
  }

  function currentClient() {
    return panel.querySelector('.sf-select').value;
  }

  function selectedContent() {
    syncCacheSession(getAccessToken());
    return configCache.get(currentClient()) || '';
  }

  function updatePreview() {
    const code = panel.querySelector('.sf-code');
    const toggle = panel.querySelector('.sf-preview');
    code.textContent = selectedContent();
    toggle.textContent = code.hidden ? '预览配置' : '收起预览';
  }

  function isPanelActionCurrent(operationEpoch) {
    return panel && !panel.hidden && panelEpoch === operationEpoch;
  }

  async function requestConfig(client) {
    const token = getAccessToken();
    syncCacheSession(token);
    if (!token) throw userError('请先登录后再试');
    if (configCache.has(client)) return configCache.get(client);
    if (pendingRequests.has(client)) return pendingRequests.get(client);

    const request = (async () => {
      const response = await window.fetch(API_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          Accept: 'text/plain, application/octet-stream',
        },
        body: JSON.stringify({ client }),
      });
      if (cacheToken !== token || getAccessToken() !== token) {
        syncCacheSession(getAccessToken());
        throw staleRequest();
      }
      if (response.status === 401 || response.status === 403) throw userError('登录已失效，请重新登录');
      if (response.status === 404 || response.status === 422) throw userError('暂无可用订阅');
      if (!response.ok) throw userError('配置获取失败，请稍后重试');
      const content = await response.text();
      if (!content) throw userError('暂无可用订阅');
      if (cacheToken !== token || getAccessToken() !== token) {
        syncCacheSession(getAccessToken());
        throw staleRequest();
      }
      configCache.set(client, content);
      return content;
    })();
    pendingRequests.set(client, request);
    try {
      return await request;
    } finally {
      if (pendingRequests.get(client) === request) pendingRequests.delete(client);
    }
  }

  function downloadConfig(content, client) {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    const objectUrl = URL.createObjectURL(blob);
    link.href = objectUrl;
    link.download = CLIENTS[client].filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
  }

  function copyWithExecCommand(content) {
    const textarea = document.createElement('textarea');
    textarea.value = content;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const copied = document.execCommand('copy');
    textarea.remove();
    if (!copied) throw userError('复制失败，请手动复制预览内容');
  }

  async function copyConfig(content) {
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(content);
        return;
      } catch (_) {
        // Some browsers expose the API but deny it for the current page.
      }
    }
    copyWithExecCommand(content);
  }

  async function runAction(action) {
    syncCacheSession(getAccessToken());
    const operationEpoch = panelEpoch;
    setLoading(true);
    setStatus('正在获取配置…');
    try {
      const client = currentClient();
      const content = await requestConfig(client);
      if (!isPanelActionCurrent(operationEpoch)) return;
      if (action === 'download') {
        downloadConfig(content, client);
        setStatus('配置已开始下载');
      } else if (action === 'copy') {
        await copyConfig(content);
        if (!isPanelActionCurrent(operationEpoch)) return;
        setStatus('配置已复制');
      } else {
        const code = panel.querySelector('.sf-code');
        code.hidden = false;
        updatePreview();
        setStatus('配置已就绪');
      }
    } catch (error) {
      if (!isPanelActionCurrent(operationEpoch) || (error && error.isSubFetcherStaleRequest)) return;
      setStatus(error && error.isSubFetcherUserError ? error.message : '操作失败，请稍后重试');
    } finally {
      if (isPanelActionCurrent(operationEpoch)) setLoading(false);
    }
  }

  function closePanel() {
    if (!panel) return;
    invalidatePanelActions();
    const code = panel.querySelector('.sf-code');
    code.textContent = '';
    code.hidden = true;
    panel.querySelector('.sf-preview').textContent = '预览配置';
    setStatus('');
    panel.hidden = true;
  }

  function buildPanel() {
    panel = document.createElement('section');
    panel.className = 'sf-panel';
    panel.hidden = true;
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', '安全下载');
    panel.innerHTML = `
      <div class="sf-head"><strong class="sf-title">安全下载</strong><button class="sf-close" type="button" aria-label="关闭">×</button></div>
      <label class="sf-label" for="sf-client">客户端</label>
      <select class="sf-select" id="sf-client">
        <option value="clash">Clash</option><option value="v2ray">v2rayN</option><option value="singbox">sing-box</option><option value="surge">Surge</option>
      </select>
      <div class="sf-actions"><button class="sf-button sf-button--primary" type="button" data-sf-action="download">下载配置</button><button class="sf-button" type="button" data-sf-action="copy">复制配置</button></div>
      <p class="sf-status" aria-live="polite"></p><button class="sf-preview" type="button">预览配置</button><pre class="sf-code" hidden></pre>
    `;
    panel.querySelector('.sf-select').value = savedClient();
    panel.querySelector('.sf-close').addEventListener('click', closePanel);
    panel.querySelector('.sf-select').addEventListener('change', (event) => {
      persistClient(event.target.value);
      panel.querySelector('.sf-code').hidden = true;
      setStatus('');
      updatePreview();
    });
    panel.querySelectorAll('[data-sf-action]').forEach((button) => {
      button.addEventListener('click', () => runAction(button.dataset.sfAction));
    });
    panel.querySelector('.sf-preview').addEventListener('click', () => {
      const code = panel.querySelector('.sf-code');
      if (!code.hidden) {
        code.hidden = true;
        updatePreview();
        return;
      }
      runAction('preview');
    });
    document.body.appendChild(panel);
  }

  function openPanel(trigger) {
    if (!panel) buildPanel();
    syncCacheSession(getAccessToken());
    panel.hidden = false;
    panel.querySelector('.sf-select').focus();
    if (trigger && trigger.hasAttribute(FALLBACK_MARKER)) trigger.blur();
  }

  function start() {
    injectStyles();
    tryInjection();
    const observer = new MutationObserver(() => {
      window.clearTimeout(retryTimer);
      retryTimer = window.setTimeout(tryInjection, 80);
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') closePanel();
    });
    document.addEventListener('pointerdown', (event) => {
      if (!panel || panel.hidden || panel.contains(event.target) || event.target.closest(`[${ACTION_MARKER}], [${FALLBACK_MARKER}]`)) return;
      closePanel();
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
