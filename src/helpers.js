const superheroes = require("superheroes");

function shuffleArray(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function getRandomInt(max) {
  return Math.floor(Math.random() * Math.floor(max));
}

function getRandomUsername() {
  return superheroes.random();
}

module.exports = {
  shuffleArray,
  getRandomInt,
  getRandomUsername,
};
