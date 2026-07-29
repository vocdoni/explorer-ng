import { Suspense, lazy } from 'react'
import { createHashRouter, RouterProvider } from 'react-router-dom'
import { AppLayout } from '~components/layout/AppLayout'

const Dashboard = lazy(() => import('~pages/Dashboard'))
const Elections = lazy(() => import('~pages/Elections'))
const ElectionDetail = lazy(() => import('~pages/ElectionDetail'))
const Organizations = lazy(() => import('~pages/Organizations'))
const OrganizationDetail = lazy(() => import('~pages/OrganizationDetail'))
const Votes = lazy(() => import('~pages/Votes'))
const VoteDetail = lazy(() => import('~pages/VoteDetail'))
const VerifyVote = lazy(() => import('~pages/VerifyVote'))
const Blocks = lazy(() => import('~pages/Blocks'))
const BlockDetail = lazy(() => import('~pages/BlockDetail'))
const Transactions = lazy(() => import('~pages/Transactions'))
const TransactionDetail = lazy(() => import('~pages/TransactionDetail'))
const Monitoring = lazy(() => import('~pages/Monitoring'))
const Search = lazy(() => import('~pages/Search'))
const AccountDetail = lazy(() => import('~pages/AccountDetail'))
const Validators = lazy(() => import('~pages/Validators'))
const TokenTransfers = lazy(() => import('~pages/TokenTransfers'))
const ValidatorDetail = lazy(() => import('~pages/ValidatorDetail'))
const NotFound = lazy(() => import('~pages/NotFound'))

const withSuspense = (node: React.ReactNode) => <Suspense fallback={<div>Loading...</div>}>{node}</Suspense>

export const Router = () => {
  const router = createHashRouter([
    {
      path: '/',
      element: <AppLayout />,
      children: [
        { index: true, element: withSuspense(<Dashboard />) },
        { path: 'dashboard', element: withSuspense(<Dashboard />) },
        { path: 'elections', element: withSuspense(<Elections />) },
        { path: 'elections/:electionId', element: withSuspense(<ElectionDetail />) },
        { path: 'organizations', element: withSuspense(<Organizations />) },
        { path: 'organizations/:organizationId', element: withSuspense(<OrganizationDetail />) },
        { path: 'votes', element: withSuspense(<Votes />) },
        { path: 'votes/:voteId', element: withSuspense(<VoteDetail />) },
        { path: 'verify', element: withSuspense(<VerifyVote />) },
        // explorer.vote-compatible short form: /verify/0x<voteId> — the election
        // is resolved from the vote itself
        { path: 'verify/:voteId', element: withSuspense(<VerifyVote />) },
        { path: 'verify/:electionId/:voteId', element: withSuspense(<VerifyVote />) },
        { path: 'accounts/:address', element: withSuspense(<AccountDetail />) },
        { path: 'validators', element: withSuspense(<Validators />) },
        { path: 'tokens', element: withSuspense(<TokenTransfers />) },
        // legacy alias so existing /transfers links keep working
        { path: 'transfers', element: withSuspense(<TokenTransfers />) },
        { path: 'validators/:address', element: withSuspense(<ValidatorDetail />) },
        { path: 'blocks', element: withSuspense(<Blocks />) },
        { path: 'blocks/:height', element: withSuspense(<BlockDetail />) },
        { path: 'transactions', element: withSuspense(<Transactions />) },
        { path: 'transactions/:hash', element: withSuspense(<TransactionDetail />) },
        { path: 'monitoring', element: withSuspense(<Monitoring />) },
        { path: 'search', element: withSuspense(<Search />) },
        { path: '*', element: withSuspense(<NotFound />) },
      ],
    },
  ])
  return <RouterProvider router={router} />
}
