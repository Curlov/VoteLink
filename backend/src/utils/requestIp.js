export function getRequestIp(req) {
  const forwardedFor = req.get("x-forwarded-for");

  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim() || null;
  }

  return req.ip || req.socket?.remoteAddress || null;
}
