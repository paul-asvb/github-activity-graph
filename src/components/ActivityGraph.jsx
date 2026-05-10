import React, { useMemo, useState } from 'react';
import activityRaw from '../data/activity.txt?raw';

// Parse "YYYY-MM-DD:NN" lines into a Map<dateStr, count>
const activityMap = (() => {
  const map = new Map();
  for (const line of activityRaw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const [date, countStr] = trimmed.split(':');
    if (!date) continue;
    const count = parseInt(countStr ?? '0', 10);
    if (!Number.isNaN(count)) map.set(date, count);
  }
  return map;
})();

// Map count 1..9 to a hue gradient: light green (120) → yellow (60) → dark red (0).
const colorForCount = (count) => {
  if (!count || count <= 0) return '#e5e7eb'; // tailwind gray-200 (empty)
  const c = Math.min(Math.max(count, 1), 9);
  const t = (c - 1) / 8; // 0..1
  const hue = 120 - 120 * t; // 120 → 0
  const lightness = 80 - 50 * t; // 80% → 30%
  return `hsl(${hue}, 70%, ${lightness}%)`;
};

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_LABELS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

// Build a 7-row × N-column grid for a year. Columns are calendar weeks
// starting on Sunday. Days before Jan 1 / after Dec 31 are `null` placeholders.
const buildYearGrid = (year) => {
  const start = new Date(year, 0, 1);
  const end = new Date(year, 11, 31);
  const startPad = start.getDay(); // 0=Sun..6=Sat — number of empty cells before Jan 1
  const cells = [];

  for (let i = 0; i < startPad; i++) cells.push(null);

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    cells.push({
      date: dateStr,
      day: d.getDate(),
      month: d.getMonth(),
      weekday: d.getDay(),
      count: activityMap.get(dateStr) ?? 0,
    });
  }

  while (cells.length % 7 !== 0) cells.push(null);

  const weeks = cells.length / 7;

  // For each week (column), find the first non-null cell and use its month
  // to detect when a new month begins → place a label at that column.
  const monthAtWeek = [];
  for (let w = 0; w < weeks; w++) {
    let m = null;
    for (let r = 0; r < 7; r++) {
      const cell = cells[w * 7 + r];
      if (cell) {
        m = cell.month;
        break;
      }
    }
    monthAtWeek.push(m);
  }

  const monthMarkers = [];
  let lastMonth = null;
  for (let w = 0; w < weeks; w++) {
    const m = monthAtWeek[w];
    if (m !== null && m !== lastMonth) {
      monthMarkers.push({ week: w, month: m });
      lastMonth = m;
    }
  }

  return { cells, weeks, monthMarkers };
};

// Today at local midnight, used to clip stats so future days don't count.
const startOfToday = () => {
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  return t;
};

// True if a grid cell's date is on or before today (local).
const isPastOrToday = (cell, today) => {
  if (!cell) return false;
  const d = new Date(cell.date);
  if (Number.isNaN(d.getTime())) return false;
  d.setHours(0, 0, 0, 0);
  return d <= today;
};

// Compute the active rate per weekday (Sun..Sat): fraction of days
// (count > 0) over total real days for that weekday.
const binaryByWeekday = (cells) => {
  const today = startOfToday();
  const active = new Array(7).fill(0);
  const total = new Array(7).fill(0);
  for (const cell of cells) {
    if (!cell) continue;
    if (!isPastOrToday(cell, today)) continue;
    total[cell.weekday] += 1;
    if (cell.count > 0) active[cell.weekday] += 1;
  }
  return active.map((a, i) => ({
    active: a,
    total: total[i],
    rate: total[i] ? a / total[i] : 0,
  }));
};

// Compute the average contribution count per weekday (Sun..Sat) over all
// real (non-null) cells in the year grid.
const averagesByWeekday = (cells) => {
  const today = startOfToday();
  const sums = new Array(7).fill(0);
  const counts = new Array(7).fill(0);
  for (const cell of cells) {
    if (!cell) continue;
    if (!isPastOrToday(cell, today)) continue;
    sums[cell.weekday] += cell.count;
    counts[cell.weekday] += 1;
  }
  return sums.map((s, i) => (counts[i] ? s / counts[i] : 0));
};

