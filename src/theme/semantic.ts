import { defineSemanticTokens } from '@chakra-ui/react'

/**
 * Semantic tokens ported from vocdoni-app (`src/theme/semantic.ts`), trimmed to
 * the surfaces the explorer actually paints.
 *
 * Everything else (bg.subtle, bg.panel, fg, fg.muted, border, …) inherits from
 * Chakra's built-in semantic scale on purpose — that scale is the canonical
 * vocabulary for chrome, and raw hex should never appear at a call site.
 */

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
        _light: '{colors.white}',
        _dark: '{colors.brand.650}',
      },
    },
    muted: {
      value: {
        _light: '{colors.gray.100}',
        _dark: '{colors.brand.800}',
      },
    },
  },
  border: {
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
  input: {
    placeholder: {
      value: '{colors.gray.500}',
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
        value: {
          _light: '{colors.gray.500}',
          _dark: '{colors.gray.400}',
        },
      },
      active: {
        color: {
          value: {
            _light: '{colors.brand.500}',
            _dark: '{colors.white}',
          },
        },
        bg: {
          value: {
            _light: '{colors.white}',
            _dark: '{colors.brand.500}',
          },
        },
      },
    },
    bg: {
      value: {
        _light: '{colors.gray.100}',
        _dark: '{colors.brand.700}',
      },
    },
  },
  texts,
})

const semanticTokens = {
  colors,
}

export default semanticTokens
