export interface Match {
  group: string;
  date: string;
  team1: { name: string; code: string; percent: number };
  team2: { name: string; code: string; percent: number };
}

export const matches: Match[] = [
  {
    group: "Group A",
    date: "June 12, 3:00 AM",
    team1: { name: "Mexico", code: "mx", percent: 71 },
    team2: { name: "South Africa", code: "za", percent: 13 },
  },
  {
    group: "Group A",
    date: "June 12, 10:00 AM",
    team1: { name: "South Korea", code: "kr", percent: 38 },
    team2: { name: "Czech Republic", code: "cz", percent: 34 },
  },
  {
    group: "Group B",
    date: "June 13, 3:00 AM",
    team1: { name: "Canada", code: "ca", percent: 54 },
    team2: { name: "Bosnia & Herzegovina", code: "ba", percent: 22 },
  },
  {
    group: "Group D",
    date: "June 13, 9:00 AM",
    team1: { name: "USA", code: "us", percent: 51 },
    team2: { name: "Paraguay", code: "py", percent: 45 },
  },
];
