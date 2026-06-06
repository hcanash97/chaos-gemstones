import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DEFAULT_SITE_THEME, normalizeSiteTheme } from "@/lib/site-theme";

export function useSiteTheme() {
  const query = useQuery({
    queryKey: ["site-theme"],
    staleTime: 60_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("site_configurations")
        .select("theme_data")
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();
      return normalizeSiteTheme(data?.theme_data);
    },
  });

  return {
    ...query,
    theme: query.data ?? DEFAULT_SITE_THEME,
  };
}
