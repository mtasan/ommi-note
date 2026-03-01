export const NOTE_COLORS = [
  { name: "blue", bg: "#BBDEFB", border: "#64B5F6", icon: "ellipse-outline" },
  { name: "yellow", bg: "#FFF9C4", border: "#FFF176", icon: "time-outline" },
  { name: "green", bg: "#C8E6C9", border: "#81C784", icon: "checkmark-circle-outline" },
  { name: "red", bg: "#FFCDD2", border: "#E57373", icon: "alert-circle-outline" },
] as const;

export type NoteColorName = (typeof NOTE_COLORS)[number]["name"];

export const DEFAULT_COLOR: NoteColorName = "blue";

export function getColorByName(name: string) {
  return NOTE_COLORS.find((c) => c.name === name) ?? NOTE_COLORS[0];
}
