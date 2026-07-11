const supportedDataImagePattern =
  /^data:image\/(png|jpe?g|webp|gif);base64,[a-z0-9+/=]+$/i;

export function isSafeRootRelativePath(value: string) {
  return value.startsWith("/") && !value.startsWith("//") && !value.includes("\\");
}

export function isHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function isSafeImageSource(value: string) {
  return (
    isSafeRootRelativePath(value) ||
    supportedDataImagePattern.test(value) ||
    isHttpUrl(value)
  );
}

export function isSafeNavigationTarget(value: string) {
  return isSafeRootRelativePath(value) || isHttpUrl(value);
}
