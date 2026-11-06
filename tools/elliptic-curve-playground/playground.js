const fields = ['a1', 'a2', 'a3', 'a4', 'a6'];
const status = document.getElementById('curve-status');
const pointStatus = document.getElementById('point-status');
const searchStatus = document.getElementById('search-status');
const results = document.getElementById('point-results');
const searchButton = document.getElementById('search-points');
const stopButton = document.getElementById('stop-search');
let curve = null, searchToken = 0, plottedPoints = [];
const abs = n => n < 0n ? -n : n;
function gcd(a,b) { a=abs(a); b=abs(b); while(b) [a,b]=[b,a%b]; return a; }
function Q(n,d=1n) { if(d===0n) throw Error('Denominator cannot be zero.'); if(d<0n) {n=-n;d=-d;} const g=gcd(n,d); return {n:n/g,d:d/g}; }
const add=(a,b)=>Q(a.n*b.d+b.n*a.d,a.d*b.d);
const neg=a=>Q(-a.n,a.d);
const sub=(a,b)=>add(a,neg(b));
const mul=(a,b)=>Q(a.n*b.n,a.d*b.d);
const div=(a,b)=>Q(a.n*b.d,a.d*b.n);
const sq=a=>mul(a,a);
const cube=a=>mul(sq(a),a);
const N=n=>Q(BigInt(n));
const show=a=>a.d===1n?String(a.n):`${a.n}/${a.d}`;
const num=a=>Number(a.n)/Number(a.d);
function parse(text) {
  text=text.trim();
  if(!/^[+-]?\d+(?:\/[+-]?\d+)?$/.test(text)||text.length>100) throw Error(`Invalid rational number: ${text || '(empty)'}`);
  const [n,d='1']=text.split('/'); return Q(BigInt(n),BigInt(d));
}
function isqrt(n) {
  if(n<0n) return null;
  if(n<2n) return n;
  let x=1n<<BigInt(Math.ceil(n.toString(2).length/2));
  while(true) {const y=(x+n/x)>>1n; if(y>=x) return x; x=y;}
}
function root(a) {if(a.n<0n)return null;const n=isqrt(a.n),d=isqrt(a.d);return n*n===a.n&&d*d===a.d?Q(n,d):null;}
function setStatus(el,text,kind='') {el.textContent=text;el.className=`explorer-status ${kind}`;}
function invariants(a) {
  const [a1,a2,a3,a4,a6]=a;
  const b2=add(sq(a1),mul(N(4),a2));
  const b4=add(mul(a1,a3),mul(N(2),a4));
  const b6=add(sq(a3),mul(N(4),a6));
  const b8=add(mul(sq(a1),a6),mul(N(4),mul(a2,a6)));
  const b8rest=sub(mul(a2,sq(a3)),add(mul(a1,mul(a3,a4)),sq(a4)));
  const b8full=add(b8,b8rest);
  const c4=sub(sq(b2),mul(N(24),b4));
  const c6=add(sub(neg(cube(b2)),neg(mul(N(36),mul(b2,b4)))),neg(mul(N(216),b6)));
  const discTerms=add(mul(sq(b2),b8full),mul(N(8),cube(b4)));
  const discTerms2=sub(mul(N(27),sq(b6)),mul(N(9),mul(b2,mul(b4,b6))));
  const delta=neg(add(discTerms,discTerms2));
  return {b2,b4,b6,b8:b8full,c4,c6,delta,j:delta.n===0n?null:div(cube(c4),delta)};
}
function onCurve(a,x,y) {
  const [a1,a2,a3,a4,a6]=a;
  return sub(add(add(sq(y),mul(a1,mul(x,y))),mul(a3,y)),add(add(cube(x),mul(a2,sq(x))),add(mul(a4,x),a6))).n===0n;
}
function stopSearch(text='') {searchToken++;stopButton.hidden=true;searchButton.disabled=false;if(text)setStatus(searchStatus,text);}
function analyze() {
  stopSearch(); results.hidden=true; results.replaceChildren(); plottedPoints=[];
  try {
    const a=fields.map(id=>parse(document.getElementById(id).value));
    const inv=invariants(a);
    curve={a,inv};
    const box=document.getElementById('invariants');box.replaceChildren();
    for(const [label,value] of [['Discriminant Δ',inv.delta],['j-invariant',inv.j],['c4',inv.c4],['c6',inv.c6]]) {
      const cell=document.createElement('div');cell.className='invariant-cell';
      const title=document.createElement('span');title.textContent=label;
      const strong=document.createElement('strong');strong.textContent=value===null?'undefined (singular)':show(value);
      cell.append(title,strong);box.append(cell);
    }
    box.hidden=false;
    setStatus(status,inv.delta.n===0n?'Singular model: discriminant is zero. Choose a nonsingular curve.':'Nonsingular elliptic curve over ℚ.',inv.delta.n===0n?'bad':'good');
    draw();return curve;
  } catch(error) {curve=null;document.getElementById('invariants').hidden=true;setStatus(status,error.message,'bad');draw();return null;}
}
function draw() {
  const canvas=document.getElementById('curve-plot'),ctx=canvas.getContext('2d'),w=canvas.width,h=canvas.height;
  ctx.fillStyle='#171c20';ctx.fillRect(0,0,w,h);
  if(!curve||curve.inv.delta.n===0n)return;
  const rangeInput=document.getElementById('plot-range');
  const range=Number(rangeInput.value);
  if(!Number.isInteger(range)||range<1||range>100)return;
  const [a1,,a3]=curve.a.map(num),{b2,b4,b6}=curve.inv;
  const B2=num(b2),B4=num(b4),B6=num(b6),samples=[];
  let ymax=1;
  for(let i=0;i<=800;i++) {
    const x=-range+2*range*i/800;
    const rad=4*x*x*x+B2*x*x+2*B4*x+B6;
    if(rad<0||!Number.isFinite(rad)) {samples.push(null);continue;}
    const r=Math.sqrt(rad),middle=-a1*x-a3;
    const pair=[(middle+r)/2,(middle-r)/2];samples.push(pair);
    ymax=Math.max(ymax,Math.abs(pair[0]),Math.abs(pair[1]));
  }
  ymax*=1.08;
  const sx=x=>w*(x+range)/(2*range),sy=y=>h*(1-y/ymax)/2;
  ctx.strokeStyle='#39434a';ctx.lineWidth=1;
  ctx.beginPath();ctx.moveTo(sx(0),0);ctx.lineTo(sx(0),h);ctx.moveTo(0,sy(0));ctx.lineTo(w,sy(0));ctx.stroke();
  ctx.strokeStyle='#bdf226';ctx.lineWidth=2.5;
  for(let branch=0;branch<2;branch++) {ctx.beginPath();let open=false;for(let i=0;i<samples.length;i++) {if(!samples[i]) {open=false;continue;}const y=sy(samples[i][branch]);if(!open){ctx.moveTo(i,y);open=true;}else ctx.lineTo(i,y);}ctx.stroke();}
  for(const point of plottedPoints) {const x=num(point.x),y=num(point.y);if(Math.abs(x)>range||Math.abs(y)>ymax)continue;ctx.fillStyle='#f8f9fa';ctx.beginPath();ctx.arc(sx(x),sy(y),5,0,2*Math.PI);ctx.fill();}
  ctx.fillStyle='#868e96';ctx.font='16px sans-serif';ctx.fillText('x',w-20,sy(0)-8);ctx.fillText('y',sx(0)+8,20);
}
fields.forEach(id=>document.getElementById(id).addEventListener('input',()=>{curve=null;document.getElementById('invariants').hidden=true;setStatus(status,'Analyze the changed curve to update the results.');setStatus(pointStatus,'');setStatus(searchStatus,'');stopSearch();results.hidden=true;draw();}));
document.getElementById('analyze-button').addEventListener('click',analyze);
document.getElementById('example-button').addEventListener('click',()=>{['0','0','0','-1','1'].forEach((v,i)=>document.getElementById(fields[i]).value=v);analyze();});
document.getElementById('plot-range').addEventListener('input',draw);
document.getElementById('check-point').addEventListener('click',()=>{
  if(!curve&&!analyze())return;
  if(curve.inv.delta.n===0n){setStatus(pointStatus,'A singular model is not an elliptic curve.','bad');return;}
  try {const x=parse(document.getElementById('point-x').value),y=parse(document.getElementById('point-y').value),yes=onCurve(curve.a,x,y);setStatus(pointStatus,yes?`(${show(x)}, ${show(y)}) lies on the curve.`:`(${show(x)}, ${show(y)}) does not lie on the curve.`,yes?'good':'bad');if(yes){plottedPoints.push({x,y});draw();}}
  catch(error){setStatus(pointStatus,error.message,'bad');}
});
searchButton.addEventListener('click',()=>{
  if(!curve&&!analyze())return;
  if(curve.inv.delta.n===0n){setStatus(searchStatus,'Choose a nonsingular curve first.','bad');return;}
  const ni=document.getElementById('numerator-bound'),di=document.getElementById('denominator-bound');
  if(!ni.reportValidity()||!di.reportValidity())return;
  const maxP=Number(ni.value),maxQ=Number(di.value);
  if(!Number.isInteger(maxP)||!Number.isInteger(maxQ)||maxP<1||maxP>200||maxQ<1||maxQ>30){setStatus(searchStatus,'Choose whole-number bounds within the displayed limits.','bad');return;}
  stopSearch();const token=++searchToken;results.replaceChildren();results.hidden=false;searchButton.disabled=true;stopButton.hidden=false;plottedPoints=[];
  let p=-maxP,q=1,checked=0,found=0;
  const {a,inv}=curve;
  function step(){
    if(token!==searchToken)return;
    let batch=0;
    while(q<=maxQ&&batch++<180){
      if(gcd(BigInt(p),BigInt(q))===1n){
        checked++;const x=Q(BigInt(p),BigInt(q));
        const rad=add(add(mul(N(4),cube(x)),mul(inv.b2,sq(x))),add(mul(N(2),mul(inv.b4,x)),inv.b6));
        const r=root(rad);
        if(r!==null){
          const center=neg(add(mul(a[0],x),a[2]));
          const ys=[div(add(center,r),N(2)),div(sub(center,r),N(2))];
          for(const y of ys){if(ys.indexOf(y)!==0&&show(y)===show(ys[0]))continue;
            if(!onCurve(a,x,y))continue;
            found++;plottedPoints.push({x,y});
            const chip=document.createElement('span');chip.className='point-chip';chip.textContent=`(${show(x)}, ${show(y)})`;results.append(chip);
          }
        }
      }
      p++;if(p>maxP){p=-maxP;q++;}
    }
    if(q<=maxQ){setStatus(searchStatus,`Searching denominator ${q}/${maxQ} · ${found} points found…`);setTimeout(step,0);}
    else {stopButton.hidden=true;searchButton.disabled=false;setStatus(searchStatus,`${found} affine rational point${found===1?'':'s'} found over ${checked} x values.`,found?'good':'');draw();}
  }
  step();
});
stopButton.addEventListener('click',()=>{stopSearch('Search stopped.');draw();});
analyze();
