import { SaltyBoyFighter } from "./Fighter";

export interface SaltyBoyCurrentMatchResponse {
  fighter_blue_info: SaltyBoyFighter;
  fighter_red_info: SaltyBoyFighter;
  match_format: string | null;
  tier: string | null;
  updated_at: string | null;
}
