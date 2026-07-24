export interface AwardPlayer {
  name: string;
  percent: number;
  image: string;
}

export interface AwardCategory {
  title: string;
  graphic: string;
  players: AwardPlayer[];
}

export const awardCategories: AwardCategory[] = [
  {
    title: "2026 FIFA World Cup: Top Goalscorer",
    graphic: "/images/award-goalscorer.jpg",
    players: [
      { name: "Erling Haaland", percent: 50, image: "/images/player-haaland.jpg" },
      { name: "Mikel Oyarzabal", percent: 50, image: "/images/player-oyarzabal.jpg" },
      { name: "Ousmane Dembélé", percent: 50, image: "/images/player-dembele.jpg" },
      { name: "Lionel Messi", percent: 50, image: "/images/player-messi.jpg" },
      { name: "Cristiano Ronaldo", percent: 50, image: "/images/player-ronaldo.jpg" },
    ],
  },
  {
    title: "2026 FIFA World Cup: Most Assists",
    graphic: "/images/award-assists.jpg",
    players: [
      { name: "Rodrigo De Paul", percent: 50, image: "/images/player-de-paul.jpg" },
      { name: "Ajdin Hrustic", percent: 50, image: "/images/player-hrustic.jpg" },
      { name: "Aymen Hussein", percent: 50, image: "/images/player-hussein.jpg" },
      { name: "Raphinha", percent: 50, image: "/images/player-raphinha.jpg" },
      { name: "Riyad Mahrez", percent: 50, image: "/images/player-mahrez.jpg" },
    ],
  },
  {
    title: "2026 FIFA World Cup: Most Clean Sheets (GK)",
    graphic: "/images/award-cleansheets.jpg",
    players: [
      { name: "Ørjan Nyland", percent: 50, image: "/images/player-nyland.jpg" },
      { name: "Angus Gunn", percent: 50, image: "/images/player-gunn.jpg" },
      { name: "Ronwen Williams", percent: 50, image: "/images/player-williams.jpg" },
      { name: "Patrick Pentz", percent: 50, image: "/images/player-pentz.jpg" },
      { name: "Mohamed El-Shenawy", percent: 50, image: "/images/player-el-shenawy.jpg" },
    ],
  },
];
