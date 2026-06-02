import { ProjectAppGate } from "@/components/project-app-gate";
import { vitalsAppUrl } from "@/components/site-data";

export const metadata = {
  title: "Vitals App",
  description:
    "The live Vitals app route for health signal review."
};

export default function HealthRoute() {
  return (
    <section className="health-page">
      <ProjectAppGate
        appUrl={vitalsAppUrl}
        description="The live health app runs separately from the public site."
        envHint="NEXT_PUBLIC_VITALS_APP_URL"
        kind="vitals"
        name="Vitals"
        previewHref="/personal#vitals"
      />
    </section>
  );
}