// Compute binary (active vs. idle) day statistics for the year.
// Treats each day as 1 if count > 0, else 0, and reports streaks, gaps,
// run counts, averages, and the trailing run at year end.
const binaryDayStats = (cells) => {
  const today = startOfToday();
  const real = cells.filter((c) => c && isPastOrToday(c, today));

  let longestActive = 0;
  let longestActiveRange = null;
  let longestIdle = 0;
  let longestIdleRange = null;

  let activeRuns = 0;
  let idleRuns = 0;
  let activeRunSum = 0;
  let idleRunSum = 0;

  let runLen = 0;
  let runActive = null; // true=active, false=idle, null=unstarted
  let runStart = null;

  const closeRun = (endDate) => {
    if (runActive === null || runLen === 0) return;
    if (runActive) {
      activeRuns += 1;
      activeRunSum += runLen;
      if (runLen > longestActive) {
        longestActive = runLen;
        longestActiveRange = { start: runStart, end: endDate };
      }
    } else {
      idleRuns += 1;
      idleRunSum += runLen;
      if (runLen > longestIdle) {
        longestIdle = runLen;
        longestIdleRange = { start: runStart, end: endDate };
      }
    }
  };

  let prevDate = null;
  for (const cell of real) {
    const isActive = cell.count > 0;
    if (runActive === null) {
      runActive = isActive;
      runStart = cell.date;
      runLen = 1;
    } else if (isActive === runActive) {
      runLen += 1;
    } else {
      closeRun(prevDate);
      runActive = isActive;
      runStart = cell.date;
      runLen = 1;
    }
    prevDate = cell.date;
  }
  // close trailing run (it's also the "current" run for this year)
  const trailing =
    runActive === null
      ? null
      : { active: runActive, length: runLen, start: runStart, end: prevDate };
  closeRun(prevDate);

  return {
    longestActive,
    longestActiveRange,
    longestIdle,
    longestIdleRange,
    activeRuns,
    idleRuns,
    avgActiveRun: activeRuns ? activeRunSum / activeRuns : 0,
    avgIdleRun: idleRuns ? idleRunSum / idleRuns : 0,
    trailing,
  };
};

// Days since the most recent active day across the entire dataset,
// measured from today. Returns null if there is no active day on/before today.
const daysSinceLastContribution = (map) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let latest = null;
  for (const [dateStr, count] of map) {
    if (count <= 0) continue;
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) continue;
    if (d > today) continue;
    if (!latest || d > latest) latest = d;
  }
  if (!latest) return { date: null, days: null };
  const ms = today - latest;
  const days = Math.round(ms / 86400000);
  const yyyy = latest.getFullYear();
  const mm = String(latest.getMonth() + 1).padStart(2, '0');
  const dd = String(latest.getDate()).padStart(2, '0');
  return { date: `${yyyy}-${mm}-${dd}`, days };
};

// Compute summary statistics for the year:
// totals, active/idle days, average, peak day, longest streak,
// busiest weekday, busiest month.
const yearStats = (cells) => {
  const today = startOfToday();
  const real = cells.filter((c) => c && isPastOrToday(c, today));
  const totalDays = real.length;
  let total = 0;
  let activeDays = 0;
  let peak = { date: null, count: 0 };
  let longestStreak = 0;
  let currentStreak = 0;

  const weekdaySums = new Array(7).fill(0);
  const weekdayCounts = new Array(7).fill(0);
  const monthSums = new Array(12).fill(0);

  for (const cell of real) {
    total += cell.count;
    weekdaySums[cell.weekday] += cell.count;
    weekdayCounts[cell.weekday] += 1;
    monthSums[cell.month] += cell.count;

    if (cell.count > 0) {
      activeDays += 1;
      currentStreak += 1;
      if (currentStreak > longestStreak) longestStreak = currentStreak;
    } else {
      currentStreak = 0;
    }

    if (cell.count > peak.count) peak = { date: cell.date, count: cell.count };
  }

  // Busiest weekday by average (handles partial years fairly)
  let busyWd = 0;
  let busyWdAvg = -1;
  for (let i = 0; i < 7; i++) {
    const avg = weekdayCounts[i] ? weekdaySums[i] / weekdayCounts[i] : 0;
    if (avg > busyWdAvg) {
      busyWdAvg = avg;
      busyWd = i;
    }
  }

  // Busiest month by total
  let busyMonth = 0;
  for (let i = 1; i < 12; i++) {
    if (monthSums[i] > monthSums[busyMonth]) busyMonth = i;
  }

  return {
    total,
    totalDays,
    activeDays,
    idleDays: totalDays - activeDays,
    average: totalDays ? total / totalDays : 0,
    activeRate: totalDays ? activeDays / totalDays : 0,
    peak,
    longestStreak,
    busyWeekday: { index: busyWd, avg: busyWdAvg },
    busyMonth: { index: busyMonth, total: monthSums[busyMonth] },
  };
};

