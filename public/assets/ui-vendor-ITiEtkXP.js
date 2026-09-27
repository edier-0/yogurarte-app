import{r as M,w as q,u as v,o as ee,n as B,g as Ne,a as Ue,b as vt,c as K,d as Z,s as Ee,e as _,h as N,i as Ke,p as We,f as Ge,j as Ze,t as V,F as ht,k as Je,l as mt,m as Ye,q as kt,v as gt,x as bt,y as Oe,z as Mt,A as C,B as oe,C as wt,D as R,E as _t,G as E,H as x,I as A,J as w,K as Qe,L as J,M as _e,N as Ce,O as ve,P as Se,T as Ct,Q as te,R as ae,S as It,U as xt}from"./vue-vendor-BuE91BgS.js";function Xe(e){return Ne()?(Ue(e),!0):!1}function X(e){return typeof e=="function"?e():v(e)}const At=typeof window<"u"&&typeof document<"u";typeof WorkerGlobalScope<"u"&&globalThis instanceof WorkerGlobalScope;const Et=Object.prototype.toString,Ot=e=>Et.call(e)==="[object Object]",Ie=()=>{};function et(e,t){function a(...n){return new Promise((o,r)=>{Promise.resolve(e(()=>t.apply(this,n),{fn:t,thisArg:this,args:n})).then(o).catch(r)})}return a}const tt=e=>e();function St(e,t={}){let a,n,o=Ie;const r=i=>{clearTimeout(i),o(),o=Ie};return i=>{const u=X(e),c=X(t.maxWait);return a&&r(a),u<=0||c!==void 0&&c<=0?(n&&(r(n),n=null),Promise.resolve(i())):new Promise((f,s)=>{o=t.rejectOnCancel?s:f,c&&!n&&(n=setTimeout(()=>{a&&r(a),n=null,f(i())},c)),a=setTimeout(()=>{n&&r(n),n=null,f(i())},u)})}}function Dt(e=tt){const t=M(!0);function a(){t.value=!1}function n(){t.value=!0}const o=(...r)=>{t.value&&e(...r)};return{isActive:vt(t),pause:a,resume:n,eventFilter:o}}function qt(e){return K()}function Pt(e,t=200,a={}){return et(St(t,a),e)}function Pn(e,t=200,a={}){const n=M(e.value),o=Pt(()=>{n.value=e.value},t,a);return q(e,()=>o()),n}function Tt(e,t,a={}){const{eventFilter:n=tt,...o}=a;return q(e,et(n,t),o)}function Lt(e,t,a={}){const{eventFilter:n,...o}=a,{eventFilter:r,pause:l,resume:i,isActive:u}=Dt(n);return{stop:Tt(e,t,{...o,eventFilter:r}),pause:l,resume:i,isActive:u}}function Ft(e,t=!0,a){qt()?ee(e,a):t?e():B(e)}const ne=At?window:void 0;function Bt(e){var t;const a=X(e);return(t=a==null?void 0:a.$el)!=null?t:a}function Fe(...e){let t,a,n,o;if(typeof e[0]=="string"||Array.isArray(e[0])?([a,n,o]=e,t=ne):[t,a,n,o]=e,!t)return Ie;Array.isArray(a)||(a=[a]),Array.isArray(n)||(n=[n]);const r=[],l=()=>{r.forEach(f=>f()),r.length=0},i=(f,s,d,y)=>(f.addEventListener(s,d,y),()=>f.removeEventListener(s,d,y)),u=q(()=>[Bt(t),X(o)],([f,s])=>{if(l(),!f)return;const d=Ot(s)?{...s}:s;r.push(...a.flatMap(y=>n.map(k=>i(f,y,k,d))))},{immediate:!0,flush:"post"}),c=()=>{u(),l()};return Xe(c),c}function Rt(){const e=M(!1),t=K();return t&&ee(()=>{e.value=!0},t),e}function zt(e){const t=Rt();return _(()=>(t.value,!!e()))}function $t(e,t={}){const{window:a=ne}=t,n=zt(()=>a&&"matchMedia"in a&&typeof a.matchMedia=="function");let o;const r=M(!1),l=c=>{r.value=c.matches},i=()=>{o&&("removeEventListener"in o?o.removeEventListener("change",l):o.removeListener(l))},u=Z(()=>{n.value&&(i(),o=a.matchMedia(X(e)),"addEventListener"in o?o.addEventListener("change",l):o.addListener(l),r.value=o.matches)});return Xe(()=>{u(),i(),o=void 0}),r}const ue=typeof globalThis<"u"?globalThis:typeof window<"u"?window:typeof global<"u"?global:typeof self<"u"?self:{},ce="__vueuse_ssr_handlers__",jt=Vt();function Vt(){return ce in ue||(ue[ce]=ue[ce]||{}),ue[ce]}function Ht(e,t){return jt[e]||t}function Tn(e){return $t("(prefers-color-scheme: dark)",e)}function Nt(e){return e==null?"any":e instanceof Set?"set":e instanceof Map?"map":e instanceof Date?"date":typeof e=="boolean"?"boolean":typeof e=="string"?"string":typeof e=="object"?"object":Number.isNaN(e)?"any":"number"}const Ut={boolean:{read:e=>e==="true",write:e=>String(e)},object:{read:e=>JSON.parse(e),write:e=>JSON.stringify(e)},number:{read:e=>Number.parseFloat(e),write:e=>String(e)},any:{read:e=>e,write:e=>String(e)},string:{read:e=>e,write:e=>String(e)},map:{read:e=>new Map(JSON.parse(e)),write:e=>JSON.stringify(Array.from(e.entries()))},set:{read:e=>new Set(JSON.parse(e)),write:e=>JSON.stringify(Array.from(e))},date:{read:e=>new Date(e),write:e=>e.toISOString()}},Be="vueuse-storage";function Kt(e,t,a,n={}){var o;const{flush:r="pre",deep:l=!0,listenToStorageChanges:i=!0,writeDefaults:u=!0,mergeDefaults:c=!1,shallow:f,window:s=ne,eventFilter:d,onError:y=I=>{console.error(I)},initOnMounted:k}=n,g=(f?Ee:M)(t);if(!a)try{a=Ht("getDefaultStorage",()=>{var I;return(I=ne)==null?void 0:I.localStorage})()}catch(I){y(I)}if(!a)return g;const b=X(t),m=Nt(b),h=(o=n.serializer)!=null?o:Ut[m],{pause:D,resume:O}=Lt(g,()=>L(g.value),{flush:r,deep:l,eventFilter:d});s&&i&&Ft(()=>{a instanceof Storage?Fe(s,"storage",Y):Fe(s,Be,$),k&&Y()}),k||Y();function H(I,P){if(s){const j={key:e,oldValue:I,newValue:P,storageArea:a};s.dispatchEvent(a instanceof Storage?new StorageEvent("storage",j):new CustomEvent(Be,{detail:j}))}}function L(I){try{const P=a.getItem(e);if(I==null)H(P,null),a.removeItem(e);else{const j=h.write(I);P!==j&&(a.setItem(e,j),H(P,j))}}catch(P){y(P)}}function le(I){const P=I?I.newValue:a.getItem(e);if(P==null)return u&&b!=null&&a.setItem(e,h.write(b)),b;if(!I&&c){const j=h.read(P);return typeof c=="function"?c(j,b):m==="object"&&!Array.isArray(j)?{...b,...j}:j}else return typeof P!="string"?P:h.read(P)}function Y(I){if(!(I&&I.storageArea!==a)){if(I&&I.key==null){g.value=b;return}if(!(I&&I.key!==e)){D();try{(I==null?void 0:I.newValue)!==h.write(g.value)&&(g.value=le(I))}catch(P){y(P)}finally{I?B(O):O()}}}}function $(I){Y(I.detail)}return g}function Ln(e,t,a={}){const{window:n=ne}=a;return Kt(e,t,n==null?void 0:n.localStorage,a)}/**
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
 */const Gt=({size:e,strokeWidth:t=2,absoluteStrokeWidth:a,color:n,iconNode:o,name:r,class:l,...i},{slots:u})=>N("svg",{...de,width:e||de.width,height:e||de.height,stroke:n||de.stroke,"stroke-width":a?Number(t)*24/Number(e):t,class:["lucide",`lucide-${Wt(r??"icon")}`],...i},[...o.map(c=>N(...c)),...u.default?[u.default()]:[]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const p=(e,t)=>(a,{slots:n})=>N(Gt,{...a,iconNode:t,name:e},n);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Fn=p("ArchiveIcon",[["rect",{width:"20",height:"5",x:"2",y:"3",rx:"1",key:"1wp1u1"}],["path",{d:"M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8",key:"1s80jp"}],["path",{d:"M10 12h4",key:"a56b0p"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Bn=p("ArrowDownLeftIcon",[["path",{d:"M17 7 7 17",key:"15tmo1"}],["path",{d:"M17 17H7V7",key:"1org7z"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Rn=p("ArrowLeftRightIcon",[["path",{d:"M8 3 4 7l4 4",key:"9rb6wj"}],["path",{d:"M4 7h16",key:"6tx8e3"}],["path",{d:"m16 21 4-4-4-4",key:"siv7j2"}],["path",{d:"M20 17H4",key:"h6l3hr"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const zn=p("ArrowLeftIcon",[["path",{d:"m12 19-7-7 7-7",key:"1l729n"}],["path",{d:"M19 12H5",key:"x3x0zl"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const $n=p("ArrowRightIcon",[["path",{d:"M5 12h14",key:"1ays0h"}],["path",{d:"m12 5 7 7-7 7",key:"xquz4c"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const jn=p("ArrowUpDownIcon",[["path",{d:"m21 16-4 4-4-4",key:"f6ql7i"}],["path",{d:"M17 20V4",key:"1ejh1v"}],["path",{d:"m3 8 4-4 4 4",key:"11wl7u"}],["path",{d:"M7 4v16",key:"1glfcx"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Vn=p("ArrowUpRightIcon",[["path",{d:"M7 7h10v10",key:"1tivn9"}],["path",{d:"M7 17 17 7",key:"1vkiza"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Hn=p("AwardIcon",[["path",{d:"m15.477 12.89 1.515 8.526a.5.5 0 0 1-.81.47l-3.58-2.687a1 1 0 0 0-1.197 0l-3.586 2.686a.5.5 0 0 1-.81-.469l1.514-8.526",key:"1yiouv"}],["circle",{cx:"12",cy:"8",r:"6",key:"1vp47v"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Nn=p("BadgeDollarSignIcon",[["path",{d:"M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z",key:"3c2336"}],["path",{d:"M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8",key:"1h4pet"}],["path",{d:"M12 18V6",key:"zqpxq5"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Un=p("BanknoteIcon",[["rect",{width:"20",height:"12",x:"2",y:"6",rx:"2",key:"9lu3g6"}],["circle",{cx:"12",cy:"12",r:"2",key:"1c9p78"}],["path",{d:"M6 12h.01M18 12h.01",key:"113zkx"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Kn=p("BikeIcon",[["circle",{cx:"18.5",cy:"17.5",r:"3.5",key:"15x4ox"}],["circle",{cx:"5.5",cy:"17.5",r:"3.5",key:"1noe27"}],["circle",{cx:"15",cy:"5",r:"1",key:"19l28e"}],["path",{d:"M12 17.5V14l-3-3 4-3 2 3h2",key:"1npguv"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Wn=p("BookOpenIcon",[["path",{d:"M12 7v14",key:"1akyts"}],["path",{d:"M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z",key:"ruj8y"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Gn=p("BoxesIcon",[["path",{d:"M2.97 12.92A2 2 0 0 0 2 14.63v3.24a2 2 0 0 0 .97 1.71l3 1.8a2 2 0 0 0 2.06 0L12 19v-5.5l-5-3-4.03 2.42Z",key:"lc1i9w"}],["path",{d:"m7 16.5-4.74-2.85",key:"1o9zyk"}],["path",{d:"m7 16.5 5-3",key:"va8pkn"}],["path",{d:"M7 16.5v5.17",key:"jnp8gn"}],["path",{d:"M12 13.5V19l3.97 2.38a2 2 0 0 0 2.06 0l3-1.8a2 2 0 0 0 .97-1.71v-3.24a2 2 0 0 0-.97-1.71L17 10.5l-5 3Z",key:"8zsnat"}],["path",{d:"m17 16.5-5-3",key:"8arw3v"}],["path",{d:"m17 16.5 4.74-2.85",key:"8rfmw"}],["path",{d:"M17 16.5v5.17",key:"k6z78m"}],["path",{d:"M7.97 4.42A2 2 0 0 0 7 6.13v4.37l5 3 5-3V6.13a2 2 0 0 0-.97-1.71l-3-1.8a2 2 0 0 0-2.06 0l-3 1.8Z",key:"1xygjf"}],["path",{d:"M12 8 7.26 5.15",key:"1vbdud"}],["path",{d:"m12 8 4.74-2.85",key:"3rx089"}],["path",{d:"M12 13.5V8",key:"1io7kd"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Zn=p("BriefcaseIcon",[["path",{d:"M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16",key:"jecpp"}],["rect",{width:"20",height:"14",x:"2",y:"6",rx:"2",key:"i6l2r4"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Jn=p("BuildingIcon",[["rect",{width:"16",height:"20",x:"4",y:"2",rx:"2",ry:"2",key:"76otgf"}],["path",{d:"M9 22v-4h6v4",key:"r93iot"}],["path",{d:"M8 6h.01",key:"1dz90k"}],["path",{d:"M16 6h.01",key:"1x0f13"}],["path",{d:"M12 6h.01",key:"1vi96p"}],["path",{d:"M12 10h.01",key:"1nrarc"}],["path",{d:"M12 14h.01",key:"1etili"}],["path",{d:"M16 10h.01",key:"1m94wz"}],["path",{d:"M16 14h.01",key:"1gbofw"}],["path",{d:"M8 10h.01",key:"19clt8"}],["path",{d:"M8 14h.01",key:"6423bh"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Yn=p("CalculatorIcon",[["rect",{width:"16",height:"20",x:"4",y:"2",rx:"2",key:"1nb95v"}],["line",{x1:"8",x2:"16",y1:"6",y2:"6",key:"x4nwl0"}],["line",{x1:"16",x2:"16",y1:"14",y2:"18",key:"wjye3r"}],["path",{d:"M16 10h.01",key:"1m94wz"}],["path",{d:"M12 10h.01",key:"1nrarc"}],["path",{d:"M8 10h.01",key:"19clt8"}],["path",{d:"M12 14h.01",key:"1etili"}],["path",{d:"M8 14h.01",key:"6423bh"}],["path",{d:"M12 18h.01",key:"mhygvu"}],["path",{d:"M8 18h.01",key:"lrp35t"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Qn=p("CalendarCheckIcon",[["path",{d:"M8 2v4",key:"1cmpym"}],["path",{d:"M16 2v4",key:"4m81vk"}],["rect",{width:"18",height:"18",x:"3",y:"4",rx:"2",key:"1hopcy"}],["path",{d:"M3 10h18",key:"8toen8"}],["path",{d:"m9 16 2 2 4-4",key:"19s6y9"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Xn=p("CalendarClockIcon",[["path",{d:"M21 7.5V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h3.5",key:"1osxxc"}],["path",{d:"M16 2v4",key:"4m81vk"}],["path",{d:"M8 2v4",key:"1cmpym"}],["path",{d:"M3 10h5",key:"r794hk"}],["path",{d:"M17.5 17.5 16 16.3V14",key:"akvzfd"}],["circle",{cx:"16",cy:"16",r:"6",key:"qoo3c4"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const eo=p("CalendarRangeIcon",[["rect",{width:"18",height:"18",x:"3",y:"4",rx:"2",key:"1hopcy"}],["path",{d:"M16 2v4",key:"4m81vk"}],["path",{d:"M3 10h18",key:"8toen8"}],["path",{d:"M8 2v4",key:"1cmpym"}],["path",{d:"M17 14h-6",key:"bkmgh3"}],["path",{d:"M13 18H7",key:"bb0bb7"}],["path",{d:"M7 14h.01",key:"1qa3f1"}],["path",{d:"M17 18h.01",key:"1bdyru"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const to=p("CalendarIcon",[["path",{d:"M8 2v4",key:"1cmpym"}],["path",{d:"M16 2v4",key:"4m81vk"}],["rect",{width:"18",height:"18",x:"3",y:"4",rx:"2",key:"1hopcy"}],["path",{d:"M3 10h18",key:"8toen8"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ao=p("CheckCheckIcon",[["path",{d:"M18 6 7 17l-5-5",key:"116fxf"}],["path",{d:"m22 10-7.5 7.5L13 16",key:"ke71qq"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const no=p("CheckIcon",[["path",{d:"M20 6 9 17l-5-5",key:"1gmf2c"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const oo=p("ChefHatIcon",[["path",{d:"M17 21a1 1 0 0 0 1-1v-5.35c0-.457.316-.844.727-1.041a4 4 0 0 0-2.134-7.589 5 5 0 0 0-9.186 0 4 4 0 0 0-2.134 7.588c.411.198.727.585.727 1.041V20a1 1 0 0 0 1 1Z",key:"1qvrer"}],["path",{d:"M6 17h12",key:"1jwigz"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ro=p("ChevronDownIcon",[["path",{d:"m6 9 6 6 6-6",key:"qrunsl"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const so=p("ChevronLeftIcon",[["path",{d:"m15 18-6-6 6-6",key:"1wnfg3"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const io=p("ChevronRightIcon",[["path",{d:"m9 18 6-6-6-6",key:"mthhwq"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const lo=p("ChevronUpIcon",[["path",{d:"m18 15-6-6-6 6",key:"153udz"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const uo=p("CircleAlertIcon",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["line",{x1:"12",x2:"12",y1:"8",y2:"12",key:"1pkeuh"}],["line",{x1:"12",x2:"12.01",y1:"16",y2:"16",key:"4dfq90"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const co=p("CircleCheckIcon",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["path",{d:"m9 12 2 2 4-4",key:"dzmm74"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const po=p("CircleHelpIcon",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["path",{d:"M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3",key:"1u773s"}],["path",{d:"M12 17h.01",key:"p32p05"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const fo=p("CirclePauseIcon",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["line",{x1:"10",x2:"10",y1:"15",y2:"9",key:"c1nkhi"}],["line",{x1:"14",x2:"14",y1:"15",y2:"9",key:"h65svq"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const yo=p("ClipboardListIcon",[["rect",{width:"8",height:"4",x:"8",y:"2",rx:"1",ry:"1",key:"tgr4d6"}],["path",{d:"M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2",key:"116196"}],["path",{d:"M12 11h4",key:"1jrz19"}],["path",{d:"M12 16h4",key:"n85exb"}],["path",{d:"M8 11h.01",key:"1dfujw"}],["path",{d:"M8 16h.01",key:"18s6g9"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const vo=p("ClockIcon",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["polyline",{points:"12 6 12 12 16 14",key:"68esgv"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ho=p("CoinsIcon",[["circle",{cx:"8",cy:"8",r:"6",key:"3yglwk"}],["path",{d:"M18.09 10.37A6 6 0 1 1 10.34 18",key:"t5s6rm"}],["path",{d:"M7 6h1v4",key:"1obek4"}],["path",{d:"m16.71 13.88.7.71-2.82 2.82",key:"1rbuyh"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const mo=p("CopyIcon",[["rect",{width:"14",height:"14",x:"8",y:"8",rx:"2",ry:"2",key:"17jyea"}],["path",{d:"M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2",key:"zix9uf"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ko=p("CreditCardIcon",[["rect",{width:"20",height:"14",x:"2",y:"5",rx:"2",key:"ynyp8z"}],["line",{x1:"2",x2:"22",y1:"10",y2:"10",key:"1b3vmo"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const go=p("CrownIcon",[["path",{d:"M11.562 3.266a.5.5 0 0 1 .876 0L15.39 8.87a1 1 0 0 0 1.516.294L21.183 5.5a.5.5 0 0 1 .798.519l-2.834 10.246a1 1 0 0 1-.956.734H5.81a1 1 0 0 1-.957-.734L2.02 6.02a.5.5 0 0 1 .798-.519l4.276 3.664a1 1 0 0 0 1.516-.294z",key:"1vdc57"}],["path",{d:"M5 21h14",key:"11awu3"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const bo=p("DollarSignIcon",[["line",{x1:"12",x2:"12",y1:"2",y2:"22",key:"7eqyqh"}],["path",{d:"M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6",key:"1b0p4s"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Mo=p("ExternalLinkIcon",[["path",{d:"M15 3h6v6",key:"1q9fwt"}],["path",{d:"M10 14 21 3",key:"gplh6r"}],["path",{d:"M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6",key:"a6xqqp"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const wo=p("EyeOffIcon",[["path",{d:"M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49",key:"ct8e1f"}],["path",{d:"M14.084 14.158a3 3 0 0 1-4.242-4.242",key:"151rxh"}],["path",{d:"M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143",key:"13bj9a"}],["path",{d:"m2 2 20 20",key:"1ooewy"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const _o=p("EyeIcon",[["path",{d:"M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0",key:"1nclc0"}],["circle",{cx:"12",cy:"12",r:"3",key:"1v7zrd"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Co=p("FileTextIcon",[["path",{d:"M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z",key:"1rqfz7"}],["path",{d:"M14 2v4a2 2 0 0 0 2 2h4",key:"tnqrlb"}],["path",{d:"M10 9H8",key:"b1mrlr"}],["path",{d:"M16 13H8",key:"t4e002"}],["path",{d:"M16 17H8",key:"z1uh3a"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Io=p("FlaskConicalIcon",[["path",{d:"M10 2v7.527a2 2 0 0 1-.211.896L4.72 20.55a1 1 0 0 0 .9 1.45h12.76a1 1 0 0 0 .9-1.45l-5.069-10.127A2 2 0 0 1 14 9.527V2",key:"pzvekw"}],["path",{d:"M8.5 2h7",key:"csnxdl"}],["path",{d:"M7 16h10",key:"wp8him"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const xo=p("FuelIcon",[["line",{x1:"3",x2:"15",y1:"22",y2:"22",key:"xegly4"}],["line",{x1:"4",x2:"14",y1:"9",y2:"9",key:"xcnuvu"}],["path",{d:"M14 22V4a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v18",key:"16j0yd"}],["path",{d:"M14 13h2a2 2 0 0 1 2 2v2a2 2 0 0 0 2 2a2 2 0 0 0 2-2V9.83a2 2 0 0 0-.59-1.42L18 5",key:"7cu91f"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ao=p("GiftIcon",[["rect",{x:"3",y:"8",width:"18",height:"4",rx:"1",key:"bkv52"}],["path",{d:"M12 8v13",key:"1c76mn"}],["path",{d:"M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7",key:"6wjy6b"}],["path",{d:"M7.5 8a2.5 2.5 0 0 1 0-5A4.8 8 0 0 1 12 8a4.8 8 0 0 1 4.5-5 2.5 2.5 0 0 1 0 5",key:"1ihvrl"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Eo=p("GitMergeIcon",[["circle",{cx:"18",cy:"18",r:"3",key:"1xkwt0"}],["circle",{cx:"6",cy:"6",r:"3",key:"1lh9wr"}],["path",{d:"M6 21V9a9 9 0 0 0 9 9",key:"7kw0sc"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Oo=p("HardHatIcon",[["path",{d:"M2 18a1 1 0 0 0 1 1h18a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1v2z",key:"1dej2m"}],["path",{d:"M10 10V5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v5",key:"1p9q5i"}],["path",{d:"M4 15v-3a6 6 0 0 1 6-6",key:"9ciidu"}],["path",{d:"M14 6a6 6 0 0 1 6 6v3",key:"1hnv84"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const So=p("HashIcon",[["line",{x1:"4",x2:"20",y1:"9",y2:"9",key:"4lhtct"}],["line",{x1:"4",x2:"20",y1:"15",y2:"15",key:"vyu0kd"}],["line",{x1:"10",x2:"8",y1:"3",y2:"21",key:"1ggp8o"}],["line",{x1:"16",x2:"14",y1:"3",y2:"21",key:"weycgp"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Do=p("InfoIcon",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["path",{d:"M12 16v-4",key:"1dtifu"}],["path",{d:"M12 8h.01",key:"e9boi3"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const qo=p("InstagramIcon",[["rect",{width:"20",height:"20",x:"2",y:"2",rx:"5",ry:"5",key:"2e1cvw"}],["path",{d:"M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z",key:"9exkf1"}],["line",{x1:"17.5",x2:"17.51",y1:"6.5",y2:"6.5",key:"r4j83e"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Po=p("KeyRoundIcon",[["path",{d:"M2.586 17.414A2 2 0 0 0 2 18.828V21a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h1a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h.172a2 2 0 0 0 1.414-.586l.814-.814a6.5 6.5 0 1 0-4-4z",key:"1s6t7t"}],["circle",{cx:"16.5",cy:"7.5",r:".5",fill:"currentColor",key:"w0ekpg"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const To=p("LayersIcon",[["path",{d:"m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z",key:"8b97xw"}],["path",{d:"m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65",key:"dd6zsq"}],["path",{d:"m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65",key:"ep9fru"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Lo=p("LayoutDashboardIcon",[["rect",{width:"7",height:"9",x:"3",y:"3",rx:"1",key:"10lvy0"}],["rect",{width:"7",height:"5",x:"14",y:"3",rx:"1",key:"16une8"}],["rect",{width:"7",height:"9",x:"14",y:"12",rx:"1",key:"1hutg5"}],["rect",{width:"7",height:"5",x:"3",y:"16",rx:"1",key:"ldoo1y"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Fo=p("LoaderCircleIcon",[["path",{d:"M21 12a9 9 0 1 1-6.219-8.56",key:"13zald"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Bo=p("LockIcon",[["rect",{width:"18",height:"11",x:"3",y:"11",rx:"2",ry:"2",key:"1w4ew1"}],["path",{d:"M7 11V7a5 5 0 0 1 10 0v4",key:"fwvmzm"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ro=p("LogInIcon",[["path",{d:"M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4",key:"u53s6r"}],["polyline",{points:"10 17 15 12 10 7",key:"1ail0h"}],["line",{x1:"15",x2:"3",y1:"12",y2:"12",key:"v6grx8"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const zo=p("LogOutIcon",[["path",{d:"M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4",key:"1uf3rs"}],["polyline",{points:"16 17 21 12 16 7",key:"1gabdz"}],["line",{x1:"21",x2:"9",y1:"12",y2:"12",key:"1uyos4"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const $o=p("MapPinIcon",[["path",{d:"M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0",key:"1r0f0z"}],["circle",{cx:"12",cy:"10",r:"3",key:"ilqhr7"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const jo=p("MessageCircleIcon",[["path",{d:"M7.9 20A9 9 0 1 0 4 16.1L2 22Z",key:"vv11sd"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Vo=p("MilkIcon",[["path",{d:"M8 2h8",key:"1ssgc1"}],["path",{d:"M9 2v2.789a4 4 0 0 1-.672 2.219l-.656.984A4 4 0 0 0 7 10.212V20a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-9.789a4 4 0 0 0-.672-2.219l-.656-.984A4 4 0 0 1 15 4.788V2",key:"qtp12x"}],["path",{d:"M7 15a6.472 6.472 0 0 1 5 0 6.47 6.47 0 0 0 5 0",key:"ygeh44"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ho=p("MoonIcon",[["path",{d:"M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z",key:"a7tn18"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const No=p("PackageCheckIcon",[["path",{d:"m16 16 2 2 4-4",key:"gfu2re"}],["path",{d:"M21 10V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l2-1.14",key:"e7tb2h"}],["path",{d:"m7.5 4.27 9 5.15",key:"1c824w"}],["polyline",{points:"3.29 7 12 12 20.71 7",key:"ousv84"}],["line",{x1:"12",x2:"12",y1:"22",y2:"12",key:"a4e8g8"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Uo=p("PackageIcon",[["path",{d:"M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z",key:"1a0edw"}],["path",{d:"M12 22V12",key:"d0xqtd"}],["path",{d:"m3.3 7 7.703 4.734a2 2 0 0 0 1.994 0L20.7 7",key:"yx3hmr"}],["path",{d:"m7.5 4.27 9 5.15",key:"1c824w"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ko=p("PauseIcon",[["rect",{x:"14",y:"4",width:"4",height:"16",rx:"1",key:"zuxfzm"}],["rect",{x:"6",y:"4",width:"4",height:"16",rx:"1",key:"1okwgv"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Wo=p("PenLineIcon",[["path",{d:"M12 20h9",key:"t2du7b"}],["path",{d:"M16.376 3.622a1 1 0 0 1 3.002 3.002L7.368 18.635a2 2 0 0 1-.855.506l-2.872.838a.5.5 0 0 1-.62-.62l.838-2.872a2 2 0 0 1 .506-.854z",key:"1ykcvy"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Go=p("PenIcon",[["path",{d:"M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z",key:"1a8usu"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Zo=p("PencilIcon",[["path",{d:"M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z",key:"1a8usu"}],["path",{d:"m15 5 4 4",key:"1mk7zo"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Jo=p("PercentIcon",[["line",{x1:"19",x2:"5",y1:"5",y2:"19",key:"1x9vlm"}],["circle",{cx:"6.5",cy:"6.5",r:"2.5",key:"4mh3h7"}],["circle",{cx:"17.5",cy:"17.5",r:"2.5",key:"1mdrzq"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Yo=p("PhoneCallIcon",[["path",{d:"M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z",key:"foiqr5"}],["path",{d:"M14.05 2a9 9 0 0 1 8 7.94",key:"vmijpz"}],["path",{d:"M14.05 6A5 5 0 0 1 18 10",key:"13nbpp"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Qo=p("PhoneIcon",[["path",{d:"M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z",key:"foiqr5"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Xo=p("PiggyBankIcon",[["path",{d:"M19 5c-1.5 0-2.8 1.4-3 2-3.5-1.5-11-.3-11 5 0 1.8 0 3 2 4.5V20h4v-2h3v2h4v-4c1-.5 1.7-1 2-2h2v-4h-2c0-1-.5-1.5-1-2V5z",key:"1ivx2i"}],["path",{d:"M2 9v1c0 1.1.9 2 2 2h1",key:"nm575m"}],["path",{d:"M16 11h.01",key:"xkw8gn"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const er=p("PlayIcon",[["polygon",{points:"6 3 20 12 6 21 6 3",key:"1oa8hb"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const tr=p("PlusIcon",[["path",{d:"M5 12h14",key:"1ays0h"}],["path",{d:"M12 5v14",key:"s699le"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ar=p("PowerIcon",[["path",{d:"M12 2v10",key:"mnfbl"}],["path",{d:"M18.4 6.6a9 9 0 1 1-12.77.04",key:"obofu9"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const nr=p("QrCodeIcon",[["rect",{width:"5",height:"5",x:"3",y:"3",rx:"1",key:"1tu5fj"}],["rect",{width:"5",height:"5",x:"16",y:"3",rx:"1",key:"1v8r4q"}],["rect",{width:"5",height:"5",x:"3",y:"16",rx:"1",key:"1x03jg"}],["path",{d:"M21 16h-3a2 2 0 0 0-2 2v3",key:"177gqh"}],["path",{d:"M21 21v.01",key:"ents32"}],["path",{d:"M12 7v3a2 2 0 0 1-2 2H7",key:"8crl2c"}],["path",{d:"M3 12h.01",key:"nlz23k"}],["path",{d:"M12 3h.01",key:"n36tog"}],["path",{d:"M12 16v.01",key:"133mhm"}],["path",{d:"M16 12h1",key:"1slzba"}],["path",{d:"M21 12v.01",key:"1lwtk9"}],["path",{d:"M12 21v-1",key:"1880an"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const or=p("ReceiptTextIcon",[["path",{d:"M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z",key:"q3az6g"}],["path",{d:"M14 8H8",key:"1l3xfs"}],["path",{d:"M16 12H8",key:"1fr5h0"}],["path",{d:"M13 16H8",key:"wsln4y"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const rr=p("ReceiptIcon",[["path",{d:"M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z",key:"q3az6g"}],["path",{d:"M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8",key:"1h4pet"}],["path",{d:"M12 17.5v-11",key:"1jc1ny"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const sr=p("RefreshCwIcon",[["path",{d:"M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8",key:"v9h5vc"}],["path",{d:"M21 3v5h-5",key:"1q7to0"}],["path",{d:"M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16",key:"3uifl3"}],["path",{d:"M8 16H3v5",key:"1cv678"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ir=p("RepeatIcon",[["path",{d:"m17 2 4 4-4 4",key:"nntrym"}],["path",{d:"M3 11v-1a4 4 0 0 1 4-4h14",key:"84bu3i"}],["path",{d:"m7 22-4-4 4-4",key:"1wqhfi"}],["path",{d:"M21 13v1a4 4 0 0 1-4 4H3",key:"1rx37r"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const lr=p("RotateCcwIcon",[["path",{d:"M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8",key:"1357e3"}],["path",{d:"M3 3v5h5",key:"1xhq8a"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ur=p("RotateCwIcon",[["path",{d:"M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8",key:"1p45f6"}],["path",{d:"M21 3v5h-5",key:"1q7to0"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const cr=p("SaveIcon",[["path",{d:"M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z",key:"1c8476"}],["path",{d:"M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7",key:"1ydtos"}],["path",{d:"M7 3v4a1 1 0 0 0 1 1h7",key:"t51u73"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const dr=p("ScaleIcon",[["path",{d:"m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z",key:"7g6ntu"}],["path",{d:"m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z",key:"ijws7r"}],["path",{d:"M7 21h10",key:"1b0cd5"}],["path",{d:"M12 3v18",key:"108xh3"}],["path",{d:"M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2",key:"3gwbw2"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const pr=p("SearchIcon",[["circle",{cx:"11",cy:"11",r:"8",key:"4ej97u"}],["path",{d:"m21 21-4.3-4.3",key:"1qie3q"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const fr=p("SendIcon",[["path",{d:"M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z",key:"1ffxy3"}],["path",{d:"m21.854 2.147-10.94 10.939",key:"12cjpa"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const yr=p("SettingsIcon",[["path",{d:"M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z",key:"1qme2f"}],["circle",{cx:"12",cy:"12",r:"3",key:"1v7zrd"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const vr=p("ShieldAlertIcon",[["path",{d:"M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z",key:"oel41y"}],["path",{d:"M12 8v4",key:"1got3b"}],["path",{d:"M12 16h.01",key:"1drbdi"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const hr=p("ShieldCheckIcon",[["path",{d:"M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z",key:"oel41y"}],["path",{d:"m9 12 2 2 4-4",key:"dzmm74"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const mr=p("ShoppingBagIcon",[["path",{d:"M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z",key:"hou9p0"}],["path",{d:"M3 6h18",key:"d0wm0j"}],["path",{d:"M16 10a4 4 0 0 1-8 0",key:"1ltviw"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const kr=p("ShoppingCartIcon",[["circle",{cx:"8",cy:"21",r:"1",key:"jimo8o"}],["circle",{cx:"19",cy:"21",r:"1",key:"13723u"}],["path",{d:"M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12",key:"9zh506"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const gr=p("SmartphoneIcon",[["rect",{width:"14",height:"20",x:"5",y:"2",rx:"2",ry:"2",key:"1yt0o3"}],["path",{d:"M12 18h.01",key:"mhygvu"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const br=p("SparklesIcon",[["path",{d:"M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z",key:"4pj2yx"}],["path",{d:"M20 3v4",key:"1olli1"}],["path",{d:"M22 5h-4",key:"1gvqau"}],["path",{d:"M4 17v2",key:"vumght"}],["path",{d:"M5 18H3",key:"zchphs"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Mr=p("SquareCheckBigIcon",[["path",{d:"M21 10.5V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h12.5",key:"1uzm8b"}],["path",{d:"m9 11 3 3L22 4",key:"1pflzl"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const wr=p("SquareIcon",[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2",key:"afitv7"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const _r=p("SunIcon",[["circle",{cx:"12",cy:"12",r:"4",key:"4exip2"}],["path",{d:"M12 2v2",key:"tus03m"}],["path",{d:"M12 20v2",key:"1lh1kg"}],["path",{d:"m4.93 4.93 1.41 1.41",key:"149t6j"}],["path",{d:"m17.66 17.66 1.41 1.41",key:"ptbguv"}],["path",{d:"M2 12h2",key:"1t8f8n"}],["path",{d:"M20 12h2",key:"1q8mjw"}],["path",{d:"m6.34 17.66-1.41 1.41",key:"1m8zz5"}],["path",{d:"m19.07 4.93-1.41 1.41",key:"1shlcs"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Cr=p("TagIcon",[["path",{d:"M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z",key:"vktsd0"}],["circle",{cx:"7.5",cy:"7.5",r:".5",fill:"currentColor",key:"kqv944"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ir=p("TimerIcon",[["line",{x1:"10",x2:"14",y1:"2",y2:"2",key:"14vaq8"}],["line",{x1:"12",x2:"15",y1:"14",y2:"11",key:"17fdiu"}],["circle",{cx:"12",cy:"14",r:"8",key:"1e1u0o"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const xr=p("Trash2Icon",[["path",{d:"M3 6h18",key:"d0wm0j"}],["path",{d:"M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6",key:"4alrt4"}],["path",{d:"M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2",key:"v07s0e"}],["line",{x1:"10",x2:"10",y1:"11",y2:"17",key:"1uufr5"}],["line",{x1:"14",x2:"14",y1:"11",y2:"17",key:"xtxkd"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ar=p("TrendingDownIcon",[["polyline",{points:"22 17 13.5 8.5 8.5 13.5 2 7",key:"1r2t7k"}],["polyline",{points:"16 17 22 17 22 11",key:"11uiuu"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Er=p("TrendingUpIcon",[["polyline",{points:"22 7 13.5 15.5 8.5 10.5 2 17",key:"126l90"}],["polyline",{points:"16 7 22 7 22 13",key:"kwv8wd"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Or=p("TriangleAlertIcon",[["path",{d:"m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3",key:"wmoenq"}],["path",{d:"M12 9v4",key:"juzpu7"}],["path",{d:"M12 17h.01",key:"p32p05"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Sr=p("TruckIcon",[["path",{d:"M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2",key:"wrbu53"}],["path",{d:"M15 18H9",key:"1lyqi6"}],["path",{d:"M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14",key:"lysw3i"}],["circle",{cx:"17",cy:"18",r:"2",key:"332jqn"}],["circle",{cx:"7",cy:"18",r:"2",key:"19iecd"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Dr=p("UnlinkIcon",[["path",{d:"m18.84 12.25 1.72-1.71h-.02a5.004 5.004 0 0 0-.12-7.07 5.006 5.006 0 0 0-6.95 0l-1.72 1.71",key:"yqzxt4"}],["path",{d:"m5.17 11.75-1.71 1.71a5.004 5.004 0 0 0 .12 7.07 5.006 5.006 0 0 0 6.95 0l1.71-1.71",key:"4qinb0"}],["line",{x1:"8",x2:"8",y1:"2",y2:"5",key:"1041cp"}],["line",{x1:"2",x2:"5",y1:"8",y2:"8",key:"14m1p5"}],["line",{x1:"16",x2:"16",y1:"19",y2:"22",key:"rzdirn"}],["line",{x1:"19",x2:"22",y1:"16",y2:"16",key:"ox905f"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const qr=p("UserCheckIcon",[["path",{d:"M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2",key:"1yyitq"}],["circle",{cx:"9",cy:"7",r:"4",key:"nufk8"}],["polyline",{points:"16 11 18 13 22 9",key:"1pwet4"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Pr=p("UserMinusIcon",[["path",{d:"M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2",key:"1yyitq"}],["circle",{cx:"9",cy:"7",r:"4",key:"nufk8"}],["line",{x1:"22",x2:"16",y1:"11",y2:"11",key:"1shjgl"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Tr=p("UserPlusIcon",[["path",{d:"M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2",key:"1yyitq"}],["circle",{cx:"9",cy:"7",r:"4",key:"nufk8"}],["line",{x1:"19",x2:"19",y1:"8",y2:"14",key:"1bvyxn"}],["line",{x1:"22",x2:"16",y1:"11",y2:"11",key:"1shjgl"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Lr=p("UserXIcon",[["path",{d:"M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2",key:"1yyitq"}],["circle",{cx:"9",cy:"7",r:"4",key:"nufk8"}],["line",{x1:"17",x2:"22",y1:"8",y2:"13",key:"3nzzx3"}],["line",{x1:"22",x2:"17",y1:"8",y2:"13",key:"1swrse"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Fr=p("UserIcon",[["path",{d:"M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2",key:"975kel"}],["circle",{cx:"12",cy:"7",r:"4",key:"17ys0d"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Br=p("UsersIcon",[["path",{d:"M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2",key:"1yyitq"}],["circle",{cx:"9",cy:"7",r:"4",key:"nufk8"}],["path",{d:"M22 21v-2a4 4 0 0 0-3-3.87",key:"kshegd"}],["path",{d:"M16 3.13a4 4 0 0 1 0 7.75",key:"1da9ce"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Rr=p("WalletIcon",[["path",{d:"M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1",key:"18etb6"}],["path",{d:"M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4",key:"xoc0q4"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const zr=p("WifiIcon",[["path",{d:"M12 20h.01",key:"zekei9"}],["path",{d:"M2 8.82a15 15 0 0 1 20 0",key:"dnpr2z"}],["path",{d:"M5 12.859a10 10 0 0 1 14 0",key:"1x1e6c"}],["path",{d:"M8.5 16.429a5 5 0 0 1 7 0",key:"1bycff"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const $r=p("WrenchIcon",[["path",{d:"M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z",key:"cbrjhi"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const jr=p("XIcon",[["path",{d:"M18 6 6 18",key:"1bl5f8"}],["path",{d:"m6 6 12 12",key:"d8bk6v"}]]);/**
 * @license lucide-vue-next v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Vr=p("ZapIcon",[["path",{d:"M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z",key:"1xq2db"}]]);function re(e,t){const a=typeof e=="string"&&!t?`${e}Context`:t,n=Symbol(a);return[l=>{const i=Ke(n,l);if(i||i===null)return i;throw new Error(`Injection \`${n.toString()}\` not found. Component must be used within ${Array.isArray(e)?`one of the following components: ${e.join(", ")}`:`\`${e}\``}`)},l=>(We(n,l),l)]}function F(){let e=document.activeElement;if(e==null)return null;for(;e!=null&&e.shadowRoot!=null&&e.shadowRoot.activeElement!=null;)e=e.shadowRoot.activeElement;return e}function at(e,t,a){const n=a.originalEvent.target,o=new CustomEvent(e,{bubbles:!1,cancelable:!0,detail:a});t&&n.addEventListener(e,t,{once:!0}),n.dispatchEvent(o)}function Zt(e){return e==null}function Jt(e,t){return Ne()?(Ue(e,t),!0):!1}function Yt(e){let t=!1,a;const n=Ze(!0);return(...o)=>(t||(a=n.run(()=>e(...o)),t=!0),a)}const U=typeof window<"u"&&typeof document<"u";typeof WorkerGlobalScope<"u"&&globalThis instanceof WorkerGlobalScope;const Qt=e=>typeof e<"u",Xt=Object.prototype.toString,ea=e=>Xt.call(e)==="[object Object]",Re=ta();function ta(){var e,t,a;return U&&!!(!((e=window)===null||e===void 0||(e=e.navigator)===null||e===void 0)&&e.userAgent)&&(/iP(?:ad|hone|od)/.test(window.navigator.userAgent)||((t=window)===null||t===void 0||(t=t.navigator)===null||t===void 0?void 0:t.maxTouchPoints)>2&&/iPad|Macintosh/.test((a=window)===null||a===void 0?void 0:a.navigator.userAgent))}function ke(e){return Array.isArray(e)?e:[e]}function aa(e){return K()}function na(e){if(!U)return e;let t=0,a,n;const o=()=>{t-=1,n&&t<=0&&(n.stop(),a=void 0,n=void 0)};return(...r)=>(t+=1,n||(n=Ze(!0),a=n.run(()=>e(...r))),Jt(o),a)}function oa(e,t){aa()&&Ge(e,t)}function ra(e,t,a){return q(e,t,{...a,immediate:!0})}const De=U?window:void 0;function se(e){var t;const a=V(e);return(t=a==null?void 0:a.$el)!==null&&t!==void 0?t:a}function nt(...e){const t=(n,o,r,l)=>(n.addEventListener(o,r,l),()=>n.removeEventListener(o,r,l)),a=_(()=>{const n=ke(V(e[0])).filter(o=>o!=null);return n.every(o=>typeof o!="string")?n:void 0});return ra(()=>{var n,o;return[(n=(o=a.value)===null||o===void 0?void 0:o.map(r=>se(r)))!==null&&n!==void 0?n:[De].filter(r=>r!=null),ke(V(a.value?e[1]:e[0])),ke(v(a.value?e[2]:e[1])),V(a.value?e[3]:e[2])]},([n,o,r,l],i,u)=>{if(!(n!=null&&n.length)||!(o!=null&&o.length)||!(r!=null&&r.length))return;const c=ea(l)?{...l}:l,f=n.flatMap(s=>o.flatMap(d=>r.map(y=>t(s,d,y,c))));u(()=>{f.forEach(s=>s())})},{flush:"post"})}function sa(){const e=Ee(!1),t=K();return t&&ee(()=>{e.value=!0},t),e}function ia(e){return typeof e=="function"?e:typeof e=="string"?t=>t.key===e:Array.isArray(e)?t=>e.includes(t.key):()=>!0}function la(...e){let t,a,n={};e.length===3?(t=e[0],a=e[1],n=e[2]):e.length===2?typeof e[1]=="object"?(t=!0,a=e[0],n=e[1]):(t=e[0],a=e[1]):(t=!0,a=e[0]);const{target:o=De,eventName:r="keydown",passive:l=!1,dedupe:i=!1}=n,u=ia(t);return nt(o,r,f=>{f.repeat&&V(i)||u(f)&&a(f)},l)}function ua(e){return JSON.parse(JSON.stringify(e))}function qe(e,t,a,n={}){var o,r;const{clone:l=!1,passive:i=!1,eventName:u,deep:c=!1,defaultValue:f,shouldEmit:s}=n,d=K(),y=a||(d==null?void 0:d.emit)||(d==null||(o=d.$emit)===null||o===void 0?void 0:o.bind(d))||(d==null||(r=d.proxy)===null||r===void 0||(r=r.$emit)===null||r===void 0?void 0:r.bind(d==null?void 0:d.proxy));let k=u;t||(t="modelValue"),k=k||`update:${t.toString()}`;const g=h=>l?typeof l=="function"?l(h):ua(h):h,b=()=>Qt(e[t])?g(e[t]):f,m=h=>{s?s(h)&&y(k,h):y(k,h)};if(i){const h=M(b());let D=!1;return q(()=>e[t],O=>{D||(D=!0,h.value=g(O),B(()=>D=!1))}),q(h,O=>{!D&&(O!==e[t]||c)&&m(O)},{deep:c}),h}else return _({get(){return b()},set(h){m(h)}})}function Pe(e){return e?e.flatMap(t=>t.type===ht?Pe(t.children):[t]):[]}const[me]=re("ConfigProvider"),T=Je({layersRoot:new Set,layersWithOutsidePointerEventsDisabled:new Set,originalBodyPointerEvents:void 0,branches:new Set});function ge(e){if(e===null||typeof e!="object")return!1;const t=Object.getPrototypeOf(e);return t!==null&&t!==Object.prototype&&Object.getPrototypeOf(t)!==null||Symbol.iterator in e?!1:Symbol.toStringTag in e?Object.prototype.toString.call(e)==="[object Module]":!0}function xe(e,t,a=".",n){if(!ge(t))return xe(e,{},a,n);const o={...t};for(const r of Object.keys(e)){if(r==="__proto__"||r==="constructor")continue;const l=e[r];l!=null&&(n&&n(o,r,l,a)||(Array.isArray(l)&&Array.isArray(o[r])?o[r]=[...l,...o[r]]:ge(l)&&ge(o[r])?o[r]=xe(l,o[r],(a?`${a}.`:"")+r.toString(),n):o[r]=l))}return o}function ca(e){return(...t)=>t.reduce((a,n)=>xe(a,n,"",e),{})}const da=ca(),pa=na(()=>{const e=M(new Map),t=M(),a=_(()=>{for(const l of e.value.values())if(l)return!0;return!1}),n=me({scrollBody:M(!0)});let o=null;const r=()=>{document.body.style.paddingRight="",document.body.style.marginRight="",T.layersWithOutsidePointerEventsDisabled.size===0&&(document.body.style.pointerEvents=""),document.documentElement.style.removeProperty("--scrollbar-width"),document.body.style.overflow=t.value??"",Re&&(o==null||o()),t.value=void 0};return q(a,(l,i)=>{var s;if(!U)return;if(!l){i&&r();return}t.value===void 0&&(t.value=document.body.style.overflow);const u=window.innerWidth-document.documentElement.clientWidth,c={padding:u,margin:0},f=(s=n.scrollBody)!=null&&s.value?typeof n.scrollBody.value=="object"?da({padding:n.scrollBody.value.padding===!0?u:n.scrollBody.value.padding,margin:n.scrollBody.value.margin===!0?u:n.scrollBody.value.margin},c):c:{padding:0,margin:0};u>0&&(document.body.style.paddingRight=typeof f.padding=="number"?`${f.padding}px`:String(f.padding),document.body.style.marginRight=typeof f.margin=="number"?`${f.margin}px`:String(f.margin),document.documentElement.style.setProperty("--scrollbar-width",`${u}px`),document.body.style.overflow="hidden"),Re&&(o=nt(document,"touchmove",d=>ya(d),{passive:!1})),B(()=>{a.value&&(document.body.style.pointerEvents="none",document.body.style.overflow="hidden")})},{immediate:!0,flush:"sync"}),e});function fa(e){const t=Math.random().toString(36).substring(2,7),a=pa();a.value.set(t,e??!1);const n=_({get:()=>a.value.get(t)??!1,set:o=>a.value.set(t,o)});return oa(()=>{a.value.delete(t)}),n}function ot(e){const t=window.getComputedStyle(e);if(t.overflowX==="scroll"||t.overflowY==="scroll"||t.overflowX==="auto"&&e.clientWidth<e.scrollWidth||t.overflowY==="auto"&&e.clientHeight<e.scrollHeight)return!0;{const a=e.parentNode;return!(a instanceof Element)||a.tagName==="BODY"?!1:ot(a)}}function ya(e){const t=e||window.event,a=t.target;return a instanceof Element&&ot(a)?!1:t.touches.length>1?!0:(t.preventDefault&&t.cancelable&&t.preventDefault(),!1)}function rt(e){const t=me({dir:M("ltr")});return _(()=>{var a;return(e==null?void 0:e.value)||((a=t.dir)==null?void 0:a.value)||"ltr"})}function ie(e){const t=K(),a=t==null?void 0:t.type.emits,n={};return a!=null&&a.length||console.warn(`No emitted event found. Please check component: ${t==null?void 0:t.type.__name}`),a==null||a.forEach(o=>{n[mt(Ye(o))]=(...r)=>e(o,...r)}),n}function S(){const e=K(),t=M(),a=_(()=>n());kt(()=>{a.value!==n()&&gt(t)});function n(){return t.value&&"$el"in t.value&&["#text","#comment"].includes(t.value.$el.nodeName)?t.value.$el.nextElementSibling:se(t)}const o=Object.assign({},e.exposed),r={};for(const i in e.props)Object.defineProperty(r,i,{enumerable:!0,configurable:!0,get:()=>e.props[i]});if(Object.keys(o).length>0)for(const i in o)Object.defineProperty(r,i,{enumerable:!0,configurable:!0,get:()=>o[i]});Object.defineProperty(r,"$el",{enumerable:!0,configurable:!0,get:()=>e.vnode.el}),e.exposed=r;function l(i){if(t.value=i,!!i&&(Object.defineProperty(r,"$el",{enumerable:!0,configurable:!0,get:()=>i instanceof Element?i:i.$el}),!(i instanceof Element)&&!Object.hasOwn(i,"$el"))){const u=i.$.exposed,c=Object.assign({},r);for(const f in u)Object.defineProperty(c,f,{enumerable:!0,configurable:!0,get:()=>u[f]});e.exposed=c}}return{forwardRef:l,currentRef:t,currentElement:a}}function va(e){const t=K(),a=Object.keys((t==null?void 0:t.type.props)??{}).reduce((o,r)=>{const l=(t==null?void 0:t.type.props[r]).default;return l!==void 0&&(o[r]=l),o},{}),n=bt(e);return _(()=>{const o={},r=(t==null?void 0:t.vnode.props)??{};return Object.keys(r).forEach(l=>{o[Ye(l)]=r[l]}),Object.keys({...a,...o}).reduce((l,i)=>(n.value[i]!==void 0&&(l[i]=n.value[i]),l),{})})}function ha(e,t){const a=va(e),n=t?ie(t):{};return _(()=>({...a.value,...n}))}var ma=function(e){if(typeof document>"u")return null;var t=Array.isArray(e)?e[0]:e;return t.ownerDocument.body},Q=new WeakMap,pe=new WeakMap,fe={},be=0,st=function(e){return e&&(e.host||st(e.parentNode))},ka=function(e,t){return t.map(function(a){if(e.contains(a))return a;var n=st(a);return n&&e.contains(n)?n:(console.error("aria-hidden",a,"in not contained inside",e,". Doing nothing"),null)}).filter(function(a){return!!a})},ga=function(e,t,a,n){var o=ka(t,Array.isArray(e)?e:[e]);fe[a]||(fe[a]=new WeakMap);var r=fe[a],l=[],i=new Set,u=new Set(o),c=function(s){!s||i.has(s)||(i.add(s),c(s.parentNode))};o.forEach(c);var f=function(s){!s||u.has(s)||Array.prototype.forEach.call(s.children,function(d){if(i.has(d))f(d);else try{var y=d.getAttribute(n),k=y!==null&&y!=="false",g=(Q.get(d)||0)+1,b=(r.get(d)||0)+1;Q.set(d,g),r.set(d,b),l.push(d),g===1&&k&&pe.set(d,!0),b===1&&d.setAttribute(a,"true"),k||d.setAttribute(n,"true")}catch(m){console.error("aria-hidden: cannot operate on ",d,m)}})};return f(t),i.clear(),be++,function(){l.forEach(function(s){var d=Q.get(s)-1,y=r.get(s)-1;Q.set(s,d),r.set(s,y),d||(pe.has(s)||s.removeAttribute(n),pe.delete(s)),y||s.removeAttribute(a)}),be--,be||(Q=new WeakMap,Q=new WeakMap,pe=new WeakMap,fe={})}},ba=function(e,t,a){a===void 0&&(a="data-aria-hidden");var n=Array.from(Array.isArray(e)?e:[e]),o=ma(e);return o?(n.push.apply(n,Array.from(o.querySelectorAll("[aria-live], script"))),ga(n,o,a,"aria-hidden")):function(){return null}};function Ma(e){let t;q(()=>se(e),a=>{let n=!1;try{n=!!(a!=null&&a.closest("[popover]:not(:popover-open)"))}catch{}a&&!n?t=ba(a):t&&t()}),Oe(()=>{t&&t()})}function he(e,t="reka"){var o;let a;const n=me({useId:void 0});return n.useId?a=n.useId():a=(o=Mt)==null?void 0:o(),t?`${t}-${a}`:a}function wa(e,t){const a=M(e);function n(r){return t[a.value][r]??a.value}return{state:a,dispatch:r=>{a.value=n(r)}}}function _a(e,t){var b;const a=M({}),n=M("none"),o=M(e),r=e.value?"mounted":"unmounted";let l;const i=((b=t.value)==null?void 0:b.ownerDocument.defaultView)??De,{state:u,dispatch:c}=wa(r,{mounted:{UNMOUNT:"unmounted",ANIMATION_OUT:"unmountSuspended"},unmountSuspended:{MOUNT:"mounted",ANIMATION_END:"unmounted"},unmounted:{MOUNT:"mounted"}}),f=m=>{var h;if(U){const D=new CustomEvent(m,{bubbles:!1,cancelable:!1});(h=t.value)==null||h.dispatchEvent(D)}};q(e,async(m,h)=>{var O;const D=h!==m;if(await B(),D){const H=n.value,L=ye(t.value);m?(c("MOUNT"),f("enter"),L==="none"&&f("after-enter")):L==="none"||L==="undefined"||((O=a.value)==null?void 0:O.display)==="none"?(c("UNMOUNT"),f("leave"),f("after-leave")):h&&H!==L?(c("ANIMATION_OUT"),f("leave")):(c("UNMOUNT"),f("after-leave"))}},{immediate:!0});const s=m=>{if(m.target!==t.value)return;const h=ye(t.value),D=h.includes(CSS.escape(m.animationName)),O=u.value==="mounted"?"enter":"leave";if(D&&(f(`after-${O}`),c("ANIMATION_END"),!o.value)){const H=t.value.style.animationFillMode;t.value.style.animationFillMode="forwards",l=i==null?void 0:i.setTimeout(()=>{var L;((L=t.value)==null?void 0:L.style.animationFillMode)==="forwards"&&(t.value.style.animationFillMode=H)})}h==="none"&&c("ANIMATION_END")},d=m=>{m.target===t.value&&(n.value=ye(t.value))},y=q(t,(m,h)=>{m?(a.value=getComputedStyle(m),m.addEventListener("animationstart",d),m.addEventListener("animationcancel",s),m.addEventListener("animationend",s)):(c("ANIMATION_END"),l!==void 0&&(i==null||i.clearTimeout(l)),h==null||h.removeEventListener("animationstart",d),h==null||h.removeEventListener("animationcancel",s),h==null||h.removeEventListener("animationend",s))},{immediate:!0}),k=q(u,()=>{const m=ye(t.value);n.value=u.value==="mounted"?m:"none"});return Oe(()=>{y(),k(),t.value&&(t.value.removeEventListener("animationstart",d),t.value.removeEventListener("animationcancel",s),t.value.removeEventListener("animationend",s)),l!==void 0&&(i==null||i.clearTimeout(l))}),{isPresent:_(()=>["mounted","unmountSuspended"].includes(u.value))}}function ye(e){return e&&getComputedStyle(e).animationName||"none"}var Te=C({name:"Presence",props:{present:{type:Boolean,required:!0},forceMount:{type:Boolean}},slots:{},setup(e,{slots:t,expose:a}){var c;const{present:n,forceMount:o}=oe(e),r=M(),{isPresent:l}=_a(n,r);a({present:l});let i=t.default({present:l.value});i=Pe(i||[]);const u=K();if(i&&(i==null?void 0:i.length)>1){const f=(c=u==null?void 0:u.parent)!=null&&c.type.name?`<${u.parent.type.name} />`:"component";throw new Error([`Detected an invalid children for \`${f}\` for  \`Presence\` component.`,"","Note: Presence works similarly to `v-if` directly, but it waits for animation/transition to finished before unmounting. So it expect only one direct child of valid VNode type.","You can apply a few solutions:",["Provide a single child element so that `presence` directive attach correctly.","Ensure the first child is an actual element instead of a raw text node or comment node."].map(s=>`  - ${s}`).join(`
`)].join(`
`))}return()=>o.value||n.value||l.value?N(t.default({present:l.value})[0],{ref:f=>{const s=se(f);return typeof(s==null?void 0:s.hasAttribute)>"u"||(s!=null&&s.hasAttribute("data-reka-popper-content-wrapper")?r.value=s.firstElementChild:r.value=s),s}}):null}});const Ae=C({name:"PrimitiveSlot",inheritAttrs:!1,setup(e,{attrs:t,slots:a}){return()=>{var u;if(!a.default)return null;const n=Pe(a.default()),o=n.findIndex(c=>c.type!==wt);if(o===-1)return n;const r=n[o];(u=r.props)==null||delete u.ref;const l=r.props?R(t,r.props):t,i=_t({...r,props:{}},l);return n.length===1?i:(n[o]=i,n)}}}),Ca=["area","img","input"],z=C({name:"Primitive",inheritAttrs:!1,props:{asChild:{type:Boolean,default:!1},as:{type:[String,Object],default:"div"}},setup(e,{attrs:t,slots:a}){const n=e.asChild?"template":e.as;return typeof n=="string"&&Ca.includes(n)?()=>N(n,t):n!=="template"?()=>N(e.as,t,{default:a.default}):()=>N(Ae,t,{default:a.default})}});function ze(){const e=M(),t=_(()=>{var a,n;return["#text","#comment"].includes((a=e.value)==null?void 0:a.$el.nodeName)?(n=e.value)==null?void 0:n.$el.nextElementSibling:se(e)});return{primitiveElement:e,currentElement:t}}const[W,Ia]=re("DialogRoot");var xa=C({inheritAttrs:!1,__name:"DialogRoot",props:{open:{type:Boolean,required:!1,default:void 0},defaultOpen:{type:Boolean,required:!1,default:!1},modal:{type:Boolean,required:!1,default:!0},unmountOnHide:{type:Boolean,required:!1,default:!0}},emits:["update:open"],setup(e,{emit:t}){const a=e,o=qe(a,"open",t,{defaultValue:a.defaultOpen,passive:a.open===void 0}),r=M(),l=M(),{modal:i,unmountOnHide:u}=oe(a);return Ia({open:o,modal:i,unmountOnHide:u,openModal:()=>{o.value=!0},onOpenChange:c=>{o.value=c},onOpenToggle:()=>{o.value=!o.value},contentId:"",titleId:"",descriptionId:"",triggerElement:r,contentElement:l}),(c,f)=>E(c.$slots,"default",{open:v(o),close:()=>o.value=!1})}}),Aa=xa,Ea=C({__name:"DialogClose",props:{asChild:{type:Boolean,required:!1},as:{type:null,required:!1,default:"button"}},setup(e){const t=e;S();const a=W();return(n,o)=>(x(),A(v(z),R(t,{type:n.as==="button"?"button":void 0,onClick:o[0]||(o[0]=r=>v(a).onOpenChange(!1))}),{default:w(()=>[E(n.$slots,"default")]),_:3},16,["type"]))}}),Hr=Ea;const Oa="dismissableLayer.pointerDownOutside",Sa="dismissableLayer.focusOutside";function it(e,t){if(!(t instanceof Element))return!1;if(e.contains(t))return!0;const a=t.closest("[data-dismissable-layer]"),n=e.dataset.dismissableLayer===""?e:e.querySelector("[data-dismissable-layer]"),o=Array.from(e.ownerDocument.querySelectorAll("[data-dismissable-layer]"));return!!(a&&(n===a||o.indexOf(n)<o.indexOf(a)))}function Da(e,t,a=!0){var l;const n=((l=t==null?void 0:t.value)==null?void 0:l.ownerDocument)??(globalThis==null?void 0:globalThis.document),o=M(!1),r=M(()=>{});return Z(i=>{if(!U||!V(a))return;const u=async f=>{const s=f.target;if(!(!(t!=null&&t.value)||!s)){if(it(t.value,s)){n.removeEventListener("click",r.value),o.value=!1;return}if(f.target&&!o.value){let y=function(){at(Oa,e,d)};const d={originalEvent:f};f.pointerType==="touch"?(n.removeEventListener("click",r.value),r.value=y,n.addEventListener("click",r.value,{once:!0})):y()}else n.removeEventListener("click",r.value);o.value=!1}},c=window.setTimeout(()=>{n.addEventListener("pointerdown",u)},0);i(()=>{window.clearTimeout(c),n.removeEventListener("pointerdown",u),n.removeEventListener("click",r.value)})}),{onPointerDownCapture:()=>{V(a)&&(o.value=!0)}}}function qa(e,t,a=!0){var r;const n=((r=t==null?void 0:t.value)==null?void 0:r.ownerDocument)??(globalThis==null?void 0:globalThis.document),o=M(!1);return Z(l=>{if(!U||!V(a))return;const i=async u=>{if(!(t!=null&&t.value))return;await B(),await B();const c=u.target;!t.value||!c||it(t.value,c)||u.target&&!o.value&&at(Sa,e,{originalEvent:u})};n.addEventListener("focusin",i),l(()=>n.removeEventListener("focusin",i))}),{onFocusCapture:()=>{V(a)&&(o.value=!0)},onBlurCapture:()=>{V(a)&&(o.value=!1)}}}var Pa=C({__name:"DismissableLayer",props:{disableOutsidePointerEvents:{type:Boolean,required:!1,default:!1},asChild:{type:Boolean,required:!1},as:{type:null,required:!1},present:{type:Boolean,required:!1,default:!0}},emits:["escapeKeyDown","pointerDownOutside","focusOutside","interactOutside","dismiss"],setup(e,{emit:t}){const a=e,n=t,{forwardRef:o,currentElement:r}=S(),l=_(()=>{var y;return((y=r.value)==null?void 0:y.ownerDocument)??globalThis.document}),i=_(()=>T.layersRoot),u=_(()=>r.value?Array.from(i.value).indexOf(r.value):-1),c=_(()=>T.layersWithOutsidePointerEventsDisabled.size>0),f=_(()=>{const y=Array.from(i.value),[k]=[...T.layersWithOutsidePointerEventsDisabled].slice(-1),g=y.indexOf(k);return u.value>=g}),s=Da(async y=>{const k=[...T.branches].some(g=>g==null?void 0:g.contains(y.target));!a.present||!f.value||k||(n("pointerDownOutside",y),n("interactOutside",y),await B(),y.defaultPrevented||n("dismiss"))},r,()=>a.present),d=qa(y=>{const k=[...T.branches].some(g=>g==null?void 0:g.contains(y.target));!a.present||k||(n("focusOutside",y),n("interactOutside",y),y.defaultPrevented||n("dismiss"))},r);return la("Escape",y=>{!a.present||!(u.value===i.value.size-1)||(n("escapeKeyDown",y),y.defaultPrevented||n("dismiss"))}),q([r,()=>a.disableOutsidePointerEvents,()=>a.present],([y,k,g],b,m)=>{!y||!g||k&&(T.layersWithOutsidePointerEventsDisabled.size===0&&(T.originalBodyPointerEvents=l.value.body.style.pointerEvents,l.value.body.style.pointerEvents="none"),T.layersWithOutsidePointerEventsDisabled.add(y),m(()=>{T.layersWithOutsidePointerEventsDisabled.delete(y),T.layersWithOutsidePointerEventsDisabled.size===0&&!Zt(T.originalBodyPointerEvents)&&(l.value.body.style.pointerEvents=T.originalBodyPointerEvents)}))},{immediate:!0}),q([r,()=>a.present],([y,k],g,b)=>{!y||!k||(i.value.add(y),b(()=>{i.value.delete(y)}))},{immediate:!0}),Z(y=>{y(()=>{r.value&&(i.value.delete(r.value),T.layersWithOutsidePointerEventsDisabled.delete(r.value))})}),(y,k)=>(x(),A(v(z),{ref:v(o),"as-child":y.asChild,as:y.as,"data-dismissable-layer":"",style:Qe({pointerEvents:c.value?f.value?"auto":"none":void 0}),onFocusCapture:v(d).onFocusCapture,onBlurCapture:v(d).onBlurCapture,onPointerdownCapture:v(s).onPointerDownCapture},{default:w(()=>[E(y.$slots,"default")]),_:3},8,["as-child","as","style","onFocusCapture","onBlurCapture","onPointerdownCapture"]))}}),Ta=Pa;const La=Yt(()=>M([]));function Fa(){const e=La();return{add(t){const a=e.value[0];t!==a&&(a==null||a.pause()),e.value=$e(e.value,t),e.value.unshift(t)},remove(t){var a;e.value=$e(e.value,t),(a=e.value[0])==null||a.resume()}}}function $e(e,t){const a=[...e],n=a.indexOf(t);return n!==-1&&a.splice(n,1),a}const Me="focusScope.autoFocusOnMount",we="focusScope.autoFocusOnUnmount",je={bubbles:!1,cancelable:!0};function Ba(e,{select:t=!1}={}){const a=F();for(const n of e)if(G(n,{select:t}),F()!==a)return!0}function Ra(e){const t=lt(e),a=Ve(t,e),n=Ve(t.reverse(),e);return[a,n]}function lt(e){const t=[],a=document.createTreeWalker(e,NodeFilter.SHOW_ELEMENT,{acceptNode:n=>{const o=n.tagName==="INPUT"&&n.type==="hidden";return n.disabled||n.hidden||o?NodeFilter.FILTER_SKIP:n.tabIndex>=0?NodeFilter.FILTER_ACCEPT:NodeFilter.FILTER_SKIP}});for(;a.nextNode();)t.push(a.currentNode);return t}function Ve(e,t){for(const a of e)if(!za(a,{upTo:t}))return a}function za(e,{upTo:t}){if(getComputedStyle(e).visibility==="hidden")return!0;for(;e;){if(t!==void 0&&e===t)return!1;if(getComputedStyle(e).display==="none")return!0;e=e.parentElement}return!1}function $a(e){return e instanceof HTMLInputElement&&"select"in e}function G(e,{select:t=!1}={}){if(e&&e.focus){const a=F();e.focus({preventScroll:!0}),e!==a&&$a(e)&&t&&e.select()}}var ja=C({__name:"FocusScope",props:{loop:{type:Boolean,required:!1,default:!1},trapped:{type:Boolean,required:!1,default:!1},present:{type:Boolean,required:!1,default:!0},asChild:{type:Boolean,required:!1},as:{type:null,required:!1}},emits:["mountAutoFocus","unmountAutoFocus"],setup(e,{emit:t}){const a=e,n=t,{currentRef:o,currentElement:r}=S(),l=M(null),i=Fa(),u=Je({paused:!1,pause(){this.paused=!0},resume(){this.paused=!1}});Z(s=>{if(!U)return;const d=r.value;if(!a.trapped)return;function y(m){if(u.paused||!d)return;const h=m.target;d.contains(h)?l.value=h:G(l.value,{select:!0})}function k(m){if(u.paused||!d)return;const h=m.relatedTarget;h!==null&&(d.contains(h)||G(l.value,{select:!0}))}function g(m){const h=l.value;if(h===null||!m.some(L=>L.removedNodes.length>0))return;const O=F();if(O&&d.contains(O))return;d.contains(h)||G(d)}document.addEventListener("focusin",y),document.addEventListener("focusout",k);const b=new MutationObserver(g);d&&b.observe(d,{childList:!0,subtree:!0}),s(()=>{document.removeEventListener("focusin",y),document.removeEventListener("focusout",k),b.disconnect()})});function c(s,d){const y=new CustomEvent(Me,je),k=g=>n("mountAutoFocus",g);s.addEventListener(Me,k),s.dispatchEvent(y),s.removeEventListener(Me,k),y.defaultPrevented||(Ba(lt(s),{select:!0}),F()===d&&G(s))}Z(async s=>{const d=r.value;if(await B(),!d)return;a.present!==!1&&i.add(u);const y=F();!d.contains(y)&&a.present!==!1&&c(d,y),s(()=>{const g=new CustomEvent(we,je),b=m=>{n("unmountAutoFocus",m)};d.addEventListener(we,b),d.dispatchEvent(g),d.setAttribute("data-focus-scope-unmounting",""),setTimeout(()=>{g.defaultPrevented||G(y??document.body,{select:!0}),d.removeEventListener(we,b),i.remove(u),d.removeAttribute("data-focus-scope-unmounting")},0)})}),q(()=>a.present,async(s,d)=>{if(!U)return;if(s===!1&&d===!0){i.remove(u);return}if(s!==!0||d!==!1)return;i.add(u),await B();const y=r.value;if(!y)return;const k=F();y.contains(k)||c(y,k)});function f(s){if(!a.loop&&!a.trapped||u.paused)return;const d=s.key==="Tab"&&!s.altKey&&!s.ctrlKey&&!s.metaKey,y=F();if(d&&y){const k=s.currentTarget,[g,b]=Ra(k);g&&b?!s.shiftKey&&y===b?(s.preventDefault(),a.loop&&G(g,{select:!0})):s.shiftKey&&y===g&&(s.preventDefault(),a.loop&&G(b,{select:!0})):y===k&&s.preventDefault()}}return(s,d)=>(x(),A(v(z),{ref_key:"currentRef",ref:o,tabindex:"-1","as-child":s.asChild,as:s.as,onKeydown:f},{default:w(()=>[E(s.$slots,"default")]),_:3},8,["as-child","as"]))}}),Va=ja;function Ha(e){return e?"open":"closed"}var Na=C({__name:"DialogContentImpl",props:{forceMount:{type:Boolean,required:!1},trapFocus:{type:Boolean,required:!1},disableOutsidePointerEvents:{type:Boolean,required:!1},asChild:{type:Boolean,required:!1},as:{type:null,required:!1},present:{type:Boolean,required:!1}},emits:["escapeKeyDown","pointerDownOutside","focusOutside","interactOutside","openAutoFocus","closeAutoFocus"],setup(e,{emit:t}){const a=e,n=t,o=W(),{forwardRef:r,currentElement:l}=S();return o.titleId||(o.titleId=he(void 0,"reka-dialog-title")),o.descriptionId||(o.descriptionId=he(void 0,"reka-dialog-description")),ee(()=>{o.contentElement=l,F()!==document.body&&(o.triggerElement.value=F())}),(i,u)=>(x(),A(v(Va),{"as-child":"",loop:"",trapped:a.trapFocus,present:a.present,onMountAutoFocus:u[5]||(u[5]=c=>n("openAutoFocus",c)),onUnmountAutoFocus:u[6]||(u[6]=c=>n("closeAutoFocus",c))},{default:w(()=>[J(v(Ta),R({id:v(o).contentId,ref:v(r),as:i.as,"as-child":i.asChild,present:a.present,"disable-outside-pointer-events":i.disableOutsidePointerEvents,role:"dialog","aria-describedby":v(o).descriptionId,"aria-labelledby":v(o).titleId,"data-state":v(Ha)(v(o).open.value)},i.$attrs,{onDismiss:u[0]||(u[0]=c=>v(o).onOpenChange(!1)),onEscapeKeyDown:u[1]||(u[1]=c=>n("escapeKeyDown",c)),onFocusOutside:u[2]||(u[2]=c=>n("focusOutside",c)),onInteractOutside:u[3]||(u[3]=c=>n("interactOutside",c)),onPointerDownOutside:u[4]||(u[4]=c=>n("pointerDownOutside",c))}),{default:w(()=>[E(i.$slots,"default")]),_:3},16,["id","as","as-child","present","disable-outside-pointer-events","aria-describedby","aria-labelledby","data-state"])]),_:3},8,["trapped","present"]))}}),ut=Na,Ua=C({__name:"DialogContentModal",props:{forceMount:{type:Boolean,required:!1},trapFocus:{type:Boolean,required:!1},disableOutsidePointerEvents:{type:Boolean,required:!1,default:!0},asChild:{type:Boolean,required:!1},as:{type:null,required:!1},present:{type:Boolean,required:!0}},emits:["escapeKeyDown","pointerDownOutside","focusOutside","interactOutside","openAutoFocus","closeAutoFocus"],setup(e,{emit:t}){const a=e,n=t,o=W(),r=ie(n),{forwardRef:l,currentElement:i}=S(),u=_(()=>a.present?i.value:void 0);Ma(u);const c=_(()=>{const{present:f,...s}=a;return s});return q(()=>a.present,(f,s)=>{var d;!f&&s&&((d=o.triggerElement.value)==null||d.focus())}),(f,s)=>(x(),A(ut,R({...c.value,...v(r)},{ref:v(l),present:f.present,"trap-focus":v(o).open.value,"disable-outside-pointer-events":a.disableOutsidePointerEvents,onCloseAutoFocus:s[0]||(s[0]=d=>{var y;d.defaultPrevented||(d.preventDefault(),(y=v(o).triggerElement.value)==null||y.focus())}),onPointerDownOutside:s[1]||(s[1]=d=>{const y=d.detail.originalEvent,k=y.button===0&&y.ctrlKey===!0;(y.button===2||k)&&d.preventDefault()}),onFocusOutside:s[2]||(s[2]=d=>{d.preventDefault()})}),{default:w(()=>[E(f.$slots,"default")]),_:3},16,["present","trap-focus","disable-outside-pointer-events"]))}}),Ka=Ua,Wa=C({__name:"DialogContentNonModal",props:{forceMount:{type:Boolean,required:!1},trapFocus:{type:Boolean,required:!1},disableOutsidePointerEvents:{type:Boolean,required:!1},asChild:{type:Boolean,required:!1},as:{type:null,required:!1},present:{type:Boolean,required:!0}},emits:["escapeKeyDown","pointerDownOutside","focusOutside","interactOutside","openAutoFocus","closeAutoFocus"],setup(e,{emit:t}){const a=e,o=ie(t);S();const r=W(),l=M(!1),i=M(!1),u=_(()=>{const{present:c,...f}=a;return f});return q(()=>a.present,(c,f)=>{var s;!c&&f&&(l.value||(s=r.triggerElement.value)==null||s.focus(),l.value=!1,i.value=!1)}),(c,f)=>(x(),A(ut,R({...u.value,...v(o)},{present:c.present,"trap-focus":!1,"disable-outside-pointer-events":!1,onCloseAutoFocus:f[0]||(f[0]=s=>{var d;s.defaultPrevented||(l.value||(d=v(r).triggerElement.value)==null||d.focus(),s.preventDefault()),l.value=!1,i.value=!1}),onInteractOutside:f[1]||(f[1]=s=>{var k;s.defaultPrevented||(l.value=!0,s.detail.originalEvent.type==="pointerdown"&&(i.value=!0));const d=s.target;((k=v(r).triggerElement.value)==null?void 0:k.contains(d))&&s.preventDefault(),s.detail.originalEvent.type==="focusin"&&i.value&&s.preventDefault()})}),{default:w(()=>[E(c.$slots,"default")]),_:3},16,["present"]))}}),Ga=Wa,Za=C({__name:"DialogContent",props:{forceMount:{type:Boolean,required:!1},disableOutsidePointerEvents:{type:Boolean,required:!1,default:void 0},asChild:{type:Boolean,required:!1},as:{type:null,required:!1}},emits:["escapeKeyDown","pointerDownOutside","focusOutside","interactOutside","openAutoFocus","closeAutoFocus"],setup(e,{emit:t}){const a=e,n=t,o=W(),r=ie(n),{forwardRef:l}=S(),i=_(()=>a.forceMount||!o.unmountOnHide.value);return(u,c)=>(x(),A(v(Te),{present:v(o).open.value,"force-mount":i.value},{default:w(({present:f})=>[v(o).modal.value?_e((x(),A(Ka,R({key:0,ref:v(l),present:i.value?f:!0},{...a,...v(r),...u.$attrs}),{default:w(()=>[E(u.$slots,"default")]),_:2},1040,["present"])),[[Ce,u.forceMount||v(o).unmountOnHide.value||f]]):_e((x(),A(Ga,R({key:1,ref:v(l),present:i.value?f:!0},{...a,...v(r),...u.$attrs}),{default:w(()=>[E(u.$slots,"default")]),_:2},1040,["present"])),[[Ce,u.forceMount||v(o).unmountOnHide.value||f]])]),_:3},8,["present","force-mount"]))}}),Ja=Za,Ya=C({__name:"DialogDescription",props:{asChild:{type:Boolean,required:!1},as:{type:null,required:!1,default:"p"}},setup(e){const t=e;S();const a=W();return(n,o)=>(x(),A(v(z),R(t,{id:v(a).descriptionId}),{default:w(()=>[E(n.$slots,"default")]),_:3},16,["id"]))}}),Qa=Ya,Xa=C({__name:"DialogOverlayImpl",props:{asChild:{type:Boolean,required:!1},as:{type:null,required:!1},present:{type:Boolean,required:!1,default:!0}},setup(e){const t=e,a=W(),n=fa(t.present);return q(()=>t.present,o=>n.value=o),S(),(o,r)=>(x(),A(v(z),{as:o.as,"as-child":o.asChild,"data-state":v(a).open.value?"open":"closed",style:{"pointer-events":"auto"},onPointerdown:r[0]||(r[0]=ve(()=>{},["left","self","prevent"]))},{default:w(()=>[E(o.$slots,"default")]),_:3},8,["as","as-child","data-state"]))}}),en=Xa,tn=C({__name:"DialogOverlay",props:{forceMount:{type:Boolean,required:!1},asChild:{type:Boolean,required:!1},as:{type:null,required:!1}},setup(e){const t=e,a=W(),{forwardRef:n}=S(),o=_(()=>t.forceMount||!a.unmountOnHide.value);return(r,l)=>{var i;return(i=v(a))!=null&&i.modal.value?(x(),A(v(Te),{key:0,present:v(a).open.value,"force-mount":o.value},{default:w(({present:u})=>[_e(J(en,R(r.$attrs,{ref:v(n),as:r.as,"as-child":r.asChild,present:o.value?u:!0}),{default:w(()=>[E(r.$slots,"default")]),_:2},1040,["as","as-child","present"]),[[Ce,r.forceMount||v(a).unmountOnHide.value||u]])]),_:3},8,["present","force-mount"])):Se("v-if",!0)}}}),an=tn,nn=C({__name:"Teleport",props:{to:{type:null,required:!1},disabled:{type:Boolean,required:!1},defer:{type:Boolean,required:!1},forceMount:{type:Boolean,required:!1}},setup(e){const t=e,a=me({}),n=_(()=>{var r;return t.to??((r=a.teleportTo)==null?void 0:r.value)??"body"}),o=sa();return(r,l)=>v(o)||r.forceMount?(x(),A(Ct,{key:0,to:n.value,disabled:r.disabled,defer:r.defer},[E(r.$slots,"default")],8,["to","disabled","defer"])):Se("v-if",!0)}}),ct=nn,on=C({__name:"DialogPortal",props:{to:{type:null,required:!1},disabled:{type:Boolean,required:!1},defer:{type:Boolean,required:!1},forceMount:{type:Boolean,required:!1}},setup(e){const t=e;return(a,n)=>(x(),A(v(ct),te(ae(t)),{default:w(()=>[E(a.$slots,"default")]),_:3},16))}}),Nr=on,rn=C({__name:"DialogTitle",props:{asChild:{type:Boolean,required:!1},as:{type:null,required:!1,default:"h2"}},setup(e){const t=e,a=W();return S(),(n,o)=>(x(),A(v(z),R(t,{id:v(a).titleId}),{default:w(()=>[E(n.$slots,"default")]),_:3},16,["id"]))}}),sn=rn;const[Ur,ln]=re("AlertDialogContent");var un=C({__name:"AlertDialogContent",props:{forceMount:{type:Boolean,required:!1},disableOutsidePointerEvents:{type:Boolean,required:!1,default:void 0},asChild:{type:Boolean,required:!1},as:{type:null,required:!1}},emits:["escapeKeyDown","pointerDownOutside","focusOutside","interactOutside","openAutoFocus","closeAutoFocus"],setup(e,{emit:t}){const a=e,o=ie(t);S();const r=M();return ln({onCancelElementChange:l=>{r.value=l}}),(l,i)=>(x(),A(v(Ja),R({...a,...v(o)},{role:"alertdialog",onPointerDownOutside:i[0]||(i[0]=ve(()=>{},["prevent"])),onInteractOutside:i[1]||(i[1]=ve(()=>{},["prevent"])),onOpenAutoFocus:i[2]||(i[2]=()=>{B(()=>{var u;(u=r.value)==null||u.focus({preventScroll:!0})})})}),{default:w(()=>[E(l.$slots,"default")]),_:3},16))}}),Kr=un,cn=C({__name:"AlertDialogDescription",props:{asChild:{type:Boolean,required:!1},as:{type:null,required:!1,default:"p"}},setup(e){const t=e;return S(),(a,n)=>(x(),A(v(Qa),te(ae(t)),{default:w(()=>[E(a.$slots,"default")]),_:3},16))}}),Wr=cn,dn=C({__name:"AlertDialogOverlay",props:{forceMount:{type:Boolean,required:!1},asChild:{type:Boolean,required:!1},as:{type:null,required:!1}},setup(e){const t=e;return S(),(a,n)=>(x(),A(v(an),te(ae(t)),{default:w(()=>[E(a.$slots,"default")]),_:3},16))}}),Gr=dn,pn=C({__name:"AlertDialogPortal",props:{to:{type:null,required:!1},disabled:{type:Boolean,required:!1},defer:{type:Boolean,required:!1},forceMount:{type:Boolean,required:!1}},setup(e){const t=e;return(a,n)=>(x(),A(v(ct),te(ae(t)),{default:w(()=>[E(a.$slots,"default")]),_:3},16))}}),Zr=pn,fn=C({__name:"AlertDialogRoot",props:{open:{type:Boolean,required:!1},defaultOpen:{type:Boolean,required:!1},unmountOnHide:{type:Boolean,required:!1}},emits:["update:open"],setup(e,{emit:t}){const o=ha(e,t);return S(),(r,l)=>(x(),A(v(Aa),R(v(o),{modal:!0}),{default:w(i=>[E(r.$slots,"default",te(ae(i)))]),_:3},16))}}),Jr=fn,yn=C({__name:"AlertDialogTitle",props:{asChild:{type:Boolean,required:!1},as:{type:null,required:!1,default:"h2"}},setup(e){const t=e;return S(),(a,n)=>(x(),A(v(sn),te(ae(t)),{default:w(()=>[E(a.$slots,"default")]),_:3},16))}}),Yr=yn;const He="data-reka-collection-item";function dt(e={}){const{key:t="",isProvider:a=!1}=e,n=`${t}CollectionProvider`;let o;if(a){const s=M(new Map);o={collectionRef:M(),itemMap:s},We(n,o)}else o=Ke(n);const r=(s,d=!1)=>{if(!o.collectionRef.value)return;const y=o.itemMap.value.get(s);return y&&(d||y.ref.dataset.disabled!=="")?y:void 0},l=(s=!1)=>{const d=o.collectionRef.value;if(!d)return[];const y=Array.from(d.querySelectorAll(`[${He}]`)),k=new Map(y.map((m,h)=>[m,h])),b=Array.from(o.itemMap.value.values()).sort((m,h)=>(k.get(m.ref)??-1)-(k.get(h.ref)??-1));return s?b:b.filter(m=>m.ref.dataset.disabled!=="")},i=C({name:"CollectionSlot",inheritAttrs:!1,setup(s,{slots:d,attrs:y}){const{primitiveElement:k,currentElement:g}=ze();return q(g,()=>{o.collectionRef.value=g.value}),()=>N(Ae,{ref:k,...y},d)}}),u=C({name:"CollectionItem",inheritAttrs:!1,props:{value:{validator:()=>!0}},setup(s,{slots:d,attrs:y}){const{primitiveElement:k,currentElement:g}=ze();return Z(b=>{if(g.value){const m=It(g.value);o.itemMap.value.set(m,{ref:g.value,value:s.value}),b(()=>o.itemMap.value.delete(m))}}),()=>N(Ae,{...y,[He]:"",ref:k},d)}}),c=_(()=>Array.from(o.itemMap.value.values())),f=_(()=>o.itemMap.value.size);return{getItems:l,getItem:r,reactiveItems:c,itemMapSize:f,CollectionSlot:i,CollectionItem:u}}const vn="rovingFocusGroup.onEntryFocus",hn={bubbles:!1,cancelable:!0},mn={ArrowLeft:"prev",ArrowUp:"prev",ArrowRight:"next",ArrowDown:"next",PageUp:"first",Home:"first",PageDown:"last",End:"last"};function kn(e,t){return t!=="rtl"?e:e==="ArrowLeft"?"ArrowRight":e==="ArrowRight"?"ArrowLeft":e}function gn(e,t,a){const n=kn(e.key,a);if(!(t==="vertical"&&["ArrowLeft","ArrowRight"].includes(n))&&!(t==="horizontal"&&["ArrowUp","ArrowDown"].includes(n)))return mn[n]}function pt(e,t=!1){const a=F();for(const n of e)if(n===a||(n.focus({preventScroll:t}),F()!==a))return}function bn(e,t){return e.map((a,n)=>e[(t+n)%e.length])}const[Mn,wn]=re("RovingFocusGroup");var _n=C({__name:"RovingFocusGroup",props:{orientation:{type:String,required:!1,default:void 0},dir:{type:String,required:!1},loop:{type:Boolean,required:!1,default:!1},currentTabStopId:{type:[String,null],required:!1},defaultCurrentTabStopId:{type:String,required:!1},preventScrollOnEntryFocus:{type:Boolean,required:!1,default:!1},asChild:{type:Boolean,required:!1},as:{type:null,required:!1}},emits:["entryFocus","update:currentTabStopId"],setup(e,{expose:t,emit:a}){const n=e,o=a,{loop:r,orientation:l,dir:i}=oe(n),u=rt(i),c=qe(n,"currentTabStopId",o,{defaultValue:n.defaultCurrentTabStopId,passive:n.currentTabStopId===void 0}),f=M(!1),s=M(!1),d=M(0),{getItems:y,CollectionSlot:k}=dt({isProvider:!0});function g(m){const h=!s.value;if(m.currentTarget&&m.target===m.currentTarget&&h&&!f.value){const D=new CustomEvent(vn,hn);if(m.currentTarget.dispatchEvent(D),o("entryFocus",D),!D.defaultPrevented){const O=y().map($=>$.ref).filter($=>$.dataset.disabled!==""),H=O.find($=>$.getAttribute("data-active")===""),L=O.find($=>$.getAttribute("data-highlighted")===""),le=O.find($=>$.id===c.value),Y=[H,L,le,...O].filter(Boolean);pt(Y,n.preventScrollOnEntryFocus)}}s.value=!1}function b(){setTimeout(()=>{s.value=!1},1)}return t({getItems:y}),wn({loop:r,dir:u,orientation:l,currentTabStopId:c,onItemFocus:m=>{c.value=m},onItemShiftTab:()=>{f.value=!0},onFocusableItemAdd:()=>{d.value++},onFocusableItemRemove:()=>{d.value--}}),(m,h)=>(x(),A(v(k),null,{default:w(()=>[J(v(z),{tabindex:f.value||d.value===0?-1:0,"data-orientation":v(l),as:m.as,"as-child":m.asChild,dir:v(u),style:{outline:"none"},onMousedown:h[0]||(h[0]=D=>s.value=!0),onMouseup:b,onFocus:g,onBlur:h[1]||(h[1]=D=>f.value=!1)},{default:w(()=>[E(m.$slots,"default")]),_:3},8,["tabindex","data-orientation","as","as-child","dir"])]),_:3}))}}),Cn=_n,In=C({__name:"RovingFocusItem",props:{tabStopId:{type:String,required:!1},focusable:{type:Boolean,required:!1,default:!0},active:{type:Boolean,required:!1},allowShiftKey:{type:Boolean,required:!1},asChild:{type:Boolean,required:!1},as:{type:null,required:!1,default:"span"}},setup(e){const t=e,a=Mn(),n=he(),o=_(()=>t.tabStopId||n),r=_(()=>a.currentTabStopId.value===o.value),{getItems:l,CollectionItem:i}=dt();ee(()=>{t.focusable&&a.onFocusableItemAdd()}),Oe(()=>{t.focusable&&a.onFocusableItemRemove()}),q(()=>t.focusable,(c,f)=>{c!==f&&(c?a.onFocusableItemAdd():a.onFocusableItemRemove())});function u(c){if(c.key==="Tab"&&c.shiftKey){a.onItemShiftTab();return}if(c.target!==c.currentTarget)return;const f=gn(c,a.orientation.value,a.dir.value);if(f!==void 0){if(c.metaKey||c.ctrlKey||c.altKey||!t.allowShiftKey&&c.shiftKey)return;c.preventDefault();let s=[...l().map(d=>d.ref).filter(d=>d.dataset.disabled!=="")];if(f==="last")s.reverse();else if(f==="prev"||f==="next"){f==="prev"&&s.reverse();const d=s.indexOf(c.currentTarget);s=a.loop.value?bn(s,d+1):s.slice(d+1)}B(()=>pt(s))}}return(c,f)=>(x(),A(v(i),null,{default:w(()=>[J(v(z),{tabindex:r.value?0:-1,"data-orientation":v(a).orientation.value,"data-active":c.active?"":void 0,"data-disabled":c.focusable?void 0:"",as:c.as,"as-child":c.asChild,onMousedown:f[0]||(f[0]=s=>{c.focusable?v(a).onItemFocus(o.value):s.preventDefault()}),onFocus:f[1]||(f[1]=s=>v(a).onItemFocus(o.value)),onKeydown:u},{default:w(()=>[E(c.$slots,"default")]),_:3},8,["tabindex","data-orientation","data-active","data-disabled","as","as-child"])]),_:3}))}}),xn=In;const[Le,An]=re("TabsRoot");var En=C({__name:"TabsRoot",props:{defaultValue:{type:null,required:!1},orientation:{type:String,required:!1,default:"horizontal"},dir:{type:String,required:!1},activationMode:{type:String,required:!1,default:"automatic"},modelValue:{type:null,required:!1},unmountOnHide:{type:Boolean,required:!1,default:!0},asChild:{type:Boolean,required:!1},as:{type:null,required:!1}},emits:["update:modelValue"],setup(e,{emit:t}){const a=e,n=t,{orientation:o,unmountOnHide:r,dir:l}=oe(a),i=rt(l);S();const u=qe(a,"modelValue",n,{defaultValue:a.defaultValue,passive:a.modelValue===void 0}),c=M(),f=Ee(new Set);return An({modelValue:u,changeModelValue:s=>{u.value=s},orientation:o,dir:i,unmountOnHide:r,activationMode:a.activationMode,baseId:he(void 0,"reka-tabs"),tabsList:c,contentIds:f,registerContent:s=>{f.value=new Set([...f.value,s])},unregisterContent:s=>{const d=new Set(f.value);d.delete(s),f.value=d}}),(s,d)=>(x(),A(v(z),{dir:v(i),"data-orientation":v(o),"as-child":s.asChild,as:s.as},{default:w(()=>[E(s.$slots,"default",{modelValue:v(u)})]),_:3},8,["dir","data-orientation","as-child","as"]))}}),Qr=En;function ft(e,t){return`${e}-trigger-${t}`}function yt(e,t){return`${e}-content-${t}`}var On=C({__name:"TabsContent",props:{value:{type:[String,Number],required:!0},forceMount:{type:Boolean,required:!1},asChild:{type:Boolean,required:!1},as:{type:null,required:!1}},setup(e){const t=e,{forwardRef:a}=S(),n=Le(),o=_(()=>ft(n.baseId,t.value)),r=_(()=>yt(n.baseId,t.value)),l=_(()=>t.value===n.modelValue.value),i=M(l.value);return ee(()=>{n.registerContent(t.value),requestAnimationFrame(()=>{i.value=!1})}),Ge(()=>{n.unregisterContent(t.value)}),(u,c)=>(x(),A(v(Te),{present:u.forceMount||l.value,"force-mount":""},{default:w(({present:f})=>[J(v(z),{id:r.value,ref:v(a),"as-child":u.asChild,as:u.as,role:"tabpanel","data-state":l.value?"active":"inactive","data-orientation":v(n).orientation.value,"aria-labelledby":o.value,hidden:!f,tabindex:"0",style:Qe({animationDuration:i.value?"0s":void 0})},{default:w(()=>[!v(n).unmountOnHide.value||f?E(u.$slots,"default",{key:0}):Se("v-if",!0)]),_:2},1032,["id","as-child","as","data-state","data-orientation","aria-labelledby","hidden","style"])]),_:3},8,["present"]))}}),Xr=On,Sn=C({__name:"TabsList",props:{loop:{type:Boolean,required:!1,default:!0},asChild:{type:Boolean,required:!1},as:{type:null,required:!1}},setup(e){const t=e,{loop:a}=oe(t),{forwardRef:n,currentElement:o}=S(),r=Le();return r.tabsList=o,(l,i)=>(x(),A(v(Cn),{"as-child":"",orientation:v(r).orientation.value,dir:v(r).dir.value,loop:v(a)},{default:w(()=>[J(v(z),{ref:v(n),role:"tablist","as-child":l.asChild,as:l.as,"aria-orientation":v(r).orientation.value},{default:w(()=>[E(l.$slots,"default")]),_:3},8,["as-child","as","aria-orientation"])]),_:3},8,["orientation","dir","loop"]))}}),es=Sn,Dn=C({__name:"TabsTrigger",props:{value:{type:[String,Number],required:!0},disabled:{type:Boolean,required:!1,default:!1},asChild:{type:Boolean,required:!1},as:{type:null,required:!1,default:"button"}},setup(e){const t=e,{forwardRef:a}=S(),n=Le(),o=_(()=>ft(n.baseId,t.value)),r=_(()=>n.contentIds.value.has(t.value)?yt(n.baseId,t.value):void 0),l=_(()=>t.value===n.modelValue.value);return(i,u)=>(x(),A(v(xn),{"as-child":"",focusable:!i.disabled,active:l.value},{default:w(()=>[J(v(z),{id:o.value,ref:v(a),role:"tab",type:i.as==="button"?"button":void 0,as:i.as,"as-child":i.asChild,"aria-selected":l.value?"true":"false","aria-controls":r.value,"data-state":l.value?"active":"inactive",disabled:i.disabled,"data-disabled":i.disabled?"":void 0,"data-orientation":v(n).orientation.value,onMousedown:u[0]||(u[0]=ve(c=>{!i.disabled&&c.ctrlKey===!1?v(n).changeModelValue(i.value):c.preventDefault()},["left"])),onKeydown:u[1]||(u[1]=xt(c=>v(n).changeModelValue(i.value),["enter","space"])),onFocus:u[2]||(u[2]=()=>{const c=v(n).activationMode!=="manual";!l.value&&!i.disabled&&c&&v(n).changeModelValue(i.value)})},{default:w(()=>[E(i.$slots,"default")]),_:3},8,["id","type","as","as-child","aria-selected","aria-controls","data-state","disabled","data-disabled","data-orientation"])]),_:3},8,["focusable","active"]))}}),ts=Dn;export{Ja as $,Zr as A,Kn as B,co as C,ur as D,wo as E,Io as F,Un as G,So as H,gr as I,$n as J,Po as K,zo as L,Ho as M,Sr as N,Vo as O,tr as P,vo as Q,rr as R,_r as S,Or as T,Br as U,bo as V,zr as W,jr as X,br as Y,Nr as Z,an as _,Tn as a,Qr as a$,sn as a0,Qa as a1,$o as a2,so as a3,io as a4,Aa as a5,pr as a6,Uo as a7,yo as a8,Nn as a9,Lr as aA,qr as aB,ao as aC,Jo as aD,ho as aE,Mr as aF,wr as aG,Fo as aH,fo as aI,ar as aJ,dr as aK,kr as aL,Do as aM,Zo as aN,Dr as aO,Pr as aP,Ar as aQ,Ir as aR,Fn as aS,Vn as aT,Bn as aU,Yn as aV,jn as aW,es as aX,ts as aY,Xr as aZ,To as a_,Go as aa,Qn as ab,oo as ac,Yo as ad,lr as ae,No as af,Hr as ag,nr as ah,sr as ai,Vr as aj,Co as ak,Pn as al,Hn as am,Ao as an,Er as ao,Cr as ap,cr as aq,Wn as ar,mo as as,ir as at,to as au,Xn as av,Ko as aw,er as ax,Eo as ay,Mo as az,Lo as b,Wo as b0,Xo as b1,Rn as b2,eo as b3,or as b4,ko as b5,xo as b6,$r as b7,Tr as b8,lo as b9,ro as ba,Oo as bb,go as bc,Jn as bd,qo as be,yr as bf,mr as c,jo as d,Gn as e,Rr as f,Zn as g,Gr as h,Kr as i,Yr as j,Wr as k,Jr as l,po as m,xr as n,Fr as o,Bo as p,_o as q,uo as r,Ro as s,hr as t,Ln as u,no as v,zn as w,fr as x,vr as y,Qo as z};
