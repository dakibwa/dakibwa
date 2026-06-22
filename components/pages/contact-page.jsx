"use client";

import { ArrowRight, LockKeyhole } from "lucide-react";
import { PageFooter } from "@/components/page-footer";
import { contactEmail } from "@/components/site-data";

const contactNotes = [
  ["Bring the awkward middle", "A process, report, spreadsheet, source folder, or rough idea that is taking too much attention."],
  ["Keep examples sanitized", "A screenshot, tool list, or example flow helps. Keep credentials and private identifiers out."],
  ["Expect a practical read", "I will look for the smallest useful system, not a theatre demo or a giant transformation programme."],
  ["Manchester-based", "UK time, remote-friendly, happy to work async until a live conversation is genuinely useful."]
];

const enquiryTypes = [
  "Workflow / operations",
  "Dashboard / reporting",
  "Automation / internal tool",
  "Private knowledge system",
  "Prototype / rough idea",
  "Not sure yet"
];

export function ContactPage() {
  const handleSubmit = (event) => {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const fields = [
      ["What's the messy bit?", formData.get("problem")],
      ["Best reply email", formData.get("email")],
      ["Type of work", formData.get("type")],
      ["What does it touch today?", formData.get("current")],
      ["What would make it worth doing?", formData.get("outcome")],
      ["Preferred timing", formData.get("timing")]
    ];
    const body = fields
      .map(([label, value]) => [label, value?.toString().trim()])
      .filter(([, value]) => value)
      .map(([label, value]) => `${label}\n${value}`)
      .join("\n\n");

    const subject = encodeURIComponent("Akibwa enquiry");
    const message = encodeURIComponent(body || "Hi Daniel,");
    window.location.href = `mailto:${contactEmail}?subject=${subject}&body=${message}`;
  };

  return (
    <section className="studio-page contact-page-new">
      <section className="page-grid contact-layout">
        <div className="contact-form-side">
          <header>
            <h1>Contact</h1>
            <p>Send the messy bit.</p>
            <span>A short note is enough: what is broken, what it touches, and what good would look like.</span>
            <p className="contact-direct">
              <i aria-hidden="true" />
              <span>
                Prefer plain email? <a href={`mailto:${contactEmail}`}>{contactEmail}</a>
              </span>
            </p>
          </header>
        </div>

        <div className="contact-art-side">
          <aside className="contact-note-card" aria-label="What to include">
            <header>
              <span>Good first note</span>
              <h2>Send the shape, not secrets.</h2>
            </header>
            {contactNotes.map(([title, body]) => (
              <div key={title}>
                <i aria-hidden="true" />
                <p>
                  <strong>{title}</strong>
                  <span>{body}</span>
                </p>
              </div>
            ))}
          </aside>

          <div className="door-art" aria-hidden="true">
            <span className="door-plane" />
            <span className="door-frame" />
            <span className="door-path" />
            <span className="door-cursor" />
          </div>
        </div>

        <form
          className="contact-form"
          onSubmit={handleSubmit}
        >
          <label>
            What&apos;s the messy bit?
            <textarea
              name="problem"
              placeholder="Describe the problem, the goal, or what's getting in the way."
              required
            />
          </label>
          <label>
            Best reply email
            <input name="email" type="email" placeholder="hello@company.com" />
          </label>
          <div className="contact-actions">
            <button type="submit">
              Open email draft
              <ArrowRight aria-hidden="true" size={18} strokeWidth={1.8} />
            </button>
            <p>
              <LockKeyhole aria-hidden="true" size={18} strokeWidth={1.6} />
              <span>
                Opens your email app.
                <br />
                Nothing is sent here.
              </span>
            </p>
          </div>
          <details className="contact-extra-fields">
            <summary>
              <span>Optional context</span>
              <small>type, tools, outcome, timing</small>
            </summary>
            <div>
              <label>
                What kind of work is it?
                <select name="type" defaultValue="">
                  <option value="" disabled>
                    Choose the closest shape
                  </option>
                  {enquiryTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                What does it touch today?
                <input name="current" placeholder="Tools, files, dashboards, hand-offs, people." />
              </label>
              <label>
                What would make it worth doing?
                <input name="outcome" placeholder="Clearer report, fewer steps, reusable process." />
              </label>
              <label>
                Preferred timing
                <input name="timing" placeholder="e.g. this month, Q3, exploring options" />
              </label>
            </div>
          </details>
        </form>
      </section>

      <PageFooter />
    </section>
  );
}
