// src/app/zinc-preset.ts
import { definePreset } from '@primeuix/themes';
import Aura from '@primeuix/themes/aura'; // Используйте ваш текущий базовый пресет
import { colorScheme } from '@primeuix/themes/aura/autocomplete';

const ZincPreset = definePreset(Aura, {
  semantic: {
    primary: {
      50: '#FBFBFC',
      100: '#F7F7F8',
      200: '#EAEBEB',
      300: '#D7D8DA',
      400: '#AFB2B7',
      500: '#878C95',
      600: '#646973',
      700: '#43464C',
      800: '#34363B',
      900: '#26272B',
      950: '#17181A'
    },
    colorScheme: {
        light: {
            primary: {
                color: '{zinc.950}',
                inverseColor: '#ffffff',
                hoverColor: '{zinc.900}',
                activeColor: '{zinc.800}'
            },
            highlight: {
                background: '{zinc.950}',
                focusBackground: '{zinc.700}',
                color: '#ffffff',
                focusColor: '#ffffff'
            }
        },
        dark: {
            primary: {
                color: '{zinc.50}',
                inverseColor: '{zinc.950}',
                hoverColor: '{zinc.300}',
                activeColor: '{zinc.200}'
            },
            highlight: {
                background: 'rgba(250, 250, 250, .16)',
                focusBackground: 'rgba(250, 250, 250, .24)',
                color: 'rgba(255,255,255,.87)',
                focusColor: 'rgba(255,255,255,.87)'
            }
        }
    }
}
});

export default ZincPreset;