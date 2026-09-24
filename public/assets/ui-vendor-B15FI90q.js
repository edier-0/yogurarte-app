import{r as M,w as D,u as v,o as ee,n as j,g as Ne,a as ze,b as dt,c as Z,d as G,s as Ie,e as w,h as V,i as He,p as Ve,f as Ue,j as Ke,t as N,F as ft,k as We,l as pt,m as yt,q as vt,v as ht,x as _e,y as mt,z as _,A as ne,C as gt,B as z,D as kt,E as S,G as E,H as x,I,J as Ze,K as J,L as ke,M as be,N as Ge,O as Ee,T as bt,P as Mt,Q as wt,R as Ct,S as It}from"./vue-vendor-BrEKm0by.js";function Je(e){return Ne()?(ze(e),!0):!1}function X(e){return typeof e=="function"?e():v(e)}const _t=typeof window<"u"&&typeof document<"u";typeof WorkerGlobalScope<"u"&&globalThis instanceof WorkerGlobalScope;const Et=Object.prototype.toString,xt=e=>Et.call(e)==="[object Object]",Me=()=>{};function Ye(e,t){function n(...a){return new Promise((o,r)=>{Promise.resolve(e(()=>t.apply(this,a),{fn:t,thisArg:this,args:a})).then(o).catch(r)})}return n}const Qe=e=>e();function St(e,t={}){let n,a,o=Me;const r=i=>{clearTimeout(i),o(),o=Me};return i=>{const d=X(e),l=X(t.maxWait);return n&&r(n),d<=0||l!==void 0&&l<=0?(a&&(r(a),a=null),Promise.resolve(i())):new Promise((f,s)=>{o=t.rejectOnCancel?s:f,l&&!a&&(a=setTimeout(()=>{n&&r(n),a=null,f(i())},l)),n=setTimeout(()=>{a&&r(a),a=null,f(i())},d)})}}function At(e=Qe){const t=M(!0);function n(){t.value=!1}function a(){t.value=!0}const o=(...r)=>{t.value&&e(...r)};return{isActive:dt(t),pause:n,resume:a,eventFilter:o}}function Ot(e){return Z()}function Dt(e,t=200,n={}){return Ye(St(t,n),e)}function ga(e,t=200,n={}){const a=M(e.value),o=Dt(()=>{a.value=e.value},t,n);return D(e,()=>o()),a}function Tt(e,t,n={}){const{eventFilter:a=Qe,...o}=n;return D(e,Ye(a,t),o)}function Pt(e,t,n={}){const{eventFilter:a,...o}=n,{eventFilter:r,pause:c,resume:i,isActive:d}=At(a);return{stop:Tt(e,t,{...o,eventFilter:r}),pause:c,resume:i,isActive:d}}function qt(e,t=!0,n){Ot()?ee(e,n):t?e():j(e)}const te=_t?window:void 0;function Lt(e){var t;const n=X(e);return(t=n==null?void 0:n.$el)!=null?t:n}function Pe(...e){let t,n,a,o;if(typeof e[0]=="string"||Array.isArray(e[0])?([n,a,o]=e,t=te):[t,n,a,o]=e,!t)return Me;Array.isArray(n)||(n=[n]),Array.isArray(a)||(a=[a]);const r=[],c=()=>{r.forEach(f=>f()),r.length=0},i=(f,s,u,p)=>(f.addEventListener(s,u,p),()=>f.removeEventListener(s,u,p)),d=D(()=>[Lt(t),X(o)],([f,s])=>{if(c(),!f)return;const u=xt(s)?{...s}:s;r.push(...n.flatMap(p=>a.map(g=>i(f,p,g,u))))},{immediate:!0,flush:"post"}),l=()=>{d(),c()};return Je(l),l}function Ft(){const e=M(!1),t=Z();return t&&ee(()=>{e.value=!0},t),e}function Bt(e){const t=Ft();return w(()=>(t.value,!!e()))}function Rt(e,t={}){const{window:n=te}=t,a=Bt(()=>n&&"matchMedia"in n&&typeof n.matchMedia=="function");let o;const r=M(!1),c=l=>{r.value=l.matches},i=()=>{o&&("removeEventListener"in o?o.removeEventListener("change",c):o.removeListener(c))},d=G(()=>{a.value&&(i(),o=n.matchMedia(X(e)),"addEventListener"in o?o.addEventListener("change",c):o.addListener(c),r.value=o.matches)});return Je(()=>{d(),i(),o=void 0}),r}const re=typeof globalThis<"u"?globalThis:typeof window<"u"?window:typeof global<"u"?global:typeof self<"u"?self:{},se="__vueuse_ssr_handlers__",$t=jt();function jt(){return se in re||(re[se]=re[se]||{}),re[se]}function Nt(e,t){return $t[e]||t}function ka(e){return Rt("(prefers-color-scheme: dark)",e)}function zt(e){return e==null?"any":e instanceof Set?"set":e instanceof Map?"map":e instanceof Date?"date":typeof e=="boolean"?"boolean":typeof e=="string"?"string":typeof e=="object"?"object":Number.isNaN(e)?"any":"number"}const Ht={boolean:{read:e=>e==="true",write:e=>String(e)},object:{read:e=>JSON.parse(e),write:e=>JSON.stringify(e)},number:{read:e=>Number.parseFloat(e),write:e=>String(e)},any:{read:e=>e,write:e=>String(e)},string:{read:e=>e,write:e=>String(e)},map:{read:e=>new Map(JSON.parse(e)),write:e=>JSON.stringify(Array.from(e.entries()))},set:{read:e=>new Set(JSON.parse(e)),write:e=>JSON.stringify(Array.from(e))},date:{read:e=>new Date(e),write:e=>e.toISOString()}},qe="vueuse-storage";function Vt(e,t,n,a={}){var o;const{flush:r="pre",deep:c=!0,listenToStorageChanges:i=!0,writeDefaults:d=!0,mergeDefaults:l=!1,shallow:f,window:s=te,eventFilter:u,onError:p=C=>{console.error(C)},initOnMounted:g}=a,k=(f?Ie:M)(t);if(!n)try{n=Nt("getDefaultStorage",()=>{var C;return(C=te)==null?void 0:C.localStorage})()}catch(C){p(C)}if(!n)return k;const b=X(t),m=zt(b),h=(o=a.serializer)!=null?o:Ht[m],{pause:O,resume:A}=Pt(k,()=>L(k.value),{flush:r,deep:c,eventFilter:u});s&&i&&qt(()=>{n instanceof Storage?Pe(s,"storage",Y):Pe(s,qe,R),g&&Y()}),g||Y();function H(C,T){if(s){const $={key:e,oldValue:C,newValue:T,storageArea:n};s.dispatchEvent(n instanceof Storage?new StorageEvent("storage",$):new CustomEvent(qe,{detail:$}))}}function L(C){try{const T=n.getItem(e);if(C==null)H(T,null),n.removeItem(e);else{const $=h.write(C);T!==$&&(n.setItem(e,$),H(T,$))}}catch(T){p(T)}}function oe(C){const T=C?C.newValue:n.getItem(e);if(T==null)return d&&b!=null&&n.setItem(e,h.write(b)),b;if(!C&&l){const $=h.read(T);return typeof l=="function"?l($,b):m==="object"&&!Array.isArray($)?{...b,...$}:$}else return typeof T!="string"?T:h.read(T)}function Y(C){if(!(C&&C.storageArea!==n)){if(C&&C.key==null){k.value=b;return}if(!(C&&C.key!==e)){O();try{(C==null?void 0:C.newValue)!==h.write(k.value)&&(k.value=oe(C))}catch(T){p(T)}finally{C?j(A):A()}}}}function R(C){Y(C.detail)}return k}function ba(e,t,n={}){const{window:a=te}=n;return Vt(e,t,a==null?void 0:a.localStorage,n)}/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ut=e=>e.replace(/([a-z0-9])([A-Z])/g,"$1-$2").toLowerCase();/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */var ie={xmlns:"http://www.w3.org/2000/svg",width:24,height:24,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor","stroke-width":2,"stroke-linecap":"round","stroke-linejoin":"round"};/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Kt=({size:e,strokeWidth:t=2,absoluteStrokeWidth:n,color:a,iconNode:o,name:r,class:c,...i},{slots:d})=>V("svg",{...ie,width:e||ie.width,height:e||ie.height,stroke:a||ie.stroke,"stroke-width":n?Number(t)*24/Number(e):t,class:["lucide",`lucide-${Ut(r??"icon")}`],...i},[...o.map(l=>V(...l)),...d.default?[d.default()]:[]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const y=(e,t)=>(n,{slots:a})=>V(Kt,{...n,iconNode:t,name:e},a);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ma=y("ArchiveIcon",[["rect",{width:"20",height:"5",x:"2",y:"3",rx:"1",key:"1wp1u1"}],["path",{d:"M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8",key:"1s80jp"}],["path",{d:"M10 12h4",key:"a56b0p"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const wa=y("ArrowDownLeftIcon",[["path",{d:"M17 7 7 17",key:"15tmo1"}],["path",{d:"M17 17H7V7",key:"1org7z"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ca=y("ArrowLeftRightIcon",[["path",{d:"M8 3 4 7l4 4",key:"9rb6wj"}],["path",{d:"M4 7h16",key:"6tx8e3"}],["path",{d:"m16 21 4-4-4-4",key:"siv7j2"}],["path",{d:"M20 17H4",key:"h6l3hr"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ia=y("ArrowLeftIcon",[["path",{d:"m12 19-7-7 7-7",key:"1l729n"}],["path",{d:"M19 12H5",key:"x3x0zl"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const _a=y("ArrowRightIcon",[["path",{d:"M5 12h14",key:"1ays0h"}],["path",{d:"m12 5 7 7-7 7",key:"xquz4c"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ea=y("ArrowUpDownIcon",[["path",{d:"m21 16-4 4-4-4",key:"f6ql7i"}],["path",{d:"M17 20V4",key:"1ejh1v"}],["path",{d:"m3 8 4-4 4 4",key:"11wl7u"}],["path",{d:"M7 4v16",key:"1glfcx"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const xa=y("ArrowUpRightIcon",[["path",{d:"M7 7h10v10",key:"1tivn9"}],["path",{d:"M7 17 17 7",key:"1vkiza"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Sa=y("BadgeDollarSignIcon",[["path",{d:"M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z",key:"3c2336"}],["path",{d:"M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8",key:"1h4pet"}],["path",{d:"M12 18V6",key:"zqpxq5"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Aa=y("BanknoteIcon",[["rect",{width:"20",height:"12",x:"2",y:"6",rx:"2",key:"9lu3g6"}],["circle",{cx:"12",cy:"12",r:"2",key:"1c9p78"}],["path",{d:"M6 12h.01M18 12h.01",key:"113zkx"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Oa=y("BikeIcon",[["circle",{cx:"18.5",cy:"17.5",r:"3.5",key:"15x4ox"}],["circle",{cx:"5.5",cy:"17.5",r:"3.5",key:"1noe27"}],["circle",{cx:"15",cy:"5",r:"1",key:"19l28e"}],["path",{d:"M12 17.5V14l-3-3 4-3 2 3h2",key:"1npguv"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Da=y("BoxesIcon",[["path",{d:"M2.97 12.92A2 2 0 0 0 2 14.63v3.24a2 2 0 0 0 .97 1.71l3 1.8a2 2 0 0 0 2.06 0L12 19v-5.5l-5-3-4.03 2.42Z",key:"lc1i9w"}],["path",{d:"m7 16.5-4.74-2.85",key:"1o9zyk"}],["path",{d:"m7 16.5 5-3",key:"va8pkn"}],["path",{d:"M7 16.5v5.17",key:"jnp8gn"}],["path",{d:"M12 13.5V19l3.97 2.38a2 2 0 0 0 2.06 0l3-1.8a2 2 0 0 0 .97-1.71v-3.24a2 2 0 0 0-.97-1.71L17 10.5l-5 3Z",key:"8zsnat"}],["path",{d:"m17 16.5-5-3",key:"8arw3v"}],["path",{d:"m17 16.5 4.74-2.85",key:"8rfmw"}],["path",{d:"M17 16.5v5.17",key:"k6z78m"}],["path",{d:"M7.97 4.42A2 2 0 0 0 7 6.13v4.37l5 3 5-3V6.13a2 2 0 0 0-.97-1.71l-3-1.8a2 2 0 0 0-2.06 0l-3 1.8Z",key:"1xygjf"}],["path",{d:"M12 8 7.26 5.15",key:"1vbdud"}],["path",{d:"m12 8 4.74-2.85",key:"3rx089"}],["path",{d:"M12 13.5V8",key:"1io7kd"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ta=y("BriefcaseIcon",[["path",{d:"M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16",key:"jecpp"}],["rect",{width:"20",height:"14",x:"2",y:"6",rx:"2",key:"i6l2r4"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Pa=y("BuildingIcon",[["rect",{width:"16",height:"20",x:"4",y:"2",rx:"2",ry:"2",key:"76otgf"}],["path",{d:"M9 22v-4h6v4",key:"r93iot"}],["path",{d:"M8 6h.01",key:"1dz90k"}],["path",{d:"M16 6h.01",key:"1x0f13"}],["path",{d:"M12 6h.01",key:"1vi96p"}],["path",{d:"M12 10h.01",key:"1nrarc"}],["path",{d:"M12 14h.01",key:"1etili"}],["path",{d:"M16 10h.01",key:"1m94wz"}],["path",{d:"M16 14h.01",key:"1gbofw"}],["path",{d:"M8 10h.01",key:"19clt8"}],["path",{d:"M8 14h.01",key:"6423bh"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const qa=y("CalendarCheckIcon",[["path",{d:"M8 2v4",key:"1cmpym"}],["path",{d:"M16 2v4",key:"4m81vk"}],["rect",{width:"18",height:"18",x:"3",y:"4",rx:"2",key:"1hopcy"}],["path",{d:"M3 10h18",key:"8toen8"}],["path",{d:"m9 16 2 2 4-4",key:"19s6y9"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const La=y("CalendarRangeIcon",[["rect",{width:"18",height:"18",x:"3",y:"4",rx:"2",key:"1hopcy"}],["path",{d:"M16 2v4",key:"4m81vk"}],["path",{d:"M3 10h18",key:"8toen8"}],["path",{d:"M8 2v4",key:"1cmpym"}],["path",{d:"M17 14h-6",key:"bkmgh3"}],["path",{d:"M13 18H7",key:"bb0bb7"}],["path",{d:"M7 14h.01",key:"1qa3f1"}],["path",{d:"M17 18h.01",key:"1bdyru"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Fa=y("CalendarIcon",[["path",{d:"M8 2v4",key:"1cmpym"}],["path",{d:"M16 2v4",key:"4m81vk"}],["rect",{width:"18",height:"18",x:"3",y:"4",rx:"2",key:"1hopcy"}],["path",{d:"M3 10h18",key:"8toen8"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ba=y("CheckCheckIcon",[["path",{d:"M18 6 7 17l-5-5",key:"116fxf"}],["path",{d:"m22 10-7.5 7.5L13 16",key:"ke71qq"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ra=y("CheckIcon",[["path",{d:"M20 6 9 17l-5-5",key:"1gmf2c"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const $a=y("ChefHatIcon",[["path",{d:"M17 21a1 1 0 0 0 1-1v-5.35c0-.457.316-.844.727-1.041a4 4 0 0 0-2.134-7.589 5 5 0 0 0-9.186 0 4 4 0 0 0-2.134 7.588c.411.198.727.585.727 1.041V20a1 1 0 0 0 1 1Z",key:"1qvrer"}],["path",{d:"M6 17h12",key:"1jwigz"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ja=y("ChevronDownIcon",[["path",{d:"m6 9 6 6 6-6",key:"qrunsl"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Na=y("ChevronRightIcon",[["path",{d:"m9 18 6-6-6-6",key:"mthhwq"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const za=y("ChevronUpIcon",[["path",{d:"m18 15-6-6-6 6",key:"153udz"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ha=y("CircleAlertIcon",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["line",{x1:"12",x2:"12",y1:"8",y2:"12",key:"1pkeuh"}],["line",{x1:"12",x2:"12.01",y1:"16",y2:"16",key:"4dfq90"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Va=y("CircleCheckIcon",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["path",{d:"m9 12 2 2 4-4",key:"dzmm74"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ua=y("CircleHelpIcon",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["path",{d:"M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3",key:"1u773s"}],["path",{d:"M12 17h.01",key:"p32p05"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ka=y("CirclePauseIcon",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["line",{x1:"10",x2:"10",y1:"15",y2:"9",key:"c1nkhi"}],["line",{x1:"14",x2:"14",y1:"15",y2:"9",key:"h65svq"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Wa=y("ClipboardListIcon",[["rect",{width:"8",height:"4",x:"8",y:"2",rx:"1",ry:"1",key:"tgr4d6"}],["path",{d:"M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2",key:"116196"}],["path",{d:"M12 11h4",key:"1jrz19"}],["path",{d:"M12 16h4",key:"n85exb"}],["path",{d:"M8 11h.01",key:"1dfujw"}],["path",{d:"M8 16h.01",key:"18s6g9"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Za=y("ClockIcon",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["polyline",{points:"12 6 12 12 16 14",key:"68esgv"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ga=y("CopyIcon",[["rect",{width:"14",height:"14",x:"8",y:"8",rx:"2",ry:"2",key:"17jyea"}],["path",{d:"M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2",key:"zix9uf"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ja=y("CreditCardIcon",[["rect",{width:"20",height:"14",x:"2",y:"5",rx:"2",key:"ynyp8z"}],["line",{x1:"2",x2:"22",y1:"10",y2:"10",key:"1b3vmo"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ya=y("CrownIcon",[["path",{d:"M11.562 3.266a.5.5 0 0 1 .876 0L15.39 8.87a1 1 0 0 0 1.516.294L21.183 5.5a.5.5 0 0 1 .798.519l-2.834 10.246a1 1 0 0 1-.956.734H5.81a1 1 0 0 1-.957-.734L2.02 6.02a.5.5 0 0 1 .798-.519l4.276 3.664a1 1 0 0 0 1.516-.294z",key:"1vdc57"}],["path",{d:"M5 21h14",key:"11awu3"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Qa=y("DollarSignIcon",[["line",{x1:"12",x2:"12",y1:"2",y2:"22",key:"7eqyqh"}],["path",{d:"M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6",key:"1b0p4s"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Xa=y("EyeOffIcon",[["path",{d:"M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49",key:"ct8e1f"}],["path",{d:"M14.084 14.158a3 3 0 0 1-4.242-4.242",key:"151rxh"}],["path",{d:"M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143",key:"13bj9a"}],["path",{d:"m2 2 20 20",key:"1ooewy"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const eo=y("EyeIcon",[["path",{d:"M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0",key:"1nclc0"}],["circle",{cx:"12",cy:"12",r:"3",key:"1v7zrd"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const to=y("FileTextIcon",[["path",{d:"M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z",key:"1rqfz7"}],["path",{d:"M14 2v4a2 2 0 0 0 2 2h4",key:"tnqrlb"}],["path",{d:"M10 9H8",key:"b1mrlr"}],["path",{d:"M16 13H8",key:"t4e002"}],["path",{d:"M16 17H8",key:"z1uh3a"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const no=y("FlaskConicalIcon",[["path",{d:"M10 2v7.527a2 2 0 0 1-.211.896L4.72 20.55a1 1 0 0 0 .9 1.45h12.76a1 1 0 0 0 .9-1.45l-5.069-10.127A2 2 0 0 1 14 9.527V2",key:"pzvekw"}],["path",{d:"M8.5 2h7",key:"csnxdl"}],["path",{d:"M7 16h10",key:"wp8him"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ao=y("FuelIcon",[["line",{x1:"3",x2:"15",y1:"22",y2:"22",key:"xegly4"}],["line",{x1:"4",x2:"14",y1:"9",y2:"9",key:"xcnuvu"}],["path",{d:"M14 22V4a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v18",key:"16j0yd"}],["path",{d:"M14 13h2a2 2 0 0 1 2 2v2a2 2 0 0 0 2 2a2 2 0 0 0 2-2V9.83a2 2 0 0 0-.59-1.42L18 5",key:"7cu91f"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const oo=y("HardHatIcon",[["path",{d:"M2 18a1 1 0 0 0 1 1h18a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1v2z",key:"1dej2m"}],["path",{d:"M10 10V5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v5",key:"1p9q5i"}],["path",{d:"M4 15v-3a6 6 0 0 1 6-6",key:"9ciidu"}],["path",{d:"M14 6a6 6 0 0 1 6 6v3",key:"1hnv84"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ro=y("HashIcon",[["line",{x1:"4",x2:"20",y1:"9",y2:"9",key:"4lhtct"}],["line",{x1:"4",x2:"20",y1:"15",y2:"15",key:"vyu0kd"}],["line",{x1:"10",x2:"8",y1:"3",y2:"21",key:"1ggp8o"}],["line",{x1:"16",x2:"14",y1:"3",y2:"21",key:"weycgp"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const so=y("InstagramIcon",[["rect",{width:"20",height:"20",x:"2",y:"2",rx:"5",ry:"5",key:"2e1cvw"}],["path",{d:"M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z",key:"9exkf1"}],["line",{x1:"17.5",x2:"17.51",y1:"6.5",y2:"6.5",key:"r4j83e"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const io=y("KeyRoundIcon",[["path",{d:"M2.586 17.414A2 2 0 0 0 2 18.828V21a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h1a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h.172a2 2 0 0 0 1.414-.586l.814-.814a6.5 6.5 0 1 0-4-4z",key:"1s6t7t"}],["circle",{cx:"16.5",cy:"7.5",r:".5",fill:"currentColor",key:"w0ekpg"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const lo=y("LayersIcon",[["path",{d:"m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z",key:"8b97xw"}],["path",{d:"m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65",key:"dd6zsq"}],["path",{d:"m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65",key:"ep9fru"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const uo=y("LayoutDashboardIcon",[["rect",{width:"7",height:"9",x:"3",y:"3",rx:"1",key:"10lvy0"}],["rect",{width:"7",height:"5",x:"14",y:"3",rx:"1",key:"16une8"}],["rect",{width:"7",height:"9",x:"14",y:"12",rx:"1",key:"1hutg5"}],["rect",{width:"7",height:"5",x:"3",y:"16",rx:"1",key:"ldoo1y"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const co=y("LoaderCircleIcon",[["path",{d:"M21 12a9 9 0 1 1-6.219-8.56",key:"13zald"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const fo=y("LockIcon",[["rect",{width:"18",height:"11",x:"3",y:"11",rx:"2",ry:"2",key:"1w4ew1"}],["path",{d:"M7 11V7a5 5 0 0 1 10 0v4",key:"fwvmzm"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const po=y("LogInIcon",[["path",{d:"M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4",key:"u53s6r"}],["polyline",{points:"10 17 15 12 10 7",key:"1ail0h"}],["line",{x1:"15",x2:"3",y1:"12",y2:"12",key:"v6grx8"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const yo=y("LogOutIcon",[["path",{d:"M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4",key:"1uf3rs"}],["polyline",{points:"16 17 21 12 16 7",key:"1gabdz"}],["line",{x1:"21",x2:"9",y1:"12",y2:"12",key:"1uyos4"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const vo=y("MapPinIcon",[["path",{d:"M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0",key:"1r0f0z"}],["circle",{cx:"12",cy:"10",r:"3",key:"ilqhr7"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ho=y("MessageCircleIcon",[["path",{d:"M7.9 20A9 9 0 1 0 4 16.1L2 22Z",key:"vv11sd"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const mo=y("MilkIcon",[["path",{d:"M8 2h8",key:"1ssgc1"}],["path",{d:"M9 2v2.789a4 4 0 0 1-.672 2.219l-.656.984A4 4 0 0 0 7 10.212V20a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-9.789a4 4 0 0 0-.672-2.219l-.656-.984A4 4 0 0 1 15 4.788V2",key:"qtp12x"}],["path",{d:"M7 15a6.472 6.472 0 0 1 5 0 6.47 6.47 0 0 0 5 0",key:"ygeh44"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const go=y("MoonIcon",[["path",{d:"M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z",key:"a7tn18"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ko=y("PackageCheckIcon",[["path",{d:"m16 16 2 2 4-4",key:"gfu2re"}],["path",{d:"M21 10V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l2-1.14",key:"e7tb2h"}],["path",{d:"m7.5 4.27 9 5.15",key:"1c824w"}],["polyline",{points:"3.29 7 12 12 20.71 7",key:"ousv84"}],["line",{x1:"12",x2:"12",y1:"22",y2:"12",key:"a4e8g8"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const bo=y("PackageIcon",[["path",{d:"M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z",key:"1a0edw"}],["path",{d:"M12 22V12",key:"d0xqtd"}],["path",{d:"m3.3 7 7.703 4.734a2 2 0 0 0 1.994 0L20.7 7",key:"yx3hmr"}],["path",{d:"m7.5 4.27 9 5.15",key:"1c824w"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Mo=y("PenLineIcon",[["path",{d:"M12 20h9",key:"t2du7b"}],["path",{d:"M16.376 3.622a1 1 0 0 1 3.002 3.002L7.368 18.635a2 2 0 0 1-.855.506l-2.872.838a.5.5 0 0 1-.62-.62l.838-2.872a2 2 0 0 1 .506-.854z",key:"1ykcvy"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const wo=y("PenIcon",[["path",{d:"M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z",key:"1a8usu"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Co=y("PercentIcon",[["line",{x1:"19",x2:"5",y1:"5",y2:"19",key:"1x9vlm"}],["circle",{cx:"6.5",cy:"6.5",r:"2.5",key:"4mh3h7"}],["circle",{cx:"17.5",cy:"17.5",r:"2.5",key:"1mdrzq"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Io=y("PhoneCallIcon",[["path",{d:"M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z",key:"foiqr5"}],["path",{d:"M14.05 2a9 9 0 0 1 8 7.94",key:"vmijpz"}],["path",{d:"M14.05 6A5 5 0 0 1 18 10",key:"13nbpp"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const _o=y("PhoneIcon",[["path",{d:"M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z",key:"foiqr5"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Eo=y("PiggyBankIcon",[["path",{d:"M19 5c-1.5 0-2.8 1.4-3 2-3.5-1.5-11-.3-11 5 0 1.8 0 3 2 4.5V20h4v-2h3v2h4v-4c1-.5 1.7-1 2-2h2v-4h-2c0-1-.5-1.5-1-2V5z",key:"1ivx2i"}],["path",{d:"M2 9v1c0 1.1.9 2 2 2h1",key:"nm575m"}],["path",{d:"M16 11h.01",key:"xkw8gn"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const xo=y("PlusIcon",[["path",{d:"M5 12h14",key:"1ays0h"}],["path",{d:"M12 5v14",key:"s699le"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const So=y("PowerIcon",[["path",{d:"M12 2v10",key:"mnfbl"}],["path",{d:"M18.4 6.6a9 9 0 1 1-12.77.04",key:"obofu9"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ao=y("QrCodeIcon",[["rect",{width:"5",height:"5",x:"3",y:"3",rx:"1",key:"1tu5fj"}],["rect",{width:"5",height:"5",x:"16",y:"3",rx:"1",key:"1v8r4q"}],["rect",{width:"5",height:"5",x:"3",y:"16",rx:"1",key:"1x03jg"}],["path",{d:"M21 16h-3a2 2 0 0 0-2 2v3",key:"177gqh"}],["path",{d:"M21 21v.01",key:"ents32"}],["path",{d:"M12 7v3a2 2 0 0 1-2 2H7",key:"8crl2c"}],["path",{d:"M3 12h.01",key:"nlz23k"}],["path",{d:"M12 3h.01",key:"n36tog"}],["path",{d:"M12 16v.01",key:"133mhm"}],["path",{d:"M16 12h1",key:"1slzba"}],["path",{d:"M21 12v.01",key:"1lwtk9"}],["path",{d:"M12 21v-1",key:"1880an"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Oo=y("ReceiptTextIcon",[["path",{d:"M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z",key:"q3az6g"}],["path",{d:"M14 8H8",key:"1l3xfs"}],["path",{d:"M16 12H8",key:"1fr5h0"}],["path",{d:"M13 16H8",key:"wsln4y"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Do=y("ReceiptIcon",[["path",{d:"M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z",key:"q3az6g"}],["path",{d:"M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8",key:"1h4pet"}],["path",{d:"M12 17.5v-11",key:"1jc1ny"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const To=y("RefreshCwIcon",[["path",{d:"M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8",key:"v9h5vc"}],["path",{d:"M21 3v5h-5",key:"1q7to0"}],["path",{d:"M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16",key:"3uifl3"}],["path",{d:"M8 16H3v5",key:"1cv678"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Po=y("RotateCwIcon",[["path",{d:"M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8",key:"1p45f6"}],["path",{d:"M21 3v5h-5",key:"1q7to0"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const qo=y("SaveIcon",[["path",{d:"M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z",key:"1c8476"}],["path",{d:"M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7",key:"1ydtos"}],["path",{d:"M7 3v4a1 1 0 0 0 1 1h7",key:"t51u73"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Lo=y("ScaleIcon",[["path",{d:"m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z",key:"7g6ntu"}],["path",{d:"m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z",key:"ijws7r"}],["path",{d:"M7 21h10",key:"1b0cd5"}],["path",{d:"M12 3v18",key:"108xh3"}],["path",{d:"M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2",key:"3gwbw2"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Fo=y("SearchIcon",[["circle",{cx:"11",cy:"11",r:"8",key:"4ej97u"}],["path",{d:"m21 21-4.3-4.3",key:"1qie3q"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Bo=y("SendIcon",[["path",{d:"M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z",key:"1ffxy3"}],["path",{d:"m21.854 2.147-10.94 10.939",key:"12cjpa"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ro=y("SettingsIcon",[["path",{d:"M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z",key:"1qme2f"}],["circle",{cx:"12",cy:"12",r:"3",key:"1v7zrd"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const $o=y("ShieldAlertIcon",[["path",{d:"M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z",key:"oel41y"}],["path",{d:"M12 8v4",key:"1got3b"}],["path",{d:"M12 16h.01",key:"1drbdi"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const jo=y("ShieldCheckIcon",[["path",{d:"M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z",key:"oel41y"}],["path",{d:"m9 12 2 2 4-4",key:"dzmm74"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const No=y("ShoppingBagIcon",[["path",{d:"M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z",key:"hou9p0"}],["path",{d:"M3 6h18",key:"d0wm0j"}],["path",{d:"M16 10a4 4 0 0 1-8 0",key:"1ltviw"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const zo=y("SlidersHorizontalIcon",[["line",{x1:"21",x2:"14",y1:"4",y2:"4",key:"obuewd"}],["line",{x1:"10",x2:"3",y1:"4",y2:"4",key:"1q6298"}],["line",{x1:"21",x2:"12",y1:"12",y2:"12",key:"1iu8h1"}],["line",{x1:"8",x2:"3",y1:"12",y2:"12",key:"ntss68"}],["line",{x1:"21",x2:"16",y1:"20",y2:"20",key:"14d8ph"}],["line",{x1:"12",x2:"3",y1:"20",y2:"20",key:"m0wm8r"}],["line",{x1:"14",x2:"14",y1:"2",y2:"6",key:"14e1ph"}],["line",{x1:"8",x2:"8",y1:"10",y2:"14",key:"1i6ji0"}],["line",{x1:"16",x2:"16",y1:"18",y2:"22",key:"1lctlv"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ho=y("SmartphoneIcon",[["rect",{width:"14",height:"20",x:"5",y:"2",rx:"2",ry:"2",key:"1yt0o3"}],["path",{d:"M12 18h.01",key:"mhygvu"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Vo=y("SparklesIcon",[["path",{d:"M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z",key:"4pj2yx"}],["path",{d:"M20 3v4",key:"1olli1"}],["path",{d:"M22 5h-4",key:"1gvqau"}],["path",{d:"M4 17v2",key:"vumght"}],["path",{d:"M5 18H3",key:"zchphs"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Uo=y("SunIcon",[["circle",{cx:"12",cy:"12",r:"4",key:"4exip2"}],["path",{d:"M12 2v2",key:"tus03m"}],["path",{d:"M12 20v2",key:"1lh1kg"}],["path",{d:"m4.93 4.93 1.41 1.41",key:"149t6j"}],["path",{d:"m17.66 17.66 1.41 1.41",key:"ptbguv"}],["path",{d:"M2 12h2",key:"1t8f8n"}],["path",{d:"M20 12h2",key:"1q8mjw"}],["path",{d:"m6.34 17.66-1.41 1.41",key:"1m8zz5"}],["path",{d:"m19.07 4.93-1.41 1.41",key:"1shlcs"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ko=y("TagIcon",[["path",{d:"M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z",key:"vktsd0"}],["circle",{cx:"7.5",cy:"7.5",r:".5",fill:"currentColor",key:"kqv944"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Wo=y("TimerIcon",[["line",{x1:"10",x2:"14",y1:"2",y2:"2",key:"14vaq8"}],["line",{x1:"12",x2:"15",y1:"14",y2:"11",key:"17fdiu"}],["circle",{cx:"12",cy:"14",r:"8",key:"1e1u0o"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Zo=y("Trash2Icon",[["path",{d:"M3 6h18",key:"d0wm0j"}],["path",{d:"M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6",key:"4alrt4"}],["path",{d:"M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2",key:"v07s0e"}],["line",{x1:"10",x2:"10",y1:"11",y2:"17",key:"1uufr5"}],["line",{x1:"14",x2:"14",y1:"11",y2:"17",key:"xtxkd"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Go=y("TrendingUpIcon",[["polyline",{points:"22 7 13.5 15.5 8.5 10.5 2 17",key:"126l90"}],["polyline",{points:"16 7 22 7 22 13",key:"kwv8wd"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Jo=y("TriangleAlertIcon",[["path",{d:"m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3",key:"wmoenq"}],["path",{d:"M12 9v4",key:"juzpu7"}],["path",{d:"M12 17h.01",key:"p32p05"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Yo=y("TruckIcon",[["path",{d:"M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2",key:"wrbu53"}],["path",{d:"M15 18H9",key:"1lyqi6"}],["path",{d:"M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14",key:"lysw3i"}],["circle",{cx:"17",cy:"18",r:"2",key:"332jqn"}],["circle",{cx:"7",cy:"18",r:"2",key:"19iecd"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Qo=y("UserCheckIcon",[["path",{d:"M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2",key:"1yyitq"}],["circle",{cx:"9",cy:"7",r:"4",key:"nufk8"}],["polyline",{points:"16 11 18 13 22 9",key:"1pwet4"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Xo=y("UserPlusIcon",[["path",{d:"M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2",key:"1yyitq"}],["circle",{cx:"9",cy:"7",r:"4",key:"nufk8"}],["line",{x1:"19",x2:"19",y1:"8",y2:"14",key:"1bvyxn"}],["line",{x1:"22",x2:"16",y1:"11",y2:"11",key:"1shjgl"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const er=y("UserIcon",[["path",{d:"M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2",key:"975kel"}],["circle",{cx:"12",cy:"7",r:"4",key:"17ys0d"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const tr=y("UsersIcon",[["path",{d:"M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2",key:"1yyitq"}],["circle",{cx:"9",cy:"7",r:"4",key:"nufk8"}],["path",{d:"M22 21v-2a4 4 0 0 0-3-3.87",key:"kshegd"}],["path",{d:"M16 3.13a4 4 0 0 1 0 7.75",key:"1da9ce"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const nr=y("WalletIcon",[["path",{d:"M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1",key:"18etb6"}],["path",{d:"M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4",key:"xoc0q4"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ar=y("WifiIcon",[["path",{d:"M12 20h.01",key:"zekei9"}],["path",{d:"M2 8.82a15 15 0 0 1 20 0",key:"dnpr2z"}],["path",{d:"M5 12.859a10 10 0 0 1 14 0",key:"1x1e6c"}],["path",{d:"M8.5 16.429a5 5 0 0 1 7 0",key:"1bycff"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const or=y("WrenchIcon",[["path",{d:"M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z",key:"cbrjhi"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const rr=y("XIcon",[["path",{d:"M18 6 6 18",key:"1bl5f8"}],["path",{d:"m6 6 12 12",key:"d8bk6v"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const sr=y("ZapIcon",[["path",{d:"M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z",key:"1xq2db"}]]);function fe(e,t){const n=typeof e=="string"&&!t?`${e}Context`:t,a=Symbol(n);return[c=>{const i=He(a,c);if(i||i===null)return i;throw new Error(`Injection \`${a.toString()}\` not found. Component must be used within ${Array.isArray(e)?`one of the following components: ${e.join(", ")}`:`\`${e}\``}`)},c=>(Ve(a,c),c)]}function F(){let e=document.activeElement;if(e==null)return null;for(;e!=null&&e.shadowRoot!=null&&e.shadowRoot.activeElement!=null;)e=e.shadowRoot.activeElement;return e}function Xe(e,t,n){const a=n.originalEvent.target,o=new CustomEvent(e,{bubbles:!1,cancelable:!0,detail:n});t&&a.addEventListener(e,t,{once:!0}),a.dispatchEvent(o)}function Wt(e){return e==null}function Zt(e,t){return Ne()?(ze(e,t),!0):!1}function Gt(e){let t=!1,n;const a=Ke(!0);return(...o)=>(t||(n=a.run(()=>e(...o)),t=!0),n)}const U=typeof window<"u"&&typeof document<"u";typeof WorkerGlobalScope<"u"&&globalThis instanceof WorkerGlobalScope;const Jt=e=>typeof e<"u",Yt=Object.prototype.toString,Qt=e=>Yt.call(e)==="[object Object]",Le=Xt();function Xt(){var e,t,n;return U&&!!(!((e=window)===null||e===void 0||(e=e.navigator)===null||e===void 0)&&e.userAgent)&&(/iP(?:ad|hone|od)/.test(window.navigator.userAgent)||((t=window)===null||t===void 0||(t=t.navigator)===null||t===void 0?void 0:t.maxTouchPoints)>2&&/iPad|Macintosh/.test((n=window)===null||n===void 0?void 0:n.navigator.userAgent))}function ye(e){return Array.isArray(e)?e:[e]}function en(e){return Z()}function tn(e){if(!U)return e;let t=0,n,a;const o=()=>{t-=1,a&&t<=0&&(a.stop(),n=void 0,a=void 0)};return(...r)=>(t+=1,a||(a=Ke(!0),n=a.run(()=>e(...r))),Zt(o),n)}function nn(e,t){en()&&Ue(e,t)}function an(e,t,n){return D(e,t,{...n,immediate:!0})}const xe=U?window:void 0;function ae(e){var t;const n=N(e);return(t=n==null?void 0:n.$el)!==null&&t!==void 0?t:n}function et(...e){const t=(a,o,r,c)=>(a.addEventListener(o,r,c),()=>a.removeEventListener(o,r,c)),n=w(()=>{const a=ye(N(e[0])).filter(o=>o!=null);return a.every(o=>typeof o!="string")?a:void 0});return an(()=>{var a,o;return[(a=(o=n.value)===null||o===void 0?void 0:o.map(r=>ae(r)))!==null&&a!==void 0?a:[xe].filter(r=>r!=null),ye(N(n.value?e[1]:e[0])),ye(v(n.value?e[2]:e[1])),N(n.value?e[3]:e[2])]},([a,o,r,c],i,d)=>{if(!(a!=null&&a.length)||!(o!=null&&o.length)||!(r!=null&&r.length))return;const l=Qt(c)?{...c}:c,f=a.flatMap(s=>o.flatMap(u=>r.map(p=>t(s,u,p,l))));d(()=>{f.forEach(s=>s())})},{flush:"post"})}function on(){const e=Ie(!1),t=Z();return t&&ee(()=>{e.value=!0},t),e}function rn(e){return typeof e=="function"?e:typeof e=="string"?t=>t.key===e:Array.isArray(e)?t=>e.includes(t.key):()=>!0}function sn(...e){let t,n,a={};e.length===3?(t=e[0],n=e[1],a=e[2]):e.length===2?typeof e[1]=="object"?(t=!0,n=e[0],a=e[1]):(t=e[0],n=e[1]):(t=!0,n=e[0]);const{target:o=xe,eventName:r="keydown",passive:c=!1,dedupe:i=!1}=a,d=rn(t);return et(o,r,f=>{f.repeat&&N(i)||d(f)&&n(f)},c)}function ln(e){return JSON.parse(JSON.stringify(e))}function Se(e,t,n,a={}){var o,r;const{clone:c=!1,passive:i=!1,eventName:d,deep:l=!1,defaultValue:f,shouldEmit:s}=a,u=Z(),p=n||(u==null?void 0:u.emit)||(u==null||(o=u.$emit)===null||o===void 0?void 0:o.bind(u))||(u==null||(r=u.proxy)===null||r===void 0||(r=r.$emit)===null||r===void 0?void 0:r.bind(u==null?void 0:u.proxy));let g=d;t||(t="modelValue"),g=g||`update:${t.toString()}`;const k=h=>c?typeof c=="function"?c(h):ln(h):h,b=()=>Jt(e[t])?k(e[t]):f,m=h=>{s?s(h)&&p(g,h):p(g,h)};if(i){const h=M(b());let O=!1;return D(()=>e[t],A=>{O||(O=!0,h.value=k(A),j(()=>O=!1))}),D(h,A=>{!O&&(A!==e[t]||l)&&m(A)},{deep:l}),h}else return w({get(){return b()},set(h){m(h)}})}function Ae(e){return e?e.flatMap(t=>t.type===ft?Ae(t.children):[t]):[]}const[pe]=fe("ConfigProvider"),q=We({layersRoot:new Set,layersWithOutsidePointerEventsDisabled:new Set,originalBodyPointerEvents:void 0,branches:new Set});function ve(e){if(e===null||typeof e!="object")return!1;const t=Object.getPrototypeOf(e);return t!==null&&t!==Object.prototype&&Object.getPrototypeOf(t)!==null||Symbol.iterator in e?!1:Symbol.toStringTag in e?Object.prototype.toString.call(e)==="[object Module]":!0}function we(e,t,n=".",a){if(!ve(t))return we(e,{},n,a);const o={...t};for(const r of Object.keys(e)){if(r==="__proto__"||r==="constructor")continue;const c=e[r];c!=null&&(a&&a(o,r,c,n)||(Array.isArray(c)&&Array.isArray(o[r])?o[r]=[...c,...o[r]]:ve(c)&&ve(o[r])?o[r]=we(c,o[r],(n?`${n}.`:"")+r.toString(),a):o[r]=c))}return o}function un(e){return(...t)=>t.reduce((n,a)=>we(n,a,"",e),{})}const cn=un(),dn=tn(()=>{const e=M(new Map),t=M(),n=w(()=>{for(const c of e.value.values())if(c)return!0;return!1}),a=pe({scrollBody:M(!0)});let o=null;const r=()=>{document.body.style.paddingRight="",document.body.style.marginRight="",q.layersWithOutsidePointerEventsDisabled.size===0&&(document.body.style.pointerEvents=""),document.documentElement.style.removeProperty("--scrollbar-width"),document.body.style.overflow=t.value??"",Le&&(o==null||o()),t.value=void 0};return D(n,(c,i)=>{var s;if(!U)return;if(!c){i&&r();return}t.value===void 0&&(t.value=document.body.style.overflow);const d=window.innerWidth-document.documentElement.clientWidth,l={padding:d,margin:0},f=(s=a.scrollBody)!=null&&s.value?typeof a.scrollBody.value=="object"?cn({padding:a.scrollBody.value.padding===!0?d:a.scrollBody.value.padding,margin:a.scrollBody.value.margin===!0?d:a.scrollBody.value.margin},l):l:{padding:0,margin:0};d>0&&(document.body.style.paddingRight=typeof f.padding=="number"?`${f.padding}px`:String(f.padding),document.body.style.marginRight=typeof f.margin=="number"?`${f.margin}px`:String(f.margin),document.documentElement.style.setProperty("--scrollbar-width",`${d}px`),document.body.style.overflow="hidden"),Le&&(o=et(document,"touchmove",u=>pn(u),{passive:!1})),j(()=>{n.value&&(document.body.style.pointerEvents="none",document.body.style.overflow="hidden")})},{immediate:!0,flush:"sync"}),e});function fn(e){const t=Math.random().toString(36).substring(2,7),n=dn();n.value.set(t,e??!1);const a=w({get:()=>n.value.get(t)??!1,set:o=>n.value.set(t,o)});return nn(()=>{n.value.delete(t)}),a}function tt(e){const t=window.getComputedStyle(e);if(t.overflowX==="scroll"||t.overflowY==="scroll"||t.overflowX==="auto"&&e.clientWidth<e.scrollWidth||t.overflowY==="auto"&&e.clientHeight<e.scrollHeight)return!0;{const n=e.parentNode;return!(n instanceof Element)||n.tagName==="BODY"?!1:tt(n)}}function pn(e){const t=e||window.event,n=t.target;return n instanceof Element&&tt(n)?!1:t.touches.length>1?!0:(t.preventDefault&&t.cancelable&&t.preventDefault(),!1)}function nt(e){const t=pe({dir:M("ltr")});return w(()=>{var n;return(e==null?void 0:e.value)||((n=t.dir)==null?void 0:n.value)||"ltr"})}function Oe(e){const t=Z(),n=t==null?void 0:t.type.emits,a={};return n!=null&&n.length||console.warn(`No emitted event found. Please check component: ${t==null?void 0:t.type.__name}`),n==null||n.forEach(o=>{a[pt(yt(o))]=(...r)=>e(o,...r)}),a}function P(){const e=Z(),t=M(),n=w(()=>a());vt(()=>{n.value!==a()&&ht(t)});function a(){return t.value&&"$el"in t.value&&["#text","#comment"].includes(t.value.$el.nodeName)?t.value.$el.nextElementSibling:ae(t)}const o=Object.assign({},e.exposed),r={};for(const i in e.props)Object.defineProperty(r,i,{enumerable:!0,configurable:!0,get:()=>e.props[i]});if(Object.keys(o).length>0)for(const i in o)Object.defineProperty(r,i,{enumerable:!0,configurable:!0,get:()=>o[i]});Object.defineProperty(r,"$el",{enumerable:!0,configurable:!0,get:()=>e.vnode.el}),e.exposed=r;function c(i){if(t.value=i,!!i&&(Object.defineProperty(r,"$el",{enumerable:!0,configurable:!0,get:()=>i instanceof Element?i:i.$el}),!(i instanceof Element)&&!Object.hasOwn(i,"$el"))){const d=i.$.exposed,l=Object.assign({},r);for(const f in d)Object.defineProperty(l,f,{enumerable:!0,configurable:!0,get:()=>d[f]});e.exposed=l}}return{forwardRef:c,currentRef:t,currentElement:n}}var yn=function(e){if(typeof document>"u")return null;var t=Array.isArray(e)?e[0]:e;return t.ownerDocument.body},Q=new WeakMap,le=new WeakMap,ue={},he=0,at=function(e){return e&&(e.host||at(e.parentNode))},vn=function(e,t){return t.map(function(n){if(e.contains(n))return n;var a=at(n);return a&&e.contains(a)?a:(console.error("aria-hidden",n,"in not contained inside",e,". Doing nothing"),null)}).filter(function(n){return!!n})},hn=function(e,t,n,a){var o=vn(t,Array.isArray(e)?e:[e]);ue[n]||(ue[n]=new WeakMap);var r=ue[n],c=[],i=new Set,d=new Set(o),l=function(s){!s||i.has(s)||(i.add(s),l(s.parentNode))};o.forEach(l);var f=function(s){!s||d.has(s)||Array.prototype.forEach.call(s.children,function(u){if(i.has(u))f(u);else try{var p=u.getAttribute(a),g=p!==null&&p!=="false",k=(Q.get(u)||0)+1,b=(r.get(u)||0)+1;Q.set(u,k),r.set(u,b),c.push(u),k===1&&g&&le.set(u,!0),b===1&&u.setAttribute(n,"true"),g||u.setAttribute(a,"true")}catch(m){console.error("aria-hidden: cannot operate on ",u,m)}})};return f(t),i.clear(),he++,function(){c.forEach(function(s){var u=Q.get(s)-1,p=r.get(s)-1;Q.set(s,u),r.set(s,p),u||(le.has(s)||s.removeAttribute(a),le.delete(s)),p||s.removeAttribute(n)}),he--,he||(Q=new WeakMap,Q=new WeakMap,le=new WeakMap,ue={})}},mn=function(e,t,n){n===void 0&&(n="data-aria-hidden");var a=Array.from(Array.isArray(e)?e:[e]),o=yn(e);return o?(a.push.apply(a,Array.from(o.querySelectorAll("[aria-live], script"))),hn(a,o,n,"aria-hidden")):function(){return null}};function gn(e){let t;D(()=>ae(e),n=>{let a=!1;try{a=!!(n!=null&&n.closest("[popover]:not(:popover-open)"))}catch{}n&&!a?t=mn(n):t&&t()}),_e(()=>{t&&t()})}function de(e,t="reka"){var o;let n;const a=pe({useId:void 0});return a.useId?n=a.useId():n=(o=mt)==null?void 0:o(),t?`${t}-${n}`:n}function kn(e,t){const n=M(e);function a(r){return t[n.value][r]??n.value}return{state:n,dispatch:r=>{n.value=a(r)}}}function bn(e,t){var b;const n=M({}),a=M("none"),o=M(e),r=e.value?"mounted":"unmounted";let c;const i=((b=t.value)==null?void 0:b.ownerDocument.defaultView)??xe,{state:d,dispatch:l}=kn(r,{mounted:{UNMOUNT:"unmounted",ANIMATION_OUT:"unmountSuspended"},unmountSuspended:{MOUNT:"mounted",ANIMATION_END:"unmounted"},unmounted:{MOUNT:"mounted"}}),f=m=>{var h;if(U){const O=new CustomEvent(m,{bubbles:!1,cancelable:!1});(h=t.value)==null||h.dispatchEvent(O)}};D(e,async(m,h)=>{var A;const O=h!==m;if(await j(),O){const H=a.value,L=ce(t.value);m?(l("MOUNT"),f("enter"),L==="none"&&f("after-enter")):L==="none"||L==="undefined"||((A=n.value)==null?void 0:A.display)==="none"?(l("UNMOUNT"),f("leave"),f("after-leave")):h&&H!==L?(l("ANIMATION_OUT"),f("leave")):(l("UNMOUNT"),f("after-leave"))}},{immediate:!0});const s=m=>{if(m.target!==t.value)return;const h=ce(t.value),O=h.includes(CSS.escape(m.animationName)),A=d.value==="mounted"?"enter":"leave";if(O&&(f(`after-${A}`),l("ANIMATION_END"),!o.value)){const H=t.value.style.animationFillMode;t.value.style.animationFillMode="forwards",c=i==null?void 0:i.setTimeout(()=>{var L;((L=t.value)==null?void 0:L.style.animationFillMode)==="forwards"&&(t.value.style.animationFillMode=H)})}h==="none"&&l("ANIMATION_END")},u=m=>{m.target===t.value&&(a.value=ce(t.value))},p=D(t,(m,h)=>{m?(n.value=getComputedStyle(m),m.addEventListener("animationstart",u),m.addEventListener("animationcancel",s),m.addEventListener("animationend",s)):(l("ANIMATION_END"),c!==void 0&&(i==null||i.clearTimeout(c)),h==null||h.removeEventListener("animationstart",u),h==null||h.removeEventListener("animationcancel",s),h==null||h.removeEventListener("animationend",s))},{immediate:!0}),g=D(d,()=>{const m=ce(t.value);a.value=d.value==="mounted"?m:"none"});return _e(()=>{p(),g(),t.value&&(t.value.removeEventListener("animationstart",u),t.value.removeEventListener("animationcancel",s),t.value.removeEventListener("animationend",s)),c!==void 0&&(i==null||i.clearTimeout(c))}),{isPresent:w(()=>["mounted","unmountSuspended"].includes(d.value))}}function ce(e){return e&&getComputedStyle(e).animationName||"none"}var De=_({name:"Presence",props:{present:{type:Boolean,required:!0},forceMount:{type:Boolean}},slots:{},setup(e,{slots:t,expose:n}){var l;const{present:a,forceMount:o}=ne(e),r=M(),{isPresent:c}=bn(a,r);n({present:c});let i=t.default({present:c.value});i=Ae(i||[]);const d=Z();if(i&&(i==null?void 0:i.length)>1){const f=(l=d==null?void 0:d.parent)!=null&&l.type.name?`<${d.parent.type.name} />`:"component";throw new Error([`Detected an invalid children for \`${f}\` for  \`Presence\` component.`,"","Note: Presence works similarly to `v-if` directly, but it waits for animation/transition to finished before unmounting. So it expect only one direct child of valid VNode type.","You can apply a few solutions:",["Provide a single child element so that `presence` directive attach correctly.","Ensure the first child is an actual element instead of a raw text node or comment node."].map(s=>`  - ${s}`).join(`
`)].join(`
`))}return()=>o.value||a.value||c.value?V(t.default({present:c.value})[0],{ref:f=>{const s=ae(f);return typeof(s==null?void 0:s.hasAttribute)>"u"||(s!=null&&s.hasAttribute("data-reka-popper-content-wrapper")?r.value=s.firstElementChild:r.value=s),s}}):null}});const Ce=_({name:"PrimitiveSlot",inheritAttrs:!1,setup(e,{attrs:t,slots:n}){return()=>{var d;if(!n.default)return null;const a=Ae(n.default()),o=a.findIndex(l=>l.type!==gt);if(o===-1)return a;const r=a[o];(d=r.props)==null||delete d.ref;const c=r.props?z(t,r.props):t,i=kt({...r,props:{}},c);return a.length===1?i:(a[o]=i,a)}}}),Mn=["area","img","input"],B=_({name:"Primitive",inheritAttrs:!1,props:{asChild:{type:Boolean,default:!1},as:{type:[String,Object],default:"div"}},setup(e,{attrs:t,slots:n}){const a=e.asChild?"template":e.as;return typeof a=="string"&&Mn.includes(a)?()=>V(a,t):a!=="template"?()=>V(e.as,t,{default:n.default}):()=>V(Ce,t,{default:n.default})}});function Fe(){const e=M(),t=w(()=>{var n,a;return["#text","#comment"].includes((n=e.value)==null?void 0:n.$el.nodeName)?(a=e.value)==null?void 0:a.$el.nextElementSibling:ae(e)});return{primitiveElement:e,currentElement:t}}const[K,wn]=fe("DialogRoot");var Cn=_({inheritAttrs:!1,__name:"DialogRoot",props:{open:{type:Boolean,required:!1,default:void 0},defaultOpen:{type:Boolean,required:!1,default:!1},modal:{type:Boolean,required:!1,default:!0},unmountOnHide:{type:Boolean,required:!1,default:!0}},emits:["update:open"],setup(e,{emit:t}){const n=e,o=Se(n,"open",t,{defaultValue:n.defaultOpen,passive:n.open===void 0}),r=M(),c=M(),{modal:i,unmountOnHide:d}=ne(n);return wn({open:o,modal:i,unmountOnHide:d,openModal:()=>{o.value=!0},onOpenChange:l=>{o.value=l},onOpenToggle:()=>{o.value=!o.value},contentId:"",titleId:"",descriptionId:"",triggerElement:r,contentElement:c}),(l,f)=>S(l.$slots,"default",{open:v(o),close:()=>o.value=!1})}}),ir=Cn,In=_({__name:"DialogClose",props:{asChild:{type:Boolean,required:!1},as:{type:null,required:!1,default:"button"}},setup(e){const t=e;P();const n=K();return(a,o)=>(E(),x(v(B),z(t,{type:a.as==="button"?"button":void 0,onClick:o[0]||(o[0]=r=>v(n).onOpenChange(!1))}),{default:I(()=>[S(a.$slots,"default")]),_:3},16,["type"]))}}),lr=In;const _n="dismissableLayer.pointerDownOutside",En="dismissableLayer.focusOutside";function ot(e,t){if(!(t instanceof Element))return!1;if(e.contains(t))return!0;const n=t.closest("[data-dismissable-layer]"),a=e.dataset.dismissableLayer===""?e:e.querySelector("[data-dismissable-layer]"),o=Array.from(e.ownerDocument.querySelectorAll("[data-dismissable-layer]"));return!!(n&&(a===n||o.indexOf(a)<o.indexOf(n)))}function xn(e,t,n=!0){var c;const a=((c=t==null?void 0:t.value)==null?void 0:c.ownerDocument)??(globalThis==null?void 0:globalThis.document),o=M(!1),r=M(()=>{});return G(i=>{if(!U||!N(n))return;const d=async f=>{const s=f.target;if(!(!(t!=null&&t.value)||!s)){if(ot(t.value,s)){a.removeEventListener("click",r.value),o.value=!1;return}if(f.target&&!o.value){let p=function(){Xe(_n,e,u)};const u={originalEvent:f};f.pointerType==="touch"?(a.removeEventListener("click",r.value),r.value=p,a.addEventListener("click",r.value,{once:!0})):p()}else a.removeEventListener("click",r.value);o.value=!1}},l=window.setTimeout(()=>{a.addEventListener("pointerdown",d)},0);i(()=>{window.clearTimeout(l),a.removeEventListener("pointerdown",d),a.removeEventListener("click",r.value)})}),{onPointerDownCapture:()=>{N(n)&&(o.value=!0)}}}function Sn(e,t,n=!0){var r;const a=((r=t==null?void 0:t.value)==null?void 0:r.ownerDocument)??(globalThis==null?void 0:globalThis.document),o=M(!1);return G(c=>{if(!U||!N(n))return;const i=async d=>{if(!(t!=null&&t.value))return;await j(),await j();const l=d.target;!t.value||!l||ot(t.value,l)||d.target&&!o.value&&Xe(En,e,{originalEvent:d})};a.addEventListener("focusin",i),c(()=>a.removeEventListener("focusin",i))}),{onFocusCapture:()=>{N(n)&&(o.value=!0)},onBlurCapture:()=>{N(n)&&(o.value=!1)}}}var An=_({__name:"DismissableLayer",props:{disableOutsidePointerEvents:{type:Boolean,required:!1,default:!1},asChild:{type:Boolean,required:!1},as:{type:null,required:!1},present:{type:Boolean,required:!1,default:!0}},emits:["escapeKeyDown","pointerDownOutside","focusOutside","interactOutside","dismiss"],setup(e,{emit:t}){const n=e,a=t,{forwardRef:o,currentElement:r}=P(),c=w(()=>{var p;return((p=r.value)==null?void 0:p.ownerDocument)??globalThis.document}),i=w(()=>q.layersRoot),d=w(()=>r.value?Array.from(i.value).indexOf(r.value):-1),l=w(()=>q.layersWithOutsidePointerEventsDisabled.size>0),f=w(()=>{const p=Array.from(i.value),[g]=[...q.layersWithOutsidePointerEventsDisabled].slice(-1),k=p.indexOf(g);return d.value>=k}),s=xn(async p=>{const g=[...q.branches].some(k=>k==null?void 0:k.contains(p.target));!n.present||!f.value||g||(a("pointerDownOutside",p),a("interactOutside",p),await j(),p.defaultPrevented||a("dismiss"))},r,()=>n.present),u=Sn(p=>{const g=[...q.branches].some(k=>k==null?void 0:k.contains(p.target));!n.present||g||(a("focusOutside",p),a("interactOutside",p),p.defaultPrevented||a("dismiss"))},r);return sn("Escape",p=>{!n.present||!(d.value===i.value.size-1)||(a("escapeKeyDown",p),p.defaultPrevented||a("dismiss"))}),D([r,()=>n.disableOutsidePointerEvents,()=>n.present],([p,g,k],b,m)=>{!p||!k||g&&(q.layersWithOutsidePointerEventsDisabled.size===0&&(q.originalBodyPointerEvents=c.value.body.style.pointerEvents,c.value.body.style.pointerEvents="none"),q.layersWithOutsidePointerEventsDisabled.add(p),m(()=>{q.layersWithOutsidePointerEventsDisabled.delete(p),q.layersWithOutsidePointerEventsDisabled.size===0&&!Wt(q.originalBodyPointerEvents)&&(c.value.body.style.pointerEvents=q.originalBodyPointerEvents)}))},{immediate:!0}),D([r,()=>n.present],([p,g],k,b)=>{!p||!g||(i.value.add(p),b(()=>{i.value.delete(p)}))},{immediate:!0}),G(p=>{p(()=>{r.value&&(i.value.delete(r.value),q.layersWithOutsidePointerEventsDisabled.delete(r.value))})}),(p,g)=>(E(),x(v(B),{ref:v(o),"as-child":p.asChild,as:p.as,"data-dismissable-layer":"",style:Ze({pointerEvents:l.value?f.value?"auto":"none":void 0}),onFocusCapture:v(u).onFocusCapture,onBlurCapture:v(u).onBlurCapture,onPointerdownCapture:v(s).onPointerDownCapture},{default:I(()=>[S(p.$slots,"default")]),_:3},8,["as-child","as","style","onFocusCapture","onBlurCapture","onPointerdownCapture"]))}}),On=An;const Dn=Gt(()=>M([]));function Tn(){const e=Dn();return{add(t){const n=e.value[0];t!==n&&(n==null||n.pause()),e.value=Be(e.value,t),e.value.unshift(t)},remove(t){var n;e.value=Be(e.value,t),(n=e.value[0])==null||n.resume()}}}function Be(e,t){const n=[...e],a=n.indexOf(t);return a!==-1&&n.splice(a,1),n}const me="focusScope.autoFocusOnMount",ge="focusScope.autoFocusOnUnmount",Re={bubbles:!1,cancelable:!0};function Pn(e,{select:t=!1}={}){const n=F();for(const a of e)if(W(a,{select:t}),F()!==n)return!0}function qn(e){const t=rt(e),n=$e(t,e),a=$e(t.reverse(),e);return[n,a]}function rt(e){const t=[],n=document.createTreeWalker(e,NodeFilter.SHOW_ELEMENT,{acceptNode:a=>{const o=a.tagName==="INPUT"&&a.type==="hidden";return a.disabled||a.hidden||o?NodeFilter.FILTER_SKIP:a.tabIndex>=0?NodeFilter.FILTER_ACCEPT:NodeFilter.FILTER_SKIP}});for(;n.nextNode();)t.push(n.currentNode);return t}function $e(e,t){for(const n of e)if(!Ln(n,{upTo:t}))return n}function Ln(e,{upTo:t}){if(getComputedStyle(e).visibility==="hidden")return!0;for(;e;){if(t!==void 0&&e===t)return!1;if(getComputedStyle(e).display==="none")return!0;e=e.parentElement}return!1}function Fn(e){return e instanceof HTMLInputElement&&"select"in e}function W(e,{select:t=!1}={}){if(e&&e.focus){const n=F();e.focus({preventScroll:!0}),e!==n&&Fn(e)&&t&&e.select()}}var Bn=_({__name:"FocusScope",props:{loop:{type:Boolean,required:!1,default:!1},trapped:{type:Boolean,required:!1,default:!1},present:{type:Boolean,required:!1,default:!0},asChild:{type:Boolean,required:!1},as:{type:null,required:!1}},emits:["mountAutoFocus","unmountAutoFocus"],setup(e,{emit:t}){const n=e,a=t,{currentRef:o,currentElement:r}=P(),c=M(null),i=Tn(),d=We({paused:!1,pause(){this.paused=!0},resume(){this.paused=!1}});G(s=>{if(!U)return;const u=r.value;if(!n.trapped)return;function p(m){if(d.paused||!u)return;const h=m.target;u.contains(h)?c.value=h:W(c.value,{select:!0})}function g(m){if(d.paused||!u)return;const h=m.relatedTarget;h!==null&&(u.contains(h)||W(c.value,{select:!0}))}function k(m){const h=c.value;if(h===null||!m.some(L=>L.removedNodes.length>0))return;const A=F();if(A&&u.contains(A))return;u.contains(h)||W(u)}document.addEventListener("focusin",p),document.addEventListener("focusout",g);const b=new MutationObserver(k);u&&b.observe(u,{childList:!0,subtree:!0}),s(()=>{document.removeEventListener("focusin",p),document.removeEventListener("focusout",g),b.disconnect()})});function l(s,u){const p=new CustomEvent(me,Re),g=k=>a("mountAutoFocus",k);s.addEventListener(me,g),s.dispatchEvent(p),s.removeEventListener(me,g),p.defaultPrevented||(Pn(rt(s),{select:!0}),F()===u&&W(s))}G(async s=>{const u=r.value;if(await j(),!u)return;n.present!==!1&&i.add(d);const p=F();!u.contains(p)&&n.present!==!1&&l(u,p),s(()=>{const k=new CustomEvent(ge,Re),b=m=>{a("unmountAutoFocus",m)};u.addEventListener(ge,b),u.dispatchEvent(k),u.setAttribute("data-focus-scope-unmounting",""),setTimeout(()=>{k.defaultPrevented||W(p??document.body,{select:!0}),u.removeEventListener(ge,b),i.remove(d),u.removeAttribute("data-focus-scope-unmounting")},0)})}),D(()=>n.present,async(s,u)=>{if(!U)return;if(s===!1&&u===!0){i.remove(d);return}if(s!==!0||u!==!1)return;i.add(d),await j();const p=r.value;if(!p)return;const g=F();p.contains(g)||l(p,g)});function f(s){if(!n.loop&&!n.trapped||d.paused)return;const u=s.key==="Tab"&&!s.altKey&&!s.ctrlKey&&!s.metaKey,p=F();if(u&&p){const g=s.currentTarget,[k,b]=qn(g);k&&b?!s.shiftKey&&p===b?(s.preventDefault(),n.loop&&W(k,{select:!0})):s.shiftKey&&p===k&&(s.preventDefault(),n.loop&&W(b,{select:!0})):p===g&&s.preventDefault()}}return(s,u)=>(E(),x(v(B),{ref_key:"currentRef",ref:o,tabindex:"-1","as-child":s.asChild,as:s.as,onKeydown:f},{default:I(()=>[S(s.$slots,"default")]),_:3},8,["as-child","as"]))}}),Rn=Bn;function $n(e){return e?"open":"closed"}var jn=_({__name:"DialogContentImpl",props:{forceMount:{type:Boolean,required:!1},trapFocus:{type:Boolean,required:!1},disableOutsidePointerEvents:{type:Boolean,required:!1},asChild:{type:Boolean,required:!1},as:{type:null,required:!1},present:{type:Boolean,required:!1}},emits:["escapeKeyDown","pointerDownOutside","focusOutside","interactOutside","openAutoFocus","closeAutoFocus"],setup(e,{emit:t}){const n=e,a=t,o=K(),{forwardRef:r,currentElement:c}=P();return o.titleId||(o.titleId=de(void 0,"reka-dialog-title")),o.descriptionId||(o.descriptionId=de(void 0,"reka-dialog-description")),ee(()=>{o.contentElement=c,F()!==document.body&&(o.triggerElement.value=F())}),(i,d)=>(E(),x(v(Rn),{"as-child":"",loop:"",trapped:n.trapFocus,present:n.present,onMountAutoFocus:d[5]||(d[5]=l=>a("openAutoFocus",l)),onUnmountAutoFocus:d[6]||(d[6]=l=>a("closeAutoFocus",l))},{default:I(()=>[J(v(On),z({id:v(o).contentId,ref:v(r),as:i.as,"as-child":i.asChild,present:n.present,"disable-outside-pointer-events":i.disableOutsidePointerEvents,role:"dialog","aria-describedby":v(o).descriptionId,"aria-labelledby":v(o).titleId,"data-state":v($n)(v(o).open.value)},i.$attrs,{onDismiss:d[0]||(d[0]=l=>v(o).onOpenChange(!1)),onEscapeKeyDown:d[1]||(d[1]=l=>a("escapeKeyDown",l)),onFocusOutside:d[2]||(d[2]=l=>a("focusOutside",l)),onInteractOutside:d[3]||(d[3]=l=>a("interactOutside",l)),onPointerDownOutside:d[4]||(d[4]=l=>a("pointerDownOutside",l))}),{default:I(()=>[S(i.$slots,"default")]),_:3},16,["id","as","as-child","present","disable-outside-pointer-events","aria-describedby","aria-labelledby","data-state"])]),_:3},8,["trapped","present"]))}}),st=jn,Nn=_({__name:"DialogContentModal",props:{forceMount:{type:Boolean,required:!1},trapFocus:{type:Boolean,required:!1},disableOutsidePointerEvents:{type:Boolean,required:!1,default:!0},asChild:{type:Boolean,required:!1},as:{type:null,required:!1},present:{type:Boolean,required:!0}},emits:["escapeKeyDown","pointerDownOutside","focusOutside","interactOutside","openAutoFocus","closeAutoFocus"],setup(e,{emit:t}){const n=e,a=t,o=K(),r=Oe(a),{forwardRef:c,currentElement:i}=P(),d=w(()=>n.present?i.value:void 0);gn(d);const l=w(()=>{const{present:f,...s}=n;return s});return D(()=>n.present,(f,s)=>{var u;!f&&s&&((u=o.triggerElement.value)==null||u.focus())}),(f,s)=>(E(),x(st,z({...l.value,...v(r)},{ref:v(c),present:f.present,"trap-focus":v(o).open.value,"disable-outside-pointer-events":n.disableOutsidePointerEvents,onCloseAutoFocus:s[0]||(s[0]=u=>{var p;u.defaultPrevented||(u.preventDefault(),(p=v(o).triggerElement.value)==null||p.focus())}),onPointerDownOutside:s[1]||(s[1]=u=>{const p=u.detail.originalEvent,g=p.button===0&&p.ctrlKey===!0;(p.button===2||g)&&u.preventDefault()}),onFocusOutside:s[2]||(s[2]=u=>{u.preventDefault()})}),{default:I(()=>[S(f.$slots,"default")]),_:3},16,["present","trap-focus","disable-outside-pointer-events"]))}}),zn=Nn,Hn=_({__name:"DialogContentNonModal",props:{forceMount:{type:Boolean,required:!1},trapFocus:{type:Boolean,required:!1},disableOutsidePointerEvents:{type:Boolean,required:!1},asChild:{type:Boolean,required:!1},as:{type:null,required:!1},present:{type:Boolean,required:!0}},emits:["escapeKeyDown","pointerDownOutside","focusOutside","interactOutside","openAutoFocus","closeAutoFocus"],setup(e,{emit:t}){const n=e,o=Oe(t);P();const r=K(),c=M(!1),i=M(!1),d=w(()=>{const{present:l,...f}=n;return f});return D(()=>n.present,(l,f)=>{var s;!l&&f&&(c.value||(s=r.triggerElement.value)==null||s.focus(),c.value=!1,i.value=!1)}),(l,f)=>(E(),x(st,z({...d.value,...v(o)},{present:l.present,"trap-focus":!1,"disable-outside-pointer-events":!1,onCloseAutoFocus:f[0]||(f[0]=s=>{var u;s.defaultPrevented||(c.value||(u=v(r).triggerElement.value)==null||u.focus(),s.preventDefault()),c.value=!1,i.value=!1}),onInteractOutside:f[1]||(f[1]=s=>{var g;s.defaultPrevented||(c.value=!0,s.detail.originalEvent.type==="pointerdown"&&(i.value=!0));const u=s.target;((g=v(r).triggerElement.value)==null?void 0:g.contains(u))&&s.preventDefault(),s.detail.originalEvent.type==="focusin"&&i.value&&s.preventDefault()})}),{default:I(()=>[S(l.$slots,"default")]),_:3},16,["present"]))}}),Vn=Hn,Un=_({__name:"DialogContent",props:{forceMount:{type:Boolean,required:!1},disableOutsidePointerEvents:{type:Boolean,required:!1,default:void 0},asChild:{type:Boolean,required:!1},as:{type:null,required:!1}},emits:["escapeKeyDown","pointerDownOutside","focusOutside","interactOutside","openAutoFocus","closeAutoFocus"],setup(e,{emit:t}){const n=e,a=t,o=K(),r=Oe(a),{forwardRef:c}=P(),i=w(()=>n.forceMount||!o.unmountOnHide.value);return(d,l)=>(E(),x(v(De),{present:v(o).open.value,"force-mount":i.value},{default:I(({present:f})=>[v(o).modal.value?ke((E(),x(zn,z({key:0,ref:v(c),present:i.value?f:!0},{...n,...v(r),...d.$attrs}),{default:I(()=>[S(d.$slots,"default")]),_:2},1040,["present"])),[[be,d.forceMount||v(o).unmountOnHide.value||f]]):ke((E(),x(Vn,z({key:1,ref:v(c),present:i.value?f:!0},{...n,...v(r),...d.$attrs}),{default:I(()=>[S(d.$slots,"default")]),_:2},1040,["present"])),[[be,d.forceMount||v(o).unmountOnHide.value||f]])]),_:3},8,["present","force-mount"]))}}),ur=Un,Kn=_({__name:"DialogDescription",props:{asChild:{type:Boolean,required:!1},as:{type:null,required:!1,default:"p"}},setup(e){const t=e;P();const n=K();return(a,o)=>(E(),x(v(B),z(t,{id:v(n).descriptionId}),{default:I(()=>[S(a.$slots,"default")]),_:3},16,["id"]))}}),cr=Kn,Wn=_({__name:"DialogOverlayImpl",props:{asChild:{type:Boolean,required:!1},as:{type:null,required:!1},present:{type:Boolean,required:!1,default:!0}},setup(e){const t=e,n=K(),a=fn(t.present);return D(()=>t.present,o=>a.value=o),P(),(o,r)=>(E(),x(v(B),{as:o.as,"as-child":o.asChild,"data-state":v(n).open.value?"open":"closed",style:{"pointer-events":"auto"},onPointerdown:r[0]||(r[0]=Ge(()=>{},["left","self","prevent"]))},{default:I(()=>[S(o.$slots,"default")]),_:3},8,["as","as-child","data-state"]))}}),Zn=Wn,Gn=_({__name:"DialogOverlay",props:{forceMount:{type:Boolean,required:!1},asChild:{type:Boolean,required:!1},as:{type:null,required:!1}},setup(e){const t=e,n=K(),{forwardRef:a}=P(),o=w(()=>t.forceMount||!n.unmountOnHide.value);return(r,c)=>{var i;return(i=v(n))!=null&&i.modal.value?(E(),x(v(De),{key:0,present:v(n).open.value,"force-mount":o.value},{default:I(({present:d})=>[ke(J(Zn,z(r.$attrs,{ref:v(a),as:r.as,"as-child":r.asChild,present:o.value?d:!0}),{default:I(()=>[S(r.$slots,"default")]),_:2},1040,["as","as-child","present"]),[[be,r.forceMount||v(n).unmountOnHide.value||d]])]),_:3},8,["present","force-mount"])):Ee("v-if",!0)}}}),dr=Gn,Jn=_({__name:"Teleport",props:{to:{type:null,required:!1},disabled:{type:Boolean,required:!1},defer:{type:Boolean,required:!1},forceMount:{type:Boolean,required:!1}},setup(e){const t=e,n=pe({}),a=w(()=>{var r;return t.to??((r=n.teleportTo)==null?void 0:r.value)??"body"}),o=on();return(r,c)=>v(o)||r.forceMount?(E(),x(bt,{key:0,to:a.value,disabled:r.disabled,defer:r.defer},[S(r.$slots,"default")],8,["to","disabled","defer"])):Ee("v-if",!0)}}),Yn=Jn,Qn=_({__name:"DialogPortal",props:{to:{type:null,required:!1},disabled:{type:Boolean,required:!1},defer:{type:Boolean,required:!1},forceMount:{type:Boolean,required:!1}},setup(e){const t=e;return(n,a)=>(E(),x(v(Yn),Mt(wt(t)),{default:I(()=>[S(n.$slots,"default")]),_:3},16))}}),fr=Qn,Xn=_({__name:"DialogTitle",props:{asChild:{type:Boolean,required:!1},as:{type:null,required:!1,default:"h2"}},setup(e){const t=e,n=K();return P(),(a,o)=>(E(),x(v(B),z(t,{id:v(n).titleId}),{default:I(()=>[S(a.$slots,"default")]),_:3},16,["id"]))}}),pr=Xn;const je="data-reka-collection-item";function it(e={}){const{key:t="",isProvider:n=!1}=e,a=`${t}CollectionProvider`;let o;if(n){const s=M(new Map);o={collectionRef:M(),itemMap:s},Ve(a,o)}else o=He(a);const r=(s,u=!1)=>{if(!o.collectionRef.value)return;const p=o.itemMap.value.get(s);return p&&(u||p.ref.dataset.disabled!=="")?p:void 0},c=(s=!1)=>{const u=o.collectionRef.value;if(!u)return[];const p=Array.from(u.querySelectorAll(`[${je}]`)),g=new Map(p.map((m,h)=>[m,h])),b=Array.from(o.itemMap.value.values()).sort((m,h)=>(g.get(m.ref)??-1)-(g.get(h.ref)??-1));return s?b:b.filter(m=>m.ref.dataset.disabled!=="")},i=_({name:"CollectionSlot",inheritAttrs:!1,setup(s,{slots:u,attrs:p}){const{primitiveElement:g,currentElement:k}=Fe();return D(k,()=>{o.collectionRef.value=k.value}),()=>V(Ce,{ref:g,...p},u)}}),d=_({name:"CollectionItem",inheritAttrs:!1,props:{value:{validator:()=>!0}},setup(s,{slots:u,attrs:p}){const{primitiveElement:g,currentElement:k}=Fe();return G(b=>{if(k.value){const m=Ct(k.value);o.itemMap.value.set(m,{ref:k.value,value:s.value}),b(()=>o.itemMap.value.delete(m))}}),()=>V(Ce,{...p,[je]:"",ref:g},u)}}),l=w(()=>Array.from(o.itemMap.value.values())),f=w(()=>o.itemMap.value.size);return{getItems:c,getItem:r,reactiveItems:l,itemMapSize:f,CollectionSlot:i,CollectionItem:d}}const ea="rovingFocusGroup.onEntryFocus",ta={bubbles:!1,cancelable:!0},na={ArrowLeft:"prev",ArrowUp:"prev",ArrowRight:"next",ArrowDown:"next",PageUp:"first",Home:"first",PageDown:"last",End:"last"};function aa(e,t){return t!=="rtl"?e:e==="ArrowLeft"?"ArrowRight":e==="ArrowRight"?"ArrowLeft":e}function oa(e,t,n){const a=aa(e.key,n);if(!(t==="vertical"&&["ArrowLeft","ArrowRight"].includes(a))&&!(t==="horizontal"&&["ArrowUp","ArrowDown"].includes(a)))return na[a]}function lt(e,t=!1){const n=F();for(const a of e)if(a===n||(a.focus({preventScroll:t}),F()!==n))return}function ra(e,t){return e.map((n,a)=>e[(t+a)%e.length])}const[sa,ia]=fe("RovingFocusGroup");var la=_({__name:"RovingFocusGroup",props:{orientation:{type:String,required:!1,default:void 0},dir:{type:String,required:!1},loop:{type:Boolean,required:!1,default:!1},currentTabStopId:{type:[String,null],required:!1},defaultCurrentTabStopId:{type:String,required:!1},preventScrollOnEntryFocus:{type:Boolean,required:!1,default:!1},asChild:{type:Boolean,required:!1},as:{type:null,required:!1}},emits:["entryFocus","update:currentTabStopId"],setup(e,{expose:t,emit:n}){const a=e,o=n,{loop:r,orientation:c,dir:i}=ne(a),d=nt(i),l=Se(a,"currentTabStopId",o,{defaultValue:a.defaultCurrentTabStopId,passive:a.currentTabStopId===void 0}),f=M(!1),s=M(!1),u=M(0),{getItems:p,CollectionSlot:g}=it({isProvider:!0});function k(m){const h=!s.value;if(m.currentTarget&&m.target===m.currentTarget&&h&&!f.value){const O=new CustomEvent(ea,ta);if(m.currentTarget.dispatchEvent(O),o("entryFocus",O),!O.defaultPrevented){const A=p().map(R=>R.ref).filter(R=>R.dataset.disabled!==""),H=A.find(R=>R.getAttribute("data-active")===""),L=A.find(R=>R.getAttribute("data-highlighted")===""),oe=A.find(R=>R.id===l.value),Y=[H,L,oe,...A].filter(Boolean);lt(Y,a.preventScrollOnEntryFocus)}}s.value=!1}function b(){setTimeout(()=>{s.value=!1},1)}return t({getItems:p}),ia({loop:r,dir:d,orientation:c,currentTabStopId:l,onItemFocus:m=>{l.value=m},onItemShiftTab:()=>{f.value=!0},onFocusableItemAdd:()=>{u.value++},onFocusableItemRemove:()=>{u.value--}}),(m,h)=>(E(),x(v(g),null,{default:I(()=>[J(v(B),{tabindex:f.value||u.value===0?-1:0,"data-orientation":v(c),as:m.as,"as-child":m.asChild,dir:v(d),style:{outline:"none"},onMousedown:h[0]||(h[0]=O=>s.value=!0),onMouseup:b,onFocus:k,onBlur:h[1]||(h[1]=O=>f.value=!1)},{default:I(()=>[S(m.$slots,"default")]),_:3},8,["tabindex","data-orientation","as","as-child","dir"])]),_:3}))}}),ua=la,ca=_({__name:"RovingFocusItem",props:{tabStopId:{type:String,required:!1},focusable:{type:Boolean,required:!1,default:!0},active:{type:Boolean,required:!1},allowShiftKey:{type:Boolean,required:!1},asChild:{type:Boolean,required:!1},as:{type:null,required:!1,default:"span"}},setup(e){const t=e,n=sa(),a=de(),o=w(()=>t.tabStopId||a),r=w(()=>n.currentTabStopId.value===o.value),{getItems:c,CollectionItem:i}=it();ee(()=>{t.focusable&&n.onFocusableItemAdd()}),_e(()=>{t.focusable&&n.onFocusableItemRemove()}),D(()=>t.focusable,(l,f)=>{l!==f&&(l?n.onFocusableItemAdd():n.onFocusableItemRemove())});function d(l){if(l.key==="Tab"&&l.shiftKey){n.onItemShiftTab();return}if(l.target!==l.currentTarget)return;const f=oa(l,n.orientation.value,n.dir.value);if(f!==void 0){if(l.metaKey||l.ctrlKey||l.altKey||!t.allowShiftKey&&l.shiftKey)return;l.preventDefault();let s=[...c().map(u=>u.ref).filter(u=>u.dataset.disabled!=="")];if(f==="last")s.reverse();else if(f==="prev"||f==="next"){f==="prev"&&s.reverse();const u=s.indexOf(l.currentTarget);s=n.loop.value?ra(s,u+1):s.slice(u+1)}j(()=>lt(s))}}return(l,f)=>(E(),x(v(i),null,{default:I(()=>[J(v(B),{tabindex:r.value?0:-1,"data-orientation":v(n).orientation.value,"data-active":l.active?"":void 0,"data-disabled":l.focusable?void 0:"",as:l.as,"as-child":l.asChild,onMousedown:f[0]||(f[0]=s=>{l.focusable?v(n).onItemFocus(o.value):s.preventDefault()}),onFocus:f[1]||(f[1]=s=>v(n).onItemFocus(o.value)),onKeydown:d},{default:I(()=>[S(l.$slots,"default")]),_:3},8,["tabindex","data-orientation","data-active","data-disabled","as","as-child"])]),_:3}))}}),da=ca;const[Te,fa]=fe("TabsRoot");var pa=_({__name:"TabsRoot",props:{defaultValue:{type:null,required:!1},orientation:{type:String,required:!1,default:"horizontal"},dir:{type:String,required:!1},activationMode:{type:String,required:!1,default:"automatic"},modelValue:{type:null,required:!1},unmountOnHide:{type:Boolean,required:!1,default:!0},asChild:{type:Boolean,required:!1},as:{type:null,required:!1}},emits:["update:modelValue"],setup(e,{emit:t}){const n=e,a=t,{orientation:o,unmountOnHide:r,dir:c}=ne(n),i=nt(c);P();const d=Se(n,"modelValue",a,{defaultValue:n.defaultValue,passive:n.modelValue===void 0}),l=M(),f=Ie(new Set);return fa({modelValue:d,changeModelValue:s=>{d.value=s},orientation:o,dir:i,unmountOnHide:r,activationMode:n.activationMode,baseId:de(void 0,"reka-tabs"),tabsList:l,contentIds:f,registerContent:s=>{f.value=new Set([...f.value,s])},unregisterContent:s=>{const u=new Set(f.value);u.delete(s),f.value=u}}),(s,u)=>(E(),x(v(B),{dir:v(i),"data-orientation":v(o),"as-child":s.asChild,as:s.as},{default:I(()=>[S(s.$slots,"default",{modelValue:v(d)})]),_:3},8,["dir","data-orientation","as-child","as"]))}}),yr=pa;function ut(e,t){return`${e}-trigger-${t}`}function ct(e,t){return`${e}-content-${t}`}var ya=_({__name:"TabsContent",props:{value:{type:[String,Number],required:!0},forceMount:{type:Boolean,required:!1},asChild:{type:Boolean,required:!1},as:{type:null,required:!1}},setup(e){const t=e,{forwardRef:n}=P(),a=Te(),o=w(()=>ut(a.baseId,t.value)),r=w(()=>ct(a.baseId,t.value)),c=w(()=>t.value===a.modelValue.value),i=M(c.value);return ee(()=>{a.registerContent(t.value),requestAnimationFrame(()=>{i.value=!1})}),Ue(()=>{a.unregisterContent(t.value)}),(d,l)=>(E(),x(v(De),{present:d.forceMount||c.value,"force-mount":""},{default:I(({present:f})=>[J(v(B),{id:r.value,ref:v(n),"as-child":d.asChild,as:d.as,role:"tabpanel","data-state":c.value?"active":"inactive","data-orientation":v(a).orientation.value,"aria-labelledby":o.value,hidden:!f,tabindex:"0",style:Ze({animationDuration:i.value?"0s":void 0})},{default:I(()=>[!v(a).unmountOnHide.value||f?S(d.$slots,"default",{key:0}):Ee("v-if",!0)]),_:2},1032,["id","as-child","as","data-state","data-orientation","aria-labelledby","hidden","style"])]),_:3},8,["present"]))}}),vr=ya,va=_({__name:"TabsList",props:{loop:{type:Boolean,required:!1,default:!0},asChild:{type:Boolean,required:!1},as:{type:null,required:!1}},setup(e){const t=e,{loop:n}=ne(t),{forwardRef:a,currentElement:o}=P(),r=Te();return r.tabsList=o,(c,i)=>(E(),x(v(ua),{"as-child":"",orientation:v(r).orientation.value,dir:v(r).dir.value,loop:v(n)},{default:I(()=>[J(v(B),{ref:v(a),role:"tablist","as-child":c.asChild,as:c.as,"aria-orientation":v(r).orientation.value},{default:I(()=>[S(c.$slots,"default")]),_:3},8,["as-child","as","aria-orientation"])]),_:3},8,["orientation","dir","loop"]))}}),hr=va,ha=_({__name:"TabsTrigger",props:{value:{type:[String,Number],required:!0},disabled:{type:Boolean,required:!1,default:!1},asChild:{type:Boolean,required:!1},as:{type:null,required:!1,default:"button"}},setup(e){const t=e,{forwardRef:n}=P(),a=Te(),o=w(()=>ut(a.baseId,t.value)),r=w(()=>a.contentIds.value.has(t.value)?ct(a.baseId,t.value):void 0),c=w(()=>t.value===a.modelValue.value);return(i,d)=>(E(),x(v(da),{"as-child":"",focusable:!i.disabled,active:c.value},{default:I(()=>[J(v(B),{id:o.value,ref:v(n),role:"tab",type:i.as==="button"?"button":void 0,as:i.as,"as-child":i.asChild,"aria-selected":c.value?"true":"false","aria-controls":r.value,"data-state":c.value?"active":"inactive",disabled:i.disabled,"data-disabled":i.disabled?"":void 0,"data-orientation":v(a).orientation.value,onMousedown:d[0]||(d[0]=Ge(l=>{!i.disabled&&l.ctrlKey===!1?v(a).changeModelValue(i.value):l.preventDefault()},["left"])),onKeydown:d[1]||(d[1]=It(l=>v(a).changeModelValue(i.value),["enter","space"])),onFocus:d[2]||(d[2]=()=>{const l=v(a).activationMode!=="manual";!c.value&&!i.disabled&&l&&v(a).changeModelValue(i.value)})},{default:I(()=>[S(i.$slots,"default")]),_:3},8,["id","type","as","as-child","aria-selected","aria-controls","data-state","disabled","data-disabled","data-orientation"])]),_:3},8,["focusable","active"]))}}),mr=ha;export{ur as $,Ia as A,Oa as B,Va as C,Qa as D,Xa as E,no as F,bo as G,ro as H,Wa as I,vo as J,io as K,yo as L,go as M,Sa as N,wo as O,xo as P,qa as Q,Do as R,Uo as S,Yo as T,tr as U,$a as V,ar as W,Io as X,ko as Y,fr as Z,dr as _,ka as a,pr as a0,cr as a1,lr as a2,rr as a3,ir as a4,Ao as a5,To as a6,sr as a7,to as a8,ga as a9,Oo as aA,Ja as aB,ao as aC,or as aD,Ua as aE,Xo as aF,qo as aG,za as aH,ja as aI,Mo as aJ,oo as aK,Ya as aL,Ga as aM,Pa as aN,so as aO,Ro as aP,Qo as aQ,Ba as aa,Ko as ab,Co as ac,Fa as ad,Zo as ae,co as af,Ka as ag,So as ah,Go as ai,Wo as aj,Jo as ak,Ma as al,zo as am,xa as an,wa as ao,Ea as ap,hr as aq,mr as ar,vr as as,lo as at,yr as au,Eo as av,Lo as aw,Ca as ax,Na as ay,La as az,uo as b,No as c,ho as d,Da as e,nr as f,Ta as g,er as h,fo as i,eo as j,Ha as k,po as l,jo as m,Ra as n,Bo as o,$o as p,_o as q,Po as r,Aa as s,Ho as t,ba as u,_a as v,mo as w,Za as x,Vo as y,Fo as z};
