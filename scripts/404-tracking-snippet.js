(function () {
  // Footer snippet: runs after the page loads.
  var id404 = document.getElementById('Htext');
  if (!id404 || (id404.textContent || '').trim() !== 'Page not found') return;

  // --- Filters to avoid bot/crawler noise ---
  var ua = (navigator && navigator.userAgent) || '';
  var isBot =
    (navigator && navigator.webdriver === true) ||
    /(bot|crawler|spider|crawl|slurp|bingpreview|facebookexternalhit|discordbot|slackbot|twitterbot|linkedinbot|whatsapp|telegrambot|embedly|quora link preview|pinterest|uptime|statuscake|datadog|newrelic|lighthouse|pagespeed|gtmetrix|curl|wget|python|aiohttp|axios|okhttp|java|go-http-client)/i.test(
      ua
    );
  if (isBot) return;

  // Require a referrer, and restrict it to your own docs host(s)
  var ref = (document.referrer || '').trim();
  if (!ref) return;

  var pageHost, refHost;
  try {
    pageHost = new URL(document.URL).hostname.toLowerCase();
    refHost = new URL(ref).hostname.toLowerCase();
  } catch (e) {
    return;
  }

  // Set these to the domains you consider "internal docs navigation".
  // If you ONLY want User Docs 404s, keep just 'docs.clevertap.com'.
  var ALLOWED_PAGE_HOSTS = ['docs.clevertap.com'];
  var ALLOWED_REFERRER_HOSTS = ['docs.clevertap.com'];

  if (ALLOWED_PAGE_HOSTS.length && ALLOWED_PAGE_HOSTS.indexOf(pageHost) === -1) return;
  if (ALLOWED_REFERRER_HOSTS.length && ALLOWED_REFERRER_HOSTS.indexOf(refHost) === -1) return;

  // --- Send event (guarded so it never throws) ---
  if (
    window.clevertap &&
    window.clevertap.event &&
    window.clevertap.event.push &&
    typeof window.clevertap.event.push === 'function'
  ) {
    window.clevertap.event.push('404Page', {
      pageUrl: String(document.URL),
      docRef: String(document.referrer || ''),
      website: 'User docs',
    });
  }
})();

