import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { isJeweller } from "@/lib/auth.utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Mail } from "lucide-react";

type Props = {
  dealerId: string;
  stoneId?: string;
  context: string;
  trigger?: React.ReactNode;
};

export function EnquireDialog({ dealerId, stoneId, context, trigger }: Props) {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState(context);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const canEnquire = isJeweller(profile) && profile?.is_approved;

  if (!user) {
    return (
      <Button
        size="lg"
        onClick={() => navigate({ to: "/login" })}
        className="w-full bg-[var(--color-gold)] text-[var(--color-gold-foreground)] hover:opacity-90"
      >
        <Mail className="mr-2 h-4 w-4" /> Sign in to enquire
      </Button>
    );
  }

  if (!canEnquire) {
    return null;
  }

  async function submit() {
    if (!message.trim()) {
      toast.error("Please write a message");
      return;
    }
    setBusy(true);
    const { data: enquiry, error } = await supabase
      .from("enquiries")
      .insert({
        from_jeweller_id: user!.id,
        to_dealer_id: dealerId,
        stone_id: stoneId ?? null,
        subject: subject || context,
        message,
      })
      .select("id")
      .single();
    if (error || !enquiry) {
      setBusy(false);
      toast.error(error?.message ?? "Failed to send");
      return;
    }
    await supabase.from("enquiry_messages").insert({
      enquiry_id: enquiry.id,
      sender_id: user!.id,
      message,
    });
    setBusy(false);
    setOpen(false);
    toast.success("Enquiry sent");
    setMessage("");
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button
            size="lg"
            className="w-full bg-[var(--color-gold)] text-[var(--color-gold-foreground)] hover:opacity-90"
          >
            <Mail className="mr-2 h-4 w-4" /> Enquire
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Send enquiry</DialogTitle>
          <DialogDescription>{context}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Subject</Label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
          </div>
          <div>
            <Label>Message</Label>
            <Textarea
              rows={6}
              placeholder="Hi, I'm interested in this stone…"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            onClick={submit}
            disabled={busy}
            className="bg-[var(--color-gold)] text-[var(--color-gold-foreground)] hover:opacity-90"
          >
            {busy ? "Sending…" : "Send enquiry"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}