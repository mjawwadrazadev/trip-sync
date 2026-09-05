// Converts numeric currency values into English words
const ones = [
  "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
  "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
  "Seventeen", "Eighteen", "Nineteen",
];

const tens = [
  "", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety",
];

function convertLessThanThousand(n: number): string {
  if (n === 0) return "";
  if (n < 20) return ones[n];
  if (n < 100) {
    return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? " " + ones[n % 10] : "");
  }
  return (
    ones[Math.floor(n / 100)] +
    " Hundred" +
    (n % 100 !== 0 ? " " + convertLessThanThousand(n % 100) : "")
  );
}

export function numberToWords(num: number, currency: string = "Rupees"): string {
  if (isNaN(num) || num === 0) return "Zero " + currency + " Only";

  let n = Math.floor(Math.abs(num));
  if (n === 0) return "Zero " + currency + " Only";

  let words = "";

  // Billions
  if (Math.floor(n / 1_000_000_000) > 0) {
    words += convertLessThanThousand(Math.floor(n / 1_000_000_000)) + " Billion ";
    n %= 1_000_000_000;
  }

  // Millions / Crores
  if (Math.floor(n / 1_000_000) > 0) {
    words += convertLessThanThousand(Math.floor(n / 1_000_000)) + " Million ";
    n %= 1_000_000;
  }

  // Thousands
  if (Math.floor(n / 1_000) > 0) {
    words += convertLessThanThousand(Math.floor(n / 1_000)) + " Thousand ";
    n %= 1_000;
  }

  // Remaining < 1000
  if (n > 0) {
    words += convertLessThanThousand(n) + " ";
  }

  // Cents / Paisas
  const decimals = Math.round((Math.abs(num) - Math.floor(Math.abs(num))) * 100);
  let decimalPart = "";
  if (decimals > 0) {
    decimalPart = " and " + convertLessThanThousand(decimals) + " Paisas";
  }

  return (words.trim() + " " + currency + decimalPart + " Only").replace(/\s+/g, " ");
}
