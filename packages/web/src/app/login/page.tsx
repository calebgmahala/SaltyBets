"use client";
import { Button, Heading, Text, CardSection, TextInput } from '@saltybets/components';
import { useLogin } from "./useLogin";

/**
 * Login page for Salty Bets. Mobile-first layout and login logic.
 * @returns {React.ReactElement} The rendered login page.
 */
export default function LoginPage(): React.ReactElement {
  const {
    username,
    setUsername,
    password,
    setPassword,
    error,
    loading,
    handleSubmit,
  } = useLogin();

  return (
    <main style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: 16 }}>
      <CardSection style={{ width: '100%', maxWidth: 340 }}>
        <div style={{ marginBottom: 24 }}>
          <Heading level={2}>Login</Heading>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <TextInput
            id="username"
            label="Username"
            value={username}
            onChange={e => setUsername(e.target.value)}
            placeholder="Username"
            error={error && !username ? error : undefined}
          />
          <TextInput
            id="password"
            label="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Password"
            error={error && !password ? error : undefined}
            type="password"
          />
          {error && <Text variant="error">{error}</Text>}
          <Button type="submit" disabled={loading} variant="green">{loading ? "Logging in..." : "Login"}</Button>
        </form>
      </CardSection>
    </main>
  );
} 