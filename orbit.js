(async function () {
  const windowFrame = document.querySelector('.lab-window');
  if (!windowFrame) return;
  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  canvas.className = 'orbital-view';
  canvas.style.transform = 'scale(1.032)';
  const gl = canvas.getContext('webgl', { alpha:true, premultipliedAlpha:false, antialias:false, depth:false });
  if (!gl) return;
  const map = new Image();
  map.src = 'assets/lab-window.webp';
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
    uniform sampler2D scene, aperture;
    uniform float phase, stormAngle;
    void main(){
      vec2 size=vec2(900.,300.);
      vec2 pixel=uv*size;
      // Sample the original artwork. Ease the exterior drift to zero at the frame.
      float edge=texture2D(aperture,uv).a;
      float drift=edge*smoothstep(75.,145.,pixel.y)*(1.-smoothstep(197.,238.,pixel.y))
                      *smoothstep(165.,260.,pixel.x)*(1.-smoothstep(765.,820.,pixel.x));
      pixel.x+=5.*sin(phase)*drift;
      vec2 center=vec2(744.,172.), axes=vec2(36.,23.);
      vec2 local=(pixel-center)/axes;
      float radius=length(local);
      // Cloud crests circulate and undulate outside the faster-moving core.
      float collar=smoothstep(.72,1.08,radius)*(1.-smoothstep(1.45,2.85,radius));
      float azimuth=atan(local.y,local.x+.00001);
      float wave=sin(3.*azimuth-2.*stormAngle)-sin(3.*azimuth);
      pixel+=axes*(vec2(-local.y,local.x)*.085*wave+
                   local*.032*(sin(5.*azimuth+stormAngle)-sin(5.*azimuth)))*collar;
      // Extend the flow upstream through the pale, folded band beside the storm.
      vec2 fold=(pixel-vec2(628.,143.))/vec2(110.,43.);
      float influence=(1.-smoothstep(.45,1.,length(fold)))*edge;
      float crest=fold.x*5.+fold.y*2.;
      pixel+=vec2(2.8*(sin(crest+stormAngle)-sin(crest)),
                  1.7*(cos(crest+stormAngle)-cos(crest)))*influence;
      if(radius<1.15){
        float c=cos(stormAngle), s=sin(stormAngle);
        vec2 rotated=mat2(c,s,-s,c)*local;
        // Feather the rotating storm into the original surrounding cloud bands.
        vec3 rolling=texture2D(scene,(center+axes*rotated)/size).rgb;
        vec3 still=texture2D(scene,pixel/size).rgb;
        gl_FragColor=vec4(mix(rolling,still,smoothstep(.72,1.15,radius)),1.);
      }else{
        gl_FragColor=texture2D(scene,pixel/size);
      }
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
  texture(0,'scene',map); texture(1,'aperture',mask);

  const phase = gl.getUniformLocation(program,'phase');
  const storm = gl.getUniformLocation(program,'stormAngle');
  let spin=0, angle=0, previous=0, request=0, visible=true;
  const draw=()=>{ gl.uniform1f(phase,angle); gl.uniform1f(storm,spin); gl.drawArrays(gl.TRIANGLE_STRIP,0,4); };
  function frame(time) {
    if (time-previous>=1000/30) {
      if(previous) {
        const seconds=Math.min(time-previous,100)/1000;
        angle=(angle+seconds*Math.PI*2/720)%(Math.PI*2);
        spin=(spin+seconds*Math.PI*2/90)%(Math.PI*2);
      }
      previous=time; draw();
    }
    request=requestAnimationFrame(frame);
  }
  function sync() {
    cancelAnimationFrame(request); previous=0;
    if(visible && !document.hidden && !windowFrame.classList.contains('motion-paused')) request=requestAnimationFrame(frame);
  }
  function resize() {
    const ratio=1600/533;
    const cssWidth=Math.max(windowFrame.clientWidth,windowFrame.clientHeight*ratio);
    const width=Math.min(3600,Math.max(1,Math.ceil(cssWidth*(window.devicePixelRatio||1))));
    canvas.width=width; canvas.height=Math.max(1,Math.round(width/ratio));
    gl.viewport(0,0,canvas.width,canvas.height);
    draw();
  }
  resize(); windowFrame.prepend(canvas);
  new ResizeObserver(resize).observe(windowFrame);
  new MutationObserver(sync).observe(windowFrame,{attributes:true,attributeFilter:['class']});
  new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;sync();}).observe(windowFrame);
  document.addEventListener('visibilitychange',sync);
  canvas.addEventListener('webglcontextlost',()=>{visible=false;sync();canvas.remove();});
  sync();
})().catch(()=>{}); // The original ship window remains as the still fallback.
