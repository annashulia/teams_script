export type Track404Input = {
  /** The text content of the 404 page marker element (e.g. Htext). */
  htext?: string | null;
  /** Current page URL. */
  pageUrl: string;
  /** document.referrer */
  referrer?: string | null;
  /** navigator.userAgent */
  userAgent?: string | null;
  /** navigator.webdriver */
  webdriver?: boolean | null;
  /**
   * Only log 404s when the referrer host matches one of these.
   * If omitted/empty, defaults to requiring same-host referrer.
   */
  allowedReferrerHosts?: readonly string[];
  /** If provided, only log when page host matches one of these. */
  allowedPageHosts?: readonly string[];
};

const DEFAULT_BOT_UA_RE =
  // Broad but conservative: prioritize obvious bots/crawlers + common HTTP clients.
  /(bot|crawler|spider|crawl|slurp|bingpreview|facebookexternalhit|discordbot|slackbot|twitterbot|linkedinbot|whatsapp|telegrambot|embedly|quora link preview|pinterest|uptime|statuscake|datadog|newrelic|lighthouse|pagespeed|gtmetrix|curl|wget|python|aiohttp|axios|okhttp|java|go-http-client)/i;

function safeHost(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
}

function normalizeHosts(hosts: readonly string[] | undefined): string[] {
  return (hosts ?? [])
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);
}

export function isLikelyBot(userAgent?: string | null, webdriver?: boolean | null): boolean {
  if (webdriver === true) return true;
  if (!userAgent) return false;
  return DEFAULT_BOT_UA_RE.test(userAgent);
}

export function shouldTrack404(input: Track404Input): boolean {
  // 1) Must be on a 404 page
  if ((input.htext ?? '').trim() !== 'Page not found') return false;

  // 2) Filter obvious automation/bots
  if (isLikelyBot(input.userAgent, input.webdriver)) return false;

  // 3) Require a referrer; most real broken internal navigation has one.
  const referrer = (input.referrer ?? '').trim();
  if (!referrer) return false;

  const pageHost = safeHost(input.pageUrl);
  const referrerHost = safeHost(referrer);
  if (!pageHost || !referrerHost) return false;

  // 4) Optionally restrict which *site* we track on
  const allowedPageHosts = normalizeHosts(input.allowedPageHosts);
  if (allowedPageHosts.length > 0 && !allowedPageHosts.includes(pageHost)) return false;

  // 5) Only count internal navigation (or an explicit allowlist).
  const allowedReferrerHosts = normalizeHosts(input.allowedReferrerHosts);
  if (allowedReferrerHosts.length > 0) {
    return allowedReferrerHosts.includes(referrerHost);
  }

  return referrerHost === pageHost;
}

