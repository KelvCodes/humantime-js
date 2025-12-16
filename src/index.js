"
      if (short) {
        const label = SHORT_LABELS[unit];
        return value > 0
          ? `${Math.abs(value)}${label} ago`
          : `in ${Math.abs(value)}${label}`;
      }

      // Localized long format
      return rtf.format(-value, unit);
    }
  }

  return locale.startsWith('en') ? 'just now' : rtf.format(0, 'second');
}










































































