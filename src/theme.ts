import { createLightTheme } from '@fluentui/react-components'
import type { BrandVariants, Theme } from '@fluentui/react-components'

/**
 * REdI brand colour ramp for Fluent UI v9.
 * Generated from --redi-teal (#2B9E9E) as the brand hue,
 * with the coral accent reserved for CTAs and highlights.
 */
const rediBrand: BrandVariants = {
  10: '#061D1D',
  20: '#0C2E2E',
  30: '#123F3F',
  40: '#175050',
  50: '#1D6161',
  60: '#237272',
  70: '#298383',
  80: '#2B9E9E', // --redi-teal (brand primary)
  90: '#3DBDBD',
  100: '#5FCBCB',
  110: '#7DD5D5',
  120: '#8DD4D4', // --redi-light-teal
  130: '#A8E0E0',
  140: '#C3EBEB',
  150: '#DEF5F5',
  160: '#F0FAFA',
}

const rediLightTheme: Theme = {
  ...createLightTheme(rediBrand),
  fontFamilyBase: "'Montserrat', 'Segoe UI', 'Roboto', 'Helvetica Neue', sans-serif",
}

export default rediLightTheme
