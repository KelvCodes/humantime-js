e)}${labels[uo`
          : `in ${Math.abs(value)}${labels[unit]}`;
      } else {
        // Intl.RelativeTimeFormat expects negative for past
        return rtf.format(-value, unit);
      }
    }
  }

  return locale.startsWith('en') ? 'just now' : rtf.format(0, 'second');
}
























































