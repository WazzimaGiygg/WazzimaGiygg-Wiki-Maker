export const FRAME_ANCESTORS_CSP =
  "frame-ancestors 'self' https://aistudio.google.com https://*.aistudio.google.com https://ai.studio https://*.ai.studio https://makersuite.google.com";

export interface FrameCheckResult {
  isEmbedded: boolean;
  allowed: boolean;
  blockedAncestor: string | null;
}

const ALLOWED_PARENT_HOSTS = [
  'aistudio.google.com',
  'ai.studio',
  'makersuite.google.com',
];

export function isAllowedFrameOrigin(rawOriginOrUrl: string): boolean {
  if (!rawOriginOrUrl) return false;
  try {
    const parsed = new URL(rawOriginOrUrl);
    if (typeof window !== 'undefined' && parsed.origin === window.location.origin) {
      return true;
    }
    if (parsed.protocol !== 'https:') {
      return false;
    }
    const host = parsed.hostname.toLowerCase();
    return ALLOWED_PARENT_HOSTS.some(
      (allowedHost) => host === allowedHost || host.endsWith(`.${allowedHost}`)
    );
  } catch {
    return false;
  }
}

/**
 * Verifies that the application is either running top-level or embedded strictly inside
 * same-origin or Google AI Studio iframes.
 */
export function evaluateFrameContext(): FrameCheckResult {
  if (typeof window === 'undefined') {
    return { isEmbedded: false, allowed: true, blockedAncestor: null };
  }

  let isEmbedded = false;
  try {
    isEmbedded = window.self !== window.top;
  } catch {
    isEmbedded = true;
  }

  if (!isEmbedded) {
    return { isEmbedded: false, allowed: true, blockedAncestor: null };
  }

  // Prefer standardized ancestorOrigins (Chromium & Safari) to validate the entire frame chain
  const ancestorList = window.location.ancestorOrigins;
  if (ancestorList && ancestorList.length > 0) {
    for (let i = 0; i < ancestorList.length; i += 1) {
      const origin = ancestorList[i];
      if (!isAllowedFrameOrigin(origin)) {
        return {
          isEmbedded: true,
          allowed: false,
          blockedAncestor: origin || 'unknown',
        };
      }
    }
    return { isEmbedded: true, allowed: true, blockedAncestor: null };
  }

  // Fallback for browsers without location.ancestorOrigins (e.g., Firefox)
  try {
    if (window.top && window.top.location.origin === window.location.origin) {
      return { isEmbedded: true, allowed: true, blockedAncestor: null };
    }
  } catch {
    // Cross-origin top frame
  }

  if (document.referrer && isAllowedFrameOrigin(document.referrer)) {
    return { isEmbedded: true, allowed: true, blockedAncestor: null };
  }

  return {
    isEmbedded: true,
    allowed: false,
    blockedAncestor: document.referrer || 'external-frame',
  };
}
