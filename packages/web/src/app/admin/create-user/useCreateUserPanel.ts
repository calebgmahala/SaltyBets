import { useState } from "react";
import { useCreateUserMutation } from "./useGqlCreateUser";
import { useRouter } from "next/navigation";

/**
 * Custom hook for the create user admin page business logic.
 * Handles form state, mutation, and navigation.
 * @returns {object} State and handlers for the create user form
 */
export function useCreateUserPanel() {
  // ============================================
  // State
  // ============================================
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [alias, setAlias] = useState("");
  const [securityLevel, setSecurityLevel] = useState<'ADMIN' | 'PAYOUT_MANAGER' | 'USER'>("USER");
  const [balance, setBalance] = useState<number>(0);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");
  const [createUser, { loading }] = useCreateUserMutation();
  const router = useRouter();

  // ============================================
  // Handlers
  // ============================================
  /**
   * Handles form submission to create a new user.
   * @param {React.FormEvent} e - The form event
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!username || !password || !alias) {
      setError("Username, password, and alias are required.");
      return;
    }
    try {
      const { data } = await createUser({
        variables: {
          input: { username, password, alias, securityLevel, balance: Number(balance) }
        }
      });
      if (data?.createUser) {
        setSuccess(`User '${data.createUser.username}' created successfully!`);
        setUsername("");
        setPassword("");
        setAlias("");
        setSecurityLevel("USER");
        setBalance(0);
        setTimeout(() => router.push("/admin"), 1200);
      } else {
        setError("Failed to create user.");
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
   * Navigates back to the admin page.
   */
  const handleCancel = () => {
    router.push('/admin');
  };

  return {
    username,
    setUsername,
    password,
    setPassword,
    alias,
    setAlias,
    securityLevel,
    setSecurityLevel,
    balance,
    setBalance,
    error,
    setError,
    success,
    setSuccess,
    loading,
    handleSubmit,
    handleCancel,
  };
} 