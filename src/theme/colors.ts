/**
 * Raw color palette, aligned with the vocdoni.io design reference (DESIGN.md).
 *
 * The identity is "cream, not white; one ink, many alphas": every neutral is a
 * warm cream or a warm ink (OKLCH hue ~97-107), never a pure white or a cool
 * gray. Saturated hue is reserved for two jobs — the deep Vocdoni green
 * (`primary`) that marks links and accents, and state (green live, yellow
 * paused, red failed, blue data). Signal yellow exists only as punctuation
 * dots, never as a surface.
 */
export const colors = {
  // Warm ink scale — the old black `brand` ramp re-tinted onto the ink hue.
  // brand.500 is the ink itself; 550-800 are the dark-mode surface steps.
  brand: {
    50: { value: 'oklch(0.96 0.015 97)' }, // ghost hover (light)
    100: { value: 'oklch(0.9 0.02 99)' }, // hover (light)
    200: { value: 'oklch(0.975 0.013 97)' }, // outline hover / ghost active (light)
    300: { value: 'oklch(0.84 0.02 101)' }, // outline active (light)
    500: { value: 'oklch(0.24 0.013 106)' }, // base solid (warm ink)
    550: { value: 'oklch(0.255 0.012 107)' }, // custom (auth bg)
    600: { value: 'oklch(0.32 0.013 106)' }, // solid hover
    650: { value: 'oklch(0.21 0.012 107)' }, // custom (dark body)
    700: { value: 'oklch(0.3 0.013 106)' }, // solid active
    800: { value: 'oklch(0.36 0.013 106)' }, // link active (dark)
  },

  // Full override of chakra's gray scale onto warm ink/cream steps, so every
  // stock component (colorPalette is pinned to gray) inherits the warmth.
  gray: {
    50: { value: 'oklch(0.985 0.009 97)' },
    100: { value: 'oklch(0.962 0.017 97)' },
    200: { value: 'oklch(0.925 0.02 98)' },
    300: { value: 'oklch(0.865 0.02 100)' },
    400: { value: 'oklch(0.71 0.018 103)' },
    500: { value: 'oklch(0.57 0.016 104)' },
    600: { value: 'oklch(0.46 0.014 105)' },
    700: { value: 'oklch(0.38 0.013 106)' },
    800: { value: 'oklch(0.3 0.013 106)' },
    900: { value: 'oklch(0.24 0.013 106)' },
    950: { value: 'oklch(0.19 0.012 107)' },
  },

  // Vocdoni green — the brand accent for links, icons and focus rings.
  // 500 is the reference `--primary`; 300/200 are the dark-mode lifts.
  primary: {
    200: { value: 'oklch(0.85 0.08 158)' },
    300: { value: 'oklch(0.76 0.09 158)' },
    500: { value: 'oklch(0.47 0.085 158)' },
    600: { value: 'oklch(0.4 0.08 158)' },
  },

  // Butter yellow — eyebrow/status dots ONLY, never a surface.
  signal: {
    500: { value: 'oklch(0.93 0.11 102)' },
  },

  dashboardMenu: {
    light: { value: 'oklch(0.975 0.013 97)' },
    dark: { value: 'oklch(0.235 0.012 107)' },
  },

  // Translucent warm ink so it works over both color modes
  separator: { value: 'oklch(0.5 0.016 105 / 0.3)' },
}
