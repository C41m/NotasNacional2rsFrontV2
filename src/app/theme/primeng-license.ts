/**
 * Chave de licença PrimeUI (Community).
 *
 * ── Como obter ────────────────────────────────────────────────────
 * 1. Registre-se em https://primeui.dev/licenses/community
 * 2. Confirme a elegibilidade (receita < US$ 1M/ano, < 5 devs,
 *    < 10 funcionários, < US$ 3M de funding externo)
 * 3. Copie a chave gerada e cole em PRIMENG_LICENSE_KEY abaixo
 *
 * ── Por que um arquivo só ────────────────────────────────────────
 * A verificação é offline e sem telemetria (ver @primeui/license-manager).
 * A chave é um token público assinado em Ed25519: pode ficar no bundle
 * sem risco, e a própria licença Community permite. Ainda assim, fica
 * isolada aqui para facilitar rotação anual (a Community exige
 * reconfirmação de elegibilidade a cada 12 meses) e para o diff do
 * git mostrar só uma linha quando você trocar.
 *
 * ── Enquanto for vazio ───────────────────────────────────────────
 * O PrimeNG exibe a tarja vermelha "Invalid PrimeUI License" no canto
 * inferior direito. A aplicação funciona normalmente — a tarja é aviso,
 * não bloqueio (o próprio código do PrimeTek chama de
 * "anti-honest-user signaling"). Nada trava por causa dela.
 */
export const PRIMENG_LICENSE_KEY = 'eyJpZCI6ImY0MWIxYzM4LTY1NmYtNDdhNy04YjcyLWU4NzA2YzYyNDdjYyIsInByb2R1Y3QiOiJwcmltZXVpIiwidGllciI6ImNvbW11bml0eSIsInR5cGUiOiJkZXYiLCJpYXQiOjE3OTIxNDU0ODksImV4cCI6MTgyMzY4MTQ4OX0.vg09d8c9vKQ_WPq1AeMsXZAmogMnuLlCZX71EbYUejGZ1nV5L8PbWhC6teh5SlhoiUfsPjfdsI6usSLoiRcaBw';

/** Só envia `license` ao providePrimeNG se a chave estiver preenchida. */
export const primengLicense = PRIMENG_LICENSE_KEY.trim() || undefined;
