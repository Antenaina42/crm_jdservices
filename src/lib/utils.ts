import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency: string = "EUR"): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDateFr(date: Date | string | null | undefined): string {
  if (!date) return "-";
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
}

export function formatDateTimeFr(date: Date | string | null | undefined): string {
  if (!date) return "-";
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

// Convert numbers to French words (e.g. 1200 -> "mille deux cents euros")
export function numberToWordsFr(amount: number): string {
  const units = ["", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf"];
  const teens = ["dix", "onze", "douze", "treize", "quatorze", "quinze", "seize", "dix-sept", "dix-huit", "dix-neuf"];
  const tens = ["", "dix", "vingt", "trente", "quarante", "cinquante", "soixante", "soixante-dix", "quatre-vingts", "quatre-vingt-dix"];

  function convertGroup(n: number): string {
    let res = "";
    const h = Math.floor(n / 100);
    const rem = n % 100;

    if (h > 0) {
      if (h === 1) res += "cent ";
      else res += units[h] + " cent" + (rem === 0 ? "s " : " ");
    }

    if (rem > 0) {
      if (rem < 10) {
        res += units[rem] + " ";
      } else if (rem < 20) {
        res += teens[rem - 10] + " ";
      } else {
        const t = Math.floor(rem / 10);
        const u = rem % 10;
        if (t === 7) {
          res += "soixante-" + (u === 1 ? "et-onze " : teens[u] + " ");
        } else if (t === 9) {
          res += "quatre-vingt-" + teens[u] + " ";
        } else {
          let tWord = tens[t];
          if (t === 8 && u === 0) tWord = "quatre-vingts";
          else if (t === 8) tWord = "quatre-vingt";

          if (u === 1 && t !== 8) {
            res += tWord + " et un ";
          } else if (u > 0) {
            res += tWord + "-" + units[u] + " ";
          } else {
            res += tWord + " ";
          }
        }
      }
    }
    return res.trim();
  }

  const integerPart = Math.floor(Math.abs(amount));
  const decimalPart = Math.round((Math.abs(amount) - integerPart) * 100);

  if (integerPart === 0 && decimalPart === 0) return "zéro euro";

  let words = "";

  const millions = Math.floor(integerPart / 1000000);
  const thousands = Math.floor((integerPart % 1000000) / 1000);
  const remainder = integerPart % 1000;

  if (millions > 0) {
    words += (millions === 1 ? "un million " : convertGroup(millions) + " millions ");
  }

  if (thousands > 0) {
    words += (thousands === 1 ? "mille " : convertGroup(thousands) + " mille ");
  }

  if (remainder > 0) {
    words += convertGroup(remainder) + " ";
  }

  words = words.trim();
  words += (integerPart > 1 ? " euros" : " euro");

  if (decimalPart > 0) {
    words += " et " + convertGroup(decimalPart) + (decimalPart > 1 ? " centimes" : " centime");
  }

  return words.trim();
}
