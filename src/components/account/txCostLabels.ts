/**
 * Friendly labels for transaction-cost / fee "type" names.
 *
 * These come from two related but differently-cased vocabularies:
 *  - `GET /chain/transactions/cost` keys them PascalCase ("NewProcess", "SendTokens"),
 *    straight from `genesis.TxCostNameToTxTypeMap`.
 *  - `GET /accounts/{address}/fees/page/{page}` reports `txType` snake_case
 *    ("new_process", "set_account_info_uri") — the same vocabulary, different casing.
 *
 * Both normalize to the same PascalCase key before lookup, so one map covers
 * the fees table and the Monitoring pricing panel.
 */
const FRIENDLY_NAMES: Record<string, string> = {
  SetProcessStatus: 'Change election status',
  SetProcessCensus: 'Update election census',
  SetProcessDuration: 'Extend election duration',
  SetProcessQuestionIndex: 'Advance election question',
  SendTokens: 'Token transfer',
  SetAccountInfoUri: 'Update account metadata',
  SetAccountValidator: 'Register validator',
  CreateAccount: 'Create account',
  RegisterKey: 'Register voter key',
  NewProcess: 'Create election',
  AddDelegateForAccount: 'Add account delegate',
  DelDelegateForAccount: 'Remove account delegate',
  CollectFaucet: 'Claim faucet tokens',
  SetAccountSik: 'Register secret identity key',
  DelAccountSik: 'Remove secret identity key',
}

const toPascalCase = (value: string) =>
  value
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('')

/** Turn a raw tx-cost/fee type name ("new_process" or "NewProcess") into a
 *  plain-English label, falling back to a spaced-out version of the raw name. */
export const txCostLabel = (rawType?: string): string => {
  if (!rawType) return 'Unknown'
  const pascal = /_/.test(rawType) ? toPascalCase(rawType) : rawType
  if (FRIENDLY_NAMES[pascal]) return FRIENDLY_NAMES[pascal]
  return pascal.replace(/([a-z])([A-Z])/g, '$1 $2')
}
