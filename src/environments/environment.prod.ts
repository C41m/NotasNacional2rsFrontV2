export const environment = {
  production: true,
  /**
   * Produção: o mesmo origin do frontend, com rewrite `/api/(.*)` no proxy
   * (Vercel → Render, ver frontend/vercel.json). O ApiService também aceita
   * uma URL absoluta via `window.__APP_CONFIG__.apiUrl` em runtime.
   */
  apiUrl: '/api'
};
