/* The view onto the brain: a frontal view that can be turned left and right and tipped a little, never zoomed.
   Orthographic, because depth cues from perspective add nothing to a cloud of points and distort the anatomy. */

// Tipping further than this shows the brain edge-on, where the regions pile on top of each other.
const MAX_PITCH_RADIANS = 0.6;
// Leave a little room around the brain inside the canvas.
const FILL_FRACTION = 0.92;

export class BrainCamera {
  public yaw = 0;
  public pitch = 0;
  private readonly horizontalRadius: number;
  private readonly verticalRadius: number;

  /** positions are the layout's quantised int16 coordinates; their extent sets how the brain fits the canvas. */
  public constructor(positions: Int16Array) {
    let horizontal = 1;
    let vertical = 1;
    for (let index = 0; index < positions.length; index += 3) {
      // Turning about the vertical axis mixes x and z, so the horizontal fit uses their combined radius.
      horizontal = Math.max(horizontal, Math.hypot(positions[index], positions[index + 2]));
      vertical = Math.max(vertical, Math.hypot(positions[index + 1], positions[index + 2]));
    }
    this.horizontalRadius = horizontal / 32767;
    this.verticalRadius = vertical / 32767;
  }

  /** Turn by a pointer drag measured in CSS pixels. */
  public drag(deltaX: number, deltaY: number): void {
    this.yaw += deltaX * 0.01;
    this.pitch = Math.max(-MAX_PITCH_RADIANS, Math.min(MAX_PITCH_RADIANS, this.pitch + deltaY * 0.01));
  }

  public reset(): void {
    this.yaw = 0;
    this.pitch = 0;
  }

  /** Column-major 3x3 rotation (pitch applied after yaw), as WebGL's uniformMatrix3fv expects. */
  public rotationMatrix(): Float32Array {
    const [cy, sy, cp, sp] = [Math.cos(this.yaw), Math.sin(this.yaw), Math.cos(this.pitch), Math.sin(this.pitch)];
    return new Float32Array([cy, sp * sy, -cp * sy, 0, cp, sp, sy, -sp * cy, cp * cy]);
  }

  /** Clip-space scale for x and y that fits the whole brain in a canvas of this size at any turn. */
  public scale(width: number, height: number): [number, number] {
    const pixelsPerUnit = Math.min((FILL_FRACTION * width) / 2 / this.horizontalRadius, (FILL_FRACTION * height) / 2 / this.verticalRadius);
    return [pixelsPerUnit / (width / 2), pixelsPerUnit / (height / 2)];
  }

  /** Project a layout-space point (normalised int16 units) to CSS pixels from the canvas's top-left corner. */
  public project(point: [number, number, number], width: number, height: number): { x: number; y: number } {
    const matrix = this.rotationMatrix();
    const [px, py, pz] = [point[0], -point[1], point[2]];
    const x = matrix[0] * px + matrix[3] * py + matrix[6] * pz;
    const y = matrix[1] * px + matrix[4] * py + matrix[7] * pz;
    const [scaleX, scaleY] = this.scale(width, height);
    return { x: ((x * scaleX + 1) / 2) * width, y: ((1 - y * scaleY) / 2) * height };
  }
}
