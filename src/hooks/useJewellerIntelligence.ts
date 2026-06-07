import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type JewellerIntelligence = {
  feedStones: number;
  totalMarketStones: number;
  vaultStones: number;
  earlyAccessStones: number;
  followedDealers: number;
  isLoading: boolean;
};

async function getFollowedDealerIds(jewellerId: string): Promise<string[]> {
  const { data: keys, error: keyError } = await supabase
    .from("api_keys")
    .select("id")
    .eq("jeweller_id", jewellerId)
    .eq("is_active", true)
    .limit(1);

  if (keyError || !keys?.[0]) return [];

  const { data: selections, error: selectionError } = await supabase
    .from("feed_selections")
    .select("dealer_id")
    .eq("api_key_id", keys[0].id)
    .eq("selection_type", "dealer_follow")
    .not("dealer_id", "is", null);

  if (selectionError) return [];
  return Array.from(new Set((selections ?? []).map((selection) => selection.dealer_id).filter((id): id is string => !!id)));
}

async function countAvailableStones(dealerIds?: string[], extra?: { sourceType?: "direct_vault"; earlyAccess?: boolean }) {
  let query = supabase
    .from("stones")
    .select("id", { count: "planned", head: true })
    .eq("status", "available")
    .eq("feed_inactive", false)
    .eq("is_test", false);

  if (dealerIds) {
    if (dealerIds.length === 0) return 0;
    query = query.in("dealer_id", dealerIds);
  }
  if (extra?.sourceType) query = query.eq("source_type", extra.sourceType);
  if (extra?.earlyAccess) query = query.gte("private_until", new Date().toISOString());

  const { count, error } = await query;
  if (error) throw error;
  return count ?? 0;
}

export function useJewellerIntelligence(jewellerId: string | undefined | null): JewellerIntelligence {
  const query = useQuery({
    queryKey: ["jeweller-intelligence", jewellerId],
    enabled: !!jewellerId,
    staleTime: 60_000,
    queryFn: async () => {
      const followedDealerIds = await getFollowedDealerIds(jewellerId!);
      const [feedStones, totalMarketStones, vaultStones, earlyAccessStones] = await Promise.all([
        countAvailableStones(followedDealerIds),
        countAvailableStones(),
        countAvailableStones(followedDealerIds, { sourceType: "direct_vault" }),
        countAvailableStones(followedDealerIds, { earlyAccess: true }),
      ]);

      return {
        feedStones,
        totalMarketStones,
        vaultStones,
        earlyAccessStones,
        followedDealers: followedDealerIds.length,
      };
    },
  });

  return {
    feedStones: query.data?.feedStones ?? 0,
    totalMarketStones: query.data?.totalMarketStones ?? 0,
    vaultStones: query.data?.vaultStones ?? 0,
    earlyAccessStones: query.data?.earlyAccessStones ?? 0,
    followedDealers: query.data?.followedDealers ?? 0,
    isLoading: query.isLoading,
  };
}
