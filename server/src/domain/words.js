export const THEMES = [
  { theme: "Praia", word: "Praia" },
  { theme: "Comida", word: "Pizza" },
  { theme: "Comida", word: "Churrasco" },
  { theme: "Lugar", word: "Hospital" },
  { theme: "Lugar", word: "Escola" },
  { theme: "Lugar", word: "Aeroporto" },
  { theme: "Animal", word: "Elefante" },
  { theme: "Animal", word: "Pinguim" },
  { theme: "Profissão", word: "Bombeiro" },
  { theme: "Profissão", word: "Professor" },
  { theme: "Objeto", word: "Guarda-chuva" },
  { theme: "Objeto", word: "Celular" },
  { theme: "Esporte", word: "Futebol" },
  { theme: "Esporte", word: "Natação" },
  { theme: "Filme", word: "Titanic" },
];

export function pickRandomThemeWord() {
  return THEMES[Math.floor(Math.random() * THEMES.length)];
}
