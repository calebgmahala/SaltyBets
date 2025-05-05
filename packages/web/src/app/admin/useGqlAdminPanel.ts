import { gql, useMutation } from "@apollo/client";

/**
 * GraphQL mutation for updating a user's balance.
 */
export const UPDATE_USER_BALANCE = gql`
  mutation UpdateUserBalance($username: String!, $amount: Float!) {
    updateUserBalance(username: $username, amount: $amount) {
      id
      username
      balance
    }
  }
`;

/**
 * Custom hook for the updateUserBalance mutation.
 * @returns {[Function, { loading: boolean }]}
 */
export function useUpdateUserBalanceMutation() {
  return useMutation(UPDATE_USER_BALANCE);
}

/**
 * GraphQL mutation for creating a match.
 */
export const CREATE_MATCH = gql`
  mutation CreateMatch {
    createMatch {
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
 * Custom hook for the createMatch mutation.
 * @returns {[Function, { loading: boolean }]}
 */
export function useCreateMatchMutation() {
  return useMutation(CREATE_MATCH);
} 