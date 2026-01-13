import { test, expect } from '@playwright/test';
import { shouldTrack404 } from '../scripts/404-tracking';

test.describe('404 tracking filter', () => {
  test('tracks a real-looking internal 404', () => {
    expect(
      shouldTrack404({
        htext: 'Page not found',
        pageUrl: 'https://docs.clevertap.com/docs/some-missing-page',
        referrer: 'https://docs.clevertap.com/docs/some-page',
        userAgent:
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        webdriver: false,
        allowedPageHosts: ['docs.clevertap.com'],
        allowedReferrerHosts: ['docs.clevertap.com'],
      })
    ).toBe(true);
  });

  test('does not track when not actually on the 404 page', () => {
    expect(
      shouldTrack404({
        htext: 'Not a 404',
        pageUrl: 'https://docs.clevertap.com/docs/x',
        referrer: 'https://docs.clevertap.com/docs/y',
        userAgent: 'Mozilla/5.0',
      })
    ).toBe(false);
  });

  test('does not track when referrer is missing', () => {
    expect(
      shouldTrack404({
        htext: 'Page not found',
        pageUrl: 'https://docs.clevertap.com/docs/x',
        referrer: '',
        userAgent: 'Mozilla/5.0',
      })
    ).toBe(false);
  });

  test('does not track obvious bots/crawlers', () => {
    expect(
      shouldTrack404({
        htext: 'Page not found',
        pageUrl: 'https://docs.clevertap.com/docs/x',
        referrer: 'https://docs.clevertap.com/docs/y',
        userAgent: 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
      })
    ).toBe(false);
  });

  test('does not track when the event happens on a non-allowed host (e.g. developer docs)', () => {
    expect(
      shouldTrack404({
        htext: 'Page not found',
        pageUrl: 'https://developer.clevertap.com/docs/sinch',
        referrer: 'https://developer.clevertap.com/docs/whatever',
        userAgent: 'Mozilla/5.0',
        allowedPageHosts: ['docs.clevertap.com'],
        allowedReferrerHosts: ['docs.clevertap.com'],
      })
    ).toBe(false);
  });

  test('does not track when referrer host is not in allowlist', () => {
    expect(
      shouldTrack404({
        htext: 'Page not found',
        pageUrl: 'https://docs.clevertap.com/docs/x',
        referrer: 'https://example.com/somewhere',
        userAgent: 'Mozilla/5.0',
        allowedPageHosts: ['docs.clevertap.com'],
        allowedReferrerHosts: ['docs.clevertap.com'],
      })
    ).toBe(false);
  });
});

