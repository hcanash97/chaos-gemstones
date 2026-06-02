import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { adminBulkSendEmail } from "@/lib/admin.functions";

export function SendEmailDialog({
  open, onOpenChange, ids,
}: { open: boolean; onOpenChange: (v: boolean) => void; ids: string[] }) {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const send = useServerFn(adminBulkSendEmail);

  async function onSend() {
    if (!subject.trim() || !body.trim()) {
      toast.error("Subject and body are required.");
      return;
    }
    setSending(true);
    try {
      const r = await send({ data: { ids, subject, body } });
      toast.success(`Sent to ${r.sent} of ${ids.length} recipient(s).`);
      onOpenChange(false);
      setSubject(""); setBody("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Send failed.");
    } finally {
      setSending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Email {ids.length} account{ids.length === 1 ? "" : "s"}</DialogTitle>
          <DialogDescription>Sends via the Chaos transactional sender.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <Input placeholder="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
          <Textarea placeholder="Message body (plain text, line breaks become <br/>)" rows={10} value={body} onChange={(e) => setBody(e.target.value)} />
        </div>
        <DialogFooter>
          <Button variant="ghost" disabled={sending} onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button disabled={sending} onClick={onSend}>{sending ? "Sending…" : "Send"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}