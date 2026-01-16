const BLOCKLIST_KEY = "blocklist";
const ALLOWLIST_KEY = "allowlist";
const TEMP_ACCESS_MS = 60 * 1000;

const normalizeSubdomain = (value) => value.trim().toLowerCase();

const getState = () =>
  chrome.storage.local.get({
    [BLOCKLIST_KEY]: [],
    [ALLOWLIST_KEY]: []
  });

const setState = (data) => chrome.storage.local.set(data);

const cleanupAllowlist = async () => {
  const { allowlist } = await getState();
  const now = Date.now();
  const filtered = allowlist.filter((entry) => !entry.expiresAt || entry.expiresAt > now);
  if (filtered.length !== allowlist.length) {
    await setState({ [ALLOWLIST_KEY]: filtered });
  }
  return filtered;
};

const matchesSubdomain = (hostname, subdomain) => {
  if (!hostname || !subdomain) return false;
  return hostname === subdomain || hostname.endsWith(`.${subdomain}`);
};

const isAllowedUrl = (url, allowlist) => {
  if (!url) return false;
  let hostname = "";
  try {
    hostname = new URL(url).hostname.toLowerCase();
  } catch (error) {
    return false;
  }

  return allowlist.some((item) => {
    if (item.url && item.url === url) return true;
    if (item.subdomain) return matchesSubdomain(hostname, item.subdomain);
    return false;
  });
};

const isBlockedUrl = (url, blocklist) => {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();
    return blocklist.some((entry) => matchesSubdomain(hostname, entry.subdomain));
  } catch (error) {
    return false;
  }
};

const shouldIgnoreUrl = (url) => {
  if (!url) return true;
  if (url.startsWith("chrome-extension://")) return true;
  if (url.startsWith("chrome://")) return true;
  return false;
};

const redirectToBlocked = async (tabId, url) => {
  const blockedUrl = chrome.runtime.getURL(`blocked.html?url=${encodeURIComponent(url)}`);
  await chrome.tabs.update(tabId, { url: blockedUrl });
};

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status !== "loading") return;
  const url = tab.url;
  if (shouldIgnoreUrl(url)) return;

  const state = await getState();
  const allowlist = await cleanupAllowlist();
  if (isAllowedUrl(url, allowlist)) return;

  if (isBlockedUrl(url, state.blocklist)) {
    await redirectToBlocked(tabId, url);
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || !message.type) return;

  if (message.type === "grantTempAccess") {
    let hostname = "";
    try {
      hostname = new URL(message.url).hostname.toLowerCase();
    } catch (error) {
      sendResponse({ ok: false });
      return false;
    }

    const entry = {
      subdomain: hostname,
      type: "temp",
      expiresAt: Date.now() + TEMP_ACCESS_MS
    };
    getState().then(({ allowlist }) => {
      const updated = allowlist.filter((item) => item.subdomain !== entry.subdomain);
      updated.push(entry);
      setState({ [ALLOWLIST_KEY]: updated }).then(() => sendResponse({ ok: true }));
    });
    return true;
  }

  if (message.type === "grantBypassAccess") {
    const entry = {
      url: message.url,
      type: "bypass"
    };
    getState().then(({ allowlist }) => {
      const updated = allowlist.filter((item) => item.url !== entry.url);
      updated.push(entry);
      setState({ [ALLOWLIST_KEY]: updated }).then(() => sendResponse({ ok: true }));
    });
    return true;
  }
});
