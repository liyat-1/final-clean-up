import { createFileRoute } from "@tanstack/react-router";

import { Dashboard } from "@/components/dashboard/Dashboard";

export const Route = createFileRoute("/level-1")({
  head: () => ({
    meta: [
      { title: "Level 1 Reach — Directful Analytics" },
      {
        name: "description",
        content:
          "For hotels on Level 1: see the guests Level 1 made reachable, the opportunity still open, and what Level 2 enrichment could add.",
      },
      { property: "og:title", content: "Level 1 Reach — Directful Analytics" },
      {
        property: "og:description",
        content:
          "Guests made reachable by Level 1, broken down by email, phone and address, plus the remaining opportunity.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => <Dashboard plan="l1" />,
});
