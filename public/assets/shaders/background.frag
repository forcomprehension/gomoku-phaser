precision mediump float;

uniform vec2 resolution;
varying vec2 fragCoord;

void main()
{
   vec2 uv = fragCoord.xy / resolution;

   vec3 topRight = vec3(0.745,0.259,0.208);
   vec3 bottomLeft = vec3(0.757,0.176,0.337);

   float alpha = distance(uv, vec2(1, 1));
   vec3 color = mix(topRight, bottomLeft, alpha);

   gl_FragColor = vec4(color, 1);
}
