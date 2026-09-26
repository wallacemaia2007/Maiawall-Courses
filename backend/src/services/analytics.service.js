const { BetaAnalyticsDataClient } = require('@google-analytics/data');

const { env } = require('../config/env');

const CACHE_TTL_MS = 5 * 60 * 1000;

let client;
let cache = null; // { expiresAt, data }

function isConfigured() {
  return Boolean(env.ga4PropertyId);
}

/*
 * Cria o client sob demanda (evita custo de inicializacao quando o GA4 nao
 * esta configurado). Sem GA4_SERVICE_ACCOUNT, o client usa Application
 * Default Credentials (ex.: GOOGLE_APPLICATION_CREDENTIALS, ja usado pelo
 * Firebase Admin, desde que a mesma service account tenha acesso de leitor
 * na propriedade GA4).
 */
function getClient() {
  if (client) return client;

  const options = {};
  if (env.ga4ServiceAccountJson) {
    options.credentials = JSON.parse(env.ga4ServiceAccountJson);
  }

  client = new BetaAnalyticsDataClient(options);
  return client;
}

function emptyOverview(error = null) {
  return {
    configured: isConfigured(),
    error,
    activeUsersNow: null,
    sessionsLast30Days: null,
    usersLast30Days: null,
    sessionsTrend: [],
    topSources: [],
    topPages: [],
  };
}

function toInt(value) {
  const number = Number.parseInt(value, 10);
  return Number.isNaN(number) ? 0 : number;
}

/* GA4 devolve a dimensao "date" como YYYYMMDD. */
function toIsoDate(value) {
  const text = String(value || '');
  if (!/^\d{8}$/.test(text)) return text;
  return `${text.slice(0, 4)}-${text.slice(4, 6)}-${text.slice(6, 8)}`;
}

function rowsOf(report) {
  return report?.rows || [];
}

async function fetchOverview() {
  const property = `properties/${env.ga4PropertyId}`;
  const analyticsClient = getClient();

  const [[realtimeReport], [trendReport], [totalsReport], [sourcesReport], [pagesReport]] =
    await Promise.all([
      analyticsClient.runRealtimeReport({
        property,
        metrics: [{ name: 'activeUsers' }],
      }),
      analyticsClient.runReport({
        property,
        dateRanges: [{ startDate: '13daysAgo', endDate: 'today' }],
        dimensions: [{ name: 'date' }],
        metrics: [{ name: 'sessions' }],
        orderBys: [{ dimension: { dimensionName: 'date' } }],
      }),
      analyticsClient.runReport({
        property,
        dateRanges: [{ startDate: '29daysAgo', endDate: 'today' }],
        metrics: [{ name: 'sessions' }, { name: 'totalUsers' }],
      }),
      analyticsClient.runReport({
        property,
        dateRanges: [{ startDate: '29daysAgo', endDate: 'today' }],
        dimensions: [{ name: 'sessionSource' }, { name: 'sessionMedium' }],
        metrics: [{ name: 'sessions' }],
        orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
        limit: 6,
      }),
      analyticsClient.runReport({
        property,
        dateRanges: [{ startDate: '29daysAgo', endDate: 'today' }],
        dimensions: [{ name: 'pagePath' }],
        metrics: [{ name: 'screenPageViews' }],
        orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
        limit: 6,
      }),
    ]);

  const totalsRow = rowsOf(totalsReport)[0];

  return {
    configured: true,
    error: null,
    activeUsersNow: toInt(rowsOf(realtimeReport)[0]?.metricValues?.[0]?.value),
    sessionsLast30Days: toInt(totalsRow?.metricValues?.[0]?.value),
    usersLast30Days: toInt(totalsRow?.metricValues?.[1]?.value),
    sessionsTrend: rowsOf(trendReport).map((row) => ({
      date: toIsoDate(row.dimensionValues?.[0]?.value),
      sessions: toInt(row.metricValues?.[0]?.value),
    })),
    topSources: rowsOf(sourcesReport).map((row) => ({
      source: row.dimensionValues?.[0]?.value || '(direto)',
      medium: row.dimensionValues?.[1]?.value || '(none)',
      sessions: toInt(row.metricValues?.[0]?.value),
    })),
    topPages: rowsOf(pagesReport).map((row) => ({
      path: row.dimensionValues?.[0]?.value || '/',
      views: toInt(row.metricValues?.[0]?.value),
    })),
  };
}

/*
 * Visao geral do GA4 para o painel admin. Sem GA4_PROPERTY_ID, devolve
 * "configured: false" sem chamar a API. Se a chamada falhar (credenciais
 * invalidas, propriedade errada etc.), devolve "configured: true" com
 * "error" preenchido, sem derrubar o dashboard.
 */
async function getAnalyticsOverview() {
  if (!isConfigured()) {
    return emptyOverview();
  }

  const now = Date.now();
  if (cache && cache.expiresAt > now) {
    return cache.data;
  }

  try {
    const data = await fetchOverview();
    cache = { data, expiresAt: now + CACHE_TTL_MS };
    return data;
  } catch (error) {
    return emptyOverview(error.message || 'Nao foi possivel consultar o Google Analytics');
  }
}

module.exports = {
  getAnalyticsOverview,
  isConfigured,
};
