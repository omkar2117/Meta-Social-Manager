const GA_MEASUREMENT_ID =
  import.meta.env.VITE_GA_MEASUREMENT_ID?.trim() ||
  (import.meta.env.PROD ? 'G-54YTVL26MW' : '');

function isGa4Id(id: string): boolean {
  return /^G-[A-Z0-9]+$/.test(id);
}

/**
 * Loads official gtag.js once. Default `gtag('config')` sends a page_view
 * (including UTM query params) and stays compatible with GA4 Enhanced Measurement.
 */
export function initGoogleAnalytics(): void {
  if (!isGa4Id(GA_MEASUREMENT_ID) || typeof window.gtag === 'function') {
    return;
  }

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer || [];
  const gtag = (...args: unknown[]) => {
    window.dataLayer!.push(args);
  };
  window.gtag = gtag;

  gtag('js', new Date());
  gtag('config', GA_MEASUREMENT_ID);
}
