
ALTER TABLE public.whatsapp_intake_log
  ADD CONSTRAINT whatsapp_intake_log_dealer_id_fkey
    FOREIGN KEY (dealer_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.whatsapp_intake_log
  ADD CONSTRAINT whatsapp_intake_log_stone_id_fkey
    FOREIGN KEY (stone_id) REFERENCES public.stones(id) ON DELETE SET NULL;
