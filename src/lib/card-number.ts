import { prisma } from './prisma';

export function randomSixDigitCard() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function generateUniqueCardNumber(maxTries = 80) {
  for (let i = 0; i < maxTries; i++) {
    const cardNumber = randomSixDigitCard();
    const exists = await prisma.user.findUnique({ where: { cardNumber }, select: { id: true } });
    if (!exists) return cardNumber;
  }
  throw new Error('Unable to generate unique six digit card number');
}
