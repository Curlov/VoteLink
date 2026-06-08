const DEFAULT_RETENTION_DAYS = 14;
const MAX_RETENTION_DAYS = 365;

export function cleanRetentionDays(retentionDays) {
  if (retentionDays === "") {
    return DEFAULT_RETENTION_DAYS;
  }

  const numericRetentionDays = Number(retentionDays ?? DEFAULT_RETENTION_DAYS);

  if (
    !Number.isInteger(numericRetentionDays) ||
    numericRetentionDays < 0 ||
    numericRetentionDays > MAX_RETENTION_DAYS
  ) {
    return DEFAULT_RETENTION_DAYS;
  }

  return numericRetentionDays;
}
