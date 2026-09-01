import { Box, Button, Flex, IconButton, Image, Link, Menu, Portal, Text } from '@chakra-ui/react'
import { useState } from 'react'
import { LuChevronDown, LuMenu } from 'react-icons/lu'
import { Outlet, Link as RouterLink, useLocation } from 'react-router'
import { GlobalSearch } from '~components/shared/GlobalSearch'
import { SettingsPopover } from '~components/shared/SettingsPopover'
import { ColorModeToggle } from '~components/ui/ColorModeToggle'

interface NavEntry {
  to: string
  label: string
  /** Match `to` exactly — for `/`, which every other path starts with. */
  end?: boolean
  /** Sibling path whose pages belong to this section. See `NavItem`. */
  detail?: string
}

/** Citizen-facing sections stay in the bar; auditor/developer views collapse
 *  into the "More" menu so the header reads as a product, not a data dump. */
const primaryLinks: NavEntry[] = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/accounts', label: 'Organizations', detail: '/account' },
  { to: '/processes', label: 'Elections', detail: '/process' },
  { to: '/verify', label: 'Verify vote' },
]

const moreLinks: NavEntry[] = [
  { to: '/envelopes', label: 'Votes', detail: '/envelope' },
  { to: '/blocks', label: 'Blocks', detail: '/block' },
  { to: '/transactions', label: 'Transactions' },
  { to: '/tokens', label: 'Tokens' },
  { to: '/validators', label: 'Validators', detail: '/validator' },
  { to: '/monitoring', label: 'Monitoring' },
]

/** Both official marks are black artwork on transparency, so dark mode inverts
 *  them rather than shipping a second asset that can drift from the first. */
const invertOnDark = { _dark: { filter: 'invert(1)' } }

/**
 * `NavLink` alone cannot highlight these, because a detail page does not live
 * under its list: the paths are the ones `vocdoni/explorer` published, and there
 * a list was plural and its detail pages singular — `/accounts` next to
 * `/account/{address}`. `detail` names that sibling.
 */
const NavItem = ({ to, label, end, detail }: NavEntry) => {
  const { pathname } = useLocation()
  const under = (base: string) => pathname === base || pathname.startsWith(`${base}/`)
  const active = end ? pathname === to : under(to) || (!!detail && under(detail))

  return (
    <Button asChild variant='navbar' size='sm'>
      <RouterLink to={to} aria-current={active ? 'page' : undefined}>
        {label}
      </RouterLink>
    </Button>
  )
}

/** The official explorer.vote lockup: Vocdoni mark plus the word EXPLORER, so
 *  no text label is set beside it. */
const Wordmark = () => (
  <Link asChild variant='unstyled'>
    <RouterLink to='/'>
      <Image
        src='/images/logo-header.png'
        alt='Vocdoni Explorer'
        h={{ base: '24px', md: '28px' }}
        w='auto'
        {...invertOnDark}
      />
    </RouterLink>
  </Link>
)

const MoreMenu = () => (
  <Menu.Root>
    <Menu.Trigger asChild>
      <Button variant='navbar' size='sm'>
        More <LuChevronDown />
      </Button>
    </Menu.Trigger>
    <Portal>
      <Menu.Positioner>
        <Menu.Content minW='180px'>
          {moreLinks.map((link) => (
            <Menu.Item key={link.to} value={link.to} asChild>
              <RouterLink to={link.to}>{link.label}</RouterLink>
            </Menu.Item>
          ))}
        </Menu.Content>
      </Menu.Positioner>
    </Portal>
  </Menu.Root>
)

