import { defineSemanticTokens } from '@chakra-ui/react'

/**
 * Semantic tokens implementing the vocdoni.io recipe (DESIGN.md): warm cream
 * surfaces, a single warm ink whose alpha tiers produce every text and line
 * color, and the deep Vocdoni green as the one chrome accent. Dark mode
 * mirrors the same recipe — ink and cream swap roles, the green lightens.
 *
 * The ink hierarchy (on cream): 100% headings/body, 64% muted, 55% faint
 * labels, 10% hairline borders, 7% hover tints. Deriving everything from one
 * ink at fixed alphas is what keeps the surfaces coherent — do not introduce
 * separate gray values here.
 */

const INK = 'oklch(0.24 0.013 106)'
const CREAM_INK = 'oklch(0.955 0.011 97)' // the "ink" of dark mode

const ink = (alpha: number) => `oklch(0.24 0.013 106 / ${alpha})`
const creamInk = (alpha: number) => `oklch(0.955 0.011 97 / ${alpha})`

// @deprecated: use the chakra built-in `bg` token directly
const chakra = {
  body: {
    bg: {
      value: '{colors.bg}',
    },
  },
}

// @deprecated: use the chakra built-in `fg`/`fg.muted` tokens directly
const texts = {
  primary: {
    value: '{colors.fg}',
  },
  subtle: {
    value: '{colors.fg.muted}',
  },
  dark: {
    value: '{colors.fg.muted}',
  },
}

export const colors = defineSemanticTokens.colors({
  chakra,
  bg: {
    DEFAULT: {
      value: {
        _light: 'oklch(0.988 0.011 97)', // warm cream, never white
        _dark: '{colors.brand.650}',
      },
    },
    subtle: {
      value: {
        _light: 'oklch(0.97 0.015 97)',
        _dark: 'oklch(0.235 0.012 107)',
      },
    },
    muted: {
      value: {
        _light: 'oklch(0.936 0.033 97)', // deeper cream band
        _dark: 'oklch(0.27 0.013 106)',
      },
    },
    panel: {
      value: {
        _light: 'oklch(0.988 0.011 97)',
        _dark: 'oklch(0.235 0.012 107)',
      },
    },
    emphasized: {
      value: {
        _light: 'oklch(0.925 0.028 97)',
        _dark: 'oklch(0.3 0.013 106)',
      },
    },
    // Dark "terminal window" for code/JSON surfaces, regardless of color mode
    code: {
      value: {
        _light: 'oklch(0.235 0.012 107)',
        _dark: 'oklch(0.185 0.011 107)',
      },
    },
  },
  fg: {
    DEFAULT: {
      value: {
        _light: INK,
        _dark: CREAM_INK,
      },
    },
    muted: {
      value: {
        _light: ink(0.64),
        _dark: creamInk(0.72),
      },
    },
    subtle: {
      value: {
        _light: ink(0.55),
        _dark: creamInk(0.55),
      },
    },
    code: {
      value: creamInk(0.92),
    },
  },
  border: {
    DEFAULT: {
      value: {
        _light: ink(0.1), // hairline: ink at 10%
        _dark: creamInk(0.12),
      },
    },
    muted: {
      value: {
        _light: ink(0.07),
        _dark: creamInk(0.08),
      },
    },
    subtle: {
      value: {
        _light: ink(0.05),
        _dark: creamInk(0.06),
      },
    },
    emphasized: {
      value: {
        _light: ink(0.2),
        _dark: creamInk(0.24),
      },
    },
    // @deprecated: use the chakra built-in `border` token directly
    dashboard: {
      value: '{colors.border}',
    },
    pagination: {
      active: {
        value: {
          _light: '{colors.gray.700}',
          _dark: '{colors.gray.500}',
        },
      },
    },
  },
  // The Vocdoni green accent: links, icons, in-page emphasis.
  primary: {
    DEFAULT: {
      value: {
        _light: '{colors.primary.500}',
        _dark: '{colors.primary.300}',
      },
    },
    emphasized: {
      value: {
        _light: '{colors.primary.600}',
        _dark: '{colors.primary.200}',
      },
    },
  },
  // Eyebrow/status punctuation dot — the only place the yellow exists.
  signal: {
    DEFAULT: {
      value: {
        _light: '{colors.signal.500}',
        _dark: '{colors.signal.500}',
      },
    },
  },
  // colorPalette is pinned to gray, so this is the app-wide focus ring.
  gray: {
    focusRing: {
      value: {
        _light: '{colors.primary.500}',
        _dark: '{colors.primary.300}',
      },
    },
  },
  input: {
    placeholder: {
      value: '{colors.fg.subtle}',
    },
  },
  // @deprecated: use the chakra built-in `border` token directly
  table: {
    border: {
      value: '{colors.border}',
    },
  },
  tabs: {
    tab: {
      color: {
        value: '{colors.fg.muted}',
      },
      active: {
        color: {
          value: '{colors.fg}',
        },
        bg: {
          value: {
            _light: '{colors.bg}',
            _dark: creamInk(0.14),
          },
        },
      },
    },
    bg: {
      value: {
        _light: 'oklch(0.936 0.033 97)',
        _dark: creamInk(0.08),
      },
    },
  },
  texts,
})

const semanticTokens = {
  colors,
}

export default semanticTokens
