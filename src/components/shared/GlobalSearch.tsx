import { Icon, Input, InputGroup, Spinner } from '@chakra-ui/react'
import { useState } from 'react'
import { LuSearch } from 'react-icons/lu'
import { useUnifiedSearch } from '~hooks/useUnifiedSearch'

/** Header-embedded resolver: paste an id, hash or height and go. */
export const GlobalSearch = () => {
  const [query, setQuery] = useState('')
  const { search, status, reset } = useUnifiedSearch()

  return (
    <InputGroup
      startElement={
        status === 'searching' ? (
          <Spinner size='xs' />
        ) : (
          <Icon color='fg.muted'>
            <LuSearch />
          </Icon>
        )
      }
      w={{ base: 'full', xl: '240px', '2xl': '320px' }}
      minW={0}
    >
      <Input
        size='sm'
        placeholder='Search id, hash or block height'
        value={query}
        aria-label='Search the chain'
        onChange={(e) => {
          setQuery(e.target.value)
          if (status === 'notfound') reset()
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') void search(query)
        }}
        borderColor={status === 'notfound' ? 'red.solid' : undefined}
      />
    </InputGroup>
  )
}
