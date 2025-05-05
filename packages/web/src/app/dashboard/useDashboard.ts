import { useEffect, useLayoutEffect, useState } from "react";
import Cookies from "js-cookie";
import { useRouter } from "next/navigation";
import {
  useGetCurrentMatchQuery,
  useGetMatchTotalsQuery,
  useGetMyUserQuery,
  usePlaceBetMutation,
  useCancelBetMutation,
  BET_TOTALS_UPDATED,
} from "./useGqlDashboard";

/**
 * Custom hook for dashboard business logic.
 * Handles authentication, queries, mutations, state, and handlers.
 * @returns {object} State and handlers for the dashboard page
 */
export function useDashboard() {
  const router = useRouter();
  useLayoutEffect(() => {
    const token = Cookies.get("token");
    if (!token) {
      router.replace("/login");
    }
  }, [router]);

  // Fetch current match
  const { data: matchData } = useGetCurrentMatchQuery();
  // Fetch current bet totals
  const { data: totalsData, subscribeToMore } = useGetMatchTotalsQuery();
  // Fetch current user
  const { data: userData } = useGetMyUserQuery();

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
  const [betError, setBetError] = useState("");
  const [betSuccess, setBetSuccess] = useState("");
  const [placeBet, { loading: placingBet }] = usePlaceBetMutation();
  const [cancelBet, { loading: cancelingBet }] = useCancelBetMutation();

  /**
   * Handles placing a bet.
   * @param {"RED"|"BLUE"} color - The fighter color.
   */
  const handlePlaceBet = async (color: "RED" | "BLUE") => {
    setBetError("");
    setBetSuccess("");
    try {
      const { data } = await placeBet({ variables: { amount: 0.05, fighterColor: color } });
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
      const { data } = await cancelBet({ variables: { amount: 0.05 } });
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

  return {
    match,
    totals,
    user,
    betError,
    betSuccess,
    placingBet,
    cancelingBet,
    handlePlaceBet,
    handleCancelBet,
    handleLogout,
  };
} 