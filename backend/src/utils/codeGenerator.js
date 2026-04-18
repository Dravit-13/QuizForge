const Quiz = require('../models/Quiz');

// Excludes visually ambiguous characters (0, O, 1, I, L)
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function randomCode(len = 6) {
  return Array.from(
    { length: len },
    () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)]
  ).join('');
}

async function generateUniqueCode() {
  let code;
  do {
    code = randomCode();
  } while (await Quiz.exists({ quizCode: code }));
  return code;
}

module.exports = { generateUniqueCode };
