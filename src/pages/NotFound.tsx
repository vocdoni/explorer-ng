import { Button, Flex } from '@chakra-ui/react'
import { LuCompass } from 'react-icons/lu'
import { Link as RouterLink } from 'react-router'
import { EmptyState } from '~components/shared/EmptyState'

const NotFoundPage = () => (
  <EmptyState
    icon={LuCompass}
    title='Page not found'
    hint='The address you followed does not match anything in this explorer.'
  >
    <Flex gap={2} mt={2} wrap='wrap' justify='center'>
      <Button asChild size='sm'>
        <RouterLink to='/'>Go to dashboard</RouterLink>
      </Button>
      <Button asChild size='sm' variant='outline'>
        <RouterLink to='/processes'>Browse elections</RouterLink>
      </Button>
      <Button asChild size='sm' variant='outline'>
        <RouterLink to='/search'>Search</RouterLink>
      </Button>
    </Flex>
  </EmptyState>
)

export default NotFoundPage
