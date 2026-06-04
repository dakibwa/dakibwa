import { vitalsAppUrl } from "@/components/site-data";
import { VitalsDashboardPreview } from "@/components/vitals-dashboard-preview";

export const metadata = {
  title: "Vitals App",
  description:
    "The live Vitals app route for health signal review."
};

export default function HealthRoute() {
  return (
    <section className="health-page" aria-label="Vitals">
      {vitalsAppUrl ? (
        <div className="vitals-app-shell">
          <iframe
            src={vitalsAppUrl}
            title="Vitals live app"
            className="vitals-app-frame"
            allow="clipboard-read; clipboard-write"
          />
        </div>
      ) : (
        <VitalsDashboardPreview />
      )}
    </section>
  );
}
