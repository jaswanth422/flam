export const ErrorKind = {
  NETWORK: "NETWORK",
  TIMEOUT: "TIMEOUT",
  RATE_LIMIT: "RATE_LIMIT",
  SERVER: "SERVER",
  TRUNCATED: "TRUNCATED",
  UNPARSEABLE: "UNPARSEABLE",
  WRONG_SHAPE: "WRONG_SHAPE",
  EMPTY: "EMPTY",
};

const errorDetails = {
  [ErrorKind.NETWORK]: {
    message: "We couldn’t reach the study service. Check your connection and try again.",
    retryable: true,
  },
  [ErrorKind.TIMEOUT]: {
    message: "That took longer than expected. Try again with a shorter passage.",
    retryable: true,
  },
  [ErrorKind.RATE_LIMIT]: {
    message: "The study service is busy. Wait a moment, then try again.",
    retryable: true,
  },
  [ErrorKind.SERVER]: {
    message: "The study service hit a snag. Your notes are safe—please retry.",
    retryable: true,
  },
  [ErrorKind.TRUNCATED]: {
    message: "The response ran out of room. Try generating fewer cards.",
    retryable: true,
  },
  [ErrorKind.UNPARSEABLE]: {
    message: "We couldn’t turn that response into cards. Please try again.",
    retryable: true,
  },
  [ErrorKind.WRONG_SHAPE]: {
    message: "The generated deck had the wrong format. Please retry.",
    retryable: true,
  },
  [ErrorKind.EMPTY]: {
    message: "No usable cards came back. Add more detail to your notes and try again.",
    retryable: true,
  },
};

export function messageFor(kind) {
  return errorDetails[kind]?.message ?? errorDetails[ErrorKind.SERVER].message;
}

export function errorFor(kind) {
  const details = errorDetails[kind] ?? errorDetails[ErrorKind.SERVER];
  return { kind, message: details.message, retryable: details.retryable };
}
