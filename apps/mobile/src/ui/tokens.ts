import { theme } from "../theme";

// Mobile reference values absent from the current generated token snapshot.
// Keep the additions here until the parallel core-token brief supplies them.
export const ui = {
  ...theme,
  mobile: { timelineViewport: 380 },
  type: {
    body: theme.typeSizes[8],
    meta: theme.typeSizes[4],
    section: theme.typeSizes[6],
    title: 26,
    value: 38,
  },
  control: {
    touch: theme.layout.controlHeight,
    visual: 36,
    row: theme.layout.phoneTabHeight,
    task: theme.layout.hourHeight,
  },
};
