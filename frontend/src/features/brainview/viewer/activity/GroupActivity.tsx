/* Small multiples of firing rate over brain time, one row per cell class, drawn up to the playback position.
   Each row is scaled to its own peak (stated beside it), because receptor neurons fire hundreds of times faster than most. */
import { PointerEvent, useState } from 'react';

import { Disclosure, Table } from '../../../../shared/ui';
import type { BrainLayout } from '../../connectome/brainData';
import type { RunTimeline } from '../../playback/runTimeline';
import { binMidpointMs, buildActivitySeries, type ActivitySeries } from './activitySeries';
import './GroupActivity.css';

const ROW_WIDTH = 240;
const ROW_HEIGHT = 22;
// Rows scale to their own peak but never below this, so a class firing at 0.04 Hz doesn't draw like one at 100 Hz.
const MIN_SCALE_HZ = 1;

interface GroupActivityProps {
  layout: BrainLayout;
  timeline: RunTimeline | null;
  playbackStep: number;
}

/** Render the rows, a hover readout, and the same numbers as a table. */
export function GroupActivity({ layout, timeline, playbackStep }: GroupActivityProps): JSX.Element {
  const { series, binCount } = buildActivitySeries(layout, timeline, playbackStep);
  const [hovered, setHovered] = useState<{ groupId: number; bin: number } | null>(null);
  const hoveredSeries = series.find((item) => item.groupId === hovered?.groupId);
  const hoveredRate = hovered && hoveredSeries ? hoveredSeries.rates[hovered.bin] : undefined;

  return (
    <div className="group-activity">
      <p className="group-activity__caption">Average firing rate by cell class. Each row is scaled to its own peak, or to 1 Hz if its peak is lower.</p>
      <ul className="group-activity__rows">
        {series.map((item) => (
          <li className="group-activity__row" key={item.groupId}>
            <span className="group-activity__label">{item.label}</span>
            <ActivityLine
              binCount={binCount}
              hoveredBin={hovered?.groupId === item.groupId ? hovered.bin : null}
              item={item}
              onHover={(bin) => setHovered(bin === null ? null : { groupId: item.groupId, bin })}
            />
            <span className="group-activity__peak">peak {formatRate(item.peakRate)}</span>
          </li>
        ))}
      </ul>
      {/* Always rendered, so the row height doesn't jump when hovering starts. */}
      <p aria-live="off" className="group-activity__readout">
        {hoveredSeries && hoveredRate !== undefined && hovered
          ? `${hoveredSeries.label} at ${Math.round(binMidpointMs(hovered.bin))} ms: ${formatRate(hoveredRate)} average`
          : 'Point at a row to read a value.'}
      </p>
      <Disclosure summary="Activity as a table">
        <Table density="compact" label="Firing activity by cell class">
          <thead>
            <tr>
              <th scope="col">Cell class</th>
              <th scope="col">Neurons</th>
              <th scope="col">Spikes so far</th>
              <th scope="col">Peak average rate</th>
            </tr>
          </thead>
          <tbody>
            {series.map((item) => (
              <tr key={item.groupId}>
                <th scope="row">{item.label}</th>
                <td className="ui-num">{item.neuronCount.toLocaleString()}</td>
                <td className="ui-num">{item.spikeCount.toLocaleString()}</td>
                <td className="ui-num">{formatRate(item.peakRate)}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Disclosure>
    </div>
  );
}

interface ActivityLineProps {
  item: ActivitySeries;
  binCount: number;
  hoveredBin: number | null;
  onHover: (bin: number | null) => void;
}

function ActivityLine({ item, binCount, hoveredBin, onHover }: ActivityLineProps): JSX.Element {
  const xOf = (bin: number): number => (binCount <= 1 ? 0 : (bin / (binCount - 1)) * ROW_WIDTH);
  const scale = Math.max(item.peakRate, MIN_SCALE_HZ);
  const yOf = (rate: number): number => ROW_HEIGHT - 2 - (rate / scale) * (ROW_HEIGHT - 4);
  const points = item.rates.map((rate, bin) => `${xOf(bin).toFixed(1)},${yOf(rate).toFixed(1)}`).join(' ');

  const onPointerMove = (event: PointerEvent<SVGSVGElement>): void => {
    const box = event.currentTarget.getBoundingClientRect();
    const bin = Math.round(((event.clientX - box.left) / box.width) * (binCount - 1));
    onHover(bin >= 0 && bin < item.rates.length ? bin : null);
  };

  return (
    <svg
      aria-hidden="true"
      className="group-activity__line"
      onPointerLeave={() => onHover(null)}
      onPointerMove={onPointerMove}
      preserveAspectRatio="none"
      viewBox={`0 0 ${ROW_WIDTH} ${ROW_HEIGHT}`}
    >
      <line className="group-activity__baseline" x1="0" x2={ROW_WIDTH} y1={ROW_HEIGHT - 1} y2={ROW_HEIGHT - 1} />
      {item.rates.length > 1 ? <polyline className="group-activity__trace" points={points} /> : null}
      {hoveredBin !== null ? <line className="group-activity__crosshair" x1={xOf(hoveredBin)} x2={xOf(hoveredBin)} y1="0" y2={ROW_HEIGHT} /> : null}
    </svg>
  );
}

function formatRate(rate: number): string {
  if (rate === 0) {
    return '0 Hz';
  }
  // Two significant figures below 10 Hz, so a quiet class reads as 0.04 Hz rather than an untrue 0.0.
  return `${rate < 10 ? Number(rate.toPrecision(2)).toString() : Math.round(rate).toLocaleString()} Hz`;
}
