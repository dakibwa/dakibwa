import { VitalsDashboardPreview } from "@/components/vitals-dashboard-preview";

export const metadata = {
  title: "Vitals",
  description:
    "A public-safe Vitals Health Dashboard preview."
};

export default function HealthRoute() {
  return (
    <section className="health-page">
      <VitalsDashboardPreview />
    </section>
  );
}
