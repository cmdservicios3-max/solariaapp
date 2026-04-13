
const crypto = require('crypto');

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

const targets = [
  'admin123',
  'admin123!',
  'Admin123!',
  '123456',
  'Solange',
  'solange',
  'Solange.vieyra@gmail.com'
];

targets.forEach(t => console.log(`${t}: ${hashPassword(t)}`));
