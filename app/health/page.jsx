import Image from "next/image";
import { PageFooter } from "@/components/page-footer";

export const metadata = {
  title: "Vitals",
  description:
    "A public-safe note about the private Vitals health signal system."
};

export default function HealthRoute() {
  return (
    <section className="studio-page personal-page">
      <section className="page-grid featured-case personal-static-case">
        <div className="case-copy">
          <span>Private system</span>
          <h1>Vitals</h1>
          <p>
            Vitals is a local health signal system. The public site keeps the project shape visible without publishing
            health figures, source rows, or private review notes.
          </p>
          <dl>
            <div>
              <dt>
                <i />
                Data boundary
              </dt>
              <dd>Private health data stays outside the public site and repository.</dd>
            </div>
            <div>
              <dt>
                <i />
                Product shape
              </dt>
              <dd>Source freshness, trends, and review prompts for clinician conversations.</dd>
            </div>
          </dl>
        </div>
        <div className="case-art" aria-hidden="true">
          <Image src="/area-art/systems.png" alt="" width={760} height={360} priority />
          <div className="case-score">
            <strong>VT</strong>
          </div>
          <ul>
            <li>
              Boundary <span>Private data</span>
            </li>
            <li>
              Sources <span>Local only</span>
            </li>
            <li>
              Output <span>Review prompts</span>
            </li>
          </ul>
        </div>
      </section>
      <PageFooter />
    </section>
  );
}
