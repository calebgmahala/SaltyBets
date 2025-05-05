import { useEffect, useState } from "react";
import Cookies from "js-cookie";
import { useRouter } from "next/navigation";
import { useUpdateUserBalanceMutation, useCreateMatchMutation } from "./useGqlAdminPanel";

/**
 * Custom hook for admin panel business logic.
 * Handles authentication, state, and update balance mutation.
 * @returns {object} State and handlers for the admin panel
 */
export function useAdminPanel() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [amount, setAmount] = useState<number>(0);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");
  const [createMatchError, setCreateMatchError] = useState<string>("");
  const [updateUserBalanceMutation, { loading }] = useUpdateUserBalanceMutation();
  const [createMatch, { loading: creatingMatch }] = useCreateMatchMutation();

  useEffect(() => {
    const token = Cookies.get("token");
    if (!token) {
      router.replace("/login");
    }
  }, [router]);

  /**
   * Handles logout by removing the JWT token and redirecting to /login.
   */
  const handleLogout = () => {
    Cookies.remove("token");
    router.replace("/login");
  };

  /**
   * Handles the update balance action. Calls the GraphQL mutation.
   */
  const handleUpdateBalance = async () => {
    setError("");
    setSuccess("");
    if (!username) {
      setError("Username is required");
      return;
    }
    if (!amount) {
      setError("Amount is required");
      return;
    }
    try {
      const { data } = await updateUserBalanceMutation({ variables: { username, amount: Number(amount) } });
      if (data?.updateUserBalance) {
        setSuccess(`Balance for ${data.updateUserBalance.username} updated to $${data.updateUserBalance.balance}`);
        setUsername("");
        setAmount(0);
      } else {
        setError("Failed to update balance");
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Network error. Please try again.");
      }
    }
  };

  /**
   * Handles the create match action. Calls the GraphQL mutation.
   */
  const handleCreateMatch = async () => {
    setCreateMatchError("");
    setSuccess("");
    try {
      const { data } = await createMatch();
      if (data?.createMatch) {
        setSuccess("Match created successfully");
      } else {
        setCreateMatchError("Failed to create match");
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setCreateMatchError(err.message);
      } else {
        setCreateMatchError("Network error. Please try again.");
      }
    }
  };

  return {
    username,
    setUsername,
    amount,
    setAmount,
    error,
    setError,
    success,
    setSuccess,
    loading,
    handleLogout,
    handleUpdateBalance,
    handleCreateMatch,
    creatingMatch,
    createMatchError,
    setCreateMatchError,
  };
} 