export const AppLayout = () => {
  const [open, setOpen] = useState(false)

  return (
    <Flex position='relative' direction='column' minH='100dvh' bg='bg'>
      {/* Opaque rather than translucent: a sticky bar that content scrolls
          under has to stay readable, and the gradient plus a soft shadow reads
          as a raised surface without introducing any colour. */}
      <Box
        as='header'
        position='sticky'
        top={0}
        w='full'
        zIndex={30}
        bgGradient='to-b'
        gradientFrom='bg'
        gradientTo='bg.muted'
        boxShadow='0 1px 2px rgba(0,0,0,0.04), 0 8px 24px -16px rgba(0,0,0,0.35)'
        borderBottom='1px solid'
        borderColor='border'
      >
        <Box maxW='navbar' mx='auto' px={{ base: 4, md: 6, xl: 10 }} py={3}>
          <Flex align='center' justify='space-between' gap={4}>
            <Wordmark />

            {/* The full cluster (search + 5 nav items + 2 icon buttons) only fits
                from xl up; below that it collapses into the toggle below. */}
            <Flex align='center' gap={2} minW={0} display={{ base: 'none', xl: 'flex' }}>
              <GlobalSearch />
              {primaryLinks.map((link) => (
                <NavItem key={link.to} {...link} />
              ))}
              <MoreMenu />
              <SettingsPopover />
              <ColorModeToggle />
            </Flex>

            <Flex align='center' gap={2} display={{ base: 'flex', xl: 'none' }}>
              <ColorModeToggle />
              <IconButton
                variant='subtle'
                colorPalette='gray'
                size='sm'
                aria-label='Toggle navigation'
                onClick={() => setOpen((v) => !v)}
              >
                <LuMenu />
              </IconButton>
            </Flex>
          </Flex>

          <Flex
            direction='column'
            gap={2}
            mt={3}
            display={{ base: open ? 'flex' : 'none', xl: 'none' }}
            onClick={() => setOpen(false)}
          >
            <GlobalSearch />
            {[...primaryLinks, ...moreLinks].map((link) => (
              <NavItem key={link.to} {...link} />
            ))}
            <SettingsPopover />
          </Flex>
        </Box>
      </Box>

      <Box
        as='main'
        flexGrow={1}
        w='full'
        maxW='contents'
        mx='auto'
        mt={{ base: 4, lg: 6, xl: 10 }}
        mb={{ base: 20, lg: 32 }}
        px={{ base: '10px', sm: '20px', md: '80px' }}
      >
        <Outlet />
      </Box>

      {/* No navigation down here: everything the footer used to link to lives in
          the header, one scroll-free click away. What is left is provenance. */}
      <Box
        as='footer'
        w='full'
        bgGradient='to-b'
        gradientFrom='bg'
        gradientTo='bg.muted'
        borderTop='1px solid'
        borderColor='border'
      >
        <Box maxW='navbar' mx='auto' px={{ base: 4, md: 6, xl: 10 }}>
          <Flex
            direction={{ base: 'column', md: 'row' }}
            align={{ base: 'flex-start', md: 'center' }}
            justify='space-between'
            gap={{ base: 4, md: 8 }}
            pt='28px'
            pb='20px'
          >
            <Flex align='center' gap={4} minW={0}>
              <Link href='https://vocdoni.io' target='_blank' rel='noreferrer' variant='unstyled' flexShrink={0}>
                <Image src='/images/logo-classic.svg' alt='Vocdoni' h='24px' w='auto' {...invertOnDark} />
              </Link>
              <Text fontSize='sm' lineHeight={1.7} color='texts.subtle' maxW='520px'>
                An open block explorer for the Vocdoni voting protocol. Every election, vote and block on the chain,
                verifiable by anyone.
              </Text>
            </Flex>
            <Link
              variant='footer'
              fontSize='sm'
              fontWeight='bold'
              flexShrink={0}
              href='https://vocdoni.io'
              target='_blank'
              rel='noreferrer'
            >
              vocdoni.io
            </Link>
          </Flex>
          <Flex borderTop='1px solid' borderTopColor='border' py='14px' justify='space-between' gap={3} wrap='wrap'>
            <Text fontSize='xs' color='texts.subtle'>
              Vocdoni protocol explorer — open source, no account required.
            </Text>
          </Flex>
        </Box>
      </Box>
    </Flex>
  )
}
