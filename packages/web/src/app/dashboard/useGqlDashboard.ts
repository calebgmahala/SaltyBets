import { gql, useQuery, useMutation } from "@apollo/client";

/**
 * GraphQL query for current match.
 */
export const GET_CURRENT_MATCH = gql`
  query GetCurrentMatch {
    getCurrentMatch {
      id
      winner
      fighterRed { name }
      fighterBlue { name }
      totalRedBets
      totalBlueBets
    }
  }
`;

/**
 * GraphQL query for current bet totals.
 */
export const GET_MATCH_TOTALS = gql`
  query GetMatchTotals {
    getMatchTotals {
      red
      blue
    }
  }
`;

/**
 * GraphQL subscription for live bet totals.
 */
export const BET_TOTALS_UPDATED = gql`
  subscription BetTotalsUpdated {
    betTotalsUpdated {
      red
      blue
    }
  }
`;

/**
 * GraphQL query for current user.
 */
export const GET_MY_USER = gql`
  query GetMyUser {
    user { id username securityLevel }
  }
`;

/**
 * GraphQL mutation for placing a bet.
 */
export const PLACE_BET = gql`
  mutation PlaceBet($amount: Float!, $fighterColor: String!) {
    placeBet(amount: $amount, fighterColor: $fighterColor)
  }
`;

/**
 * GraphQL mutation for canceling a bet.
 */
export const CANCEL_BET = gql`
  mutation CancelBet($amount: Float!) {
    cancelBet(amount: $amount)
  }
`;

/**
 * Apollo hook for current match query.
 */
export function useGetCurrentMatchQuery() {
  return useQuery(GET_CURRENT_MATCH);
}

/**
 * Apollo hook for match totals query.
 */
export function useGetMatchTotalsQuery() {
  return useQuery(GET_MATCH_TOTALS);
}

/**
 * Apollo hook for current user query.
 */
export function useGetMyUserQuery() {
  return useQuery(GET_MY_USER);
}

/**
 * Apollo hook for place bet mutation.
 */
export function usePlaceBetMutation() {
  return useMutation(PLACE_BET);
}

/**
 * Apollo hook for cancel bet mutation.
 */
export function useCancelBetMutation() {
  return useMutation(CANCEL_BET);
} 