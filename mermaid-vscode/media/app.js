(function(){
'use strict';
const vscode=(typeof acquireVsCodeApi==='function')?acquireVsCodeApi():null;
const INIT=(typeof window!=='undefined'&&window.__INITIAL__)?window.__INITIAL__:{};
const $=id=>document.getElementById(id);
const NS='http://www.w3.org/2000/svg';
const canvas=$('canvas'), scene=$('scene'), gEdges=$('gEdges'), gTables=$('gTables'),
      gTop=$('gTop'), gGuides=$('gGuides'), src=$('src'), hlcode=$('hlcode'), hl=$('hl'),
      panel=$('panel'), statsEl=$('stats'), zoomLbl=$('zoomLbl'),
      parseDot=$('parseDot'), parseText=$('parseText'), parseFoot=$('parseFoot'),
      saveState=$('saveState'),
      mm=$('minimap'), mmContent=$('mmContent'), mmView=$('mmView'),
      exportMenu=$('exportMenu'), layoutSel=$('layoutSel'),
      docs=$('docs'), docsBackdrop=$('docsBackdrop');

const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
const esc=s=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
function svgEl(tag,attrs={}){const el=document.createElementNS(NS,tag);for(const k in attrs)el.setAttribute(k,attrs[k]);return el;}

const store={
  get(k){return (INIT.prefs||{})[k]??null;},
  set(k,v){INIT.prefs=INIT.prefs||{};INIT.prefs[k]=v;if(vscode)vscode.postMessage({type:'prefs',prefs:INIT.prefs});}
};
const cssVar=n=>getComputedStyle(document.documentElement).getPropertyValue(n).trim();

/* ══════════ ícones ══════════ */
const ICONS={
  copy:'<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
  download:'<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/>',
  chevD:'<path d="m6 9 6 6 6-6"/>',
  sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon:'<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
  panel:'<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18"/>',
  wand:'<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/>',
  minus:'<path d="M5 12h14"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  fit:'<path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>',
  book:'<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>',
  x:'<path d="M18 6 6 18M6 6l12 12"/>'
};
function icon(n,s=16){return `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICONS[n]}</svg>`}
document.querySelectorAll('[data-icon]').forEach(el=>{el.innerHTML=icon(el.dataset.icon,el.dataset.size||16)});

/* ══════════ exemplos ══════════ */
const EXAMPLES=[
{name:'E-commerce',code:
`erDiagram
    USUARIO ||--o{ PEDIDO : realiza
    USUARIO ||--o{ CARRINHO : possui
    PEDIDO ||--|{ ITEM_PEDIDO : contem
    PRODUTO ||--o{ ITEM_PEDIDO : e_comprado
    PRODUTO ||--o{ CARRINHO_ITEM : esta_em
    CARRINHO ||--o{ CARRINHO_ITEM : contem
    PEDIDO ||--|| ENDERECO : entrega_em
    USUARIO ||--o{ ENDERECO : tem
    USUARIO ||..o{ AVALIACAO : faz
    PRODUTO ||..o{ AVALIACAO : recebe
    CATEGORIA ||--o{ PRODUTO : organiza
    PRODUTO ||--o{ IMAGEM : possui
    PEDIDO ||--|| STATUS_PEDIDO : tem

    USUARIO {
        int id PK
        string email UK
        string senha
        string nome
        string telefone
        datetime data_criacao
    }
    PEDIDO {
        int id PK
        int usuario_id FK
        int endereco_id FK
        decimal total
        datetime criado_em
    }
    ITEM_PEDIDO {
        int id PK
        int pedido_id FK
        int produto_id FK
        int quantidade
        decimal preco_unitario
    }
    PRODUTO {
        int id PK
        int categoria_id FK
        string nome
        string slug UK
        decimal preco
        int estoque
    }
    CATEGORIA {
        int id PK
        string nome UK
        int categoria_pai_id FK
    }
    CARRINHO {
        int id PK
        int usuario_id FK
        datetime atualizado_em
    }
    CARRINHO_ITEM {
        int id PK
        int carrinho_id FK
        int produto_id FK
        int quantidade
    }
    ENDERECO {
        int id PK
        int usuario_id FK
        string logradouro
        string cidade
        string uf
        string cep
    }
    STATUS_PEDIDO {
        int id PK
        string nome UK
    }
    AVALIACAO {
        int id PK
        int usuario_id FK
        int produto_id FK
        int nota
        text comentario
    }
    IMAGEM {
        int id PK
        int produto_id FK
        string url
        string alt
    }`},
{name:'Blog',code:
`erDiagram
    AUTOR ||--o{ POST : escreve
    POST ||--|{ COMENTARIO : recebe
    LEITOR ||..o{ COMENTARIO : publica
    POST }o..o{ TAG : marcado_com
    POST }o--|| CATEGORIA : pertence

    AUTOR {
        int id PK
        string nome
        string email UK
        text bio
        datetime criado_em
    }
    POST {
        int id PK
        int autor_id FK
        int categoria_id FK
        string titulo
        text conteudo
        datetime publicado_em
    }
    COMENTARIO {
        int id PK
        int post_id FK
        int leitor_id FK
        text mensagem
    }
    TAG {
        int id PK
        string slug UK
    }
    CATEGORIA {
        int id PK
        string nome
    }
    LEITOR {
        int id PK
        string email UK
        string nome
    }`},
{name:'Streaming',code:
`erDiagram
    USUARIO ||--o{ PERFIL : gerencia
    USUARIO ||--o| ASSINATURA : assina
    PERFIL ||--o{ HISTORICO : acumula
    TITULO ||--o{ EPISODIO : dividido_em
    HISTORICO }o..|| TITULO : refere
    CATEGORIA ||--o{ TITULO : agrupa

    USUARIO {
        int id PK
        string email UK
        string nome
        datetime criado_em
    }
    PERFIL {
        int id PK
        int usuario_id FK
        string nome
        boolean infantil
    }
    ASSINATURA {
        int id PK
        int usuario_id FK
        string plano
        decimal valor
        date validade
    }
    HISTORICO {
        int id PK
        int perfil_id FK
        int titulo_id FK
        int episodio_id FK
        datetime assistido_em
        int progresso_min
    }
    TITULO {
        int id PK
        int categoria_id FK
        string nome
        string tipo
        int ano_lancamento
    }
    EPISODIO {
        int id PK
        int titulo_id FK
        int numero
        string nome
        int duracao_min
    }
    CATEGORIA {
        int id PK
        string nome UK
    }`}
];

/* ══════════ parser ══════════ */
const REL_RE=/^([A-Za-z_][\w.\-]*)\s+(\|o|\|\||\}o|\}\|)\s*(--|\.\.|==)\s*(o\||\|\||o\{|\|\{)\s+([A-Za-z_][\w.\-]*)\s*:\s*(.+)$/;
const OPEN_RE=/^([A-Za-z_][\w.\-]*)\s*\{$/;
const CLOSE_RE=/^\}+\s*$/;
const ATTR_RE=/^([\w().<>[\],\-]+)\s+([A-Za-z_]\w*)(?:\s+(.*))?$/;
const SOLO_RE=/^[A-Za-z_][\w.\-]*$/;
const CARDMAP={'|o':'zero_one','||':'one','}o':'zero_more','}|':'one_more','o|':'zero_one','o{':'zero_more','|{':'one_more'};

function parseAttr(line){
  const m=line.match(ATTR_RE); if(!m) return null;
  let rest=(m[3]||'').trim(); const keys=[];
  for(const k of ['PK','FK','UK']){
    const re=new RegExp('(?:^|\\s)'+k+'(?:\\s|$)');
    if(re.test(rest)){keys.push(k); rest=rest.replace(re,' ');}
  }
  let comment='';
  const cm=rest.match(/"([^"]*)"/);
  if(cm){comment=cm[1]; rest=rest.replace(cm[0],' ');}
  rest=rest.trim();
  if(rest) return null;
  return {type:m[1],name:m[2],keys,comment};
}

function parseMermaid(text){
  const ents=new Map(), relations=[], errors=[];
  const ensure=n=>{ if(!ents.has(n)) ents.set(n,{name:n,attrs:[]}); return ents.get(n); };
  const lines=text.split('\n');
  let inBlock=false, cur=null;
  for(let i=0;i<lines.length;i++){
    const line=lines[i].replace(/;\s*$/,'').trim();
    if(!line||line.startsWith('%%')) continue;
    if(!inBlock){
      if(/^erDiagram\b/.test(line)) continue;
      const r=line.match(REL_RE);
      if(r){ ensure(r[1]); ensure(r[5]);
        relations.push({a:r[1],b:r[5],lc:r[2],conn:r[3],rc:r[4],label:r[6].replace(/^"|"$/g,'').trim(),
                        ac:CARDMAP[r[2]],bc:CARDMAP[r[4]],dash:r[3]==='..'});
        continue; }
      const o=line.match(OPEN_RE);
      if(o){ inBlock=true; cur=ensure(o[1]); continue; }
      if(CLOSE_RE.test(line)) continue;
      if(SOLO_RE.test(line)){ ensure(line); continue; }
      errors.push({line:i+1,msg:'não entendi esta linha'});
    }else{
      if(CLOSE_RE.test(line)){ inBlock=false; cur=null; continue; }
      const at=parseAttr(line);
      if(at){ cur.attrs.push(at); }
      else errors.push({line:i+1,msg:'atributo inválido'});
    }
  }
  if(inBlock) errors.push({line:lines.length,msg:'bloco de entidade não fechado'});
  return {entities:[...ents.values()],relations,errors};
}

/* ══════════ medidas ══════════ */
const mctx=document.createElement('canvas').getContext('2d');
const F={
  name:'500 12px "JetBrains Mono", ui-monospace, monospace',
  type:'400 11px "JetBrains Mono", ui-monospace, monospace',
  key:'700 8.5px "JetBrains Mono", ui-monospace, monospace',
  title:'600 12px "Space Grotesk", sans-serif',
  count:'600 9px "JetBrains Mono", ui-monospace, monospace',
  label:'500 10px "JetBrains Mono", ui-monospace, monospace',
  card:'600 9.5px "JetBrains Mono", ui-monospace, monospace'
};
function tw(t,font){ mctx.font=font; return mctx.measureText(t).width; }

function measureEntity(e){
  let w=170;
  for(const a of e.attrs){
    const bw=a.keys.reduce((s,k)=>s+tw(k,F.key)+12+5,0);
    w=Math.max(w, 14+tw(a.name,F.name)+(a.keys.length?7+bw:0)+12+tw(a.type,F.type)+14);
  }
  const cw=tw(String(e.attrs.length),F.count)+12;
  w=Math.max(w, 14+tw(e.name.toUpperCase(),F.title)*1.14+10+cw+14);
  e.w=Math.round(w);
  e.h=e.attrs.length? 40+e.attrs.length*26+6 : 40+26+8;
}

/* ══════════ layout ══════════ */
const GAP_X=78, GAP_Y=66;

function resolveOverlaps(nodes,iters,gx=GAP_X,gy=GAP_Y){
  for(let it=0;it<iters;it++){
    let any=false;
    for(let i=0;i<nodes.length;i++)for(let j=i+1;j<nodes.length;j++){
      const a=nodes[i],b=nodes[j];
      const dx=(a.x+a.w/2)-(b.x+b.w/2), dy=(a.y+a.h/2)-(b.y+b.h/2);
      const px=(a.w+b.w)/2+gx-Math.abs(dx), py=(a.h+b.h)/2+gy-Math.abs(dy);
      if(px>0&&py>0){ any=true;
        if(px/(a.w+b.w)<py/(a.h+b.h)){ const s=(dx>=0?1:-1)*px/2; a.x+=s; b.x-=s; }
        else{ const s=(dy>=0?1:-1)*py/2; a.y+=s; b.y-=s; }
      }
    }
    if(!any) break;
  }
}

function edgeClearance(nodes,links,passes){
  for(let p=0;p<passes;p++){
    let moved=false;
    for(const [i,j] of links){
      const a=nodes[i],b=nodes[j];
      const ax=a.x+a.w/2, ay=a.y+a.h/2, bx=b.x+b.w/2, by=b.y+b.h/2;
      const ex=bx-ax, ey=by-ay, len2=ex*ex+ey*ey||1;
      for(let k=0;k<nodes.length;k++){
        if(k===i||k===j) continue;
        const c=nodes[k];
        const cx=c.x+c.w/2, cy=c.y+c.h/2;
        const t=clamp(((cx-ax)*ex+(cy-ay)*ey)/len2,0,1);
        const px=ax+ex*t, py=ay+ey*t;
        let dx=cx-px, dy=cy-py, d=Math.hypot(dx,dy);
        const need=Math.min(c.w,c.h)/2+40;
        if(d<need){
          if(d<0.01){const ang=(k*2.399)%6.283;dx=Math.cos(ang);dy=Math.sin(ang);d=1;}
          c.x+=dx/d*(need-d); c.y+=dy/d*(need-d); moved=true;
        }
      }
    }
    if(!moved) break;
    resolveOverlaps(nodes,60);
  }
}

function forceInto(nodes,links,fromCurrent){
  const n=nodes.length;
  if(!fromCurrent){
    const R=Math.max(280,n*50);
    nodes.forEach((nd,i)=>{const a=i/n*Math.PI*2-Math.PI/2; nd.x=Math.cos(a)*R*1.6; nd.y=Math.sin(a)*R*1.05;});
  }
  const desired=clamp(nodes.reduce((s,d)=>s+d.w+d.h,0)/n/1.5,300,430);
  const cx0=nodes.reduce((s,d)=>s+d.x,0)/n, cy0=nodes.reduce((s,d)=>s+d.y,0)/n;
  const iters=560;
  for(let it=0;it<iters;it++){
    const cool=1-it/iters, cap=8+85*cool;
    const fx=new Float64Array(n), fy=new Float64Array(n);
    for(let i=0;i<n;i++)for(let j=i+1;j<n;j++){
      const a=nodes[i],b=nodes[j];
      const dx=(a.x+a.w/2)-(b.x+b.w/2), dy=(a.y+a.h/2)-(b.y+b.h/2);
      const d=Math.sqrt(dx*dx+dy*dy)+0.01;
      const sepX=(a.w+b.w)/2+GAP_X, sepY=(a.h+b.h)/2+GAP_Y;
      const sep=Math.hypot(sepX,sepY);
      if(d<sep*2.1){
        const overlap=(sepX-Math.abs(dx)>0)&&(sepY-Math.abs(dy)>0);
        const f=(sep*sep)/(d*d)*90*(overlap?2.4:1);
        const ux=dx/d*f, uy=dy/d*f;
        fx[i]+=ux; fy[i]+=uy; fx[j]-=ux; fy[j]-=uy;
      }
    }
    for(const [i,j] of links){
      const a=nodes[i],b=nodes[j];
      const dx=(b.x+b.w/2)-(a.x+a.w/2), dy=(b.y+b.h/2)-(a.y+a.h/2);
      const d=Math.sqrt(dx*dx+dy*dy)+0.01;
      const f=(d-desired)*0.09, ux=dx/d*f, uy=dy/d*f;
      fx[i]+=ux; fy[i]+=uy; fx[j]-=ux; fy[j]-=uy;
    }
    for(let i=0;i<n;i++){
      fx[i]+=(cx0-nodes[i].x)*0.02; fy[i]+=(cy0-nodes[i].y)*0.02;
      nodes[i].x+=clamp(fx[i],-cap,cap); nodes[i].y+=clamp(fy[i],-cap,cap);
    }
  }
}

function layeredInto(nodes,links,n){
  const succ=Array.from({length:n},()=>[]), pred=Array.from({length:n},()=>[]);
  for(const [i,j] of links){succ[i].push(j);pred[j].push(i);}
  const level=new Array(n).fill(0);
  let changed=true,guard=0;
  while(changed&&guard++<=n+2){
    changed=false;
    for(let i=0;i<n;i++)for(const p of pred[i])
      if(level[p]+1>level[i]){level[i]=level[p]+1;changed=true;}
  }
  const rows=Array.from({length:Math.max(...level)+1},()=>[]);
  nodes.forEach((nd,i)=>rows[level[i]].push(i));
  for(const row of rows) row.sort((a,b)=>(nodes[a].x??0)-(nodes[b].x??0));
  const xIdx=new Array(n).fill(0);
  rows.forEach(row=>row.forEach((i,ord)=>xIdx[i]=ord));
  for(let sweep=0;sweep<8;sweep++){
    const down=sweep%2===0;
    for(const row of (down?rows:[...rows].reverse())){
      const keys=row.map(i=>{
        const nb=down?pred[i]:succ[i];
        return nb.length? nb.reduce((s,x)=>s+xIdx[x],0)/nb.length : xIdx[i];
      });
      row.map((i,k)=>[i,keys[k]])
         .sort((a,b)=>a[1]-b[1]||a[0]-b[0])
         .forEach(([i],ord)=>{row[ord]=i;xIdx[i]=ord;});
    }
  }
  const posX=rows.map(row=>{
    let x=0; return row.map(i=>{const v=x;x+=nodes[i].w+GAP_X;return v;});
  });
  for(let it=0;it<24;it++){
    rows.forEach((row,r)=>{
      row.forEach((i,k)=>{
        const nb=[...pred[i],...succ[i]];
        if(nb.length){
          const cx=nb.reduce((s,x)=>s+posX[level[x]][xIdx[x]]+nodes[x].w/2,0)/nb.length;
          posX[r][k]+=(cx-nodes[i].w/2-posX[r][k])*0.5;
        }
      });
      for(let k=1;k<row.length;k++){
        const min=posX[r][k-1]+nodes[row[k-1]].w+GAP_X;
        if(posX[r][k]<min)posX[r][k]=min;
      }
      for(let k=row.length-2;k>=0;k--){
        const max=posX[r][k+1]-nodes[row[k]].w-GAP_X;
        if(posX[r][k]>max)posX[r][k]=max;
      }
    });
  }
  let y=0;
  rows.forEach((row,r)=>{
    const h=Math.max(...row.map(i=>nodes[i].h));
    row.forEach((i,k)=>{nodes[i].x=posX[r][k];nodes[i].y=y+(h-nodes[i].h)/2;});
    y+=h+GAP_Y;
  });
}

function compactInto(nodes,links,n){
  const adj=Array.from({length:n},()=>[]);
  const deg=new Array(n).fill(0);
  for(const [i,j] of links){adj[i].push(j);adj[j].push(i);deg[i]++;deg[j]++;}
  const seen=new Array(n).fill(false), order=[];
  for(const s of [...Array(n).keys()].sort((a,b)=>deg[b]-deg[a])){
    if(seen[s])continue;
    const q=[s];seen[s]=true;
    while(q.length){
      const i=q.shift();order.push(i);
      for(const j of adj[i])if(!seen[j]){seen[j]=true;q.push(j);}
    }
  }
  const cols=Math.ceil(Math.sqrt(n)), nrows=Math.ceil(n/cols);
  const colW=new Array(cols).fill(0), rowH=new Array(nrows).fill(0);
  order.forEach((idx,k)=>{
    colW[k%cols]=Math.max(colW[k%cols],nodes[idx].w);
    rowH[Math.floor(k/cols)]=Math.max(rowH[Math.floor(k/cols)],nodes[idx].h);
  });
  const colX=[];let x=0;for(let c=0;c<cols;c++){colX[c]=x;x+=colW[c]+GAP_X;}
  const rowY=[];let y=0;for(let r=0;r<nrows;r++){rowY[r]=y;y+=rowH[r]+GAP_Y;}
  order.forEach((idx,k)=>{
    const r=Math.floor(k/cols),c=k%cols;
    nodes[idx].x=colX[c]+(colW[c]-nodes[idx].w)/2;
    nodes[idx].y=rowY[r]+(rowH[r]-nodes[idx].h)/2;
  });
}

function layoutPositions(entities,relations,fromCurrent,mode='force'){
  const n=entities.length; if(!n) return new Map();
  const map=new Map(entities.map((e,i)=>[e.name,i]));
  const nodes=entities.map(e=>({x:e.x??0,y:e.y??0,w:e.w,h:e.h}));
  const links=[];
  for(const r of relations){const i=map.get(r.a),j=map.get(r.b); if(i!=null&&j!=null&&i!==j) links.push([i,j]);}
  if(mode==='layered') layeredInto(nodes,links,n);
  else if(mode==='compact') compactInto(nodes,links,n);
  else forceInto(nodes,links,fromCurrent);
  resolveOverlaps(nodes,150);
  if(mode!=='compact') edgeClearance(nodes,links,mode==='force'?6:3);
  let mnX=Infinity,mnY=Infinity;
  for(const nd of nodes){mnX=Math.min(mnX,nd.x);mnY=Math.min(mnY,nd.y);}
  const out=new Map();
  entities.forEach((e,i)=>out.set(e.name,{
    x:Math.round((nodes[i].x-mnX+70)/8)*8,
    y:Math.round((nodes[i].y-mnY+70)/8)*8
  }));
  return out;
}

/* ══════════ tabelas ══════════ */
let model={entities:[],relations:[]}, byId={}, adj={}, edgeNodes=[], positions={};
let hoverId=null, selectedId=null, animating=false;

function buildTableNode(ent,animate,idx){
  const g=svgEl('g',{class:'table'}); g.dataset.id=ent.name;
  const inner=svgEl('g',{class:'t-inner'});
  if(animate){ inner.classList.add('enter'); inner.style.animationDelay=(80+idx*32)+'ms'; }
  g.append(inner); renderTableContent(ent,inner);
  g.setAttribute('transform',`translate(${ent.x} ${ent.y})`);
  g.addEventListener('pointerdown',e=>onTableDown(e,ent));
  g.addEventListener('pointerenter',()=>{hoverId=ent.name;updateFocus();});
  g.addEventListener('pointerleave',()=>{hoverId=null;updateFocus();});
  ent.g=g; ent.inner=inner;
  return g;
}

function renderTableContent(ent,inner){
  inner.textContent='';
  inner.append(svgEl('rect',{class:'t-main',x:0,y:0,width:ent.w,height:ent.h,rx:10}));
  inner.append(svgEl('rect',{class:'t-headbg',x:.5,y:.5,width:ent.w-1,height:39.5,rx:9.5}));
  inner.append(svgEl('rect',{class:'t-headbg',x:.5,y:26,width:ent.w-1,height:14}));
  const title=svgEl('text',{class:'t-title',x:14,y:25}); title.textContent=ent.name.toUpperCase();
  inner.append(title);
  const cw=tw(String(ent.attrs.length),F.count)+12;
  inner.append(svgEl('rect',{class:'t-count-bg',x:ent.w-14-cw,y:12,width:cw,height:16,rx:8}));
  const cnt=svgEl('text',{class:'t-count',x:ent.w-14-cw/2,y:23,'text-anchor':'middle'});
  cnt.textContent=ent.attrs.length; inner.append(cnt);
  inner.append(svgEl('path',{class:'t-div',d:`M0 40H${ent.w}`}));
  if(!ent.attrs.length){
    const t=svgEl('text',{class:'t-empty',x:14,y:40+17}); t.textContent='— sem campos definidos';
    inner.append(t);
  }
  ent.attrs.forEach((a,i)=>{
    const yT=40+i*26;
    const name=svgEl('text',{class:'t-name',x:14,y:yT+17}); name.textContent=a.name;
    if(a.comment){ const ti=svgEl('title'); ti.textContent=a.comment; name.append(ti); }
    inner.append(name);
    let bx=14+tw(a.name,F.name)+7;
    for(const k of a.keys){
      const kw=tw(k,F.key)+12;
      inner.append(svgEl('rect',{class:'badge b-'+k.toLowerCase(),x:bx,y:yT+5.5,width:kw,height:15,rx:7.5}));
      const t=svgEl('text',{class:'badge-t b-'+k.toLowerCase(),x:bx+kw/2,y:yT+16,'text-anchor':'middle'});
      t.textContent=k; inner.append(t); bx+=kw+5;
    }
    const ty=svgEl('text',{class:'t-type',x:ent.w-14,y:yT+16,'text-anchor':'end'});
    ty.textContent=a.type; inner.append(ty);
  });
  inner.append(svgEl('rect',{class:'t-hit',x:0,y:0,width:ent.w,height:ent.h}));
}

/* ══════════ símbolos crow's foot ══════════ */
const CARD_TEXT={one:'1',zero_one:'0..1',one_more:'1..N',zero_more:'0..N'};

function crowGlyph(type){
  const g=svgEl('g');
  const P=d=>g.append(svgEl('path',{class:'mp',d}));
  const C=cx=>g.append(svgEl('circle',{class:'mc',cx,cy:0,r:3.4}));
  if(type==='one'){ P('M9.5 -5.2V5.2'); P('M15.5 -5.2V5.2'); }
  else if(type==='zero_one'){ P('M9.5 -5.2V5.2'); C(16.8); }
  else if(type==='one_more'){ P('M10 0L0 -6'); P('M10 0L0 0'); P('M10 0L0 6'); P('M15.5 -5.2V5.2'); }
  else{ P('M10 0L0 -6'); P('M10 0L0 0'); P('M10 0L0 6'); C(16.8); }
  return g;
}
function crowMarker(type){
  const w=svgEl('g',{class:'e-mk'});
  w.append(crowGlyph(type));
  return w;
}
function cardBadge(txt){
  const w=Math.round(tw(txt,F.card))+10;
  const g=svgEl('g',{class:'e-card'});
  g.append(svgEl('rect',{x:-w/2,y:-7,width:w,height:14,rx:7}));
  const t=svgEl('text',{'text-anchor':'middle',y:3}); t.textContent=txt;
  g.append(t);
  return g;
}

/* ══════════ roteamento ortogonal com desvio de tabelas ══════════
   As linhas saem/entram sempre pelas faces (topo/base/lados), fazem
   cantos retos e NUNCA cruzam o interior de uma tabela: cada segmento
   é validado contra todos os retângulos; se houver colisão, a rota
   procura uma pista livre nos vãos entre tabelas ou um canal ao lado
   do bloqueador. */
const OBS_M=8, FACE_IN=16, SPREAD=16, LANE_OFF=16;

function segHit(x1,y1,x2,y2,o,m=OBS_M){
  const rx=o.x-m, ry=o.y-m, rw=o.w+2*m, rh=o.h+2*m;
  if(y1===y2){
    if(y1<ry||y1>ry+rh) return false;
    const lo=Math.min(x1,x2), hi=Math.max(x1,x2);
    return hi>rx&&lo<rx+rw;
  }
  if(x1<rx||x1>rx+rw) return false;
  const lo=Math.min(y1,y2), hi=Math.max(y1,y2);
  return hi>ry&&lo<ry+rh;
}
function countHits(pts,obs){
  let n=0;
  for(let i=0;i<pts.length-1;i++){
    const p=pts[i],q=pts[i+1];
    for(const o of obs) if(segHit(p.x,p.y,q.x,q.y,o)) n++;
  }
  return n;
}
function obstaclesFor(A,B){ return model.entities.filter(e=>e!==A&&e!==B); }

/* procura a "pista" Y livre para o trecho horizontal (conexão vertical) */
function laneScanV(x0,x1,y0,y3,obs){
  const mid=(y0+y3)/2, lo=Math.min(x0,x1)-6, hi=Math.max(x0,x1)+6;
  const set=new Set([Math.round(mid)]);
  for(const o of obs)
    if(o.x-OBS_M<hi&&o.x+o.w+OBS_M>lo){
      set.add(Math.round(o.y-LANE_OFF)); set.add(Math.round(o.y+o.h+LANE_OFF));
    }
  set.add(Math.round(y0-34)); set.add(Math.round(y3+34));
  const cands=[...set].sort((a,b)=>Math.abs(a-mid)-Math.abs(b-mid));
  let best=null,bs=Infinity;
  for(const ym of cands){
    const pts=[{x:x0,y:y0},{x:x0,y:ym},{x:x1,y:ym},{x:x1,y:y3}];
    const h=countHits(pts,obs);
    if(h===0) return pts;
    if(h<bs){bs=h;best=pts;}
  }
  return best;
}
/* idem para o trecho vertical (conexão horizontal) */
function laneScanH(y0,y1,x0,x3,obs){
  const mid=(x0+x3)/2, lo=Math.min(y0,y1)-6, hi=Math.max(y0,y1)+6;
  const set=new Set([Math.round(mid)]);
  for(const o of obs)
    if(o.y-OBS_M<hi&&o.y+o.h+OBS_M>lo){
      set.add(Math.round(o.x-LANE_OFF)); set.add(Math.round(o.x+o.w+LANE_OFF));
    }
  set.add(Math.round(x0-34)); set.add(Math.round(x3+34));
  const cands=[...set].sort((a,b)=>Math.abs(a-mid)-Math.abs(b-mid));
  let best=null,bs=Infinity;
  for(const xm of cands){
    const pts=[{x:x0,y:y0},{x:xm,y:y0},{x:xm,y:y1},{x:x3,y:y1}];
    const h=countHits(pts,obs);
    if(h===0) return pts;
    if(h<bs){bs=h;best=pts;}
  }
  return best;
}

function routeEdgeV(A,B,s,xA,xB,clA,clB){
  const yA=s>0?A.y+A.h:A.y, yB=s>0?B.y:B.y+B.h;
  const obs=obstaclesFor(A,B);
  const pairs=[], seen=new Set();
  const add=(a,b)=>{
    const k=a+'|'+b;
    if(!seen.has(k)){seen.add(k);pairs.push({xA:a,xB:b});}
  };
  if(xA===xB){
    if(countHits([{x:xA,y:yA},{x:xA,y:yB}],obs)===0)
      return [{x:xA,y:yA},{x:xA,y:yB}];
    /* alinhadas mas bloqueadas: tenta canais ao lado dos bloqueadores */
    const blockers=obs.filter(o=> xA>o.x-OBS_M && xA<o.x+o.w+OBS_M
      && Math.min(yA,yB)<o.y+o.h+OBS_M && Math.max(yA,yB)>o.y-OBS_M);
    for(const bl of blockers)for(const c of [bl.x-18,bl.x+bl.w+18]){
      const cc=Math.round(c);
      if(cc>=clA[0]&&cc<=clA[1]&&cc>=clB[0]&&cc<=clB[1]) add(cc,cc);
    }
  }
  add(xA,xB);
  for(const ca of clA)for(const cb of clB) add(Math.round(ca),Math.round(cb));
  let best=null,bs=Infinity;
  for(const p of pairs){
    const pts=laneScanV(p.xA,p.xB,yA,yB,obs);
    if(!pts) continue;
    const h=countHits(pts,obs);
    if(h===0) return pts;
    if(h<bs){bs=h;best=pts;}
  }
  return best||[{x:xA,y:yA},{x:xA,y:(yA+yB)/2},{x:xB,y:(yA+yB)/2},{x:xB,y:yB}];
}

function routeEdgeH(A,B,s,yA,yB,clA,clB){
  const xA=s>0?A.x+A.w:A.x, xB=s>0?B.x:B.x+B.w;
  const obs=obstaclesFor(A,B);
  const pairs=[], seen=new Set();
  const add=(a,b)=>{
    const k=a+'|'+b;
    if(!seen.has(k)){seen.add(k);pairs.push({yA:a,yB:b});}
  };
  if(yA===yB){
    if(countHits([{x:xA,y:yA},{x:xB,y:yB}],obs)===0)
      return [{x:xA,y:yA},{x:xB,y:yB}];
    const blockers=obs.filter(o=> yA>o.y-OBS_M && yA<o.y+o.h+OBS_M
      && Math.min(xA,xB)<o.x+o.w+OBS_M && Math.max(xA,xB)>o.x-OBS_M);
    for(const bl of blockers)for(const c of [bl.y-18,bl.y+bl.h+18]){
      const cc=Math.round(c);
      if(cc>=clA[0]&&cc<=clA[1]&&cc>=clB[0]&&cc<=clB[1]) add(cc,cc);
    }
  }
  add(yA,yB);
  for(const ca of clA)for(const cb of clB) add(Math.round(ca),Math.round(cb));
  let best=null,bs=Infinity;
  for(const p of pairs){
    const pts=laneScanH(p.yA,p.yB,xA,xB,obs);
    if(!pts) continue;
    const h=countHits(pts,obs);
    if(h===0) return pts;
    if(h<bs){bs=h;best=pts;}
  }
  return best||[{x:xA,y:yA},{x:(xA+xB)/2,y:yA},{x:(xA+xB)/2,y:yB},{x:xB,y:yB}];
}

/* cantos retos com raio suave */
function orthoPath(pts,r=7){
  const n=v=>+v.toFixed(1);
  if(pts.length===2){
    const [p,q]=pts;
    return `M${n(p.x)} ${n(p.y)}L${n(q.x)} ${n(q.y)}`;
  }
  let d=`M${n(pts[0].x)} ${n(pts[0].y)}`;
  for(let i=1;i<pts.length-1;i++){
    const p=pts[i],a=pts[i-1],b=pts[i+1];
    const l1=Math.abs(p.x-a.x)+Math.abs(p.y-a.y);
    const l2=Math.abs(b.x-p.x)+Math.abs(b.y-p.y);
    const rr=Math.min(r,l1/2,l2/2);
    const v1x=Math.sign(p.x-a.x),v1y=Math.sign(p.y-a.y);
    const v2x=Math.sign(b.x-p.x),v2y=Math.sign(b.y-p.y);
    d+=`L${n(p.x-v1x*rr)} ${n(p.y-v1y*rr)}Q${n(p.x)} ${n(p.y)} ${n(p.x+v2x*rr)} ${n(p.y+v2y*rr)}`;
  }
  const q=pts[pts.length-1];
  d+=`L${n(q.x)} ${n(q.y)}`;
  return d;
}

/* define modo (vertical/horizontal), faces e âncoras base de cada
   relação e espalha conexões de uma mesma face para não se sobreporem */
function computeDefs(){
  const defs=[];
  for(const E of edgeNodes){
    const a=byId[E.rel.a], b=byId[E.rel.b]; if(!a||!b) continue;
    const acx=a.x+a.w/2, acy=a.y+a.h/2, bcx=b.x+b.w/2, bcy=b.y+b.h/2;
    const dx=bcx-acx, dy=bcy-acy;
    const d={E,a,b};
    if(Math.abs(dy)>=Math.abs(dx)){
      const s=dy>0?1:-1;
      d.mode='v'; d.s=s;
      const ovL=Math.max(a.x,b.x)+FACE_IN, ovR=Math.min(a.x+a.w,b.x+b.w)-FACE_IN;
      if(ovR>ovL){
        d.straight=true;
        d.xA=d.xB=Math.round((ovL+ovR)/2);
        d.clampA=[ovL,ovR]; d.clampB=[ovL,ovR];
        d.sideA=s>0?'bottom':'top'; d.sideB=null;
        d.sortA=bcx;
      }else{
        d.xA=Math.round(clamp(bcx,a.x+FACE_IN,a.x+a.w-FACE_IN));
        d.xB=Math.round(clamp(acx,b.x+FACE_IN,b.x+b.w-FACE_IN));
        d.clampA=[a.x+FACE_IN,a.x+a.w-FACE_IN];
        d.clampB=[b.x+FACE_IN,b.x+b.w-FACE_IN];
        d.sideA=s>0?'bottom':'top'; d.sideB=s>0?'top':'bottom';
        d.sortA=bcx; d.sortB=acx;
      }
    }else{
      const s=dx>0?1:-1;
      d.mode='h'; d.s=s;
      const ovT=Math.max(a.y,b.y)+FACE_IN, ovB=Math.min(a.y+a.h,b.y+b.h)-FACE_IN;
      if(ovB>ovT){
        d.straight=true;
        d.yA=d.yB=Math.round((ovT+ovB)/2);
        d.clampA=[ovT,ovB]; d.clampB=[ovT,ovB];
        d.sideA=s>0?'right':'left'; d.sideB=null;
        d.sortA=bcy;
      }else{
        d.yA=Math.round(clamp(bcy,a.y+FACE_IN,a.y+a.h-FACE_IN));
        d.yB=Math.round(clamp(acy,b.y+FACE_IN,b.y+b.h-FACE_IN));
        d.clampA=[a.y+FACE_IN,a.y+a.h-FACE_IN];
        d.clampB=[b.y+FACE_IN,b.y+b.h-FACE_IN];
        d.sideA=s>0?'right':'left'; d.sideB=s>0?'left':'right';
        d.sortA=bcy; d.sortB=acy;
      }
    }
    defs.push(d);
  }
  const groups=new Map();
  const reg=(key,d,end)=>{
    if(!groups.has(key)) groups.set(key,[]);
    groups.get(key).push({d,end});
  };
  for(const d of defs){
    reg(d.a.name+'|'+d.sideA,d,'A');
    if(d.sideB) reg(d.b.name+'|'+d.sideB,d,'B');
  }
  for(const [,list] of groups){
    list.sort((p,q)=>{
      const pv=p.end==='A'?p.d.sortA:p.d.sortB;
      const qv=q.end==='A'?q.d.sortA:q.d.sortB;
      return pv-qv;
    });
    list.forEach((it,i)=>{
      const d=it.d, off=(i-(list.length-1)/2)*SPREAD;
      const c=d.mode==='v'?(it.end==='A'?'xA':'xB'):(it.end==='A'?'yA':'yB');
      const cl=it.end==='A'?d.clampA:d.clampB;
      d[c]=Math.round(clamp(d[c]+off,cl[0],cl[1]));
    });
  }
  return defs;
}

function buildEdges(animate){
  gEdges.textContent=''; gTop.textContent=''; edgeNodes=[];
  for(const rel of model.relations){
    const a=byId[rel.a], b=byId[rel.b]; if(!a||!b||rel.a===rel.b) continue;
    const g=svgEl('g',{class:'edge'+(rel.dash?' dash':'')});
    const line=svgEl('path',{class:'e-line'});
    g.append(line); gEdges.append(g);
    const ma=crowMarker(rel.ac), mb=crowMarker(rel.bc);
    const ba=cardBadge(CARD_TEXT[rel.ac]), bb=cardBadge(CARD_TEXT[rel.bc]);
    const lg=svgEl('g',{class:'e-label'});
    const lw=tw(rel.label||' ',F.label)+16;
    const lr=svgEl('rect',{width:lw,height:18,rx:9});
    const lt=svgEl('text',{'text-anchor':'middle'}); lt.textContent=rel.label;
    lg.append(lr,lt);
    gTop.append(ma,mb,ba,bb,lg);
    edgeNodes.push({rel,g,line,ma,mb,ba,bb,lg,lr,lt,lw});
  }
  updateEdgeGeometry();
  if(animate&&edgeNodes.length){
    scene.classList.add('drawing');
    for(const E of edgeNodes){
      const L=E.line.getTotalLength();
      E.line.style.strokeDasharray=L; E.line.style.strokeDashoffset=L;
      E.line.getBoundingClientRect();
      E.line.style.transition='stroke-dashoffset .9s cubic-bezier(.35,0,.25,1)';
      requestAnimationFrame(()=>E.line.style.strokeDashoffset='0');
    }
    setTimeout(()=>{
      scene.classList.remove('drawing');
      for(const E of edgeNodes){
        E.line.style.transition=''; E.line.style.strokeDasharray=''; E.line.style.strokeDashoffset='';
      }
    },1150);
  }
}

function updateEdgeGeometry(){
  const ms=clamp(1/(vw()/cam.w),1,1.7);
  const defs=computeDefs();
  for(const d of defs){
    const E=d.E, a=d.a, b=d.b;
    const pts=d.mode==='v'
      ? routeEdgeV(a,b,d.s,d.xA,d.xB,d.clampA,d.clampB)
      : routeEdgeH(a,b,d.s,d.yA,d.yB,d.clampA,d.clampB);
    E.line.setAttribute('d',orthoPath(pts));
    /* direção de saída/chegada: sempre axial pela face */
    const dA=d.mode==='v'?{x:0,y:d.s}:{x:d.s,y:0};
    const dB=dA;
    const rot=v=>Math.atan2(v.y,v.x)*180/Math.PI;
    E.ma.setAttribute('transform',`translate(${pts[0].x} ${pts[0].y}) rotate(${rot(dA)}) scale(${ms})`);
    E.mb.setAttribute('transform',`translate(${pts[pts.length-1].x} ${pts[pts.length-1].y}) rotate(${rot(dB)}) scale(${ms})`);
    /* selos de cardinalidade ao lado da linha, perto das pontas */
    const place=(pt,dir)=>{
      const px=dir.y, py=-dir.x;
      return {x:pt.x+dir.x*22*ms+px*20*ms, y:pt.y+dir.y*22*ms+py*20*ms};
    };
    const pa=place(pts[0],dA), pb=place(pts[pts.length-1],dB);
    E.ba.setAttribute('transform',`translate(${pa.x} ${pa.y}) scale(${ms})`);
    E.bb.setAttribute('transform',`translate(${pb.x} ${pb.y}) scale(${ms})`);
    /* rótulo no segmento central */
    let mx,my;
    const n=pts.length;
    if(n>=4){ mx=(pts[1].x+pts[2].x)/2; my=(pts[1].y+pts[2].y)/2; }
    else{ mx=(pts[0].x+pts[n-1].x)/2; my=(pts[0].y+pts[n-1].y)/2; }
    E.lg.setAttribute('transform',`translate(${mx} ${my})`);
    E.lr.setAttribute('x',-E.lw/2); E.lr.setAttribute('y',-9);
    E.lt.setAttribute('y',3.5);
  }
}

function buildAdj(){
  adj={};
  for(const r of model.relations){
    if(!byId[r.a]||!byId[r.b]) continue;
    (adj[r.a]??=new Set()).add(r.b);
    (adj[r.b]??=new Set()).add(r.a);
  }
}

function updateFocus(){
  const act=hoverId||selectedId;
  for(const name in byId){
    const g=byId[name].g;
    g.classList.toggle('sel',name===selectedId);
    g.classList.toggle('dimt',!!act&&name!==act&&!(adj[name]&&adj[name].has(act)));
  }
  for(const E of edgeNodes){
    const hit=!!act&&(E.rel.a===act||E.rel.b===act);
    const dim=!!act&&!hit;
    E.g.classList.toggle('on',hit);
    E.g.classList.toggle('dim',dim);
    for(const el of [E.ma,E.mb,E.ba,E.bb,E.lg]){
      el.classList.toggle('on',hit);
      el.classList.toggle('dim',dim);
    }
  }
  updateMinimap();
}

/* ══════════ câmera ══════════ */
let cam={x:0,y:0,w:1000,h:700}, camAnim=null;
const vs=()=>({rw:canvas.clientWidth,rh:canvas.clientHeight});
const vw=()=>canvas.clientWidth;
function normalizeH(){ const {rw,rh}=vs(); cam.h=cam.w*rh/Math.max(1,rw); }
function screenToWorld(cx,cy){
  const r=scene.getBoundingClientRect();
  return {x:cam.x+(cx-r.left)/r.width*cam.w, y:cam.y+(cy-r.top)/r.height*cam.h};
}
function applyView(){
  normalizeH();
  scene.setAttribute('viewBox',`${cam.x} ${cam.y} ${cam.w} ${cam.h}`);
  const s=vw()/cam.w;
  canvas.style.backgroundSize=`${28*s}px ${28*s}px`;
  canvas.style.backgroundPosition=`${(-cam.x*s).toFixed(1)}px ${(-cam.y*s).toFixed(1)}px`;
  zoomLbl.textContent=Math.round(s*100)+'%';
  updateEdgeGeometry();
  updateMinimap();
}
function animateCam(target,dur=480){
  cancelAnimationFrame(camAnim);
  const s={...cam}, t0=performance.now();
  const ease=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
  const step=t=>{
    const p=Math.min(1,(t-t0)/dur), k=ease(p);
    cam.x=s.x+(target.x-s.x)*k; cam.y=s.y+(target.y-s.y)*k; cam.w=s.w+(target.w-s.w)*k;
    applyView();
    if(p<1) camAnim=requestAnimationFrame(step);
  };
  camAnim=requestAnimationFrame(step);
}
function contentBBox(){
  if(!model.entities.length) return null;
  let x1=Infinity,y1=Infinity,x2=-Infinity,y2=-Infinity;
  for(const e of model.entities){
    x1=Math.min(x1,e.x); y1=Math.min(y1,e.y);
    x2=Math.max(x2,e.x+e.w); y2=Math.max(y2,e.y+e.h);
  }
  return {x:x1,y:y1,w:x2-x1,h:y2-y1};
}
function fitView(animate=true){
  const bb=contentBBox(); if(!bb) return;
  const {rw,rh}=vs(), pad=80;
  const s=Math.min(rw/(bb.w+pad*2),rh/(bb.h+pad*2),1.4);
  const w=rw/s, t={x:bb.x+bb.w/2-w/2, y:bb.y+bb.h/2-w*(rh/rw)/2, w};
  if(animate) animateCam(t,560); else {cam.w=t.w;cam.x=t.x;cam.y=t.y;applyView();}
}
function zoomBy(f){
  const {rw,rh}=vs();
  const cx=cam.x+cam.w/2, cy=cam.y+cam.h/2;
  const w=clamp(cam.w/f,rw/7,rw*6);
  animateCam({x:cx-w/2,y:cy-w*(rh/rw)/2,w},220);
}
function resetZoom(){
  const {rw,rh}=vs(), cx=cam.x+cam.w/2, cy=cam.y+cam.h/2;
  animateCam({x:cx-rw/2,y:cy-rw*(rh/rw)/2,w:rw},260);
}
canvas.addEventListener('wheel',e=>{
  if(e.target.closest('#toolbar,#minimap')) return;
  e.preventDefault();
  cancelAnimationFrame(camAnim);
  const before=screenToWorld(e.clientX,e.clientY);
  const f=Math.exp(-e.deltaY*(e.ctrlKey?0.008:0.0014));
  const {rw}=vs();
  cam.w=clamp(cam.w/f,rw/7,rw*6);
  normalizeH();
  const after=screenToWorld(e.clientX,e.clientY);
  cam.x+=before.x-after.x; cam.y+=before.y-after.y;
  applyView();
},{passive:false});

/* ══════════ arrastar + guias ══════════ */
let dragState=null, panState=null;

function snapMove(ent,nx,ny){
  const s=vw()/cam.w, thr=8/s;
  let bx=null,by=null;
  const A={l:nx,r:nx+ent.w,cx:nx+ent.w/2,t:ny,b:ny+ent.h,cy:ny+ent.h/2};
  for(const o of model.entities){
    if(o===ent) continue;
    const B={l:o.x,r:o.x+o.w,cx:o.x+o.w/2,t:o.y,b:o.y+o.h,cy:o.y+o.h/2};
    for(const [ka,kb] of [['cx','cx'],['l','l'],['r','r'],['l','r'],['r','l']]){
      const d=B[kb]-A[ka];
      if(Math.abs(d)<thr&&(!bx||Math.abs(d)<Math.abs(bx.d))) bx={d,x:B[kb],o};
    }
    for(const [ka,kb] of [['cy','cy'],['t','t'],['b','b'],['t','b'],['b','t']]){
      const d=B[kb]-A[ka];
      if(Math.abs(d)<thr&&(!by||Math.abs(d)<Math.abs(by.d))) by={d,y:B[kb],o};
    }
  }
  if(bx) nx+=bx.d;
  if(by) ny+=by.d;
  const out={nx,ny,gx:null,gy:null};
  if(bx) out.gx={x:bx.x,y1:Math.min(ny,bx.o.y)-26,y2:Math.max(ny+ent.h,bx.o.y+bx.o.h)+26};
  if(by) out.gy={y:by.y,x1:Math.min(nx,by.o.x)-26,x2:Math.max(nx+ent.w,by.o.x+by.o.w)+26};
  return out;
}
function drawGuides(sn){
  gGuides.textContent='';
  if(sn.gx) gGuides.append(svgEl('line',{class:'guide',x1:sn.gx.x,y1:sn.gx.y1,x2:sn.gx.x,y2:sn.gx.y2}));
  if(sn.gy) gGuides.append(svgEl('line',{class:'guide',x1:sn.gy.x1,y1:sn.gy.y,x2:sn.gy.x2,y2:sn.gy.y}));
}

function onTableDown(e,ent){
  if(e.button!==0||animating) return;
  e.stopPropagation();
  const p=screenToWorld(e.clientX,e.clientY);
  dragState={ent,ox:p.x-ent.x,oy:p.y-ent.y,moved:false};
  scene.setPointerCapture(e.pointerId);
  ent.g.classList.add('dragging');
  if(selectedId!==ent.name){ selectedId=ent.name; updateFocus(); }
}
scene.addEventListener('pointerdown',e=>{
  if(e.button===1){ e.preventDefault(); }
  if(e.target!==scene) return;
  if(e.button!==0&&e.button!==1) return;
  panState={sx:e.clientX,sy:e.clientY,cx:cam.x,cy:cam.y,moved:false};
  scene.setPointerCapture(e.pointerId);
  scene.classList.add('panning');
});
scene.addEventListener('pointermove',e=>{
  if(dragState){
    const p=screenToWorld(e.clientX,e.clientY);
    const ent=dragState.ent;
    const sn=snapMove(ent,p.x-dragState.ox,p.y-dragState.oy);
    ent.x=sn.nx; ent.y=sn.ny;
    ent.g.setAttribute('transform',`translate(${ent.x} ${ent.y})`);
    drawGuides(sn); updateEdgeGeometry(); updateMinimap();
    dragState.moved=true;
  }else if(panState){
    const dx=e.clientX-panState.sx, dy=e.clientY-panState.sy;
    if(Math.abs(dx)+Math.abs(dy)>3) panState.moved=true;
    const r=scene.getBoundingClientRect();
    cam.x=panState.cx-dx*cam.w/r.width;
    cam.y=panState.cy-dy*cam.h/r.height;
    applyView();
  }
});
function endPointer(e){
  if(dragState){
    const ent=dragState.ent;
    ent.g.classList.remove('dragging');
    gGuides.textContent='';
    if(dragState.moved) savePositions();
    dragState=null;
  }
  if(panState){
    scene.classList.remove('panning');
    if(!panState.moved){ selectedId=null; updateFocus(); }
    panState=null;
  }
}
scene.addEventListener('pointerup',endPointer);
scene.addEventListener('pointercancel',endPointer);
scene.addEventListener('dblclick',e=>{ if(e.target===scene) fitView(true); });

/* ══════════ minimapa ══════════ */
let mmState=null;
function updateMinimap(){
  const bb=contentBBox();
  if(!bb){ mmContent.textContent=''; mmView.setAttribute('width',0); mmState=null; return; }
  const rx=Math.min(bb.x,cam.x)-40, ry=Math.min(bb.y,cam.y)-40;
  const w=Math.max(bb.x+bb.w,cam.x+cam.w)+40-rx;
  const h=Math.max(bb.y+bb.h,cam.y+cam.h)+40-ry;
  const s=Math.min(174/w,104/h), ox=(190-w*s)/2, oy=(120-h*s)/2;
  mmState={s,ox,oy,rx,ry};
  mmContent.textContent='';
  for(const e of model.entities){
    mmContent.append(svgEl('rect',{
      x:ox+(e.x-rx)*s, y:oy+(e.y-ry)*s,
      width:Math.max(3,e.w*s), height:Math.max(2.4,e.h*s), rx:2,
      class:'mm-t'+(e.name===selectedId?' sel':'')
    }));
  }
  mmView.setAttribute('x',ox+(cam.x-rx)*s); mmView.setAttribute('y',oy+(cam.y-ry)*s);
  mmView.setAttribute('width',cam.w*s); mmView.setAttribute('height',cam.h*s);
}
function mmNav(e){
  if(!mmState) return;
  const r=mm.getBoundingClientRect();
  const wx=mmState.rx+(e.clientX-r.left-mmState.ox)/mmState.s;
  const wy=mmState.ry+(e.clientY-r.top-mmState.oy)/mmState.s;
  cancelAnimationFrame(camAnim);
  cam.x=wx-cam.w/2; cam.y=wy-cam.h/2;
  applyView();
}
mm.addEventListener('pointerdown',e=>{
  e.stopPropagation();
  mm.setPointerCapture(e.pointerId);
  mmNav(e);
  const mv=ev=>mmNav(ev);
  mm.addEventListener('pointermove',mv);
  mm.addEventListener('pointerup',()=>mm.removeEventListener('pointermove',mv),{once:true});
});

/* ══════════ highlight ══════════ */
const REL_HL=/^(\s*)([A-Za-z_][\w.\-]*)(\s*)((?:\|o|\|\||\}o|\}\|)(?:--|\.\.|==)(?:o\||\|\||o\{|\|\{))(\s*)([A-Za-z_][\w.\-]*)(\s*:\s*)(.*)$/;
const OPEN_HL=/^(\s*)([A-Za-z_][\w.\-]*)(\s*\{)(\s*)$/;
const CLOSE_HL=/^(\s*)(\}+\s*)$/;
const ATTR_HL=/^(\s*)([\w().<>[\],\-]+)(\s+)([A-Za-z_]\w*)(\s*)(.*)$/;
const SOLO_HL=/^(\s*)([A-Za-z_][\w.\-]*)\s*$/;
function hlRest(rest){
  let out='';
  for(const p of rest.split(/("[^"]*")/g)){
    if(p.startsWith('"')) out+=`<span class="c-cm">${esc(p)}</span>`;
    else out+=esc(p).replace(/\b(PK|FK|UK)\b/g,'<span class="c-key">$1</span>');
  }
  return out;
}
function renderHighlight(){
  let inBlock=false; const out=[];
  for(const raw of src.value.split('\n')){
    const line=raw.replace(/;\s*$/,''), t=line.trim();
    let h=null,m;
    if(t.startsWith('%%')) h=`<span class="c-cm">${esc(line)}</span>`;
    else if(/^erDiagram\b/.test(t)) h=`<span class="c-kw">${esc(line)}</span>`;
    else if(m=line.match(REL_HL))
      h=`${esc(m[1])}<span class="c-en">${esc(m[2])}</span><span class="c-card">${esc(m[3])}</span><span class="c-en">${esc(m[5])}</span><span class="c-col">${esc(m[6])}</span><span class="c-lb">${esc(m[7])}</span>`;
    else if(m=line.match(OPEN_HL)){ h=`${esc(m[1])}<span class="c-en">${esc(m[2])}</span><span class="c-br">${esc(m[3])}</span>`; inBlock=true; }
    else if(m=line.match(CLOSE_HL)){ h=`${esc(m[1])}<span class="c-br">${esc(m[2])}</span>`; if(inBlock) inBlock=false; }
    else if(inBlock&&(m=line.match(ATTR_HL)))
      h=`${esc(m[1])}<span class="c-ty">${esc(m[2])}</span>${esc(m[3])}<span class="c-en">${esc(m[4])}</span>${esc(m[5])}${hlRest(m[6])}`;
    else if(m=line.match(SOLO_HL)) h=`${esc(m[1])}<span class="c-en">${esc(m[2])}</span>`;
    out.push(h??esc(line));
  }
  hlcode.innerHTML=out.join('\n')+'\n';
}

/* ══════════ formatador ══════════ */
function formatCode(){
  const res=parseMermaid(src.value);
  if(res.errors.length){ toast('Corrija os erros antes de formatar','err'); return; }
  const lines=['erDiagram',''];
  const rels=res.relations;
  const w=Math.max(0,...rels.map(r=>`${r.a} ${r.lc}${r.conn}${r.rc} ${r.b}`.length));
  for(const r of rels) lines.push(`${`${r.a} ${r.lc}${r.conn}${r.rc} ${r.b}`.padEnd(w)} : ${r.label}`);
  for(const e of res.entities){
    if(!e.attrs.length) continue;
    lines.push('',`${e.name} {`);
    for(const a of e.attrs){
      let l=`    ${a.type} ${a.name}`;
      if(a.keys.length) l+=' '+a.keys.join(' ');
      if(a.comment) l+=` "${a.comment}"`;
      lines.push(l);
    }
    lines.push('}');
  }
  for(const e of res.entities)
    if(!e.attrs.length&&!rels.some(r=>r.a===e.name||r.b===e.name)) lines.push('',e.name);
  src.value=lines.join('\n');
  renderHighlight(); scheduleApply();
  toast('Código formatado');
}

/* ══════════ integração com o host ══════════ */
let saveT=null, posT=null, dirty=false;

function setSaveState(txt,cls){
  if(!saveState) return;
  saveState.textContent=txt;
  saveState.className=cls||'';
  parseDot.classList.toggle('saving',cls==='saving');
}
function markDirty(){ dirty=true; setSaveState('gravando…','saving'); }
function scheduleSave(){ clearTimeout(saveT); saveT=setTimeout(doSaveNow,900); }
function doSaveNow(){
  if(!vscode) return;
  clearTimeout(saveT);
  dirty=false;
  markDirty();
  vscode.postMessage({type:'save',code:src.value});
}
function savedOk(){
  const t=new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit',second:'2-digit'});
  setSaveState('salvo às '+t,'');
}
function schedulePosSave(){
  clearTimeout(posT);
  posT=setTimeout(()=>{ if(vscode) vscode.postMessage({type:'savePos',pos:positions}); },600);
}
function savePositions(){
  for(const e of model.entities) positions[e.name]={x:e.x,y:e.y};
  schedulePosSave();
}

window.addEventListener('message',e=>{
  const m=e.data||{};
  if(m.type==='update'){
    clearTimeout(saveT); dirty=false;
    if(m.code===src.value) return;
    src.value=m.code;
    renderHighlight();
    applySource(src.value);
    fitView(true);
  }else if(m.type==='requestSave'){
    if(vscode) vscode.postMessage({type:'save',code:src.value});
  }else if(m.type==='saved'){
    savedOk();
  }else if(m.type==='theme'){
    if(!store.get('theme')) setTheme(m.value);
  }
});

/* ══════════ pipeline de aplicação ══════════ */
function placeNear(ent){
  const nb=[];
  for(const r of model.relations){
    const o=r.a===ent.name?r.b:(r.b===ent.name?r.a:null);
    if(o&&positions[o]) nb.push(positions[o]);
  }
  let cx,cy;
  if(nb.length){
    cx=nb.reduce((s,p)=>s+p.x,0)/nb.length+ent.w/2;
    cy=nb.reduce((s,p)=>s+p.y,0)/nb.length+ent.h/2;
  }else{ cx=cam.x+cam.w/2-ent.w/2; cy=cam.y+cam.h/2-ent.h/2; }
  const i=placeNear.n=(placeNear.n||0)+1;
  const a=i*2.4, r=70+i*40;
  ent.x=Math.round(cx+Math.cos(a)*r); ent.y=Math.round(cy+Math.sin(a)*r);
}

function applySource(code,opts={}){
  const {resetLayout=false,animate=false,mode='force'}=opts;
  const res=parseMermaid(code);
  if(res.errors.length){ setParseState(res.errors); return false; }
  setParseState(null,res);
  model=res;
  for(const e of model.entities) measureEntity(e);
  if(resetLayout){
    const map=layoutPositions(model.entities,model.relations,false,mode);
    for(const e of model.entities){ const p=map.get(e.name); e.x=p.x; e.y=p.y; }
  }else{
    placeNear.n=0; let anyNew=false;
    for(const e of model.entities){
      const p=positions[e.name];
      if(p){ e.x=p.x; e.y=p.y; } else { placeNear(e); anyNew=true; }
    }
    if(anyNew) resolveOverlaps(model.entities,60);
  }
  gTables.textContent=''; byId={};
  model.entities.forEach((e,i)=>{ byId[e.name]=e; gTables.append(buildTableNode(e,animate,i)); });
  for(const k of Object.keys(positions)) if(!byId[k]) delete positions[k];
  for(const e of model.entities) positions[e.name]={x:e.x,y:e.y};
  schedulePosSave();
  buildAdj(); buildEdges(animate); updateFocus(); updateStats(); updateMinimap();
  return true;
}

function animateTo(targets,dur,done){
  animating=true;
  const starts=model.entities.map(e=>({x:e.x,y:e.y}));
  const t0=performance.now();
  const ease=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
  const step=t=>{
    const p=Math.min(1,(t-t0)/dur), k=ease(p);
    model.entities.forEach((e,i)=>{
      const s=targets.get(e.name); if(!s) return;
      e.x=starts[i].x+(s.x-starts[i].x)*k; e.y=starts[i].y+(s.y-starts[i].y)*k;
      e.g.setAttribute('transform',`translate(${e.x} ${e.y})`);
    });
    updateEdgeGeometry(); updateMinimap();
    if(p<1) requestAnimationFrame(step);
    else{ animating=false; done&&done(); }
  };
  requestAnimationFrame(step);
}
function organize(){
  if(animating||!model.entities.length) return;
  const targets=layoutPositions(model.entities,model.relations,true,layoutSel.value);
  animateTo(targets,650,()=>{ savePositions(); fitView(true); });
}
function updateStats(){
  const fields=model.entities.reduce((s,e)=>s+e.attrs.length,0);
  statsEl.textContent=`${model.entities.length} entidades · ${edgeNodes.length} relações · ${fields} campos`;
}
function setParseState(errors,res){
  if(errors&&errors.length){
    parseDot.classList.add('err'); parseFoot.classList.add('err');
    parseText.textContent=`linha ${errors[0].line}: ${errors[0].msg}${errors.length>1?` (+${errors.length-1})`:''}`;
  }else{
    parseDot.classList.remove('err'); parseFoot.classList.remove('err');
    parseText.textContent=`ok · ${res.entities.length} entidades · ${res.relations.length} relações`;
  }
}

/* ══════════ exportação ══════════ */
let _fontCSS=null;
async function getFontCSS(){
  if(_fontCSS!==null) return _fontCSS;
  try{
    const link=document.querySelector('link[href*="fonts.googleapis"]');
    const css=await (await fetch(link.href)).text();
    const blocks=css.split('@font-face').slice(1).map(b=>'@font-face'+b.slice(0,b.indexOf('}')+1));
    let out='';
    for(const b of blocks.filter(x=>x.includes('U+0000-00FF'))){
      const u=b.match(/url\((https:[^)]+)\)/)[1];
      const arr=new Uint8Array(await (await fetch(u)).arrayBuffer());
      let bin=''; for(let i=0;i<arr.length;i+=0x8000) bin+=String.fromCharCode.apply(null,arr.subarray(i,i+0x8000));
      out+=b.replace(u,`data:font/woff2;base64,${btoa(bin)}`);
    }
    _fontCSS=out;
  }catch(e){ _fontCSS=''; }
  return _fontCSS;
}
const THEME_VARS=['--surface','--surface2','--canvas','--ink','--ink2','--ink3','--line','--line2','--edge','--accent','--pkbg','--pkln','--pkfg','--mono','--sans'];
async function buildExportSVG(){
  const bb=contentBBox(); if(!bb) return null;
  const pad=56, W=Math.round(bb.w+pad*2), H=Math.round(bb.h+pad*2);
  const clone=scene.cloneNode(true);
  clone.removeAttribute('style'); clone.removeAttribute('class');
  clone.setAttribute('xmlns',NS);
  clone.setAttribute('viewBox',`${bb.x-pad} ${bb.y-pad} ${W} ${H}`);
  clone.setAttribute('width',W); clone.setAttribute('height',H);
  clone.querySelector('#gGuides')?.remove();
  clone.querySelectorAll('[style]').forEach(el=>el.removeAttribute('style'));
  for(const c of ['enter','dragging','dim','on','dimt','sel','drawing'])
    clone.querySelectorAll('.'+c).forEach(el=>el.classList.remove(c));
  const vars=THEME_VARS.map(n=>`${n}:${cssVar(n)}`).join(';');
  const st=document.createElementNS(NS,'style');
  st.textContent=`:root{${vars}} ${await getFontCSS()}`;
  clone.insertBefore(st,clone.firstChild);
  const bg=svgEl('rect',{x:bb.x-pad,y:bb.y-pad,width:W,height:H,fill:cssVar('--canvas')});
  clone.insertBefore(bg,st.nextSibling);
  return {str:new XMLSerializer().serializeToString(clone),W,H};
}
function downloadBlob(blob,name){
  const a=document.createElement('a');
  a.href=URL.createObjectURL(blob); a.download=name; a.click();
  setTimeout(()=>URL.revokeObjectURL(a.href),4000);
}
async function exportSVG(){
  const r=await buildExportSVG();
  if(!r){ toast('Nada para exportar','err'); return; }
  downloadBlob(new Blob([r.str],{type:'image/svg+xml;charset=utf-8'}),'diagrama-er.svg');
  toast('SVG exportado');
}
async function exportPNG(){
  const r=await buildExportSVG();
  if(!r){ toast('Nada para exportar','err'); return; }
  try{
    const url=URL.createObjectURL(new Blob([r.str],{type:'image/svg+xml;charset=utf-8'}));
    const img=new Image();
    await new Promise((res,rej)=>{img.onload=res;img.onerror=rej;img.src=url;});
    const c=document.createElement('canvas'); c.width=r.W*2; c.height=r.H*2;
    const ctx=c.getContext('2d'); ctx.scale(2,2); ctx.drawImage(img,0,0,r.W,r.H);
    URL.revokeObjectURL(url);
    c.toBlob(b=>{downloadBlob(b,'diagrama-er.png'); toast('PNG exportado (2×)');},'image/png');
  }catch(e){ toast('Falha ao gerar PNG','err'); }
}

/* ══════════ toasts / tema / painel / menus / docs ══════════ */
function toast(msg,type=''){
  const t=document.createElement('div'); t.className='toast '+type; t.textContent=msg;
  $('toasts').append(t);
  requestAnimationFrame(()=>t.classList.add('show'));
  setTimeout(()=>{t.classList.remove('show'); setTimeout(()=>t.remove(),300);},2400);
}
function setTheme(t){
  document.documentElement.dataset.theme=t;
  store.set('theme',t);
  $('btnTheme').innerHTML=icon(t==='dark'?'sun':'moon');
}
 $('btnTheme').onclick=()=>setTheme(document.documentElement.dataset.theme==='dark'?'light':'dark');
 $('btnPanel').onclick=()=>{
  panel.classList.toggle('hidden');
  store.set('panel',panel.classList.contains('hidden')?'0':'1');
};
 $('btnCopy').onclick=async()=>{
  try{ await navigator.clipboard.writeText(src.value); toast('Código copiado'); }
  catch(e){ toast('Não foi possível copiar','err'); }
};
 $('btnExport').onclick=e=>{ e.stopPropagation(); exportMenu.classList.toggle('open'); };
document.addEventListener('click',e=>{ if(!e.target.closest('.menu-wrap')) exportMenu.classList.remove('open'); });
exportMenu.querySelectorAll('button').forEach(b=>b.onclick=()=>{
  exportMenu.classList.remove('open');
  b.dataset.x==='svg'? exportSVG() : exportPNG();
});

function toggleDocs(open){
  const o=open??!docs.classList.contains('open');
  docs.classList.toggle('open',o);
  docsBackdrop.classList.toggle('open',o);
}
 $('btnDocs').onclick=()=>toggleDocs();
 $('btnDocsClose').onclick=()=>toggleDocs(false);
docsBackdrop.onclick=()=>toggleDocs(false);

/* ══════════ editor ══════════ */
let applyT=null;
function scheduleApply(){
  clearTimeout(applyT);
  applyT=setTimeout(()=>{
    if(applySource(src.value)){ markDirty(); scheduleSave(); }
  },500);
}
function applyNow(showToast){
  const ok=applySource(src.value);
  if(ok){ markDirty(); doSaveNow(); }
  if(showToast) toast(ok?'Diagrama atualizado e salvo':'Corrija os erros no código', ok?'':'err');
}
src.addEventListener('input',()=>{ renderHighlight(); scheduleApply(); });
src.addEventListener('scroll',()=>{ hl.scrollTop=src.scrollTop; hl.scrollLeft=src.scrollLeft; });
src.addEventListener('keydown',e=>{
  if(e.key==='Tab'){
    e.preventDefault();
    const s=src.selectionStart, en=src.selectionEnd;
    src.value=src.value.slice(0,s)+'    '+src.value.slice(en);
    src.selectionStart=src.selectionEnd=s+4;
    renderHighlight(); scheduleApply();
  }
});
window.addEventListener('keydown',e=>{
  if((e.ctrlKey||e.metaKey)&&(e.key==='s'||e.key==='S')){
    e.preventDefault();
    applySource(src.value); markDirty(); doSaveNow();
    return;
  }
  if(e.key==='Escape'){ exportMenu.classList.remove('open'); toggleDocs(false); selectedId=null; updateFocus(); }
  if((e.ctrlKey||e.metaKey)&&e.key==='Enter'){ e.preventDefault(); applyNow(true); }
  const tag=document.activeElement&&document.activeElement.tagName;
  if(e.key==='?'&&tag!=='TEXTAREA'&&tag!=='INPUT'){ e.preventDefault(); toggleDocs(); }
  if(!e.ctrlKey&&!e.metaKey&&!e.altKey&&tag!=='TEXTAREA'&&(e.key==='f'||e.key==='F')) organize();
});
 $('btnApply').onclick=()=>applyNow(true);
 $('btnFormat').onclick=formatCode;
 $('btnOrganize').onclick=organize;
 $('btnZoomIn').onclick=()=>zoomBy(1.3);
 $('btnZoomOut').onclick=()=>zoomBy(1/1.3);
 $('btnFit').onclick=()=>fitView(true);
zoomLbl.onclick=resetZoom;
layoutSel.addEventListener('change',()=>{
  store.set('layout',layoutSel.value);
  organize();
});
 $('examples').onchange=e=>{
  src.value=EXAMPLES[+e.target.value].code;
  positions={};
  renderHighlight();
  applySource(src.value,{resetLayout:true,animate:true,mode:layoutSel.value});
  fitView(true);
  markDirty(); doSaveNow();
  toast(`Exemplo “${EXAMPLES[+e.target.value].name}” gravado no arquivo`);
};
new ResizeObserver(()=>applyView()).observe(canvas);

/* ══════════ docs: prévias e gabaritos ══════════ */
function miniRel(lc,conn,rc){
  const s=svgEl('svg',{class:'mini-rel'+(conn==='..'?' dashed':''),viewBox:'0 0 176 34',width:176,height:34});
  s.append(svgEl('rect',{x:21,y:8,width:9,height:20,rx:2,class:'mb'}));
  s.append(svgEl('rect',{x:146,y:8,width:9,height:20,rx:2,class:'mb'}));
  s.append(svgEl('path',{d:'M30 18H146',class:'ml'}));
  const gl=svgEl('g',{transform:'translate(30 18)'}); gl.append(crowGlyph(lc));
  const gr=svgEl('g',{transform:'translate(146 18) rotate(180)'}); gr.append(crowGlyph(rc));
  s.append(gl,gr);
  const tl=svgEl('text',{x:58,y:9,'text-anchor':'middle'}); tl.textContent=CARD_TEXT[lc];
  const tr=svgEl('text',{x:118,y:9,'text-anchor':'middle'}); tr.textContent=CARD_TEXT[rc];
  s.append(tl,tr);
  return s;
}
document.querySelectorAll('.mini[data-rel]').forEach(el=>{
  const [lc,conn,rc]=el.dataset.rel.split(' ');
  el.append(miniRel(lc,conn,rc));
});
function insertTemplate(tpl){
  const s=src.selectionStart??src.value.length, e=src.selectionEnd??s;
  const before=src.value.slice(0,s), after=src.value.slice(e);
  const pad=before&&!before.endsWith('\n')?'\n':'';
  src.value=before+pad+tpl+'\n'+after;
  renderHighlight();
  src.focus();
  const iA=src.value.indexOf('ENTIDADE_A',s);
  src.setSelectionRange(iA,iA+10);
  scheduleApply();
  toggleDocs(false);
  toast('Gabarito inserido — substitua as entidades');
}
document.querySelectorAll('.chip[data-tpl]').forEach(b=>b.addEventListener('click',()=>insertTemplate(b.dataset.tpl)));

/* ══════════ inicialização ══════════ */
function init(){
  const prefs=INIT.prefs||{};
  setTheme(prefs.theme||INIT.theme||'light');
  layoutSel.value=prefs.layout||'force';
  if(prefs.panel==='0') panel.classList.add('hidden');
  try{ positions=(INIT.positions&&typeof INIT.positions==='object')?INIT.positions:{}; }
  catch(e){ positions={}; }
  src.value=INIT.code||'erDiagram\n';
  renderHighlight();
  applyView();
  applySource(src.value,{resetLayout:Object.keys(positions).length===0,mode:layoutSel.value});
  fitView(false);
  if(vscode){
    vscode.postMessage({type:'ready'});
    vscode.postMessage({type:'savePos',pos:positions});
  }
}
document.fonts.ready.then(init,init);
})();