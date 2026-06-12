export function getAppBaseUrl() {
  return window.location.origin.replace(/\/$/, "");
}

export function getAbsoluteAppUrl(pathOrUrl) {
  if (/^https?:\/\//i.test(pathOrUrl)) {
    return pathOrUrl;
  }

  const path = pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`;

  return `${getAppBaseUrl()}${path}`;
}

function copyWithTextarea(value) {
  const textarea = document.createElement("textarea");

  textarea.value = value;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.top = "0";
  textarea.style.left = "-9999px";
  textarea.style.opacity = "0";

  document.body.appendChild(textarea);
  textarea.select();
  textarea.setSelectionRange(0, textarea.value.length);

  try {
    if (!document.execCommand("copy")) {
      throw new Error("Fallback copy failed.");
    }
  } finally {
    document.body.removeChild(textarea);
  }
}

export async function copyTextToClipboard(value) {
  if (navigator.clipboard?.writeText && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(value);
      return;
    } catch {
      // Fall through to textarea copy for browsers that expose but block Clipboard.
    }
  }

  copyWithTextarea(value);
}

export async function shareOrCopyUrl({ title, text, url }) {
  if (navigator.share) {
    try {
      await navigator.share({
        title,
        text,
        url,
      });

      return "shared";
    } catch (error) {
      if (error?.name === "AbortError") {
        return "dismissed";
      }
    }
  }

  await copyTextToClipboard(url);

  return "copied";
}
