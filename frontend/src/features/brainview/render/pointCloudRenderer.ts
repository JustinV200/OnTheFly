/* Draws every neuron of the brain as a point with WebGL2 and lights the ones that just fired.
   One draw call per frame; per frame it uploads only the flash brightness (one byte per neuron). */
import type { BrainLayout } from '../connectome/brainData';
import { UNPLACED_GROUP_ID } from '../connectome/brainData';
import type { BrainCamera } from './brainCamera';
import type { BrainColors } from './brainColors';
import { NeuronFlashes } from './neuronFlashes';
import { POINT_FRAGMENT_SHADER, POINT_VERTEX_SHADER } from './pointCloudShaders';

const KIND_ORDINARY = 0;
const KIND_DRIVEN = 1;
const KIND_HIDDEN = 2;
// Resting neurons are faint so that the brain's outline reads without drowning the flashes.
const RESTING_ALPHA = 0.22;

export class PointCloudRenderer {
  public readonly flashes: NeuronFlashes;
  private readonly gl: WebGL2RenderingContext;
  private readonly program: WebGLProgram;
  private readonly flashBuffer: WebGLBuffer;
  private readonly kindBuffer: WebGLBuffer;
  private readonly kinds: Uint8Array;
  private readonly neuronCount: number;
  private readonly uniforms: Record<'rotation' | 'scale' | 'pointSize' | 'neuronColor' | 'spikeColor' | 'inputColor' | 'restingAlpha', WebGLUniformLocation | null>;
  private colors: BrainColors;

  /** Create the renderer; throws when the canvas can't provide WebGL2, so the caller can show a fallback. */
  public constructor(canvas: HTMLCanvasElement, layout: BrainLayout, colors: BrainColors) {
    const gl = canvas.getContext('webgl2', { antialias: false, premultipliedAlpha: true, alpha: true });
    if (gl === null) {
      throw new Error('WebGL2 is not available in this browser.');
    }
    this.gl = gl;
    this.colors = colors;
    this.neuronCount = layout.header.neuron_count;
    this.flashes = new NeuronFlashes(this.neuronCount);
    this.program = linkProgram(gl);

    this.kinds = new Uint8Array(this.neuronCount);
    layout.displayGroups.forEach((group, neuron) => {
      this.kinds[neuron] = group === UNPLACED_GROUP_ID ? KIND_HIDDEN : KIND_ORDINARY;
    });

    const vertexArray = gl.createVertexArray();
    gl.bindVertexArray(vertexArray);
    createAttribute(gl, this.program, 'a_position', layout.positions, 3, gl.SHORT, gl.STATIC_DRAW);
    this.flashBuffer = createAttribute(gl, this.program, 'a_flash', this.flashes.brightness, 1, gl.UNSIGNED_BYTE, gl.DYNAMIC_DRAW);
    this.kindBuffer = createAttribute(gl, this.program, 'a_kind', this.kinds, 1, gl.UNSIGNED_BYTE, gl.DYNAMIC_DRAW, false);

    const location = (name: string): WebGLUniformLocation | null => gl.getUniformLocation(this.program, name);
    this.uniforms = {
      rotation: location('u_rotation'),
      scale: location('u_scale'),
      pointSize: location('u_pointSize'),
      neuronColor: location('u_neuronColor'),
      spikeColor: location('u_spikeColor'),
      inputColor: location('u_inputColor'),
      restingAlpha: location('u_restingAlpha'),
    };
    gl.enable(gl.BLEND);
    // Premultiplied alpha: the fragment shader already multiplied colour by alpha.
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  }

  /** Mark the neurons the current run stimulates, so their flashes use the input colour. */
  public setDrivenNeurons(driven: Uint32Array | null): void {
    this.kinds.forEach((kind, neuron) => {
      if (kind === KIND_DRIVEN) {
        this.kinds[neuron] = KIND_ORDINARY;
      }
    });
    driven?.forEach((neuron) => {
      if (this.kinds[neuron] !== KIND_HIDDEN) {
        this.kinds[neuron] = KIND_DRIVEN;
      }
    });
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.kindBuffer);
    this.gl.bufferSubData(this.gl.ARRAY_BUFFER, 0, this.kinds);
  }

  public setColors(colors: BrainColors): void {
    this.colors = colors;
  }

  /** Draw one frame at the canvas's current size. pointSize is in device pixels. */
  public draw(camera: BrainCamera, pointSize: number): void {
    const { gl } = this;
    const canvas = gl.canvas as HTMLCanvasElement;
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    if (this.flashes.takeChanged()) {
      gl.bindBuffer(gl.ARRAY_BUFFER, this.flashBuffer);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.flashes.brightness);
    }
    gl.useProgram(this.program);
    gl.uniformMatrix3fv(this.uniforms.rotation, false, camera.rotationMatrix());
    gl.uniform2fv(this.uniforms.scale, camera.scale(canvas.width, canvas.height));
    gl.uniform1f(this.uniforms.pointSize, pointSize);
    gl.uniform3fv(this.uniforms.neuronColor, this.colors.neuron);
    gl.uniform3fv(this.uniforms.spikeColor, this.colors.spike);
    gl.uniform3fv(this.uniforms.inputColor, this.colors.input);
    gl.uniform1f(this.uniforms.restingAlpha, RESTING_ALPHA);
    gl.drawArrays(gl.POINTS, 0, this.neuronCount);
  }

  /** Release GPU resources; the canvas can be reused afterwards. */
  public dispose(): void {
    this.gl.deleteProgram(this.program);
    this.gl.deleteBuffer(this.flashBuffer);
    this.gl.deleteBuffer(this.kindBuffer);
  }
}

function linkProgram(gl: WebGL2RenderingContext): WebGLProgram {
  const program = gl.createProgram();
  const shaders = [compileShader(gl, gl.VERTEX_SHADER, POINT_VERTEX_SHADER), compileShader(gl, gl.FRAGMENT_SHADER, POINT_FRAGMENT_SHADER)];
  shaders.forEach((shader) => gl.attachShader(program, shader));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(`The brain view's WebGL program failed to link: ${gl.getProgramInfoLog(program) ?? 'no log'}`);
  }
  shaders.forEach((shader) => gl.deleteShader(shader));
  return program;
}

function compileShader(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader {
  const shader = gl.createShader(type);
  if (shader === null) {
    throw new Error('WebGL could not create a shader.');
  }
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error(`The brain view's shader failed to compile: ${gl.getShaderInfoLog(shader) ?? 'no log'}`);
  }
  return shader;
}

function createAttribute(
  gl: WebGL2RenderingContext,
  program: WebGLProgram,
  name: string,
  data: ArrayBufferView,
  size: number,
  type: number,
  usage: number,
  isNormalised = true,
): WebGLBuffer {
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, data, usage);
  const location = gl.getAttribLocation(program, name);
  gl.enableVertexAttribArray(location);
  // Normalised integers arrive in the shader as floats in [-1, 1] or [0, 1]; kinds stay whole numbers.
  gl.vertexAttribPointer(location, size, type, isNormalised, 0, 0);
  return buffer;
}
