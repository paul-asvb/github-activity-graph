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

// Compute the average contribution count per weekday (Sun..Sat) over all
// real (non-null) cells in the year grid.
const averagesByWeekday = (cells) => {
  const sums = new Array(7).fill(0);
  const counts = new Array(7).fill(0);
  for (const cell of cells) {
    if (!cell) continue;
    sums[cell.weekday] += cell.count;
    counts[cell.weekday] += 1;
  }
  return sums.map((s, i) => (counts[i] ? s / counts[i] : 0));
};

// Compute summary statistics for the year:
// totals, active/idle days, average, peak day, longest streak,
// busiest weekday, busiest month.
const yearStats = (cells) => {
  const real = cells.filter(Boolean);
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
  const stats = useMemo(() => yearStats(cells), [cells]);

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

      {/* Average contributions per weekday */}
      <div className="mt-8 max-w-md">
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
    </div>
  );
};

export default ActivityGraph;
