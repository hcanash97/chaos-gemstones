import { createFileRoute } from "@tanstack/react-router";
import { SignUpForm } from "./sign-up.dealer";

export const Route = createFileRoute("/sign-up/jeweller")({
  component: () => <SignUpForm accountType="jeweller" />,
});