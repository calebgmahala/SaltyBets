"use client";
import { useEffect } from "react";
import Cookies from "js-cookie";
import { useRouter } from "next/navigation";
import { Button } from '@saltybets/components';

/**
 * Admin page for Salty Bets. Mobile-first layout for user management and match controls.
 * Redirects to /login if not authenticated.
 * @returns {React.ReactElement} The rendered admin page.
 */
export default function AdminPage(): React.ReactElement {
  const router = useRouter();
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

  return (
    <main style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 16 }}>
      <div style={{ width: '100%', display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
        <Button onClick={handleLogout} style={{ background: '#dc3545' }}>Logout</Button>
      </div>
      <h2 style={{ marginBottom: 16 }}>Admin Panel</h2>
      <section style={{ width: '100%', maxWidth: 400, background: '#f8f9fa', borderRadius: 8, padding: 16, marginBottom: 24 }}>
        <h3>User Management</h3>
        <Button style={{ width: '100%', marginBottom: 8 }}>Create User</Button>
        <Button style={{ width: '100%' }}>Delete User</Button>
      </section>
      <section style={{ width: '100%', maxWidth: 400, background: '#f8f9fa', borderRadius: 8, padding: 16 }}>
        <h3>Match Controls</h3>
        <Button style={{ width: '100%', marginBottom: 8 }}>Create Match</Button>
        <Button style={{ width: '100%' }}>End Match</Button>
      </section>
    </main>
  );
} 