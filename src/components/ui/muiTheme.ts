import { createTheme } from '@mui/material';

/**
 * MUI theme for the admin panel (and any MUI component on member pages).
 * Static palette values mirror the default --ui-* tokens and are only used by MUI
 * internals (ripples, focus colours); every visible surface, border, radius and
 * font is styled through the --ui-* CSS variables so Design Studio changes apply.
 */
export function buildMuiTheme(mode: 'light' | 'dark', dir: 'rtl' | 'ltr') {
  const dark = mode === 'dark';
  const v = (name: string) => `var(--ui-${name})`;

  return createTheme({
    direction: dir,
    breakpoints: { values: { xs: 0, sm: 480, md: 768, lg: 1024, xl: 1440 } },
    palette: {
      mode,
      primary: { main: dark ? '#d8b26a' : '#9c7432', contrastText: '#1a1408' },
      secondary: { main: '#a97f3a', contrastText: '#ffffff' },
      success: { main: dark ? '#3ecf8e' : '#138a57' },
      error: { main: dark ? '#f26d6d' : '#c93a3a' },
      warning: { main: '#e0a64b' },
      info: { main: dark ? '#8fa2ff' : '#4659c8' },
      background: { default: dark ? '#08090c' : '#f5f3ee', paper: dark ? '#12141a' : '#ffffff' },
      text: { primary: dark ? '#f3efe6' : '#16140f', secondary: dark ? '#a8a49b' : '#6b675f' },
      divider: dark ? 'rgba(255,255,255,0.08)' : 'rgba(20,18,12,0.08)'
    },
    shape: { borderRadius: 12 },
    typography: {
      fontFamily: v('font-body'),
      fontSize: 13.5,
      fontWeightRegular: 400,
      fontWeightMedium: 500,
      fontWeightBold: 600,
      // Sizes follow the Design Studio font-size tokens (admin pages mostly use h4–h6).
      h1: { fontFamily: v('font-display'), fontWeight: 600, fontSize: `min(${v('fs-h1')}, 44px)`, lineHeight: 1.2 },
      h2: { fontFamily: v('font-display'), fontWeight: 600, fontSize: v('fs-h2'), lineHeight: 1.25 },
      h3: { fontFamily: v('font-display'), fontWeight: 600, fontSize: `calc(${v('fs-h2')} * 0.85)`, lineHeight: 1.3 },
      h4: { fontFamily: v('font-display'), fontWeight: 600, fontSize: `calc(${v('fs-h3')} * 1.25)`, lineHeight: 1.3 },
      h5: { fontFamily: v('font-display'), fontWeight: 600, fontSize: `calc(${v('fs-card-title')} * 1.15)`, lineHeight: 1.35 },
      h6: { fontFamily: v('font-display'), fontWeight: 600, fontSize: v('fs-card-title'), lineHeight: 1.4 },
      body1: { fontSize: `calc(${v('fs-body')} - 0.5px)`, lineHeight: v('line-height') },
      body2: { fontSize: `calc(${v('fs-body')} - 2px)` },
      caption: { fontSize: v('fs-caption') },
      button: { textTransform: 'none', fontWeight: 600 }
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: { backgroundColor: v('bg'), color: v('text') }
        }
      },
      MuiPaper: {
        styleOverrides: {
          root: { backgroundImage: 'none', backgroundColor: v('surface'), color: v('text') },
          outlined: { borderColor: v('line') }
        }
      },
      MuiCard: {
        defaultProps: { elevation: 0 },
        styleOverrides: {
          root: {
            borderRadius: v('radius-lg'),
            border: `1px solid ${v('line')}`,
            boxShadow: v('shadow-sm'),
            opacity: v('card-opacity')
          }
        }
      },
      MuiCardContent: { styleOverrides: { root: { padding: 22, '&:last-child': { paddingBottom: 22 } } } },
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: {
          root: {
            borderRadius: v('radius-btn'),
            fontFamily: v('font-button'),
            fontWeight: v('weight-button') as unknown as number,
            fontStyle: v('style-button'),
            fontSize: v('fs-button'),
            paddingInline: v('btn-px'),
            minHeight: 40,
            opacity: v('button-opacity'),
            transition: 'transform .2s cubic-bezier(.22,1,.36,1), background-color .2s, border-color .2s, filter .2s',
            '&:active': { transform: 'scale(.98)' }
          },
          sizeSmall: { minHeight: 34, paddingInline: `calc(${v('btn-px')} * .6)` },
          containedPrimary: {
            background: v('gold-grad'),
            color: v('gold-ink'),
            boxShadow: v('btn-shadow'),
            '&:hover': { background: v('gold-grad'), filter: 'brightness(1.05)', boxShadow: v('btn-shadow') }
          },
          outlined: {
            borderColor: v('line-strong'),
            color: v('text'),
            '&:hover': { borderColor: v('gold-line'), backgroundColor: v('surface-2') }
          },
          outlinedError: { color: v('danger'), borderColor: `color-mix(in srgb, ${v('danger')} 40%, transparent)` },
          text: { color: v('text-2'), '&:hover': { backgroundColor: v('surface-2') } },
          textPrimary: { color: v('gold') }
        }
      },
      MuiIconButton: {
        styleOverrides: { root: { borderRadius: 10, color: v('text-2'), '&:hover': { backgroundColor: v('surface-2'), color: v('text') } } }
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: v('radius-input'),
            backgroundColor: v('bg-raised'),
            color: v('text'),
            fontSize: v('fs-input'),
            opacity: v('field-opacity'),
            transition: 'box-shadow .2s, background-color .2s',
            '& .MuiOutlinedInput-notchedOutline': { borderColor: v('line-strong') },
            '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: v('gold-line') },
            '&.Mui-focused': { boxShadow: `0 0 0 4px ${v('gold-soft')}`, backgroundColor: v('surface') },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: v('gold'), borderWidth: 1 },
            '&.Mui-disabled': { opacity: 0.6 }
          }
          // Placeholder colour lives in admin.css: the stylis 4.3 prefixer crashes on
          // ::placeholder rules processed by emotion's bundled stylis 4.2.
        }
      },
      MuiInputLabel: { styleOverrides: { root: { color: v('muted'), '&.Mui-focused': { color: v('gold') } } } },
      MuiFormHelperText: { styleOverrides: { root: { color: v('muted'), fontSize: v('fs-caption') } } },
      MuiSelect: { styleOverrides: { icon: { color: v('muted') } } },
      MuiChip: {
        styleOverrides: {
          root: { borderRadius: 999, fontWeight: 500, maxWidth: '100%' },
          filled: { backgroundColor: v('surface-2'), color: v('text-2') },
          filledPrimary: { backgroundColor: v('gold-soft'), color: v('gold') },
          outlined: { borderColor: v('line-strong') },
          label: { overflow: 'hidden', textOverflow: 'ellipsis' }
        }
      },
      MuiDrawer: { styleOverrides: { paper: { backgroundColor: v('surface'), borderColor: v('line') } } },
      MuiDialog: {
        styleOverrides: {
          paper: { borderRadius: v('radius-lg'), border: `1px solid ${v('line')}`, boxShadow: v('shadow-lg') }
        }
      },
      MuiBackdrop: {
        styleOverrides: { root: { backgroundColor: 'rgba(4,5,8,.55)', backdropFilter: 'blur(3px)', '&.MuiBackdrop-invisible': { backgroundColor: 'transparent', backdropFilter: 'none' } } }
      },
      MuiPopover: { styleOverrides: { paper: { backgroundColor: v('surface-2'), border: `1px solid ${v('line')}`, boxShadow: v('shadow-md') } } },
      MuiMenu: { styleOverrides: { paper: { backgroundColor: v('surface-2'), border: `1px solid ${v('line')}`, boxShadow: v('shadow-md') } } },
      MuiMenuItem: { styleOverrides: { root: { fontSize: v('fs-input'), '&.Mui-selected': { backgroundColor: v('gold-soft') }, '&.Mui-selected:hover': { backgroundColor: v('gold-soft') } } } },
      MuiTableCell: {
        styleOverrides: {
          root: { borderColor: v('line'), fontSize: 13.5, paddingBlock: 12 },
          head: { color: v('muted'), fontWeight: 600, fontSize: 12.5, backgroundColor: v('surface-2'), whiteSpace: 'nowrap' }
        }
      },
      MuiTableRow: { styleOverrides: { root: { '&:hover > .MuiTableCell-body': { backgroundColor: v('gold-soft') } } } },
      MuiTabs: { styleOverrides: { indicator: { backgroundColor: v('gold'), height: 2.5, borderRadius: 2 } } },
      MuiTab: { styleOverrides: { root: { textTransform: 'none', fontWeight: 500, '&.Mui-selected': { color: v('gold') } } } },
      MuiSwitch: {
        styleOverrides: {
          switchBase: { '&.Mui-checked': { color: v('gold') }, '&.Mui-checked + .MuiSwitch-track': { backgroundColor: v('gold'), opacity: 0.5 } }
        }
      },
      MuiCheckbox: { styleOverrides: { root: { color: v('muted'), '&.Mui-checked, &.MuiCheckbox-indeterminate': { color: v('gold') } } } },
      MuiRadio: { styleOverrides: { root: { '&.Mui-checked': { color: v('gold') } } } },
      MuiSlider: { styleOverrides: { root: { color: v('gold') } } },
      MuiLinearProgress: {
        styleOverrides: { root: { backgroundColor: v('surface-2'), borderRadius: 99 }, bar: { background: v('gold-grad'), borderRadius: 99 } }
      },
      MuiCircularProgress: { styleOverrides: { root: { color: v('gold') } } },
      MuiPaginationItem: {
        styleOverrides: {
          root: { borderRadius: 10, fontWeight: 600, '&.Mui-selected': { background: v('gold-grad'), color: v('gold-ink') }, '&.Mui-selected:hover': { background: v('gold-grad') } }
        }
      },
      MuiAlert: {
        styleOverrides: {
          root: { borderRadius: 12, alignItems: 'center' },
          standardInfo: { backgroundColor: v('info-soft'), color: v('text-2') },
          standardSuccess: { backgroundColor: v('success-soft'), color: v('success') },
          standardError: { backgroundColor: v('danger-soft'), color: v('danger') },
          standardWarning: { backgroundColor: v('gold-soft'), color: v('gold') }
        }
      },
      MuiTooltip: {
        styleOverrides: { tooltip: { backgroundColor: v('surface-3'), color: v('text'), border: `1px solid ${v('line-strong')}`, fontSize: 12.5, borderRadius: 8 } }
      },
      MuiDivider: { styleOverrides: { root: { borderColor: v('line') } } },
      MuiFormControlLabel: { styleOverrides: { label: { fontSize: v('fs-input') } } },
      MuiAccordion: { styleOverrides: { root: { backgroundColor: v('surface'), border: `1px solid ${v('line')}`, '&::before': { display: 'none' } } } }
    }
  });
}
