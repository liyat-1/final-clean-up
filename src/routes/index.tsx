import { createFileRoute } from "@tanstack/react-router";

import { Dashboard } from "@/components/dashboard/Dashboard";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Guests You Can Reach — Directful Analytics" },
      {
        name: "description",
        content:
          "See how many guests your hotel can reach today, and exactly what Level 1 and Level 2 enrichment added along the way.",
      },
      { property: "og:title", content: "Guests You Can Reach — Directful Analytics" },
      {
        property: "og:description",
        content:
          "Guest reach by source, property and date range: starting point, Level 1, Level 2 and what is still possible.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => <Dashboard plan="l2" />,
});
