import { Alert, Button, Grid, Input, Spinner, Stack } from '@chakra-ui/react'
import { useState } from 'react'
import { PageHeader } from '~components/shared/PageHeader'
import { PageSection } from '~components/shared/PageSection'
import { useUnifiedSearch } from '~hooks/useUnifiedSearch'

const SearchPage = () => {
  const [query, setQuery] = useState('')
  const { search, status, reset } = useUnifiedSearch()

  return (
    <Grid gap={4}>
      <PageHeader title='Search' subtitle='Paste an election ID, vote code, transaction hash or block height.' />
      <PageSection title='Quick search' subtitle='We will find whatever the identifier belongs to.'>
        <Stack direction={{ base: 'column', md: 'row' }} gap={3}>
          <Input
            placeholder='Enter hash / ID / height'
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              if (status === 'notfound') reset()
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void search(query)
            }}
          />
          <Button onClick={() => void search(query)} disabled={!query.trim() || status === 'searching'}>
            {status === 'searching' ? <Spinner size='sm' /> : 'Search'}
          </Button>
        </Stack>
      </PageSection>
      {status === 'notfound' && (
        <Alert.Root status='warning'>
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>Nothing on this chain matches that identifier.</Alert.Title>
            <Alert.Description>Try browsing elections or organizations instead.</Alert.Description>
          </Alert.Content>
        </Alert.Root>
      )}
    </Grid>
  )
}

export default SearchPage
