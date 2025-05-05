import React from 'react';
import Link from 'next/link';
import { Button, Heading, Text, CardSection } from '@saltybets/components';

/**
 * Landing page for Salty Bets. Provides navigation to login and dashboard.
 * @returns {JSX.Element} The rendered landing page.
 */
export default function HomePage() {
  return (
    <main style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24, marginTop: 64 }}>
      <CardSection style={{ maxWidth: 420, width: '100%', textAlign: 'center' }}>
        <Heading level={1}>Salty Bets</Heading>
        <Text variant="body">Welcome to the private-party betting platform for Salty Boy matches.</Text>
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 24 }}>
          <Link href="/login"><Button variant="green">Login</Button></Link>
          <Link href="/dashboard"><Button>Dashboard</Button></Link>
        </div>
      </CardSection>
    </main>
  );
}
