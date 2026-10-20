import { Button } from "@devmentor/ui/components/button";

export default function AdminHome() {
  return (
    <section className="flex flex-col items-start gap-4">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <p className="text-muted-foreground">The admin area is ready.</p>
      <Button>Get started</Button>
    </section>
  );
}
