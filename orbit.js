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
    const vec2 size=vec2(900.,300.);
    const vec2 eye=vec2(744.,172.);
    const vec2 axes=vec2(36.,23.);
    // Curved latitude coordinate, locally parallel to the photographed belts.
    float bandHeight(float x){return 127.+.00030*(x-760.)*(x-760.)-.065*(x-760.);}
    // Velocity = (dPsi/dy, -dPsi/dx). Adjacent jets split around the core.
    vec2 velocity(vec2 p){
      float lat=p.y-bandHeight(p.x);
      vec2 gradLat=vec2(.065-.00060*(p.x-760.),1.);
      vec2 q=(p-eye)/axes, gradR=2.*q/axes;
      float r=dot(q,q);
      float bend=p.x*.048+lat*.10, envelope=exp(-lat*lat/1100.);
      float jets=70.*sin(lat/16.)+22.*sin(lat/7.5)+24.*sin(bend)*envelope;
      vec2 gradJets=gradLat*(70./16.*cos(lat/16.)+22./7.5*cos(lat/7.5)
                      -48.*lat/1100.*sin(bend)*envelope)
                    +24.*envelope*cos(bend)*(vec2(.048,0.)+.10*gradLat);
      float gate=clamp((r-.7)/3.1,0.,1.);
      vec2 grad=gradJets*smoothstep(.7,3.8,r)
                +gradR*(jets*6.*gate*(1.-gate)/3.1+180./(1.+r));
      return vec2(grad.y,-grad.x);
    }
    vec2 traceFlow(vec2 p,float seconds){
      // Midpoint backtrace in two short steps through the same velocity field.
      float stepTime=seconds*.5;
      for(int i=0;i<2;i++){
        vec2 mid=p-.5*stepTime*velocity(p);
        p-=stepTime*velocity(mid);
      }
      return p;
    }
    void main(){
      vec2 p=uv*size;
      vec3 original=texture2D(scene,uv).rgb;
      float edge=texture2D(aperture,uv).a;
      if(edge<.01){gl_FragColor=vec4(original,1.);return;}
      float horizon=64.+.00040*(p.x-655.)*(p.x-655.)-.085*(p.x-655.);
      float mask=edge*smoothstep(-6.,12.,p.y-horizon);
      float border=min(min(p.x-150.,827.-p.x),min(p.y-70.,244.-p.y));
      mask*=smoothstep(0.,14.,border);
      vec2 local=(p-eye)/axes;
      float radius=length(local);
      float t=fract(stormAngle/6.2831853*15.);
      float a=fract(t+.5), b=fract(t);
      float weight=.5-.5*cos(6.2831853*a);
      vec2 drift=vec2(4.*sin(phase),0.)*mask;
      vec2 u=traceFlow(p+drift,(a-.5)*6.*mask);
      vec2 v=traceFlow(p+drift,(b-.5)*6.*mask);
      vec3 clouds=mix(texture2D(scene,v/size).rgb,texture2D(scene,u/size).rgb,weight);
      if(radius<1.35){
        float c=cos(stormAngle), s=sin(stormAngle);
        vec2 rolled=eye+axes*(mat2(c,s,-s,c)*local);
        vec3 storm=texture2D(scene,rolled/size).rgb;
        clouds=mix(storm,clouds,smoothstep(.75,1.35,radius));
      }
      gl_FragColor=vec4(mix(original,clouds,mask),1.);
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
