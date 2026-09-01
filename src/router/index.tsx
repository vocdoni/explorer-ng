import { Suspense, lazy } from 'react'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { AppLayout } from '~components/layout/AppLayout'
import { applyLegacyUrl } from '~utils/legacyUrl'

const Dashboard = lazy(() => import('~pages/Dashboard'))
const Elections = lazy(() => import('~pages/Elections'))
const ElectionDetail = lazy(() => import('~pages/ElectionDetail'))
const Organizations = lazy(() => import('~pages/Organizations'))
const AccountDetail = lazy(() => import('~pages/AccountDetail'))
const Votes = lazy(() => import('~pages/Votes'))
const VoteDetail = lazy(() => import('~pages/VoteDetail'))
const VerifyVote = lazy(() => import('~pages/VerifyVote'))
const Blocks = lazy(() => import('~pages/Blocks'))
const BlockDetail = lazy(() => import('~pages/BlockDetail'))
const Transactions = lazy(() => import('~pages/Transactions'))
const TransactionDetail = lazy(() => import('~pages/TransactionDetail'))
const TransactionByIndex = lazy(() => import('~pages/TransactionByIndex'))
const Monitoring = lazy(() => import('~pages/Monitoring'))
const Search = lazy(() => import('~pages/Search'))
const Validators = lazy(() => import('~pages/Validators'))
const TokenTransfers = lazy(() => import('~pages/TokenTransfers'))
const ValidatorDetail = lazy(() => import('~pages/ValidatorDetail'))
const NotFound = lazy(() => import('~pages/NotFound'))

const withSuspense = (node: React.ReactNode) => <Suspense fallback={<div>Loading...</div>}>{node}</Suspense>

/**
 * Paths are the ones `vocdoni/explorer` published, so links already in
 * circulation resolve here without a redirect. That is why the URLs speak the
 * protocol's vocabulary — process, account, envelope — while the interface
 * speaks the voter's: elections, organizations, votes. `~utils/legacyUrl`
 * handles the forms that could not be kept.
 *
 * Two identifiers are carried in the fragment rather than the path: a vote ID
 * is a nullifier, and the fragment is the only part of a URL a browser never
 * transmits. See `~utils/legacyUrl` for the full reasoning.
 *
 * List state (page, filters, tab) lives in search params via `useUrlListState`,
 * which the old explorer's `/blocks/:page` style path could not express.
 *
 * Built once at module scope, not per render: a data router owns the history
 * stack, so rebuilding it on a re-render — `AppBody` re-renders whenever the API
 * URL changes — would reset the stack and remount every page.
 */

// `createBrowserRouter` snapshots `window.location` the moment it runs, and a
// later `history.replaceState` fires no popstate, so the router would keep
// rendering the original URL's match (the 404 catch-all) forever. Rewriting
// legacy URLs must therefore happen in this module, immediately before the
// router is created — a call from `main.tsx` runs after every import has been
// evaluated, which is too late.
applyLegacyUrl()

const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: withSuspense(<Dashboard />) },

      { path: 'accounts', element: withSuspense(<Organizations />) },
      { path: 'account/:address', element: withSuspense(<AccountDetail />) },

      { path: 'processes', element: withSuspense(<Elections />) },
      { path: 'process/:electionId', element: withSuspense(<ElectionDetail />) },

      { path: 'envelopes', element: withSuspense(<Votes />) },
      // `/envelope#<voteId>` — the nullifier is in the fragment, so this route
      // takes no param of its own.
      { path: 'envelope', element: withSuspense(<VoteDetail />) },
      // `/verify#<voteId>`, or `/verify#<electionId>/<voteId>`.
      { path: 'verify', element: withSuspense(<VerifyVote />) },

      { path: 'blocks', element: withSuspense(<Blocks />) },
      { path: 'block/:height', element: withSuspense(<BlockDetail />) },

      { path: 'transactions', element: withSuspense(<Transactions />) },
      { path: 'transactions/:hash', element: withSuspense(<TransactionDetail />) },
      // The old explorer's by-position permalink. It needs the indexer to turn a
      // position into a hash, so unlike every other legacy form it cannot be
      // rewritten before the app mounts.
      { path: 'transactions/:height/:index', element: withSuspense(<TransactionByIndex />) },

      { path: 'validators', element: withSuspense(<Validators />) },
      { path: 'validator/:address', element: withSuspense(<ValidatorDetail />) },

      // No equivalent in the old explorer, so these keep explorer-ng's names.
      { path: 'tokens', element: withSuspense(<TokenTransfers />) },
      { path: 'monitoring', element: withSuspense(<Monitoring />) },
      { path: 'search', element: withSuspense(<Search />) },

      { path: '*', element: withSuspense(<NotFound />) },
    ],
  },
])

export const Router = () => <RouterProvider router={router} />
