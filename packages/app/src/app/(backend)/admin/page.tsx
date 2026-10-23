import { SystemStatus } from "./system-status";

export default function AdminPage() {
  return (
    <section className="flex flex-col items-start gap-6">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <SystemStatus />
    </section>
  );
}
