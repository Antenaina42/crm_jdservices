interface RateLimitEntry {
  attempts: number[];
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Nettoyage régulier des entrées expirées (toutes les 10 minutes)
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimitStore.entries()) {
      entry.attempts = entry.attempts.filter((timestamp) => now - timestamp < 60 * 60 * 1000);
      if (entry.attempts.length === 0) {
        rateLimitStore.delete(key);
      }
    }
  }, 10 * 60 * 1000).unref?.();
}

export interface RateLimitResult {
  allowed: boolean;
  remainingAttempts: number;
  retryAfterSeconds: number;
}

/**
 * Vérifie si une clé a dépassé son quota de tentatives.
 */
export function checkRateLimit(
  key: string,
  maxAttempts = 5,
  windowMs = 15 * 60 * 1000
): RateLimitResult {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry) {
    return {
      allowed: true,
      remainingAttempts: maxAttempts,
      retryAfterSeconds: 0,
    };
  }

  // Filtrer les tentatives dans la fenêtre active
  const recentAttempts = entry.attempts.filter((timestamp) => now - timestamp < windowMs);
  entry.attempts = recentAttempts;

  if (recentAttempts.length >= maxAttempts) {
    const oldest = recentAttempts[0];
    const retryAfterMs = Math.max(0, windowMs - (now - oldest));
    return {
      allowed: false,
      remainingAttempts: 0,
      retryAfterSeconds: Math.ceil(retryAfterMs / 1000),
    };
  }

  return {
    allowed: true,
    remainingAttempts: maxAttempts - recentAttempts.length,
    retryAfterSeconds: 0,
  };
}

/**
 * Enregistre un échec pour une clé donnée.
 */
export function recordFailure(key: string): void {
  const now = Date.now();
  const entry = rateLimitStore.get(key);
  if (!entry) {
    rateLimitStore.set(key, { attempts: [now] });
  } else {
    entry.attempts.push(now);
  }
}

/**
 * Réinitialise le compteur après un succès.
 */
export function resetRateLimit(key: string): void {
  rateLimitStore.delete(key);
}
