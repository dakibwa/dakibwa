import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PageFooter } from "@/components/page-footer";

export const metadata = {
  title: "Vitals | Daniel Atkinson",
  description:
    "A public pointer to Daniel Atkinson's private local Vitals dashboard."
};

export default function HealthRoute() {
  return (
    <section className="studio-page about-page">
      <section className="page-grid studio-hero">
        <h1>Vitals</h1>
        <p>
          A private local dashboard for health signals, source freshness,
          trends, and review prompts.
        </p>
      </section>

      <section className="page-grid route-note">
        <p>
          The working dashboard and source data stay private. The public site
          keeps this as a non-sensitive project summary.
        </p>
        <Link href="/personal#vitals" prefetch>
          View the project
          <ArrowRight size={18} strokeWidth={1.8} />
        </Link>
      </section>

      <PageFooter />
    </section>
  );
}
