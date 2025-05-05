import { gql, useMutation } from "@apollo/client";

/**
 * GraphQL mutation for creating a new user.
 */
export const CREATE_USER = gql`
  mutation CreateUser($input: CreateUserInputDto!) {
    createUser(input: $input) {
      id
      username
      alias
      securityLevel
      balance
    }
  }
`;

/**
 * Custom hook for the createUser mutation.
 *
 * @returns {ReturnType<typeof useMutation>} The mutation function and result object.
 */
export function useCreateUserMutation() {
  return useMutation(CREATE_USER);
} 