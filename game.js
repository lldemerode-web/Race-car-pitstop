'use strict';
// Prototype of a multiverse chess board, not a complete implementation of the commercial game's rules.
const FEN='rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR';
const symbols={K:'♔',Q:'♕',R:'♖',B:'♗',N:'♘',P:'♙',k:'♚',q:'♛',r:'♜',b:'♝',n:'♞',p:'♟'};
const side=p=>!p?0:p===p.toUpperCase()?1:-1;
const nameSide=c=>c===1?'White':'Black';
const xy=i=>[i%8,Math.floor(i/8)];
const inside=(x,y)=>x>=0&&x<8&&y>=0&&y<8;
function startBoard(){const a=[];for(const row of FEN.split('/'))for(const ch of row){if(/\d/.test(ch))for(let i=0;i<+ch;i++)a.push('');else a.push(ch)}return a;}
let state,undo=[];
function reset(){state={player:1,nextId:1,boards:[{id:0,line:0,time:0,turn:1,cells:startBoard(),parent:null}],selected:null,moves:0,message:'To create a timeline: White plays g1→f3, Black plays e7→e5, then White selects the knight on f3 (T2) and clicks e3 on the old T0 board. Submit each turn.'};undo=[];render()}
function latest(line){return state.boards.filter(b=>b.line===line).sort((a,b)=>b.time-a.time)[0]}
function isTip(b){return latest(b.line)?.id===b.id}
function playable(b){return isTip(b)&&b.turn===state.player}
function boardAt(line,time,turn){return state.boards.find(b=>b.line===line&&b.time===time&&b.turn===turn)}
function travelGeometry(p,dx,dy,dt,dl){const a=[Math.abs(dx),Math.abs(dy),Math.abs(dt),Math.abs(dl)],non=a.filter(x=>x!==0);if(!non.length)return false;const kind=p.toLowerCase();if(kind==='n')return non.length===2&&non.includes(1)&&non.includes(2);if(kind==='k')return non.every(x=>x===1);if(kind==='p')return false;const slide=non.every(x=>x===non[0]);return slide&&(kind==='q'||kind==='r'&&non.length===1||kind==='b'&&non.length===2);}
function spatialMoves(b,i){const p=b.cells[i];if(!p)return[];const [x,y]=xy(i),c=side(p),out=[];for(let j=0;j<64;j++){if(j===i||side(b.cells[j])===c)continue;const [u,v]=xy(j),dx=u-x,dy=v-y,ad=Math.abs(dx),bd=Math.abs(dy),k=p.toLowerCase();let valid=false;if(k==='p'){valid=dx===0&&!b.cells[j]&&(dy===-c||(dy===-2*c&&y===(c===1?6:1)&&!b.cells[(y-c)*8+x]))||ad===1&&dy===-c&&side(b.cells[j])===-c;}else if(k==='n')valid=ad*bd===2;else if(k==='k')valid=Math.max(ad,bd)===1;else if(k==='r')valid=dx===0||dy===0;else if(k==='b')valid=ad===bd;else if(k==='q')valid=dx===0||dy===0||ad===bd;if(!valid)continue;if(['r','b','q'].includes(k)){const sx=Math.sign(dx),sy=Math.sign(dy);let blocked=false;for(let q=1;q<Math.max(ad,bd);q++)if(b.cells[(y+q*sy)*8+x+q*sx]){blocked=true;break}if(blocked)continue}out.push({bid:b.id,index:j})}return out;}
function temporalMoves(b,i){const p=b.cells[i],c=side(p);if(!p||p.toLowerCase()==='p')return[];const [x,y]=xy(i),out=[];for(const dest of state.boards){if(dest.id===b.id||dest.turn!==c||dest.time>=b.time)continue;const dt=dest.time-b.time,dl=dest.line-b.line;for(let j=0;j<64;j++){if(side(dest.cells[j])===c)continue;const [u,v]=xy(j),dx=u-x,dy=v-y;if(!travelGeometry(p,dx,dy,dt,dl))continue;
// Check intermediate positions along a 4D ray for sliders.
const k=p.toLowerCase(),steps=Math.max(Math.abs(dx),Math.abs(dy),Math.abs(dt),Math.abs(dl));let clear=true;
if(['r','b','q'].includes(k)){for(let s=1;s<steps;s++){const tx=x+dx/steps*s,ty=y+dy/steps*s,tt=b.time+dt/steps*s,ll=b.line+dl/steps*s;if(![tx,ty,tt,ll].every(Number.isInteger)){clear=false;break}const mid=boardAt(ll,tt,c);if(!mid||mid.cells[ty*8+tx]){clear=false;break}}}
if(clear)out.push({bid:dest.id,index:j});}}
return out;}
function options(){if(!state.selected)return[];const b=state.boards.find(q=>q.id===state.selected.bid);return [...spatialMoves(b,state.selected.index),...temporalMoves(b,state.selected.index)];}
function clone(){return JSON.parse(JSON.stringify(state))}
function doMove(dest){const src=state.boards.find(b=>b.id===state.selected.bid),dst=state.boards.find(b=>b.id===dest.bid);if(!src||!dst)return;undo.push(clone());const from=state.selected.index,p=src.cells[from];const sourceCells=src.cells.slice();sourceCells[from]='';const sourceNext={id:state.nextId++,line:src.line,time:src.time+1,turn:-src.turn,cells:sourceCells,parent:src.id};state.boards.push(sourceNext);
if(src.id===dst.id){sourceNext.cells[dest.index]=p;}else{const destCells=dst.cells.slice();destCells[dest.index]=p;const branching=!isTip(dst);const newLine=branching?(state.player===1?Math.max(...state.boards.map(b=>b.line))+1:Math.min(...state.boards.map(b=>b.line))-1):dst.line;state.boards.push({id:state.nextId++,line:newLine,time:dst.time+1,turn:-dst.turn,cells:destCells,parent:dst.id,travelFrom:src.id});state.message=branching?'NEW TIMELINE CREATED! Submit the turn to continue.':'Piece traveled between boards.'}
state.moves++;state.selected=null;render()}
function clickSquare(bid,index){const b=state.boards.find(q=>q.id===bid);if(!b)return;const target=options().some(m=>m.bid===bid&&m.index===index);if(target){doMove({bid,index});return}if(playable(b)&&side(b.cells[index])===state.player){state.selected={bid,index};state.message='Choose a highlighted square. To branch, click a highlighted square on an older HISTORY board.';}else{state.selected=null;state.message='Select your piece on a PLAYABLE board.'}render()}
function submit(){const pending=state.boards.filter(playable);if(!state.moves){state.message='Make a move before submitting.';render();return}if(pending.length){state.message='Move on every playable board before submitting (prototype rule).';render();return}undo.push(clone());state.player*=-1;state.moves=0;state.selected=null;state.message=`${nameSide(state.player)} to move.`;render()}
function render(){document.getElementById('turn').textContent=`${nameSide(state.player)}'s turn`;document.getElementById('message').textContent=state.message;document.getElementById('undo').disabled=!undo.length;const target=options(),world=document.getElementById('world');world.replaceChildren();const lines=[...new Set(state.boards.map(b=>b.line))].sort((a,b)=>b-a);for(const line of lines){const row=document.createElement('div');row.className='timeline';const label=document.createElement('div');label.className='timeline-label';label.textContent=`Timeline ${line>0?'+':''}${line}`;row.append(label);const track=document.createElement('div');track.className='timeline-track';track.style.gridTemplateColumns=`repeat(${Math.max(1,...state.boards.map(b=>b.time+1))}, 286px)`;row.append(track);const boards=state.boards.filter(b=>b.line===line).sort((a,b)=>a.time-b.time||a.id-b.id);for(const b of boards){const wrap=document.createElement('section');wrap.dataset.boardId=b.id;wrap.style.gridColumn=String(b.time+1);const wrapClass='board-wrap '+(playable(b)?'playable':'history');wrap.className=wrapClass;const head=document.createElement('div');head.className='board-head';head.innerHTML=`<span>T${b.time} · ${nameSide(b.turn)}</span><b>${playable(b)?'PLAYABLE':isTip(b)?'WAITING':'HISTORY'}</b>`;wrap.append(head);const grid=document.createElement('div');grid.className='board';for(let i=0;i<64;i++){const [x,y]=xy(i),el=document.createElement('button');el.className=`square ${(x+y)%2?'dark':'light'} ${side(b.cells[i])===1?'whitepiece':side(b.cells[i])===-1?'blackpiece':''}`;if(state.selected?.bid===b.id&&state.selected.index===i)el.classList.add('selected');if(target.some(m=>m.bid===b.id&&m.index===i))el.classList.add('target');el.textContent=symbols[b.cells[i]]||'';el.title=`${'abcdefgh'[x]}${8-y}`;el.onclick=()=>clickSquare(b.id,i);grid.append(el)}wrap.append(grid);track.append(wrap)}world.append(row)}drawTimelineConnections()}
document.getElementById('submit').onclick=submit;document.getElementById('undo').onclick=()=>{if(undo.length){state=undo.pop();render()}};document.getElementById('reset').onclick=()=>{if(confirm('Start a new game?'))reset()};reset();

