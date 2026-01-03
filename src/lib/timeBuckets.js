import { formatReadableDate } from "./formatHelpers";
import { formatYMD, startOfDay } from "./dates";

const MS_DAY = 24 * 60 * 60 * 1000;

export function startOfWeek(date, weekStartsOn = "monday") {
  const day = startOfDay(date);
  if (weekStartsOn === "sunday") {
    const dayIndex = day.getDay(); // 0 = Sunday
    return new Date(day.getTime() - dayIndex * MS_DAY);
  }
  const dayIndex = (day.getDay() + 6) % 7; // 0 = Monday
  return new Date(day.getTime() - dayIndex * MS_DAY);
}

function formatMonthLabel(d) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    year: "numeric",
  }).format(d);
}

export function buildBuckets({
  start,
  end,
  granularity,
  weekStartsOn = "monday",
  labelMode = "long",
}) {
  const buckets = [];
  if (!start || !end) return buckets;
  if (start.getTime() > end.getTime()) return buckets;

  if (granularity === "day") {
    let cursor = startOfDay(start);
    const endDay = startOfDay(end);
    while (cursor.getTime() <= endDay.getTime()) {
      buckets.push({
        key: formatYMD(cursor),
        label: formatReadableDate(cursor),
        start: new Date(cursor),
      });
      cursor = new Date(cursor.getTime() + MS_DAY);
    }
    return buckets;
  }

  if (granularity === "week") {
    let cursor = startOfWeek(start, weekStartsOn);
    const endDay = startOfDay(end);
    while (cursor.getTime() <= endDay.getTime()) {
      const label =
        labelMode === "short"
          ? formatReadableDate(cursor)
          : `Week of ${formatReadableDate(cursor)}`;
      buckets.push({
        key: formatYMD(cursor),
        label,
        start: new Date(cursor),
      });
      cursor = new Date(cursor.getTime() + MS_DAY * 7);
    }
    return buckets;
  }

  let cursor = new Date(start.getFullYear(), start.getMonth(), 1);
  const endMonth = new Date(end.getFullYear(), end.getMonth(), 1);
  while (cursor.getTime() <= endMonth.getTime()) {
    buckets.push({
      key: `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(
        2,
        "0"
      )}`,
      label: formatMonthLabel(cursor),
      start: new Date(cursor),
    });
    cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
  }
  return buckets;
}

export function bucketIndexFor({
  date,
  start,
  granularity,
  weekStartsOn = "monday",
}) {
  if (!date || !start) return -1;
  const day = startOfDay(date);

  if (granularity === "day") {
    return Math.floor((day.getTime() - startOfDay(start).getTime()) / MS_DAY);
  }
  if (granularity === "week") {
    const weekStart = startOfWeek(start, weekStartsOn);
    return Math.floor((day.getTime() - weekStart.getTime()) / (MS_DAY * 7));
  }

  return (
    (day.getFullYear() - start.getFullYear()) * 12 +
    (day.getMonth() - start.getMonth())
  );
}
