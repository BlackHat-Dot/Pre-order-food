import { createFileRoute, Link } from "@tanstack/react-router";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/unauthorized")({
  component: () => (
    <div className="grid min-h-screen place-items-center px-4 text-center">
      <div className="max-w-md">
        <ShieldAlert className="mx-auto h-12 w-12 text-primary" />
        <h1 className="mt-4 text-3xl font-bold">Not authorized</h1>
        <p className="mt-2 text-muted-foreground">
          You don't have access to that page with your current role.
        </p>
        <Link to="/" className="mt-6 inline-block">
          <Button>Go home</Button>
        </Link>
      </div>
    </div>
  ),
});