// Overlay paths are based on real board ancestry and actual time-travel moves.
function drawTimelineConnections(){
 const world=document.getElementById('world');
 const old=world.querySelector('.timeline-connections');if(old)old.remove();
 const ns='http://www.w3.org/2000/svg';
 const svg=document.createElementNS(ns,'svg');svg.classList.add('timeline-connections');
 svg.setAttribute('width',String(world.scrollWidth));svg.setAttribute('height',String(world.scrollHeight));
 svg.setAttribute('viewBox',`0 0 ${world.scrollWidth} ${world.scrollHeight}`);
 const defs=document.createElementNS(ns,'defs');
 for(const [id,color] of [['forward','#78a8f8'],['branch','#ffbe62'],['travel','#d58cff']]){
  const marker=document.createElementNS(ns,'marker');marker.setAttribute('id','arrow-'+id);marker.setAttribute('markerWidth','8');marker.setAttribute('markerHeight','8');marker.setAttribute('refX','6');marker.setAttribute('refY','3');marker.setAttribute('orient','auto');
  const poly=document.createElementNS(ns,'path');poly.setAttribute('d','M0,0 L6,3 L0,6 Z');poly.setAttribute('fill',color);marker.append(poly);defs.append(marker);
 }svg.append(defs);
 const origin=world.getBoundingClientRect();
 const getPoint=(id,side)=>{const el=world.querySelector(`[data-board-id="${id}"]`);if(!el)return null;const r=el.getBoundingClientRect();return {x:r.left-origin.left+world.scrollLeft+(side==='left'?0:side==='right'?r.width:r.width/2),y:r.top-origin.top+world.scrollTop+(side==='top'?0:side==='bottom'?r.height:r.height/2)};};
 const path=(a,b,type)=>{if(!a||!b)return;const e=document.createElementNS(ns,'path');const bend=Math.max(24,Math.abs(b.x-a.x)*.45);e.setAttribute('d',`M ${a.x} ${a.y} C ${a.x+bend} ${a.y}, ${b.x-bend} ${b.y}, ${b.x} ${b.y}`);e.setAttribute('fill','none');e.setAttribute('stroke',type==='branch'?'#ffbe62':type==='travel'?'#d58cff':'#78a8f8');e.setAttribute('stroke-width',type==='branch'?'4':'3');e.setAttribute('stroke-dasharray',type==='travel'?'7 6':'none');e.setAttribute('marker-end',`url(#arrow-${type})`);e.setAttribute('opacity','.9');svg.append(e);};
 for(const b of state.boards){if(b.parent!==null){const parent=state.boards.find(q=>q.id===b.parent);path(getPoint(b.parent,'right'),getPoint(b.id,'left'),parent&&parent.line!==b.line?'branch':'forward');}if(b.travelFrom!==undefined)path(getPoint(b.travelFrom,'bottom'),getPoint(b.id,'top'),'travel');}
 world.prepend(svg);
}
window.addEventListener('resize',()=>{if(state)drawTimelineConnections()});
