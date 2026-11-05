/** Strip CRM/customer data before an event may leave the deployment. */
export function sanitizeErrorEvent<T extends {
  request?: unknown;
  user?: unknown;
  breadcrumbs?: unknown;
  extra?: unknown;
  contexts?: unknown;
  exception?: { values?: Array<{ value?: string; stacktrace?: { frames?: Array<{ vars?: unknown }> } }> };
  message?: string;
}>(event: T): T {
  delete event.request;
  delete event.user;
  delete event.breadcrumbs;
  delete event.extra;
  delete event.contexts;
  delete event.message;
  for (const exception of event.exception?.values ?? []) {
    // Exception messages often embed personal data, provider tokens, or SQL values.
    exception.value = "Application operation failed";
    for (const frame of exception.stacktrace?.frames ?? []) delete frame.vars;
  }
  return event;
}
