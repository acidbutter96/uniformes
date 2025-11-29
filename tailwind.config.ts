import type { Config } from 'tailwindcss';
import defaultTheme from 'tailwindcss/defaultTheme';
import plugin from 'tailwindcss/plugin';

const config: Config = {
    content: [
        './app/**/*.{js,ts,jsx,tsx,mdx}',
        './components/**/*.{js,ts,jsx,tsx,mdx}',
        './lib/**/*.{js,ts,jsx,tsx,mdx}',
        './data/**/*.{js,ts,jsx,tsx,mdx}',
    ],
    theme: {
        extend: {
            colors: {
                primary: '#496276',
                accent: '#FFB48A',
                success: '#04D361',
                text: {
                    DEFAULT: '#1F232A',
                    muted: '#5F6670',
                },
                background: '#EEE9E5',
                surface: '#FFFFFF',
                border: '#D9D5D2',
            },
            fontFamily: {
                sans: ['var(--font-inter)', ...defaultTheme.fontFamily.sans],
                heading: ['var(--font-inter)', ...defaultTheme.fontFamily.sans],
            },
            fontSize: {
                h1: ['2rem', { lineHeight: '2.5rem', fontWeight: '700' }],
                h2: ['1.5rem', { lineHeight: '2rem', fontWeight: '600' }],
                h3: ['1.25rem', { lineHeight: '1.75rem', fontWeight: '600' }],
                body: ['1rem', { lineHeight: '1.6rem', fontWeight: '400' }],
                caption: ['0.75rem', { lineHeight: '1rem', fontWeight: '500' }],
            },
            spacing: {
                xs: '0.25rem', // 4px
                sm: '0.5rem', // 8px
                md: '1rem', // 16px
                lg: '1.5rem', // 24px
                xl: '2rem', // 32px
                '2xl': '3rem', // 48px
            },
            borderRadius: {
                card: '12px',
            },
            boxShadow: {
                light: '0 10px 24px -12px rgba(20, 22, 40, 0.15)',
                card: '0 18px 36px -16px rgba(20, 22, 40, 0.18)',
            },
        },
    },
    plugins: [
        plugin(({ addComponents, theme }) => {
            addComponents({
                '.card': {
                    borderRadius: theme('borderRadius.card'),
                    backgroundColor: theme('colors.surface'),
                    boxShadow: theme('boxShadow.card'),
                    border: `1px solid ${theme('colors.border')}`,
                    padding: theme('spacing.lg'),
                },
                '.shadow-soft': {
                    boxShadow: theme('boxShadow.light'),
                },
                '.rounded-card': {
                    borderRadius: theme('borderRadius.card'),
                },
            });
        }),
    ],
};

export default config;
