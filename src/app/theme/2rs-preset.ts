/**
 * 2RS Notas — Preset de tema PrimeNG (Aura + identidade visual 2RS)
 *
 * Substitui o CSS hand-rolled de 1.279 linhas por tokens declarativos.
 * A identidade (fundo escuro + acento teal/neon) vive aqui, não em CSS.
 *
 * Referência de tokens: https://primeuix.org/primeng/docs/theming/definepreset
 */
import { definePreset } from '@primeuix/themes';
import Aura from '@primeuix/themes/aura';

/** Rampa teal da marca 2RS (equivalente ao antigo --color-teal / --color-neon). */
const TwoRSTeal = {
  50: '{teal.50}',
  100: '{teal.100}',
  200: '{teal.200}',
  300: '{teal.300}',
  400: '{teal.400}',
  500: '{teal.500}',
  600: '{teal.600}',
  700: '{teal.700}',
  800: '{teal.800}',
  900: '{teal.900}',
  950: '{teal.950}'
};

export const TwoRSPreset = definePreset(Aura, {
  semantic: {
    primary: TwoRSTeal,
    colorScheme: {
      dark: {
        primary: {
          color: '{teal.400}',
          contrastColor: '{gray.950}',
          hoverColor: '{teal.300}',
          activeColor: '{teal.200}'
        },
        highlight: {
          background: 'rgba(20, 255, 236, 0.16)',
          focusBackground: 'rgba(20, 255, 236, 0.24)',
          color: '{teal.50}',
          focusColor: '{teal.50}'
        }
      }
    }
  },
  components: {
    // Botões: uppercase + tracking, como no design original.
    // No v22 o `css` é aceito apenas no nível do componente (uma vez),
    // então as customizações de cabeçalho de tabela vão junto.
    button: {
      css: () => `
        .p-button:not(.p-button-text):not(.p-button-outlined) {
          letter-spacing: 0.06em;
          font-weight: 600;
        }
      `
    },
    // Tabelas: cabeçalho compacto e maiúsculo
    datatable: {
      header: {
        background: 'transparent',
        borderColor: '{surface.700}',
        color: '{surface.400}',
        padding: '0.75rem 1rem'
      },
      headerCell: {
        padding: '0.75rem 1rem'
      },
      bodyCell: {
        padding: '0.75rem 1rem'
      },
      css: () => `
        .p-datatable-thead > tr > th {
          font-size: 0.7rem;
          letter-spacing: 0.06em;
          font-weight: 700;
        }
      `
    },
    // Cards e superfícies
    card: {
      body: { padding: '1.5rem' }
    },
    // Toast: largura confortável para as mensagens da API
    toast: {
      root: { width: '22rem' }
    }
  }
});

export default TwoRSPreset;
