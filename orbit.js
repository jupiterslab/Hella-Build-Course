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
    uniform float phase;
    const vec2 size=vec2(900.,300.);
    void main(){
      vec4 original=texture2D(scene,uv);
      float glass=texture2D(aperture,uv).a;
      if(glass<.001){gl_FragColor=original;return;}
      // One camera transform for the entire exterior. Start at the reference pose.
      vec2 screen=uv*size-vec2(450.,150.);
      float yaw=.033*sin(phase);
      float pitch=.009*(1.-cos(phase));
      vec3 ray=vec3(screen,760.);
      ray.xz=mat2(cos(yaw),sin(yaw),-sin(yaw),cos(yaw))*ray.xz;
      ray.yz=mat2(cos(pitch),sin(pitch),-sin(pitch),cos(pitch))*ray.yz;
      vec2 source=(760.*ray.xy/ray.z+vec2(450.,150.))/size;
      // Continue the glass-side texture into the narrow strip revealed by the pass.
      // Sampling across the original aperture would draw a second window frame.
      if(texture2D(aperture,source).a<.995){
        vec2 inside=uv, outside=source;
        for(int i=0;i<7;i++){
          vec2 middle=(inside+outside)*.5;
          if(texture2D(aperture,middle).a>.995) inside=middle;
          else outside=middle;
        }
        source=2.*inside-source;
        if(texture2D(aperture,source).a<.995) source=uv;
      }
      gl_FragColor=mix(original,texture2D(scene,source),glass);
    }
    `;
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
  const orbitSeconds=240;
  let angle=0, previous=0, request=0, visible=true;
  const draw=()=>{ gl.uniform1f(phase,angle); gl.drawArrays(gl.TRIANGLE_STRIP,0,4); };
  function frame(time) {
    if (time-previous>=1000/30) {
      if(previous) {
        const seconds=Math.min(time-previous,100)/1000;
        angle=(angle+seconds*Math.PI*2/orbitSeconds)%(Math.PI*2);
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
