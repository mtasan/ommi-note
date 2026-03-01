export const NOTE_COLORS = [
  { name: "yellow", bg: "#FFF9C4", border: "#FFF176" },
  { name: "green", bg: "#C8E6C9", border: "#81C784" },
  { name: "blue", bg: "#BBDEFB", border: "#64B5F6" },
  { name: "purple", bg: "#E1BEE7", border: "#BA68C8" },
  { name: "pink", bg: "#F8BBD0", border: "#F06292" },
  { name: "orange", bg: "#FFE0B2", border: "#FFB74D" },
  { name: "teal", bg: "#B2DFDB", border: "#4DB6AC" },
  { name: "red", bg: "#FFCDD2", border: "#E57373" },
] as const;

export type NoteColorName = (typeof NOTE_COLORS)[number]["name"];

export function getRandomColor() {
  return NOTE_COLORS[Math.floor(Math.random() * NOTE_COLORS.length)];
}

export function getColorByName(name: string) {
  return NOTE_COLORS.find((c) => c.name === name) ?? NOTE_COLORS[0];
}
