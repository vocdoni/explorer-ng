import { Button, HStack, Input } from '@chakra-ui/react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

interface Props {
  placeholder: string
  buttonLabel: string
  /** Builds the destination path from the trimmed input value. */
  toPath: (value: string) => string
  /** Rejects obviously-wrong input before navigating (e.g. non-numeric height). */
  validate?: (value: string) => boolean
}

/**
 * Compact "jump straight to it" widget for block heights and transaction
 * hashes — the two identifiers a user is most likely to already have in hand
 * (from a wallet receipt or another explorer) rather than wanting to browse
 * a filtered list for.
 */
export const GoToInput = ({ placeholder, buttonLabel, toPath, validate }: Props) => {
  const [value, setValue] = useState('')
  const [invalid, setInvalid] = useState(false)
  const navigate = useNavigate()

  const go = () => {
    const trimmed = value.trim()
    if (!trimmed) return
    if (validate && !validate(trimmed)) {
      setInvalid(true)
      return
    }
    setInvalid(false)
    navigate(toPath(trimmed))
  }

  return (
    <HStack gap={2}>
      <Input
        placeholder={placeholder}
        value={value}
        size='sm'
        maxW='220px'
        borderColor={invalid ? 'red.solid' : undefined}
        onChange={(e) => {
          setValue(e.target.value)
          setInvalid(false)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') go()
        }}
      />
      <Button size='sm' variant='outline' onClick={go}>
        {buttonLabel}
      </Button>
    </HStack>
  )
}
