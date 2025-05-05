"use client";
import React from "react";
import { Button, TextInput, NumberInput, Heading, Text, CardSection } from '@saltybets/components';
import { useAdminPanel } from "./useAdminPanel";
import Link from "next/link";

/**
 * Admin page for Salty Bets. Mobile-first layout for user management and match controls.
 * Redirects to /login if not authenticated.
 * Allows admin to update user balances by username.
 * @returns {React.ReactElement} The rendered admin page.
 */
export default function AdminPage(): React.ReactElement {
  const {
    username,
    setUsername,
    amount,
    setAmount,
    error,
    success,
    loading,
    handleLogout,
    handleUpdateBalance,
    handleCreateMatch,
    creatingMatch,
    createMatchError,
  } = useAdminPanel();

  return (
    <main style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 16 }}>
      <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <Link href="/dashboard"><Button>Dashboard</Button></Link>
        <Button onClick={handleLogout} variant="red">Logout</Button>
      </div>
      <div style={{ marginBottom: 16 }}>
        <Heading level={2}>Admin Panel</Heading>
      </div>
      <CardSection style={{ width: '100%', maxWidth: 400 }}>
        <div style={{ marginBottom: 12 }}>
          <Heading level={3}>User Management</Heading>
        </div>
        <Link href="/admin/create-user"><Button style={{ width: '100%', marginBottom: 8 }}>Create User</Button></Link>
        <div style={{ marginBottom: 8 }}>
          <TextInput
            label="Username"
            value={username}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUsername(e.target.value)}
            placeholder="Enter username"
            error={error && !username ? error : undefined}
          />
          <NumberInput
            label="Amount"
            value={amount}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAmount(Number(e.target.value))}
            placeholder="Enter amount"
            error={error && !amount ? error : undefined}
          />
          <Button style={{ width: '100%' }} onClick={handleUpdateBalance} disabled={loading}>
            {loading ? "Updating..." : "Update Balance"}
          </Button>
          {error && !username && (
            <span style={{ marginTop: 8, display: 'block' }}>
              <Text variant="error">{error}</Text>
            </span>
          )}
          {success && (
            <span style={{ color: '#28a745', marginTop: 8, display: 'block' }}>
              <Text variant="bold">{success}</Text>
            </span>
          )}
        </div>
      </CardSection>
      {/* ============================================
          Create Match Error Display
        ============================================ */}
      {createMatchError && (
        <CardSection style={{ background: '#dc3545', color: '#fff', marginBottom: 16, maxWidth: 400, width: '100%', textAlign: 'center' }}>
          <span style={{ fontSize: 16 }}>
            <Text variant="bold">{createMatchError}</Text>
          </span>
        </CardSection>
      )}
      {/* ============================================
          Create Match Button
        ============================================ */}
      <Button style={{ width: '100%', maxWidth: 400, fontSize: 20, padding: '20px 0', background: '#007bff', color: '#fff', borderRadius: 8 }}
        onClick={handleCreateMatch}
        disabled={creatingMatch}
      >
        {creatingMatch ? "Creating Match..." : "Create Match"}
      </Button>
    </main>
  );
} 