import { SaltyBoyFighter } from "./Fighter";

export interface SaltyBoyMatch {
  id: number;
  date: string;
  fighter_red: number;
  fighter_blue: number;
  winner: number;
  bet_red: number;
  bet_blue: number;
  streak_red: number;
  streak_blue: number;
  tier: string;
  match_format: string;
  colour: "blue" | "red";
}

export interface SaltyBoyMatchListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: SaltyBoyMatch[];
}
