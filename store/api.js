// RTK Query: every call to our API. Responses are cached per screen; after a change,
// "tags" tell the right screens to refetch (e.g. buying passes refreshes the wallet and home).
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export const messApi = createApi({
  reducerPath: 'messApi',
  baseQuery: fetchBaseQuery({ baseUrl: '/api', credentials: 'same-origin' }),
  tagTypes: ['Session', 'Today', 'Menu', 'Sale', 'Wallet', 'Entry', 'Kitchen', 'Tickets', 'Inspections', 'Overview', 'Accounts', 'Rules', 'Clock', 'Bhandar', 'Notes'],
  endpoints: (b) => ({
    session: b.query({ query: () => '/session', providesTags: ['Session'] }),
    signIn: b.mutation({ query: (body) => ({ url: '/session', method: 'POST', body }) }),
    signOut: b.mutation({ query: () => ({ url: '/session', method: 'DELETE' }) }),

    today: b.query({ query: () => '/student/today', providesTags: ['Today'] }),
    ratingSummary: b.query({ query: (mess) => (mess ? `/ratings/summary?mess=${mess}` : '/ratings/summary'), providesTags: ['Today'] }),
    rateMeal: b.mutation({ query: (body) => ({ url: '/ratings', method: 'POST', body }), invalidatesTags: ['Today'] }),
    menu: b.query({ query: (mess) => (mess ? `/menu?mess=${mess}` : '/menu'), providesTags: ['Menu'] }),
    editMenu: b.mutation({ query: (body) => ({ url: '/menu', method: 'PUT', body }), invalidatesTags: ['Menu'] }),

    sale: b.query({ query: () => '/passes/sale', providesTags: ['Sale'] }),
    buyPasses: b.mutation({ query: (picks) => ({ url: '/passes/purchase', method: 'POST', body: { picks } }), invalidatesTags: ['Sale', 'Wallet', 'Today'] }),
    wallet: b.query({ query: (week) => (week ? `/passes?week=${week}` : '/passes'), providesTags: ['Wallet'] }),
    givePass: b.mutation({ query: ({ id, roll }) => ({ url: `/passes/${id}/give`, method: 'POST', body: { roll } }), invalidatesTags: ['Wallet', 'Today'] }),
    checkFriend: b.mutation({ query: ({ id, roll }) => ({ url: `/passes/${id}/give`, method: 'POST', body: { roll, check: true } }) }),
    skipMeal: b.mutation({ query: (body) => ({ url: '/skips', method: 'POST', body }), invalidatesTags: ['Today', 'Kitchen', 'Overview'] }),

    bhandar: b.query({ query: () => '/bhandar', providesTags: ['Bhandar'] }),
    bhandarBrowse: b.query({ query: ({ day, meal, diet }) => `/bhandar/browse?day=${day}&meal=${meal}&diet=${diet}`, providesTags: ['Bhandar'] }),
    bhandarSellable: b.query({ query: () => '/bhandar/sellable', providesTags: ['Bhandar'] }),
    postListings: b.mutation({ query: (items) => ({ url: '/bhandar/listings', method: 'POST', body: { items } }), invalidatesTags: ['Bhandar', 'Notes'] }),
    takeDownListing: b.mutation({ query: (id) => ({ url: `/bhandar/listings/${id}`, method: 'DELETE' }), invalidatesTags: ['Bhandar'] }),
    addWant: b.mutation({ query: (body) => ({ url: '/bhandar/wants', method: 'POST', body }), invalidatesTags: ['Bhandar'] }),
    removeWant: b.mutation({ query: (id) => ({ url: `/bhandar/wants/${id}`, method: 'DELETE' }), invalidatesTags: ['Bhandar'] }),
    requestListing: b.mutation({ query: (listingId) => ({ url: '/bhandar/requests', method: 'POST', body: { listingId } }), invalidatesTags: ['Bhandar', 'Notes'] }),
    answerRequest: b.mutation({
      query: ({ id, action }) => ({ url: `/bhandar/requests/${id}`, method: 'PATCH', body: { action } }),
      invalidatesTags: ['Bhandar', 'Notes', 'Wallet', 'Today'],
    }),
    reportRequest: b.mutation({ query: ({ id, reason }) => ({ url: `/bhandar/requests/${id}/report`, method: 'POST', body: { reason } }) }),
    notifications: b.query({ query: () => '/notifications', providesTags: ['Notes'] }),
    readNotifications: b.mutation({ query: (id) => ({ url: '/notifications/read', method: 'POST', body: id ? { id } : {} }), invalidatesTags: ['Notes'] }),

    enter: b.mutation({ query: (code) => ({ url: '/entry', method: 'POST', body: { code } }), invalidatesTags: ['Today', 'Wallet'] }),
    demoScan: b.mutation({ query: () => ({ url: '/entry/demo-scan', method: 'POST' }), invalidatesTags: ['Today', 'Wallet'] }),
    entryScreen: b.query({ query: () => '/entry/screen', providesTags: ['Entry'] }),
    counterEntry: b.mutation({ query: (roll) => ({ url: '/entry/counter', method: 'POST', body: { roll } }), invalidatesTags: ['Entry', 'Kitchen'] }),
    kitchen: b.query({ query: (mess) => (mess ? `/kitchen?mess=${mess}` : '/kitchen'), providesTags: ['Kitchen'] }),

    tickets: b.query({ query: () => '/tickets', providesTags: ['Tickets'] }),
    raiseTicket: b.mutation({ query: (body) => ({ url: '/tickets', method: 'POST', body }), invalidatesTags: ['Tickets', 'Overview'] }),
    moveTicket: b.mutation({ query: ({ id, ...body }) => ({ url: `/tickets/${id}`, method: 'PATCH', body }), invalidatesTags: ['Tickets', 'Overview'] }),
    voteTicket: b.mutation({ query: (id) => ({ url: `/tickets/${id}/vote`, method: 'POST' }), invalidatesTags: ['Tickets'] }),

    inspections: b.query({ query: (mess) => `/inspections?mess=${mess}`, providesTags: ['Inspections'] }),
    inspect: b.mutation({ query: (body) => ({ url: '/inspections', method: 'POST', body }), invalidatesTags: ['Inspections', 'Overview', 'Tickets'] }),
    overview: b.query({ query: () => '/overview', providesTags: ['Overview'] }),

    accounts: b.query({ query: () => '/admin/students', providesTags: ['Accounts'] }),
    editStudent: b.mutation({ query: ({ id, ...body }) => ({ url: `/admin/students/${id}`, method: 'PATCH', body }), invalidatesTags: ['Accounts', 'Overview'] }),
    rules: b.query({ query: () => '/admin/rules', providesTags: ['Rules'] }),
    saveRules: b.mutation({ query: (body) => ({ url: '/admin/rules', method: 'PUT', body }), invalidatesTags: ['Rules', 'Sale', 'Today'] }),
    clock: b.query({ query: () => '/admin/clock', providesTags: ['Clock'] }),
    setClock: b.mutation({
      query: (body) => ({ url: '/admin/clock', method: 'PUT', body }),
      invalidatesTags: ['Clock', 'Session', 'Today', 'Sale', 'Wallet', 'Entry', 'Kitchen', 'Overview', 'Menu', 'Tickets', 'Bhandar', 'Notes'],
    }),
  }),
});

