/* The brain drawing: a WebGL canvas of every neuron, lit by the session's spikes, turned by dragging.
   Frames are drawn from the session's animation loop, never through React state, so playback costs no re-renders. */
import { PointerEvent, useEffect, useRef } from 'react';

import { useTheme } from '../../../../shared/theme';
import type { BrainLayout } from '../../connectome/brainData';
import type { PlaybackSession } from '../../playback/playbackSession';
import { BrainCamera } from '../../render/brainCamera';
import { readBrainColors } from '../../render/brainColors';
import { PointCloudRenderer } from '../../render/pointCloudRenderer';
import { useRegionLabels } from './useRegionLabels';
import './BrainCanvas.css';

interface BrainCanvasProps {
  session: PlaybackSession;
  layout: BrainLayout;
  // Region labels crowd a small canvas, so the compact dock leaves them off.
  showsLabels: boolean;
  onRenderFailure: (reason: string) => void;
}

/** Render the canvas and keep a renderer attached to it for the session's lifetime. */
export function BrainCanvas({ session, layout, showsLabels, onRenderFailure }: BrainCanvasProps): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<PointCloudRenderer | null>(null);
  const cameraRef = useRef<BrainCamera | null>(null);
  const dragRef = useRef<{ x: number; y: number } | null>(null);
  const { theme } = useTheme();
  const labels = useRegionLabels(layout, showsLabels);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas === null) {
      return undefined;
    }
    let renderer: PointCloudRenderer;
    try {
      renderer = new PointCloudRenderer(canvas, layout, readBrainColors(canvas));
    } catch (error) {
      onRenderFailure(error instanceof Error ? error.message : String(error));
      return undefined;
    }
    const camera = new BrainCamera(layout.positions);
    rendererRef.current = renderer;
    cameraRef.current = camera;

    // Keep the drawing buffer at device resolution so points stay crisp on high-density screens.
    const resize = (): void => {
      const ratio = window.devicePixelRatio || 1;
      canvas.width = Math.max(1, Math.round(canvas.clientWidth * ratio));
      canvas.height = Math.max(1, Math.round(canvas.clientHeight * ratio));
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);

    let drivenNeurons: Uint32Array | null = null;
    let lastStep = 0;
    const removeFrameListener = session.addFrameListener(({ spikes, spikeCount, wallDeltaMs }) => {
      if (session.drivenNeurons !== drivenNeurons) {
        drivenNeurons = session.drivenNeurons;
        renderer.setDrivenNeurons(drivenNeurons);
      }
      // Playback moving backwards means a replay: start from a dark brain.
      if (session.clock.step < lastStep) {
        renderer.flashes.clear();
      }
      lastStep = session.clock.step;
      renderer.flashes.flash(spikes, spikeCount);
      renderer.flashes.fade(wallDeltaMs);
      renderer.draw(camera, pointSizeFor(canvas));
      labels.place(camera, canvas.clientWidth, canvas.clientHeight);
      return renderer.flashes.hasLitNeurons;
    });

    return () => {
      removeFrameListener();
      observer.disconnect();
      renderer.dispose();
      rendererRef.current = null;
    };
  }, [session, layout, onRenderFailure, labels]);

  // A theme switch changes the tokens the canvas reads; redraw with the new colours straight away.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas !== null && rendererRef.current !== null) {
      rendererRef.current.setColors(readBrainColors(canvas));
      session.requestRedraw();
    }
  }, [theme, session]);

  const onPointerDown = (event: PointerEvent<HTMLCanvasElement>): void => {
    dragRef.current = { x: event.clientX, y: event.clientY };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const onPointerMove = (event: PointerEvent<HTMLCanvasElement>): void => {
    if (dragRef.current === null || cameraRef.current === null) {
      return;
    }
    cameraRef.current.drag(event.clientX - dragRef.current.x, event.clientY - dragRef.current.y);
    dragRef.current = { x: event.clientX, y: event.clientY };
    session.requestRedraw();
  };
  const onPointerUp = (): void => {
    dragRef.current = null;
  };
  const onDoubleClick = (): void => {
    cameraRef.current?.reset();
    session.requestRedraw();
  };

  return (
    <div className="brain-canvas">
      <canvas
        aria-label={`Map of ${layout.header.neuron_count.toLocaleString()} neurons seen from the front; neurons light up as they fire. Drag to turn it.`}
        className="brain-canvas__surface"
        onDoubleClick={onDoubleClick}
        onPointerCancel={onPointerUp}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        ref={canvasRef}
        role="img"
      />
      {labels.elements}
    </div>
  );
}

// Points grow with the canvas, so a dock-sized brain isn't a solid blob and a large one isn't dust.
function pointSizeFor(canvas: HTMLCanvasElement): number {
  const ratio = window.devicePixelRatio || 1;
  return Math.max(1.2, Math.min(2.4, canvas.clientWidth / 320)) * ratio;
}
