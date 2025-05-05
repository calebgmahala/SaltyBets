"use client";
import { useEffect, useLayoutEffect } from "react";
import Cookies from "js-cookie";
import { useRouter } from "next/navigation";
import { useQuery, gql } from "@apollo/client";
import { Button, Heading, Text, CardSection } from '@saltybets/components';
import Link from "next/link";
import { useDashboard } from "./useDashboard";

// ============================================
// GraphQL Queries & Subscriptions
// ============================================

/**
 * Query for current match.
 */
const GET_CURRENT_MATCH = gql`
  query GetCurrentMatch {
    getCurrentMatch {
      id
      winner
      fighterRed { name }
      fighterBlue { name }
      totalRedBets
      totalBlueBets
    }
  }
`;

/**
 * Query for current bet totals.
 */
const GET_MATCH_TOTALS = gql`
  query GetMatchTotals {
    getMatchTotals {
      red
      blue
    }
  }
`;

/**
 * Subscription for live bet totals.
 */
const BET_TOTALS_UPDATED = gql`
  subscription BetTotalsUpdated {
    betTotalsUpdated {
      red
      blue
    }
  }
`;

/**
 * Query for current user.
 */
const GET_MY_USER = gql`
  query GetMyUser {
    user { id username securityLevel }
  }
`;

/**
 * Dashboard page for Salty Bets. Mobile-first layout for current match and betting actions.
 * Redirects to /login if not authenticated. Fetches match, bet totals, and user role.
 * @returns {React.ReactElement} The rendered dashboard page.
 */
export default function DashboardPage(): React.ReactElement {
  const router = useRouter();
  useLayoutEffect(() => {
    const token = Cookies.get("token");
    if (!token) {
      router.replace("/login");
    }
  }, [router]);

  // Fetch current match
  const { data: matchData } = useQuery(GET_CURRENT_MATCH);
  // Fetch current bet totals
  const { data: totalsData, subscribeToMore } = useQuery(GET_MATCH_TOTALS);
  // Fetch current user
  const { data: userData } = useQuery(GET_MY_USER);

  // Subscribe to live bet totals
  useEffect(() => {
    if (!subscribeToMore) return;
    const unsubscribe = subscribeToMore({
      document: BET_TOTALS_UPDATED,
      updateQuery: (prev, { subscriptionData }) => {
        if (!subscriptionData.data) return prev;
        return { getMatchTotals: subscriptionData.data.betTotalsUpdated };
      },
    });
    return () => unsubscribe && unsubscribe();
  }, [subscribeToMore]);

  const match = matchData?.getCurrentMatch;
  const totals = totalsData?.getMatchTotals;
  const user = userData?.user;

  const {
    betError,
    betSuccess,
    placingBet,
    cancelingBet,
    handlePlaceBet,
    handleCancelBet,
    handleLogout,
  } = useDashboard();

  return (
    <main style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 16 }}>
      <div style={{ width: '100%', display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
        <Button onClick={handleLogout} variant="red">Logout</Button>
      </div>
      <div style={{ marginBottom: 16 }}>
        <Heading level={2}>Current Match</Heading>
      </div>
      {match ? (
        <CardSection style={{ width: '100%', maxWidth: 400 }}>
          <div style={{ marginBottom: 12 }}>
            <Text variant="bold">{match.fighterRed.name}</Text> vs <Text variant="bold">{match.fighterBlue.name}</Text>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <Text variant="body">Red Bets: ${totals?.red ?? match.totalRedBets}</Text>
            <Text variant="body">Blue Bets: ${totals?.blue ?? match.totalBlueBets}</Text>
          </div>
          <span style={{ color: '#555', marginBottom: 8 }}>
            <Text variant="small" className="winner">
              Winner: {match.winner || 'TBD'}
            </Text>
          </span>
        </CardSection>
      ) : (
        <Text>Loading match...</Text>
      )}
      {user && (
        <span style={{ color: '#222', marginBottom: 16, display: 'block' }}>
          <Text variant="small">Logged in as: {user.username} ({user.securityLevel})</Text>
        </span>
      )}
      {/* Betting actions */}
      {user && (
        <CardSection style={{ width: '100%', maxWidth: 400 }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <Button onClick={() => handlePlaceBet("RED") } variant="red" disabled={placingBet}>Bet Red (5¢)</Button>
            <Button onClick={() => handlePlaceBet("BLUE") } variant="blue" disabled={placingBet}>Bet Blue (5¢)</Button>
          </div>
          <Button onClick={handleCancelBet} variant="red" disabled={cancelingBet} style={{ width: '100%' }}>Cancel Bet</Button>
          {betError && (
            <span style={{ marginTop: 8, display: 'block' }}>
              <Text variant="error">{betError}</Text>
            </span>
          )}
          {betSuccess && (
            <span style={{ color: 'green', marginTop: 8, display: 'block' }}>
              <Text variant="bold">{betSuccess}</Text>
            </span>
          )}
        </CardSection>
      )}
      {/* Admin/Manager features */}
      {user && (user.securityLevel === "ADMIN" || user.securityLevel === "PAYOUT_MANAGER") && (
        <div style={{ width: '100%', maxWidth: 400, marginBottom: 24 }}>
          <Link href="/admin"><Button style={{ width: '100%', background: '#007bff' }}>Admin Panel</Button></Link>
        </div>
      )}
    </main>
  );
} 