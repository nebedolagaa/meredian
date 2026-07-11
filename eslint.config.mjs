import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const eslintConfig = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    // Pre-existing "setState on mount" patterns in these files predate this
    // rule, which eslint-config-next 16 enables as an error by default.
    // Scoped to just these files pending a dedicated cleanup pass, so the
    // rule stays an error everywhere else.
    files: [
      "app/(app)/calendar/CalendarView.tsx",
      "components/session/QuickAdd.tsx",
      "components/settings/FeedbackToggles.tsx",
      "components/theme/ThemeProvider.tsx",
      "components/tour/GuidedTour.tsx",
      "components/ui/CountUp.tsx",
      "lib/hooks/useReducedMotion.ts",
    ],
    rules: {
      "react-hooks/set-state-in-effect": "warn",
    },
  },
];

export default eslintConfig;
