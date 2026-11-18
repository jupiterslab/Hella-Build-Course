// Exterior view only. Jupiter texture: NASA, ESA, A. Simon (GSFC), M. H. Wong
// (UC Berkeley), 2019 Hubble global map. https://science.nasa.gov/asset/hubble/jupiter-global-map-2019/
(async function () {
  const windowFrame = document.querySelector('.lab-window');
  if (!windowFrame) return;
  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  canvas.className = 'orbital-view';
  const gl = canvas.getContext('webgl', { alpha:true, premultipliedAlpha:false, antialias:false, depth:false });
  if (!gl) return;
  const map = new Image();
  map.src = 'assets/jupiter-map.webp';
  await map.decode();

  // The aperture follows the inside edge of the existing 900 x 300 scene.
  const mask = document.createElement('canvas');
  mask.width = 1800; mask.height = 600;
  const ctx = mask.getContext('2d');
  ctx.scale(2, 2);
  ctx.fillStyle = '#fff';
  ctx.fill(new Path2D('M142 71 L756 71 Q773 71 783 82 L822 131 Q830 141 830 153 L830 194 Q830 205 820 215 L801 233 L801 224 L796 224 L796 222 L781 222 L781 225 L770 225 L770 236 L761 236 L761 243 L736 243 Q728 243 721 249 L220 249 Q211 249 203 244 Q196 241 188 241 L143 241 L143 216 L129 216 L132 204 L141 198 L145 206 L163 213 L159 199 L147 195 L135 198 L131 200 L136 188 L147 186 L154 179 L158 171 L165 168 L160 165 L151 165 L141 168 L134 174 L131 185 L127 202 L124 203 L126 195 L132 189 L130 182 L123 178 L120 183 L121 195 L118 190 L120 179 L117 170 L116 160 L109 151 L106 157 L106 165 L103 165 L107 174 L111 182 L115 186 L118 201 L113 196 L111 187 L106 182 L94 178 L87 178 L92 186 L98 193 L105 195 L111 195 L116 203 L120 215 L111 216 L107 220 L107 227 L100 227 Q76 207 76 192 L76 151 Q76 142 81 133 L115 88 Q124 73 142 71 Z'));

  const vertex = 'attribute vec2 pos; varying vec2 uv; void main(){ uv=vec2(pos.x*.5+.5,.5-pos.y*.5); gl_Position=vec4(pos,0.,1.); }';
  const fragment = `
    precision highp float;
    varying vec2 uv;
    uniform sampler2D clouds, aperture;
    uniform float phase;
    void main(){
      float edge=texture2D(aperture,uv).a;
      if(edge<.002) discard;
      // The camera tracks Jupiter from a mildly inclined orbit.
      vec2 pixel=uv*vec2(900.,300.);
      vec2 center=vec2(575.+28.*sin(phase),508.+9.*sin(phase));
      vec2 disc=(pixel-center)/460.;
      disc.y=-disc.y;
      float radius=length(disc);
      float limb=(1.-radius)*460.;
      vec3 sky=vec3(.028,.029,.047);
      float haze=exp(-abs(limb)*.17);
      sky+=haze*vec3(.21,.17,.29);
      vec3 normal=vec3(disc,sqrt(max(0.,1.-dot(disc,disc))));
      float tilt=1.19+.08*sin(phase);
      float lat=asin(clamp(normal.y*cos(tilt)-normal.z*sin(tilt),-1.,1.));
      float lon=atan(normal.x,normal.z*cos(tilt)+normal.y*sin(tilt));
      vec2 st=vec2(fract(.18+(lon+phase)/6.2831853),clamp(.5-lat/3.14159265,.065,.935));
      vec3 band=texture2D(clouds,st).rgb;
      vec3 sun=normalize(vec3(.72*cos(phase),.60,.50+.6*sin(phase)));
      float light=.22+.78*max(dot(normal,sun),0.);
      vec3 planet=band*light+vec3(.10,.085,.135)*exp(-max(limb,0.)*.09);
      gl_FragColor=vec4(mix(sky,planet,smoothstep(-.8,.8,limb)),edge);
    }`;
  const program = gl.createProgram();
  function attach(type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader,source); gl.compileShader(shader);
    if (!gl.getShaderParameter(shader,gl.COMPILE_STATUS)) throw new Error('Shader unavailable');
    gl.attachShader(program,shader);
  }
  attach(gl.VERTEX_SHADER,vertex); attach(gl.FRAGMENT_SHADER,fragment);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program,gl.LINK_STATUS)) return;
  gl.useProgram(program);
  const position = gl.getAttribLocation(program,'pos');
  gl.bindBuffer(gl.ARRAY_BUFFER,gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
  gl.enableVertexAttribArray(position); gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0);
  function texture(unit, name, image) {
    gl.activeTexture(gl.TEXTURE0+unit);
    gl.bindTexture(gl.TEXTURE_2D,gl.createTexture());
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);
    gl.uniform1i(gl.getUniformLocation(program,name),unit);
  }
  texture(0,'clouds',map); texture(1,'aperture',mask);
  canvas.width=1600; canvas.height=533;
  gl.viewport(0,0,canvas.width,canvas.height);
  const phase = gl.getUniformLocation(program,'phase');
  let angle=0, previous=0, request=0, visible=true;
  const draw=()=>{ gl.uniform1f(phase,angle); gl.drawArrays(gl.TRIANGLE_STRIP,0,4); };
  function frame(time) {
    if (time-previous>=1000/30) {
      if(previous) angle=(angle+Math.min(time-previous,100)*Math.PI*2/300000)%(Math.PI*2);
      previous=time; draw();
    }
    request=requestAnimationFrame(frame);
  }
  function sync() {
    cancelAnimationFrame(request); previous=0;
    if(visible && !document.hidden && !windowFrame.classList.contains('motion-paused')) request=requestAnimationFrame(frame);
  }
  draw(); windowFrame.prepend(canvas);
  new MutationObserver(sync).observe(windowFrame,{attributes:true,attributeFilter:['class']});
  new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;sync();}).observe(windowFrame);
  document.addEventListener('visibilitychange',sync);
  canvas.addEventListener('webglcontextlost',()=>{visible=false;sync();canvas.remove();});
  sync();
})().catch(()=>{}); // The original ship window remains as the still fallback.
