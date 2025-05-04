"use client";
import { useState } from "react";
import { useMutation, gql } from "@apollo/client";
import Cookies from "js-cookie";
import { useRouter } from "next/navigation";
import { Button } from '@saltybets/components';

/**
 * GraphQL mutation for user login.
 */
const LOGIN_MUTATION = gql`
  mutation Login($username: String!, $password: String!) {
    login(username: $username, password: $password)
  }
`;

/**
 * Login page for Salty Bets. Mobile-first layout and login logic.
 * @returns {React.ReactElement} The rendered login page.
 */
export default function LoginPage(): React.ReactElement {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();
  const [login, { loading }] = useMutation(LOGIN_MUTATION);

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
    } catch (err) {
      setError("Login failed");
    }
  };

  return (
    <main style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: 16 }}>
      <h2 style={{ marginBottom: 24 }}>Login</h2>
      <form onSubmit={handleSubmit} style={{ width: '100%', maxWidth: 320, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <input type="text" placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} style={{ padding: 12, borderRadius: 6, border: '1px solid #ccc', fontSize: 16 }} />
        <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} style={{ padding: 12, borderRadius: 6, border: '1px solid #ccc', fontSize: 16 }} />
        {error && <div style={{ color: 'red', fontSize: 14 }}>{error}</div>}
        <Button type="submit" disabled={loading}>{loading ? "Logging in..." : "Login"}</Button>
      </form>
    </main>
  );
} 