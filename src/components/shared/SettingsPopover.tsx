import { Button, IconButton, Input, Popover, Portal, Stack, Text } from '@chakra-ui/react'
import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { LuSettings } from 'react-icons/lu'
import { toaster } from '~components/ui/toaster'
import { useApi } from '~contexts/ApiContext'

/**
 * The API endpoint switcher is a developer affordance, so it lives behind a gear
 * rather than in primary header space.
 */
export const SettingsPopover = () => {
  const { apiUrl, setApiUrl } = useApi()
  const [value, setValue] = useState(apiUrl)
  const queryClient = useQueryClient()

  // Reflect the value the context settled on — entering "https://host" stores
  // "https://host/v2", and the field should show what is actually in use.
  useEffect(() => setValue(apiUrl), [apiUrl])

  const update = () => {
    if (!value || value === apiUrl) return
    setApiUrl(value)
    void queryClient.invalidateQueries()
    toaster.create({ title: 'API endpoint updated', description: value, type: 'success' })
  }

  return (
    <Popover.Root positioning={{ placement: 'bottom-end' }}>
      <Popover.Trigger asChild>
        <IconButton variant='subtle' colorPalette='gray' size='sm' aria-label='Settings'>
          <LuSettings />
        </IconButton>
      </Popover.Trigger>
      <Portal>
        <Popover.Positioner>
          <Popover.Content width='320px'>
            <Popover.Body p={4}>
              <Stack gap={3}>
                <Text fontSize='sm' fontWeight='bold'>
                  API endpoint
                </Text>
                <Text fontSize='xs' color='texts.subtle'>
                  Point the explorer at a different node. Stored in this browser only.
                </Text>
                <Input
                  size='sm'
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder='http://localhost:9090/v2'
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') update()
                  }}
                />
                <Button size='sm' onClick={update} disabled={!value || value === apiUrl}>
                  Update
                </Button>
              </Stack>
            </Popover.Body>
          </Popover.Content>
        </Popover.Positioner>
      </Portal>
    </Popover.Root>
  )
}
