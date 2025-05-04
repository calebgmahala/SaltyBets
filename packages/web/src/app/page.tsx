import React from 'react';
import Link from 'next/link';
import { Button } from '@saltybets/components';

/**
 * Landing page for Salty Bets. Provides navigation to login and dashboard.
 * @returns {JSX.Element} The rendered landing page.
 */
export default function HomePage() {
  return (
    <main style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24, marginTop: 64 }}>
      <h1>Salty Bets</h1>
      <p>Welcome to the private-party betting platform for Salty Boy matches.</p>
      <div style={{ display: 'flex', gap: 16 }}>
        <Link href="/login"><Button>Login</Button></Link>
        <Link href="/dashboard"><Button>Dashboard</Button></Link>
        </div>
      </main>
  );
}