const StatCard = ({ label, value, sub }) => (
  <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
    <div className="text-xs text-gray-500 uppercase tracking-wide">{label}</div>
    <div className="text-2xl font-semibold text-gray-900 leading-tight mt-1">
      {value}
    </div>
    {sub && <div className="text-xs text-gray-500 mt-1">{sub}</div>}
  </div>
);

const ActivityGraph = () => {
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const { cells, weeks, monthMarkers } = useMemo(
    () => buildYearGrid(currentYear),
    [currentYear],
  );
  const weekdayAverages = useMemo(() => averagesByWeekday(cells), [cells]);
  const maxAverage = Math.max(...weekdayAverages, 0.0001);
  const weekdayBinary = useMemo(() => binaryByWeekday(cells), [cells]);
  const stats = useMemo(() => yearStats(cells), [cells]);
  const binStats = useMemo(() => binaryDayStats(cells), [cells]);
  const sinceLast = useMemo(() => daysSinceLastContribution(activityMap), []);

  const handleYearChange = (direction) => {
    setCurrentYear((prev) => prev + direction);
  };

  // Cell + gap sizing (must match Tailwind classes used below)
  const CELL = 12; // w-3 = 0.75rem = 12px
  const GAP = 4;   // gap-1 = 0.25rem = 4px
  const STEP = CELL + GAP;

  return (
    <div className="p-4 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Activity Year: {currentYear}</h2>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => handleYearChange(-1)}
            className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            Previous
          </button>
          <button
            onClick={() => setCurrentYear(new Date().getFullYear())}
            className="px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
          >
            Current
          </button>
          <button
            onClick={() => handleYearChange(1)}
            className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            Next
          </button>
        </div>
      </div>

      <div className="p-2 bg-gray-50 rounded-lg inline-block">
        <div className="flex">
          {/* Day-of-week labels column */}
          <div
            className="grid mr-2 text-xs text-gray-500"
            style={{
              gridTemplateRows: `repeat(7, ${CELL}px)`,
              rowGap: `${GAP}px`,
            }}
          >
            {DAY_LABELS.map((label, i) => (
              <div key={label} className="flex items-center h-3 leading-none">
                {/* Show only Mon, Wed, Fri to avoid clutter */}
                {i % 2 === 1 ? label : ''}
              </div>
            ))}
          </div>

          <div>
            {/* Month labels row */}
            <div
              className="relative text-xs text-gray-500 mb-1"
              style={{
                width: `${weeks * STEP - GAP}px`,
                height: '14px',
              }}
            >
              {monthMarkers.map(({ week, month }) => (
                <span
                  key={`${month}-${week}`}
                  className="absolute top-0 leading-none"
                  style={{ left: `${week * STEP}px` }}
                >
                  {MONTH_LABELS[month]}
                </span>
              ))}
            </div>

            {/* Activity grid */}
            <div
              className="grid grid-flow-col gap-1"
              style={{
                gridTemplateRows: `repeat(7, ${CELL}px)`,
                gridAutoColumns: `${CELL}px`,
              }}
            >
              {cells.map((cell, i) =>
                cell ? (
                  <div
                    key={cell.date}
                    className="transition-colors duration-200 hover:scale-110"
                    style={{
                      width: `${CELL}px`,
                      height: `${CELL}px`,
                      backgroundColor: colorForCount(cell.count),
                    }}
                    title={`${cell.date}: ${cell.count} contributions`}
                  />
                ) : (
                  <div
                    key={`empty-${i}`}
                    style={{ width: `${CELL}px`, height: `${CELL}px` }}
                  />
                ),
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-center items-center mt-4 text-sm text-gray-600 gap-2">
        <div className="flex items-center">
          <div
            className="w-3 h-3 mr-1"
            style={{ backgroundColor: colorForCount(0) }}
          ></div>
          <span>0</span>
        </div>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
          <div key={n} className="flex items-center">
            <div
              className="w-3 h-3 mr-1"
              style={{ backgroundColor: colorForCount(n) }}
            ></div>
            <span>{n}</span>
          </div>
        ))}
      </div>

      {/* Year statistics */}
      <div className="mt-8">
        <h3 className="text-lg font-semibold mb-3">
          {currentYear} statistics
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          <StatCard label="Total contributions" value={stats.total} />
          <StatCard
            label="Daily average"
            value={stats.average.toFixed(2)}
          />
          <StatCard
            label="Active days"
            value={`${stats.activeDays} / ${stats.totalDays}`}
            sub={`${(stats.activeRate * 100).toFixed(0)}% active`}
          />
          <StatCard
            label="Longest streak"
            value={`${stats.longestStreak} ${stats.longestStreak === 1 ? 'day' : 'days'}`}
          />
          <StatCard
            label="Best day"
            value={stats.peak.count}
            sub={stats.peak.date ?? '—'}
          />
          <StatCard
            label="Busiest weekday"
            value={DAY_LABELS[stats.busyWeekday.index]}
            sub={`avg ${stats.busyWeekday.avg.toFixed(2)}`}
          />
          <StatCard
            label="Busiest month"
            value={MONTH_LABELS[stats.busyMonth.index]}
            sub={`${stats.busyMonth.total} total`}
          />
          <StatCard label="Idle days" value={stats.idleDays} />
        </div>
      </div>

      {/* Binary day statistics (active vs. idle) */}
      <div className="mt-8">
        <h3 className="text-lg font-semibold mb-3">
          {currentYear} binary day statistics
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          <StatCard
            label="Longest active streak"
            value={`${binStats.longestActive} ${binStats.longestActive === 1 ? 'day' : 'days'}`}
            sub={
              binStats.longestActiveRange
                ? `${binStats.longestActiveRange.start} → ${binStats.longestActiveRange.end}`
                : '—'
            }
          />
          <StatCard
            label="Longest idle streak"
            value={`${binStats.longestIdle} ${binStats.longestIdle === 1 ? 'day' : 'days'}`}
            sub={
              binStats.longestIdleRange
                ? `${binStats.longestIdleRange.start} → ${binStats.longestIdleRange.end}`
                : '—'
            }
          />
          <StatCard
            label="Active runs"
            value={binStats.activeRuns}
            sub={`avg ${binStats.avgActiveRun.toFixed(2)} days`}
          />
          <StatCard
            label="Idle runs"
            value={binStats.idleRuns}
            sub={`avg ${binStats.avgIdleRun.toFixed(2)} days`}
          />
          <StatCard
            label={
              binStats.trailing
                ? binStats.trailing.active
                  ? 'Current active streak'
                  : 'Current idle streak'
                : 'Current streak'
            }
            value={
              binStats.trailing
                ? `${binStats.trailing.length} ${binStats.trailing.length === 1 ? 'day' : 'days'}`
                : '—'
            }
            sub={
              binStats.trailing
                ? `since ${binStats.trailing.start}`
                : undefined
            }
          />
          <StatCard
            label="Days since last contribution"
            value={sinceLast.days ?? '—'}
            sub={sinceLast.date ? `last: ${sinceLast.date}` : 'no data'}
          />
        </div>
      </div>

      {/* Weekday breakdowns: average contributions and active-day rate */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl">
        <div>
          <h3 className="text-lg font-semibold mb-3">
            Average contributions per weekday
          </h3>
          <div className="space-y-1.5">
            {DAY_LABELS.map((label, i) => {
              const avg = weekdayAverages[i];
              const widthPct = (avg / maxAverage) * 100;
              return (
                <div key={label} className="flex items-center text-sm">
                  <span className="w-10 text-gray-600">{label}</span>
                  <div className="flex-1 bg-gray-100 rounded h-5 relative overflow-hidden">
                    <div
                      className="h-full rounded transition-all"
                      style={{
                        width: `${widthPct}%`,
                        backgroundColor: colorForCount(Math.round(avg) || 1),
                      }}
                      title={`${label}: avg ${avg.toFixed(2)} contributions`}
                    />
                  </div>
                  <span className="w-14 text-right tabular-nums text-gray-700">
                    {avg.toFixed(2)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-3">
            Active-day rate per weekday
          </h3>
          <div className="space-y-1.5">
            {DAY_LABELS.map((label, i) => {
              const { active, total, rate } = weekdayBinary[i];
              const widthPct = rate * 100;
              return (
                <div key={label} className="flex items-center text-sm">
                  <span className="w-10 text-gray-600">{label}</span>
                  <div className="flex-1 bg-gray-100 rounded h-5 relative overflow-hidden">
                    <div
                      className="h-full rounded transition-all"
                      style={{
                        width: `${widthPct}%`,
                        backgroundColor: colorForCount(
                          Math.max(1, Math.round(rate * 9)),
                        ),
                      }}
                      title={`${label}: ${active}/${total} active (${(rate * 100).toFixed(1)}%)`}
                    />
                  </div>
                  <span className="w-14 text-right tabular-nums text-gray-700">
                    {(rate * 100).toFixed(0)}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ActivityGraph;
