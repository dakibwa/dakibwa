import { vitalsAppUrl } from "@/components/site-data";
import { VitalsDashboardPreview } from "@/components/vitals-dashboard-preview";

export const metadata = {
  title: "Vitals",
  description:
    "Vitals is an Akibwa dashboard for public aggregate health signals, WHOOP trends, sleep, recovery, strain, and review prompts."
};

export default function HealthRoute() {
  return (
    <section className="project-surface-page health-page" aria-label="Vitals">
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
