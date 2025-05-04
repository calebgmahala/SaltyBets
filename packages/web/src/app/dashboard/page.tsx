"use client";
import { useEffect, useState } from "react";
import Cookies from "js-cookie";
import { useRouter } from "next/navigation";
import { useQuery, gql, useMutation } from "@apollo/client";
import { Button } from '@saltybets/components';
import Link from "next/link";

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
 * Mutation for placing a bet.
 */
const PLACE_BET = gql`
  mutation PlaceBet($amount: Float!, $fighterColor: String!) {
    placeBet(amount: $amount, fighterColor: $fighterColor)
  }
`;

/**
 * Mutation for canceling a bet.
 */
const CANCEL_BET = gql`
  mutation CancelBet($amount: Float!) {
    cancelBet(amount: $amount)
  }
`;

/**
 * Dashboard page for Salty Bets. Mobile-first layout for current match and betting actions.
 * Redirects to /login if not authenticated. Fetches match, bet totals, and user role.
 * @returns {React.ReactElement} The rendered dashboard page.
 */
export default function DashboardPage(): React.ReactElement {
  const router = useRouter();
  useEffect(() => {
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

  // Betting state and actions
  const [betAmount, setBetAmount] = useState(10);
  const [betError, setBetError] = useState("");
  const [betSuccess, setBetSuccess] = useState("");
  const [placeBet, { loading: placingBet }] = useMutation(PLACE_BET);
  const [cancelBet, { loading: cancelingBet }] = useMutation(CANCEL_BET);

  /**
   * Handles placing a bet.
   * @param {"RED"|"BLUE"} color - The fighter color.
   */
  const handlePlaceBet = async (color: "RED" | "BLUE") => {
    setBetError("");
    setBetSuccess("");
    try {
      const { data } = await placeBet({ variables: { amount: betAmount, fighterColor: color } });
      if (data?.placeBet) {
        setBetSuccess(`Bet placed on ${color}`);
      } else {
        setBetError("Failed to place bet");
      }
    } catch {
      setBetError("Error placing bet");
    }
  };

  /**
   * Handles canceling a bet.
   */
  const handleCancelBet = async () => {
    setBetError("");
    setBetSuccess("");
    try {
      const { data } = await cancelBet({ variables: { amount: betAmount } });
      if (data?.cancelBet) {
        setBetSuccess("Bet canceled");
      } else {
        setBetError("Failed to cancel bet");
      }
    } catch {
      setBetError("Error canceling bet");
    }
  };

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
      <h2 style={{ marginBottom: 16 }}>Current Match</h2>
      {match ? (
        <section style={{ width: '100%', maxWidth: 400, background: '#f8f9fa', borderRadius: 8, padding: 16, marginBottom: 24 }}>
          <div style={{ marginBottom: 12 }}>
            <strong>{match.fighterRed.name}</strong> vs <strong>{match.fighterBlue.name}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span>Red Bets: ${totals?.red ?? match.totalRedBets}</span>
            <span>Blue Bets: ${totals?.blue ?? match.totalBlueBets}</span>
          </div>
          <div style={{ fontSize: 14, color: '#888', marginBottom: 8 }}>
            Winner: {match.winner || 'TBD'}
          </div>
        </section>
      ) : (
        <div>Loading match...</div>
      )}
      {user && (
        <div style={{ fontSize: 14, color: '#888', marginBottom: 16 }}>Logged in as: {user.username} ({user.securityLevel})</div>
      )}
      {/* Betting actions */}
      {user && (
        <section style={{ width: '100%', maxWidth: 400, marginBottom: 24 }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <input
              type="number"
              min={1}
              value={betAmount}
              onChange={e => setBetAmount(Number(e.target.value))}
              style={{ flex: 1, padding: 8, borderRadius: 4, border: '1px solid #ccc', fontSize: 16 }}
            />
            <Button onClick={() => handlePlaceBet("RED") } disabled={placingBet}>Bet Red</Button>
            <Button onClick={() => handlePlaceBet("BLUE") } disabled={placingBet}>Bet Blue</Button>
          </div>
          <Button onClick={handleCancelBet} disabled={cancelingBet} style={{ width: '100%' }}>Cancel Bet</Button>
          {betError && <div style={{ color: 'red', fontSize: 14, marginTop: 8 }}>{betError}</div>}
          {betSuccess && <div style={{ color: 'green', fontSize: 14, marginTop: 8 }}>{betSuccess}</div>}
        </section>
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