export const {
  useSessionQuery, useSignInMutation, useSignOutMutation,
  useTodayQuery, useRateMealMutation, useRatingSummaryQuery, useMenuQuery, useEditMenuMutation,
  useSaleQuery, useBuyPassesMutation, useWalletQuery, useGivePassMutation, useCheckFriendMutation, useSkipMealMutation,
  useBhandarQuery, useBhandarBrowseQuery, useBhandarSellableQuery, usePostListingsMutation, useTakeDownListingMutation, useAddWantMutation,
  useRemoveWantMutation, useRequestListingMutation, useAnswerRequestMutation, useReportRequestMutation, useNotificationsQuery, useReadNotificationsMutation,
  useEnterMutation, useDemoScanMutation, useEntryScreenQuery, useCounterEntryMutation, useKitchenQuery,
  useTicketsQuery, useRaiseTicketMutation, useMoveTicketMutation, useVoteTicketMutation,
  useInspectionsQuery, useInspectMutation, useOverviewQuery,
  useAccountsQuery, useEditStudentMutation, useRulesQuery, useSaveRulesMutation, useClockQuery, useSetClockMutation,
} = messApi;

/** A readable sentence from an RTK Query error. */
export const problemText = (err) => err?.data?.error || 'Something went wrong. Try again.';
