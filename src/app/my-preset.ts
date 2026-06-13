import { definePreset } from '@primeuix/themes';
import Aura from '@primeuix/themes/aura'; // Используйте ваш текущий базовый пресет
import { colorScheme } from '@primeuix/themes/aura/autocomplete';

const ZincPreset = definePreset(Aura, {
  semantic: {
    primary: {
      50:  '#FFF4EB',
      100: '#FFE6D1',
      200: '#FFCBA3',
      300: '#FFAD70',
      400: '#FF933D',
      500: '#FF7A00',
      600: '#E06B00',
      700: '#B85700',
      800: '#8F4400',
      900: '#6B3300',
      950: '#401F00'
    },
    colorScheme: {
        light: {
            primary: {
                color: '{primary.500}',
                inverseColor: '#0a0a0a',
                hoverColor: '{primary.600}',
                activeColor: '{primary.700}'
            },
            highlight: {
                background: '{primary.500}',
                focusBackground: '{primary.600}',
                color: '#0a0a0a',
                focusColor: '#0a0a0a'
            }
        },
        dark: {
            primary: {
                color: '{primary.500}',
                inverseColor: '#0a0a0a',
                hoverColor: '{primary.400}',
                activeColor: '{primary.300}'
            },
            highlight: {
                background: 'rgba(255, 122, 0, .18)',
                focusBackground: 'rgba(255, 122, 0, .26)',
                color: '{primary.400}',
                focusColor: '{primary.300}'
            }
        }
    }
}
});

export default ZincPreset;