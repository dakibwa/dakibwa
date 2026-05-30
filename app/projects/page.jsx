import { PersonalPage } from "@/components/pages/personal-page";

export const metadata = {
  title: "Personal | Daniel Atkinson",
  description:
    "Personal projects by Daniel Atkinson, including Sonic FM, Vitals, cover-art experiments, and a private knowledge system."
};

export default function ProjectsRoute() {
  return <PersonalPage />;
}
