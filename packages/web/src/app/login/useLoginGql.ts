import { gql, useMutation } from "@apollo/client";

/**
 * GraphQL mutation for user login.
 */
export const LOGIN_MUTATION = gql`
  mutation Login($username: String!, $password: String!) {
    login(username: $username, password: $password)
  }
`;

/**
 * Apollo hook for login mutation.
 * @returns {[Function, { loading: boolean }]}
 */
export function useLoginMutation() {
  return useMutation(LOGIN_MUTATION);
} 