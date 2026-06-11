import{c as F,r as ht,e as Et,n as S,a as D,i as pt,a$ as _t,b as ke,k as T,cb as $t,C as R,cc as vt,cd as x,o as B,ce as It,cf as C,ag as De,N as v,cg as He,m as y,D as O,E as ie,S as M,q as Nt,at as le,x as St,y as Pt,z as Tt,u as k,R as oe,v as Ct,U as kt,b5 as Ve}from"./index-6EqSDnc4.js";/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const ye=globalThis,qe=ye.ShadowRoot&&(ye.ShadyCSS===void 0||ye.ShadyCSS.nativeShadow)&&"adoptedStyleSheets"in Document.prototype&&"replace"in CSSStyleSheet.prototype,Me=Symbol(),Ge=new WeakMap;let mt=class{constructor(e,s,n){if(this._$cssResult$=!0,n!==Me)throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");this.cssText=e,this.t=s}get styleSheet(){let e=this.o;const s=this.t;if(qe&&e===void 0){const n=s!==void 0&&s.length===1;n&&(e=Ge.get(s)),e===void 0&&((this.o=e=new CSSStyleSheet).replaceSync(this.cssText),n&&Ge.set(s,e))}return e}toString(){return this.cssText}};const Ot=t=>new mt(typeof t=="string"?t:t+"",void 0,Me),Rt=(t,...e)=>{const s=t.length===1?t[0]:e.reduce((n,i,r)=>n+(o=>{if(o._$cssResult$===!0)return o.cssText;if(typeof o=="number")return o;throw Error("Value passed to 'css' function must be a 'css' function result: "+o+". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.")})(i)+t[r+1],t[0]);return new mt(s,t,Me)},Ut=(t,e)=>{if(qe)t.adoptedStyleSheets=e.map(s=>s instanceof CSSStyleSheet?s:s.styleSheet);else for(const s of e){const n=document.createElement("style"),i=ye.litNonce;i!==void 0&&n.setAttribute("nonce",i),n.textContent=s.cssText,t.appendChild(n)}},Qe=qe?t=>t:t=>t instanceof CSSStyleSheet?(e=>{let s="";for(const n of e.cssRules)s+=n.cssText;return Ot(s)})(t):t;/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const{is:Lt,defineProperty:Dt,getOwnPropertyDescriptor:qt,getOwnPropertyNames:Mt,getOwnPropertySymbols:Bt,getPrototypeOf:Ft}=Object,z=globalThis,Ye=z.trustedTypes,jt=Ye?Ye.emptyScript:"",ve=z.reactiveElementPolyfillSupport,ae=(t,e)=>t,we={toAttribute(t,e){switch(e){case Boolean:t=t?jt:null;break;case Object:case Array:t=t==null?t:JSON.stringify(t)}return t},fromAttribute(t,e){let s=t;switch(e){case Boolean:s=t!==null;break;case Number:s=t===null?null:Number(t);break;case Object:case Array:try{s=JSON.parse(t)}catch{s=null}}return s}},Be=(t,e)=>!Lt(t,e),Ke={attribute:!0,type:String,converter:we,reflect:!1,useDefault:!1,hasChanged:Be};Symbol.metadata??(Symbol.metadata=Symbol("metadata")),z.litPropertyMetadata??(z.litPropertyMetadata=new WeakMap);let ee=class extends HTMLElement{static addInitializer(e){this._$Ei(),(this.l??(this.l=[])).push(e)}static get observedAttributes(){return this.finalize(),this._$Eh&&[...this._$Eh.keys()]}static createProperty(e,s=Ke){if(s.state&&(s.attribute=!1),this._$Ei(),this.prototype.hasOwnProperty(e)&&((s=Object.create(s)).wrapped=!0),this.elementProperties.set(e,s),!s.noAccessor){const n=Symbol(),i=this.getPropertyDescriptor(e,n,s);i!==void 0&&Dt(this.prototype,e,i)}}static getPropertyDescriptor(e,s,n){const{get:i,set:r}=qt(this.prototype,e)??{get(){return this[s]},set(o){this[s]=o}};return{get:i,set(o){const c=i==null?void 0:i.call(this);r==null||r.call(this,o),this.requestUpdate(e,c,n)},configurable:!0,enumerable:!0}}static getPropertyOptions(e){return this.elementProperties.get(e)??Ke}static _$Ei(){if(this.hasOwnProperty(ae("elementProperties")))return;const e=Ft(this);e.finalize(),e.l!==void 0&&(this.l=[...e.l]),this.elementProperties=new Map(e.elementProperties)}static finalize(){if(this.hasOwnProperty(ae("finalized")))return;if(this.finalized=!0,this._$Ei(),this.hasOwnProperty(ae("properties"))){const s=this.properties,n=[...Mt(s),...Bt(s)];for(const i of n)this.createProperty(i,s[i])}const e=this[Symbol.metadata];if(e!==null){const s=litPropertyMetadata.get(e);if(s!==void 0)for(const[n,i]of s)this.elementProperties.set(n,i)}this._$Eh=new Map;for(const[s,n]of this.elementProperties){const i=this._$Eu(s,n);i!==void 0&&this._$Eh.set(i,s)}this.elementStyles=this.finalizeStyles(this.styles)}static finalizeStyles(e){const s=[];if(Array.isArray(e)){const n=new Set(e.flat(1/0).reverse());for(const i of n)s.unshift(Qe(i))}else e!==void 0&&s.push(Qe(e));return s}static _$Eu(e,s){const n=s.attribute;return n===!1?void 0:typeof n=="string"?n:typeof e=="string"?e.toLowerCase():void 0}constructor(){super(),this._$Ep=void 0,this.isUpdatePending=!1,this.hasUpdated=!1,this._$Em=null,this._$Ev()}_$Ev(){var e;this._$ES=new Promise(s=>this.enableUpdating=s),this._$AL=new Map,this._$E_(),this.requestUpdate(),(e=this.constructor.l)==null||e.forEach(s=>s(this))}addController(e){var s;(this._$EO??(this._$EO=new Set)).add(e),this.renderRoot!==void 0&&this.isConnected&&((s=e.hostConnected)==null||s.call(e))}removeController(e){var s;(s=this._$EO)==null||s.delete(e)}_$E_(){const e=new Map,s=this.constructor.elementProperties;for(const n of s.keys())this.hasOwnProperty(n)&&(e.set(n,this[n]),delete this[n]);e.size>0&&(this._$Ep=e)}createRenderRoot(){const e=this.shadowRoot??this.attachShadow(this.constructor.shadowRootOptions);return Ut(e,this.constructor.elementStyles),e}connectedCallback(){var e;this.renderRoot??(this.renderRoot=this.createRenderRoot()),this.enableUpdating(!0),(e=this._$EO)==null||e.forEach(s=>{var n;return(n=s.hostConnected)==null?void 0:n.call(s)})}enableUpdating(e){}disconnectedCallback(){var e;(e=this._$EO)==null||e.forEach(s=>{var n;return(n=s.hostDisconnected)==null?void 0:n.call(s)})}attributeChangedCallback(e,s,n){this._$AK(e,n)}_$ET(e,s){var r;const n=this.constructor.elementProperties.get(e),i=this.constructor._$Eu(e,n);if(i!==void 0&&n.reflect===!0){const o=(((r=n.converter)==null?void 0:r.toAttribute)!==void 0?n.converter:we).toAttribute(s,n.type);this._$Em=e,o==null?this.removeAttribute(i):this.setAttribute(i,o),this._$Em=null}}_$AK(e,s){var r,o;const n=this.constructor,i=n._$Eh.get(e);if(i!==void 0&&this._$Em!==i){const c=n.getPropertyOptions(i),l=typeof c.converter=="function"?{fromAttribute:c.converter}:((r=c.converter)==null?void 0:r.fromAttribute)!==void 0?c.converter:we;this._$Em=i;const f=l.fromAttribute(s,c.type);this[i]=f??((o=this._$Ej)==null?void 0:o.get(i))??f,this._$Em=null}}requestUpdate(e,s,n,i=!1,r){var o;if(e!==void 0){const c=this.constructor;if(i===!1&&(r=this[e]),n??(n=c.getPropertyOptions(e)),!((n.hasChanged??Be)(r,s)||n.useDefault&&n.reflect&&r===((o=this._$Ej)==null?void 0:o.get(e))&&!this.hasAttribute(c._$Eu(e,n))))return;this.C(e,s,n)}this.isUpdatePending===!1&&(this._$ES=this._$EP())}C(e,s,{useDefault:n,reflect:i,wrapped:r},o){n&&!(this._$Ej??(this._$Ej=new Map)).has(e)&&(this._$Ej.set(e,o??s??this[e]),r!==!0||o!==void 0)||(this._$AL.has(e)||(this.hasUpdated||n||(s=void 0),this._$AL.set(e,s)),i===!0&&this._$Em!==e&&(this._$Eq??(this._$Eq=new Set)).add(e))}async _$EP(){this.isUpdatePending=!0;try{await this._$ES}catch(s){Promise.reject(s)}const e=this.scheduleUpdate();return e!=null&&await e,!this.isUpdatePending}scheduleUpdate(){return this.performUpdate()}performUpdate(){var n;if(!this.isUpdatePending)return;if(!this.hasUpdated){if(this.renderRoot??(this.renderRoot=this.createRenderRoot()),this._$Ep){for(const[r,o]of this._$Ep)this[r]=o;this._$Ep=void 0}const i=this.constructor.elementProperties;if(i.size>0)for(const[r,o]of i){const{wrapped:c}=o,l=this[r];c!==!0||this._$AL.has(r)||l===void 0||this.C(r,void 0,o,l)}}let e=!1;const s=this._$AL;try{e=this.shouldUpdate(s),e?(this.willUpdate(s),(n=this._$EO)==null||n.forEach(i=>{var r;return(r=i.hostUpdate)==null?void 0:r.call(i)}),this.update(s)):this._$EM()}catch(i){throw e=!1,this._$EM(),i}e&&this._$AE(s)}willUpdate(e){}_$AE(e){var s;(s=this._$EO)==null||s.forEach(n=>{var i;return(i=n.hostUpdated)==null?void 0:i.call(n)}),this.hasUpdated||(this.hasUpdated=!0,this.firstUpdated(e)),this.updated(e)}_$EM(){this._$AL=new Map,this.isUpdatePending=!1}get updateComplete(){return this.getUpdateComplete()}getUpdateComplete(){return this._$ES}shouldUpdate(e){return!0}update(e){this._$Eq&&(this._$Eq=this._$Eq.forEach(s=>this._$ET(s,this[s]))),this._$EM()}updated(e){}firstUpdated(e){}};ee.elementStyles=[],ee.shadowRootOptions={mode:"open"},ee[ae("elementProperties")]=new Map,ee[ae("finalized")]=new Map,ve==null||ve({ReactiveElement:ee}),(z.reactiveElementVersions??(z.reactiveElementVersions=[])).push("2.1.2");/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const ce=globalThis,Xe=t=>t,be=ce.trustedTypes,Je=be?be.createPolicy("lit-html",{createHTML:t=>t}):void 0,ft="$lit$",W=`lit$${Math.random().toFixed(9).slice(2)}$`,gt="?"+W,Wt=`<${gt}>`,J=document,ue=()=>J.createComment(""),de=t=>t===null||typeof t!="object"&&typeof t!="function",Fe=Array.isArray,zt=t=>Fe(t)||typeof(t==null?void 0:t[Symbol.iterator])=="function",Ie=`[ 	
\f\r]`,re=/<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g,Ze=/-->/g,et=/>/g,Y=RegExp(`>|${Ie}(?:([^\\s"'>=/]+)(${Ie}*=${Ie}*(?:[^ 	
\f\r"'\`<>=]|("|')|))|$)`,"g"),tt=/'/g,st=/"/g,yt=/^(?:script|style|textarea|title)$/i,Ht=t=>(e,...s)=>({_$litType$:t,strings:e,values:s}),d=Ht(1),Z=Symbol.for("lit-noChange"),E=Symbol.for("lit-nothing"),nt=new WeakMap,K=J.createTreeWalker(J,129);function wt(t,e){if(!Fe(t)||!t.hasOwnProperty("raw"))throw Error("invalid template strings array");return Je!==void 0?Je.createHTML(e):e}const Vt=(t,e)=>{const s=t.length-1,n=[];let i,r=e===2?"<svg>":e===3?"<math>":"",o=re;for(let c=0;c<s;c++){const l=t[c];let f,w,g=-1,$=0;for(;$<l.length&&(o.lastIndex=$,w=o.exec(l),w!==null);)$=o.lastIndex,o===re?w[1]==="!--"?o=Ze:w[1]!==void 0?o=et:w[2]!==void 0?(yt.test(w[2])&&(i=RegExp("</"+w[2],"g")),o=Y):w[3]!==void 0&&(o=Y):o===Y?w[0]===">"?(o=i??re,g=-1):w[1]===void 0?g=-2:(g=o.lastIndex-w[2].length,f=w[1],o=w[3]===void 0?Y:w[3]==='"'?st:tt):o===st||o===tt?o=Y:o===Ze||o===et?o=re:(o=Y,i=void 0);const P=o===Y&&t[c+1].startsWith("/>")?" ":"";r+=o===re?l+Wt:g>=0?(n.push(f),l.slice(0,g)+ft+l.slice(g)+W+P):l+W+(g===-2?c:P)}return[wt(t,r+(t[s]||"<?>")+(e===2?"</svg>":e===3?"</math>":"")),n]};class he{constructor({strings:e,_$litType$:s},n){let i;this.parts=[];let r=0,o=0;const c=e.length-1,l=this.parts,[f,w]=Vt(e,s);if(this.el=he.createElement(f,n),K.currentNode=this.el.content,s===2||s===3){const g=this.el.content.firstChild;g.replaceWith(...g.childNodes)}for(;(i=K.nextNode())!==null&&l.length<c;){if(i.nodeType===1){if(i.hasAttributes())for(const g of i.getAttributeNames())if(g.endsWith(ft)){const $=w[o++],P=i.getAttribute(g).split(W),Q=/([.?@])?(.*)/.exec($);l.push({type:1,index:r,name:Q[2],strings:P,ctor:Q[1]==="."?Qt:Q[1]==="?"?Yt:Q[1]==="@"?Kt:_e}),i.removeAttribute(g)}else g.startsWith(W)&&(l.push({type:6,index:r}),i.removeAttribute(g));if(yt.test(i.tagName)){const g=i.textContent.split(W),$=g.length-1;if($>0){i.textContent=be?be.emptyScript:"";for(let P=0;P<$;P++)i.append(g[P],ue()),K.nextNode(),l.push({type:2,index:++r});i.append(g[$],ue())}}}else if(i.nodeType===8)if(i.data===gt)l.push({type:2,index:r});else{let g=-1;for(;(g=i.data.indexOf(W,g+1))!==-1;)l.push({type:7,index:r}),g+=W.length-1}r++}}static createElement(e,s){const n=J.createElement("template");return n.innerHTML=e,n}}function te(t,e,s=t,n){var o,c;if(e===Z)return e;let i=n!==void 0?(o=s._$Co)==null?void 0:o[n]:s._$Cl;const r=de(e)?void 0:e._$litDirective$;return(i==null?void 0:i.constructor)!==r&&((c=i==null?void 0:i._$AO)==null||c.call(i,!1),r===void 0?i=void 0:(i=new r(t),i._$AT(t,s,n)),n!==void 0?(s._$Co??(s._$Co=[]))[n]=i:s._$Cl=i),i!==void 0&&(e=te(t,i._$AS(t,e.values),i,n)),e}class Gt{constructor(e,s){this._$AV=[],this._$AN=void 0,this._$AD=e,this._$AM=s}get parentNode(){return this._$AM.parentNode}get _$AU(){return this._$AM._$AU}u(e){const{el:{content:s},parts:n}=this._$AD,i=((e==null?void 0:e.creationScope)??J).importNode(s,!0);K.currentNode=i;let r=K.nextNode(),o=0,c=0,l=n[0];for(;l!==void 0;){if(o===l.index){let f;l.type===2?f=new pe(r,r.nextSibling,this,e):l.type===1?f=new l.ctor(r,l.name,l.strings,this,e):l.type===6&&(f=new Xt(r,this,e)),this._$AV.push(f),l=n[++c]}o!==(l==null?void 0:l.index)&&(r=K.nextNode(),o++)}return K.currentNode=J,i}p(e){let s=0;for(const n of this._$AV)n!==void 0&&(n.strings!==void 0?(n._$AI(e,n,s),s+=n.strings.length-2):n._$AI(e[s])),s++}}class pe{get _$AU(){var e;return((e=this._$AM)==null?void 0:e._$AU)??this._$Cv}constructor(e,s,n,i){this.type=2,this._$AH=E,this._$AN=void 0,this._$AA=e,this._$AB=s,this._$AM=n,this.options=i,this._$Cv=(i==null?void 0:i.isConnected)??!0}get parentNode(){let e=this._$AA.parentNode;const s=this._$AM;return s!==void 0&&(e==null?void 0:e.nodeType)===11&&(e=s.parentNode),e}get startNode(){return this._$AA}get endNode(){return this._$AB}_$AI(e,s=this){e=te(this,e,s),de(e)?e===E||e==null||e===""?(this._$AH!==E&&this._$AR(),this._$AH=E):e!==this._$AH&&e!==Z&&this._(e):e._$litType$!==void 0?this.$(e):e.nodeType!==void 0?this.T(e):zt(e)?this.k(e):this._(e)}O(e){return this._$AA.parentNode.insertBefore(e,this._$AB)}T(e){this._$AH!==e&&(this._$AR(),this._$AH=this.O(e))}_(e){this._$AH!==E&&de(this._$AH)?this._$AA.nextSibling.data=e:this.T(J.createTextNode(e)),this._$AH=e}$(e){var r;const{values:s,_$litType$:n}=e,i=typeof n=="number"?this._$AC(e):(n.el===void 0&&(n.el=he.createElement(wt(n.h,n.h[0]),this.options)),n);if(((r=this._$AH)==null?void 0:r._$AD)===i)this._$AH.p(s);else{const o=new Gt(i,this),c=o.u(this.options);o.p(s),this.T(c),this._$AH=o}}_$AC(e){let s=nt.get(e.strings);return s===void 0&&nt.set(e.strings,s=new he(e)),s}k(e){Fe(this._$AH)||(this._$AH=[],this._$AR());const s=this._$AH;let n,i=0;for(const r of e)i===s.length?s.push(n=new pe(this.O(ue()),this.O(ue()),this,this.options)):n=s[i],n._$AI(r),i++;i<s.length&&(this._$AR(n&&n._$AB.nextSibling,i),s.length=i)}_$AR(e=this._$AA.nextSibling,s){var n;for((n=this._$AP)==null?void 0:n.call(this,!1,!0,s);e!==this._$AB;){const i=Xe(e).nextSibling;Xe(e).remove(),e=i}}setConnected(e){var s;this._$AM===void 0&&(this._$Cv=e,(s=this._$AP)==null||s.call(this,e))}}class _e{get tagName(){return this.element.tagName}get _$AU(){return this._$AM._$AU}constructor(e,s,n,i,r){this.type=1,this._$AH=E,this._$AN=void 0,this.element=e,this.name=s,this._$AM=i,this.options=r,n.length>2||n[0]!==""||n[1]!==""?(this._$AH=Array(n.length-1).fill(new String),this.strings=n):this._$AH=E}_$AI(e,s=this,n,i){const r=this.strings;let o=!1;if(r===void 0)e=te(this,e,s,0),o=!de(e)||e!==this._$AH&&e!==Z,o&&(this._$AH=e);else{const c=e;let l,f;for(e=r[0],l=0;l<r.length-1;l++)f=te(this,c[n+l],s,l),f===Z&&(f=this._$AH[l]),o||(o=!de(f)||f!==this._$AH[l]),f===E?e=E:e!==E&&(e+=(f??"")+r[l+1]),this._$AH[l]=f}o&&!i&&this.j(e)}j(e){e===E?this.element.removeAttribute(this.name):this.element.setAttribute(this.name,e??"")}}class Qt extends _e{constructor(){super(...arguments),this.type=3}j(e){this.element[this.name]=e===E?void 0:e}}class Yt extends _e{constructor(){super(...arguments),this.type=4}j(e){this.element.toggleAttribute(this.name,!!e&&e!==E)}}class Kt extends _e{constructor(e,s,n,i,r){super(e,s,n,i,r),this.type=5}_$AI(e,s=this){if((e=te(this,e,s,0)??E)===Z)return;const n=this._$AH,i=e===E&&n!==E||e.capture!==n.capture||e.once!==n.once||e.passive!==n.passive,r=e!==E&&(n===E||i);i&&this.element.removeEventListener(this.name,this,n),r&&this.element.addEventListener(this.name,this,e),this._$AH=e}handleEvent(e){var s;typeof this._$AH=="function"?this._$AH.call(((s=this.options)==null?void 0:s.host)??this.element,e):this._$AH.handleEvent(e)}}class Xt{constructor(e,s,n){this.element=e,this.type=6,this._$AN=void 0,this._$AM=s,this.options=n}get _$AU(){return this._$AM._$AU}_$AI(e){te(this,e)}}const Ne=ce.litHtmlPolyfillSupport;Ne==null||Ne(he,pe),(ce.litHtmlVersions??(ce.litHtmlVersions=[])).push("3.3.2");const Jt=(t,e,s)=>{const n=(s==null?void 0:s.renderBefore)??e;let i=n._$litPart$;if(i===void 0){const r=(s==null?void 0:s.renderBefore)??null;n._$litPart$=i=new pe(e.insertBefore(ue(),r),r,void 0,s??{})}return i._$AI(t),i};/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const X=globalThis;let I=class extends ee{constructor(){super(...arguments),this.renderOptions={host:this},this._$Do=void 0}createRenderRoot(){var s;const e=super.createRenderRoot();return(s=this.renderOptions).renderBefore??(s.renderBefore=e.firstChild),e}update(e){const s=this.render();this.hasUpdated||(this.renderOptions.isConnected=this.isConnected),super.update(e),this._$Do=Jt(s,this.renderRoot,this.renderOptions)}connectedCallback(){var e;super.connectedCallback(),(e=this._$Do)==null||e.setConnected(!0)}disconnectedCallback(){var e;super.disconnectedCallback(),(e=this._$Do)==null||e.setConnected(!1)}render(){return Z}};var dt;I._$litElement$=!0,I.finalized=!0,(dt=X.litElementHydrateSupport)==null||dt.call(X,{LitElement:I});const Se=X.litElementPolyfillSupport;Se==null||Se({LitElement:I});(X.litElementVersions??(X.litElementVersions=[])).push("4.2.2");/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const Zt={attribute:!0,type:String,converter:we,reflect:!1,hasChanged:Be},es=(t=Zt,e,s)=>{const{kind:n,metadata:i}=s;let r=globalThis.litPropertyMetadata.get(i);if(r===void 0&&globalThis.litPropertyMetadata.set(i,r=new Map),n==="setter"&&((t=Object.create(t)).wrapped=!0),r.set(s.name,t),n==="accessor"){const{name:o}=s;return{set(c){const l=e.get.call(this);e.set.call(this,c),this.requestUpdate(o,l,t,!0,c)},init(c){return c!==void 0&&this.C(o,void 0,t,c),c}}}if(n==="setter"){const{name:o}=s;return function(c){const l=this[o];e.call(this,c),this.requestUpdate(o,l,t,!0,c)}}throw Error("Unsupported decorator location: "+n)};function me(t){return(e,s)=>typeof s=="object"?es(t,e,s):((n,i,r)=>{const o=i.hasOwnProperty(r);return i.constructor.createProperty(r,n),o?Object.getOwnPropertyDescriptor(i,r):void 0})(t,e,s)}/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */function m(t){return me({...t,state:!0,attribute:!1})}/**
 * @license
 * Copyright 2018 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const b=t=>t??E,ts=F`
  :host {
    position: relative;
  }

  button {
    display: flex;
    justify-content: center;
    align-items: center;
    background-color: transparent;
    padding: ${({spacing:t})=>t[1]};
  }

  /* -- Colors --------------------------------------------------- */
  button[data-type='accent'] wui-icon {
    color: ${({tokens:t})=>t.core.iconAccentPrimary};
  }

  button[data-type='neutral'][data-variant='primary'] wui-icon {
    color: ${({tokens:t})=>t.theme.iconInverse};
  }

  button[data-type='neutral'][data-variant='secondary'] wui-icon {
    color: ${({tokens:t})=>t.theme.iconDefault};
  }

  button[data-type='success'] wui-icon {
    color: ${({tokens:t})=>t.core.iconSuccess};
  }

  button[data-type='error'] wui-icon {
    color: ${({tokens:t})=>t.core.iconError};
  }

  /* -- Sizes --------------------------------------------------- */
  button[data-size='xs'] {
    width: 16px;
    height: 16px;

    border-radius: ${({borderRadius:t})=>t[1]};
  }

  button[data-size='sm'] {
    width: 20px;
    height: 20px;
    border-radius: ${({borderRadius:t})=>t[1]};
  }

  button[data-size='md'] {
    width: 24px;
    height: 24px;
    border-radius: ${({borderRadius:t})=>t[2]};
  }

  button[data-size='lg'] {
    width: 28px;
    height: 28px;
    border-radius: ${({borderRadius:t})=>t[2]};
  }

  button[data-size='xs'] wui-icon {
    width: 8px;
    height: 8px;
  }

  button[data-size='sm'] wui-icon {
    width: 12px;
    height: 12px;
  }

  button[data-size='md'] wui-icon {
    width: 16px;
    height: 16px;
  }

  button[data-size='lg'] wui-icon {
    width: 20px;
    height: 20px;
  }

  /* -- Hover --------------------------------------------------- */
  @media (hover: hover) {
    button[data-type='accent']:hover:enabled {
      background-color: ${({tokens:t})=>t.core.foregroundAccent010};
    }

    button[data-variant='primary'][data-type='neutral']:hover:enabled {
      background-color: ${({tokens:t})=>t.theme.foregroundSecondary};
    }

    button[data-variant='secondary'][data-type='neutral']:hover:enabled {
      background-color: ${({tokens:t})=>t.theme.foregroundSecondary};
    }

    button[data-type='success']:hover:enabled {
      background-color: ${({tokens:t})=>t.core.backgroundSuccess};
    }

    button[data-type='error']:hover:enabled {
      background-color: ${({tokens:t})=>t.core.backgroundError};
    }
  }

  /* -- Focus --------------------------------------------------- */
  button:focus-visible {
    box-shadow: 0 0 0 4px ${({tokens:t})=>t.core.foregroundAccent020};
  }

  /* -- Properties --------------------------------------------------- */
  button[data-full-width='true'] {
    width: 100%;
  }

  :host([fullWidth]) {
    width: 100%;
  }

  button[disabled] {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;var V=function(t,e,s,n){var i=arguments.length,r=i<3?e:n===null?n=Object.getOwnPropertyDescriptor(e,s):n,o;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")r=Reflect.decorate(t,e,s,n);else for(var c=t.length-1;c>=0;c--)(o=t[c])&&(r=(i<3?o(r):i>3?o(e,s,r):o(e,s))||r);return i>3&&r&&Object.defineProperty(e,s,r),r};let U=class extends pt{constructor(){super(...arguments),this.icon="card",this.variant="primary",this.type="accent",this.size="md",this.iconSize=void 0,this.fullWidth=!1,this.disabled=!1}render(){return ke`<button
      data-variant=${this.variant}
      data-type=${this.type}
      data-size=${this.size}
      data-full-width=${this.fullWidth}
      ?disabled=${this.disabled}
    >
      <wui-icon color="inherit" name=${this.icon} size=${_t(this.iconSize)}></wui-icon>
    </button>`}};U.styles=[ht,Et,ts];V([S()],U.prototype,"icon",void 0);V([S()],U.prototype,"variant",void 0);V([S()],U.prototype,"type",void 0);V([S()],U.prototype,"size",void 0);V([S()],U.prototype,"iconSize",void 0);V([S({type:Boolean})],U.prototype,"fullWidth",void 0);V([S({type:Boolean})],U.prototype,"disabled",void 0);U=V([D("wui-icon-button")],U);const h={INVALID_PAYMENT_CONFIG:"INVALID_PAYMENT_CONFIG",INVALID_RECIPIENT:"INVALID_RECIPIENT",INVALID_ASSET:"INVALID_ASSET",INVALID_AMOUNT:"INVALID_AMOUNT",UNKNOWN_ERROR:"UNKNOWN_ERROR",UNABLE_TO_INITIATE_PAYMENT:"UNABLE_TO_INITIATE_PAYMENT",INVALID_CHAIN_NAMESPACE:"INVALID_CHAIN_NAMESPACE",GENERIC_PAYMENT_ERROR:"GENERIC_PAYMENT_ERROR",UNABLE_TO_GET_EXCHANGES:"UNABLE_TO_GET_EXCHANGES",ASSET_NOT_SUPPORTED:"ASSET_NOT_SUPPORTED",UNABLE_TO_GET_PAY_URL:"UNABLE_TO_GET_PAY_URL",UNABLE_TO_GET_BUY_STATUS:"UNABLE_TO_GET_BUY_STATUS",UNABLE_TO_GET_TOKEN_BALANCES:"UNABLE_TO_GET_TOKEN_BALANCES",UNABLE_TO_GET_QUOTE:"UNABLE_TO_GET_QUOTE",UNABLE_TO_GET_QUOTE_STATUS:"UNABLE_TO_GET_QUOTE_STATUS",INVALID_RECIPIENT_ADDRESS_FOR_ASSET:"INVALID_RECIPIENT_ADDRESS_FOR_ASSET"},j={[h.INVALID_PAYMENT_CONFIG]:"Invalid payment configuration",[h.INVALID_RECIPIENT]:"Invalid recipient address",[h.INVALID_ASSET]:"Invalid asset specified",[h.INVALID_AMOUNT]:"Invalid payment amount",[h.INVALID_RECIPIENT_ADDRESS_FOR_ASSET]:"Invalid recipient address for the asset selected",[h.UNKNOWN_ERROR]:"Unknown payment error occurred",[h.UNABLE_TO_INITIATE_PAYMENT]:"Unable to initiate payment",[h.INVALID_CHAIN_NAMESPACE]:"Invalid chain namespace",[h.GENERIC_PAYMENT_ERROR]:"Unable to process payment",[h.UNABLE_TO_GET_EXCHANGES]:"Unable to get exchanges",[h.ASSET_NOT_SUPPORTED]:"Asset not supported by the selected exchange",[h.UNABLE_TO_GET_PAY_URL]:"Unable to get payment URL",[h.UNABLE_TO_GET_BUY_STATUS]:"Unable to get buy status",[h.UNABLE_TO_GET_TOKEN_BALANCES]:"Unable to get token balances",[h.UNABLE_TO_GET_QUOTE]:"Unable to get quote. Please choose a different token",[h.UNABLE_TO_GET_QUOTE_STATUS]:"Unable to get quote status"};class p extends Error{get message(){return j[this.code]}constructor(e,s){super(j[e]),this.name="AppKitPayError",this.code=e,this.details=s,Error.captureStackTrace&&Error.captureStackTrace(this,p)}}const ss="https://rpc.walletconnect.org/v1/json-rpc",it="reown_test";function ns(){const{chainNamespace:t}=x.parseCaipNetworkId(u.state.paymentAsset.network);if(!B.isAddress(u.state.recipient,t))throw new p(h.INVALID_RECIPIENT_ADDRESS_FOR_ASSET,`Provide valid recipient address for namespace "${t}"`)}async function is(t,e,s){var c;if(e!==T.CHAIN.EVM)throw new p(h.INVALID_CHAIN_NAMESPACE);if(!s.fromAddress)throw new p(h.INVALID_PAYMENT_CONFIG,"fromAddress is required for native EVM payments.");const n=typeof s.amount=="string"?parseFloat(s.amount):s.amount;if(isNaN(n))throw new p(h.INVALID_PAYMENT_CONFIG);const i=((c=t.metadata)==null?void 0:c.decimals)??18,r=R.parseUnits(n.toString(),i);if(typeof r!="bigint")throw new p(h.GENERIC_PAYMENT_ERROR);return await R.sendTransaction({chainNamespace:e,to:s.recipient,address:s.fromAddress,value:r,data:"0x"})??void 0}async function rs(t,e){if(!e.fromAddress)throw new p(h.INVALID_PAYMENT_CONFIG,"fromAddress is required for ERC20 EVM payments.");const s=t.asset,n=e.recipient,i=Number(t.metadata.decimals),r=R.parseUnits(e.amount.toString(),i);if(r===void 0)throw new p(h.GENERIC_PAYMENT_ERROR);return await R.writeContract({fromAddress:e.fromAddress,tokenAddress:s,args:[n,r],method:"transfer",abi:vt.getERC20Abi(s),chainNamespace:T.CHAIN.EVM})??void 0}async function os(t,e){if(t!==T.CHAIN.SOLANA)throw new p(h.INVALID_CHAIN_NAMESPACE);if(!e.fromAddress)throw new p(h.INVALID_PAYMENT_CONFIG,"fromAddress is required for Solana payments.");const s=typeof e.amount=="string"?parseFloat(e.amount):e.amount;if(isNaN(s)||s<=0)throw new p(h.INVALID_PAYMENT_CONFIG,"Invalid payment amount.");try{if(!$t.getProvider(t))throw new p(h.GENERIC_PAYMENT_ERROR,"No Solana provider available.");const i=await R.sendTransaction({chainNamespace:T.CHAIN.SOLANA,to:e.recipient,value:s,tokenMint:e.tokenMint});if(!i)throw new p(h.GENERIC_PAYMENT_ERROR,"Transaction failed.");return i}catch(n){throw n instanceof p?n:new p(h.GENERIC_PAYMENT_ERROR,`Solana payment failed: ${n}`)}}async function as({sourceToken:t,toToken:e,amount:s,recipient:n}){const i=R.parseUnits(s,t.metadata.decimals),r=R.parseUnits(s,e.metadata.decimals);return Promise.resolve({type:Re,origin:{amount:(i==null?void 0:i.toString())??"0",currency:t},destination:{amount:(r==null?void 0:r.toString())??"0",currency:e},fees:[{id:"service",label:"Service Fee",amount:"0",currency:e}],steps:[{requestId:Re,type:"deposit",deposit:{amount:(i==null?void 0:i.toString())??"0",currency:t.asset,receiver:n}}],timeInSeconds:6})}function Oe(t){if(!t)return null;const e=t.steps[0];return!e||e.type!==xs?null:e}function Pe(t,e=0){if(!t)return[];const s=t.steps.filter(i=>i.type===Es),n=s.filter((i,r)=>r+1>e);return s.length>0&&s.length<3?n:[]}const je=new It({baseUrl:B.getApiUrl(),clientId:null});class cs extends Error{}function ls(){const t=De.getSnapshot().projectId;return`${ss}?projectId=${t}`}function We(){const{projectId:t,sdkType:e,sdkVersion:s}=De.state;return{projectId:t,st:e||"appkit",sv:s||"html-wagmi-4.2.2"}}async function ze(t,e){const s=ls(),{sdkType:n,sdkVersion:i,projectId:r}=De.getSnapshot(),o={jsonrpc:"2.0",id:1,method:t,params:{...e||{},st:n,sv:i,projectId:r}},l=await(await fetch(s,{method:"POST",body:JSON.stringify(o),headers:{"Content-Type":"application/json"}})).json();if(l.error)throw new cs(l.error.message);return l}async function rt(t){return(await ze("reown_getExchanges",t)).result}async function ot(t){return(await ze("reown_getExchangePayUrl",t)).result}async function us(t){return(await ze("reown_getExchangeBuyStatus",t)).result}async function ds(t){const e=v.bigNumber(t.amount).times(10**t.toToken.metadata.decimals).toString(),{chainId:s,chainNamespace:n}=x.parseCaipNetworkId(t.sourceToken.network),{chainId:i,chainNamespace:r}=x.parseCaipNetworkId(t.toToken.network),o=t.sourceToken.asset==="native"?He(n):t.sourceToken.asset,c=t.toToken.asset==="native"?He(r):t.toToken.asset;return await je.post({path:"/appkit/v1/transfers/quote",body:{user:t.address,originChainId:s.toString(),originCurrency:o,destinationChainId:i.toString(),destinationCurrency:c,recipient:t.recipient,amount:e},params:We()})}async function hs(t){const e=C.isLowerCaseMatch(t.sourceToken.network,t.toToken.network),s=C.isLowerCaseMatch(t.sourceToken.asset,t.toToken.asset);return e&&s?as(t):ds(t)}async function ps(t){return await je.get({path:"/appkit/v1/transfers/status",params:{requestId:t.requestId,...We()}})}async function ms(t){return await je.get({path:`/appkit/v1/transfers/assets/exchanges/${t}`,params:We()})}const fs=["eip155","solana"],gs={eip155:{native:{assetNamespace:"slip44",assetReference:"60"},defaultTokenNamespace:"erc20"},solana:{native:{assetNamespace:"slip44",assetReference:"501"},defaultTokenNamespace:"token"}},at={56:"714",204:"714"};function Te(t,e){const{chainNamespace:s,chainId:n}=x.parseCaipNetworkId(t),i=gs[s];if(!i)throw new Error(`Unsupported chain namespace for CAIP-19 formatting: ${s}`);let r=i.native.assetNamespace,o=i.native.assetReference;return e!=="native"?(r=i.defaultTokenNamespace,o=e):s==="eip155"&&at[n]&&(o=at[n]),`${`${s}:${n}`}/${r}:${o}`}function ys(t){const{chainNamespace:e}=x.parseCaipNetworkId(t);return fs.includes(e)}function ws(t){const s=y.getAllRequestedCaipNetworks().find(i=>i.caipNetworkId===t.chainId);let n=t.address;if(!s)throw new Error(`Target network not found for balance chainId "${t.chainId}"`);if(C.isLowerCaseMatch(t.symbol,s.nativeCurrency.symbol))n="native";else if(B.isCaipAddress(n)){const{address:i}=x.parseCaipAddress(n);n=i}else if(!n)throw new Error(`Balance address not found for balance symbol "${t.symbol}"`);return{network:s.caipNetworkId,asset:n,metadata:{name:t.name,symbol:t.symbol,decimals:Number(t.quantity.decimals),logoURI:t.iconUrl},amount:t.quantity.numeric}}function bs(t){return{chainId:t.network,address:`${t.network}:${t.asset}`,symbol:t.metadata.symbol,name:t.metadata.name,iconUrl:t.metadata.logoURI||"",price:0,quantity:{numeric:"0",decimals:t.metadata.decimals.toString()}}}function Ae(t){const e=v.bigNumber(t,{safe:!0});return e.lt(.001)?"<0.001":e.round(4).toString()}function As(t){const s=y.getAllRequestedCaipNetworks().find(n=>n.caipNetworkId===t.network);return s?!!s.testnet:!1}const ct=0,Ce="unknown",Re="direct-transfer",xs="deposit",Es="transaction",a=Tt({paymentAsset:{network:"eip155:1",asset:"0x0",metadata:{name:"0x0",symbol:"0x0",decimals:0}},recipient:"0x0",amount:0,isConfigured:!1,error:null,isPaymentInProgress:!1,exchanges:[],isLoading:!1,openInNewTab:!0,redirectUrl:void 0,payWithExchange:void 0,currentPayment:void 0,analyticsSet:!1,paymentId:void 0,choice:"pay",tokenBalances:{[T.CHAIN.EVM]:[],[T.CHAIN.SOLANA]:[]},isFetchingTokenBalances:!1,selectedPaymentAsset:null,quote:void 0,quoteStatus:"waiting",quoteError:null,isFetchingQuote:!1,selectedExchange:void 0,exchangeUrlForQuote:void 0,requestId:void 0}),u={state:a,subscribe(t){return Pt(a,()=>t(a))},subscribeKey(t,e){return St(a,t,e)},async handleOpenPay(t){this.resetState(),this.setPaymentConfig(t),this.initializeAnalytics(),ns(),await this.prepareTokenLogo(),a.isConfigured=!0,ie.sendEvent({type:"track",event:"PAY_MODAL_OPEN",properties:{exchanges:a.exchanges,configuration:{network:a.paymentAsset.network,asset:a.paymentAsset.asset,recipient:a.recipient,amount:a.amount}}}),await le.open({view:"Pay"})},resetState(){a.paymentAsset={network:"eip155:1",asset:"0x0",metadata:{name:"0x0",symbol:"0x0",decimals:0}},a.recipient="0x0",a.amount=0,a.isConfigured=!1,a.error=null,a.isPaymentInProgress=!1,a.isLoading=!1,a.currentPayment=void 0,a.selectedExchange=void 0,a.exchangeUrlForQuote=void 0,a.requestId=void 0},resetQuoteState(){a.quote=void 0,a.quoteStatus="waiting",a.quoteError=null,a.isFetchingQuote=!1,a.requestId=void 0},setPaymentConfig(t){if(!t.paymentAsset)throw new p(h.INVALID_PAYMENT_CONFIG);try{a.choice=t.choice??"pay",a.paymentAsset=t.paymentAsset,a.recipient=t.recipient,a.amount=t.amount,a.openInNewTab=t.openInNewTab??!0,a.redirectUrl=t.redirectUrl,a.payWithExchange=t.payWithExchange,a.error=null}catch(e){throw new p(h.INVALID_PAYMENT_CONFIG,e.message)}},setSelectedPaymentAsset(t){a.selectedPaymentAsset=t},setSelectedExchange(t){a.selectedExchange=t},setRequestId(t){a.requestId=t},setPaymentInProgress(t){a.isPaymentInProgress=t},getPaymentAsset(){return a.paymentAsset},getExchanges(){return a.exchanges},async fetchExchanges(){try{a.isLoading=!0;const t=await rt({page:ct});a.exchanges=t.exchanges.slice(0,2)}catch{throw M.showError(j.UNABLE_TO_GET_EXCHANGES),new p(h.UNABLE_TO_GET_EXCHANGES)}finally{a.isLoading=!1}},async getAvailableExchanges(t){var e;try{const s=t!=null&&t.asset&&(t!=null&&t.network)?Te(t.network,t.asset):void 0;return await rt({page:(t==null?void 0:t.page)??ct,asset:s,amount:(e=t==null?void 0:t.amount)==null?void 0:e.toString()})}catch{throw new p(h.UNABLE_TO_GET_EXCHANGES)}},async getPayUrl(t,e,s=!1){try{const n=Number(e.amount),i=await ot({exchangeId:t,asset:Te(e.network,e.asset),amount:n.toString(),recipient:`${e.network}:${e.recipient}`});return ie.sendEvent({type:"track",event:"PAY_EXCHANGE_SELECTED",properties:{source:"pay",exchange:{id:t},configuration:{network:e.network,asset:e.asset,recipient:e.recipient,amount:n},currentPayment:{type:"exchange",exchangeId:t},headless:s}}),s&&(this.initiatePayment(),ie.sendEvent({type:"track",event:"PAY_INITIATED",properties:{source:"pay",paymentId:a.paymentId||Ce,configuration:{network:e.network,asset:e.asset,recipient:e.recipient,amount:n},currentPayment:{type:"exchange",exchangeId:t}}})),i}catch(n){throw n instanceof Error&&n.message.includes("is not supported")?new p(h.ASSET_NOT_SUPPORTED):new Error(n.message)}},async generateExchangeUrlForQuote({exchangeId:t,paymentAsset:e,amount:s,recipient:n}){const i=await ot({exchangeId:t,asset:Te(e.network,e.asset),amount:s.toString(),recipient:n});a.exchangeSessionId=i.sessionId,a.exchangeUrlForQuote=i.url},async openPayUrl(t,e,s=!1){try{const n=await this.getPayUrl(t.exchangeId,e,s);if(!n)throw new p(h.UNABLE_TO_GET_PAY_URL);const r=t.openInNewTab??!0?"_blank":"_self";return B.openHref(n.url,r),n}catch(n){throw n instanceof p?a.error=n.message:a.error=j.GENERIC_PAYMENT_ERROR,new p(h.UNABLE_TO_GET_PAY_URL)}},async onTransfer({chainNamespace:t,fromAddress:e,toAddress:s,amount:n,paymentAsset:i}){if(a.currentPayment={type:"wallet",status:"IN_PROGRESS"},!a.isPaymentInProgress)try{this.initiatePayment();const o=y.getAllRequestedCaipNetworks().find(l=>l.caipNetworkId===i.network);if(!o)throw new Error("Target network not found");const c=y.state.activeCaipNetwork;switch(C.isLowerCaseMatch(c==null?void 0:c.caipNetworkId,o.caipNetworkId)||await y.switchActiveNetwork(o),t){case T.CHAIN.EVM:i.asset==="native"&&(a.currentPayment.result=await is(i,t,{recipient:s,amount:n,fromAddress:e})),i.asset.startsWith("0x")&&(a.currentPayment.result=await rs(i,{recipient:s,amount:n,fromAddress:e})),a.currentPayment.status="SUCCESS";break;case T.CHAIN.SOLANA:a.currentPayment.result=await os(t,{recipient:s,amount:n,fromAddress:e,tokenMint:i.asset==="native"?void 0:i.asset}),a.currentPayment.status="SUCCESS";break;default:throw new p(h.INVALID_CHAIN_NAMESPACE)}}catch(r){throw r instanceof p?a.error=r.message:a.error=j.GENERIC_PAYMENT_ERROR,a.currentPayment.status="FAILED",M.showError(a.error),r}finally{a.isPaymentInProgress=!1}},async onSendTransaction(t){try{const{namespace:e,transactionStep:s}=t;u.initiatePayment();const i=y.getAllRequestedCaipNetworks().find(o=>{var c;return o.caipNetworkId===((c=a.paymentAsset)==null?void 0:c.network)});if(!i)throw new Error("Target network not found");const r=y.state.activeCaipNetwork;if(C.isLowerCaseMatch(r==null?void 0:r.caipNetworkId,i.caipNetworkId)||await y.switchActiveNetwork(i),e===T.CHAIN.EVM){const{from:o,to:c,data:l,value:f}=s.transaction;await R.sendTransaction({address:o,to:c,data:l,value:BigInt(f),chainNamespace:e})}else if(e===T.CHAIN.SOLANA){const{instructions:o}=s.transaction;await R.writeSolanaTransaction({instructions:o})}}catch(e){throw e instanceof p?a.error=e.message:a.error=j.GENERIC_PAYMENT_ERROR,M.showError(a.error),e}finally{a.isPaymentInProgress=!1}},getExchangeById(t){return a.exchanges.find(e=>e.id===t)},validatePayConfig(t){const{paymentAsset:e,recipient:s,amount:n}=t;if(!e)throw new p(h.INVALID_PAYMENT_CONFIG);if(!s)throw new p(h.INVALID_RECIPIENT);if(!e.asset)throw new p(h.INVALID_ASSET);if(n==null||n<=0)throw new p(h.INVALID_AMOUNT)},async handlePayWithExchange(t){try{a.currentPayment={type:"exchange",exchangeId:t};const{network:e,asset:s}=a.paymentAsset,n={network:e,asset:s,amount:a.amount,recipient:a.recipient},i=await this.getPayUrl(t,n);if(!i)throw new p(h.UNABLE_TO_INITIATE_PAYMENT);return a.currentPayment.sessionId=i.sessionId,a.currentPayment.status="IN_PROGRESS",a.currentPayment.exchangeId=t,this.initiatePayment(),{url:i.url,openInNewTab:a.openInNewTab}}catch(e){return e instanceof p?a.error=e.message:a.error=j.GENERIC_PAYMENT_ERROR,a.isPaymentInProgress=!1,M.showError(a.error),null}},async getBuyStatus(t,e){var s,n;try{const i=await us({sessionId:e,exchangeId:t});return(i.status==="SUCCESS"||i.status==="FAILED")&&ie.sendEvent({type:"track",event:i.status==="SUCCESS"?"PAY_SUCCESS":"PAY_ERROR",properties:{message:i.status==="FAILED"?B.parseError(a.error):void 0,source:"pay",paymentId:a.paymentId||Ce,configuration:{network:a.paymentAsset.network,asset:a.paymentAsset.asset,recipient:a.recipient,amount:a.amount},currentPayment:{type:"exchange",exchangeId:(s=a.currentPayment)==null?void 0:s.exchangeId,sessionId:(n=a.currentPayment)==null?void 0:n.sessionId,result:i.txHash}}}),i}catch{throw new p(h.UNABLE_TO_GET_BUY_STATUS)}},async fetchTokensFromEOA({caipAddress:t,caipNetwork:e,namespace:s}){if(!t)return[];const{address:n}=x.parseCaipAddress(t);let i=e;return s===T.CHAIN.EVM&&(i=void 0),await Nt.getMyTokensWithBalance({address:n,caipNetwork:i})},async fetchTokensFromExchange(){if(!a.selectedExchange)return[];const t=await ms(a.selectedExchange.id),e=Object.values(t.assets).flat();return await Promise.all(e.map(async n=>{const i=bs(n),{chainNamespace:r}=x.parseCaipNetworkId(i.chainId);let o=i.address;if(B.isCaipAddress(o)){const{address:l}=x.parseCaipAddress(o);o=l}const c=await O.getImageByToken(o??"",r).catch(()=>{});return i.iconUrl=c??"",i}))},async fetchTokens({caipAddress:t,caipNetwork:e,namespace:s}){try{a.isFetchingTokenBalances=!0;const r=await(!!a.selectedExchange?this.fetchTokensFromExchange():this.fetchTokensFromEOA({caipAddress:t,caipNetwork:e,namespace:s}));a.tokenBalances={...a.tokenBalances,[s]:r}}catch(n){const i=n instanceof Error?n.message:"Unable to get token balances";M.showError(i)}finally{a.isFetchingTokenBalances=!1}},async fetchQuote({amount:t,address:e,sourceToken:s,toToken:n,recipient:i}){try{u.resetQuoteState(),a.isFetchingQuote=!0;const r=await hs({amount:t,address:a.selectedExchange?void 0:e,sourceToken:s,toToken:n,recipient:i});if(a.selectedExchange){const o=Oe(r);if(o){const c=`${s.network}:${o.deposit.receiver}`,l=v.formatNumber(o.deposit.amount,{decimals:s.metadata.decimals??0,round:8});await u.generateExchangeUrlForQuote({exchangeId:a.selectedExchange.id,paymentAsset:s,amount:l.toString(),recipient:c})}}a.quote=r}catch(r){let o=j.UNABLE_TO_GET_QUOTE;if(r instanceof Error&&r.cause&&r.cause instanceof Response)try{const c=await r.cause.json();c.error&&typeof c.error=="string"&&(o=c.error)}catch{}throw a.quoteError=o,M.showError(o),new p(h.UNABLE_TO_GET_QUOTE)}finally{a.isFetchingQuote=!1}},async fetchQuoteStatus({requestId:t}){try{if(t===Re){const s=a.selectedExchange,n=a.exchangeSessionId;if(s&&n){switch((await this.getBuyStatus(s.id,n)).status){case"IN_PROGRESS":a.quoteStatus="waiting";break;case"SUCCESS":a.quoteStatus="success",a.isPaymentInProgress=!1;break;case"FAILED":a.quoteStatus="failure",a.isPaymentInProgress=!1;break;case"UNKNOWN":a.quoteStatus="waiting";break;default:a.quoteStatus="waiting";break}return}a.quoteStatus="success";return}const{status:e}=await ps({requestId:t});a.quoteStatus=e}catch{throw a.quoteStatus="failure",new p(h.UNABLE_TO_GET_QUOTE_STATUS)}},initiatePayment(){a.isPaymentInProgress=!0,a.paymentId=crypto.randomUUID()},initializeAnalytics(){a.analyticsSet||(a.analyticsSet=!0,this.subscribeKey("isPaymentInProgress",t=>{var e;if((e=a.currentPayment)!=null&&e.status&&a.currentPayment.status!=="UNKNOWN"){const s={IN_PROGRESS:"PAY_INITIATED",SUCCESS:"PAY_SUCCESS",FAILED:"PAY_ERROR"}[a.currentPayment.status];ie.sendEvent({type:"track",event:s,properties:{message:a.currentPayment.status==="FAILED"?B.parseError(a.error):void 0,source:"pay",paymentId:a.paymentId||Ce,configuration:{network:a.paymentAsset.network,asset:a.paymentAsset.asset,recipient:a.recipient,amount:a.amount},currentPayment:{type:a.currentPayment.type,exchangeId:a.currentPayment.exchangeId,sessionId:a.currentPayment.sessionId,result:a.currentPayment.result}}})}}))},async prepareTokenLogo(){if(!a.paymentAsset.metadata.logoURI)try{const{chainNamespace:t}=x.parseCaipNetworkId(a.paymentAsset.network),e=await O.getImageByToken(a.paymentAsset.asset,t);a.paymentAsset.metadata.logoURI=e}catch{}}},_s=F`
  wui-separator {
    margin: var(--apkt-spacing-3) calc(var(--apkt-spacing-3) * -1) var(--apkt-spacing-2)
      calc(var(--apkt-spacing-3) * -1);
    width: calc(100% + var(--apkt-spacing-3) * 2);
  }

  .token-display {
    padding: var(--apkt-spacing-3) var(--apkt-spacing-3);
    border-radius: var(--apkt-borderRadius-5);
    background-color: var(--apkt-tokens-theme-backgroundPrimary);
    margin-top: var(--apkt-spacing-3);
    margin-bottom: var(--apkt-spacing-3);
  }

  .token-display wui-text {
    text-transform: none;
  }

  wui-loading-spinner {
    padding: var(--apkt-spacing-2);
  }

  .left-image-container {
    position: relative;
    justify-content: center;
    align-items: center;
  }

  .token-image {
    border-radius: ${({borderRadius:t})=>t.round};
    width: 40px;
    height: 40px;
  }

  .chain-image {
    position: absolute;
    width: 20px;
    height: 20px;
    bottom: -3px;
    right: -5px;
    border-radius: ${({borderRadius:t})=>t.round};
    border: 2px solid ${({tokens:t})=>t.theme.backgroundPrimary};
  }

  .payment-methods-container {
    background-color: ${({tokens:t})=>t.theme.foregroundPrimary};
    border-top-right-radius: ${({borderRadius:t})=>t[8]};
    border-top-left-radius: ${({borderRadius:t})=>t[8]};
  }
`;var G=function(t,e,s,n){var i=arguments.length,r=i<3?e:n===null?n=Object.getOwnPropertyDescriptor(e,s):n,o;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")r=Reflect.decorate(t,e,s,n);else for(var c=t.length-1;c>=0;c--)(o=t[c])&&(r=(i<3?o(r):i>3?o(e,s,r):o(e,s))||r);return i>3&&r&&Object.defineProperty(e,s,r),r};let L=class extends I{constructor(){super(),this.unsubscribe=[],this.amount=u.state.amount,this.namespace=void 0,this.paymentAsset=u.state.paymentAsset,this.activeConnectorIds=k.state.activeConnectorIds,this.caipAddress=void 0,this.exchanges=u.state.exchanges,this.isLoading=u.state.isLoading,this.initializeNamespace(),this.unsubscribe.push(u.subscribeKey("amount",e=>this.amount=e)),this.unsubscribe.push(k.subscribeKey("activeConnectorIds",e=>this.activeConnectorIds=e)),this.unsubscribe.push(u.subscribeKey("exchanges",e=>this.exchanges=e)),this.unsubscribe.push(u.subscribeKey("isLoading",e=>this.isLoading=e)),u.fetchExchanges(),u.setSelectedExchange(void 0)}disconnectedCallback(){this.unsubscribe.forEach(e=>e())}render(){return d`
      <wui-flex flexDirection="column">
        ${this.paymentDetailsTemplate()} ${this.paymentMethodsTemplate()}
      </wui-flex>
    `}paymentMethodsTemplate(){return d`
      <wui-flex flexDirection="column" padding="3" gap="2" class="payment-methods-container">
        ${this.payWithWalletTemplate()} ${this.templateSeparator()}
        ${this.templateExchangeOptions()}
      </wui-flex>
    `}initializeNamespace(){var s;const e=y.state.activeChain;this.namespace=e,this.caipAddress=(s=y.getAccountData(e))==null?void 0:s.caipAddress,this.unsubscribe.push(y.subscribeChainProp("accountState",n=>{this.caipAddress=n==null?void 0:n.caipAddress},e))}paymentDetailsTemplate(){const s=y.getAllRequestedCaipNetworks().find(n=>n.caipNetworkId===this.paymentAsset.network);return d`
      <wui-flex
        alignItems="center"
        justifyContent="space-between"
        .padding=${["6","8","6","8"]}
        gap="2"
      >
        <wui-flex alignItems="center" gap="1">
          <wui-text variant="h1-regular" color="primary">
            ${Ae(this.amount||"0")}
          </wui-text>

          <wui-flex flexDirection="column">
            <wui-text variant="h6-regular" color="secondary">
              ${this.paymentAsset.metadata.symbol||"Unknown"}
            </wui-text>
            <wui-text variant="md-medium" color="secondary"
              >on ${(s==null?void 0:s.name)||"Unknown"}</wui-text
            >
          </wui-flex>
        </wui-flex>

        <wui-flex class="left-image-container">
          <wui-image
            src=${b(this.paymentAsset.metadata.logoURI)}
            class="token-image"
          ></wui-image>
          <wui-image
            src=${b(O.getNetworkImage(s))}
            class="chain-image"
          ></wui-image>
        </wui-flex>
      </wui-flex>
    `}payWithWalletTemplate(){return ys(this.paymentAsset.network)?this.caipAddress?this.connectedWalletTemplate():this.disconnectedWalletTemplate():d``}connectedWalletTemplate(){const{name:e,image:s}=this.getWalletProperties({namespace:this.namespace});return d`
      <wui-flex flexDirection="column" gap="3">
        <wui-list-item
          type="secondary"
          boxColor="foregroundSecondary"
          @click=${this.onWalletPayment}
          .boxed=${!1}
          ?chevron=${!0}
          ?fullSize=${!1}
          ?rounded=${!0}
          data-testid="wallet-payment-option"
          imageSrc=${b(s)}
          imageSize="3xl"
        >
          <wui-text variant="lg-regular" color="primary">Pay with ${e}</wui-text>
        </wui-list-item>

        <wui-list-item
          type="secondary"
          icon="power"
          iconColor="error"
          @click=${this.onDisconnect}
          data-testid="disconnect-button"
          ?chevron=${!1}
          boxColor="foregroundSecondary"
        >
          <wui-text variant="lg-regular" color="secondary">Disconnect</wui-text>
        </wui-list-item>
      </wui-flex>
    `}disconnectedWalletTemplate(){return d`<wui-list-item
      type="secondary"
      boxColor="foregroundSecondary"
      variant="icon"
      iconColor="default"
      iconVariant="overlay"
      icon="wallet"
      @click=${this.onWalletPayment}
      ?chevron=${!0}
      data-testid="wallet-payment-option"
    >
      <wui-text variant="lg-regular" color="primary">Pay with wallet</wui-text>
    </wui-list-item>`}templateExchangeOptions(){if(this.isLoading)return d`<wui-flex justifyContent="center" alignItems="center">
        <wui-loading-spinner size="md"></wui-loading-spinner>
      </wui-flex>`;const e=this.exchanges.filter(s=>As(this.paymentAsset)?s.id===it:s.id!==it);return e.length===0?d`<wui-flex justifyContent="center" alignItems="center">
        <wui-text variant="md-medium" color="primary">No exchanges available</wui-text>
      </wui-flex>`:e.map(s=>d`
        <wui-list-item
          type="secondary"
          boxColor="foregroundSecondary"
          @click=${()=>this.onExchangePayment(s)}
          data-testid="exchange-option-${s.id}"
          ?chevron=${!0}
          imageSrc=${b(s.imageUrl)}
        >
          <wui-text flexGrow="1" variant="lg-regular" color="primary">
            Pay with ${s.name}
          </wui-text>
        </wui-list-item>
      `)}templateSeparator(){return d`<wui-separator text="or" bgColor="secondary"></wui-separator>`}async onWalletPayment(){if(!this.namespace)throw new Error("Namespace not found");this.caipAddress?oe.push("PayQuote"):(await k.connect(),await le.open({view:"PayQuote"}))}onExchangePayment(e){u.setSelectedExchange(e),oe.push("PayQuote")}async onDisconnect(){try{await R.disconnect(),await le.open({view:"Pay"})}catch{console.error("Failed to disconnect"),M.showError("Failed to disconnect")}}getWalletProperties({namespace:e}){if(!e)return{name:void 0,image:void 0};const s=this.activeConnectorIds[e];if(!s)return{name:void 0,image:void 0};const n=k.getConnector({id:s,namespace:e});if(!n)return{name:void 0,image:void 0};const i=O.getConnectorImage(n);return{name:n.name,image:i}}};L.styles=_s;G([m()],L.prototype,"amount",void 0);G([m()],L.prototype,"namespace",void 0);G([m()],L.prototype,"paymentAsset",void 0);G([m()],L.prototype,"activeConnectorIds",void 0);G([m()],L.prototype,"caipAddress",void 0);G([m()],L.prototype,"exchanges",void 0);G([m()],L.prototype,"isLoading",void 0);L=G([D("w3m-pay-view")],L);/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const $s={ATTRIBUTE:1},vs=t=>(...e)=>({_$litDirective$:t,values:e});class Is{constructor(e){}get _$AU(){return this._$AM._$AU}_$AT(e,s,n){this._$Ct=e,this._$AM=s,this._$Ci=n}_$AS(e,s){return this.update(e,s)}update(e,s){return this.render(...s)}}/**
 * @license
 * Copyright 2018 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const bt=vs(class extends Is{constructor(t){var e;if(super(t),t.type!==$s.ATTRIBUTE||t.name!=="class"||((e=t.strings)==null?void 0:e.length)>2)throw Error("`classMap()` can only be used in the `class` attribute and must be the only part in the attribute.")}render(t){return" "+Object.keys(t).filter(e=>t[e]).join(" ")+" "}update(t,[e]){var n,i;if(this.st===void 0){this.st=new Set,t.strings!==void 0&&(this.nt=new Set(t.strings.join(" ").split(/\s/).filter(r=>r!=="")));for(const r in e)e[r]&&!((n=this.nt)!=null&&n.has(r))&&this.st.add(r);return this.render(e)}const s=t.element.classList;for(const r of this.st)r in e||(s.remove(r),this.st.delete(r));for(const r in e){const o=!!e[r];o===this.st.has(r)||(i=this.nt)!=null&&i.has(r)||(o?(s.add(r),this.st.add(r)):(s.remove(r),this.st.delete(r)))}return Z}}),Ns=F`
  :host {
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }

  .pulse-container {
    position: relative;
    width: var(--pulse-size);
    height: var(--pulse-size);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .pulse-rings {
    position: absolute;
    inset: 0;
    pointer-events: none;
  }

  .pulse-ring {
    position: absolute;
    inset: 0;
    border-radius: 50%;
    border: 2px solid var(--pulse-color);
    opacity: 0;
    animation: pulse var(--pulse-duration, 2s) ease-out infinite;
  }

  .pulse-content {
    position: relative;
    z-index: 1;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  @keyframes pulse {
    0% {
      transform: scale(0.5);
      opacity: var(--pulse-opacity, 0.3);
    }
    50% {
      opacity: calc(var(--pulse-opacity, 0.3) * 0.5);
    }
    100% {
      transform: scale(1.2);
      opacity: 0;
    }
  }
`;var ne=function(t,e,s,n){var i=arguments.length,r=i<3?e:n===null?n=Object.getOwnPropertyDescriptor(e,s):n,o;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")r=Reflect.decorate(t,e,s,n);else for(var c=t.length-1;c>=0;c--)(o=t[c])&&(r=(i<3?o(r):i>3?o(e,s,r):o(e,s))||r);return i>3&&r&&Object.defineProperty(e,s,r),r};const Ss=3,Ps=2,Ts=.3,Cs="200px",ks={"accent-primary":Ct.tokens.core.backgroundAccentPrimary};let H=class extends pt{constructor(){super(...arguments),this.rings=Ss,this.duration=Ps,this.opacity=Ts,this.size=Cs,this.variant="accent-primary"}render(){const e=ks[this.variant];this.style.cssText=`
      --pulse-size: ${this.size};
      --pulse-duration: ${this.duration}s;
      --pulse-color: ${e};
      --pulse-opacity: ${this.opacity};
    `;const s=Array.from({length:this.rings},(n,i)=>this.renderRing(i,this.rings));return ke`
      <div class="pulse-container">
        <div class="pulse-rings">${s}</div>
        <div class="pulse-content">
          <slot></slot>
        </div>
      </div>
    `}renderRing(e,s){const i=`animation-delay: ${e/s*this.duration}s;`;return ke`<div class="pulse-ring" style=${i}></div>`}};H.styles=[ht,Ns];ne([S({type:Number})],H.prototype,"rings",void 0);ne([S({type:Number})],H.prototype,"duration",void 0);ne([S({type:Number})],H.prototype,"opacity",void 0);ne([S()],H.prototype,"size",void 0);ne([S()],H.prototype,"variant",void 0);H=ne([D("wui-pulse")],H);const lt=[{id:"received",title:"Receiving funds",icon:"dollar"},{id:"processing",title:"Swapping asset",icon:"recycleHorizontal"},{id:"sending",title:"Sending asset to the recipient address",icon:"send"}],ut=["success","submitted","failure","timeout","refund"],Os=F`
  :host {
    display: block;
    height: 100%;
    width: 100%;
  }

  wui-image {
    border-radius: ${({borderRadius:t})=>t.round};
  }

  .token-badge-container {
    position: absolute;
    bottom: 6px;
    left: 50%;
    transform: translateX(-50%);
    border-radius: ${({borderRadius:t})=>t[4]};
    z-index: 3;
    min-width: 105px;
  }

  .token-badge-container.loading {
    background-color: ${({tokens:t})=>t.theme.backgroundPrimary};
    border: 3px solid ${({tokens:t})=>t.theme.backgroundPrimary};
  }

  .token-badge-container.success {
    background-color: ${({tokens:t})=>t.theme.backgroundPrimary};
    border: 3px solid ${({tokens:t})=>t.theme.backgroundPrimary};
  }

  .token-image-container {
    position: relative;
  }

  .token-image {
    border-radius: ${({borderRadius:t})=>t.round};
    width: 64px;
    height: 64px;
  }

  .token-image.success {
    background-color: ${({tokens:t})=>t.theme.foregroundPrimary};
  }

  .token-image.error {
    background-color: ${({tokens:t})=>t.theme.foregroundPrimary};
  }

  .token-image.loading {
    background: ${({colors:t})=>t.accent010};
  }

  .token-image wui-icon {
    width: 32px;
    height: 32px;
  }

  .token-badge {
    background-color: ${({tokens:t})=>t.theme.foregroundPrimary};
    border: 1px solid ${({tokens:t})=>t.theme.foregroundSecondary};
    border-radius: ${({borderRadius:t})=>t[4]};
  }

  .token-badge wui-text {
    white-space: nowrap;
  }

  .payment-lifecycle-container {
    background-color: ${({tokens:t})=>t.theme.foregroundPrimary};
    border-top-right-radius: ${({borderRadius:t})=>t[6]};
    border-top-left-radius: ${({borderRadius:t})=>t[6]};
  }

  .payment-step-badge {
    padding: ${({spacing:t})=>t[1]} ${({spacing:t})=>t[2]};
    border-radius: ${({borderRadius:t})=>t[1]};
  }

  .payment-step-badge.loading {
    background-color: ${({tokens:t})=>t.theme.foregroundSecondary};
  }

  .payment-step-badge.error {
    background-color: ${({tokens:t})=>t.core.backgroundError};
  }

  .payment-step-badge.success {
    background-color: ${({tokens:t})=>t.core.backgroundSuccess};
  }

  .step-icon-container {
    position: relative;
    height: 40px;
    width: 40px;
    border-radius: ${({borderRadius:t})=>t.round};
    background-color: ${({tokens:t})=>t.theme.foregroundSecondary};
  }

  .step-icon-box {
    position: absolute;
    right: -4px;
    bottom: -1px;
    padding: 2px;
    border-radius: ${({borderRadius:t})=>t.round};
    border: 2px solid ${({tokens:t})=>t.theme.backgroundPrimary};
    background-color: ${({tokens:t})=>t.theme.foregroundPrimary};
  }

  .step-icon-box.success {
    background-color: ${({tokens:t})=>t.core.backgroundSuccess};
  }
`;var q=function(t,e,s,n){var i=arguments.length,r=i<3?e:n===null?n=Object.getOwnPropertyDescriptor(e,s):n,o;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")r=Reflect.decorate(t,e,s,n);else for(var c=t.length-1;c>=0;c--)(o=t[c])&&(r=(i<3?o(r):i>3?o(e,s,r):o(e,s))||r);return i>3&&r&&Object.defineProperty(e,s,r),r};const Rs={received:["pending","success","submitted"],processing:["success","submitted"],sending:["success","submitted"]},Us=3e3;let N=class extends I{constructor(){super(),this.unsubscribe=[],this.pollingInterval=null,this.paymentAsset=u.state.paymentAsset,this.quoteStatus=u.state.quoteStatus,this.quote=u.state.quote,this.amount=u.state.amount,this.namespace=void 0,this.caipAddress=void 0,this.profileName=null,this.activeConnectorIds=k.state.activeConnectorIds,this.selectedExchange=u.state.selectedExchange,this.initializeNamespace(),this.unsubscribe.push(u.subscribeKey("quoteStatus",e=>this.quoteStatus=e),u.subscribeKey("quote",e=>this.quote=e),k.subscribeKey("activeConnectorIds",e=>this.activeConnectorIds=e),u.subscribeKey("selectedExchange",e=>this.selectedExchange=e))}connectedCallback(){super.connectedCallback(),this.startPolling()}disconnectedCallback(){super.disconnectedCallback(),this.stopPolling(),this.unsubscribe.forEach(e=>e())}render(){return d`
      <wui-flex flexDirection="column" .padding=${["3","0","0","0"]} gap="2">
        ${this.tokenTemplate()} ${this.paymentTemplate()} ${this.paymentLifecycleTemplate()}
      </wui-flex>
    `}tokenTemplate(){const e=Ae(this.amount||"0"),s=this.paymentAsset.metadata.symbol??"Unknown",i=y.getAllRequestedCaipNetworks().find(c=>c.caipNetworkId===this.paymentAsset.network),r=this.quoteStatus==="failure"||this.quoteStatus==="timeout"||this.quoteStatus==="refund";return this.quoteStatus==="success"||this.quoteStatus==="submitted"?d`<wui-flex alignItems="center" justifyContent="center">
        <wui-flex justifyContent="center" alignItems="center" class="token-image success">
          <wui-icon name="checkmark" color="success" size="inherit"></wui-icon>
        </wui-flex>
      </wui-flex>`:r?d`<wui-flex alignItems="center" justifyContent="center">
        <wui-flex justifyContent="center" alignItems="center" class="token-image error">
          <wui-icon name="close" color="error" size="inherit"></wui-icon>
        </wui-flex>
      </wui-flex>`:d`
      <wui-flex alignItems="center" justifyContent="center">
        <wui-flex class="token-image-container">
          <wui-pulse size="125px" rings="3" duration="4" opacity="0.5" variant="accent-primary">
            <wui-flex justifyContent="center" alignItems="center" class="token-image loading">
              <wui-icon name="paperPlaneTitle" color="accent-primary" size="inherit"></wui-icon>
            </wui-flex>
          </wui-pulse>

          <wui-flex
            justifyContent="center"
            alignItems="center"
            class="token-badge-container loading"
          >
            <wui-flex
              alignItems="center"
              justifyContent="center"
              gap="01"
              padding="1"
              class="token-badge"
            >
              <wui-image
                src=${b(O.getNetworkImage(i))}
                class="chain-image"
                size="mdl"
              ></wui-image>

              <wui-text variant="lg-regular" color="primary">${e} ${s}</wui-text>
            </wui-flex>
          </wui-flex>
        </wui-flex>
      </wui-flex>
    `}paymentTemplate(){return d`
      <wui-flex flexDirection="column" gap="2" .padding=${["0","6","0","6"]}>
        ${this.renderPayment()}
        <wui-separator></wui-separator>
        ${this.renderWallet()}
      </wui-flex>
    `}paymentLifecycleTemplate(){const e=this.getStepsWithStatus();return d`
      <wui-flex flexDirection="column" padding="4" gap="2" class="payment-lifecycle-container">
        <wui-flex alignItems="center" justifyContent="space-between">
          <wui-text variant="md-regular" color="secondary">PAYMENT CYCLE</wui-text>

          ${this.renderPaymentCycleBadge()}
        </wui-flex>

        <wui-flex flexDirection="column" gap="5" .padding=${["2","0","2","0"]}>
          ${e.map(s=>this.renderStep(s))}
        </wui-flex>
      </wui-flex>
    `}renderPaymentCycleBadge(){var i;const e=this.quoteStatus==="failure"||this.quoteStatus==="timeout"||this.quoteStatus==="refund",s=this.quoteStatus==="success"||this.quoteStatus==="submitted";if(e)return d`
        <wui-flex
          justifyContent="center"
          alignItems="center"
          class="payment-step-badge error"
          gap="1"
        >
          <wui-icon name="close" color="error" size="xs"></wui-icon>
          <wui-text variant="sm-regular" color="error">Failed</wui-text>
        </wui-flex>
      `;if(s)return d`
        <wui-flex
          justifyContent="center"
          alignItems="center"
          class="payment-step-badge success"
          gap="1"
        >
          <wui-icon name="checkmark" color="success" size="xs"></wui-icon>
          <wui-text variant="sm-regular" color="success">Completed</wui-text>
        </wui-flex>
      `;const n=((i=this.quote)==null?void 0:i.timeInSeconds)??0;return d`
      <wui-flex alignItems="center" justifyContent="space-between" gap="3">
        <wui-flex
          justifyContent="center"
          alignItems="center"
          class="payment-step-badge loading"
          gap="1"
        >
          <wui-icon name="clock" color="default" size="xs"></wui-icon>
          <wui-text variant="sm-regular" color="primary">Est. ${n} sec</wui-text>
        </wui-flex>

        <wui-icon name="chevronBottom" color="default" size="xxs"></wui-icon>
      </wui-flex>
    `}renderPayment(){var o,c,l;const s=y.getAllRequestedCaipNetworks().find(f=>{var $;const w=($=this.quote)==null?void 0:$.origin.currency.network;if(!w)return!1;const{chainId:g}=x.parseCaipNetworkId(w);return C.isLowerCaseMatch(f.id.toString(),g.toString())}),n=v.formatNumber(((o=this.quote)==null?void 0:o.origin.amount)||"0",{decimals:((c=this.quote)==null?void 0:c.origin.currency.metadata.decimals)??0}).toString(),i=Ae(n),r=((l=this.quote)==null?void 0:l.origin.currency.metadata.symbol)??"Unknown";return d`
      <wui-flex
        alignItems="flex-start"
        justifyContent="space-between"
        .padding=${["3","0","3","0"]}
      >
        <wui-text variant="lg-regular" color="secondary">Payment Method</wui-text>

        <wui-flex flexDirection="column" alignItems="flex-end" gap="1">
          <wui-flex alignItems="center" gap="01">
            <wui-text variant="lg-regular" color="primary">${i}</wui-text>
            <wui-text variant="lg-regular" color="secondary">${r}</wui-text>
          </wui-flex>

          <wui-flex alignItems="center" gap="1">
            <wui-text variant="md-regular" color="secondary">on</wui-text>
            <wui-image
              src=${b(O.getNetworkImage(s))}
              size="xs"
            ></wui-image>
            <wui-text variant="md-regular" color="secondary">${s==null?void 0:s.name}</wui-text>
          </wui-flex>
        </wui-flex>
      </wui-flex>
    `}renderWallet(){return d`
      <wui-flex
        alignItems="flex-start"
        justifyContent="space-between"
        .padding=${["3","0","3","0"]}
      >
        <wui-text variant="lg-regular" color="secondary"
          >${this.selectedExchange?"Exchange":"Wallet"}</wui-text
        >

        ${this.renderWalletText()}
      </wui-flex>
    `}renderWalletText(){var i;const{image:e}=this.getWalletProperties({namespace:this.namespace}),{address:s}=this.caipAddress?x.parseCaipAddress(this.caipAddress):{},n=(i=this.selectedExchange)==null?void 0:i.name;return this.selectedExchange?d`
        <wui-flex alignItems="center" justifyContent="flex-end" gap="1">
          <wui-text variant="lg-regular" color="primary">${n}</wui-text>
          <wui-image src=${b(this.selectedExchange.imageUrl)} size="mdl"></wui-image>
        </wui-flex>
      `:d`
      <wui-flex alignItems="center" justifyContent="flex-end" gap="1">
        <wui-text variant="lg-regular" color="primary">
          ${kt.getTruncateString({string:this.profileName||s||n||"",charsStart:this.profileName?16:4,charsEnd:this.profileName?0:6,truncate:this.profileName?"end":"middle"})}
        </wui-text>

        <wui-image src=${b(e)} size="mdl"></wui-image>
      </wui-flex>
    `}getStepsWithStatus(){return this.quoteStatus==="failure"||this.quoteStatus==="timeout"||this.quoteStatus==="refund"?lt.map(s=>({...s,status:"failed"})):lt.map(s=>{const i=(Rs[s.id]??[]).includes(this.quoteStatus)?"completed":"pending";return{...s,status:i}})}renderStep({title:e,icon:s,status:n}){return d`
      <wui-flex alignItems="center" gap="3">
        <wui-flex justifyContent="center" alignItems="center" class="step-icon-container">
          <wui-icon name=${s} color="default" size="mdl"></wui-icon>

          <wui-flex alignItems="center" justifyContent="center" class=${bt({"step-icon-box":!0,success:n==="completed"})}>
            ${this.renderStatusIndicator(n)}
          </wui-flex>
        </wui-flex>

        <wui-text variant="md-regular" color="primary">${e}</wui-text>
      </wui-flex>
    `}renderStatusIndicator(e){return e==="completed"?d`<wui-icon size="sm" color="success" name="checkmark"></wui-icon>`:e==="failed"?d`<wui-icon size="sm" color="error" name="close"></wui-icon>`:e==="pending"?d`<wui-loading-spinner color="accent-primary" size="sm"></wui-loading-spinner>`:null}startPolling(){this.pollingInterval||(this.fetchQuoteStatus(),this.pollingInterval=setInterval(()=>{this.fetchQuoteStatus()},Us))}stopPolling(){this.pollingInterval&&(clearInterval(this.pollingInterval),this.pollingInterval=null)}async fetchQuoteStatus(){const e=u.state.requestId;if(!e||ut.includes(this.quoteStatus))this.stopPolling();else try{await u.fetchQuoteStatus({requestId:e}),ut.includes(this.quoteStatus)&&this.stopPolling()}catch{this.stopPolling()}}initializeNamespace(){var s,n;const e=y.state.activeChain;this.namespace=e,this.caipAddress=(s=y.getAccountData(e))==null?void 0:s.caipAddress,this.profileName=((n=y.getAccountData(e))==null?void 0:n.profileName)??null,this.unsubscribe.push(y.subscribeChainProp("accountState",i=>{this.caipAddress=i==null?void 0:i.caipAddress,this.profileName=(i==null?void 0:i.profileName)??null},e))}getWalletProperties({namespace:e}){if(!e)return{name:void 0,image:void 0};const s=this.activeConnectorIds[e];if(!s)return{name:void 0,image:void 0};const n=k.getConnector({id:s,namespace:e});if(!n)return{name:void 0,image:void 0};const i=O.getConnectorImage(n);return{name:n.name,image:i}}};N.styles=Os;q([m()],N.prototype,"paymentAsset",void 0);q([m()],N.prototype,"quoteStatus",void 0);q([m()],N.prototype,"quote",void 0);q([m()],N.prototype,"amount",void 0);q([m()],N.prototype,"namespace",void 0);q([m()],N.prototype,"caipAddress",void 0);q([m()],N.prototype,"profileName",void 0);q([m()],N.prototype,"activeConnectorIds",void 0);q([m()],N.prototype,"selectedExchange",void 0);N=q([D("w3m-pay-loading-view")],N);const Ls=Rt`
  :host {
    display: block;
  }
`;var Ds=function(t,e,s,n){var i=arguments.length,r=i<3?e:n===null?n=Object.getOwnPropertyDescriptor(e,s):n,o;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")r=Reflect.decorate(t,e,s,n);else for(var c=t.length-1;c>=0;c--)(o=t[c])&&(r=(i<3?o(r):i>3?o(e,s,r):o(e,s))||r);return i>3&&r&&Object.defineProperty(e,s,r),r};let Ue=class extends I{render(){return d`
      <wui-flex flexDirection="column" gap="4">
        <wui-flex alignItems="center" justifyContent="space-between">
          <wui-text variant="md-regular" color="secondary">Pay</wui-text>
          <wui-shimmer width="60px" height="16px" borderRadius="4xs" variant="light"></wui-shimmer>
        </wui-flex>

        <wui-flex alignItems="center" justifyContent="space-between">
          <wui-text variant="md-regular" color="secondary">Network Fee</wui-text>

          <wui-flex flexDirection="column" alignItems="flex-end" gap="2">
            <wui-shimmer
              width="75px"
              height="16px"
              borderRadius="4xs"
              variant="light"
            ></wui-shimmer>

            <wui-flex alignItems="center" gap="01">
              <wui-shimmer width="14px" height="14px" rounded variant="light"></wui-shimmer>
              <wui-shimmer
                width="49px"
                height="14px"
                borderRadius="4xs"
                variant="light"
              ></wui-shimmer>
            </wui-flex>
          </wui-flex>
        </wui-flex>

        <wui-flex alignItems="center" justifyContent="space-between">
          <wui-text variant="md-regular" color="secondary">Service Fee</wui-text>
          <wui-shimmer width="75px" height="16px" borderRadius="4xs" variant="light"></wui-shimmer>
        </wui-flex>
      </wui-flex>
    `}};Ue.styles=[Ls];Ue=Ds([D("w3m-pay-fees-skeleton")],Ue);const qs=F`
  :host {
    display: block;
  }

  wui-image {
    border-radius: ${({borderRadius:t})=>t.round};
  }
`;var At=function(t,e,s,n){var i=arguments.length,r=i<3?e:n===null?n=Object.getOwnPropertyDescriptor(e,s):n,o;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")r=Reflect.decorate(t,e,s,n);else for(var c=t.length-1;c>=0;c--)(o=t[c])&&(r=(i<3?o(r):i>3?o(e,s,r):o(e,s))||r);return i>3&&r&&Object.defineProperty(e,s,r),r};let xe=class extends I{constructor(){super(),this.unsubscribe=[],this.quote=u.state.quote,this.unsubscribe.push(u.subscribeKey("quote",e=>this.quote=e))}disconnectedCallback(){this.unsubscribe.forEach(e=>e())}render(){var s,n,i;const e=v.formatNumber(((s=this.quote)==null?void 0:s.origin.amount)||"0",{decimals:((n=this.quote)==null?void 0:n.origin.currency.metadata.decimals)??0,round:6}).toString();return d`
      <wui-flex flexDirection="column" gap="4">
        <wui-flex alignItems="center" justifyContent="space-between">
          <wui-text variant="md-regular" color="secondary">Pay</wui-text>
          <wui-text variant="md-regular" color="primary">
            ${e} ${((i=this.quote)==null?void 0:i.origin.currency.metadata.symbol)||"Unknown"}
          </wui-text>
        </wui-flex>

        ${this.quote&&this.quote.fees.length>0?this.quote.fees.map(r=>this.renderFee(r)):null}
      </wui-flex>
    `}renderFee(e){const s=e.id==="network",n=v.formatNumber(e.amount||"0",{decimals:e.currency.metadata.decimals??0,round:6}).toString();if(s){const r=y.getAllRequestedCaipNetworks().find(o=>C.isLowerCaseMatch(o.caipNetworkId,e.currency.network));return d`
        <wui-flex alignItems="center" justifyContent="space-between">
          <wui-text variant="md-regular" color="secondary">${e.label}</wui-text>

          <wui-flex flexDirection="column" alignItems="flex-end" gap="2">
            <wui-text variant="md-regular" color="primary">
              ${n} ${e.currency.metadata.symbol||"Unknown"}
            </wui-text>

            <wui-flex alignItems="center" gap="01">
              <wui-image
                src=${b(O.getNetworkImage(r))}
                size="xs"
              ></wui-image>
              <wui-text variant="sm-regular" color="secondary">
                ${(r==null?void 0:r.name)||"Unknown"}
              </wui-text>
            </wui-flex>
          </wui-flex>
        </wui-flex>
      `}return d`
      <wui-flex alignItems="center" justifyContent="space-between">
        <wui-text variant="md-regular" color="secondary">${e.label}</wui-text>
        <wui-text variant="md-regular" color="primary">
          ${n} ${e.currency.metadata.symbol||"Unknown"}
        </wui-text>
      </wui-flex>
    `}};xe.styles=[qs];At([m()],xe.prototype,"quote",void 0);xe=At([D("w3m-pay-fees")],xe);const Ms=F`
  :host {
    display: block;
    width: 100%;
  }

  .disabled-container {
    padding: ${({spacing:t})=>t[2]};
    min-height: 168px;
  }

  wui-icon {
    width: ${({spacing:t})=>t[8]};
    height: ${({spacing:t})=>t[8]};
  }

  wui-flex > wui-text {
    max-width: 273px;
  }
`;var xt=function(t,e,s,n){var i=arguments.length,r=i<3?e:n===null?n=Object.getOwnPropertyDescriptor(e,s):n,o;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")r=Reflect.decorate(t,e,s,n);else for(var c=t.length-1;c>=0;c--)(o=t[c])&&(r=(i<3?o(r):i>3?o(e,s,r):o(e,s))||r);return i>3&&r&&Object.defineProperty(e,s,r),r};let Ee=class extends I{constructor(){super(),this.unsubscribe=[],this.selectedExchange=u.state.selectedExchange,this.unsubscribe.push(u.subscribeKey("selectedExchange",e=>this.selectedExchange=e))}disconnectedCallback(){this.unsubscribe.forEach(e=>e())}render(){const e=!!this.selectedExchange;return d`
      <wui-flex
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        gap="3"
        class="disabled-container"
      >
        <wui-icon name="coins" color="default" size="inherit"></wui-icon>

        <wui-text variant="md-regular" color="primary" align="center">
          You don't have enough funds to complete this transaction
        </wui-text>

        ${e?null:d`<wui-button
              size="md"
              variant="neutral-secondary"
              @click=${this.dispatchConnectOtherWalletEvent.bind(this)}
              >Connect other wallet</wui-button
            >`}
      </wui-flex>
    `}dispatchConnectOtherWalletEvent(){this.dispatchEvent(new CustomEvent("connectOtherWallet",{detail:!0,bubbles:!0,composed:!0}))}};Ee.styles=[Ms];xt([me({type:Array})],Ee.prototype,"selectedExchange",void 0);Ee=xt([D("w3m-pay-options-empty")],Ee);const Bs=F`
  :host {
    display: block;
    width: 100%;
  }

  .pay-options-container {
    max-height: 196px;
    overflow-y: auto;
    overflow-x: hidden;
    scrollbar-width: none;
  }

  .pay-options-container::-webkit-scrollbar {
    display: none;
  }

  .pay-option-container {
    border-radius: ${({borderRadius:t})=>t[4]};
    padding: ${({spacing:t})=>t[3]};
    min-height: 60px;
  }

  .token-images-container {
    position: relative;
    justify-content: center;
    align-items: center;
  }

  .chain-image {
    position: absolute;
    bottom: -3px;
    right: -5px;
    border: 2px solid ${({tokens:t})=>t.theme.foregroundSecondary};
  }
`;var Fs=function(t,e,s,n){var i=arguments.length,r=i<3?e:n===null?n=Object.getOwnPropertyDescriptor(e,s):n,o;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")r=Reflect.decorate(t,e,s,n);else for(var c=t.length-1;c>=0;c--)(o=t[c])&&(r=(i<3?o(r):i>3?o(e,s,r):o(e,s))||r);return i>3&&r&&Object.defineProperty(e,s,r),r};let Le=class extends I{render(){return d`
      <wui-flex flexDirection="column" gap="2" class="pay-options-container">
        ${this.renderOptionEntry()} ${this.renderOptionEntry()} ${this.renderOptionEntry()}
      </wui-flex>
    `}renderOptionEntry(){return d`
      <wui-flex
        alignItems="center"
        justifyContent="space-between"
        gap="2"
        class="pay-option-container"
      >
        <wui-flex alignItems="center" gap="2">
          <wui-flex class="token-images-container">
            <wui-shimmer
              width="32px"
              height="32px"
              rounded
              variant="light"
              class="token-image"
            ></wui-shimmer>
            <wui-shimmer
              width="16px"
              height="16px"
              rounded
              variant="light"
              class="chain-image"
            ></wui-shimmer>
          </wui-flex>

          <wui-flex flexDirection="column" gap="1">
            <wui-shimmer
              width="74px"
              height="16px"
              borderRadius="4xs"
              variant="light"
            ></wui-shimmer>
            <wui-shimmer
              width="46px"
              height="14px"
              borderRadius="4xs"
              variant="light"
            ></wui-shimmer>
          </wui-flex>
        </wui-flex>
      </wui-flex>
    `}};Le.styles=[Bs];Le=Fs([D("w3m-pay-options-skeleton")],Le);const js=F`
  :host {
    display: block;
    width: 100%;
  }

  .pay-options-container {
    max-height: 196px;
    overflow-y: auto;
    overflow-x: hidden;
    scrollbar-width: none;
    mask-image: var(--options-mask-image);
    -webkit-mask-image: var(--options-mask-image);
  }

  .pay-options-container::-webkit-scrollbar {
    display: none;
  }

  .pay-option-container {
    cursor: pointer;
    border-radius: ${({borderRadius:t})=>t[4]};
    padding: ${({spacing:t})=>t[3]};
    transition: background-color ${({durations:t})=>t.lg}
      ${({easings:t})=>t["ease-out-power-1"]};
    will-change: background-color;
  }

  .token-images-container {
    position: relative;
    justify-content: center;
    align-items: center;
  }

  .token-image {
    border-radius: ${({borderRadius:t})=>t.round};
    width: 32px;
    height: 32px;
  }

  .chain-image {
    position: absolute;
    width: 16px;
    height: 16px;
    bottom: -3px;
    right: -5px;
    border-radius: ${({borderRadius:t})=>t.round};
    border: 2px solid ${({tokens:t})=>t.theme.backgroundPrimary};
  }

  @media (hover: hover) and (pointer: fine) {
    .pay-option-container:hover {
      background-color: ${({tokens:t})=>t.theme.foregroundPrimary};
    }
  }
`;var $e=function(t,e,s,n){var i=arguments.length,r=i<3?e:n===null?n=Object.getOwnPropertyDescriptor(e,s):n,o;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")r=Reflect.decorate(t,e,s,n);else for(var c=t.length-1;c>=0;c--)(o=t[c])&&(r=(i<3?o(r):i>3?o(e,s,r):o(e,s))||r);return i>3&&r&&Object.defineProperty(e,s,r),r};const Ws=300;let se=class extends I{constructor(){super(),this.unsubscribe=[],this.options=[],this.selectedPaymentAsset=null}disconnectedCallback(){var s,n;this.unsubscribe.forEach(i=>i()),(s=this.resizeObserver)==null||s.disconnect();const e=(n=this.shadowRoot)==null?void 0:n.querySelector(".pay-options-container");e==null||e.removeEventListener("scroll",this.handleOptionsListScroll.bind(this))}firstUpdated(){var s,n;const e=(s=this.shadowRoot)==null?void 0:s.querySelector(".pay-options-container");e&&(requestAnimationFrame(this.handleOptionsListScroll.bind(this)),e==null||e.addEventListener("scroll",this.handleOptionsListScroll.bind(this)),this.resizeObserver=new ResizeObserver(()=>{this.handleOptionsListScroll()}),(n=this.resizeObserver)==null||n.observe(e),this.handleOptionsListScroll())}render(){return d`
      <wui-flex flexDirection="column" gap="2" class="pay-options-container">
        ${this.options.map(e=>this.payOptionTemplate(e))}
      </wui-flex>
    `}payOptionTemplate(e){var P,Q;const{network:s,metadata:n,asset:i,amount:r="0"}=e,c=y.getAllRequestedCaipNetworks().find(fe=>fe.caipNetworkId===s),l=`${s}:${i}`,f=`${(P=this.selectedPaymentAsset)==null?void 0:P.network}:${(Q=this.selectedPaymentAsset)==null?void 0:Q.asset}`,w=l===f,g=v.bigNumber(r,{safe:!0}),$=g.gt(0);return d`
      <wui-flex
        alignItems="center"
        justifyContent="space-between"
        gap="2"
        @click=${()=>{var fe;return(fe=this.onSelect)==null?void 0:fe.call(this,e)}}
        class="pay-option-container"
      >
        <wui-flex alignItems="center" gap="2">
          <wui-flex class="token-images-container">
            <wui-image
              src=${b(n.logoURI)}
              class="token-image"
              size="3xl"
            ></wui-image>
            <wui-image
              src=${b(O.getNetworkImage(c))}
              class="chain-image"
              size="md"
            ></wui-image>
          </wui-flex>

          <wui-flex flexDirection="column" gap="1">
            <wui-text variant="lg-regular" color="primary">${n.symbol}</wui-text>
            ${$?d`<wui-text variant="sm-regular" color="secondary">
                  ${g.round(6).toString()} ${n.symbol}
                </wui-text>`:null}
          </wui-flex>
        </wui-flex>

        ${w?d`<wui-icon name="checkmark" size="md" color="success"></wui-icon>`:null}
      </wui-flex>
    `}handleOptionsListScroll(){var n;const e=(n=this.shadowRoot)==null?void 0:n.querySelector(".pay-options-container");if(!e)return;e.scrollHeight>Ws?(e.style.setProperty("--options-mask-image",`linear-gradient(
          to bottom,
          rgba(0, 0, 0, calc(1 - var(--options-scroll--top-opacity))) 0px,
          rgba(200, 200, 200, calc(1 - var(--options-scroll--top-opacity))) 1px,
          black 50px,
          black calc(100% - 50px),
          rgba(155, 155, 155, calc(1 - var(--options-scroll--bottom-opacity))) calc(100% - 1px),
          rgba(0, 0, 0, calc(1 - var(--options-scroll--bottom-opacity))) 100%
        )`),e.style.setProperty("--options-scroll--top-opacity",Ve.interpolate([0,50],[0,1],e.scrollTop).toString()),e.style.setProperty("--options-scroll--bottom-opacity",Ve.interpolate([0,50],[0,1],e.scrollHeight-e.scrollTop-e.offsetHeight).toString())):(e.style.setProperty("--options-mask-image","none"),e.style.setProperty("--options-scroll--top-opacity","0"),e.style.setProperty("--options-scroll--bottom-opacity","0"))}};se.styles=[js];$e([me({type:Array})],se.prototype,"options",void 0);$e([me()],se.prototype,"selectedPaymentAsset",void 0);$e([me()],se.prototype,"onSelect",void 0);se=$e([D("w3m-pay-options")],se);const zs=F`
  .payment-methods-container {
    background-color: ${({tokens:t})=>t.theme.foregroundPrimary};
    border-top-right-radius: ${({borderRadius:t})=>t[5]};
    border-top-left-radius: ${({borderRadius:t})=>t[5]};
  }

  .pay-options-container {
    background-color: ${({tokens:t})=>t.theme.foregroundSecondary};
    border-radius: ${({borderRadius:t})=>t[5]};
    padding: ${({spacing:t})=>t[1]};
  }

  w3m-tooltip-trigger {
    display: flex;
    align-items: center;
    justify-content: center;
    max-width: fit-content;
  }

  wui-image {
    border-radius: ${({borderRadius:t})=>t.round};
  }

  w3m-pay-options.disabled {
    opacity: 0.5;
    pointer-events: none;
  }
`;var _=function(t,e,s,n){var i=arguments.length,r=i<3?e:n===null?n=Object.getOwnPropertyDescriptor(e,s):n,o;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")r=Reflect.decorate(t,e,s,n);else for(var c=t.length-1;c>=0;c--)(o=t[c])&&(r=(i<3?o(r):i>3?o(e,s,r):o(e,s))||r);return i>3&&r&&Object.defineProperty(e,s,r),r};const ge={eip155:"ethereum",solana:"solana",bip122:"bitcoin",ton:"ton"},Hs={eip155:{icon:ge.eip155,label:"EVM"},solana:{icon:ge.solana,label:"Solana"},bip122:{icon:ge.bip122,label:"Bitcoin"},ton:{icon:ge.ton,label:"Ton"}};let A=class extends I{constructor(){super(),this.unsubscribe=[],this.profileName=null,this.paymentAsset=u.state.paymentAsset,this.namespace=void 0,this.caipAddress=void 0,this.amount=u.state.amount,this.recipient=u.state.recipient,this.activeConnectorIds=k.state.activeConnectorIds,this.selectedPaymentAsset=u.state.selectedPaymentAsset,this.selectedExchange=u.state.selectedExchange,this.isFetchingQuote=u.state.isFetchingQuote,this.quoteError=u.state.quoteError,this.quote=u.state.quote,this.isFetchingTokenBalances=u.state.isFetchingTokenBalances,this.tokenBalances=u.state.tokenBalances,this.isPaymentInProgress=u.state.isPaymentInProgress,this.exchangeUrlForQuote=u.state.exchangeUrlForQuote,this.completedTransactionsCount=0,this.unsubscribe.push(u.subscribeKey("paymentAsset",e=>this.paymentAsset=e)),this.unsubscribe.push(u.subscribeKey("tokenBalances",e=>this.onTokenBalancesChanged(e))),this.unsubscribe.push(u.subscribeKey("isFetchingTokenBalances",e=>this.isFetchingTokenBalances=e)),this.unsubscribe.push(k.subscribeKey("activeConnectorIds",e=>this.activeConnectorIds=e)),this.unsubscribe.push(u.subscribeKey("selectedPaymentAsset",e=>this.selectedPaymentAsset=e)),this.unsubscribe.push(u.subscribeKey("isFetchingQuote",e=>this.isFetchingQuote=e)),this.unsubscribe.push(u.subscribeKey("quoteError",e=>this.quoteError=e)),this.unsubscribe.push(u.subscribeKey("quote",e=>this.quote=e)),this.unsubscribe.push(u.subscribeKey("amount",e=>this.amount=e)),this.unsubscribe.push(u.subscribeKey("recipient",e=>this.recipient=e)),this.unsubscribe.push(u.subscribeKey("isPaymentInProgress",e=>this.isPaymentInProgress=e)),this.unsubscribe.push(u.subscribeKey("selectedExchange",e=>this.selectedExchange=e)),this.unsubscribe.push(u.subscribeKey("exchangeUrlForQuote",e=>this.exchangeUrlForQuote=e)),this.resetQuoteState(),this.initializeNamespace(),this.fetchTokens()}disconnectedCallback(){super.disconnectedCallback(),this.resetAssetsState(),this.unsubscribe.forEach(e=>e())}updated(e){super.updated(e),e.has("selectedPaymentAsset")&&this.fetchQuote()}render(){return d`
      <wui-flex flexDirection="column">
        ${this.profileTemplate()}

        <wui-flex
          flexDirection="column"
          gap="4"
          class="payment-methods-container"
          .padding=${["4","4","5","4"]}
        >
          ${this.paymentOptionsViewTemplate()} ${this.amountWithFeeTemplate()}

          <wui-flex
            alignItems="center"
            justifyContent="space-between"
            .padding=${["1","0","1","0"]}
          >
            <wui-separator></wui-separator>
          </wui-flex>

          ${this.paymentActionsTemplate()}
        </wui-flex>
      </wui-flex>
    `}profileTemplate(){var o,c;if(this.selectedExchange){const l=v.formatNumber((o=this.quote)==null?void 0:o.origin.amount,{decimals:((c=this.quote)==null?void 0:c.origin.currency.metadata.decimals)??0}).toString();return d`
        <wui-flex
          .padding=${["4","3","4","3"]}
          alignItems="center"
          justifyContent="space-between"
          gap="2"
        >
          <wui-text variant="lg-regular" color="secondary">Paying with</wui-text>

          ${this.quote?d`<wui-text variant="lg-regular" color="primary">
                ${v.bigNumber(l,{safe:!0}).round(6).toString()}
                ${this.quote.origin.currency.metadata.symbol}
              </wui-text>`:d`<wui-shimmer width="80px" height="18px" variant="light"></wui-shimmer>`}
        </wui-flex>
      `}const e=B.getPlainAddress(this.caipAddress)??"",{name:s,image:n}=this.getWalletProperties({namespace:this.namespace}),{icon:i,label:r}=Hs[this.namespace]??{};return d`
      <wui-flex
        .padding=${["4","3","4","3"]}
        alignItems="center"
        justifyContent="space-between"
        gap="2"
      >
        <wui-wallet-switch
          profileName=${b(this.profileName)}
          address=${b(e)}
          imageSrc=${b(n)}
          alt=${b(s)}
          @click=${this.onConnectOtherWallet.bind(this)}
          data-testid="wui-wallet-switch"
        ></wui-wallet-switch>

        <wui-wallet-switch
          profileName=${b(r)}
          address=${b(e)}
          icon=${b(i)}
          iconSize="xs"
          .enableGreenCircle=${!1}
          alt=${b(r)}
          @click=${this.onConnectOtherWallet.bind(this)}
          data-testid="wui-wallet-switch"
        ></wui-wallet-switch>
      </wui-flex>
    `}initializeNamespace(){var s,n;const e=y.state.activeChain;this.namespace=e,this.caipAddress=(s=y.getAccountData(e))==null?void 0:s.caipAddress,this.profileName=((n=y.getAccountData(e))==null?void 0:n.profileName)??null,this.unsubscribe.push(y.subscribeChainProp("accountState",i=>this.onAccountStateChanged(i),e))}async fetchTokens(){if(this.namespace){let e;if(this.caipAddress){const{chainId:s,chainNamespace:n}=x.parseCaipAddress(this.caipAddress),i=`${n}:${s}`;e=y.getAllRequestedCaipNetworks().find(o=>o.caipNetworkId===i)}await u.fetchTokens({caipAddress:this.caipAddress,caipNetwork:e,namespace:this.namespace})}}fetchQuote(){if(this.amount&&this.recipient&&this.selectedPaymentAsset&&this.paymentAsset){const{address:e}=this.caipAddress?x.parseCaipAddress(this.caipAddress):{};u.fetchQuote({amount:this.amount.toString(),address:e,sourceToken:this.selectedPaymentAsset,toToken:this.paymentAsset,recipient:this.recipient})}}getWalletProperties({namespace:e}){if(!e)return{name:void 0,image:void 0};const s=this.activeConnectorIds[e];if(!s)return{name:void 0,image:void 0};const n=k.getConnector({id:s,namespace:e});if(!n)return{name:void 0,image:void 0};const i=O.getConnectorImage(n);return{name:n.name,image:i}}paymentOptionsViewTemplate(){return d`
      <wui-flex flexDirection="column" gap="2">
        <wui-text variant="sm-regular" color="secondary">CHOOSE PAYMENT OPTION</wui-text>
        <wui-flex class="pay-options-container">${this.paymentOptionsTemplate()}</wui-flex>
      </wui-flex>
    `}paymentOptionsTemplate(){const e=this.getPaymentAssetFromTokenBalances();if(this.isFetchingTokenBalances)return d`<w3m-pay-options-skeleton></w3m-pay-options-skeleton>`;if(e.length===0)return d`<w3m-pay-options-empty
        @connectOtherWallet=${this.onConnectOtherWallet.bind(this)}
      ></w3m-pay-options-empty>`;const s={disabled:this.isFetchingQuote};return d`<w3m-pay-options
      class=${bt(s)}
      .options=${e}
      .selectedPaymentAsset=${b(this.selectedPaymentAsset)}
      .onSelect=${this.onSelectedPaymentAssetChanged.bind(this)}
    ></w3m-pay-options>`}amountWithFeeTemplate(){return this.isFetchingQuote||!this.selectedPaymentAsset||this.quoteError?d`<w3m-pay-fees-skeleton></w3m-pay-fees-skeleton>`:d`<w3m-pay-fees></w3m-pay-fees>`}paymentActionsTemplate(){var i,r,o;const e=this.isFetchingQuote||this.isFetchingTokenBalances,s=this.isFetchingQuote||this.isFetchingTokenBalances||!this.selectedPaymentAsset||!!this.quoteError,n=v.formatNumber(((i=this.quote)==null?void 0:i.origin.amount)??0,{decimals:((r=this.quote)==null?void 0:r.origin.currency.metadata.decimals)??0}).toString();return this.selectedExchange?e||s?d`
          <wui-shimmer width="100%" height="48px" variant="light" ?rounded=${!0}></wui-shimmer>
        `:d`<wui-button
        size="lg"
        fullWidth
        variant="accent-secondary"
        @click=${this.onPayWithExchange.bind(this)}
      >
        ${`Continue in ${this.selectedExchange.name}`}

        <wui-icon name="arrowRight" color="inherit" size="sm" slot="iconRight"></wui-icon>
      </wui-button>`:d`
      <wui-flex alignItems="center" justifyContent="space-between">
        <wui-flex flexDirection="column" gap="1">
          <wui-text variant="md-regular" color="secondary">Order Total</wui-text>

          ${e||s?d`<wui-shimmer width="58px" height="32px" variant="light"></wui-shimmer>`:d`<wui-flex alignItems="center" gap="01">
                <wui-text variant="h4-regular" color="primary">${Ae(n)}</wui-text>

                <wui-text variant="lg-regular" color="secondary">
                  ${((o=this.quote)==null?void 0:o.origin.currency.metadata.symbol)||"Unknown"}
                </wui-text>
              </wui-flex>`}
        </wui-flex>

        ${this.actionButtonTemplate({isLoading:e,isDisabled:s})}
      </wui-flex>
    `}actionButtonTemplate(e){const s=Pe(this.quote),{isLoading:n,isDisabled:i}=e;let r="Pay";return s.length>1&&this.completedTransactionsCount===0&&(r="Approve"),d`
      <wui-button
        size="lg"
        variant="accent-primary"
        ?loading=${n||this.isPaymentInProgress}
        ?disabled=${i||this.isPaymentInProgress}
        @click=${()=>{s.length>0?this.onSendTransactions():this.onTransfer()}}
      >
        ${r}
        ${n?null:d`<wui-icon
              name="arrowRight"
              color="inherit"
              size="sm"
              slot="iconRight"
            ></wui-icon>`}
      </wui-button>
    `}getPaymentAssetFromTokenBalances(){return this.namespace?(this.tokenBalances[this.namespace]??[]).map(i=>{try{return ws(i)}catch{return null}}).filter(i=>!!i).filter(i=>{const{chainId:r}=x.parseCaipNetworkId(i.network),{chainId:o}=x.parseCaipNetworkId(this.paymentAsset.network);return C.isLowerCaseMatch(i.asset,this.paymentAsset.asset)?!0:this.selectedExchange?!C.isLowerCaseMatch(r.toString(),o.toString()):!0}):[]}onTokenBalancesChanged(e){this.tokenBalances=e;const[s]=this.getPaymentAssetFromTokenBalances();s&&u.setSelectedPaymentAsset(s)}async onConnectOtherWallet(){await k.connect(),await le.open({view:"PayQuote"})}onAccountStateChanged(e){const{address:s}=this.caipAddress?x.parseCaipAddress(this.caipAddress):{};if(this.caipAddress=e==null?void 0:e.caipAddress,this.profileName=(e==null?void 0:e.profileName)??null,s){const{address:n}=this.caipAddress?x.parseCaipAddress(this.caipAddress):{};n?C.isLowerCaseMatch(n,s)||(this.resetAssetsState(),this.resetQuoteState(),this.fetchTokens()):le.close()}}onSelectedPaymentAssetChanged(e){this.isFetchingQuote||u.setSelectedPaymentAsset(e)}async onTransfer(){var s,n,i;const e=Oe(this.quote);if(e){if(!C.isLowerCaseMatch((s=this.selectedPaymentAsset)==null?void 0:s.asset,e.deposit.currency))throw new Error("Quote asset is not the same as the selected payment asset");const o=((n=this.selectedPaymentAsset)==null?void 0:n.amount)??"0",c=v.formatNumber(e.deposit.amount,{decimals:((i=this.selectedPaymentAsset)==null?void 0:i.metadata.decimals)??0}).toString();if(!v.bigNumber(o).gte(c)){M.showError("Insufficient funds");return}if(this.quote&&this.selectedPaymentAsset&&this.caipAddress&&this.namespace){const{address:f}=x.parseCaipAddress(this.caipAddress);await u.onTransfer({chainNamespace:this.namespace,fromAddress:f,toAddress:e.deposit.receiver,amount:c,paymentAsset:this.selectedPaymentAsset}),u.setRequestId(e.requestId),oe.push("PayLoading")}}}async onSendTransactions(){var o,c,l;const e=((o=this.selectedPaymentAsset)==null?void 0:o.amount)??"0",s=v.formatNumber(((c=this.quote)==null?void 0:c.origin.amount)??0,{decimals:((l=this.selectedPaymentAsset)==null?void 0:l.metadata.decimals)??0}).toString();if(!v.bigNumber(e).gte(s)){M.showError("Insufficient funds");return}const i=Pe(this.quote),[r]=Pe(this.quote,this.completedTransactionsCount);r&&this.namespace&&(await u.onSendTransaction({namespace:this.namespace,transactionStep:r}),this.completedTransactionsCount+=1,this.completedTransactionsCount===i.length&&(u.setRequestId(r.requestId),oe.push("PayLoading")))}onPayWithExchange(){if(this.exchangeUrlForQuote){const e=B.returnOpenHref("","popupWindow","scrollbar=yes,width=480,height=720");if(!e)throw new Error("Could not create popup window");e.location.href=this.exchangeUrlForQuote;const s=Oe(this.quote);s&&u.setRequestId(s.requestId),u.initiatePayment(),oe.push("PayLoading")}}resetAssetsState(){u.setSelectedPaymentAsset(null)}resetQuoteState(){u.resetQuoteState()}};A.styles=zs;_([m()],A.prototype,"profileName",void 0);_([m()],A.prototype,"paymentAsset",void 0);_([m()],A.prototype,"namespace",void 0);_([m()],A.prototype,"caipAddress",void 0);_([m()],A.prototype,"amount",void 0);_([m()],A.prototype,"recipient",void 0);_([m()],A.prototype,"activeConnectorIds",void 0);_([m()],A.prototype,"selectedPaymentAsset",void 0);_([m()],A.prototype,"selectedExchange",void 0);_([m()],A.prototype,"isFetchingQuote",void 0);_([m()],A.prototype,"quoteError",void 0);_([m()],A.prototype,"quote",void 0);_([m()],A.prototype,"isFetchingTokenBalances",void 0);_([m()],A.prototype,"tokenBalances",void 0);_([m()],A.prototype,"isPaymentInProgress",void 0);_([m()],A.prototype,"exchangeUrlForQuote",void 0);_([m()],A.prototype,"completedTransactionsCount",void 0);A=_([D("w3m-pay-quote-view")],A);export{p as A,u as P,N as W,h as a,A as b,L as c};
