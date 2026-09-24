import{r as w,w as q,u as y,o as J,n as R,g as He,a as Ue,b as ht,c as K,d as G,s as xe,e as C,h as H,i as Ke,p as We,f as Ze,j as Ge,t as z,F as mt,k as Je,l as gt,m as Ye,q as kt,v as bt,x as _t,y as Oe,z as wt,A as M,B as oe,C as Mt,D as L,E as Ct,G as E,H as I,I as A,J as _,K as Qe,L as Y,M as Me,N as Ce,O as ve,P as Se,T as It,Q,R as X,S as At,U as Et}from"./vue-vendor-BuE91BgS.js";function Xe(e){return He()?(Ue(e),!0):!1}function ne(e){return typeof e=="function"?e():y(e)}const xt=typeof window<"u"&&typeof document<"u";typeof WorkerGlobalScope<"u"&&globalThis instanceof WorkerGlobalScope;const Ot=Object.prototype.toString,St=e=>Ot.call(e)==="[object Object]",Ie=()=>{};function et(e,t){function n(...a){return new Promise((o,r)=>{Promise.resolve(e(()=>t.apply(this,a),{fn:t,thisArg:this,args:a})).then(o).catch(r)})}return n}const tt=e=>e();function Dt(e,t={}){let n,a,o=Ie;const r=i=>{clearTimeout(i),o(),o=Ie};return i=>{const u=ne(e),c=ne(t.maxWait);return n&&r(n),u<=0||c!==void 0&&c<=0?(a&&(r(a),a=null),Promise.resolve(i())):new Promise((p,s)=>{o=t.rejectOnCancel?s:p,c&&!a&&(a=setTimeout(()=>{n&&r(n),a=null,p(i())},c)),n=setTimeout(()=>{a&&r(a),a=null,p(i())},u)})}}function qt(e=tt){const t=w(!0);function n(){t.value=!1}function a(){t.value=!0}const o=(...r)=>{t.value&&e(...r)};return{isActive:ht(t),pause:n,resume:a,eventFilter:o}}function Pt(e){return K()}function Tt(e,t=200,n={}){return et(Dt(t,n),e)}function Ba(e,t=200,n={}){const a=w(e.value),o=Tt(()=>{a.value=e.value},t,n);return q(e,()=>o()),a}function Ft(e,t,n={}){const{eventFilter:a=tt,...o}=n;return q(e,et(a,t),o)}function Lt(e,t,n={}){const{eventFilter:a,...o}=n,{eventFilter:r,pause:l,resume:i,isActive:u}=qt(a);return{stop:Ft(e,t,{...o,eventFilter:r}),pause:l,resume:i,isActive:u}}function Bt(e,t=!0,n){Pt()?J(e,n):t?e():R(e)}const ae=xt?window:void 0;function Rt(e){var t;const n=ne(e);return(t=n==null?void 0:n.$el)!=null?t:n}function Le(...e){let t,n,a,o;if(typeof e[0]=="string"||Array.isArray(e[0])?([n,a,o]=e,t=ae):[t,n,a,o]=e,!t)return Ie;Array.isArray(n)||(n=[n]),Array.isArray(a)||(a=[a]);const r=[],l=()=>{r.forEach(p=>p()),r.length=0},i=(p,s,d,f)=>(p.addEventListener(s,d,f),()=>p.removeEventListener(s,d,f)),u=q(()=>[Rt(t),ne(o)],([p,s])=>{if(l(),!p)return;const d=St(s)?{...s}:s;r.push(...n.flatMap(f=>a.map(g=>i(p,f,g,d))))},{immediate:!0,flush:"post"}),c=()=>{u(),l()};return Xe(c),c}function $t(){const e=w(!1),t=K();return t&&J(()=>{e.value=!0},t),e}function jt(e){const t=$t();return C(()=>(t.value,!!e()))}function Nt(e,t={}){const{window:n=ae}=t,a=jt(()=>n&&"matchMedia"in n&&typeof n.matchMedia=="function");let o;const r=w(!1),l=c=>{r.value=c.matches},i=()=>{o&&("removeEventListener"in o?o.removeEventListener("change",l):o.removeListener(l))},u=G(()=>{a.value&&(i(),o=n.matchMedia(ne(e)),"addEventListener"in o?o.addEventListener("change",l):o.addListener(l),r.value=o.matches)});return Xe(()=>{u(),i(),o=void 0}),r}const ue=typeof globalThis<"u"?globalThis:typeof window<"u"?window:typeof global<"u"?global:typeof self<"u"?self:{},ce="__vueuse_ssr_handlers__",zt=Vt();function Vt(){return ce in ue||(ue[ce]=ue[ce]||{}),ue[ce]}function Ht(e,t){return zt[e]||t}function Ra(e){return Nt("(prefers-color-scheme: dark)",e)}function Ut(e){return e==null?"any":e instanceof Set?"set":e instanceof Map?"map":e instanceof Date?"date":typeof e=="boolean"?"boolean":typeof e=="string"?"string":typeof e=="object"?"object":Number.isNaN(e)?"any":"number"}const Kt={boolean:{read:e=>e==="true",write:e=>String(e)},object:{read:e=>JSON.parse(e),write:e=>JSON.stringify(e)},number:{read:e=>Number.parseFloat(e),write:e=>String(e)},any:{read:e=>e,write:e=>String(e)},string:{read:e=>e,write:e=>String(e)},map:{read:e=>new Map(JSON.parse(e)),write:e=>JSON.stringify(Array.from(e.entries()))},set:{read:e=>new Set(JSON.parse(e)),write:e=>JSON.stringify(Array.from(e))},date:{read:e=>new Date(e),write:e=>e.toISOString()}},Be="vueuse-storage";function Wt(e,t,n,a={}){var o;const{flush:r="pre",deep:l=!0,listenToStorageChanges:i=!0,writeDefaults:u=!0,mergeDefaults:c=!1,shallow:p,window:s=ae,eventFilter:d,onError:f=x=>{console.error(x)},initOnMounted:g}=a,k=(p?xe:w)(t);if(!n)try{n=Ht("getDefaultStorage",()=>{var x;return(x=ae)==null?void 0:x.localStorage})()}catch(x){f(x)}if(!n)return k;const b=ne(t),m=Ut(b),h=(o=a.serializer)!=null?o:Kt[m],{pause:D,resume:S}=Lt(k,()=>F(k.value),{flush:r,deep:l,eventFilter:d});s&&i&&Bt(()=>{n instanceof Storage?Le(s,"storage",ee):Le(s,Be,j),g&&ee()}),g||ee();function V(x,P){if(s){const N={key:e,oldValue:x,newValue:P,storageArea:n};s.dispatchEvent(n instanceof Storage?new StorageEvent("storage",N):new CustomEvent(Be,{detail:N}))}}function F(x){try{const P=n.getItem(e);if(x==null)V(P,null),n.removeItem(e);else{const N=h.write(x);P!==N&&(n.setItem(e,N),V(P,N))}}catch(P){f(P)}}function le(x){const P=x?x.newValue:n.getItem(e);if(P==null)return u&&b!=null&&n.setItem(e,h.write(b)),b;if(!x&&c){const N=h.read(P);return typeof c=="function"?c(N,b):m==="object"&&!Array.isArray(N)?{...b,...N}:N}else return typeof P!="string"?P:h.read(P)}function ee(x){if(!(x&&x.storageArea!==n)){if(x&&x.key==null){k.value=b;return}if(!(x&&x.key!==e)){D();try{(x==null?void 0:x.newValue)!==h.write(k.value)&&(k.value=le(x))}catch(P){f(P)}finally{x?R(S):S()}}}}function j(x){ee(x.detail)}return k}function $a(e,t,n={}){const{window:a=ae}=n;return Wt(e,t,a==null?void 0:a.localStorage,n)}/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Zt=e=>e.replace(/([a-z0-9])([A-Z])/g,"$1-$2").toLowerCase();/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */var de={xmlns:"http://www.w3.org/2000/svg",width:24,height:24,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor","stroke-width":2,"stroke-linecap":"round","stroke-linejoin":"round"};/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Gt=({size:e,strokeWidth:t=2,absoluteStrokeWidth:n,color:a,iconNode:o,name:r,class:l,...i},{slots:u})=>H("svg",{...de,width:e||de.width,height:e||de.height,stroke:a||de.stroke,"stroke-width":n?Number(t)*24/Number(e):t,class:["lucide",`lucide-${Zt(r??"icon")}`],...i},[...o.map(c=>H(...c)),...u.default?[u.default()]:[]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const v=(e,t)=>(n,{slots:a})=>H(Gt,{...n,iconNode:t,name:e},a);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ja=v("ArchiveIcon",[["rect",{width:"20",height:"5",x:"2",y:"3",rx:"1",key:"1wp1u1"}],["path",{d:"M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8",key:"1s80jp"}],["path",{d:"M10 12h4",key:"a56b0p"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Na=v("ArrowDownLeftIcon",[["path",{d:"M17 7 7 17",key:"15tmo1"}],["path",{d:"M17 17H7V7",key:"1org7z"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const za=v("ArrowLeftRightIcon",[["path",{d:"M8 3 4 7l4 4",key:"9rb6wj"}],["path",{d:"M4 7h16",key:"6tx8e3"}],["path",{d:"m16 21 4-4-4-4",key:"siv7j2"}],["path",{d:"M20 17H4",key:"h6l3hr"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Va=v("ArrowLeftIcon",[["path",{d:"m12 19-7-7 7-7",key:"1l729n"}],["path",{d:"M19 12H5",key:"x3x0zl"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ha=v("ArrowRightIcon",[["path",{d:"M5 12h14",key:"1ays0h"}],["path",{d:"m12 5 7 7-7 7",key:"xquz4c"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ua=v("ArrowUpDownIcon",[["path",{d:"m21 16-4 4-4-4",key:"f6ql7i"}],["path",{d:"M17 20V4",key:"1ejh1v"}],["path",{d:"m3 8 4-4 4 4",key:"11wl7u"}],["path",{d:"M7 4v16",key:"1glfcx"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ka=v("ArrowUpRightIcon",[["path",{d:"M7 7h10v10",key:"1tivn9"}],["path",{d:"M7 17 17 7",key:"1vkiza"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Wa=v("BadgeDollarSignIcon",[["path",{d:"M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z",key:"3c2336"}],["path",{d:"M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8",key:"1h4pet"}],["path",{d:"M12 18V6",key:"zqpxq5"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Za=v("BanknoteIcon",[["rect",{width:"20",height:"12",x:"2",y:"6",rx:"2",key:"9lu3g6"}],["circle",{cx:"12",cy:"12",r:"2",key:"1c9p78"}],["path",{d:"M6 12h.01M18 12h.01",key:"113zkx"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ga=v("BikeIcon",[["circle",{cx:"18.5",cy:"17.5",r:"3.5",key:"15x4ox"}],["circle",{cx:"5.5",cy:"17.5",r:"3.5",key:"1noe27"}],["circle",{cx:"15",cy:"5",r:"1",key:"19l28e"}],["path",{d:"M12 17.5V14l-3-3 4-3 2 3h2",key:"1npguv"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ja=v("BoxesIcon",[["path",{d:"M2.97 12.92A2 2 0 0 0 2 14.63v3.24a2 2 0 0 0 .97 1.71l3 1.8a2 2 0 0 0 2.06 0L12 19v-5.5l-5-3-4.03 2.42Z",key:"lc1i9w"}],["path",{d:"m7 16.5-4.74-2.85",key:"1o9zyk"}],["path",{d:"m7 16.5 5-3",key:"va8pkn"}],["path",{d:"M7 16.5v5.17",key:"jnp8gn"}],["path",{d:"M12 13.5V19l3.97 2.38a2 2 0 0 0 2.06 0l3-1.8a2 2 0 0 0 .97-1.71v-3.24a2 2 0 0 0-.97-1.71L17 10.5l-5 3Z",key:"8zsnat"}],["path",{d:"m17 16.5-5-3",key:"8arw3v"}],["path",{d:"m17 16.5 4.74-2.85",key:"8rfmw"}],["path",{d:"M17 16.5v5.17",key:"k6z78m"}],["path",{d:"M7.97 4.42A2 2 0 0 0 7 6.13v4.37l5 3 5-3V6.13a2 2 0 0 0-.97-1.71l-3-1.8a2 2 0 0 0-2.06 0l-3 1.8Z",key:"1xygjf"}],["path",{d:"M12 8 7.26 5.15",key:"1vbdud"}],["path",{d:"m12 8 4.74-2.85",key:"3rx089"}],["path",{d:"M12 13.5V8",key:"1io7kd"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ya=v("BriefcaseIcon",[["path",{d:"M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16",key:"jecpp"}],["rect",{width:"20",height:"14",x:"2",y:"6",rx:"2",key:"i6l2r4"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Qa=v("BuildingIcon",[["rect",{width:"16",height:"20",x:"4",y:"2",rx:"2",ry:"2",key:"76otgf"}],["path",{d:"M9 22v-4h6v4",key:"r93iot"}],["path",{d:"M8 6h.01",key:"1dz90k"}],["path",{d:"M16 6h.01",key:"1x0f13"}],["path",{d:"M12 6h.01",key:"1vi96p"}],["path",{d:"M12 10h.01",key:"1nrarc"}],["path",{d:"M12 14h.01",key:"1etili"}],["path",{d:"M16 10h.01",key:"1m94wz"}],["path",{d:"M16 14h.01",key:"1gbofw"}],["path",{d:"M8 10h.01",key:"19clt8"}],["path",{d:"M8 14h.01",key:"6423bh"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Xa=v("CalendarCheckIcon",[["path",{d:"M8 2v4",key:"1cmpym"}],["path",{d:"M16 2v4",key:"4m81vk"}],["rect",{width:"18",height:"18",x:"3",y:"4",rx:"2",key:"1hopcy"}],["path",{d:"M3 10h18",key:"8toen8"}],["path",{d:"m9 16 2 2 4-4",key:"19s6y9"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const eo=v("CalendarRangeIcon",[["rect",{width:"18",height:"18",x:"3",y:"4",rx:"2",key:"1hopcy"}],["path",{d:"M16 2v4",key:"4m81vk"}],["path",{d:"M3 10h18",key:"8toen8"}],["path",{d:"M8 2v4",key:"1cmpym"}],["path",{d:"M17 14h-6",key:"bkmgh3"}],["path",{d:"M13 18H7",key:"bb0bb7"}],["path",{d:"M7 14h.01",key:"1qa3f1"}],["path",{d:"M17 18h.01",key:"1bdyru"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const to=v("CalendarIcon",[["path",{d:"M8 2v4",key:"1cmpym"}],["path",{d:"M16 2v4",key:"4m81vk"}],["rect",{width:"18",height:"18",x:"3",y:"4",rx:"2",key:"1hopcy"}],["path",{d:"M3 10h18",key:"8toen8"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const no=v("CheckCheckIcon",[["path",{d:"M18 6 7 17l-5-5",key:"116fxf"}],["path",{d:"m22 10-7.5 7.5L13 16",key:"ke71qq"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ao=v("CheckIcon",[["path",{d:"M20 6 9 17l-5-5",key:"1gmf2c"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const oo=v("ChefHatIcon",[["path",{d:"M17 21a1 1 0 0 0 1-1v-5.35c0-.457.316-.844.727-1.041a4 4 0 0 0-2.134-7.589 5 5 0 0 0-9.186 0 4 4 0 0 0-2.134 7.588c.411.198.727.585.727 1.041V20a1 1 0 0 0 1 1Z",key:"1qvrer"}],["path",{d:"M6 17h12",key:"1jwigz"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ro=v("ChevronDownIcon",[["path",{d:"m6 9 6 6 6-6",key:"qrunsl"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const so=v("ChevronRightIcon",[["path",{d:"m9 18 6-6-6-6",key:"mthhwq"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const io=v("ChevronUpIcon",[["path",{d:"m18 15-6-6-6 6",key:"153udz"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const lo=v("CircleAlertIcon",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["line",{x1:"12",x2:"12",y1:"8",y2:"12",key:"1pkeuh"}],["line",{x1:"12",x2:"12.01",y1:"16",y2:"16",key:"4dfq90"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const uo=v("CircleCheckIcon",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["path",{d:"m9 12 2 2 4-4",key:"dzmm74"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const co=v("CircleHelpIcon",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["path",{d:"M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3",key:"1u773s"}],["path",{d:"M12 17h.01",key:"p32p05"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const po=v("CirclePauseIcon",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["line",{x1:"10",x2:"10",y1:"15",y2:"9",key:"c1nkhi"}],["line",{x1:"14",x2:"14",y1:"15",y2:"9",key:"h65svq"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const fo=v("ClipboardListIcon",[["rect",{width:"8",height:"4",x:"8",y:"2",rx:"1",ry:"1",key:"tgr4d6"}],["path",{d:"M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2",key:"116196"}],["path",{d:"M12 11h4",key:"1jrz19"}],["path",{d:"M12 16h4",key:"n85exb"}],["path",{d:"M8 11h.01",key:"1dfujw"}],["path",{d:"M8 16h.01",key:"18s6g9"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const yo=v("ClockIcon",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["polyline",{points:"12 6 12 12 16 14",key:"68esgv"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const vo=v("CopyIcon",[["rect",{width:"14",height:"14",x:"8",y:"8",rx:"2",ry:"2",key:"17jyea"}],["path",{d:"M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2",key:"zix9uf"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ho=v("CreditCardIcon",[["rect",{width:"20",height:"14",x:"2",y:"5",rx:"2",key:"ynyp8z"}],["line",{x1:"2",x2:"22",y1:"10",y2:"10",key:"1b3vmo"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const mo=v("CrownIcon",[["path",{d:"M11.562 3.266a.5.5 0 0 1 .876 0L15.39 8.87a1 1 0 0 0 1.516.294L21.183 5.5a.5.5 0 0 1 .798.519l-2.834 10.246a1 1 0 0 1-.956.734H5.81a1 1 0 0 1-.957-.734L2.02 6.02a.5.5 0 0 1 .798-.519l4.276 3.664a1 1 0 0 0 1.516-.294z",key:"1vdc57"}],["path",{d:"M5 21h14",key:"11awu3"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const go=v("DollarSignIcon",[["line",{x1:"12",x2:"12",y1:"2",y2:"22",key:"7eqyqh"}],["path",{d:"M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6",key:"1b0p4s"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ko=v("EyeOffIcon",[["path",{d:"M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49",key:"ct8e1f"}],["path",{d:"M14.084 14.158a3 3 0 0 1-4.242-4.242",key:"151rxh"}],["path",{d:"M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143",key:"13bj9a"}],["path",{d:"m2 2 20 20",key:"1ooewy"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const bo=v("EyeIcon",[["path",{d:"M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0",key:"1nclc0"}],["circle",{cx:"12",cy:"12",r:"3",key:"1v7zrd"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const _o=v("FileTextIcon",[["path",{d:"M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z",key:"1rqfz7"}],["path",{d:"M14 2v4a2 2 0 0 0 2 2h4",key:"tnqrlb"}],["path",{d:"M10 9H8",key:"b1mrlr"}],["path",{d:"M16 13H8",key:"t4e002"}],["path",{d:"M16 17H8",key:"z1uh3a"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const wo=v("FlaskConicalIcon",[["path",{d:"M10 2v7.527a2 2 0 0 1-.211.896L4.72 20.55a1 1 0 0 0 .9 1.45h12.76a1 1 0 0 0 .9-1.45l-5.069-10.127A2 2 0 0 1 14 9.527V2",key:"pzvekw"}],["path",{d:"M8.5 2h7",key:"csnxdl"}],["path",{d:"M7 16h10",key:"wp8him"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Mo=v("FuelIcon",[["line",{x1:"3",x2:"15",y1:"22",y2:"22",key:"xegly4"}],["line",{x1:"4",x2:"14",y1:"9",y2:"9",key:"xcnuvu"}],["path",{d:"M14 22V4a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v18",key:"16j0yd"}],["path",{d:"M14 13h2a2 2 0 0 1 2 2v2a2 2 0 0 0 2 2a2 2 0 0 0 2-2V9.83a2 2 0 0 0-.59-1.42L18 5",key:"7cu91f"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Co=v("HardHatIcon",[["path",{d:"M2 18a1 1 0 0 0 1 1h18a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1v2z",key:"1dej2m"}],["path",{d:"M10 10V5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v5",key:"1p9q5i"}],["path",{d:"M4 15v-3a6 6 0 0 1 6-6",key:"9ciidu"}],["path",{d:"M14 6a6 6 0 0 1 6 6v3",key:"1hnv84"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Io=v("HashIcon",[["line",{x1:"4",x2:"20",y1:"9",y2:"9",key:"4lhtct"}],["line",{x1:"4",x2:"20",y1:"15",y2:"15",key:"vyu0kd"}],["line",{x1:"10",x2:"8",y1:"3",y2:"21",key:"1ggp8o"}],["line",{x1:"16",x2:"14",y1:"3",y2:"21",key:"weycgp"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ao=v("InstagramIcon",[["rect",{width:"20",height:"20",x:"2",y:"2",rx:"5",ry:"5",key:"2e1cvw"}],["path",{d:"M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z",key:"9exkf1"}],["line",{x1:"17.5",x2:"17.51",y1:"6.5",y2:"6.5",key:"r4j83e"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Eo=v("KeyRoundIcon",[["path",{d:"M2.586 17.414A2 2 0 0 0 2 18.828V21a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h1a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h.172a2 2 0 0 0 1.414-.586l.814-.814a6.5 6.5 0 1 0-4-4z",key:"1s6t7t"}],["circle",{cx:"16.5",cy:"7.5",r:".5",fill:"currentColor",key:"w0ekpg"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const xo=v("LayersIcon",[["path",{d:"m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z",key:"8b97xw"}],["path",{d:"m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65",key:"dd6zsq"}],["path",{d:"m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65",key:"ep9fru"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Oo=v("LayoutDashboardIcon",[["rect",{width:"7",height:"9",x:"3",y:"3",rx:"1",key:"10lvy0"}],["rect",{width:"7",height:"5",x:"14",y:"3",rx:"1",key:"16une8"}],["rect",{width:"7",height:"9",x:"14",y:"12",rx:"1",key:"1hutg5"}],["rect",{width:"7",height:"5",x:"3",y:"16",rx:"1",key:"ldoo1y"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const So=v("LoaderCircleIcon",[["path",{d:"M21 12a9 9 0 1 1-6.219-8.56",key:"13zald"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Do=v("LockIcon",[["rect",{width:"18",height:"11",x:"3",y:"11",rx:"2",ry:"2",key:"1w4ew1"}],["path",{d:"M7 11V7a5 5 0 0 1 10 0v4",key:"fwvmzm"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const qo=v("LogInIcon",[["path",{d:"M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4",key:"u53s6r"}],["polyline",{points:"10 17 15 12 10 7",key:"1ail0h"}],["line",{x1:"15",x2:"3",y1:"12",y2:"12",key:"v6grx8"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Po=v("LogOutIcon",[["path",{d:"M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4",key:"1uf3rs"}],["polyline",{points:"16 17 21 12 16 7",key:"1gabdz"}],["line",{x1:"21",x2:"9",y1:"12",y2:"12",key:"1uyos4"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const To=v("MapPinIcon",[["path",{d:"M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0",key:"1r0f0z"}],["circle",{cx:"12",cy:"10",r:"3",key:"ilqhr7"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Fo=v("MessageCircleIcon",[["path",{d:"M7.9 20A9 9 0 1 0 4 16.1L2 22Z",key:"vv11sd"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Lo=v("MilkIcon",[["path",{d:"M8 2h8",key:"1ssgc1"}],["path",{d:"M9 2v2.789a4 4 0 0 1-.672 2.219l-.656.984A4 4 0 0 0 7 10.212V20a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-9.789a4 4 0 0 0-.672-2.219l-.656-.984A4 4 0 0 1 15 4.788V2",key:"qtp12x"}],["path",{d:"M7 15a6.472 6.472 0 0 1 5 0 6.47 6.47 0 0 0 5 0",key:"ygeh44"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Bo=v("MoonIcon",[["path",{d:"M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z",key:"a7tn18"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ro=v("PackageCheckIcon",[["path",{d:"m16 16 2 2 4-4",key:"gfu2re"}],["path",{d:"M21 10V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l2-1.14",key:"e7tb2h"}],["path",{d:"m7.5 4.27 9 5.15",key:"1c824w"}],["polyline",{points:"3.29 7 12 12 20.71 7",key:"ousv84"}],["line",{x1:"12",x2:"12",y1:"22",y2:"12",key:"a4e8g8"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const $o=v("PackageIcon",[["path",{d:"M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z",key:"1a0edw"}],["path",{d:"M12 22V12",key:"d0xqtd"}],["path",{d:"m3.3 7 7.703 4.734a2 2 0 0 0 1.994 0L20.7 7",key:"yx3hmr"}],["path",{d:"m7.5 4.27 9 5.15",key:"1c824w"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const jo=v("PenLineIcon",[["path",{d:"M12 20h9",key:"t2du7b"}],["path",{d:"M16.376 3.622a1 1 0 0 1 3.002 3.002L7.368 18.635a2 2 0 0 1-.855.506l-2.872.838a.5.5 0 0 1-.62-.62l.838-2.872a2 2 0 0 1 .506-.854z",key:"1ykcvy"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const No=v("PenIcon",[["path",{d:"M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z",key:"1a8usu"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const zo=v("PercentIcon",[["line",{x1:"19",x2:"5",y1:"5",y2:"19",key:"1x9vlm"}],["circle",{cx:"6.5",cy:"6.5",r:"2.5",key:"4mh3h7"}],["circle",{cx:"17.5",cy:"17.5",r:"2.5",key:"1mdrzq"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Vo=v("PhoneCallIcon",[["path",{d:"M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z",key:"foiqr5"}],["path",{d:"M14.05 2a9 9 0 0 1 8 7.94",key:"vmijpz"}],["path",{d:"M14.05 6A5 5 0 0 1 18 10",key:"13nbpp"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ho=v("PhoneIcon",[["path",{d:"M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z",key:"foiqr5"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Uo=v("PiggyBankIcon",[["path",{d:"M19 5c-1.5 0-2.8 1.4-3 2-3.5-1.5-11-.3-11 5 0 1.8 0 3 2 4.5V20h4v-2h3v2h4v-4c1-.5 1.7-1 2-2h2v-4h-2c0-1-.5-1.5-1-2V5z",key:"1ivx2i"}],["path",{d:"M2 9v1c0 1.1.9 2 2 2h1",key:"nm575m"}],["path",{d:"M16 11h.01",key:"xkw8gn"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ko=v("PlusIcon",[["path",{d:"M5 12h14",key:"1ays0h"}],["path",{d:"M12 5v14",key:"s699le"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Wo=v("PowerIcon",[["path",{d:"M12 2v10",key:"mnfbl"}],["path",{d:"M18.4 6.6a9 9 0 1 1-12.77.04",key:"obofu9"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Zo=v("QrCodeIcon",[["rect",{width:"5",height:"5",x:"3",y:"3",rx:"1",key:"1tu5fj"}],["rect",{width:"5",height:"5",x:"16",y:"3",rx:"1",key:"1v8r4q"}],["rect",{width:"5",height:"5",x:"3",y:"16",rx:"1",key:"1x03jg"}],["path",{d:"M21 16h-3a2 2 0 0 0-2 2v3",key:"177gqh"}],["path",{d:"M21 21v.01",key:"ents32"}],["path",{d:"M12 7v3a2 2 0 0 1-2 2H7",key:"8crl2c"}],["path",{d:"M3 12h.01",key:"nlz23k"}],["path",{d:"M12 3h.01",key:"n36tog"}],["path",{d:"M12 16v.01",key:"133mhm"}],["path",{d:"M16 12h1",key:"1slzba"}],["path",{d:"M21 12v.01",key:"1lwtk9"}],["path",{d:"M12 21v-1",key:"1880an"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Go=v("ReceiptTextIcon",[["path",{d:"M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z",key:"q3az6g"}],["path",{d:"M14 8H8",key:"1l3xfs"}],["path",{d:"M16 12H8",key:"1fr5h0"}],["path",{d:"M13 16H8",key:"wsln4y"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Jo=v("ReceiptIcon",[["path",{d:"M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z",key:"q3az6g"}],["path",{d:"M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8",key:"1h4pet"}],["path",{d:"M12 17.5v-11",key:"1jc1ny"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Yo=v("RefreshCwIcon",[["path",{d:"M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8",key:"v9h5vc"}],["path",{d:"M21 3v5h-5",key:"1q7to0"}],["path",{d:"M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16",key:"3uifl3"}],["path",{d:"M8 16H3v5",key:"1cv678"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Qo=v("RotateCwIcon",[["path",{d:"M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8",key:"1p45f6"}],["path",{d:"M21 3v5h-5",key:"1q7to0"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Xo=v("SaveIcon",[["path",{d:"M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z",key:"1c8476"}],["path",{d:"M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7",key:"1ydtos"}],["path",{d:"M7 3v4a1 1 0 0 0 1 1h7",key:"t51u73"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const er=v("ScaleIcon",[["path",{d:"m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z",key:"7g6ntu"}],["path",{d:"m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z",key:"ijws7r"}],["path",{d:"M7 21h10",key:"1b0cd5"}],["path",{d:"M12 3v18",key:"108xh3"}],["path",{d:"M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2",key:"3gwbw2"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const tr=v("SearchIcon",[["circle",{cx:"11",cy:"11",r:"8",key:"4ej97u"}],["path",{d:"m21 21-4.3-4.3",key:"1qie3q"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const nr=v("SendIcon",[["path",{d:"M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z",key:"1ffxy3"}],["path",{d:"m21.854 2.147-10.94 10.939",key:"12cjpa"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ar=v("SettingsIcon",[["path",{d:"M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z",key:"1qme2f"}],["circle",{cx:"12",cy:"12",r:"3",key:"1v7zrd"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const or=v("ShieldAlertIcon",[["path",{d:"M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z",key:"oel41y"}],["path",{d:"M12 8v4",key:"1got3b"}],["path",{d:"M12 16h.01",key:"1drbdi"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const rr=v("ShieldCheckIcon",[["path",{d:"M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z",key:"oel41y"}],["path",{d:"m9 12 2 2 4-4",key:"dzmm74"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const sr=v("ShoppingBagIcon",[["path",{d:"M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z",key:"hou9p0"}],["path",{d:"M3 6h18",key:"d0wm0j"}],["path",{d:"M16 10a4 4 0 0 1-8 0",key:"1ltviw"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ir=v("SlidersHorizontalIcon",[["line",{x1:"21",x2:"14",y1:"4",y2:"4",key:"obuewd"}],["line",{x1:"10",x2:"3",y1:"4",y2:"4",key:"1q6298"}],["line",{x1:"21",x2:"12",y1:"12",y2:"12",key:"1iu8h1"}],["line",{x1:"8",x2:"3",y1:"12",y2:"12",key:"ntss68"}],["line",{x1:"21",x2:"16",y1:"20",y2:"20",key:"14d8ph"}],["line",{x1:"12",x2:"3",y1:"20",y2:"20",key:"m0wm8r"}],["line",{x1:"14",x2:"14",y1:"2",y2:"6",key:"14e1ph"}],["line",{x1:"8",x2:"8",y1:"10",y2:"14",key:"1i6ji0"}],["line",{x1:"16",x2:"16",y1:"18",y2:"22",key:"1lctlv"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const lr=v("SmartphoneIcon",[["rect",{width:"14",height:"20",x:"5",y:"2",rx:"2",ry:"2",key:"1yt0o3"}],["path",{d:"M12 18h.01",key:"mhygvu"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ur=v("SparklesIcon",[["path",{d:"M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z",key:"4pj2yx"}],["path",{d:"M20 3v4",key:"1olli1"}],["path",{d:"M22 5h-4",key:"1gvqau"}],["path",{d:"M4 17v2",key:"vumght"}],["path",{d:"M5 18H3",key:"zchphs"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const cr=v("SunIcon",[["circle",{cx:"12",cy:"12",r:"4",key:"4exip2"}],["path",{d:"M12 2v2",key:"tus03m"}],["path",{d:"M12 20v2",key:"1lh1kg"}],["path",{d:"m4.93 4.93 1.41 1.41",key:"149t6j"}],["path",{d:"m17.66 17.66 1.41 1.41",key:"ptbguv"}],["path",{d:"M2 12h2",key:"1t8f8n"}],["path",{d:"M20 12h2",key:"1q8mjw"}],["path",{d:"m6.34 17.66-1.41 1.41",key:"1m8zz5"}],["path",{d:"m19.07 4.93-1.41 1.41",key:"1shlcs"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const dr=v("TagIcon",[["path",{d:"M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z",key:"vktsd0"}],["circle",{cx:"7.5",cy:"7.5",r:".5",fill:"currentColor",key:"kqv944"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const pr=v("TimerIcon",[["line",{x1:"10",x2:"14",y1:"2",y2:"2",key:"14vaq8"}],["line",{x1:"12",x2:"15",y1:"14",y2:"11",key:"17fdiu"}],["circle",{cx:"12",cy:"14",r:"8",key:"1e1u0o"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const fr=v("Trash2Icon",[["path",{d:"M3 6h18",key:"d0wm0j"}],["path",{d:"M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6",key:"4alrt4"}],["path",{d:"M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2",key:"v07s0e"}],["line",{x1:"10",x2:"10",y1:"11",y2:"17",key:"1uufr5"}],["line",{x1:"14",x2:"14",y1:"11",y2:"17",key:"xtxkd"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const yr=v("TrendingUpIcon",[["polyline",{points:"22 7 13.5 15.5 8.5 10.5 2 17",key:"126l90"}],["polyline",{points:"16 7 22 7 22 13",key:"kwv8wd"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const vr=v("TriangleAlertIcon",[["path",{d:"m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3",key:"wmoenq"}],["path",{d:"M12 9v4",key:"juzpu7"}],["path",{d:"M12 17h.01",key:"p32p05"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const hr=v("TruckIcon",[["path",{d:"M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2",key:"wrbu53"}],["path",{d:"M15 18H9",key:"1lyqi6"}],["path",{d:"M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14",key:"lysw3i"}],["circle",{cx:"17",cy:"18",r:"2",key:"332jqn"}],["circle",{cx:"7",cy:"18",r:"2",key:"19iecd"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const mr=v("UserCheckIcon",[["path",{d:"M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2",key:"1yyitq"}],["circle",{cx:"9",cy:"7",r:"4",key:"nufk8"}],["polyline",{points:"16 11 18 13 22 9",key:"1pwet4"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const gr=v("UserPlusIcon",[["path",{d:"M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2",key:"1yyitq"}],["circle",{cx:"9",cy:"7",r:"4",key:"nufk8"}],["line",{x1:"19",x2:"19",y1:"8",y2:"14",key:"1bvyxn"}],["line",{x1:"22",x2:"16",y1:"11",y2:"11",key:"1shjgl"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const kr=v("UserIcon",[["path",{d:"M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2",key:"975kel"}],["circle",{cx:"12",cy:"7",r:"4",key:"17ys0d"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const br=v("UsersIcon",[["path",{d:"M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2",key:"1yyitq"}],["circle",{cx:"9",cy:"7",r:"4",key:"nufk8"}],["path",{d:"M22 21v-2a4 4 0 0 0-3-3.87",key:"kshegd"}],["path",{d:"M16 3.13a4 4 0 0 1 0 7.75",key:"1da9ce"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const _r=v("WalletIcon",[["path",{d:"M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1",key:"18etb6"}],["path",{d:"M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4",key:"xoc0q4"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const wr=v("WifiIcon",[["path",{d:"M12 20h.01",key:"zekei9"}],["path",{d:"M2 8.82a15 15 0 0 1 20 0",key:"dnpr2z"}],["path",{d:"M5 12.859a10 10 0 0 1 14 0",key:"1x1e6c"}],["path",{d:"M8.5 16.429a5 5 0 0 1 7 0",key:"1bycff"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Mr=v("WrenchIcon",[["path",{d:"M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z",key:"cbrjhi"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Cr=v("XIcon",[["path",{d:"M18 6 6 18",key:"1bl5f8"}],["path",{d:"m6 6 12 12",key:"d8bk6v"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ir=v("ZapIcon",[["path",{d:"M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z",key:"1xq2db"}]]);function re(e,t){const n=typeof e=="string"&&!t?`${e}Context`:t,a=Symbol(n);return[l=>{const i=Ke(a,l);if(i||i===null)return i;throw new Error(`Injection \`${a.toString()}\` not found. Component must be used within ${Array.isArray(e)?`one of the following components: ${e.join(", ")}`:`\`${e}\``}`)},l=>(We(a,l),l)]}function B(){let e=document.activeElement;if(e==null)return null;for(;e!=null&&e.shadowRoot!=null&&e.shadowRoot.activeElement!=null;)e=e.shadowRoot.activeElement;return e}function nt(e,t,n){const a=n.originalEvent.target,o=new CustomEvent(e,{bubbles:!1,cancelable:!0,detail:n});t&&a.addEventListener(e,t,{once:!0}),a.dispatchEvent(o)}function Jt(e){return e==null}function Yt(e,t){return He()?(Ue(e,t),!0):!1}function Qt(e){let t=!1,n;const a=Ge(!0);return(...o)=>(t||(n=a.run(()=>e(...o)),t=!0),n)}const U=typeof window<"u"&&typeof document<"u";typeof WorkerGlobalScope<"u"&&globalThis instanceof WorkerGlobalScope;const Xt=e=>typeof e<"u",en=Object.prototype.toString,tn=e=>en.call(e)==="[object Object]",Re=nn();function nn(){var e,t,n;return U&&!!(!((e=window)===null||e===void 0||(e=e.navigator)===null||e===void 0)&&e.userAgent)&&(/iP(?:ad|hone|od)/.test(window.navigator.userAgent)||((t=window)===null||t===void 0||(t=t.navigator)===null||t===void 0?void 0:t.maxTouchPoints)>2&&/iPad|Macintosh/.test((n=window)===null||n===void 0?void 0:n.navigator.userAgent))}function ge(e){return Array.isArray(e)?e:[e]}function an(e){return K()}function on(e){if(!U)return e;let t=0,n,a;const o=()=>{t-=1,a&&t<=0&&(a.stop(),n=void 0,a=void 0)};return(...r)=>(t+=1,a||(a=Ge(!0),n=a.run(()=>e(...r))),Yt(o),n)}function rn(e,t){an()&&Ze(e,t)}function sn(e,t,n){return q(e,t,{...n,immediate:!0})}const De=U?window:void 0;function se(e){var t;const n=z(e);return(t=n==null?void 0:n.$el)!==null&&t!==void 0?t:n}function at(...e){const t=(a,o,r,l)=>(a.addEventListener(o,r,l),()=>a.removeEventListener(o,r,l)),n=C(()=>{const a=ge(z(e[0])).filter(o=>o!=null);return a.every(o=>typeof o!="string")?a:void 0});return sn(()=>{var a,o;return[(a=(o=n.value)===null||o===void 0?void 0:o.map(r=>se(r)))!==null&&a!==void 0?a:[De].filter(r=>r!=null),ge(z(n.value?e[1]:e[0])),ge(y(n.value?e[2]:e[1])),z(n.value?e[3]:e[2])]},([a,o,r,l],i,u)=>{if(!(a!=null&&a.length)||!(o!=null&&o.length)||!(r!=null&&r.length))return;const c=tn(l)?{...l}:l,p=a.flatMap(s=>o.flatMap(d=>r.map(f=>t(s,d,f,c))));u(()=>{p.forEach(s=>s())})},{flush:"post"})}function ln(){const e=xe(!1),t=K();return t&&J(()=>{e.value=!0},t),e}function un(e){return typeof e=="function"?e:typeof e=="string"?t=>t.key===e:Array.isArray(e)?t=>e.includes(t.key):()=>!0}function cn(...e){let t,n,a={};e.length===3?(t=e[0],n=e[1],a=e[2]):e.length===2?typeof e[1]=="object"?(t=!0,n=e[0],a=e[1]):(t=e[0],n=e[1]):(t=!0,n=e[0]);const{target:o=De,eventName:r="keydown",passive:l=!1,dedupe:i=!1}=a,u=un(t);return at(o,r,p=>{p.repeat&&z(i)||u(p)&&n(p)},l)}function dn(e){return JSON.parse(JSON.stringify(e))}function qe(e,t,n,a={}){var o,r;const{clone:l=!1,passive:i=!1,eventName:u,deep:c=!1,defaultValue:p,shouldEmit:s}=a,d=K(),f=n||(d==null?void 0:d.emit)||(d==null||(o=d.$emit)===null||o===void 0?void 0:o.bind(d))||(d==null||(r=d.proxy)===null||r===void 0||(r=r.$emit)===null||r===void 0?void 0:r.bind(d==null?void 0:d.proxy));let g=u;t||(t="modelValue"),g=g||`update:${t.toString()}`;const k=h=>l?typeof l=="function"?l(h):dn(h):h,b=()=>Xt(e[t])?k(e[t]):p,m=h=>{s?s(h)&&f(g,h):f(g,h)};if(i){const h=w(b());let D=!1;return q(()=>e[t],S=>{D||(D=!0,h.value=k(S),R(()=>D=!1))}),q(h,S=>{!D&&(S!==e[t]||c)&&m(S)},{deep:c}),h}else return C({get(){return b()},set(h){m(h)}})}function Pe(e){return e?e.flatMap(t=>t.type===mt?Pe(t.children):[t]):[]}const[me]=re("ConfigProvider"),T=Je({layersRoot:new Set,layersWithOutsidePointerEventsDisabled:new Set,originalBodyPointerEvents:void 0,branches:new Set});function ke(e){if(e===null||typeof e!="object")return!1;const t=Object.getPrototypeOf(e);return t!==null&&t!==Object.prototype&&Object.getPrototypeOf(t)!==null||Symbol.iterator in e?!1:Symbol.toStringTag in e?Object.prototype.toString.call(e)==="[object Module]":!0}function Ae(e,t,n=".",a){if(!ke(t))return Ae(e,{},n,a);const o={...t};for(const r of Object.keys(e)){if(r==="__proto__"||r==="constructor")continue;const l=e[r];l!=null&&(a&&a(o,r,l,n)||(Array.isArray(l)&&Array.isArray(o[r])?o[r]=[...l,...o[r]]:ke(l)&&ke(o[r])?o[r]=Ae(l,o[r],(n?`${n}.`:"")+r.toString(),a):o[r]=l))}return o}function pn(e){return(...t)=>t.reduce((n,a)=>Ae(n,a,"",e),{})}const fn=pn(),yn=on(()=>{const e=w(new Map),t=w(),n=C(()=>{for(const l of e.value.values())if(l)return!0;return!1}),a=me({scrollBody:w(!0)});let o=null;const r=()=>{document.body.style.paddingRight="",document.body.style.marginRight="",T.layersWithOutsidePointerEventsDisabled.size===0&&(document.body.style.pointerEvents=""),document.documentElement.style.removeProperty("--scrollbar-width"),document.body.style.overflow=t.value??"",Re&&(o==null||o()),t.value=void 0};return q(n,(l,i)=>{var s;if(!U)return;if(!l){i&&r();return}t.value===void 0&&(t.value=document.body.style.overflow);const u=window.innerWidth-document.documentElement.clientWidth,c={padding:u,margin:0},p=(s=a.scrollBody)!=null&&s.value?typeof a.scrollBody.value=="object"?fn({padding:a.scrollBody.value.padding===!0?u:a.scrollBody.value.padding,margin:a.scrollBody.value.margin===!0?u:a.scrollBody.value.margin},c):c:{padding:0,margin:0};u>0&&(document.body.style.paddingRight=typeof p.padding=="number"?`${p.padding}px`:String(p.padding),document.body.style.marginRight=typeof p.margin=="number"?`${p.margin}px`:String(p.margin),document.documentElement.style.setProperty("--scrollbar-width",`${u}px`),document.body.style.overflow="hidden"),Re&&(o=at(document,"touchmove",d=>hn(d),{passive:!1})),R(()=>{n.value&&(document.body.style.pointerEvents="none",document.body.style.overflow="hidden")})},{immediate:!0,flush:"sync"}),e});function vn(e){const t=Math.random().toString(36).substring(2,7),n=yn();n.value.set(t,e??!1);const a=C({get:()=>n.value.get(t)??!1,set:o=>n.value.set(t,o)});return rn(()=>{n.value.delete(t)}),a}function ot(e){const t=window.getComputedStyle(e);if(t.overflowX==="scroll"||t.overflowY==="scroll"||t.overflowX==="auto"&&e.clientWidth<e.scrollWidth||t.overflowY==="auto"&&e.clientHeight<e.scrollHeight)return!0;{const n=e.parentNode;return!(n instanceof Element)||n.tagName==="BODY"?!1:ot(n)}}function hn(e){const t=e||window.event,n=t.target;return n instanceof Element&&ot(n)?!1:t.touches.length>1?!0:(t.preventDefault&&t.cancelable&&t.preventDefault(),!1)}function rt(e){const t=me({dir:w("ltr")});return C(()=>{var n;return(e==null?void 0:e.value)||((n=t.dir)==null?void 0:n.value)||"ltr"})}function ie(e){const t=K(),n=t==null?void 0:t.type.emits,a={};return n!=null&&n.length||console.warn(`No emitted event found. Please check component: ${t==null?void 0:t.type.__name}`),n==null||n.forEach(o=>{a[gt(Ye(o))]=(...r)=>e(o,...r)}),a}function O(){const e=K(),t=w(),n=C(()=>a());kt(()=>{n.value!==a()&&bt(t)});function a(){return t.value&&"$el"in t.value&&["#text","#comment"].includes(t.value.$el.nodeName)?t.value.$el.nextElementSibling:se(t)}const o=Object.assign({},e.exposed),r={};for(const i in e.props)Object.defineProperty(r,i,{enumerable:!0,configurable:!0,get:()=>e.props[i]});if(Object.keys(o).length>0)for(const i in o)Object.defineProperty(r,i,{enumerable:!0,configurable:!0,get:()=>o[i]});Object.defineProperty(r,"$el",{enumerable:!0,configurable:!0,get:()=>e.vnode.el}),e.exposed=r;function l(i){if(t.value=i,!!i&&(Object.defineProperty(r,"$el",{enumerable:!0,configurable:!0,get:()=>i instanceof Element?i:i.$el}),!(i instanceof Element)&&!Object.hasOwn(i,"$el"))){const u=i.$.exposed,c=Object.assign({},r);for(const p in u)Object.defineProperty(c,p,{enumerable:!0,configurable:!0,get:()=>u[p]});e.exposed=c}}return{forwardRef:l,currentRef:t,currentElement:n}}function mn(e){const t=K(),n=Object.keys((t==null?void 0:t.type.props)??{}).reduce((o,r)=>{const l=(t==null?void 0:t.type.props[r]).default;return l!==void 0&&(o[r]=l),o},{}),a=_t(e);return C(()=>{const o={},r=(t==null?void 0:t.vnode.props)??{};return Object.keys(r).forEach(l=>{o[Ye(l)]=r[l]}),Object.keys({...n,...o}).reduce((l,i)=>(a.value[i]!==void 0&&(l[i]=a.value[i]),l),{})})}function gn(e,t){const n=mn(e),a=t?ie(t):{};return C(()=>({...n.value,...a}))}var kn=function(e){if(typeof document>"u")return null;var t=Array.isArray(e)?e[0]:e;return t.ownerDocument.body},te=new WeakMap,pe=new WeakMap,fe={},be=0,st=function(e){return e&&(e.host||st(e.parentNode))},bn=function(e,t){return t.map(function(n){if(e.contains(n))return n;var a=st(n);return a&&e.contains(a)?a:(console.error("aria-hidden",n,"in not contained inside",e,". Doing nothing"),null)}).filter(function(n){return!!n})},_n=function(e,t,n,a){var o=bn(t,Array.isArray(e)?e:[e]);fe[n]||(fe[n]=new WeakMap);var r=fe[n],l=[],i=new Set,u=new Set(o),c=function(s){!s||i.has(s)||(i.add(s),c(s.parentNode))};o.forEach(c);var p=function(s){!s||u.has(s)||Array.prototype.forEach.call(s.children,function(d){if(i.has(d))p(d);else try{var f=d.getAttribute(a),g=f!==null&&f!=="false",k=(te.get(d)||0)+1,b=(r.get(d)||0)+1;te.set(d,k),r.set(d,b),l.push(d),k===1&&g&&pe.set(d,!0),b===1&&d.setAttribute(n,"true"),g||d.setAttribute(a,"true")}catch(m){console.error("aria-hidden: cannot operate on ",d,m)}})};return p(t),i.clear(),be++,function(){l.forEach(function(s){var d=te.get(s)-1,f=r.get(s)-1;te.set(s,d),r.set(s,f),d||(pe.has(s)||s.removeAttribute(a),pe.delete(s)),f||s.removeAttribute(n)}),be--,be||(te=new WeakMap,te=new WeakMap,pe=new WeakMap,fe={})}},wn=function(e,t,n){n===void 0&&(n="data-aria-hidden");var a=Array.from(Array.isArray(e)?e:[e]),o=kn(e);return o?(a.push.apply(a,Array.from(o.querySelectorAll("[aria-live], script"))),_n(a,o,n,"aria-hidden")):function(){return null}};function Mn(e){let t;q(()=>se(e),n=>{let a=!1;try{a=!!(n!=null&&n.closest("[popover]:not(:popover-open)"))}catch{}n&&!a?t=wn(n):t&&t()}),Oe(()=>{t&&t()})}function he(e,t="reka"){var o;let n;const a=me({useId:void 0});return a.useId?n=a.useId():n=(o=wt)==null?void 0:o(),t?`${t}-${n}`:n}function Cn(e,t){const n=w(e);function a(r){return t[n.value][r]??n.value}return{state:n,dispatch:r=>{n.value=a(r)}}}function In(e,t){var b;const n=w({}),a=w("none"),o=w(e),r=e.value?"mounted":"unmounted";let l;const i=((b=t.value)==null?void 0:b.ownerDocument.defaultView)??De,{state:u,dispatch:c}=Cn(r,{mounted:{UNMOUNT:"unmounted",ANIMATION_OUT:"unmountSuspended"},unmountSuspended:{MOUNT:"mounted",ANIMATION_END:"unmounted"},unmounted:{MOUNT:"mounted"}}),p=m=>{var h;if(U){const D=new CustomEvent(m,{bubbles:!1,cancelable:!1});(h=t.value)==null||h.dispatchEvent(D)}};q(e,async(m,h)=>{var S;const D=h!==m;if(await R(),D){const V=a.value,F=ye(t.value);m?(c("MOUNT"),p("enter"),F==="none"&&p("after-enter")):F==="none"||F==="undefined"||((S=n.value)==null?void 0:S.display)==="none"?(c("UNMOUNT"),p("leave"),p("after-leave")):h&&V!==F?(c("ANIMATION_OUT"),p("leave")):(c("UNMOUNT"),p("after-leave"))}},{immediate:!0});const s=m=>{if(m.target!==t.value)return;const h=ye(t.value),D=h.includes(CSS.escape(m.animationName)),S=u.value==="mounted"?"enter":"leave";if(D&&(p(`after-${S}`),c("ANIMATION_END"),!o.value)){const V=t.value.style.animationFillMode;t.value.style.animationFillMode="forwards",l=i==null?void 0:i.setTimeout(()=>{var F;((F=t.value)==null?void 0:F.style.animationFillMode)==="forwards"&&(t.value.style.animationFillMode=V)})}h==="none"&&c("ANIMATION_END")},d=m=>{m.target===t.value&&(a.value=ye(t.value))},f=q(t,(m,h)=>{m?(n.value=getComputedStyle(m),m.addEventListener("animationstart",d),m.addEventListener("animationcancel",s),m.addEventListener("animationend",s)):(c("ANIMATION_END"),l!==void 0&&(i==null||i.clearTimeout(l)),h==null||h.removeEventListener("animationstart",d),h==null||h.removeEventListener("animationcancel",s),h==null||h.removeEventListener("animationend",s))},{immediate:!0}),g=q(u,()=>{const m=ye(t.value);a.value=u.value==="mounted"?m:"none"});return Oe(()=>{f(),g(),t.value&&(t.value.removeEventListener("animationstart",d),t.value.removeEventListener("animationcancel",s),t.value.removeEventListener("animationend",s)),l!==void 0&&(i==null||i.clearTimeout(l))}),{isPresent:C(()=>["mounted","unmountSuspended"].includes(u.value))}}function ye(e){return e&&getComputedStyle(e).animationName||"none"}var Te=M({name:"Presence",props:{present:{type:Boolean,required:!0},forceMount:{type:Boolean}},slots:{},setup(e,{slots:t,expose:n}){var c;const{present:a,forceMount:o}=oe(e),r=w(),{isPresent:l}=In(a,r);n({present:l});let i=t.default({present:l.value});i=Pe(i||[]);const u=K();if(i&&(i==null?void 0:i.length)>1){const p=(c=u==null?void 0:u.parent)!=null&&c.type.name?`<${u.parent.type.name} />`:"component";throw new Error([`Detected an invalid children for \`${p}\` for  \`Presence\` component.`,"","Note: Presence works similarly to `v-if` directly, but it waits for animation/transition to finished before unmounting. So it expect only one direct child of valid VNode type.","You can apply a few solutions:",["Provide a single child element so that `presence` directive attach correctly.","Ensure the first child is an actual element instead of a raw text node or comment node."].map(s=>`  - ${s}`).join(`
`)].join(`
`))}return()=>o.value||a.value||l.value?H(t.default({present:l.value})[0],{ref:p=>{const s=se(p);return typeof(s==null?void 0:s.hasAttribute)>"u"||(s!=null&&s.hasAttribute("data-reka-popper-content-wrapper")?r.value=s.firstElementChild:r.value=s),s}}):null}});const Ee=M({name:"PrimitiveSlot",inheritAttrs:!1,setup(e,{attrs:t,slots:n}){return()=>{var u;if(!n.default)return null;const a=Pe(n.default()),o=a.findIndex(c=>c.type!==Mt);if(o===-1)return a;const r=a[o];(u=r.props)==null||delete u.ref;const l=r.props?L(t,r.props):t,i=Ct({...r,props:{}},l);return a.length===1?i:(a[o]=i,a)}}}),An=["area","img","input"],$=M({name:"Primitive",inheritAttrs:!1,props:{asChild:{type:Boolean,default:!1},as:{type:[String,Object],default:"div"}},setup(e,{attrs:t,slots:n}){const a=e.asChild?"template":e.as;return typeof a=="string"&&An.includes(a)?()=>H(a,t):a!=="template"?()=>H(e.as,t,{default:n.default}):()=>H(Ee,t,{default:n.default})}});function $e(){const e=w(),t=C(()=>{var n,a;return["#text","#comment"].includes((n=e.value)==null?void 0:n.$el.nodeName)?(a=e.value)==null?void 0:a.$el.nextElementSibling:se(e)});return{primitiveElement:e,currentElement:t}}const[W,En]=re("DialogRoot");var xn=M({inheritAttrs:!1,__name:"DialogRoot",props:{open:{type:Boolean,required:!1,default:void 0},defaultOpen:{type:Boolean,required:!1,default:!1},modal:{type:Boolean,required:!1,default:!0},unmountOnHide:{type:Boolean,required:!1,default:!0}},emits:["update:open"],setup(e,{emit:t}){const n=e,o=qe(n,"open",t,{defaultValue:n.defaultOpen,passive:n.open===void 0}),r=w(),l=w(),{modal:i,unmountOnHide:u}=oe(n);return En({open:o,modal:i,unmountOnHide:u,openModal:()=>{o.value=!0},onOpenChange:c=>{o.value=c},onOpenToggle:()=>{o.value=!o.value},contentId:"",titleId:"",descriptionId:"",triggerElement:r,contentElement:l}),(c,p)=>E(c.$slots,"default",{open:y(o),close:()=>o.value=!1})}}),On=xn,Sn=M({__name:"DialogClose",props:{asChild:{type:Boolean,required:!1},as:{type:null,required:!1,default:"button"}},setup(e){const t=e;O();const n=W();return(a,o)=>(I(),A(y($),L(t,{type:a.as==="button"?"button":void 0,onClick:o[0]||(o[0]=r=>y(n).onOpenChange(!1))}),{default:_(()=>[E(a.$slots,"default")]),_:3},16,["type"]))}}),it=Sn;const Dn="dismissableLayer.pointerDownOutside",qn="dismissableLayer.focusOutside";function lt(e,t){if(!(t instanceof Element))return!1;if(e.contains(t))return!0;const n=t.closest("[data-dismissable-layer]"),a=e.dataset.dismissableLayer===""?e:e.querySelector("[data-dismissable-layer]"),o=Array.from(e.ownerDocument.querySelectorAll("[data-dismissable-layer]"));return!!(n&&(a===n||o.indexOf(a)<o.indexOf(n)))}function Pn(e,t,n=!0){var l;const a=((l=t==null?void 0:t.value)==null?void 0:l.ownerDocument)??(globalThis==null?void 0:globalThis.document),o=w(!1),r=w(()=>{});return G(i=>{if(!U||!z(n))return;const u=async p=>{const s=p.target;if(!(!(t!=null&&t.value)||!s)){if(lt(t.value,s)){a.removeEventListener("click",r.value),o.value=!1;return}if(p.target&&!o.value){let f=function(){nt(Dn,e,d)};const d={originalEvent:p};p.pointerType==="touch"?(a.removeEventListener("click",r.value),r.value=f,a.addEventListener("click",r.value,{once:!0})):f()}else a.removeEventListener("click",r.value);o.value=!1}},c=window.setTimeout(()=>{a.addEventListener("pointerdown",u)},0);i(()=>{window.clearTimeout(c),a.removeEventListener("pointerdown",u),a.removeEventListener("click",r.value)})}),{onPointerDownCapture:()=>{z(n)&&(o.value=!0)}}}function Tn(e,t,n=!0){var r;const a=((r=t==null?void 0:t.value)==null?void 0:r.ownerDocument)??(globalThis==null?void 0:globalThis.document),o=w(!1);return G(l=>{if(!U||!z(n))return;const i=async u=>{if(!(t!=null&&t.value))return;await R(),await R();const c=u.target;!t.value||!c||lt(t.value,c)||u.target&&!o.value&&nt(qn,e,{originalEvent:u})};a.addEventListener("focusin",i),l(()=>a.removeEventListener("focusin",i))}),{onFocusCapture:()=>{z(n)&&(o.value=!0)},onBlurCapture:()=>{z(n)&&(o.value=!1)}}}var Fn=M({__name:"DismissableLayer",props:{disableOutsidePointerEvents:{type:Boolean,required:!1,default:!1},asChild:{type:Boolean,required:!1},as:{type:null,required:!1},present:{type:Boolean,required:!1,default:!0}},emits:["escapeKeyDown","pointerDownOutside","focusOutside","interactOutside","dismiss"],setup(e,{emit:t}){const n=e,a=t,{forwardRef:o,currentElement:r}=O(),l=C(()=>{var f;return((f=r.value)==null?void 0:f.ownerDocument)??globalThis.document}),i=C(()=>T.layersRoot),u=C(()=>r.value?Array.from(i.value).indexOf(r.value):-1),c=C(()=>T.layersWithOutsidePointerEventsDisabled.size>0),p=C(()=>{const f=Array.from(i.value),[g]=[...T.layersWithOutsidePointerEventsDisabled].slice(-1),k=f.indexOf(g);return u.value>=k}),s=Pn(async f=>{const g=[...T.branches].some(k=>k==null?void 0:k.contains(f.target));!n.present||!p.value||g||(a("pointerDownOutside",f),a("interactOutside",f),await R(),f.defaultPrevented||a("dismiss"))},r,()=>n.present),d=Tn(f=>{const g=[...T.branches].some(k=>k==null?void 0:k.contains(f.target));!n.present||g||(a("focusOutside",f),a("interactOutside",f),f.defaultPrevented||a("dismiss"))},r);return cn("Escape",f=>{!n.present||!(u.value===i.value.size-1)||(a("escapeKeyDown",f),f.defaultPrevented||a("dismiss"))}),q([r,()=>n.disableOutsidePointerEvents,()=>n.present],([f,g,k],b,m)=>{!f||!k||g&&(T.layersWithOutsidePointerEventsDisabled.size===0&&(T.originalBodyPointerEvents=l.value.body.style.pointerEvents,l.value.body.style.pointerEvents="none"),T.layersWithOutsidePointerEventsDisabled.add(f),m(()=>{T.layersWithOutsidePointerEventsDisabled.delete(f),T.layersWithOutsidePointerEventsDisabled.size===0&&!Jt(T.originalBodyPointerEvents)&&(l.value.body.style.pointerEvents=T.originalBodyPointerEvents)}))},{immediate:!0}),q([r,()=>n.present],([f,g],k,b)=>{!f||!g||(i.value.add(f),b(()=>{i.value.delete(f)}))},{immediate:!0}),G(f=>{f(()=>{r.value&&(i.value.delete(r.value),T.layersWithOutsidePointerEventsDisabled.delete(r.value))})}),(f,g)=>(I(),A(y($),{ref:y(o),"as-child":f.asChild,as:f.as,"data-dismissable-layer":"",style:Qe({pointerEvents:c.value?p.value?"auto":"none":void 0}),onFocusCapture:y(d).onFocusCapture,onBlurCapture:y(d).onBlurCapture,onPointerdownCapture:y(s).onPointerDownCapture},{default:_(()=>[E(f.$slots,"default")]),_:3},8,["as-child","as","style","onFocusCapture","onBlurCapture","onPointerdownCapture"]))}}),Ln=Fn;const Bn=Qt(()=>w([]));function Rn(){const e=Bn();return{add(t){const n=e.value[0];t!==n&&(n==null||n.pause()),e.value=je(e.value,t),e.value.unshift(t)},remove(t){var n;e.value=je(e.value,t),(n=e.value[0])==null||n.resume()}}}function je(e,t){const n=[...e],a=n.indexOf(t);return a!==-1&&n.splice(a,1),n}const _e="focusScope.autoFocusOnMount",we="focusScope.autoFocusOnUnmount",Ne={bubbles:!1,cancelable:!0};function $n(e,{select:t=!1}={}){const n=B();for(const a of e)if(Z(a,{select:t}),B()!==n)return!0}function jn(e){const t=ut(e),n=ze(t,e),a=ze(t.reverse(),e);return[n,a]}function ut(e){const t=[],n=document.createTreeWalker(e,NodeFilter.SHOW_ELEMENT,{acceptNode:a=>{const o=a.tagName==="INPUT"&&a.type==="hidden";return a.disabled||a.hidden||o?NodeFilter.FILTER_SKIP:a.tabIndex>=0?NodeFilter.FILTER_ACCEPT:NodeFilter.FILTER_SKIP}});for(;n.nextNode();)t.push(n.currentNode);return t}function ze(e,t){for(const n of e)if(!Nn(n,{upTo:t}))return n}function Nn(e,{upTo:t}){if(getComputedStyle(e).visibility==="hidden")return!0;for(;e;){if(t!==void 0&&e===t)return!1;if(getComputedStyle(e).display==="none")return!0;e=e.parentElement}return!1}function zn(e){return e instanceof HTMLInputElement&&"select"in e}function Z(e,{select:t=!1}={}){if(e&&e.focus){const n=B();e.focus({preventScroll:!0}),e!==n&&zn(e)&&t&&e.select()}}var Vn=M({__name:"FocusScope",props:{loop:{type:Boolean,required:!1,default:!1},trapped:{type:Boolean,required:!1,default:!1},present:{type:Boolean,required:!1,default:!0},asChild:{type:Boolean,required:!1},as:{type:null,required:!1}},emits:["mountAutoFocus","unmountAutoFocus"],setup(e,{emit:t}){const n=e,a=t,{currentRef:o,currentElement:r}=O(),l=w(null),i=Rn(),u=Je({paused:!1,pause(){this.paused=!0},resume(){this.paused=!1}});G(s=>{if(!U)return;const d=r.value;if(!n.trapped)return;function f(m){if(u.paused||!d)return;const h=m.target;d.contains(h)?l.value=h:Z(l.value,{select:!0})}function g(m){if(u.paused||!d)return;const h=m.relatedTarget;h!==null&&(d.contains(h)||Z(l.value,{select:!0}))}function k(m){const h=l.value;if(h===null||!m.some(F=>F.removedNodes.length>0))return;const S=B();if(S&&d.contains(S))return;d.contains(h)||Z(d)}document.addEventListener("focusin",f),document.addEventListener("focusout",g);const b=new MutationObserver(k);d&&b.observe(d,{childList:!0,subtree:!0}),s(()=>{document.removeEventListener("focusin",f),document.removeEventListener("focusout",g),b.disconnect()})});function c(s,d){const f=new CustomEvent(_e,Ne),g=k=>a("mountAutoFocus",k);s.addEventListener(_e,g),s.dispatchEvent(f),s.removeEventListener(_e,g),f.defaultPrevented||($n(ut(s),{select:!0}),B()===d&&Z(s))}G(async s=>{const d=r.value;if(await R(),!d)return;n.present!==!1&&i.add(u);const f=B();!d.contains(f)&&n.present!==!1&&c(d,f),s(()=>{const k=new CustomEvent(we,Ne),b=m=>{a("unmountAutoFocus",m)};d.addEventListener(we,b),d.dispatchEvent(k),d.setAttribute("data-focus-scope-unmounting",""),setTimeout(()=>{k.defaultPrevented||Z(f??document.body,{select:!0}),d.removeEventListener(we,b),i.remove(u),d.removeAttribute("data-focus-scope-unmounting")},0)})}),q(()=>n.present,async(s,d)=>{if(!U)return;if(s===!1&&d===!0){i.remove(u);return}if(s!==!0||d!==!1)return;i.add(u),await R();const f=r.value;if(!f)return;const g=B();f.contains(g)||c(f,g)});function p(s){if(!n.loop&&!n.trapped||u.paused)return;const d=s.key==="Tab"&&!s.altKey&&!s.ctrlKey&&!s.metaKey,f=B();if(d&&f){const g=s.currentTarget,[k,b]=jn(g);k&&b?!s.shiftKey&&f===b?(s.preventDefault(),n.loop&&Z(k,{select:!0})):s.shiftKey&&f===k&&(s.preventDefault(),n.loop&&Z(b,{select:!0})):f===g&&s.preventDefault()}}return(s,d)=>(I(),A(y($),{ref_key:"currentRef",ref:o,tabindex:"-1","as-child":s.asChild,as:s.as,onKeydown:p},{default:_(()=>[E(s.$slots,"default")]),_:3},8,["as-child","as"]))}}),Hn=Vn;function Un(e){return e?"open":"closed"}var Kn=M({__name:"DialogContentImpl",props:{forceMount:{type:Boolean,required:!1},trapFocus:{type:Boolean,required:!1},disableOutsidePointerEvents:{type:Boolean,required:!1},asChild:{type:Boolean,required:!1},as:{type:null,required:!1},present:{type:Boolean,required:!1}},emits:["escapeKeyDown","pointerDownOutside","focusOutside","interactOutside","openAutoFocus","closeAutoFocus"],setup(e,{emit:t}){const n=e,a=t,o=W(),{forwardRef:r,currentElement:l}=O();return o.titleId||(o.titleId=he(void 0,"reka-dialog-title")),o.descriptionId||(o.descriptionId=he(void 0,"reka-dialog-description")),J(()=>{o.contentElement=l,B()!==document.body&&(o.triggerElement.value=B())}),(i,u)=>(I(),A(y(Hn),{"as-child":"",loop:"",trapped:n.trapFocus,present:n.present,onMountAutoFocus:u[5]||(u[5]=c=>a("openAutoFocus",c)),onUnmountAutoFocus:u[6]||(u[6]=c=>a("closeAutoFocus",c))},{default:_(()=>[Y(y(Ln),L({id:y(o).contentId,ref:y(r),as:i.as,"as-child":i.asChild,present:n.present,"disable-outside-pointer-events":i.disableOutsidePointerEvents,role:"dialog","aria-describedby":y(o).descriptionId,"aria-labelledby":y(o).titleId,"data-state":y(Un)(y(o).open.value)},i.$attrs,{onDismiss:u[0]||(u[0]=c=>y(o).onOpenChange(!1)),onEscapeKeyDown:u[1]||(u[1]=c=>a("escapeKeyDown",c)),onFocusOutside:u[2]||(u[2]=c=>a("focusOutside",c)),onInteractOutside:u[3]||(u[3]=c=>a("interactOutside",c)),onPointerDownOutside:u[4]||(u[4]=c=>a("pointerDownOutside",c))}),{default:_(()=>[E(i.$slots,"default")]),_:3},16,["id","as","as-child","present","disable-outside-pointer-events","aria-describedby","aria-labelledby","data-state"])]),_:3},8,["trapped","present"]))}}),ct=Kn,Wn=M({__name:"DialogContentModal",props:{forceMount:{type:Boolean,required:!1},trapFocus:{type:Boolean,required:!1},disableOutsidePointerEvents:{type:Boolean,required:!1,default:!0},asChild:{type:Boolean,required:!1},as:{type:null,required:!1},present:{type:Boolean,required:!0}},emits:["escapeKeyDown","pointerDownOutside","focusOutside","interactOutside","openAutoFocus","closeAutoFocus"],setup(e,{emit:t}){const n=e,a=t,o=W(),r=ie(a),{forwardRef:l,currentElement:i}=O(),u=C(()=>n.present?i.value:void 0);Mn(u);const c=C(()=>{const{present:p,...s}=n;return s});return q(()=>n.present,(p,s)=>{var d;!p&&s&&((d=o.triggerElement.value)==null||d.focus())}),(p,s)=>(I(),A(ct,L({...c.value,...y(r)},{ref:y(l),present:p.present,"trap-focus":y(o).open.value,"disable-outside-pointer-events":n.disableOutsidePointerEvents,onCloseAutoFocus:s[0]||(s[0]=d=>{var f;d.defaultPrevented||(d.preventDefault(),(f=y(o).triggerElement.value)==null||f.focus())}),onPointerDownOutside:s[1]||(s[1]=d=>{const f=d.detail.originalEvent,g=f.button===0&&f.ctrlKey===!0;(f.button===2||g)&&d.preventDefault()}),onFocusOutside:s[2]||(s[2]=d=>{d.preventDefault()})}),{default:_(()=>[E(p.$slots,"default")]),_:3},16,["present","trap-focus","disable-outside-pointer-events"]))}}),Zn=Wn,Gn=M({__name:"DialogContentNonModal",props:{forceMount:{type:Boolean,required:!1},trapFocus:{type:Boolean,required:!1},disableOutsidePointerEvents:{type:Boolean,required:!1},asChild:{type:Boolean,required:!1},as:{type:null,required:!1},present:{type:Boolean,required:!0}},emits:["escapeKeyDown","pointerDownOutside","focusOutside","interactOutside","openAutoFocus","closeAutoFocus"],setup(e,{emit:t}){const n=e,o=ie(t);O();const r=W(),l=w(!1),i=w(!1),u=C(()=>{const{present:c,...p}=n;return p});return q(()=>n.present,(c,p)=>{var s;!c&&p&&(l.value||(s=r.triggerElement.value)==null||s.focus(),l.value=!1,i.value=!1)}),(c,p)=>(I(),A(ct,L({...u.value,...y(o)},{present:c.present,"trap-focus":!1,"disable-outside-pointer-events":!1,onCloseAutoFocus:p[0]||(p[0]=s=>{var d;s.defaultPrevented||(l.value||(d=y(r).triggerElement.value)==null||d.focus(),s.preventDefault()),l.value=!1,i.value=!1}),onInteractOutside:p[1]||(p[1]=s=>{var g;s.defaultPrevented||(l.value=!0,s.detail.originalEvent.type==="pointerdown"&&(i.value=!0));const d=s.target;((g=y(r).triggerElement.value)==null?void 0:g.contains(d))&&s.preventDefault(),s.detail.originalEvent.type==="focusin"&&i.value&&s.preventDefault()})}),{default:_(()=>[E(c.$slots,"default")]),_:3},16,["present"]))}}),Jn=Gn,Yn=M({__name:"DialogContent",props:{forceMount:{type:Boolean,required:!1},disableOutsidePointerEvents:{type:Boolean,required:!1,default:void 0},asChild:{type:Boolean,required:!1},as:{type:null,required:!1}},emits:["escapeKeyDown","pointerDownOutside","focusOutside","interactOutside","openAutoFocus","closeAutoFocus"],setup(e,{emit:t}){const n=e,a=t,o=W(),r=ie(a),{forwardRef:l}=O(),i=C(()=>n.forceMount||!o.unmountOnHide.value);return(u,c)=>(I(),A(y(Te),{present:y(o).open.value,"force-mount":i.value},{default:_(({present:p})=>[y(o).modal.value?Me((I(),A(Zn,L({key:0,ref:y(l),present:i.value?p:!0},{...n,...y(r),...u.$attrs}),{default:_(()=>[E(u.$slots,"default")]),_:2},1040,["present"])),[[Ce,u.forceMount||y(o).unmountOnHide.value||p]]):Me((I(),A(Jn,L({key:1,ref:y(l),present:i.value?p:!0},{...n,...y(r),...u.$attrs}),{default:_(()=>[E(u.$slots,"default")]),_:2},1040,["present"])),[[Ce,u.forceMount||y(o).unmountOnHide.value||p]])]),_:3},8,["present","force-mount"]))}}),Qn=Yn,Xn=M({__name:"DialogDescription",props:{asChild:{type:Boolean,required:!1},as:{type:null,required:!1,default:"p"}},setup(e){const t=e;O();const n=W();return(a,o)=>(I(),A(y($),L(t,{id:y(n).descriptionId}),{default:_(()=>[E(a.$slots,"default")]),_:3},16,["id"]))}}),ea=Xn,ta=M({__name:"DialogOverlayImpl",props:{asChild:{type:Boolean,required:!1},as:{type:null,required:!1},present:{type:Boolean,required:!1,default:!0}},setup(e){const t=e,n=W(),a=vn(t.present);return q(()=>t.present,o=>a.value=o),O(),(o,r)=>(I(),A(y($),{as:o.as,"as-child":o.asChild,"data-state":y(n).open.value?"open":"closed",style:{"pointer-events":"auto"},onPointerdown:r[0]||(r[0]=ve(()=>{},["left","self","prevent"]))},{default:_(()=>[E(o.$slots,"default")]),_:3},8,["as","as-child","data-state"]))}}),na=ta,aa=M({__name:"DialogOverlay",props:{forceMount:{type:Boolean,required:!1},asChild:{type:Boolean,required:!1},as:{type:null,required:!1}},setup(e){const t=e,n=W(),{forwardRef:a}=O(),o=C(()=>t.forceMount||!n.unmountOnHide.value);return(r,l)=>{var i;return(i=y(n))!=null&&i.modal.value?(I(),A(y(Te),{key:0,present:y(n).open.value,"force-mount":o.value},{default:_(({present:u})=>[Me(Y(na,L(r.$attrs,{ref:y(a),as:r.as,"as-child":r.asChild,present:o.value?u:!0}),{default:_(()=>[E(r.$slots,"default")]),_:2},1040,["as","as-child","present"]),[[Ce,r.forceMount||y(n).unmountOnHide.value||u]])]),_:3},8,["present","force-mount"])):Se("v-if",!0)}}}),oa=aa,ra=M({__name:"Teleport",props:{to:{type:null,required:!1},disabled:{type:Boolean,required:!1},defer:{type:Boolean,required:!1},forceMount:{type:Boolean,required:!1}},setup(e){const t=e,n=me({}),a=C(()=>{var r;return t.to??((r=n.teleportTo)==null?void 0:r.value)??"body"}),o=ln();return(r,l)=>y(o)||r.forceMount?(I(),A(It,{key:0,to:a.value,disabled:r.disabled,defer:r.defer},[E(r.$slots,"default")],8,["to","disabled","defer"])):Se("v-if",!0)}}),dt=ra,sa=M({__name:"DialogPortal",props:{to:{type:null,required:!1},disabled:{type:Boolean,required:!1},defer:{type:Boolean,required:!1},forceMount:{type:Boolean,required:!1}},setup(e){const t=e;return(n,a)=>(I(),A(y(dt),Q(X(t)),{default:_(()=>[E(n.$slots,"default")]),_:3},16))}}),Ar=sa,ia=M({__name:"DialogTitle",props:{asChild:{type:Boolean,required:!1},as:{type:null,required:!1,default:"h2"}},setup(e){const t=e,n=W();return O(),(a,o)=>(I(),A(y($),L(t,{id:y(n).titleId}),{default:_(()=>[E(a.$slots,"default")]),_:3},16,["id"]))}}),la=ia,ua=M({__name:"AlertDialogAction",props:{asChild:{type:Boolean,required:!1},as:{type:null,required:!1,default:"button"}},setup(e){const t=e;return O(),(n,a)=>(I(),A(y(it),Q(X(t)),{default:_(()=>[E(n.$slots,"default")]),_:3},16))}}),Er=ua;const[ca,da]=re("AlertDialogContent");var pa=M({__name:"AlertDialogContent",props:{forceMount:{type:Boolean,required:!1},disableOutsidePointerEvents:{type:Boolean,required:!1,default:void 0},asChild:{type:Boolean,required:!1},as:{type:null,required:!1}},emits:["escapeKeyDown","pointerDownOutside","focusOutside","interactOutside","openAutoFocus","closeAutoFocus"],setup(e,{emit:t}){const n=e,o=ie(t);O();const r=w();return da({onCancelElementChange:l=>{r.value=l}}),(l,i)=>(I(),A(y(Qn),L({...n,...y(o)},{role:"alertdialog",onPointerDownOutside:i[0]||(i[0]=ve(()=>{},["prevent"])),onInteractOutside:i[1]||(i[1]=ve(()=>{},["prevent"])),onOpenAutoFocus:i[2]||(i[2]=()=>{R(()=>{var u;(u=r.value)==null||u.focus({preventScroll:!0})})})}),{default:_(()=>[E(l.$slots,"default")]),_:3},16))}}),xr=pa,fa=M({__name:"AlertDialogCancel",props:{asChild:{type:Boolean,required:!1},as:{type:null,required:!1,default:"button"}},setup(e){const t=e,n=ca(),{forwardRef:a,currentElement:o}=O();return J(()=>{n.onCancelElementChange(o.value)}),(r,l)=>(I(),A(y(it),L(t,{ref:y(a)}),{default:_(()=>[E(r.$slots,"default")]),_:3},16))}}),Or=fa,ya=M({__name:"AlertDialogDescription",props:{asChild:{type:Boolean,required:!1},as:{type:null,required:!1,default:"p"}},setup(e){const t=e;return O(),(n,a)=>(I(),A(y(ea),Q(X(t)),{default:_(()=>[E(n.$slots,"default")]),_:3},16))}}),Sr=ya,va=M({__name:"AlertDialogOverlay",props:{forceMount:{type:Boolean,required:!1},asChild:{type:Boolean,required:!1},as:{type:null,required:!1}},setup(e){const t=e;return O(),(n,a)=>(I(),A(y(oa),Q(X(t)),{default:_(()=>[E(n.$slots,"default")]),_:3},16))}}),Dr=va,ha=M({__name:"AlertDialogPortal",props:{to:{type:null,required:!1},disabled:{type:Boolean,required:!1},defer:{type:Boolean,required:!1},forceMount:{type:Boolean,required:!1}},setup(e){const t=e;return(n,a)=>(I(),A(y(dt),Q(X(t)),{default:_(()=>[E(n.$slots,"default")]),_:3},16))}}),qr=ha,ma=M({__name:"AlertDialogRoot",props:{open:{type:Boolean,required:!1},defaultOpen:{type:Boolean,required:!1},unmountOnHide:{type:Boolean,required:!1}},emits:["update:open"],setup(e,{emit:t}){const o=gn(e,t);return O(),(r,l)=>(I(),A(y(On),L(y(o),{modal:!0}),{default:_(i=>[E(r.$slots,"default",Q(X(i)))]),_:3},16))}}),Pr=ma,ga=M({__name:"AlertDialogTitle",props:{asChild:{type:Boolean,required:!1},as:{type:null,required:!1,default:"h2"}},setup(e){const t=e;return O(),(n,a)=>(I(),A(y(la),Q(X(t)),{default:_(()=>[E(n.$slots,"default")]),_:3},16))}}),Tr=ga;const Ve="data-reka-collection-item";function pt(e={}){const{key:t="",isProvider:n=!1}=e,a=`${t}CollectionProvider`;let o;if(n){const s=w(new Map);o={collectionRef:w(),itemMap:s},We(a,o)}else o=Ke(a);const r=(s,d=!1)=>{if(!o.collectionRef.value)return;const f=o.itemMap.value.get(s);return f&&(d||f.ref.dataset.disabled!=="")?f:void 0},l=(s=!1)=>{const d=o.collectionRef.value;if(!d)return[];const f=Array.from(d.querySelectorAll(`[${Ve}]`)),g=new Map(f.map((m,h)=>[m,h])),b=Array.from(o.itemMap.value.values()).sort((m,h)=>(g.get(m.ref)??-1)-(g.get(h.ref)??-1));return s?b:b.filter(m=>m.ref.dataset.disabled!=="")},i=M({name:"CollectionSlot",inheritAttrs:!1,setup(s,{slots:d,attrs:f}){const{primitiveElement:g,currentElement:k}=$e();return q(k,()=>{o.collectionRef.value=k.value}),()=>H(Ee,{ref:g,...f},d)}}),u=M({name:"CollectionItem",inheritAttrs:!1,props:{value:{validator:()=>!0}},setup(s,{slots:d,attrs:f}){const{primitiveElement:g,currentElement:k}=$e();return G(b=>{if(k.value){const m=At(k.value);o.itemMap.value.set(m,{ref:k.value,value:s.value}),b(()=>o.itemMap.value.delete(m))}}),()=>H(Ee,{...f,[Ve]:"",ref:g},d)}}),c=C(()=>Array.from(o.itemMap.value.values())),p=C(()=>o.itemMap.value.size);return{getItems:l,getItem:r,reactiveItems:c,itemMapSize:p,CollectionSlot:i,CollectionItem:u}}const ka="rovingFocusGroup.onEntryFocus",ba={bubbles:!1,cancelable:!0},_a={ArrowLeft:"prev",ArrowUp:"prev",ArrowRight:"next",ArrowDown:"next",PageUp:"first",Home:"first",PageDown:"last",End:"last"};function wa(e,t){return t!=="rtl"?e:e==="ArrowLeft"?"ArrowRight":e==="ArrowRight"?"ArrowLeft":e}function Ma(e,t,n){const a=wa(e.key,n);if(!(t==="vertical"&&["ArrowLeft","ArrowRight"].includes(a))&&!(t==="horizontal"&&["ArrowUp","ArrowDown"].includes(a)))return _a[a]}function ft(e,t=!1){const n=B();for(const a of e)if(a===n||(a.focus({preventScroll:t}),B()!==n))return}function Ca(e,t){return e.map((n,a)=>e[(t+a)%e.length])}const[Ia,Aa]=re("RovingFocusGroup");var Ea=M({__name:"RovingFocusGroup",props:{orientation:{type:String,required:!1,default:void 0},dir:{type:String,required:!1},loop:{type:Boolean,required:!1,default:!1},currentTabStopId:{type:[String,null],required:!1},defaultCurrentTabStopId:{type:String,required:!1},preventScrollOnEntryFocus:{type:Boolean,required:!1,default:!1},asChild:{type:Boolean,required:!1},as:{type:null,required:!1}},emits:["entryFocus","update:currentTabStopId"],setup(e,{expose:t,emit:n}){const a=e,o=n,{loop:r,orientation:l,dir:i}=oe(a),u=rt(i),c=qe(a,"currentTabStopId",o,{defaultValue:a.defaultCurrentTabStopId,passive:a.currentTabStopId===void 0}),p=w(!1),s=w(!1),d=w(0),{getItems:f,CollectionSlot:g}=pt({isProvider:!0});function k(m){const h=!s.value;if(m.currentTarget&&m.target===m.currentTarget&&h&&!p.value){const D=new CustomEvent(ka,ba);if(m.currentTarget.dispatchEvent(D),o("entryFocus",D),!D.defaultPrevented){const S=f().map(j=>j.ref).filter(j=>j.dataset.disabled!==""),V=S.find(j=>j.getAttribute("data-active")===""),F=S.find(j=>j.getAttribute("data-highlighted")===""),le=S.find(j=>j.id===c.value),ee=[V,F,le,...S].filter(Boolean);ft(ee,a.preventScrollOnEntryFocus)}}s.value=!1}function b(){setTimeout(()=>{s.value=!1},1)}return t({getItems:f}),Aa({loop:r,dir:u,orientation:l,currentTabStopId:c,onItemFocus:m=>{c.value=m},onItemShiftTab:()=>{p.value=!0},onFocusableItemAdd:()=>{d.value++},onFocusableItemRemove:()=>{d.value--}}),(m,h)=>(I(),A(y(g),null,{default:_(()=>[Y(y($),{tabindex:p.value||d.value===0?-1:0,"data-orientation":y(l),as:m.as,"as-child":m.asChild,dir:y(u),style:{outline:"none"},onMousedown:h[0]||(h[0]=D=>s.value=!0),onMouseup:b,onFocus:k,onBlur:h[1]||(h[1]=D=>p.value=!1)},{default:_(()=>[E(m.$slots,"default")]),_:3},8,["tabindex","data-orientation","as","as-child","dir"])]),_:3}))}}),xa=Ea,Oa=M({__name:"RovingFocusItem",props:{tabStopId:{type:String,required:!1},focusable:{type:Boolean,required:!1,default:!0},active:{type:Boolean,required:!1},allowShiftKey:{type:Boolean,required:!1},asChild:{type:Boolean,required:!1},as:{type:null,required:!1,default:"span"}},setup(e){const t=e,n=Ia(),a=he(),o=C(()=>t.tabStopId||a),r=C(()=>n.currentTabStopId.value===o.value),{getItems:l,CollectionItem:i}=pt();J(()=>{t.focusable&&n.onFocusableItemAdd()}),Oe(()=>{t.focusable&&n.onFocusableItemRemove()}),q(()=>t.focusable,(c,p)=>{c!==p&&(c?n.onFocusableItemAdd():n.onFocusableItemRemove())});function u(c){if(c.key==="Tab"&&c.shiftKey){n.onItemShiftTab();return}if(c.target!==c.currentTarget)return;const p=Ma(c,n.orientation.value,n.dir.value);if(p!==void 0){if(c.metaKey||c.ctrlKey||c.altKey||!t.allowShiftKey&&c.shiftKey)return;c.preventDefault();let s=[...l().map(d=>d.ref).filter(d=>d.dataset.disabled!=="")];if(p==="last")s.reverse();else if(p==="prev"||p==="next"){p==="prev"&&s.reverse();const d=s.indexOf(c.currentTarget);s=n.loop.value?Ca(s,d+1):s.slice(d+1)}R(()=>ft(s))}}return(c,p)=>(I(),A(y(i),null,{default:_(()=>[Y(y($),{tabindex:r.value?0:-1,"data-orientation":y(n).orientation.value,"data-active":c.active?"":void 0,"data-disabled":c.focusable?void 0:"",as:c.as,"as-child":c.asChild,onMousedown:p[0]||(p[0]=s=>{c.focusable?y(n).onItemFocus(o.value):s.preventDefault()}),onFocus:p[1]||(p[1]=s=>y(n).onItemFocus(o.value)),onKeydown:u},{default:_(()=>[E(c.$slots,"default")]),_:3},8,["tabindex","data-orientation","data-active","data-disabled","as","as-child"])]),_:3}))}}),Sa=Oa;const[Fe,Da]=re("TabsRoot");var qa=M({__name:"TabsRoot",props:{defaultValue:{type:null,required:!1},orientation:{type:String,required:!1,default:"horizontal"},dir:{type:String,required:!1},activationMode:{type:String,required:!1,default:"automatic"},modelValue:{type:null,required:!1},unmountOnHide:{type:Boolean,required:!1,default:!0},asChild:{type:Boolean,required:!1},as:{type:null,required:!1}},emits:["update:modelValue"],setup(e,{emit:t}){const n=e,a=t,{orientation:o,unmountOnHide:r,dir:l}=oe(n),i=rt(l);O();const u=qe(n,"modelValue",a,{defaultValue:n.defaultValue,passive:n.modelValue===void 0}),c=w(),p=xe(new Set);return Da({modelValue:u,changeModelValue:s=>{u.value=s},orientation:o,dir:i,unmountOnHide:r,activationMode:n.activationMode,baseId:he(void 0,"reka-tabs"),tabsList:c,contentIds:p,registerContent:s=>{p.value=new Set([...p.value,s])},unregisterContent:s=>{const d=new Set(p.value);d.delete(s),p.value=d}}),(s,d)=>(I(),A(y($),{dir:y(i),"data-orientation":y(o),"as-child":s.asChild,as:s.as},{default:_(()=>[E(s.$slots,"default",{modelValue:y(u)})]),_:3},8,["dir","data-orientation","as-child","as"]))}}),Fr=qa;function yt(e,t){return`${e}-trigger-${t}`}function vt(e,t){return`${e}-content-${t}`}var Pa=M({__name:"TabsContent",props:{value:{type:[String,Number],required:!0},forceMount:{type:Boolean,required:!1},asChild:{type:Boolean,required:!1},as:{type:null,required:!1}},setup(e){const t=e,{forwardRef:n}=O(),a=Fe(),o=C(()=>yt(a.baseId,t.value)),r=C(()=>vt(a.baseId,t.value)),l=C(()=>t.value===a.modelValue.value),i=w(l.value);return J(()=>{a.registerContent(t.value),requestAnimationFrame(()=>{i.value=!1})}),Ze(()=>{a.unregisterContent(t.value)}),(u,c)=>(I(),A(y(Te),{present:u.forceMount||l.value,"force-mount":""},{default:_(({present:p})=>[Y(y($),{id:r.value,ref:y(n),"as-child":u.asChild,as:u.as,role:"tabpanel","data-state":l.value?"active":"inactive","data-orientation":y(a).orientation.value,"aria-labelledby":o.value,hidden:!p,tabindex:"0",style:Qe({animationDuration:i.value?"0s":void 0})},{default:_(()=>[!y(a).unmountOnHide.value||p?E(u.$slots,"default",{key:0}):Se("v-if",!0)]),_:2},1032,["id","as-child","as","data-state","data-orientation","aria-labelledby","hidden","style"])]),_:3},8,["present"]))}}),Lr=Pa,Ta=M({__name:"TabsList",props:{loop:{type:Boolean,required:!1,default:!0},asChild:{type:Boolean,required:!1},as:{type:null,required:!1}},setup(e){const t=e,{loop:n}=oe(t),{forwardRef:a,currentElement:o}=O(),r=Fe();return r.tabsList=o,(l,i)=>(I(),A(y(xa),{"as-child":"",orientation:y(r).orientation.value,dir:y(r).dir.value,loop:y(n)},{default:_(()=>[Y(y($),{ref:y(a),role:"tablist","as-child":l.asChild,as:l.as,"aria-orientation":y(r).orientation.value},{default:_(()=>[E(l.$slots,"default")]),_:3},8,["as-child","as","aria-orientation"])]),_:3},8,["orientation","dir","loop"]))}}),Br=Ta,Fa=M({__name:"TabsTrigger",props:{value:{type:[String,Number],required:!0},disabled:{type:Boolean,required:!1,default:!1},asChild:{type:Boolean,required:!1},as:{type:null,required:!1,default:"button"}},setup(e){const t=e,{forwardRef:n}=O(),a=Fe(),o=C(()=>yt(a.baseId,t.value)),r=C(()=>a.contentIds.value.has(t.value)?vt(a.baseId,t.value):void 0),l=C(()=>t.value===a.modelValue.value);return(i,u)=>(I(),A(y(Sa),{"as-child":"",focusable:!i.disabled,active:l.value},{default:_(()=>[Y(y($),{id:o.value,ref:y(n),role:"tab",type:i.as==="button"?"button":void 0,as:i.as,"as-child":i.asChild,"aria-selected":l.value?"true":"false","aria-controls":r.value,"data-state":l.value?"active":"inactive",disabled:i.disabled,"data-disabled":i.disabled?"":void 0,"data-orientation":y(a).orientation.value,onMousedown:u[0]||(u[0]=ve(c=>{!i.disabled&&c.ctrlKey===!1?y(a).changeModelValue(i.value):c.preventDefault()},["left"])),onKeydown:u[1]||(u[1]=Et(c=>y(a).changeModelValue(i.value),["enter","space"])),onFocus:u[2]||(u[2]=()=>{const c=y(a).activationMode!=="manual";!l.value&&!i.disabled&&c&&y(a).changeModelValue(i.value)})},{default:_(()=>[E(i.$slots,"default")]),_:3},8,["id","type","as","as-child","aria-selected","aria-controls","data-state","disabled","data-disabled","data-orientation"])]),_:3},8,["focusable","active"]))}}),Rr=Fa;export{tr as $,qr as A,Ga as B,uo as C,or as D,ko as E,wo as F,Ho as G,Io as H,Qo as I,Za as J,Eo as K,Po as L,Bo as M,lr as N,Ha as O,Ko as P,hr as Q,Jo as R,cr as S,vr as T,br as U,Lo as V,wr as W,Cr as X,yo as Y,go as Z,ur as _,Ra as a,$o as a0,fo as a1,To as a2,Wa as a3,No as a4,Xa as a5,oo as a6,Vo as a7,Ro as a8,Ar as a9,Rr as aA,Lr as aB,xo as aC,Fr as aD,Uo as aE,er as aF,za as aG,so as aH,eo as aI,Go as aJ,ho as aK,Mo as aL,Mr as aM,gr as aN,Xo as aO,io as aP,ro as aQ,jo as aR,Co as aS,mo as aT,vo as aU,Qa as aV,Ao as aW,ar as aX,mr as aY,oa as aa,Qn as ab,la as ac,ea as ad,it as ae,On as af,Zo as ag,Yo as ah,Ir as ai,_o as aj,Ba as ak,no as al,dr as am,zo as an,to as ao,So as ap,po as aq,Wo as ar,yr as as,pr as at,ja as au,ir as av,Ka as aw,Na as ax,Ua as ay,Br as az,Oo as b,sr as c,Fo as d,Ja as e,_r as f,Ya as g,Dr as h,xr as i,Tr as j,Sr as k,Or as l,Er as m,Pr as n,co as o,fr as p,kr as q,Do as r,bo as s,lo as t,$a as u,qo as v,rr as w,ao as x,Va as y,nr as z};
