import { Tooltip as ChakraTooltip, Portal } from '@chakra-ui/react'
import { forwardRef, type ReactNode } from 'react'

export interface TooltipProps extends ChakraTooltip.RootProps {
  content: ReactNode
  showArrow?: boolean
  portalled?: boolean
  disabled?: boolean
}

/**
 * v3 exposes Tooltip only as an unstyled part collection; this recomposes the
 * single-prop shape the rest of the app expects.
 */
export const Tooltip = forwardRef<HTMLDivElement, TooltipProps>(
  ({ content, showArrow, portalled = true, disabled, children, ...rest }, ref) => {
    if (disabled) return <>{children}</>

    const positioner = (
      <ChakraTooltip.Positioner>
        <ChakraTooltip.Content
          ref={ref}
          boxShadow='xs'
          border='1px solid'
          borderColor='border'
          px={2}
          py={1}
          bgColor='bg.panel'
          color='fg'
        >
          {showArrow && (
            <ChakraTooltip.Arrow>
              <ChakraTooltip.ArrowTip />
            </ChakraTooltip.Arrow>
          )}
          {content}
        </ChakraTooltip.Content>
      </ChakraTooltip.Positioner>
    )

    return (
      <ChakraTooltip.Root openDelay={200} closeDelay={80} {...rest}>
        <ChakraTooltip.Trigger asChild>{children}</ChakraTooltip.Trigger>
        {portalled ? <Portal>{positioner}</Portal> : positioner}
      </ChakraTooltip.Root>
    )
  }
)

Tooltip.displayName = 'Tooltip'
