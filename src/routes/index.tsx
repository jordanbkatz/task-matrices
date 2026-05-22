import { createFileRoute } from "@tanstack/react-router";
import App from "@/App";

export const Route = createFileRoute("/")({
  component: App,
  head: () => ({
    meta: [
      { title: "Task Matrix" },
      {
        name: "description",
        content: "Plot your tasks on a matrix by urgency and importance. Drag to reprioritize.",
      },
    ],
  }),
});
