import { VitalsDashboardPreview } from "@/components/vitals-dashboard-preview";

export const metadata = {
  title: "Vitals",
  description:
    "A live aggregate Vitals Health Dashboard view."
};

export default function HealthRoute() {
  return (
    <section className="health-page">
      <VitalsDashboardPreview />
    </section>
  );
}
