/* GLSL for the brain point cloud: one round point per neuron, brightened and enlarged while it is flashing.
   Positions arrive as normalised int16 (the brain file's quantised coordinates), so no conversion happens on the CPU. */

export const POINT_VERTEX_SHADER = `#version 300 es
in vec3 a_position;
in float a_flash;
// 0: ordinary neuron, 1: a neuron the stimulus drives, 2: no annotated position (not drawn).
in float a_kind;

uniform mat3 u_rotation;
uniform vec2 u_scale;
uniform float u_pointSize;

out float v_flash;
out float v_kind;

void main() {
  // FlyWire's y axis points down the brain (dorsal to ventral); flip it so dorsal is up on screen.
  vec3 rotated = u_rotation * vec3(a_position.x, -a_position.y, a_position.z);
  gl_Position = a_kind > 1.5 ? vec4(2.0, 2.0, 2.0, 1.0) : vec4(rotated.xy * u_scale, 0.0, 1.0);
  gl_PointSize = u_pointSize * (1.0 + 1.8 * a_flash);
  v_flash = a_flash;
  v_kind = a_kind;
}
`;

export const POINT_FRAGMENT_SHADER = `#version 300 es
precision mediump float;

in float v_flash;
in float v_kind;

uniform vec3 u_neuronColor;
uniform vec3 u_spikeColor;
uniform vec3 u_inputColor;
uniform float u_restingAlpha;

out vec4 outColor;

void main() {
  vec2 fromCentre = gl_PointCoord - 0.5;
  float distanceSquared = dot(fromCentre, fromCentre);
  if (distanceSquared > 0.25) {
    discard;
  }
  vec3 flashColor = v_kind > 0.5 ? u_inputColor : u_spikeColor;
  vec3 color = mix(u_neuronColor, flashColor, v_flash);
  // Driven neurons stay faintly marked even between input events, so the input site is visible throughout.
  float resting = v_kind > 0.5 ? max(u_restingAlpha, 0.55) : u_restingAlpha;
  float alpha = mix(resting, 1.0, v_flash) * (1.0 - smoothstep(0.12, 0.25, distanceSquared));
  outColor = vec4(color * alpha, alpha);
}
`;
