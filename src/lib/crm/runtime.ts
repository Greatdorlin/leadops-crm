function getCrmPageErrorDetails(error: unknown) {
  if (process.env.NODE_ENV !== "development") {
    return null;
  }

  if (error instanceof Error) {
    return error.stack || `${error.name}: ${error.message}`;
  }

  if (typeof error === "string") {
    return error;
  }

  try {
    return JSON.stringify(error, null, 2);
  } catch {
    return String(error);
  }
}

export function isCrmConfigurationError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  return (
    error.message.includes("Database URL is not configured") ||
    error.message.includes("Database URL is invalid")
  );
}

export function getCrmPageErrorCopy(error: unknown) {
  const details = getCrmPageErrorDetails(error);

  if (isCrmConfigurationError(error)) {
    return {
      title: "Live lead data is not connected here yet",
      description:
        "The workspace loaded, but live lead data will stay unavailable until the required connection settings are added for this environment.",
      details,
    };
  }

  return {
    title: "Live lead data is temporarily unavailable",
    description:
      "We couldn't load live lead information just now. Please retry in a moment or confirm the environment settings are available.",
    details,
  };
}

export function logCrmPageError(scope: string, error: unknown) {
  const logger = isCrmConfigurationError(error) ? console.warn : console.error;
  logger(`[crm:${scope}]`, error);
}
