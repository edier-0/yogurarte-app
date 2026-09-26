import{r as M,w as q,u as v,o as ee,n as B,g as He,a as Ue,b as vt,c as K,d as G,s as xe,e as _,h as H,i as Ke,p as We,f as Ze,j as Ge,t as N,F as ht,k as Je,l as mt,m as Ye,q as gt,v as kt,x as bt,y as Oe,z as Mt,A as C,B as oe,C as wt,D as R,E as _t,G as x,H as A,I as E,J as w,K as Qe,L as J,M as _e,N as Ce,O as ve,P as Se,T as Ct,Q as te,R as ne,S as It,U as At}from"./vue-vendor-BuE91BgS.js";function Xe(e){return He()?(Ue(e),!0):!1}function X(e){return typeof e=="function"?e():v(e)}const Et=typeof window<"u"&&typeof document<"u";typeof WorkerGlobalScope<"u"&&globalThis instanceof WorkerGlobalScope;const xt=Object.prototype.toString,Ot=e=>xt.call(e)==="[object Object]",Ie=()=>{};function et(e,t){function n(...a){return new Promise((o,r)=>{Promise.resolve(e(()=>t.apply(this,a),{fn:t,thisArg:this,args:a})).then(o).catch(r)})}return n}const tt=e=>e();function St(e,t={}){let n,a,o=Ie;const r=i=>{clearTimeout(i),o(),o=Ie};return i=>{const u=X(e),c=X(t.maxWait);return n&&r(n),u<=0||c!==void 0&&c<=0?(a&&(r(a),a=null),Promise.resolve(i())):new Promise((p,s)=>{o=t.rejectOnCancel?s:p,c&&!a&&(a=setTimeout(()=>{n&&r(n),a=null,p(i())},c)),n=setTimeout(()=>{a&&r(a),a=null,p(i())},u)})}}function Dt(e=tt){const t=M(!0);function n(){t.value=!1}function a(){t.value=!0}const o=(...r)=>{t.value&&e(...r)};return{isActive:vt(t),pause:n,resume:a,eventFilter:o}}function qt(e){return K()}function Pt(e,t=200,n={}){return et(St(t,n),e)}function Pa(e,t=200,n={}){const a=M(e.value),o=Pt(()=>{a.value=e.value},t,n);return q(e,()=>o()),a}function Tt(e,t,n={}){const{eventFilter:a=tt,...o}=n;return q(e,et(a,t),o)}function Lt(e,t,n={}){const{eventFilter:a,...o}=n,{eventFilter:r,pause:l,resume:i,isActive:u}=Dt(a);return{stop:Tt(e,t,{...o,eventFilter:r}),pause:l,resume:i,isActive:u}}function Ft(e,t=!0,n){qt()?ee(e,n):t?e():B(e)}const ae=Et?window:void 0;function Bt(e){var t;const n=X(e);return(t=n==null?void 0:n.$el)!=null?t:n}function Fe(...e){let t,n,a,o;if(typeof e[0]=="string"||Array.isArray(e[0])?([n,a,o]=e,t=ae):[t,n,a,o]=e,!t)return Ie;Array.isArray(n)||(n=[n]),Array.isArray(a)||(a=[a]);const r=[],l=()=>{r.forEach(p=>p()),r.length=0},i=(p,s,d,y)=>(p.addEventListener(s,d,y),()=>p.removeEventListener(s,d,y)),u=q(()=>[Bt(t),X(o)],([p,s])=>{if(l(),!p)return;const d=Ot(s)?{...s}:s;r.push(...n.flatMap(y=>a.map(g=>i(p,y,g,d))))},{immediate:!0,flush:"post"}),c=()=>{u(),l()};return Xe(c),c}function Rt(){const e=M(!1),t=K();return t&&ee(()=>{e.value=!0},t),e}function $t(e){const t=Rt();return _(()=>(t.value,!!e()))}function jt(e,t={}){const{window:n=ae}=t,a=$t(()=>n&&"matchMedia"in n&&typeof n.matchMedia=="function");let o;const r=M(!1),l=c=>{r.value=c.matches},i=()=>{o&&("removeEventListener"in o?o.removeEventListener("change",l):o.removeListener(l))},u=G(()=>{a.value&&(i(),o=n.matchMedia(X(e)),"addEventListener"in o?o.addEventListener("change",l):o.addListener(l),r.value=o.matches)});return Xe(()=>{u(),i(),o=void 0}),r}const ue=typeof globalThis<"u"?globalThis:typeof window<"u"?window:typeof global<"u"?global:typeof self<"u"?self:{},ce="__vueuse_ssr_handlers__",zt=Nt();function Nt(){return ce in ue||(ue[ce]=ue[ce]||{}),ue[ce]}function Vt(e,t){return zt[e]||t}function Ta(e){return jt("(prefers-color-scheme: dark)",e)}function Ht(e){return e==null?"any":e instanceof Set?"set":e instanceof Map?"map":e instanceof Date?"date":typeof e=="boolean"?"boolean":typeof e=="string"?"string":typeof e=="object"?"object":Number.isNaN(e)?"any":"number"}const Ut={boolean:{read:e=>e==="true",write:e=>String(e)},object:{read:e=>JSON.parse(e),write:e=>JSON.stringify(e)},number:{read:e=>Number.parseFloat(e),write:e=>String(e)},any:{read:e=>e,write:e=>String(e)},string:{read:e=>e,write:e=>String(e)},map:{read:e=>new Map(JSON.parse(e)),write:e=>JSON.stringify(Array.from(e.entries()))},set:{read:e=>new Set(JSON.parse(e)),write:e=>JSON.stringify(Array.from(e))},date:{read:e=>new Date(e),write:e=>e.toISOString()}},Be="vueuse-storage";function Kt(e,t,n,a={}){var o;const{flush:r="pre",deep:l=!0,listenToStorageChanges:i=!0,writeDefaults:u=!0,mergeDefaults:c=!1,shallow:p,window:s=ae,eventFilter:d,onError:y=I=>{console.error(I)},initOnMounted:g}=a,k=(p?xe:M)(t);if(!n)try{n=Vt("getDefaultStorage",()=>{var I;return(I=ae)==null?void 0:I.localStorage})()}catch(I){y(I)}if(!n)return k;const b=X(t),m=Ht(b),h=(o=a.serializer)!=null?o:Ut[m],{pause:D,resume:O}=Lt(k,()=>L(k.value),{flush:r,deep:l,eventFilter:d});s&&i&&Ft(()=>{n instanceof Storage?Fe(s,"storage",Y):Fe(s,Be,j),g&&Y()}),g||Y();function V(I,P){if(s){const z={key:e,oldValue:I,newValue:P,storageArea:n};s.dispatchEvent(n instanceof Storage?new StorageEvent("storage",z):new CustomEvent(Be,{detail:z}))}}function L(I){try{const P=n.getItem(e);if(I==null)V(P,null),n.removeItem(e);else{const z=h.write(I);P!==z&&(n.setItem(e,z),V(P,z))}}catch(P){y(P)}}function le(I){const P=I?I.newValue:n.getItem(e);if(P==null)return u&&b!=null&&n.setItem(e,h.write(b)),b;if(!I&&c){const z=h.read(P);return typeof c=="function"?c(z,b):m==="object"&&!Array.isArray(z)?{...b,...z}:z}else return typeof P!="string"?P:h.read(P)}function Y(I){if(!(I&&I.storageArea!==n)){if(I&&I.key==null){k.value=b;return}if(!(I&&I.key!==e)){D();try{(I==null?void 0:I.newValue)!==h.write(k.value)&&(k.value=le(I))}catch(P){y(P)}finally{I?B(O):O()}}}}function j(I){Y(I.detail)}return k}function La(e,t,n={}){const{window:a=ae}=n;return Kt(e,t,a==null?void 0:a.localStorage,n)}/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Wt=e=>e.replace(/([a-z0-9])([A-Z])/g,"$1-$2").toLowerCase();/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */var de={xmlns:"http://www.w3.org/2000/svg",width:24,height:24,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor","stroke-width":2,"stroke-linecap":"round","stroke-linejoin":"round"};/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Zt=({size:e,strokeWidth:t=2,absoluteStrokeWidth:n,color:a,iconNode:o,name:r,class:l,...i},{slots:u})=>H("svg",{...de,width:e||de.width,height:e||de.height,stroke:a||de.stroke,"stroke-width":n?Number(t)*24/Number(e):t,class:["lucide",`lucide-${Wt(r??"icon")}`],...i},[...o.map(c=>H(...c)),...u.default?[u.default()]:[]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const f=(e,t)=>(n,{slots:a})=>H(Zt,{...n,iconNode:t,name:e},a);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Fa=f("ArchiveIcon",[["rect",{width:"20",height:"5",x:"2",y:"3",rx:"1",key:"1wp1u1"}],["path",{d:"M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8",key:"1s80jp"}],["path",{d:"M10 12h4",key:"a56b0p"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ba=f("ArrowDownLeftIcon",[["path",{d:"M17 7 7 17",key:"15tmo1"}],["path",{d:"M17 17H7V7",key:"1org7z"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ra=f("ArrowLeftRightIcon",[["path",{d:"M8 3 4 7l4 4",key:"9rb6wj"}],["path",{d:"M4 7h16",key:"6tx8e3"}],["path",{d:"m16 21 4-4-4-4",key:"siv7j2"}],["path",{d:"M20 17H4",key:"h6l3hr"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const $a=f("ArrowLeftIcon",[["path",{d:"m12 19-7-7 7-7",key:"1l729n"}],["path",{d:"M19 12H5",key:"x3x0zl"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ja=f("ArrowRightIcon",[["path",{d:"M5 12h14",key:"1ays0h"}],["path",{d:"m12 5 7 7-7 7",key:"xquz4c"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const za=f("ArrowUpDownIcon",[["path",{d:"m21 16-4 4-4-4",key:"f6ql7i"}],["path",{d:"M17 20V4",key:"1ejh1v"}],["path",{d:"m3 8 4-4 4 4",key:"11wl7u"}],["path",{d:"M7 4v16",key:"1glfcx"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Na=f("ArrowUpRightIcon",[["path",{d:"M7 7h10v10",key:"1tivn9"}],["path",{d:"M7 17 17 7",key:"1vkiza"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Va=f("BadgeDollarSignIcon",[["path",{d:"M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z",key:"3c2336"}],["path",{d:"M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8",key:"1h4pet"}],["path",{d:"M12 18V6",key:"zqpxq5"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ha=f("BanknoteIcon",[["rect",{width:"20",height:"12",x:"2",y:"6",rx:"2",key:"9lu3g6"}],["circle",{cx:"12",cy:"12",r:"2",key:"1c9p78"}],["path",{d:"M6 12h.01M18 12h.01",key:"113zkx"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ua=f("BikeIcon",[["circle",{cx:"18.5",cy:"17.5",r:"3.5",key:"15x4ox"}],["circle",{cx:"5.5",cy:"17.5",r:"3.5",key:"1noe27"}],["circle",{cx:"15",cy:"5",r:"1",key:"19l28e"}],["path",{d:"M12 17.5V14l-3-3 4-3 2 3h2",key:"1npguv"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ka=f("BoxesIcon",[["path",{d:"M2.97 12.92A2 2 0 0 0 2 14.63v3.24a2 2 0 0 0 .97 1.71l3 1.8a2 2 0 0 0 2.06 0L12 19v-5.5l-5-3-4.03 2.42Z",key:"lc1i9w"}],["path",{d:"m7 16.5-4.74-2.85",key:"1o9zyk"}],["path",{d:"m7 16.5 5-3",key:"va8pkn"}],["path",{d:"M7 16.5v5.17",key:"jnp8gn"}],["path",{d:"M12 13.5V19l3.97 2.38a2 2 0 0 0 2.06 0l3-1.8a2 2 0 0 0 .97-1.71v-3.24a2 2 0 0 0-.97-1.71L17 10.5l-5 3Z",key:"8zsnat"}],["path",{d:"m17 16.5-5-3",key:"8arw3v"}],["path",{d:"m17 16.5 4.74-2.85",key:"8rfmw"}],["path",{d:"M17 16.5v5.17",key:"k6z78m"}],["path",{d:"M7.97 4.42A2 2 0 0 0 7 6.13v4.37l5 3 5-3V6.13a2 2 0 0 0-.97-1.71l-3-1.8a2 2 0 0 0-2.06 0l-3 1.8Z",key:"1xygjf"}],["path",{d:"M12 8 7.26 5.15",key:"1vbdud"}],["path",{d:"m12 8 4.74-2.85",key:"3rx089"}],["path",{d:"M12 13.5V8",key:"1io7kd"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Wa=f("BriefcaseIcon",[["path",{d:"M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16",key:"jecpp"}],["rect",{width:"20",height:"14",x:"2",y:"6",rx:"2",key:"i6l2r4"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Za=f("BuildingIcon",[["rect",{width:"16",height:"20",x:"4",y:"2",rx:"2",ry:"2",key:"76otgf"}],["path",{d:"M9 22v-4h6v4",key:"r93iot"}],["path",{d:"M8 6h.01",key:"1dz90k"}],["path",{d:"M16 6h.01",key:"1x0f13"}],["path",{d:"M12 6h.01",key:"1vi96p"}],["path",{d:"M12 10h.01",key:"1nrarc"}],["path",{d:"M12 14h.01",key:"1etili"}],["path",{d:"M16 10h.01",key:"1m94wz"}],["path",{d:"M16 14h.01",key:"1gbofw"}],["path",{d:"M8 10h.01",key:"19clt8"}],["path",{d:"M8 14h.01",key:"6423bh"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ga=f("CalendarCheckIcon",[["path",{d:"M8 2v4",key:"1cmpym"}],["path",{d:"M16 2v4",key:"4m81vk"}],["rect",{width:"18",height:"18",x:"3",y:"4",rx:"2",key:"1hopcy"}],["path",{d:"M3 10h18",key:"8toen8"}],["path",{d:"m9 16 2 2 4-4",key:"19s6y9"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ja=f("CalendarRangeIcon",[["rect",{width:"18",height:"18",x:"3",y:"4",rx:"2",key:"1hopcy"}],["path",{d:"M16 2v4",key:"4m81vk"}],["path",{d:"M3 10h18",key:"8toen8"}],["path",{d:"M8 2v4",key:"1cmpym"}],["path",{d:"M17 14h-6",key:"bkmgh3"}],["path",{d:"M13 18H7",key:"bb0bb7"}],["path",{d:"M7 14h.01",key:"1qa3f1"}],["path",{d:"M17 18h.01",key:"1bdyru"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ya=f("CalendarIcon",[["path",{d:"M8 2v4",key:"1cmpym"}],["path",{d:"M16 2v4",key:"4m81vk"}],["rect",{width:"18",height:"18",x:"3",y:"4",rx:"2",key:"1hopcy"}],["path",{d:"M3 10h18",key:"8toen8"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Qa=f("CheckCheckIcon",[["path",{d:"M18 6 7 17l-5-5",key:"116fxf"}],["path",{d:"m22 10-7.5 7.5L13 16",key:"ke71qq"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Xa=f("CheckIcon",[["path",{d:"M20 6 9 17l-5-5",key:"1gmf2c"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const eo=f("ChefHatIcon",[["path",{d:"M17 21a1 1 0 0 0 1-1v-5.35c0-.457.316-.844.727-1.041a4 4 0 0 0-2.134-7.589 5 5 0 0 0-9.186 0 4 4 0 0 0-2.134 7.588c.411.198.727.585.727 1.041V20a1 1 0 0 0 1 1Z",key:"1qvrer"}],["path",{d:"M6 17h12",key:"1jwigz"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const to=f("ChevronDownIcon",[["path",{d:"m6 9 6 6 6-6",key:"qrunsl"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const no=f("ChevronLeftIcon",[["path",{d:"m15 18-6-6 6-6",key:"1wnfg3"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ao=f("ChevronRightIcon",[["path",{d:"m9 18 6-6-6-6",key:"mthhwq"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const oo=f("ChevronUpIcon",[["path",{d:"m18 15-6-6-6 6",key:"153udz"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ro=f("CircleAlertIcon",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["line",{x1:"12",x2:"12",y1:"8",y2:"12",key:"1pkeuh"}],["line",{x1:"12",x2:"12.01",y1:"16",y2:"16",key:"4dfq90"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const so=f("CircleCheckIcon",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["path",{d:"m9 12 2 2 4-4",key:"dzmm74"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const io=f("CircleHelpIcon",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["path",{d:"M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3",key:"1u773s"}],["path",{d:"M12 17h.01",key:"p32p05"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const lo=f("CirclePauseIcon",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["line",{x1:"10",x2:"10",y1:"15",y2:"9",key:"c1nkhi"}],["line",{x1:"14",x2:"14",y1:"15",y2:"9",key:"h65svq"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const uo=f("ClipboardListIcon",[["rect",{width:"8",height:"4",x:"8",y:"2",rx:"1",ry:"1",key:"tgr4d6"}],["path",{d:"M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2",key:"116196"}],["path",{d:"M12 11h4",key:"1jrz19"}],["path",{d:"M12 16h4",key:"n85exb"}],["path",{d:"M8 11h.01",key:"1dfujw"}],["path",{d:"M8 16h.01",key:"18s6g9"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const co=f("ClockIcon",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["polyline",{points:"12 6 12 12 16 14",key:"68esgv"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const po=f("CoinsIcon",[["circle",{cx:"8",cy:"8",r:"6",key:"3yglwk"}],["path",{d:"M18.09 10.37A6 6 0 1 1 10.34 18",key:"t5s6rm"}],["path",{d:"M7 6h1v4",key:"1obek4"}],["path",{d:"m16.71 13.88.7.71-2.82 2.82",key:"1rbuyh"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const fo=f("CopyIcon",[["rect",{width:"14",height:"14",x:"8",y:"8",rx:"2",ry:"2",key:"17jyea"}],["path",{d:"M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2",key:"zix9uf"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const yo=f("CreditCardIcon",[["rect",{width:"20",height:"14",x:"2",y:"5",rx:"2",key:"ynyp8z"}],["line",{x1:"2",x2:"22",y1:"10",y2:"10",key:"1b3vmo"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const vo=f("CrownIcon",[["path",{d:"M11.562 3.266a.5.5 0 0 1 .876 0L15.39 8.87a1 1 0 0 0 1.516.294L21.183 5.5a.5.5 0 0 1 .798.519l-2.834 10.246a1 1 0 0 1-.956.734H5.81a1 1 0 0 1-.957-.734L2.02 6.02a.5.5 0 0 1 .798-.519l4.276 3.664a1 1 0 0 0 1.516-.294z",key:"1vdc57"}],["path",{d:"M5 21h14",key:"11awu3"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ho=f("DollarSignIcon",[["line",{x1:"12",x2:"12",y1:"2",y2:"22",key:"7eqyqh"}],["path",{d:"M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6",key:"1b0p4s"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const mo=f("EyeOffIcon",[["path",{d:"M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49",key:"ct8e1f"}],["path",{d:"M14.084 14.158a3 3 0 0 1-4.242-4.242",key:"151rxh"}],["path",{d:"M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143",key:"13bj9a"}],["path",{d:"m2 2 20 20",key:"1ooewy"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const go=f("EyeIcon",[["path",{d:"M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0",key:"1nclc0"}],["circle",{cx:"12",cy:"12",r:"3",key:"1v7zrd"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ko=f("FileTextIcon",[["path",{d:"M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z",key:"1rqfz7"}],["path",{d:"M14 2v4a2 2 0 0 0 2 2h4",key:"tnqrlb"}],["path",{d:"M10 9H8",key:"b1mrlr"}],["path",{d:"M16 13H8",key:"t4e002"}],["path",{d:"M16 17H8",key:"z1uh3a"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const bo=f("FlaskConicalIcon",[["path",{d:"M10 2v7.527a2 2 0 0 1-.211.896L4.72 20.55a1 1 0 0 0 .9 1.45h12.76a1 1 0 0 0 .9-1.45l-5.069-10.127A2 2 0 0 1 14 9.527V2",key:"pzvekw"}],["path",{d:"M8.5 2h7",key:"csnxdl"}],["path",{d:"M7 16h10",key:"wp8him"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Mo=f("FuelIcon",[["line",{x1:"3",x2:"15",y1:"22",y2:"22",key:"xegly4"}],["line",{x1:"4",x2:"14",y1:"9",y2:"9",key:"xcnuvu"}],["path",{d:"M14 22V4a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v18",key:"16j0yd"}],["path",{d:"M14 13h2a2 2 0 0 1 2 2v2a2 2 0 0 0 2 2a2 2 0 0 0 2-2V9.83a2 2 0 0 0-.59-1.42L18 5",key:"7cu91f"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const wo=f("HardHatIcon",[["path",{d:"M2 18a1 1 0 0 0 1 1h18a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1v2z",key:"1dej2m"}],["path",{d:"M10 10V5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v5",key:"1p9q5i"}],["path",{d:"M4 15v-3a6 6 0 0 1 6-6",key:"9ciidu"}],["path",{d:"M14 6a6 6 0 0 1 6 6v3",key:"1hnv84"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const _o=f("HashIcon",[["line",{x1:"4",x2:"20",y1:"9",y2:"9",key:"4lhtct"}],["line",{x1:"4",x2:"20",y1:"15",y2:"15",key:"vyu0kd"}],["line",{x1:"10",x2:"8",y1:"3",y2:"21",key:"1ggp8o"}],["line",{x1:"16",x2:"14",y1:"3",y2:"21",key:"weycgp"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Co=f("InfoIcon",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["path",{d:"M12 16v-4",key:"1dtifu"}],["path",{d:"M12 8h.01",key:"e9boi3"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Io=f("InstagramIcon",[["rect",{width:"20",height:"20",x:"2",y:"2",rx:"5",ry:"5",key:"2e1cvw"}],["path",{d:"M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z",key:"9exkf1"}],["line",{x1:"17.5",x2:"17.51",y1:"6.5",y2:"6.5",key:"r4j83e"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ao=f("KeyRoundIcon",[["path",{d:"M2.586 17.414A2 2 0 0 0 2 18.828V21a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h1a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h.172a2 2 0 0 0 1.414-.586l.814-.814a6.5 6.5 0 1 0-4-4z",key:"1s6t7t"}],["circle",{cx:"16.5",cy:"7.5",r:".5",fill:"currentColor",key:"w0ekpg"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Eo=f("LayersIcon",[["path",{d:"m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z",key:"8b97xw"}],["path",{d:"m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65",key:"dd6zsq"}],["path",{d:"m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65",key:"ep9fru"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const xo=f("LayoutDashboardIcon",[["rect",{width:"7",height:"9",x:"3",y:"3",rx:"1",key:"10lvy0"}],["rect",{width:"7",height:"5",x:"14",y:"3",rx:"1",key:"16une8"}],["rect",{width:"7",height:"9",x:"14",y:"12",rx:"1",key:"1hutg5"}],["rect",{width:"7",height:"5",x:"3",y:"16",rx:"1",key:"ldoo1y"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Oo=f("LoaderCircleIcon",[["path",{d:"M21 12a9 9 0 1 1-6.219-8.56",key:"13zald"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const So=f("LockIcon",[["rect",{width:"18",height:"11",x:"3",y:"11",rx:"2",ry:"2",key:"1w4ew1"}],["path",{d:"M7 11V7a5 5 0 0 1 10 0v4",key:"fwvmzm"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Do=f("LogInIcon",[["path",{d:"M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4",key:"u53s6r"}],["polyline",{points:"10 17 15 12 10 7",key:"1ail0h"}],["line",{x1:"15",x2:"3",y1:"12",y2:"12",key:"v6grx8"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const qo=f("LogOutIcon",[["path",{d:"M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4",key:"1uf3rs"}],["polyline",{points:"16 17 21 12 16 7",key:"1gabdz"}],["line",{x1:"21",x2:"9",y1:"12",y2:"12",key:"1uyos4"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Po=f("MapPinIcon",[["path",{d:"M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0",key:"1r0f0z"}],["circle",{cx:"12",cy:"10",r:"3",key:"ilqhr7"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const To=f("MessageCircleIcon",[["path",{d:"M7.9 20A9 9 0 1 0 4 16.1L2 22Z",key:"vv11sd"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Lo=f("MilkIcon",[["path",{d:"M8 2h8",key:"1ssgc1"}],["path",{d:"M9 2v2.789a4 4 0 0 1-.672 2.219l-.656.984A4 4 0 0 0 7 10.212V20a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-9.789a4 4 0 0 0-.672-2.219l-.656-.984A4 4 0 0 1 15 4.788V2",key:"qtp12x"}],["path",{d:"M7 15a6.472 6.472 0 0 1 5 0 6.47 6.47 0 0 0 5 0",key:"ygeh44"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Fo=f("MoonIcon",[["path",{d:"M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z",key:"a7tn18"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Bo=f("PackageCheckIcon",[["path",{d:"m16 16 2 2 4-4",key:"gfu2re"}],["path",{d:"M21 10V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l2-1.14",key:"e7tb2h"}],["path",{d:"m7.5 4.27 9 5.15",key:"1c824w"}],["polyline",{points:"3.29 7 12 12 20.71 7",key:"ousv84"}],["line",{x1:"12",x2:"12",y1:"22",y2:"12",key:"a4e8g8"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ro=f("PackageIcon",[["path",{d:"M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z",key:"1a0edw"}],["path",{d:"M12 22V12",key:"d0xqtd"}],["path",{d:"m3.3 7 7.703 4.734a2 2 0 0 0 1.994 0L20.7 7",key:"yx3hmr"}],["path",{d:"m7.5 4.27 9 5.15",key:"1c824w"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const $o=f("PenLineIcon",[["path",{d:"M12 20h9",key:"t2du7b"}],["path",{d:"M16.376 3.622a1 1 0 0 1 3.002 3.002L7.368 18.635a2 2 0 0 1-.855.506l-2.872.838a.5.5 0 0 1-.62-.62l.838-2.872a2 2 0 0 1 .506-.854z",key:"1ykcvy"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const jo=f("PenIcon",[["path",{d:"M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z",key:"1a8usu"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const zo=f("PencilIcon",[["path",{d:"M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z",key:"1a8usu"}],["path",{d:"m15 5 4 4",key:"1mk7zo"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const No=f("PercentIcon",[["line",{x1:"19",x2:"5",y1:"5",y2:"19",key:"1x9vlm"}],["circle",{cx:"6.5",cy:"6.5",r:"2.5",key:"4mh3h7"}],["circle",{cx:"17.5",cy:"17.5",r:"2.5",key:"1mdrzq"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Vo=f("PhoneCallIcon",[["path",{d:"M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z",key:"foiqr5"}],["path",{d:"M14.05 2a9 9 0 0 1 8 7.94",key:"vmijpz"}],["path",{d:"M14.05 6A5 5 0 0 1 18 10",key:"13nbpp"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ho=f("PhoneIcon",[["path",{d:"M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z",key:"foiqr5"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Uo=f("PiggyBankIcon",[["path",{d:"M19 5c-1.5 0-2.8 1.4-3 2-3.5-1.5-11-.3-11 5 0 1.8 0 3 2 4.5V20h4v-2h3v2h4v-4c1-.5 1.7-1 2-2h2v-4h-2c0-1-.5-1.5-1-2V5z",key:"1ivx2i"}],["path",{d:"M2 9v1c0 1.1.9 2 2 2h1",key:"nm575m"}],["path",{d:"M16 11h.01",key:"xkw8gn"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ko=f("PlusIcon",[["path",{d:"M5 12h14",key:"1ays0h"}],["path",{d:"M12 5v14",key:"s699le"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Wo=f("PowerIcon",[["path",{d:"M12 2v10",key:"mnfbl"}],["path",{d:"M18.4 6.6a9 9 0 1 1-12.77.04",key:"obofu9"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Zo=f("QrCodeIcon",[["rect",{width:"5",height:"5",x:"3",y:"3",rx:"1",key:"1tu5fj"}],["rect",{width:"5",height:"5",x:"16",y:"3",rx:"1",key:"1v8r4q"}],["rect",{width:"5",height:"5",x:"3",y:"16",rx:"1",key:"1x03jg"}],["path",{d:"M21 16h-3a2 2 0 0 0-2 2v3",key:"177gqh"}],["path",{d:"M21 21v.01",key:"ents32"}],["path",{d:"M12 7v3a2 2 0 0 1-2 2H7",key:"8crl2c"}],["path",{d:"M3 12h.01",key:"nlz23k"}],["path",{d:"M12 3h.01",key:"n36tog"}],["path",{d:"M12 16v.01",key:"133mhm"}],["path",{d:"M16 12h1",key:"1slzba"}],["path",{d:"M21 12v.01",key:"1lwtk9"}],["path",{d:"M12 21v-1",key:"1880an"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Go=f("ReceiptTextIcon",[["path",{d:"M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z",key:"q3az6g"}],["path",{d:"M14 8H8",key:"1l3xfs"}],["path",{d:"M16 12H8",key:"1fr5h0"}],["path",{d:"M13 16H8",key:"wsln4y"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Jo=f("ReceiptIcon",[["path",{d:"M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z",key:"q3az6g"}],["path",{d:"M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8",key:"1h4pet"}],["path",{d:"M12 17.5v-11",key:"1jc1ny"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Yo=f("RefreshCwIcon",[["path",{d:"M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8",key:"v9h5vc"}],["path",{d:"M21 3v5h-5",key:"1q7to0"}],["path",{d:"M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16",key:"3uifl3"}],["path",{d:"M8 16H3v5",key:"1cv678"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Qo=f("RotateCcwIcon",[["path",{d:"M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8",key:"1357e3"}],["path",{d:"M3 3v5h5",key:"1xhq8a"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Xo=f("RotateCwIcon",[["path",{d:"M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8",key:"1p45f6"}],["path",{d:"M21 3v5h-5",key:"1q7to0"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const er=f("SaveIcon",[["path",{d:"M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z",key:"1c8476"}],["path",{d:"M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7",key:"1ydtos"}],["path",{d:"M7 3v4a1 1 0 0 0 1 1h7",key:"t51u73"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const tr=f("ScaleIcon",[["path",{d:"m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z",key:"7g6ntu"}],["path",{d:"m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z",key:"ijws7r"}],["path",{d:"M7 21h10",key:"1b0cd5"}],["path",{d:"M12 3v18",key:"108xh3"}],["path",{d:"M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2",key:"3gwbw2"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const nr=f("SearchIcon",[["circle",{cx:"11",cy:"11",r:"8",key:"4ej97u"}],["path",{d:"m21 21-4.3-4.3",key:"1qie3q"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ar=f("SendIcon",[["path",{d:"M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z",key:"1ffxy3"}],["path",{d:"m21.854 2.147-10.94 10.939",key:"12cjpa"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const or=f("SettingsIcon",[["path",{d:"M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z",key:"1qme2f"}],["circle",{cx:"12",cy:"12",r:"3",key:"1v7zrd"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const rr=f("ShieldAlertIcon",[["path",{d:"M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z",key:"oel41y"}],["path",{d:"M12 8v4",key:"1got3b"}],["path",{d:"M12 16h.01",key:"1drbdi"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const sr=f("ShieldCheckIcon",[["path",{d:"M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z",key:"oel41y"}],["path",{d:"m9 12 2 2 4-4",key:"dzmm74"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ir=f("ShoppingBagIcon",[["path",{d:"M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z",key:"hou9p0"}],["path",{d:"M3 6h18",key:"d0wm0j"}],["path",{d:"M16 10a4 4 0 0 1-8 0",key:"1ltviw"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const lr=f("ShoppingCartIcon",[["circle",{cx:"8",cy:"21",r:"1",key:"jimo8o"}],["circle",{cx:"19",cy:"21",r:"1",key:"13723u"}],["path",{d:"M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12",key:"9zh506"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ur=f("SmartphoneIcon",[["rect",{width:"14",height:"20",x:"5",y:"2",rx:"2",ry:"2",key:"1yt0o3"}],["path",{d:"M12 18h.01",key:"mhygvu"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const cr=f("SparklesIcon",[["path",{d:"M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z",key:"4pj2yx"}],["path",{d:"M20 3v4",key:"1olli1"}],["path",{d:"M22 5h-4",key:"1gvqau"}],["path",{d:"M4 17v2",key:"vumght"}],["path",{d:"M5 18H3",key:"zchphs"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const dr=f("SquareCheckBigIcon",[["path",{d:"M21 10.5V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h12.5",key:"1uzm8b"}],["path",{d:"m9 11 3 3L22 4",key:"1pflzl"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const pr=f("SquareIcon",[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2",key:"afitv7"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const fr=f("SunIcon",[["circle",{cx:"12",cy:"12",r:"4",key:"4exip2"}],["path",{d:"M12 2v2",key:"tus03m"}],["path",{d:"M12 20v2",key:"1lh1kg"}],["path",{d:"m4.93 4.93 1.41 1.41",key:"149t6j"}],["path",{d:"m17.66 17.66 1.41 1.41",key:"ptbguv"}],["path",{d:"M2 12h2",key:"1t8f8n"}],["path",{d:"M20 12h2",key:"1q8mjw"}],["path",{d:"m6.34 17.66-1.41 1.41",key:"1m8zz5"}],["path",{d:"m19.07 4.93-1.41 1.41",key:"1shlcs"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const yr=f("TagIcon",[["path",{d:"M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z",key:"vktsd0"}],["circle",{cx:"7.5",cy:"7.5",r:".5",fill:"currentColor",key:"kqv944"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const vr=f("TimerIcon",[["line",{x1:"10",x2:"14",y1:"2",y2:"2",key:"14vaq8"}],["line",{x1:"12",x2:"15",y1:"14",y2:"11",key:"17fdiu"}],["circle",{cx:"12",cy:"14",r:"8",key:"1e1u0o"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const hr=f("Trash2Icon",[["path",{d:"M3 6h18",key:"d0wm0j"}],["path",{d:"M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6",key:"4alrt4"}],["path",{d:"M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2",key:"v07s0e"}],["line",{x1:"10",x2:"10",y1:"11",y2:"17",key:"1uufr5"}],["line",{x1:"14",x2:"14",y1:"11",y2:"17",key:"xtxkd"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const mr=f("TrendingDownIcon",[["polyline",{points:"22 17 13.5 8.5 8.5 13.5 2 7",key:"1r2t7k"}],["polyline",{points:"16 17 22 17 22 11",key:"11uiuu"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const gr=f("TrendingUpIcon",[["polyline",{points:"22 7 13.5 15.5 8.5 10.5 2 17",key:"126l90"}],["polyline",{points:"16 7 22 7 22 13",key:"kwv8wd"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const kr=f("TriangleAlertIcon",[["path",{d:"m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3",key:"wmoenq"}],["path",{d:"M12 9v4",key:"juzpu7"}],["path",{d:"M12 17h.01",key:"p32p05"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const br=f("TruckIcon",[["path",{d:"M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2",key:"wrbu53"}],["path",{d:"M15 18H9",key:"1lyqi6"}],["path",{d:"M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14",key:"lysw3i"}],["circle",{cx:"17",cy:"18",r:"2",key:"332jqn"}],["circle",{cx:"7",cy:"18",r:"2",key:"19iecd"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Mr=f("UnlinkIcon",[["path",{d:"m18.84 12.25 1.72-1.71h-.02a5.004 5.004 0 0 0-.12-7.07 5.006 5.006 0 0 0-6.95 0l-1.72 1.71",key:"yqzxt4"}],["path",{d:"m5.17 11.75-1.71 1.71a5.004 5.004 0 0 0 .12 7.07 5.006 5.006 0 0 0 6.95 0l1.71-1.71",key:"4qinb0"}],["line",{x1:"8",x2:"8",y1:"2",y2:"5",key:"1041cp"}],["line",{x1:"2",x2:"5",y1:"8",y2:"8",key:"14m1p5"}],["line",{x1:"16",x2:"16",y1:"19",y2:"22",key:"rzdirn"}],["line",{x1:"19",x2:"22",y1:"16",y2:"16",key:"ox905f"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const wr=f("UserCheckIcon",[["path",{d:"M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2",key:"1yyitq"}],["circle",{cx:"9",cy:"7",r:"4",key:"nufk8"}],["polyline",{points:"16 11 18 13 22 9",key:"1pwet4"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const _r=f("UserMinusIcon",[["path",{d:"M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2",key:"1yyitq"}],["circle",{cx:"9",cy:"7",r:"4",key:"nufk8"}],["line",{x1:"22",x2:"16",y1:"11",y2:"11",key:"1shjgl"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Cr=f("UserPlusIcon",[["path",{d:"M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2",key:"1yyitq"}],["circle",{cx:"9",cy:"7",r:"4",key:"nufk8"}],["line",{x1:"19",x2:"19",y1:"8",y2:"14",key:"1bvyxn"}],["line",{x1:"22",x2:"16",y1:"11",y2:"11",key:"1shjgl"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ir=f("UserIcon",[["path",{d:"M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2",key:"975kel"}],["circle",{cx:"12",cy:"7",r:"4",key:"17ys0d"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ar=f("UsersIcon",[["path",{d:"M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2",key:"1yyitq"}],["circle",{cx:"9",cy:"7",r:"4",key:"nufk8"}],["path",{d:"M22 21v-2a4 4 0 0 0-3-3.87",key:"kshegd"}],["path",{d:"M16 3.13a4 4 0 0 1 0 7.75",key:"1da9ce"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Er=f("WalletIcon",[["path",{d:"M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1",key:"18etb6"}],["path",{d:"M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4",key:"xoc0q4"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const xr=f("WifiIcon",[["path",{d:"M12 20h.01",key:"zekei9"}],["path",{d:"M2 8.82a15 15 0 0 1 20 0",key:"dnpr2z"}],["path",{d:"M5 12.859a10 10 0 0 1 14 0",key:"1x1e6c"}],["path",{d:"M8.5 16.429a5 5 0 0 1 7 0",key:"1bycff"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Or=f("WrenchIcon",[["path",{d:"M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z",key:"cbrjhi"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Sr=f("XIcon",[["path",{d:"M18 6 6 18",key:"1bl5f8"}],["path",{d:"m6 6 12 12",key:"d8bk6v"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Dr=f("ZapIcon",[["path",{d:"M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z",key:"1xq2db"}]]);function re(e,t){const n=typeof e=="string"&&!t?`${e}Context`:t,a=Symbol(n);return[l=>{const i=Ke(a,l);if(i||i===null)return i;throw new Error(`Injection \`${a.toString()}\` not found. Component must be used within ${Array.isArray(e)?`one of the following components: ${e.join(", ")}`:`\`${e}\``}`)},l=>(We(a,l),l)]}function F(){let e=document.activeElement;if(e==null)return null;for(;e!=null&&e.shadowRoot!=null&&e.shadowRoot.activeElement!=null;)e=e.shadowRoot.activeElement;return e}function nt(e,t,n){const a=n.originalEvent.target,o=new CustomEvent(e,{bubbles:!1,cancelable:!0,detail:n});t&&a.addEventListener(e,t,{once:!0}),a.dispatchEvent(o)}function Gt(e){return e==null}function Jt(e,t){return He()?(Ue(e,t),!0):!1}function Yt(e){let t=!1,n;const a=Ge(!0);return(...o)=>(t||(n=a.run(()=>e(...o)),t=!0),n)}const U=typeof window<"u"&&typeof document<"u";typeof WorkerGlobalScope<"u"&&globalThis instanceof WorkerGlobalScope;const Qt=e=>typeof e<"u",Xt=Object.prototype.toString,en=e=>Xt.call(e)==="[object Object]",Re=tn();function tn(){var e,t,n;return U&&!!(!((e=window)===null||e===void 0||(e=e.navigator)===null||e===void 0)&&e.userAgent)&&(/iP(?:ad|hone|od)/.test(window.navigator.userAgent)||((t=window)===null||t===void 0||(t=t.navigator)===null||t===void 0?void 0:t.maxTouchPoints)>2&&/iPad|Macintosh/.test((n=window)===null||n===void 0?void 0:n.navigator.userAgent))}function ge(e){return Array.isArray(e)?e:[e]}function nn(e){return K()}function an(e){if(!U)return e;let t=0,n,a;const o=()=>{t-=1,a&&t<=0&&(a.stop(),n=void 0,a=void 0)};return(...r)=>(t+=1,a||(a=Ge(!0),n=a.run(()=>e(...r))),Jt(o),n)}function on(e,t){nn()&&Ze(e,t)}function rn(e,t,n){return q(e,t,{...n,immediate:!0})}const De=U?window:void 0;function se(e){var t;const n=N(e);return(t=n==null?void 0:n.$el)!==null&&t!==void 0?t:n}function at(...e){const t=(a,o,r,l)=>(a.addEventListener(o,r,l),()=>a.removeEventListener(o,r,l)),n=_(()=>{const a=ge(N(e[0])).filter(o=>o!=null);return a.every(o=>typeof o!="string")?a:void 0});return rn(()=>{var a,o;return[(a=(o=n.value)===null||o===void 0?void 0:o.map(r=>se(r)))!==null&&a!==void 0?a:[De].filter(r=>r!=null),ge(N(n.value?e[1]:e[0])),ge(v(n.value?e[2]:e[1])),N(n.value?e[3]:e[2])]},([a,o,r,l],i,u)=>{if(!(a!=null&&a.length)||!(o!=null&&o.length)||!(r!=null&&r.length))return;const c=en(l)?{...l}:l,p=a.flatMap(s=>o.flatMap(d=>r.map(y=>t(s,d,y,c))));u(()=>{p.forEach(s=>s())})},{flush:"post"})}function sn(){const e=xe(!1),t=K();return t&&ee(()=>{e.value=!0},t),e}function ln(e){return typeof e=="function"?e:typeof e=="string"?t=>t.key===e:Array.isArray(e)?t=>e.includes(t.key):()=>!0}function un(...e){let t,n,a={};e.length===3?(t=e[0],n=e[1],a=e[2]):e.length===2?typeof e[1]=="object"?(t=!0,n=e[0],a=e[1]):(t=e[0],n=e[1]):(t=!0,n=e[0]);const{target:o=De,eventName:r="keydown",passive:l=!1,dedupe:i=!1}=a,u=ln(t);return at(o,r,p=>{p.repeat&&N(i)||u(p)&&n(p)},l)}function cn(e){return JSON.parse(JSON.stringify(e))}function qe(e,t,n,a={}){var o,r;const{clone:l=!1,passive:i=!1,eventName:u,deep:c=!1,defaultValue:p,shouldEmit:s}=a,d=K(),y=n||(d==null?void 0:d.emit)||(d==null||(o=d.$emit)===null||o===void 0?void 0:o.bind(d))||(d==null||(r=d.proxy)===null||r===void 0||(r=r.$emit)===null||r===void 0?void 0:r.bind(d==null?void 0:d.proxy));let g=u;t||(t="modelValue"),g=g||`update:${t.toString()}`;const k=h=>l?typeof l=="function"?l(h):cn(h):h,b=()=>Qt(e[t])?k(e[t]):p,m=h=>{s?s(h)&&y(g,h):y(g,h)};if(i){const h=M(b());let D=!1;return q(()=>e[t],O=>{D||(D=!0,h.value=k(O),B(()=>D=!1))}),q(h,O=>{!D&&(O!==e[t]||c)&&m(O)},{deep:c}),h}else return _({get(){return b()},set(h){m(h)}})}function Pe(e){return e?e.flatMap(t=>t.type===ht?Pe(t.children):[t]):[]}const[me]=re("ConfigProvider"),T=Je({layersRoot:new Set,layersWithOutsidePointerEventsDisabled:new Set,originalBodyPointerEvents:void 0,branches:new Set});function ke(e){if(e===null||typeof e!="object")return!1;const t=Object.getPrototypeOf(e);return t!==null&&t!==Object.prototype&&Object.getPrototypeOf(t)!==null||Symbol.iterator in e?!1:Symbol.toStringTag in e?Object.prototype.toString.call(e)==="[object Module]":!0}function Ae(e,t,n=".",a){if(!ke(t))return Ae(e,{},n,a);const o={...t};for(const r of Object.keys(e)){if(r==="__proto__"||r==="constructor")continue;const l=e[r];l!=null&&(a&&a(o,r,l,n)||(Array.isArray(l)&&Array.isArray(o[r])?o[r]=[...l,...o[r]]:ke(l)&&ke(o[r])?o[r]=Ae(l,o[r],(n?`${n}.`:"")+r.toString(),a):o[r]=l))}return o}function dn(e){return(...t)=>t.reduce((n,a)=>Ae(n,a,"",e),{})}const pn=dn(),fn=an(()=>{const e=M(new Map),t=M(),n=_(()=>{for(const l of e.value.values())if(l)return!0;return!1}),a=me({scrollBody:M(!0)});let o=null;const r=()=>{document.body.style.paddingRight="",document.body.style.marginRight="",T.layersWithOutsidePointerEventsDisabled.size===0&&(document.body.style.pointerEvents=""),document.documentElement.style.removeProperty("--scrollbar-width"),document.body.style.overflow=t.value??"",Re&&(o==null||o()),t.value=void 0};return q(n,(l,i)=>{var s;if(!U)return;if(!l){i&&r();return}t.value===void 0&&(t.value=document.body.style.overflow);const u=window.innerWidth-document.documentElement.clientWidth,c={padding:u,margin:0},p=(s=a.scrollBody)!=null&&s.value?typeof a.scrollBody.value=="object"?pn({padding:a.scrollBody.value.padding===!0?u:a.scrollBody.value.padding,margin:a.scrollBody.value.margin===!0?u:a.scrollBody.value.margin},c):c:{padding:0,margin:0};u>0&&(document.body.style.paddingRight=typeof p.padding=="number"?`${p.padding}px`:String(p.padding),document.body.style.marginRight=typeof p.margin=="number"?`${p.margin}px`:String(p.margin),document.documentElement.style.setProperty("--scrollbar-width",`${u}px`),document.body.style.overflow="hidden"),Re&&(o=at(document,"touchmove",d=>vn(d),{passive:!1})),B(()=>{n.value&&(document.body.style.pointerEvents="none",document.body.style.overflow="hidden")})},{immediate:!0,flush:"sync"}),e});function yn(e){const t=Math.random().toString(36).substring(2,7),n=fn();n.value.set(t,e??!1);const a=_({get:()=>n.value.get(t)??!1,set:o=>n.value.set(t,o)});return on(()=>{n.value.delete(t)}),a}function ot(e){const t=window.getComputedStyle(e);if(t.overflowX==="scroll"||t.overflowY==="scroll"||t.overflowX==="auto"&&e.clientWidth<e.scrollWidth||t.overflowY==="auto"&&e.clientHeight<e.scrollHeight)return!0;{const n=e.parentNode;return!(n instanceof Element)||n.tagName==="BODY"?!1:ot(n)}}function vn(e){const t=e||window.event,n=t.target;return n instanceof Element&&ot(n)?!1:t.touches.length>1?!0:(t.preventDefault&&t.cancelable&&t.preventDefault(),!1)}function rt(e){const t=me({dir:M("ltr")});return _(()=>{var n;return(e==null?void 0:e.value)||((n=t.dir)==null?void 0:n.value)||"ltr"})}function ie(e){const t=K(),n=t==null?void 0:t.type.emits,a={};return n!=null&&n.length||console.warn(`No emitted event found. Please check component: ${t==null?void 0:t.type.__name}`),n==null||n.forEach(o=>{a[mt(Ye(o))]=(...r)=>e(o,...r)}),a}function S(){const e=K(),t=M(),n=_(()=>a());gt(()=>{n.value!==a()&&kt(t)});function a(){return t.value&&"$el"in t.value&&["#text","#comment"].includes(t.value.$el.nodeName)?t.value.$el.nextElementSibling:se(t)}const o=Object.assign({},e.exposed),r={};for(const i in e.props)Object.defineProperty(r,i,{enumerable:!0,configurable:!0,get:()=>e.props[i]});if(Object.keys(o).length>0)for(const i in o)Object.defineProperty(r,i,{enumerable:!0,configurable:!0,get:()=>o[i]});Object.defineProperty(r,"$el",{enumerable:!0,configurable:!0,get:()=>e.vnode.el}),e.exposed=r;function l(i){if(t.value=i,!!i&&(Object.defineProperty(r,"$el",{enumerable:!0,configurable:!0,get:()=>i instanceof Element?i:i.$el}),!(i instanceof Element)&&!Object.hasOwn(i,"$el"))){const u=i.$.exposed,c=Object.assign({},r);for(const p in u)Object.defineProperty(c,p,{enumerable:!0,configurable:!0,get:()=>u[p]});e.exposed=c}}return{forwardRef:l,currentRef:t,currentElement:n}}function hn(e){const t=K(),n=Object.keys((t==null?void 0:t.type.props)??{}).reduce((o,r)=>{const l=(t==null?void 0:t.type.props[r]).default;return l!==void 0&&(o[r]=l),o},{}),a=bt(e);return _(()=>{const o={},r=(t==null?void 0:t.vnode.props)??{};return Object.keys(r).forEach(l=>{o[Ye(l)]=r[l]}),Object.keys({...n,...o}).reduce((l,i)=>(a.value[i]!==void 0&&(l[i]=a.value[i]),l),{})})}function mn(e,t){const n=hn(e),a=t?ie(t):{};return _(()=>({...n.value,...a}))}var gn=function(e){if(typeof document>"u")return null;var t=Array.isArray(e)?e[0]:e;return t.ownerDocument.body},Q=new WeakMap,pe=new WeakMap,fe={},be=0,st=function(e){return e&&(e.host||st(e.parentNode))},kn=function(e,t){return t.map(function(n){if(e.contains(n))return n;var a=st(n);return a&&e.contains(a)?a:(console.error("aria-hidden",n,"in not contained inside",e,". Doing nothing"),null)}).filter(function(n){return!!n})},bn=function(e,t,n,a){var o=kn(t,Array.isArray(e)?e:[e]);fe[n]||(fe[n]=new WeakMap);var r=fe[n],l=[],i=new Set,u=new Set(o),c=function(s){!s||i.has(s)||(i.add(s),c(s.parentNode))};o.forEach(c);var p=function(s){!s||u.has(s)||Array.prototype.forEach.call(s.children,function(d){if(i.has(d))p(d);else try{var y=d.getAttribute(a),g=y!==null&&y!=="false",k=(Q.get(d)||0)+1,b=(r.get(d)||0)+1;Q.set(d,k),r.set(d,b),l.push(d),k===1&&g&&pe.set(d,!0),b===1&&d.setAttribute(n,"true"),g||d.setAttribute(a,"true")}catch(m){console.error("aria-hidden: cannot operate on ",d,m)}})};return p(t),i.clear(),be++,function(){l.forEach(function(s){var d=Q.get(s)-1,y=r.get(s)-1;Q.set(s,d),r.set(s,y),d||(pe.has(s)||s.removeAttribute(a),pe.delete(s)),y||s.removeAttribute(n)}),be--,be||(Q=new WeakMap,Q=new WeakMap,pe=new WeakMap,fe={})}},Mn=function(e,t,n){n===void 0&&(n="data-aria-hidden");var a=Array.from(Array.isArray(e)?e:[e]),o=gn(e);return o?(a.push.apply(a,Array.from(o.querySelectorAll("[aria-live], script"))),bn(a,o,n,"aria-hidden")):function(){return null}};function wn(e){let t;q(()=>se(e),n=>{let a=!1;try{a=!!(n!=null&&n.closest("[popover]:not(:popover-open)"))}catch{}n&&!a?t=Mn(n):t&&t()}),Oe(()=>{t&&t()})}function he(e,t="reka"){var o;let n;const a=me({useId:void 0});return a.useId?n=a.useId():n=(o=Mt)==null?void 0:o(),t?`${t}-${n}`:n}function _n(e,t){const n=M(e);function a(r){return t[n.value][r]??n.value}return{state:n,dispatch:r=>{n.value=a(r)}}}function Cn(e,t){var b;const n=M({}),a=M("none"),o=M(e),r=e.value?"mounted":"unmounted";let l;const i=((b=t.value)==null?void 0:b.ownerDocument.defaultView)??De,{state:u,dispatch:c}=_n(r,{mounted:{UNMOUNT:"unmounted",ANIMATION_OUT:"unmountSuspended"},unmountSuspended:{MOUNT:"mounted",ANIMATION_END:"unmounted"},unmounted:{MOUNT:"mounted"}}),p=m=>{var h;if(U){const D=new CustomEvent(m,{bubbles:!1,cancelable:!1});(h=t.value)==null||h.dispatchEvent(D)}};q(e,async(m,h)=>{var O;const D=h!==m;if(await B(),D){const V=a.value,L=ye(t.value);m?(c("MOUNT"),p("enter"),L==="none"&&p("after-enter")):L==="none"||L==="undefined"||((O=n.value)==null?void 0:O.display)==="none"?(c("UNMOUNT"),p("leave"),p("after-leave")):h&&V!==L?(c("ANIMATION_OUT"),p("leave")):(c("UNMOUNT"),p("after-leave"))}},{immediate:!0});const s=m=>{if(m.target!==t.value)return;const h=ye(t.value),D=h.includes(CSS.escape(m.animationName)),O=u.value==="mounted"?"enter":"leave";if(D&&(p(`after-${O}`),c("ANIMATION_END"),!o.value)){const V=t.value.style.animationFillMode;t.value.style.animationFillMode="forwards",l=i==null?void 0:i.setTimeout(()=>{var L;((L=t.value)==null?void 0:L.style.animationFillMode)==="forwards"&&(t.value.style.animationFillMode=V)})}h==="none"&&c("ANIMATION_END")},d=m=>{m.target===t.value&&(a.value=ye(t.value))},y=q(t,(m,h)=>{m?(n.value=getComputedStyle(m),m.addEventListener("animationstart",d),m.addEventListener("animationcancel",s),m.addEventListener("animationend",s)):(c("ANIMATION_END"),l!==void 0&&(i==null||i.clearTimeout(l)),h==null||h.removeEventListener("animationstart",d),h==null||h.removeEventListener("animationcancel",s),h==null||h.removeEventListener("animationend",s))},{immediate:!0}),g=q(u,()=>{const m=ye(t.value);a.value=u.value==="mounted"?m:"none"});return Oe(()=>{y(),g(),t.value&&(t.value.removeEventListener("animationstart",d),t.value.removeEventListener("animationcancel",s),t.value.removeEventListener("animationend",s)),l!==void 0&&(i==null||i.clearTimeout(l))}),{isPresent:_(()=>["mounted","unmountSuspended"].includes(u.value))}}function ye(e){return e&&getComputedStyle(e).animationName||"none"}var Te=C({name:"Presence",props:{present:{type:Boolean,required:!0},forceMount:{type:Boolean}},slots:{},setup(e,{slots:t,expose:n}){var c;const{present:a,forceMount:o}=oe(e),r=M(),{isPresent:l}=Cn(a,r);n({present:l});let i=t.default({present:l.value});i=Pe(i||[]);const u=K();if(i&&(i==null?void 0:i.length)>1){const p=(c=u==null?void 0:u.parent)!=null&&c.type.name?`<${u.parent.type.name} />`:"component";throw new Error([`Detected an invalid children for \`${p}\` for  \`Presence\` component.`,"","Note: Presence works similarly to `v-if` directly, but it waits for animation/transition to finished before unmounting. So it expect only one direct child of valid VNode type.","You can apply a few solutions:",["Provide a single child element so that `presence` directive attach correctly.","Ensure the first child is an actual element instead of a raw text node or comment node."].map(s=>`  - ${s}`).join(`
`)].join(`
`))}return()=>o.value||a.value||l.value?H(t.default({present:l.value})[0],{ref:p=>{const s=se(p);return typeof(s==null?void 0:s.hasAttribute)>"u"||(s!=null&&s.hasAttribute("data-reka-popper-content-wrapper")?r.value=s.firstElementChild:r.value=s),s}}):null}});const Ee=C({name:"PrimitiveSlot",inheritAttrs:!1,setup(e,{attrs:t,slots:n}){return()=>{var u;if(!n.default)return null;const a=Pe(n.default()),o=a.findIndex(c=>c.type!==wt);if(o===-1)return a;const r=a[o];(u=r.props)==null||delete u.ref;const l=r.props?R(t,r.props):t,i=_t({...r,props:{}},l);return a.length===1?i:(a[o]=i,a)}}}),In=["area","img","input"],$=C({name:"Primitive",inheritAttrs:!1,props:{asChild:{type:Boolean,default:!1},as:{type:[String,Object],default:"div"}},setup(e,{attrs:t,slots:n}){const a=e.asChild?"template":e.as;return typeof a=="string"&&In.includes(a)?()=>H(a,t):a!=="template"?()=>H(e.as,t,{default:n.default}):()=>H(Ee,t,{default:n.default})}});function $e(){const e=M(),t=_(()=>{var n,a;return["#text","#comment"].includes((n=e.value)==null?void 0:n.$el.nodeName)?(a=e.value)==null?void 0:a.$el.nextElementSibling:se(e)});return{primitiveElement:e,currentElement:t}}const[W,An]=re("DialogRoot");var En=C({inheritAttrs:!1,__name:"DialogRoot",props:{open:{type:Boolean,required:!1,default:void 0},defaultOpen:{type:Boolean,required:!1,default:!1},modal:{type:Boolean,required:!1,default:!0},unmountOnHide:{type:Boolean,required:!1,default:!0}},emits:["update:open"],setup(e,{emit:t}){const n=e,o=qe(n,"open",t,{defaultValue:n.defaultOpen,passive:n.open===void 0}),r=M(),l=M(),{modal:i,unmountOnHide:u}=oe(n);return An({open:o,modal:i,unmountOnHide:u,openModal:()=>{o.value=!0},onOpenChange:c=>{o.value=c},onOpenToggle:()=>{o.value=!o.value},contentId:"",titleId:"",descriptionId:"",triggerElement:r,contentElement:l}),(c,p)=>x(c.$slots,"default",{open:v(o),close:()=>o.value=!1})}}),xn=En,On=C({__name:"DialogClose",props:{asChild:{type:Boolean,required:!1},as:{type:null,required:!1,default:"button"}},setup(e){const t=e;S();const n=W();return(a,o)=>(A(),E(v($),R(t,{type:a.as==="button"?"button":void 0,onClick:o[0]||(o[0]=r=>v(n).onOpenChange(!1))}),{default:w(()=>[x(a.$slots,"default")]),_:3},16,["type"]))}}),qr=On;const Sn="dismissableLayer.pointerDownOutside",Dn="dismissableLayer.focusOutside";function it(e,t){if(!(t instanceof Element))return!1;if(e.contains(t))return!0;const n=t.closest("[data-dismissable-layer]"),a=e.dataset.dismissableLayer===""?e:e.querySelector("[data-dismissable-layer]"),o=Array.from(e.ownerDocument.querySelectorAll("[data-dismissable-layer]"));return!!(n&&(a===n||o.indexOf(a)<o.indexOf(n)))}function qn(e,t,n=!0){var l;const a=((l=t==null?void 0:t.value)==null?void 0:l.ownerDocument)??(globalThis==null?void 0:globalThis.document),o=M(!1),r=M(()=>{});return G(i=>{if(!U||!N(n))return;const u=async p=>{const s=p.target;if(!(!(t!=null&&t.value)||!s)){if(it(t.value,s)){a.removeEventListener("click",r.value),o.value=!1;return}if(p.target&&!o.value){let y=function(){nt(Sn,e,d)};const d={originalEvent:p};p.pointerType==="touch"?(a.removeEventListener("click",r.value),r.value=y,a.addEventListener("click",r.value,{once:!0})):y()}else a.removeEventListener("click",r.value);o.value=!1}},c=window.setTimeout(()=>{a.addEventListener("pointerdown",u)},0);i(()=>{window.clearTimeout(c),a.removeEventListener("pointerdown",u),a.removeEventListener("click",r.value)})}),{onPointerDownCapture:()=>{N(n)&&(o.value=!0)}}}function Pn(e,t,n=!0){var r;const a=((r=t==null?void 0:t.value)==null?void 0:r.ownerDocument)??(globalThis==null?void 0:globalThis.document),o=M(!1);return G(l=>{if(!U||!N(n))return;const i=async u=>{if(!(t!=null&&t.value))return;await B(),await B();const c=u.target;!t.value||!c||it(t.value,c)||u.target&&!o.value&&nt(Dn,e,{originalEvent:u})};a.addEventListener("focusin",i),l(()=>a.removeEventListener("focusin",i))}),{onFocusCapture:()=>{N(n)&&(o.value=!0)},onBlurCapture:()=>{N(n)&&(o.value=!1)}}}var Tn=C({__name:"DismissableLayer",props:{disableOutsidePointerEvents:{type:Boolean,required:!1,default:!1},asChild:{type:Boolean,required:!1},as:{type:null,required:!1},present:{type:Boolean,required:!1,default:!0}},emits:["escapeKeyDown","pointerDownOutside","focusOutside","interactOutside","dismiss"],setup(e,{emit:t}){const n=e,a=t,{forwardRef:o,currentElement:r}=S(),l=_(()=>{var y;return((y=r.value)==null?void 0:y.ownerDocument)??globalThis.document}),i=_(()=>T.layersRoot),u=_(()=>r.value?Array.from(i.value).indexOf(r.value):-1),c=_(()=>T.layersWithOutsidePointerEventsDisabled.size>0),p=_(()=>{const y=Array.from(i.value),[g]=[...T.layersWithOutsidePointerEventsDisabled].slice(-1),k=y.indexOf(g);return u.value>=k}),s=qn(async y=>{const g=[...T.branches].some(k=>k==null?void 0:k.contains(y.target));!n.present||!p.value||g||(a("pointerDownOutside",y),a("interactOutside",y),await B(),y.defaultPrevented||a("dismiss"))},r,()=>n.present),d=Pn(y=>{const g=[...T.branches].some(k=>k==null?void 0:k.contains(y.target));!n.present||g||(a("focusOutside",y),a("interactOutside",y),y.defaultPrevented||a("dismiss"))},r);return un("Escape",y=>{!n.present||!(u.value===i.value.size-1)||(a("escapeKeyDown",y),y.defaultPrevented||a("dismiss"))}),q([r,()=>n.disableOutsidePointerEvents,()=>n.present],([y,g,k],b,m)=>{!y||!k||g&&(T.layersWithOutsidePointerEventsDisabled.size===0&&(T.originalBodyPointerEvents=l.value.body.style.pointerEvents,l.value.body.style.pointerEvents="none"),T.layersWithOutsidePointerEventsDisabled.add(y),m(()=>{T.layersWithOutsidePointerEventsDisabled.delete(y),T.layersWithOutsidePointerEventsDisabled.size===0&&!Gt(T.originalBodyPointerEvents)&&(l.value.body.style.pointerEvents=T.originalBodyPointerEvents)}))},{immediate:!0}),q([r,()=>n.present],([y,g],k,b)=>{!y||!g||(i.value.add(y),b(()=>{i.value.delete(y)}))},{immediate:!0}),G(y=>{y(()=>{r.value&&(i.value.delete(r.value),T.layersWithOutsidePointerEventsDisabled.delete(r.value))})}),(y,g)=>(A(),E(v($),{ref:v(o),"as-child":y.asChild,as:y.as,"data-dismissable-layer":"",style:Qe({pointerEvents:c.value?p.value?"auto":"none":void 0}),onFocusCapture:v(d).onFocusCapture,onBlurCapture:v(d).onBlurCapture,onPointerdownCapture:v(s).onPointerDownCapture},{default:w(()=>[x(y.$slots,"default")]),_:3},8,["as-child","as","style","onFocusCapture","onBlurCapture","onPointerdownCapture"]))}}),Ln=Tn;const Fn=Yt(()=>M([]));function Bn(){const e=Fn();return{add(t){const n=e.value[0];t!==n&&(n==null||n.pause()),e.value=je(e.value,t),e.value.unshift(t)},remove(t){var n;e.value=je(e.value,t),(n=e.value[0])==null||n.resume()}}}function je(e,t){const n=[...e],a=n.indexOf(t);return a!==-1&&n.splice(a,1),n}const Me="focusScope.autoFocusOnMount",we="focusScope.autoFocusOnUnmount",ze={bubbles:!1,cancelable:!0};function Rn(e,{select:t=!1}={}){const n=F();for(const a of e)if(Z(a,{select:t}),F()!==n)return!0}function $n(e){const t=lt(e),n=Ne(t,e),a=Ne(t.reverse(),e);return[n,a]}function lt(e){const t=[],n=document.createTreeWalker(e,NodeFilter.SHOW_ELEMENT,{acceptNode:a=>{const o=a.tagName==="INPUT"&&a.type==="hidden";return a.disabled||a.hidden||o?NodeFilter.FILTER_SKIP:a.tabIndex>=0?NodeFilter.FILTER_ACCEPT:NodeFilter.FILTER_SKIP}});for(;n.nextNode();)t.push(n.currentNode);return t}function Ne(e,t){for(const n of e)if(!jn(n,{upTo:t}))return n}function jn(e,{upTo:t}){if(getComputedStyle(e).visibility==="hidden")return!0;for(;e;){if(t!==void 0&&e===t)return!1;if(getComputedStyle(e).display==="none")return!0;e=e.parentElement}return!1}function zn(e){return e instanceof HTMLInputElement&&"select"in e}function Z(e,{select:t=!1}={}){if(e&&e.focus){const n=F();e.focus({preventScroll:!0}),e!==n&&zn(e)&&t&&e.select()}}var Nn=C({__name:"FocusScope",props:{loop:{type:Boolean,required:!1,default:!1},trapped:{type:Boolean,required:!1,default:!1},present:{type:Boolean,required:!1,default:!0},asChild:{type:Boolean,required:!1},as:{type:null,required:!1}},emits:["mountAutoFocus","unmountAutoFocus"],setup(e,{emit:t}){const n=e,a=t,{currentRef:o,currentElement:r}=S(),l=M(null),i=Bn(),u=Je({paused:!1,pause(){this.paused=!0},resume(){this.paused=!1}});G(s=>{if(!U)return;const d=r.value;if(!n.trapped)return;function y(m){if(u.paused||!d)return;const h=m.target;d.contains(h)?l.value=h:Z(l.value,{select:!0})}function g(m){if(u.paused||!d)return;const h=m.relatedTarget;h!==null&&(d.contains(h)||Z(l.value,{select:!0}))}function k(m){const h=l.value;if(h===null||!m.some(L=>L.removedNodes.length>0))return;const O=F();if(O&&d.contains(O))return;d.contains(h)||Z(d)}document.addEventListener("focusin",y),document.addEventListener("focusout",g);const b=new MutationObserver(k);d&&b.observe(d,{childList:!0,subtree:!0}),s(()=>{document.removeEventListener("focusin",y),document.removeEventListener("focusout",g),b.disconnect()})});function c(s,d){const y=new CustomEvent(Me,ze),g=k=>a("mountAutoFocus",k);s.addEventListener(Me,g),s.dispatchEvent(y),s.removeEventListener(Me,g),y.defaultPrevented||(Rn(lt(s),{select:!0}),F()===d&&Z(s))}G(async s=>{const d=r.value;if(await B(),!d)return;n.present!==!1&&i.add(u);const y=F();!d.contains(y)&&n.present!==!1&&c(d,y),s(()=>{const k=new CustomEvent(we,ze),b=m=>{a("unmountAutoFocus",m)};d.addEventListener(we,b),d.dispatchEvent(k),d.setAttribute("data-focus-scope-unmounting",""),setTimeout(()=>{k.defaultPrevented||Z(y??document.body,{select:!0}),d.removeEventListener(we,b),i.remove(u),d.removeAttribute("data-focus-scope-unmounting")},0)})}),q(()=>n.present,async(s,d)=>{if(!U)return;if(s===!1&&d===!0){i.remove(u);return}if(s!==!0||d!==!1)return;i.add(u),await B();const y=r.value;if(!y)return;const g=F();y.contains(g)||c(y,g)});function p(s){if(!n.loop&&!n.trapped||u.paused)return;const d=s.key==="Tab"&&!s.altKey&&!s.ctrlKey&&!s.metaKey,y=F();if(d&&y){const g=s.currentTarget,[k,b]=$n(g);k&&b?!s.shiftKey&&y===b?(s.preventDefault(),n.loop&&Z(k,{select:!0})):s.shiftKey&&y===k&&(s.preventDefault(),n.loop&&Z(b,{select:!0})):y===g&&s.preventDefault()}}return(s,d)=>(A(),E(v($),{ref_key:"currentRef",ref:o,tabindex:"-1","as-child":s.asChild,as:s.as,onKeydown:p},{default:w(()=>[x(s.$slots,"default")]),_:3},8,["as-child","as"]))}}),Vn=Nn;function Hn(e){return e?"open":"closed"}var Un=C({__name:"DialogContentImpl",props:{forceMount:{type:Boolean,required:!1},trapFocus:{type:Boolean,required:!1},disableOutsidePointerEvents:{type:Boolean,required:!1},asChild:{type:Boolean,required:!1},as:{type:null,required:!1},present:{type:Boolean,required:!1}},emits:["escapeKeyDown","pointerDownOutside","focusOutside","interactOutside","openAutoFocus","closeAutoFocus"],setup(e,{emit:t}){const n=e,a=t,o=W(),{forwardRef:r,currentElement:l}=S();return o.titleId||(o.titleId=he(void 0,"reka-dialog-title")),o.descriptionId||(o.descriptionId=he(void 0,"reka-dialog-description")),ee(()=>{o.contentElement=l,F()!==document.body&&(o.triggerElement.value=F())}),(i,u)=>(A(),E(v(Vn),{"as-child":"",loop:"",trapped:n.trapFocus,present:n.present,onMountAutoFocus:u[5]||(u[5]=c=>a("openAutoFocus",c)),onUnmountAutoFocus:u[6]||(u[6]=c=>a("closeAutoFocus",c))},{default:w(()=>[J(v(Ln),R({id:v(o).contentId,ref:v(r),as:i.as,"as-child":i.asChild,present:n.present,"disable-outside-pointer-events":i.disableOutsidePointerEvents,role:"dialog","aria-describedby":v(o).descriptionId,"aria-labelledby":v(o).titleId,"data-state":v(Hn)(v(o).open.value)},i.$attrs,{onDismiss:u[0]||(u[0]=c=>v(o).onOpenChange(!1)),onEscapeKeyDown:u[1]||(u[1]=c=>a("escapeKeyDown",c)),onFocusOutside:u[2]||(u[2]=c=>a("focusOutside",c)),onInteractOutside:u[3]||(u[3]=c=>a("interactOutside",c)),onPointerDownOutside:u[4]||(u[4]=c=>a("pointerDownOutside",c))}),{default:w(()=>[x(i.$slots,"default")]),_:3},16,["id","as","as-child","present","disable-outside-pointer-events","aria-describedby","aria-labelledby","data-state"])]),_:3},8,["trapped","present"]))}}),ut=Un,Kn=C({__name:"DialogContentModal",props:{forceMount:{type:Boolean,required:!1},trapFocus:{type:Boolean,required:!1},disableOutsidePointerEvents:{type:Boolean,required:!1,default:!0},asChild:{type:Boolean,required:!1},as:{type:null,required:!1},present:{type:Boolean,required:!0}},emits:["escapeKeyDown","pointerDownOutside","focusOutside","interactOutside","openAutoFocus","closeAutoFocus"],setup(e,{emit:t}){const n=e,a=t,o=W(),r=ie(a),{forwardRef:l,currentElement:i}=S(),u=_(()=>n.present?i.value:void 0);wn(u);const c=_(()=>{const{present:p,...s}=n;return s});return q(()=>n.present,(p,s)=>{var d;!p&&s&&((d=o.triggerElement.value)==null||d.focus())}),(p,s)=>(A(),E(ut,R({...c.value,...v(r)},{ref:v(l),present:p.present,"trap-focus":v(o).open.value,"disable-outside-pointer-events":n.disableOutsidePointerEvents,onCloseAutoFocus:s[0]||(s[0]=d=>{var y;d.defaultPrevented||(d.preventDefault(),(y=v(o).triggerElement.value)==null||y.focus())}),onPointerDownOutside:s[1]||(s[1]=d=>{const y=d.detail.originalEvent,g=y.button===0&&y.ctrlKey===!0;(y.button===2||g)&&d.preventDefault()}),onFocusOutside:s[2]||(s[2]=d=>{d.preventDefault()})}),{default:w(()=>[x(p.$slots,"default")]),_:3},16,["present","trap-focus","disable-outside-pointer-events"]))}}),Wn=Kn,Zn=C({__name:"DialogContentNonModal",props:{forceMount:{type:Boolean,required:!1},trapFocus:{type:Boolean,required:!1},disableOutsidePointerEvents:{type:Boolean,required:!1},asChild:{type:Boolean,required:!1},as:{type:null,required:!1},present:{type:Boolean,required:!0}},emits:["escapeKeyDown","pointerDownOutside","focusOutside","interactOutside","openAutoFocus","closeAutoFocus"],setup(e,{emit:t}){const n=e,o=ie(t);S();const r=W(),l=M(!1),i=M(!1),u=_(()=>{const{present:c,...p}=n;return p});return q(()=>n.present,(c,p)=>{var s;!c&&p&&(l.value||(s=r.triggerElement.value)==null||s.focus(),l.value=!1,i.value=!1)}),(c,p)=>(A(),E(ut,R({...u.value,...v(o)},{present:c.present,"trap-focus":!1,"disable-outside-pointer-events":!1,onCloseAutoFocus:p[0]||(p[0]=s=>{var d;s.defaultPrevented||(l.value||(d=v(r).triggerElement.value)==null||d.focus(),s.preventDefault()),l.value=!1,i.value=!1}),onInteractOutside:p[1]||(p[1]=s=>{var g;s.defaultPrevented||(l.value=!0,s.detail.originalEvent.type==="pointerdown"&&(i.value=!0));const d=s.target;((g=v(r).triggerElement.value)==null?void 0:g.contains(d))&&s.preventDefault(),s.detail.originalEvent.type==="focusin"&&i.value&&s.preventDefault()})}),{default:w(()=>[x(c.$slots,"default")]),_:3},16,["present"]))}}),Gn=Zn,Jn=C({__name:"DialogContent",props:{forceMount:{type:Boolean,required:!1},disableOutsidePointerEvents:{type:Boolean,required:!1,default:void 0},asChild:{type:Boolean,required:!1},as:{type:null,required:!1}},emits:["escapeKeyDown","pointerDownOutside","focusOutside","interactOutside","openAutoFocus","closeAutoFocus"],setup(e,{emit:t}){const n=e,a=t,o=W(),r=ie(a),{forwardRef:l}=S(),i=_(()=>n.forceMount||!o.unmountOnHide.value);return(u,c)=>(A(),E(v(Te),{present:v(o).open.value,"force-mount":i.value},{default:w(({present:p})=>[v(o).modal.value?_e((A(),E(Wn,R({key:0,ref:v(l),present:i.value?p:!0},{...n,...v(r),...u.$attrs}),{default:w(()=>[x(u.$slots,"default")]),_:2},1040,["present"])),[[Ce,u.forceMount||v(o).unmountOnHide.value||p]]):_e((A(),E(Gn,R({key:1,ref:v(l),present:i.value?p:!0},{...n,...v(r),...u.$attrs}),{default:w(()=>[x(u.$slots,"default")]),_:2},1040,["present"])),[[Ce,u.forceMount||v(o).unmountOnHide.value||p]])]),_:3},8,["present","force-mount"]))}}),Yn=Jn,Qn=C({__name:"DialogDescription",props:{asChild:{type:Boolean,required:!1},as:{type:null,required:!1,default:"p"}},setup(e){const t=e;S();const n=W();return(a,o)=>(A(),E(v($),R(t,{id:v(n).descriptionId}),{default:w(()=>[x(a.$slots,"default")]),_:3},16,["id"]))}}),Xn=Qn,ea=C({__name:"DialogOverlayImpl",props:{asChild:{type:Boolean,required:!1},as:{type:null,required:!1},present:{type:Boolean,required:!1,default:!0}},setup(e){const t=e,n=W(),a=yn(t.present);return q(()=>t.present,o=>a.value=o),S(),(o,r)=>(A(),E(v($),{as:o.as,"as-child":o.asChild,"data-state":v(n).open.value?"open":"closed",style:{"pointer-events":"auto"},onPointerdown:r[0]||(r[0]=ve(()=>{},["left","self","prevent"]))},{default:w(()=>[x(o.$slots,"default")]),_:3},8,["as","as-child","data-state"]))}}),ta=ea,na=C({__name:"DialogOverlay",props:{forceMount:{type:Boolean,required:!1},asChild:{type:Boolean,required:!1},as:{type:null,required:!1}},setup(e){const t=e,n=W(),{forwardRef:a}=S(),o=_(()=>t.forceMount||!n.unmountOnHide.value);return(r,l)=>{var i;return(i=v(n))!=null&&i.modal.value?(A(),E(v(Te),{key:0,present:v(n).open.value,"force-mount":o.value},{default:w(({present:u})=>[_e(J(ta,R(r.$attrs,{ref:v(a),as:r.as,"as-child":r.asChild,present:o.value?u:!0}),{default:w(()=>[x(r.$slots,"default")]),_:2},1040,["as","as-child","present"]),[[Ce,r.forceMount||v(n).unmountOnHide.value||u]])]),_:3},8,["present","force-mount"])):Se("v-if",!0)}}}),aa=na,oa=C({__name:"Teleport",props:{to:{type:null,required:!1},disabled:{type:Boolean,required:!1},defer:{type:Boolean,required:!1},forceMount:{type:Boolean,required:!1}},setup(e){const t=e,n=me({}),a=_(()=>{var r;return t.to??((r=n.teleportTo)==null?void 0:r.value)??"body"}),o=sn();return(r,l)=>v(o)||r.forceMount?(A(),E(Ct,{key:0,to:a.value,disabled:r.disabled,defer:r.defer},[x(r.$slots,"default")],8,["to","disabled","defer"])):Se("v-if",!0)}}),ct=oa,ra=C({__name:"DialogPortal",props:{to:{type:null,required:!1},disabled:{type:Boolean,required:!1},defer:{type:Boolean,required:!1},forceMount:{type:Boolean,required:!1}},setup(e){const t=e;return(n,a)=>(A(),E(v(ct),te(ne(t)),{default:w(()=>[x(n.$slots,"default")]),_:3},16))}}),Pr=ra,sa=C({__name:"DialogTitle",props:{asChild:{type:Boolean,required:!1},as:{type:null,required:!1,default:"h2"}},setup(e){const t=e,n=W();return S(),(a,o)=>(A(),E(v($),R(t,{id:v(n).titleId}),{default:w(()=>[x(a.$slots,"default")]),_:3},16,["id"]))}}),ia=sa;const[Tr,la]=re("AlertDialogContent");var ua=C({__name:"AlertDialogContent",props:{forceMount:{type:Boolean,required:!1},disableOutsidePointerEvents:{type:Boolean,required:!1,default:void 0},asChild:{type:Boolean,required:!1},as:{type:null,required:!1}},emits:["escapeKeyDown","pointerDownOutside","focusOutside","interactOutside","openAutoFocus","closeAutoFocus"],setup(e,{emit:t}){const n=e,o=ie(t);S();const r=M();return la({onCancelElementChange:l=>{r.value=l}}),(l,i)=>(A(),E(v(Yn),R({...n,...v(o)},{role:"alertdialog",onPointerDownOutside:i[0]||(i[0]=ve(()=>{},["prevent"])),onInteractOutside:i[1]||(i[1]=ve(()=>{},["prevent"])),onOpenAutoFocus:i[2]||(i[2]=()=>{B(()=>{var u;(u=r.value)==null||u.focus({preventScroll:!0})})})}),{default:w(()=>[x(l.$slots,"default")]),_:3},16))}}),Lr=ua,ca=C({__name:"AlertDialogDescription",props:{asChild:{type:Boolean,required:!1},as:{type:null,required:!1,default:"p"}},setup(e){const t=e;return S(),(n,a)=>(A(),E(v(Xn),te(ne(t)),{default:w(()=>[x(n.$slots,"default")]),_:3},16))}}),Fr=ca,da=C({__name:"AlertDialogOverlay",props:{forceMount:{type:Boolean,required:!1},asChild:{type:Boolean,required:!1},as:{type:null,required:!1}},setup(e){const t=e;return S(),(n,a)=>(A(),E(v(aa),te(ne(t)),{default:w(()=>[x(n.$slots,"default")]),_:3},16))}}),Br=da,pa=C({__name:"AlertDialogPortal",props:{to:{type:null,required:!1},disabled:{type:Boolean,required:!1},defer:{type:Boolean,required:!1},forceMount:{type:Boolean,required:!1}},setup(e){const t=e;return(n,a)=>(A(),E(v(ct),te(ne(t)),{default:w(()=>[x(n.$slots,"default")]),_:3},16))}}),Rr=pa,fa=C({__name:"AlertDialogRoot",props:{open:{type:Boolean,required:!1},defaultOpen:{type:Boolean,required:!1},unmountOnHide:{type:Boolean,required:!1}},emits:["update:open"],setup(e,{emit:t}){const o=mn(e,t);return S(),(r,l)=>(A(),E(v(xn),R(v(o),{modal:!0}),{default:w(i=>[x(r.$slots,"default",te(ne(i)))]),_:3},16))}}),$r=fa,ya=C({__name:"AlertDialogTitle",props:{asChild:{type:Boolean,required:!1},as:{type:null,required:!1,default:"h2"}},setup(e){const t=e;return S(),(n,a)=>(A(),E(v(ia),te(ne(t)),{default:w(()=>[x(n.$slots,"default")]),_:3},16))}}),jr=ya;const Ve="data-reka-collection-item";function dt(e={}){const{key:t="",isProvider:n=!1}=e,a=`${t}CollectionProvider`;let o;if(n){const s=M(new Map);o={collectionRef:M(),itemMap:s},We(a,o)}else o=Ke(a);const r=(s,d=!1)=>{if(!o.collectionRef.value)return;const y=o.itemMap.value.get(s);return y&&(d||y.ref.dataset.disabled!=="")?y:void 0},l=(s=!1)=>{const d=o.collectionRef.value;if(!d)return[];const y=Array.from(d.querySelectorAll(`[${Ve}]`)),g=new Map(y.map((m,h)=>[m,h])),b=Array.from(o.itemMap.value.values()).sort((m,h)=>(g.get(m.ref)??-1)-(g.get(h.ref)??-1));return s?b:b.filter(m=>m.ref.dataset.disabled!=="")},i=C({name:"CollectionSlot",inheritAttrs:!1,setup(s,{slots:d,attrs:y}){const{primitiveElement:g,currentElement:k}=$e();return q(k,()=>{o.collectionRef.value=k.value}),()=>H(Ee,{ref:g,...y},d)}}),u=C({name:"CollectionItem",inheritAttrs:!1,props:{value:{validator:()=>!0}},setup(s,{slots:d,attrs:y}){const{primitiveElement:g,currentElement:k}=$e();return G(b=>{if(k.value){const m=It(k.value);o.itemMap.value.set(m,{ref:k.value,value:s.value}),b(()=>o.itemMap.value.delete(m))}}),()=>H(Ee,{...y,[Ve]:"",ref:g},d)}}),c=_(()=>Array.from(o.itemMap.value.values())),p=_(()=>o.itemMap.value.size);return{getItems:l,getItem:r,reactiveItems:c,itemMapSize:p,CollectionSlot:i,CollectionItem:u}}const va="rovingFocusGroup.onEntryFocus",ha={bubbles:!1,cancelable:!0},ma={ArrowLeft:"prev",ArrowUp:"prev",ArrowRight:"next",ArrowDown:"next",PageUp:"first",Home:"first",PageDown:"last",End:"last"};function ga(e,t){return t!=="rtl"?e:e==="ArrowLeft"?"ArrowRight":e==="ArrowRight"?"ArrowLeft":e}function ka(e,t,n){const a=ga(e.key,n);if(!(t==="vertical"&&["ArrowLeft","ArrowRight"].includes(a))&&!(t==="horizontal"&&["ArrowUp","ArrowDown"].includes(a)))return ma[a]}function pt(e,t=!1){const n=F();for(const a of e)if(a===n||(a.focus({preventScroll:t}),F()!==n))return}function ba(e,t){return e.map((n,a)=>e[(t+a)%e.length])}const[Ma,wa]=re("RovingFocusGroup");var _a=C({__name:"RovingFocusGroup",props:{orientation:{type:String,required:!1,default:void 0},dir:{type:String,required:!1},loop:{type:Boolean,required:!1,default:!1},currentTabStopId:{type:[String,null],required:!1},defaultCurrentTabStopId:{type:String,required:!1},preventScrollOnEntryFocus:{type:Boolean,required:!1,default:!1},asChild:{type:Boolean,required:!1},as:{type:null,required:!1}},emits:["entryFocus","update:currentTabStopId"],setup(e,{expose:t,emit:n}){const a=e,o=n,{loop:r,orientation:l,dir:i}=oe(a),u=rt(i),c=qe(a,"currentTabStopId",o,{defaultValue:a.defaultCurrentTabStopId,passive:a.currentTabStopId===void 0}),p=M(!1),s=M(!1),d=M(0),{getItems:y,CollectionSlot:g}=dt({isProvider:!0});function k(m){const h=!s.value;if(m.currentTarget&&m.target===m.currentTarget&&h&&!p.value){const D=new CustomEvent(va,ha);if(m.currentTarget.dispatchEvent(D),o("entryFocus",D),!D.defaultPrevented){const O=y().map(j=>j.ref).filter(j=>j.dataset.disabled!==""),V=O.find(j=>j.getAttribute("data-active")===""),L=O.find(j=>j.getAttribute("data-highlighted")===""),le=O.find(j=>j.id===c.value),Y=[V,L,le,...O].filter(Boolean);pt(Y,a.preventScrollOnEntryFocus)}}s.value=!1}function b(){setTimeout(()=>{s.value=!1},1)}return t({getItems:y}),wa({loop:r,dir:u,orientation:l,currentTabStopId:c,onItemFocus:m=>{c.value=m},onItemShiftTab:()=>{p.value=!0},onFocusableItemAdd:()=>{d.value++},onFocusableItemRemove:()=>{d.value--}}),(m,h)=>(A(),E(v(g),null,{default:w(()=>[J(v($),{tabindex:p.value||d.value===0?-1:0,"data-orientation":v(l),as:m.as,"as-child":m.asChild,dir:v(u),style:{outline:"none"},onMousedown:h[0]||(h[0]=D=>s.value=!0),onMouseup:b,onFocus:k,onBlur:h[1]||(h[1]=D=>p.value=!1)},{default:w(()=>[x(m.$slots,"default")]),_:3},8,["tabindex","data-orientation","as","as-child","dir"])]),_:3}))}}),Ca=_a,Ia=C({__name:"RovingFocusItem",props:{tabStopId:{type:String,required:!1},focusable:{type:Boolean,required:!1,default:!0},active:{type:Boolean,required:!1},allowShiftKey:{type:Boolean,required:!1},asChild:{type:Boolean,required:!1},as:{type:null,required:!1,default:"span"}},setup(e){const t=e,n=Ma(),a=he(),o=_(()=>t.tabStopId||a),r=_(()=>n.currentTabStopId.value===o.value),{getItems:l,CollectionItem:i}=dt();ee(()=>{t.focusable&&n.onFocusableItemAdd()}),Oe(()=>{t.focusable&&n.onFocusableItemRemove()}),q(()=>t.focusable,(c,p)=>{c!==p&&(c?n.onFocusableItemAdd():n.onFocusableItemRemove())});function u(c){if(c.key==="Tab"&&c.shiftKey){n.onItemShiftTab();return}if(c.target!==c.currentTarget)return;const p=ka(c,n.orientation.value,n.dir.value);if(p!==void 0){if(c.metaKey||c.ctrlKey||c.altKey||!t.allowShiftKey&&c.shiftKey)return;c.preventDefault();let s=[...l().map(d=>d.ref).filter(d=>d.dataset.disabled!=="")];if(p==="last")s.reverse();else if(p==="prev"||p==="next"){p==="prev"&&s.reverse();const d=s.indexOf(c.currentTarget);s=n.loop.value?ba(s,d+1):s.slice(d+1)}B(()=>pt(s))}}return(c,p)=>(A(),E(v(i),null,{default:w(()=>[J(v($),{tabindex:r.value?0:-1,"data-orientation":v(n).orientation.value,"data-active":c.active?"":void 0,"data-disabled":c.focusable?void 0:"",as:c.as,"as-child":c.asChild,onMousedown:p[0]||(p[0]=s=>{c.focusable?v(n).onItemFocus(o.value):s.preventDefault()}),onFocus:p[1]||(p[1]=s=>v(n).onItemFocus(o.value)),onKeydown:u},{default:w(()=>[x(c.$slots,"default")]),_:3},8,["tabindex","data-orientation","data-active","data-disabled","as","as-child"])]),_:3}))}}),Aa=Ia;const[Le,Ea]=re("TabsRoot");var xa=C({__name:"TabsRoot",props:{defaultValue:{type:null,required:!1},orientation:{type:String,required:!1,default:"horizontal"},dir:{type:String,required:!1},activationMode:{type:String,required:!1,default:"automatic"},modelValue:{type:null,required:!1},unmountOnHide:{type:Boolean,required:!1,default:!0},asChild:{type:Boolean,required:!1},as:{type:null,required:!1}},emits:["update:modelValue"],setup(e,{emit:t}){const n=e,a=t,{orientation:o,unmountOnHide:r,dir:l}=oe(n),i=rt(l);S();const u=qe(n,"modelValue",a,{defaultValue:n.defaultValue,passive:n.modelValue===void 0}),c=M(),p=xe(new Set);return Ea({modelValue:u,changeModelValue:s=>{u.value=s},orientation:o,dir:i,unmountOnHide:r,activationMode:n.activationMode,baseId:he(void 0,"reka-tabs"),tabsList:c,contentIds:p,registerContent:s=>{p.value=new Set([...p.value,s])},unregisterContent:s=>{const d=new Set(p.value);d.delete(s),p.value=d}}),(s,d)=>(A(),E(v($),{dir:v(i),"data-orientation":v(o),"as-child":s.asChild,as:s.as},{default:w(()=>[x(s.$slots,"default",{modelValue:v(u)})]),_:3},8,["dir","data-orientation","as-child","as"]))}}),zr=xa;function ft(e,t){return`${e}-trigger-${t}`}function yt(e,t){return`${e}-content-${t}`}var Oa=C({__name:"TabsContent",props:{value:{type:[String,Number],required:!0},forceMount:{type:Boolean,required:!1},asChild:{type:Boolean,required:!1},as:{type:null,required:!1}},setup(e){const t=e,{forwardRef:n}=S(),a=Le(),o=_(()=>ft(a.baseId,t.value)),r=_(()=>yt(a.baseId,t.value)),l=_(()=>t.value===a.modelValue.value),i=M(l.value);return ee(()=>{a.registerContent(t.value),requestAnimationFrame(()=>{i.value=!1})}),Ze(()=>{a.unregisterContent(t.value)}),(u,c)=>(A(),E(v(Te),{present:u.forceMount||l.value,"force-mount":""},{default:w(({present:p})=>[J(v($),{id:r.value,ref:v(n),"as-child":u.asChild,as:u.as,role:"tabpanel","data-state":l.value?"active":"inactive","data-orientation":v(a).orientation.value,"aria-labelledby":o.value,hidden:!p,tabindex:"0",style:Qe({animationDuration:i.value?"0s":void 0})},{default:w(()=>[!v(a).unmountOnHide.value||p?x(u.$slots,"default",{key:0}):Se("v-if",!0)]),_:2},1032,["id","as-child","as","data-state","data-orientation","aria-labelledby","hidden","style"])]),_:3},8,["present"]))}}),Nr=Oa,Sa=C({__name:"TabsList",props:{loop:{type:Boolean,required:!1,default:!0},asChild:{type:Boolean,required:!1},as:{type:null,required:!1}},setup(e){const t=e,{loop:n}=oe(t),{forwardRef:a,currentElement:o}=S(),r=Le();return r.tabsList=o,(l,i)=>(A(),E(v(Ca),{"as-child":"",orientation:v(r).orientation.value,dir:v(r).dir.value,loop:v(n)},{default:w(()=>[J(v($),{ref:v(a),role:"tablist","as-child":l.asChild,as:l.as,"aria-orientation":v(r).orientation.value},{default:w(()=>[x(l.$slots,"default")]),_:3},8,["as-child","as","aria-orientation"])]),_:3},8,["orientation","dir","loop"]))}}),Vr=Sa,Da=C({__name:"TabsTrigger",props:{value:{type:[String,Number],required:!0},disabled:{type:Boolean,required:!1,default:!1},asChild:{type:Boolean,required:!1},as:{type:null,required:!1,default:"button"}},setup(e){const t=e,{forwardRef:n}=S(),a=Le(),o=_(()=>ft(a.baseId,t.value)),r=_(()=>a.contentIds.value.has(t.value)?yt(a.baseId,t.value):void 0),l=_(()=>t.value===a.modelValue.value);return(i,u)=>(A(),E(v(Aa),{"as-child":"",focusable:!i.disabled,active:l.value},{default:w(()=>[J(v($),{id:o.value,ref:v(n),role:"tab",type:i.as==="button"?"button":void 0,as:i.as,"as-child":i.asChild,"aria-selected":l.value?"true":"false","aria-controls":r.value,"data-state":l.value?"active":"inactive",disabled:i.disabled,"data-disabled":i.disabled?"":void 0,"data-orientation":v(a).orientation.value,onMousedown:u[0]||(u[0]=ve(c=>{!i.disabled&&c.ctrlKey===!1?v(a).changeModelValue(i.value):c.preventDefault()},["left"])),onKeydown:u[1]||(u[1]=At(c=>v(a).changeModelValue(i.value),["enter","space"])),onFocus:u[2]||(u[2]=()=>{const c=v(a).activationMode!=="manual";!l.value&&!i.disabled&&c&&v(a).changeModelValue(i.value)})},{default:w(()=>[x(i.$slots,"default")]),_:3},8,["id","type","as","as-child","aria-selected","aria-controls","data-state","disabled","data-disabled","data-orientation"])]),_:3},8,["focusable","active"]))}}),Hr=Da;export{no as $,Rr as A,Ua as B,so as C,Xo as D,mo as E,bo as F,Ha as G,_o as H,ur as I,ja as J,Ao as K,qo as L,Fo as M,br as N,Lo as O,Ko as P,co as Q,Jo as R,fr as S,kr as T,Ar as U,ho as V,xr as W,Sr as X,cr as Y,nr as Z,Ro as _,Ta as a,vo as a$,ao as a0,uo as a1,Po as a2,Va as a3,jo as a4,Ga as a5,eo as a6,Vo as a7,Qo as a8,Bo as a9,Co as aA,zo as aB,Mr as aC,_r as aD,mr as aE,vr as aF,Fa as aG,Na as aH,Ba as aI,za as aJ,Vr as aK,Hr as aL,Nr as aM,Eo as aN,zr as aO,Uo as aP,Ra as aQ,Ja as aR,Go as aS,yo as aT,Mo as aU,Or as aV,Cr as aW,oo as aX,to as aY,$o as aZ,wo as a_,Pr as aa,aa as ab,Yn as ac,ia as ad,Xn as ae,qr as af,xn as ag,Zo as ah,Yo as ai,Dr as aj,ko as ak,Pa as al,Qa as am,yr as an,No as ao,Ya as ap,po as aq,er as ar,dr as as,pr as at,Oo as au,lo as av,Wo as aw,tr as ax,gr as ay,lr as az,xo as b,fo as b0,Za as b1,Io as b2,or as b3,wr as b4,ir as c,To as d,Ka as e,Er as f,Wa as g,Br as h,Lr as i,jr as j,Fr as k,$r as l,io as m,hr as n,Ir as o,So as p,go as q,ro as r,Do as s,sr as t,La as u,Xa as v,$a as w,ar as x,rr as y,Ho as z};
