/* Text labels for a few landmark cell classes, pinned over the canvas at each class's mean annotated position.
   Positioned by direct style writes from the frame loop, so turning the brain moves them without re-rendering React. */
import { ReactNode, useMemo, useRef } from 'react';

import type { BrainLayout } from '../../connectome/brainData';
import type { BrainCamera } from '../../render/brainCamera';

// Landmarks and the side of the screen each is labelled on. The mushroom body and lateral horn sit next to each other
// on each hemisphere, so labelling them on opposite sides keeps the text apart; the other classes would overlap these.
const LABELLED_GROUPS: Array<{ key: string; screenSide: 'left' | 'right' }> = [
  { key: 'optic_lobes', screenSide: 'left' },
  { key: 'lateral_horn', screenSide: 'left' },
  { key: 'mushroom_body', screenSide: 'right' },
  { key: 'antennal_lobe', screenSide: 'right' },
];
const INT16_SCALE = 32767;

interface RegionLabel {
  text: string;
  screenSide: 'left' | 'right';
  // Anchor positions in the renderer's normalised coordinates, one per side of the brain.
  anchors: Array<[number, number, number]>;
}

interface RegionLabels {
  elements: ReactNode;
  place: (camera: BrainCamera, width: number, height: number) => void;
}

/** Build the label elements and a place() function; both are stable for a given layout and setting. */
export function useRegionLabels(layout: BrainLayout, isEnabled: boolean): RegionLabels {
  const spansRef = useRef<Array<HTMLSpanElement | null>>([]);

  return useMemo(() => {
    const { centre_nm: centre, step_nm: step } = layout.header.position;
    const labels: RegionLabel[] = isEnabled
      ? LABELLED_GROUPS.flatMap(({ key, screenSide }) =>
          layout.header.groups
            .filter((group) => group.key === key && group.anchors.length > 0)
            .map((group) => ({ group, screenSide })),
        ).map(({ group, screenSide }) => ({
            text: group.label,
            screenSide,
            anchors: group.anchors.map(
              ({ position_nm: position }) =>
                position.map((value, axis) => (value - centre[axis]) / step / INT16_SCALE) as [number, number, number],
            ),
          }))
      : [];

    const place = (camera: BrainCamera, width: number, height: number): void => {
      labels.forEach((label, index) => {
        const span = spansRef.current[index];
        if (!span) {
          return;
        }
        // Use whichever hemisphere is currently on the label's side of the screen, so turning never shows two copies.
        const projected = label.anchors.map((anchor) => camera.project(anchor, width, height));
        const isFurther = (point: { x: number }, best: { x: number }): boolean => (label.screenSide === 'left' ? point.x < best.x : point.x > best.x);
        const chosen = projected.reduce((best, point) => (isFurther(point, best) ? point : best));
        span.style.transform = `translate(${Math.round(chosen.x)}px, ${Math.round(chosen.y)}px) translate(-50%, -50%)`;
      });
    };

    const elements = labels.map((label, index) => (
      // Decorative: the canvas's own label describes the picture, and these names are listed in the activity chart.
      <span
        aria-hidden="true"
        className="brain-canvas__label"
        key={label.text}
        ref={(span) => {
          spansRef.current[index] = span;
        }}
      >
        {label.text}
      </span>
    ));
    return { elements, place };
  }, [layout, isEnabled]);
}
