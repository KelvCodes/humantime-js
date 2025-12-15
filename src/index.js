abel, seconds } of thresholds) {
    )}${shortMap[label]}`;
      }

      // Default → localized long form
      return formatter.format(-interval, label);
    }
  }

  return 'just now';
}

// ---------------- Example Usage ----------------
console.log(timeAgo(new Date(Date.now() - 45 * 1000)));      // "45 seconds ago"
console.log(timeAgo(new Date(Date.now() - 5 * 60000)));     // "5 minutes ago"
console.log(timeAgo(new Date(Date.now() - 86400000)));      // "yesterday"
console.log(timeAgo(new Date(Date.now() + 3600000)));       // "in 1 hour"
console.log(timeAgo("2025-01-01T00:00:00Z", 'fr'));         // "il y a 7 mois"
console.log(timeAgo(Date.now() - 7200000, 'en', true));     // "2h ago"
console.log(timeAgo(Date.now() + 3 * 86400000, 'en', true)); // "in 3d"








































































































































