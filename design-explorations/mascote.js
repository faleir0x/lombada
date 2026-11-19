/* lombada · mascotes (coruja, bibliotecário, corvo, fantasma, traça)
 * Motor sem dependências: cada mascote é uma silhueta montada a cada quadro, com volume em camadas,
 * olhos, sobrancelhas, boca, livro de leitura e oito humores.
 * Uso: const m = new Mascote.Mascot(elemento, 'coruja'); m.setMood('read'); m.talk(); m.attn = input;
 * Cores por CSS: --m-body, --m-eye, --m-side, --m-cover, --m-page, --m-shadow.
 * Extraído de home-directions.html (rodada 2), 2026-11-18. */
(()=>{
const f=n=>(+n).toFixed(2);
const cl=(v,a,b)=>Math.max(a,Math.min(b,v));
const circ=(x,y,r)=>`M${f(x-r)} ${f(y)}a${f(r)} ${f(r)} 0 1 0 ${f(2*r)} 0a${f(r)} ${f(r)} 0 1 0 ${f(-2*r)} 0Z`;
const ell=(x,y,rx,ry)=>`M${f(x-rx)} ${f(y)}a${f(rx)} ${f(ry)} 0 1 0 ${f(2*rx)} 0a${f(rx)} ${f(ry)} 0 1 0 ${f(-2*rx)} 0Z`;
const rot=(p,cx,cy,a)=>{const c=Math.cos(a),s=Math.sin(a),x=p[0]-cx,y=p[1]-cy;return[cx+x*c-y*s,cy+x*s+y*c]};
const seg=(p0,p1,p2,p3)=>`C${f(p1[0]+(p2[0]-p0[0])/6)} ${f(p1[1]+(p2[1]-p0[1])/6)} ${f(p2[0]-(p3[0]-p1[0])/6)} ${f(p2[1]-(p3[1]-p1[1])/6)} ${f(p2[0])} ${f(p2[1])}`;
function openSmooth(p){let d='';for(let i=0;i<p.length-1;i++)d+=seg(p[i-1]||p[i],p[i],p[i+1],p[i+2]||p[i+1]);return d}
function smoothClosed(p){const N=p.length;let d=`M${f(p[0][0])} ${f(p[0][1])}`;for(let i=0;i<N;i++)d+=seg(p[(i-1+N)%N],p[i],p[(i+1)%N],p[(i+2)%N]);return d+'Z'}
function taper(a,c,b,w0,w1,n=8){const L=[],R=[];for(let i=0;i<=n;i++){const t=i/n,u=1-t,x=u*u*a[0]+2*u*t*c[0]+t*t*b[0],y=u*u*a[1]+2*u*t*c[1]+t*t*b[1],dx=2*u*(c[0]-a[0])+2*t*(b[0]-c[0]),dy=2*u*(c[1]-a[1])+2*t*(b[1]-c[1]),l=Math.hypot(dx,dy)||1,w=(w0+(w1-w0)*t)/2;L.push([x-dy/l*w,y+dx/l*w]);R.push([x+dy/l*w,y-dx/l*w])}return smoothClosed(L.concat(R.reverse()))}
const tri=a=>`M${f(a[0][0])} ${f(a[0][1])}L${f(a[1][0])} ${f(a[1][1])}L${f(a[2][0])} ${f(a[2][1])}Z`;

const S={
coruja:{n:'Coruja',c:'Lê de madrugada e não esquece nada do que você disse.',m:'Gira a cabeça, pisca um olho só, mexe as penas da orelha e bate as asas.',x:'Clichê de app de educação; precisa de muita personalidade para escapar.',
  np:5,det:['mdl','mdf','mdf'],lt:16,fid:['headturn','wink','tuft','yawn'],
  build(P){
    const hx=P.turn,sh=hx*3;
    const aR=.42-P.aR*.38+P.tr*.35,aL=-.42+P.aL*.38+P.tr*.35,LR=17+P.aR*3,LL=17+P.aL*3;
    const tR=[71+sh+Math.sin(aR)*LR,25-Math.cos(aR)*LR],tL=[29+sh+Math.sin(aL)*LL,25-Math.cos(aL)*LL];
    const body=`M${f(36+sh)} 21C${f(44+sh)} 18 ${f(56+sh)} 18 ${f(64+sh)} 21L${f(tR[0])} ${f(tR[1])}L${f(79+sh*.5)} 30C85 42 87 60 82 74C77 88 63 95 50 95C37 95 23 88 18 74C13 60 15 42 ${f(21+sh*.5)} 30L${f(tL[0])} ${f(tL[1])}Z`;
    const fl=P.flap;
    const wR=`M80 46C${f(88+fl*10)} ${f(46-fl*12)} ${f(95+fl*14)} ${f(66-fl*16)} ${f(84+fl*10)} ${f(86-fl*16)}C79 80 77 64 80 46Z`;
    const wL=`M20 46C${f(12-fl*10)} ${f(46-fl*12)} ${f(5-fl*14)} ${f(66-fl*16)} ${f(16-fl*10)} ${f(86-fl*16)}C21 80 23 64 20 46Z`;
    const ex=50+hx*9,g=26*(1-Math.abs(hx)*.25),ey=44,o=P.talk*3+P.sur*2+P.yawn*3;
    const disc=circ(ex-g/2,ey,11.5)+circ(ex+g/2,ey,11.5)+'M40 74l4 3 4-3M52 74l4 3 4-3M46 82l4 3 4-3';
    const bu=`M${f(ex-4.2)} 53L${f(ex+4.2)} 53L${f(ex)} ${f(60-o*.3)}Z`;
    const bd=o>.2?`M${f(ex-3)} ${f(57+o*.4)}L${f(ex+3)} ${f(57+o*.4)}L${f(ex)} ${f(61+o)}Z`:'';
    return{parts:[body,wR,wL,ell(42,95,5.5,3.2),ell(58,95,5.5,3.2)],det:[disc,bu,bd],eye:{x:ex,y:ey,g,rx:7,ry:7.6,sL:1-Math.max(0,hx)*.25,sR:1+Math.min(0,hx)*.25},brow:{base:20,len:13,th:3,gap:4.5},mouth:null,book:79,zz:[80,16]};
  }},
barba:{n:'Bibliotecário',c:'Já leu tudo. Julga seu gosto por cima dos óculos.',m:'A barba balança atrasada, empurra os óculos, os óculos brilham, ergue uma sobrancelha.',x:'Muito detalhe para tamanhos pequenos.',
  np:3,det:['mdl','mdf','mdg','mdk'],lt:8,fid:['glasses','glint','hmm','yawn'],
  build(P){
    const t=P.t,tr=P.tr*6;
    const head=circ(50,35,27)+ell(22,41,5,7)+ell(78,41,5,7);
    const hair=circ(25,27,7)+circ(75,27,7);
    const wv=i=>P.R?0:Math.sin(t*2.2+i*1.3)*(.6+Math.min(2,Math.abs(P.tr)*2));
    const bp=[[22,42],[17,57],[19+tr*.35,72],[25+tr*.7,84],[30+tr,93+wv(0)],[36+tr,88],[43+tr,97+wv(1)],[50+tr,91],[57+tr,97+wv(2)],[64+tr,88],[70+tr,93+wv(3)],[75+tr*.7,84],[81+tr*.35,72],[83,57],[78,42],[50,47]];
    const o=P.talk*2.5+P.sur*1.5+P.yawn*2;
    const mus=`M50 ${f(56-o)}C44 ${f(52-o)} 36 ${f(54-o)} 33 ${f(61-o*.5)}C38 ${f(59-o)} 44 ${f(60-o)} 50 ${f(60-o)}C56 ${f(60-o)} 62 ${f(59-o)} 67 ${f(61-o*.5)}C64 ${f(54-o)} 56 ${f(52-o)} 50 ${f(56-o)}Z`;
    const st=`M${f(40+tr*.6)} 68C${f(42+tr*.8)} 76 ${f(40+tr)} 83 ${f(42+tr)} 88M${f(50+tr*.6)} 67L${f(50+tr)} 89M${f(60+tr*.6)} 68C${f(58+tr*.8)} 76 ${f(60+tr)} 83 ${f(58+tr)} 88`;
    const gy=35+P.glY;
    const gl=circ(40,gy,7.2)+circ(60,gy,7.2)+`M47.2 ${f(gy-1)}Q50 ${f(gy-3)} 52.8 ${f(gy-1)}M32.8 ${f(gy-1)}L27 ${f(gy-3.5)}M67.2 ${f(gy-1)}L73 ${f(gy-3.5)}`;
    let gn='';if(P.glint>=0){const x=31+P.glint*36;if(x<46||(x>52&&x<66))gn=`M${f(x)} ${f(gy-4)}L${f(x+3)} ${f(gy+4)}`}
    return{parts:[head,hair,smoothClosed(bp)],det:[st,mus,gl,gn],eye:{x:50,y:35-(P.glY>3?1.6:0),g:20,rx:3.1,ry:3.9},brow:{base:-4,len:13,th:4.4,gap:6.5},mouth:{x:50,y:64},book:84,zz:[80,8]};
  }},
corvo:{n:'Corvo',c:'Esperto e debochado. Coleciona coisas que brilham, inclusive livros.',m:'Cabeça aos trancos como pássaro de verdade, abre o bico ao falar, mexe a cauda, dá cambalhota.',x:'Pode soar gótico.',
  np:6,det:['mdl'],lt:20,snap:1,fid:['bob','cock','tail','flip'],
  build(P){
    const hx=P.turn*5+P.hx*2.2,hy=P.nod*4+P.hy*1.6;
    const o=P.talk*.45+P.sur*.3+P.yawn*.4,hp=[67+hx,34+hy];
    const up=[[hp[0]-2,hp[1]-7],[hp[0]+24,hp[1]+1],[hp[0],hp[1]+2]].map(p=>rot(p,hp[0],hp[1],-o));
    const lo=[[hp[0],hp[1]+2],[hp[0]+19,hp[1]+4],[hp[0]-2,hp[1]+8]].map(p=>rot(p,hp[0],hp[1],o*.8));
    const ta=P.aL*.5+P.tr*.4,tl=[[40,78],[13,93],[17,99],[44,88]].map(p=>rot(p,42,83,ta));
    const fl=P.flap;
    const wing=`M57 48C${f(73+fl*8)} ${f(50-fl*14)} ${f(76+fl*12)} ${f(70-fl*18)} ${f(64+fl*10)} ${f(86-fl*16)}C59 80 55 66 57 48ZM43 88h3v9h4v2.5h-10v-2.5h3ZM53 88h3v9h4v2.5h-10v-2.5h3Z`;
    return{parts:[ell(47,64,24,27),circ(53+hx,33+hy,17),tri(up),tri(lo),`M${f(tl[0][0])} ${f(tl[0][1])}L${f(tl[1][0])} ${f(tl[1][1])}L${f(tl[2][0])} ${f(tl[2][1])}L${f(tl[3][0])} ${f(tl[3][1])}Z`,wing],det:[`M58 52C${f(66+fl*6)} ${f(60-fl*8)} ${f(67+fl*8)} ${f(74-fl*10)} ${f(62+fl*8)} ${f(84-fl*12)}`],eye:{x:57+hx,y:30+hy,g:12,rx:3.6,ry:4.6},brow:{base:14,len:8,th:2.3,gap:3},mouth:null,book:77,zz:[74,8]};
  }},
fantasma:{n:'Fantasma',c:'O livro que você terminou e não sai da cabeça.',m:'A barra ondula e atrasa quando ele se move, acena, gira no próprio eixo, dá cambalhota, boceja.',x:'Sem essa explicação, é só um fantasma.',
  np:3,det:[],float:1,lt:6,fid:['twirl','flip','yawn'],
  build(P){
    const t=P.t,tr=P.tr*8,hem=84+P.sl*3,amp=2.6+Math.min(3,Math.abs(P.tr)*5)+P.flap*1.5,sp=P.R?0:t*3.2,pts=[];
    for(let i=0;i<=14;i++){const u=i/14;pts.push([84+tr-u*68,hem+3+Math.sin(u*Math.PI*3-sp)*amp*(.55+.45*Math.sin(u*Math.PI))])}
    const d=`M16 50C16 27 31 10 50 10C69 10 84 27 84 50C84 64 ${f(84+tr*.5)} 74 ${f(pts[0][0])} ${f(pts[0][1])}`+openSmooth(pts)+`C${f(16+tr*.5)} 74 16 64 16 50Z`;
    const fl=P.flap,w=P.talk;
    return{parts:[d,circ(16-fl*3,60-fl*12-P.aL*3,6),circ(84+fl*3+w*2,60-fl*12-P.aR*3-w*9,6)],det:[],eye:{x:50,y:42,g:18,rx:4.8,ry:7},brow:null,mouth:{x:50,y:57},book:75,zz:[74,10]};
  }},
traca:{n:'Traça',c:'Come livro, literalmente. E tem o mesmo nome de uma das opções.',m:'Asas batem em rajadas e respiram devagar, antenas reagem a tudo, voa em cambalhota.',x:'Inseto afasta parte do público.',
  np:9,det:['mdf','mdl'],float:1,lt:8,fid:['flutter','antenna','flip'],
  build(P){
    const t=P.t,base=.8+(P.R?0:.1*Math.sin(t*2.1))-.42*P.sl-.18*P.doubt+P.flap*.15;
    const fq=k=>P.flut>.05?Math.sin(t*40-k)*.32*P.flut:0;
    const w=cl(base+fq(0),.25,1.08),w2=cl(base+fq(1.3),.25,1.08),lf=P.flap*4;
    const fwR=`M53 33C${f(53+16*w)} ${f(15-lf)} ${f(53+40*w)} ${f(9-lf)} ${f(53+44*w)} ${f(23-lf)}C${f(53+47*w)} 37 ${f(53+34*w)} 50 54 55Z`;
    const fwL=`M47 33C${f(47-16*w)} ${f(15-lf)} ${f(47-40*w)} ${f(9-lf)} ${f(47-44*w)} ${f(23-lf)}C${f(47-47*w)} 37 ${f(47-34*w)} 50 46 55Z`;
    const hwR=`M53 52C${f(53+28*w2)} 50 ${f(53+34*w2)} 66 ${f(53+26*w2)} 79C${f(53+18*w2)} 89 57 81 51 67Z`;
    const hwL=`M47 52C${f(47-28*w2)} 50 ${f(47-34*w2)} 66 ${f(47-26*w2)} 79C${f(47-18*w2)} 89 43 81 49 67Z`;
    const g=a=>a>0?a*.3:a*1.15;
    const aL=-.45+g(P.aL)+P.tr*.5, aR=.45-g(P.aR)+P.tr*.5;
    const A=(bx,a,s)=>{const L=19,tip=[bx+Math.sin(a)*L,22-Math.cos(a)*L],c=[bx+Math.sin(a-s*.5)*L*.55,22-Math.cos(a-s*.5)*L*.55];return[taper([bx,22],c,tip,2.6,1.3),tip]};
    const [pL,tL]=A(45,aL,-1),[pR,tR]=A(55,aR,1);
    return{parts:[fwL,fwR,hwL,hwR,ell(50,60,8.5,19)+ell(50,46,11,8.5),circ(50,32,13),pL,pR,circ(tL[0],tL[1],2.5)+circ(tR[0],tR[1],2.5)],
      det:[circ(53+30*w,27-lf,4.4*w)+circ(47-30*w,27-lf,4.4*w),'M44 57Q50 60 56 57M45 64Q50 67 55 64M46 71Q50 73 54 71'],
      eye:{x:50,y:31,g:11,rx:3.6,ry:4.6},brow:null,mouth:{x:50,y:39},book:69,zz:[66,6]};
  }}
};
const ORDER=['coruja','barba','corvo','fantasma','traca'];
const MD={idle:{},listen:{es:1.1,br:[.35,.35],ap:[.7,.7],lift:-2},read:{lid:[-.38,-.38],br:[-.2,-.2],ap:[-.25,-.25],book:1},happy:{hap:1,br:[.6,.6],ap:[.8,.8]},roll:{br:[-.35,.85],ap:[-.5,-.15]},doubt:{lid:[-.08,.18],br:[-.65,1],ap:[-.7,.8],glY:7},surprise:{br:[1,1],ap:[1,1]},sleep:{sleep:1,br:[-.25,-.25],ap:[-1,-1],lift:2,nod:.9}};
const ML=[['idle','Parado'],['listen','Ouvindo'],['read','Lendo'],['happy','Curtiu'],['roll','Revira os olhos'],['doubt','Desconfiado'],['surprise','Surpreso'],['sleep','Dormindo']];
const FD={twirl:1000,flip:1100,headturn:2300,wink:700,tuft:600,antenna:600,flutter:900,bob:800,cock:1700,glasses:1000,glint:900,hmm:1600,yawn:1700,tail:700};

const rm=matchMedia('(prefers-reduced-motion: reduce)');
const ptr={x:0,y:0,t:-1e9};
const mv=e=>{ptr.x=e.clientX;ptr.y=e.clientY;ptr.t=performance.now()};
addEventListener('pointermove',mv,{passive:true});addEventListener('pointerdown',mv,{passive:true});
const all=new Set();let UID=0;
const io=new IntersectionObserver(es=>es.forEach(en=>{if(en.target._m)en.target._m.vis=en.isIntersecting}),{rootMargin:'100px'});
function spr(o,k,t,K,C,dt){const v=k+'V';o[v]=(o[v]||0)+((t-o[k])*K-(o[v]||0)*C)*dt;o[k]+=o[v]*dt}
function eyePath(rx,ry,lid){
  if(ry<.15)ry=.15;
  if(lid<=-.995)return`M${f(-rx)} 0A${f(rx)} ${f(ry)} 0 1 0 ${f(rx)} 0A${f(rx)} ${f(ry)} 0 1 0 ${f(-rx)} 0Z`;
  const l=cl(lid,-1,.9),w=rx*Math.sqrt(1-l*l),y=l*ry;
  return`M${f(-w)} ${f(y)}A${f(rx)} ${f(ry)} 0 ${l<0?1:0} 0 ${f(w)} ${f(y)}Z`;
}
class Mascot{
  constructor(host,key){
    this.host=host;host._m=this;this.id='g'+(++UID);this.N=8;
    let ls='';for(let i=0;i<this.N;i++)ls+=`<use href="#${this.id}" class="ml"/>`;
    const eye='<g><path class="mell"/><circle class="mshine"/><path class="marc"/></g>';
    host.innerHTML=`<svg class="msvg" viewBox="-14 -20 128 128" aria-hidden="true"><defs><g id="${this.id}"></g></defs><ellipse class="mshadow" cx="50" cy="99" rx="26" ry="3.2"/><g class="mr"><g>${ls}</g><g class="mf"><use href="#${this.id}" class="mface"/><g class="mfeat"><g class="mdet"></g><g class="meyes">${eye}${eye}</g><path class="mbrow"/><path class="mbrow"/><path class="mmouth"/></g><g class="mbook"><path class="mbc" d="M0 5Q-12 -1 -24 1L-24 15Q-12 13 0 19Q12 13 24 15L24 1Q12 -1 0 5Z"/><path class="mbp" d="M0 3Q-11 -2 -21 0L-21 13Q-11 11 0 16Z"/><path class="mbp" d="M0 3Q11 -2 21 0L21 13Q11 11 0 16Z"/><path class="mbl" d="M-17 4L-5 5M-17 7L-5 8M-17 10L-7 11M5 5L17 4M5 8L17 7M5 11L15 10"/><path class="mbp mflip"/></g></g></g><g class="mz"><text class="mzt">z</text><text class="mzt">z</text><text class="mzt">z</text></g></svg>`;
    const q=s=>host.querySelector(s);
    this.sil=q('defs g');this.root=q('.mr');this.layers=[...host.querySelectorAll('.ml')];this.front=q('.mf');this.feat=q('.mfeat');this.det=q('.mdet');this.shadow=q('.mshadow');
    this.eyes=[...q('.meyes').children].map(g=>({g,ell:g.children[0],sh:g.children[1],arc:g.children[2]}));
    this.brows=[...host.querySelectorAll('.mbrow')];this.mouth=q('.mmouth');this.book=q('.mbook');this.flipEl=q('.mflip');this.zs=[...host.querySelectorAll('.mzt')];
    this.s={hx:0,hy:0,ex:0,ey:0,tilt:0,lift:0,es:1,lidL:-1,lidR:-1,bL:0,bR:0,aL:0,aR:0,hap:0,sl:0,bk:0,sur:0,glY:0,turn:0,nod:0,sq:0,tr:0,wkL:0,wkR:0,flap:0};
    this.mood='idle';this.mT=performance.now();this.t0=Math.random()*10;this.blinkAt=this.mT+800+Math.random()*3000;this.blinkT=-1;this.wanderAt=0;this.wx=0;this.wy=0;this.hops=0;this.side=1;this.doubtAt=0;this.fid=null;this.fidAt=this.mT+2500+Math.random()*4000;this.talkT=-1e9;this.snapAt=0;this.shx=0;this.shy=0;this.vis=false;
    this.setShape(key);all.add(this);io.observe(host);this.tick(performance.now(),.016);
  }
  setShape(key){
    const d=this.def=S[key];this.key=key;
    this.sil.innerHTML='<path/>'.repeat(d.np);this.parts=[...this.sil.children];
    this.det.innerHTML=d.det.map(c=>`<path class="${c}"/>`).join('');this.dets=[...this.det.children];
    this.fid=null;this.s.sqV=(this.s.sqV||0)+3;
  }
  setMood(m){
    const now=performance.now();if(m===this.mood)return;this.mood=m;this.mT=now;this.fid=null;this.s.sqV=(this.s.sqV||0)+2.4;
    if(m==='happy'){this.hops=2;this.nextHop=now+60}
    if(m==='surprise'&&!rm.matches){this.s.liftV=-85;this.s.sqV+=3}
    if(m==='doubt'){this.side=Math.random()<.5?-1:1;this.doubtAt=now+1500}
  }
  talk(){this.talkT=performance.now()}
  tick(now,dt){
    const s=this.s,d=this.def,R=rm.matches,t=now/1000+this.t0,M=this.mood,mt=(now-this.mT)/1000,T=MD[M]||{};
    const r=this.host.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height*.4;
    const dir=(px,py)=>{const dx=px-cx,dy=py-cy,L=Math.hypot(dx,dy)||1,k=L/(L+200);return[dx/L*k,dy/L*k]};
    let tx=0,ty=0;
    if(M==='read'){const L=mt/.75,q=L%1,li=Math.floor(L)%3;tx=q<.82?-.55+q/.82*1.1:.55-(q-.82)/.18*1.1;ty=.42+li*.1}
    else if(M==='roll'){const p=mt/.95;if(p<1){const th=Math.PI+.35-p*(Math.PI+.7);tx=Math.cos(th)*.95;ty=-Math.sin(th)*.95}else{tx=.35;ty=-.22}}
    else if(M==='doubt'){if(now>this.doubtAt){this.side*=-1;this.doubtAt=now+1500+Math.random()*900}tx=.8*this.side;ty=.05}
    else if(M==='sleep'){tx=0;ty=.25}
    else if(M==='listen'&&this.attn){const a=this.attn.getBoundingClientRect();[tx,ty]=dir(a.left+Math.min(a.width*.6,40+(this.attn.value||'').length*8),a.top+a.height/2)}
    else if(now-ptr.t<2600)[tx,ty]=dir(ptr.x,ptr.y);
    else if(!R){if(now>this.wanderAt){this.wanderAt=now+1300+Math.random()*2700;const c=Math.random()<.35;this.wx=c?0:(Math.random()*2-1)*.65;this.wy=c?0:(Math.random()*2-1)*.4}tx=this.wx;ty=this.wy}
    spr(s,'ex',tx,300,26,dt);spr(s,'ey',ty,300,26,dt);
    if(d.snap){if(now>this.snapAt){this.snapAt=now+280+Math.random()*480;this.shx=tx;this.shy=ty}spr(s,'hx',this.shx,520,30,dt);spr(s,'hy',this.shy,520,30,dt)}
    else{spr(s,'hx',tx,70,13,dt);spr(s,'hy',ty,70,13,dt)}
    let es=T.es||1,lL=T.lid?T.lid[0]:-1,lR=T.lid?T.lid[1]:-1,bL=T.br?T.br[0]:0,bR=T.br?T.br[1]:0,aL=T.ap?T.ap[0]:0,aR=T.ap?T.ap[1]:0,lift=T.lift||0,tilt=s.hx*3,hap=T.hap||0,sl=T.sleep||0,bk=T.book||0,sur=0,glY=T.glY||0,turn=0,nod=T.nod||0,flap=0;
    if(M==='listen')tilt+=d.lt;
    if(M==='doubt')tilt=-5*this.side;
    if(M==='roll'){const p=mt/.95;if(p<1){lift=-3*Math.sin(p*Math.PI)}else{lL=lR=-.15;tilt=4}}
    if(M==='surprise'){sur=mt<1.3?1:.25;es=mt<1.1?1.32:1.12;if(mt<.7)flap=1}
    if(M==='sleep')tilt=7;
    if(M==='read'){const L=mt/.75;nod=(Math.floor(L)%3)*.18}
    if(M==='happy')flap=mt<1.5&&!R?.5+.5*Math.sin(t*22):.2;
    if(d.sway&&!R)tilt+=Math.sin(t*1.2)*3;
    let tw=0,fl=0,wkL=0,wkR=0,flut=0,glint=-1,yawn=0;
    if(M==='idle'&&!R&&!this.fid&&now>this.fidAt){const n=d.fid[Math.floor(Math.random()*d.fid.length)];this.fid={n,t0:now,d:FD[n],side:Math.random()<.5?-1:1}}
    if(this.fid){const F=this.fid,p=(now-F.t0)/F.d;
      if(p>=1||M!=='idle'){this.fid=null;this.fidAt=now+4200+Math.random()*5200}
      else{const e=.5-.5*Math.cos(p*Math.PI);
        switch(F.n){
          case'twirl':tw=e*Math.PI*2;break;
          case'flip':fl=e*360*F.side;lift-=10*Math.sin(p*Math.PI);break;
          case'headturn':turn=F.side*(p<.7?1:0);break;
          case'wink':if(p>.15&&p<.75){F.side>0?wkR=1:wkL=1}break;
          case'tuft':case'antenna':case'tail':if(!F.k){F.k=1;s.aLV=(s.aLV||0)+16*F.side;s.aRV=(s.aRV||0)-16*F.side}break;
          case'flutter':flut=1;break;
          case'bob':nod=(p<.18||(p>.36&&p<.54))?1:0;break;
          case'cock':turn=F.side*.9;tilt+=F.side*16;break;
          case'glasses':glY=p<.35?-3:0;break;
          case'glint':glint=p;break;
          case'hmm':bR=1;bL=-.3;break;
          case'yawn':yawn=Math.sin(p*Math.PI);lL=lR=-.3-yawn*.3;break;
        }}}
    if(M==='happy'&&mt<1.2)flut=1;if(M==='surprise'&&mt<.5)flut=.8;
    const ts=d.snap?[300,22]:[120,14];
    spr(s,'tilt',tilt,ts[0],ts[1],dt);spr(s,'es',es,220,17,dt);spr(s,'lidL',lL,240,24,dt);spr(s,'lidR',lR,240,24,dt);
    spr(s,'bL',bL,200,18,dt);spr(s,'bR',bR,200,18,dt);spr(s,'aL',aL,110,8,dt);spr(s,'aR',aR,110,8,dt);
    spr(s,'hap',hap,180,18,dt);spr(s,'sl',sl,60,14,dt);spr(s,'bk',bk,170,11,dt);spr(s,'sur',sur,200,18,dt);
    spr(s,'glY',glY,160,15,dt);spr(s,'turn',turn,d.snap?360:80,d.snap?26:13,dt);spr(s,'nod',nod,d.snap?500:120,d.snap?30:15,dt);
    spr(s,'wkL',wkL,600,40,dt);spr(s,'wkR',wkR,600,40,dt);spr(s,'flap',flap,320,16,dt);
    spr(s,'tr',-(s.hxV||0)*.12+(R?0:Math.sin(t*1.3)*.15),60,7,dt);
    if(this.hops>0&&now>this.nextHop&&!R){s.liftV=-118;this.hops--;this.nextHop=now+540}
    spr(s,'lift',lift,240,12,dt);spr(s,'sq',0,230,11,dt);
    const tp=(now-this.talkT)/900,talk=tp>=0&&tp<1?Math.abs(Math.sin(tp*Math.PI*5))*(1-tp*.5):0;
    if(talk>0&&!R)s.lift+=Math.sin(tp*Math.PI*5)*.15;
    const breath=R?0:Math.sin(t*1.7)*.013+s.sl*Math.sin(t*.9)*.03,bob=(d.float&&!R)?Math.sin(t*1.4)*2.6*(1-s.sl*.7):0;
    const st=cl(-(s.liftV||0)*.0011,-.09,.12)+s.sq*.045+breath;let sx=1-st*.6;const sy=1+st;
    const ct=Math.cos(tw);sx*=Math.abs(ct)<.05?.05*Math.sign(ct||1):ct;
    const Y=96+s.lift+bob;
    this.root.setAttribute('transform',`rotate(${f(fl)} 50 ${f(55+s.lift+bob)}) translate(50 ${f(Y)}) rotate(${f(s.tilt)}) scale(${f(sx)} ${f(sy)}) translate(-50 -96)`);
    this.feat.setAttribute('opacity',ct>0?1:0);
    const lh=s.lift+bob;this.shadow.setAttribute('rx',f(cl(26*(1+lh*.012),12,30)));this.shadow.setAttribute('opacity',f(cl(1+lh*.03,.2,1)));
    const P={t,R,tr:s.tr,flap:s.flap,flut,turn:s.turn,nod:s.nod,aL:s.aL,aR:s.aR,sl:s.sl,talk,glY:s.glY,glint,hx:s.hx,hy:s.hy,sur:s.sur,yawn,doubt:M==='doubt'?1:0};
    const o=d.build(P);
    o.parts.forEach((v,i)=>this.parts[i].setAttribute('d',v));
    o.det.forEach((v,i)=>this.dets[i].setAttribute('d',v));
    const D=6,fx=s.hx*D*.55,fy=s.hy*D*.45,bx=1.5-s.hx*D*.9,by=2.6-s.hy*D*.7;
    for(let i=0;i<this.N;i++){const k=1-i/this.N;this.layers[i].setAttribute('transform',`translate(${f(fx+bx*k)} ${f(fy+by*k)})`)}
    this.front.setAttribute('transform',`translate(${f(fx)} ${f(fy)})`);
    let b=1;
    if(!R&&s.hap<.5&&s.sl<.5){
      if(this.blinkT<0&&now>this.blinkAt){this.blinkT=now;this.blinkAt=now+(Math.random()<.2?260:2200+Math.random()*3400)}
      if(this.blinkT>=0){const p=(now-this.blinkT)/150;if(p>=1)this.blinkT=-1;else b=1-Math.sin(p*Math.PI)*.92}
    }
    const E=o.eye,ex=s.ex*3.1,ey=s.ey*2.5,k=s.hap>=s.sl?-1:.75;
    const pos=[];
    this.eyes.forEach((q,i)=>{
      const x=E.x+(i?E.g/2:-E.g/2)+ex,y=E.y+ey,sc=s.es*(i?(E.sR||1):(E.sL||1)),lid=i?s.lidR:s.lidL;
      const c=cl(Math.max(s.hap,s.sl,i?s.wkR:s.wkL),0,1);pos.push([x,y,sc]);
      q.g.setAttribute('transform',`translate(${f(x)} ${f(y)}) scale(${f(sc)} ${f(sc*b)})`);
      q.ell.setAttribute('d',eyePath(E.rx,E.ry*(1-c*.95),lid));
      q.sh.setAttribute('cx',f(E.rx*.34));q.sh.setAttribute('cy',f(-E.ry*.36));q.sh.setAttribute('r',f(E.rx*.28));q.sh.setAttribute('opacity',f(cl((1-c*2)*(lid<-.45?1:0),0,1)));
      q.arc.setAttribute('d',`M${f(-E.rx*1.05)} ${f(k<0?E.ry*.2:-E.ry*.05)}Q0 ${f(k*E.ry*1.1)} ${f(E.rx*1.05)} ${f(k<0?E.ry*.2:-E.ry*.05)}`);
      q.arc.setAttribute('stroke-width',f(E.rx*.7));q.arc.setAttribute('opacity',f(c));
    });
    if(o.brow){const B=o.brow;this.brows.forEach((p,i)=>{
      const raise=i?s.bR:s.bL,[x,y0,sc]=pos[i],by=E.y+s.ey*1.2-E.ry*sc-B.gap-raise*3.4,hl=B.len/2,a=(B.base-raise*9)*Math.PI/180,ta=Math.tan(a)*hl;
      const xo=x-s.ex*1.4,p1=i?[xo-hl,by+ta]:[xo-hl,by-ta],p2=i?[xo+hl,by-ta]:[xo+hl,by+ta];
      p.setAttribute('d',`M${f(p1[0])} ${f(p1[1])}Q${f(xo)} ${f((p1[1]+p2[1])/2-1.6-raise*.8)} ${f(p2[0])} ${f(p2[1])}`);p.setAttribute('stroke-width',B.th);
    })}else this.brows.forEach(p=>p.setAttribute('d',''));
    if(o.mouth){const m=o.mouth,mx=m.x+ex*.6,my=m.y+ey*.5,op=Math.max(talk,s.sur*.9,yawn);
      this.mouth.setAttribute('d',op>.04?`M${f(mx-2.6-op)} ${f(my)}a${f(2.6+op)} ${f(.5+op*3.4)} 0 1 0 ${f(5.2+op*2)} 0a${f(2.6+op)} ${f(.5+op*3.4)} 0 1 0 ${f(-5.2-op*2)} 0Z`:s.hap>.3?`M${f(mx-4)} ${f(my)}Q${f(mx)} ${f(my+5*s.hap)} ${f(mx+4)} ${f(my)}Q${f(mx)} ${f(my+2*s.hap)} ${f(mx-4)} ${f(my)}Z`:'');
    }else this.mouth.setAttribute('d','');
    const bks=Math.max(0,s.bk);this.book.setAttribute('transform',`translate(50 ${f(o.book)}) scale(${f(bks)})`);this.book.setAttribute('opacity',bks>.02?1:0);
    let fd='';if(M==='read'&&bks>.5){const ph=(mt/.75)%3;if(ph>2.35){const p=(ph-2.35)/.65,x=21-42*p,h=Math.sin(p*Math.PI)*6;fd=`M0 3Q${f(x/2)} ${f(-2-h)} ${f(x)} ${f(-h*.6)}L${f(x)} ${f(13-h*.6)}Q${f(x/2)} ${f(11-h)} 0 16Z`}}
    this.flipEl.setAttribute('d',fd);
    this.zs.forEach((z,i)=>{const ph=((t*.45)+i/3)%1;z.setAttribute('x',f(o.zz[0]+ph*10+Math.sin(ph*6)*2));z.setAttribute('y',f(o.zz[1]-ph*22));z.setAttribute('font-size',f(7+ph*6));z.setAttribute('opacity',f(cl(s.sl*1.4-.4,0,1)*Math.sin(ph*Math.PI)))});
  }
}
let last=performance.now();
function loop(now){const dt=Math.min(.033,(now-last)/1000);last=now;for(const m of all)if(m.vis)m.tick(now,dt);requestAnimationFrame(loop)}
requestAnimationFrame(loop);
window.Mascote={Mascot,S,ORDER,ML,MD,all};
})();
