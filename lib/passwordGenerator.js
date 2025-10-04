// Character sets for password generation
const LOWERCASE = 'abcdefghijklmnopqrstuvwxyz';
const UPPERCASE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const NUMBERS = '0123456789';
const SYMBOLS = '!@#$%^&*()_+-=[]{}|;:,.<>?';

// Look-alike characters to exclude
const LOOKALIKES = '0O1lI';

export function generatePassword(options = {}) {
  const {
    length = 16,
    includeLowercase = true,
    includeUppercase = true,
    includeNumbers = true,
    includeSymbols = true,
    excludeLookalikes = true,
  } = options;

  let charset = '';
  
  if (includeLowercase) charset += LOWERCASE;
  if (includeUppercase) charset += UPPERCASE;
  if (includeNumbers) charset += NUMBERS;
  if (includeSymbols) charset += SYMBOLS;

  if (excludeLookalikes) {
    charset = charset.split('').filter(char => !LOOKALIKES.includes(char)).join('');
  }

  if (!charset) {
    throw new Error('At least one character type must be selected');
  }

  // Generate password using crypto.getRandomValues for better randomness
  const password = [];
  const array = new Uint32Array(length);
  crypto.getRandomValues(array);

  for (let i = 0; i < length; i++) {
    password.push(charset[array[i] % charset.length]);
  }

  return password.join('');
}

export function calculatePasswordStrength(password) {
  if (!password) return { score: 0, label: 'None', color: 'bg-gray-300' };

  let score = 0;
  
  // Length
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (password.length >= 16) score += 1;
  
  // Character diversity
  if (/[a-z]/.test(password)) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^a-zA-Z0-9]/.test(password)) score += 1;

  // Normalize to 0-4 scale
  score = Math.min(4, Math.floor(score / 2));

  const levels = [
    { score: 0, label: 'Very Weak', color: 'bg-red-500' },
    { score: 1, label: 'Weak', color: 'bg-orange-500' },
    { score: 2, label: 'Fair', color: 'bg-yellow-500' },
    { score: 3, label: 'Strong', color: 'bg-green-500' },
    { score: 4, label: 'Very Strong', color: 'bg-green-600' },
  ];

  return levels[score];
}