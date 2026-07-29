import { useValidators as useValidatorList } from '~hooks/useVoconeApi'
import type { Validator } from '~types/api'

/**
 * Validators sorted by voting power, descending — the natural "who matters
 * most in consensus" order for a list page. The API returns them in an
 * unspecified (indexer) order.
 */
export const useSortedValidators = (): { validators: Validator[]; isLoading: boolean } => {
  const list = useValidatorList()
  const validators = [...(list.data?.validators ?? [])].sort((a, b) => b.power - a.power)
  return { validators, isLoading: list.isLoading }
}

/**
 * A single validator resolved by address. `GET /chain/validators` has no
 * per-address variant, so this reuses the shared list query (already cached
 * by react-query) and finds the match client-side.
 */
export const useValidator = (address: string) => {
  const list = useValidatorList()
  const validator = (list.data?.validators ?? []).find((v) => v.address.toLowerCase() === address.toLowerCase())
  return { ...list, validator }
}
