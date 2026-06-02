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
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { adminSetUserRoles } from "@/lib/admin.functions";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  userId: string;
  userName: string;
  initialRoles: string[];
  onSaved: (roles: string[]) => void;
};

const ALL_ROLES: Array<{ id: "dealer" | "jeweller" | "admin"; label: string }> = [
  { id: "dealer", label: "Dealer" },
  { id: "jeweller", label: "Jeweller" },
  { id: "admin", label: "Admin" },
];

export function EditRolesDialog({ open, onOpenChange, userId, userName, initialRoles, onSaved }: Props) {
  const [roles, setRoles] = useState<Set<string>>(new Set(initialRoles));
  const [saving, setSaving] = useState(false);
  const setRolesFn = useServerFn(adminSetUserRoles);

  function toggle(role: string) {
    const next = new Set(roles);
    if (next.has(role)) next.delete(role);
    else next.add(role);
    setRoles(next);
  }

  async function save() {
    if (roles.size === 0) {
      toast.error("Pick at least one role.");
      return;
    }
    setSaving(true);
    try {
      const result = await setRolesFn({
        data: { targetUserId: userId, roles: Array.from(roles) as ("dealer" | "jeweller" | "admin")[] },
      });
      const created: string[] = [];
      if (result.dealerProfileCreated) created.push("dealer profile");
      if (result.jewellerProfileCreated) created.push("jeweller profile");
      toast.success(
        created.length
          ? `Roles updated. Created ${created.join(" + ")} — ask the user to complete it at /dashboard.`
          : "Roles updated.",
      );
      onSaved(result.roles);
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update roles.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit roles — {userName}</DialogTitle>
          <DialogDescription>Toggle which dashboards this user can access.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          {ALL_ROLES.map((r) => (
            <label key={r.id} className="flex items-center gap-3 rounded-md border border-border px-3 py-2 cursor-pointer hover:bg-muted/30">
              <Checkbox checked={roles.has(r.id)} onCheckedChange={() => toggle(r.id)} />
              <span className="text-sm font-medium">{r.label}</span>
            </label>
          ))}
          <p className="text-xs text-muted-foreground pt-2">
            Users with both Dealer and Jeweller will see both dashboards. Granting a new role auto-creates the matching profile row.
          </p>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}