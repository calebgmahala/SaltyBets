"use client";
import React from "react";
import { Button, TextInput, NumberInput } from '@saltybets/components';
import { useCreateUserPanel } from "./useCreateUserPanel";

/**
 * Admin Create User Page
 * Allows admins to create a new user with username, password, alias, security level, and balance.
 * @returns {React.ReactElement} The rendered create user page.
 */
export default function CreateUserPage(): React.ReactElement {
  // ============================================
  // Business Logic Hook
  // ============================================
  const {
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
    success,
    loading,
    handleSubmit,
    handleCancel,
  } = useCreateUserPanel();

  // ============================================
  // Render
  // ============================================
  return (
    <main style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 16 }}>
      <h2 style={{ marginBottom: 16 }}>Create User</h2>
      <form onSubmit={handleSubmit} style={{ width: '100%', maxWidth: 400, background: '#f8f9fa', borderRadius: 8, padding: 16, color: '#222' }}>
        <TextInput
          label="Username"
          value={username}
          onChange={e => setUsername(e.target.value)}
          placeholder="Enter username"
        />
        <TextInput
          label="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="Enter password"
        />
        <TextInput
          label="Alias"
          value={alias}
          onChange={e => setAlias(e.target.value)}
          placeholder="Enter alias"
        />
        <div style={{ margin: '12px 0' }}>
          <label style={{ fontWeight: 500, marginBottom: 4, display: 'block' }}>Security Level</label>
          <select value={securityLevel} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSecurityLevel(e.target.value as 'ADMIN' | 'PAYOUT_MANAGER' | 'USER')} style={{ width: '100%', padding: 8, borderRadius: 4 }}>
            <option value="USER">User</option>
            <option value="PAYOUT_MANAGER">Payout Manager</option>
            <option value="ADMIN">Admin</option>
          </select>
        </div>
        <NumberInput
          label="Balance"
          value={balance}
          onChange={e => setBalance(Number(e.target.value))}
          placeholder="Enter starting balance"
        />
        {error && <div style={{ color: '#dc3545', marginTop: 8 }}>{error}</div>}
        {success && <div style={{ color: '#28a745', marginTop: 8 }}>{success}</div>}
        <Button type="submit" style={{ width: '100%', marginTop: 16 }} disabled={loading}>
          {loading ? "Creating..." : "Create User"}
        </Button>
        <Button type="button" style={{ width: '100%', marginTop: 8, background: '#6c757d' }} onClick={handleCancel}>
          Cancel
        </Button>
      </form>
    </main>
  );
} 