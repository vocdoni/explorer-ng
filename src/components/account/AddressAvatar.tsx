import { Flex, Image } from '@chakra-ui/react'

const addressHue = (value: string) => {
  let hash = 0
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) % 360
  }
  return hash
}

interface Props {
  address: string
  avatarUrl?: string
  size?: string
}

/** Deterministic hue+initial "identicon" for an address, or its real avatar
 *  when the account/organization metadata carries one. Shared between the
 *  Account and Organization detail pages, which both render the same
 *  underlying resource. */
export const AddressAvatar = ({ address, avatarUrl, size = '72px' }: Props) => {
  const hue = addressHue(address || '0')
  const initial = address ? address.slice(0, 1).toUpperCase() : '?'
  if (avatarUrl) {
    return (
      <Image
        src={avatarUrl}
        alt=''
        boxSize={size}
        borderRadius='full'
        objectFit='cover'
        border='1px solid'
        borderColor='border'
      />
    )
  }
  return (
    <Flex
      boxSize={size}
      minW={size}
      borderRadius='full'
      align='center'
      justify='center'
      bg={`hsl(${hue}, 45%, 88%)`}
      color={`hsl(${hue}, 45%, 30%)`}
      fontWeight='bold'
      fontSize='2xl'
      _dark={{ bg: `hsl(${hue}, 35%, 22%)`, color: `hsl(${hue}, 60%, 78%)` }}
    >
      {initial}
    </Flex>
  )
}
