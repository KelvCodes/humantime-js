00  
 Ifformat(-interval, label);
    }
  }

  // If the difference is less than 1 second
  return 'just now';
}

// ---------------- Example Usage ----------------
console.log(timeAgo(new Date(Date.now() - 45 * 1000)));   // "45 seconds ago"
console.log(timeAgo(new Date(Date.now() - 5 * 60000)));  // "5 minutes ago"
console.log(timeAgo(new Date(Date.now() - 86400000)));   // "yesterday"
console.log(timeAgo(new Date(Date.now() + 3600000)));    // "in 1 hour"
console.log(timeAgo("2025-01-01T00:00:00Z", 'fr'));      // "il y a 7 mois" (French)

























































