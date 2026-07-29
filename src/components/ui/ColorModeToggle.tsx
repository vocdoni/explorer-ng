import { ClientOnly, IconButton, Skeleton } from '@chakra-ui/react'
import { IoMdMoon, IoMdSunny } from 'react-icons/io'
import { useColorMode } from '~theme'

export const ColorModeToggle = () => {
  const { colorMode, toggleColorMode } = useColorMode()

  return (
    <ClientOnly fallback={<Skeleton boxSize='8' borderRadius='sm' />}>
      <IconButton
        onClick={toggleColorMode}
        variant='subtle'
        colorPalette='gray'
        size='sm'
        aria-label={colorMode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      >
        {colorMode === 'dark' ? <IoMdSunny /> : <IoMdMoon />}
      </IconButton>
    </ClientOnly>
  )
}
