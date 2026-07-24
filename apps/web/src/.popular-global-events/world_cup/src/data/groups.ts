export interface Group {
  letter: string;
  teams: { code: string; name: string }[];
}

export const groups: Group[] = [
  {
    letter: "A",
    teams: [
      { code: "mx", name: "MEX" },
      { code: "za", name: "RSA" },
      { code: "kr", name: "KOR" },
      { code: "cz", name: "CZE" },
    ],
  },
  {
    letter: "B",
    teams: [
      { code: "ca", name: "CAN" },
      { code: "ba", name: "BIH" },
      { code: "qa", name: "QAT" },
      { code: "ch", name: "SUI" },
    ],
  },
  {
    letter: "C",
    teams: [
      { code: "br", name: "BRA" },
      { code: "ma", name: "MAR" },
      { code: "ht", name: "HAI" },
      { code: "gb-sct", name: "SCO" },
    ],
  },
  {
    letter: "D",
    teams: [
      { code: "us", name: "USA" },
      { code: "py", name: "PAR" },
      { code: "au", name: "AUS" },
      { code: "tr", name: "TUR" },
    ],
  },
  {
    letter: "E",
    teams: [
      { code: "de", name: "GER" },
      { code: "ci", name: "CIV" },
      { code: "cw", name: "CUR" },
      { code: "ec", name: "ECU" },
    ],
  },
  {
    letter: "F",
    teams: [
      { code: "nl", name: "NED" },
      { code: "jp", name: "JPN" },
      { code: "se", name: "SWE" },
      { code: "tn", name: "TUN" },
    ],
  },
  {
    letter: "G",
    teams: [
      { code: "be", name: "BEL" },
      { code: "eg", name: "EGY" },
      { code: "ir", name: "IRN" },
      { code: "nz", name: "NZL" },
    ],
  },
  {
    letter: "H",
    teams: [
      { code: "es", name: "ESP" },
      { code: "cv", name: "CPV" },
      { code: "sa", name: "KSA" },
      { code: "uy", name: "URU" },
    ],
  },
  {
    letter: "I",
    teams: [
      { code: "fr", name: "FRA" },
      { code: "sn", name: "SEN" },
      { code: "iq", name: "IRQ" },
      { code: "no", name: "NOR" },
    ],
  },
  {
    letter: "J",
    teams: [
      { code: "ar", name: "ARG" },
      { code: "dz", name: "ALG" },
      { code: "at", name: "AUT" },
      { code: "jo", name: "JOR" },
    ],
  },
  {
    letter: "K",
    teams: [
      { code: "pt", name: "POR" },
      { code: "cg", name: "CGO" },
      { code: "uz", name: "UZB" },
      { code: "co", name: "COL" },
    ],
  },
  {
    letter: "L",
    teams: [
      { code: "gb-eng", name: "ENG" },
      { code: "hr", name: "CRO" },
      { code: "gh", name: "GHA" },
      { code: "pa", name: "PAN" },
    ],
  },
];
