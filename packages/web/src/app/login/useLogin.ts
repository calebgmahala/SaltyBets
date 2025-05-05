import { useState } from "react";
import Cookies from "js-cookie";
import { useRouter } from "next/navigation";
import { useLoginMutation } from "./useLoginGql";

/**
 * Custom hook for login page business logic.
 * Handles state, login mutation, and redirect.
 * @returns {object} State and handlers for the login page
 */
export function useLogin() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();
  const [login, { loading }] = useLoginMutation();

  /**
   * Handles form submission for login.
   * @param {React.FormEvent} e - The form event.
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      const { data } = await login({ variables: { username, password } });
      if (data?.login) {
        Cookies.set("token", data.login, { expires: 7 });
        router.push("/dashboard");
      } else {
        setError("Invalid credentials");
      }
    } catch {
      setError("Login failed");
    }
  };

  return {
    username,
    setUsername,
    password,
    setPassword,
    error,
    loading,
    handleSubmit,
  };
} 