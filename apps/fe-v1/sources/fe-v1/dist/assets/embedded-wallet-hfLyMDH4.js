import{g as F,h as A,at as V,ag as L,j as l,u as R,T as M,aY as q,G as d,a as w,c as N,r as W,e as K,n as c,i as j,b as f,s as O,m as h,aZ as Y,k as D,l as C,W as m,C as X,a_ as Z,a$ as Q,au as J,b0 as $,o as U,b1 as I,av as ee,E as P,S as te,ae as ie,b2 as oe,R as ne}from"./index-6EqSDnc4.js";import"./charts-BWy2aCgE.js";const re=F`
  div {
    width: 100%;
  }

  [data-ready='false'] {
    transform: scale(1.05);
  }

  @media (max-width: 430px) {
    [data-ready='false'] {
      transform: translateY(-50px);
    }
  }
`;var G=function(e,t,i,n){var r=arguments.length,o=r<3?t:n===null?n=Object.getOwnPropertyDescriptor(t,i):n,a;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")o=Reflect.decorate(e,t,i,n);else for(var s=e.length-1;s>=0;s--)(a=e[s])&&(o=(r<3?a(o):r>3?a(t,i,o):a(t,i))||o);return r>3&&o&&Object.defineProperty(t,i,o),o};const k=600,B=360,ae=64;let E=class extends A{constructor(){super(),this.bodyObserver=void 0,this.unsubscribe=[],this.iframe=document.getElementById("w3m-iframe"),this.ready=!1,this.unsubscribe.push(V.subscribeKey("open",t=>{t||this.onHideIframe()}),V.subscribeKey("shake",t=>{t?this.iframe.style.animation="w3m-shake 500ms var(--apkt-easings-ease-out-power-2)":this.iframe.style.animation="none"}))}disconnectedCallback(){var t;this.onHideIframe(),this.unsubscribe.forEach(i=>i()),(t=this.bodyObserver)==null||t.unobserve(window.document.body)}async firstUpdated(){var i;await this.syncTheme(),this.iframe.style.display="block";const t=(i=this==null?void 0:this.renderRoot)==null?void 0:i.querySelector("div");this.bodyObserver=new ResizeObserver(n=>{var a,s;const r=(a=n==null?void 0:n[0])==null?void 0:a.contentBoxSize,o=(s=r==null?void 0:r[0])==null?void 0:s.inlineSize;this.iframe.style.height=`${k}px`,t.style.height=`${k}px`,L.state.enableEmbedded?this.updateFrameSizeForEmbeddedMode():o&&o<=430?(this.iframe.style.width="100%",this.iframe.style.left="0px",this.iframe.style.bottom="0px",this.iframe.style.top="unset",this.onShowIframe()):(this.iframe.style.width=`${B}px`,this.iframe.style.left=`calc(50% - ${B/2}px)`,this.iframe.style.top=`calc(50% - ${k/2}px + ${ae/2}px)`,this.iframe.style.bottom="unset",this.onShowIframe())}),this.bodyObserver.observe(window.document.body)}render(){return l`<div data-ready=${this.ready} id="w3m-frame-container"></div>`}onShowIframe(){const t=window.innerWidth<=430;this.ready=!0,this.iframe.style.animation=t?"w3m-iframe-zoom-in-mobile 200ms var(--apkt-easings-ease-out-power-2)":"w3m-iframe-zoom-in 200ms var(--apkt-easings-ease-out-power-2)"}onHideIframe(){this.iframe.style.display="none",this.iframe.style.animation="w3m-iframe-fade-out 200ms var(--apkt-easings-ease-out-power-2)"}async syncTheme(){const t=R.getAuthConnector();if(t){const i=M.getSnapshot().themeMode,n=M.getSnapshot().themeVariables;await t.provider.syncTheme({themeVariables:n,w3mThemeVariables:q(n,i)})}}async updateFrameSizeForEmbeddedMode(){var n;const t=(n=this==null?void 0:this.renderRoot)==null?void 0:n.querySelector("div");await new Promise(r=>{setTimeout(r,300)});const i=this.getBoundingClientRect();t.style.width="100%",this.iframe.style.left=`${i.left}px`,this.iframe.style.top=`${i.top}px`,this.iframe.style.width=`${i.width}px`,this.iframe.style.height=`${i.height}px`,this.onShowIframe()}};E.styles=re;G([d()],E.prototype,"ready",void 0);E=G([w("w3m-approve-transaction-view")],E);const se=N`
  a {
    border: none;
    border-radius: ${({borderRadius:e})=>e[20]};
    display: flex;
    flex-direction: row;
    align-items: center;
    padding: ${({spacing:e})=>e[1]};
    transition:
      background-color ${({durations:e})=>e.lg}
        ${({easings:e})=>e["ease-out-power-2"]},
      box-shadow ${({durations:e})=>e.lg}
        ${({easings:e})=>e["ease-out-power-2"]},
      border ${({durations:e})=>e.lg} ${({easings:e})=>e["ease-out-power-2"]};
    will-change: background-color, box-shadow, border;
  }

  /* -- Variants --------------------------------------------------------------- */
  a[data-type='success'] {
    background-color: ${({tokens:e})=>e.core.backgroundSuccess};
    color: ${({tokens:e})=>e.core.textSuccess};
  }

  a[data-type='error'] {
    background-color: ${({tokens:e})=>e.core.backgroundError};
    color: ${({tokens:e})=>e.core.textError};
  }

  a[data-type='warning'] {
    background-color: ${({tokens:e})=>e.core.backgroundWarning};
    color: ${({tokens:e})=>e.core.textWarning};
  }

  /* -- Sizes --------------------------------------------------------------- */
  a[data-size='sm'] {
    height: 24px;
  }

  a[data-size='md'] {
    height: 28px;
  }

  a[data-size='lg'] {
    height: 32px;
  }

  a[data-size='sm'] > wui-image,
  a[data-size='sm'] > wui-icon {
    width: 16px;
    height: 16px;
  }

  a[data-size='md'] > wui-image,
  a[data-size='md'] > wui-icon {
    width: 20px;
    height: 20px;
  }

  a[data-size='lg'] > wui-image,
  a[data-size='lg'] > wui-icon {
    width: 24px;
    height: 24px;
  }

  wui-text {
    padding-left: ${({spacing:e})=>e[1]};
    padding-right: ${({spacing:e})=>e[1]};
  }

  wui-image {
    border-radius: ${({borderRadius:e})=>e[3]};
    overflow: hidden;
    user-drag: none;
    user-select: none;
    -moz-user-select: none;
    -webkit-user-drag: none;
    -webkit-user-select: none;
    -ms-user-select: none;
  }

  /* -- States --------------------------------------------------------------- */
  @media (hover: hover) and (pointer: fine) {
    a[data-type='success']:not(:disabled):hover {
      background-color: ${({tokens:e})=>e.theme.foregroundPrimary};
      box-shadow: 0px 0px 0px 1px ${({tokens:e})=>e.core.borderSuccess};
    }

    a[data-type='error']:not(:disabled):hover {
      background-color: ${({tokens:e})=>e.theme.foregroundPrimary};
      box-shadow: 0px 0px 0px 1px ${({tokens:e})=>e.core.borderError};
    }

    a[data-type='warning']:not(:disabled):hover {
      background-color: ${({tokens:e})=>e.theme.foregroundPrimary};
      box-shadow: 0px 0px 0px 1px ${({tokens:e})=>e.core.borderWarning};
    }
  }

  a[data-type='success']:not(:disabled):focus-visible {
    box-shadow:
      0px 0px 0px 1px ${({tokens:e})=>e.core.backgroundAccentPrimary},
      0px 0px 0px 4px ${({tokens:e})=>e.core.foregroundAccent020};
  }

  a[data-type='error']:not(:disabled):focus-visible {
    box-shadow:
      0px 0px 0px 1px ${({tokens:e})=>e.core.backgroundAccentPrimary},
      0px 0px 0px 4px ${({tokens:e})=>e.core.foregroundAccent020};
  }

  a[data-type='warning']:not(:disabled):focus-visible {
    box-shadow:
      0px 0px 0px 1px ${({tokens:e})=>e.core.backgroundAccentPrimary},
      0px 0px 0px 4px ${({tokens:e})=>e.core.foregroundAccent020};
  }

  a:disabled {
    opacity: 0.5;
  }
`;var y=function(e,t,i,n){var r=arguments.length,o=r<3?t:n===null?n=Object.getOwnPropertyDescriptor(t,i):n,a;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")o=Reflect.decorate(e,t,i,n);else for(var s=e.length-1;s>=0;s--)(a=e[s])&&(o=(r<3?a(o):r>3?a(t,i,o):a(t,i))||o);return r>3&&o&&Object.defineProperty(t,i,o),o};const ce={sm:"md-regular",md:"lg-regular",lg:"lg-regular"},le={success:"sealCheck",error:"warning",warning:"exclamationCircle"};let u=class extends j{constructor(){super(...arguments),this.type="success",this.size="md",this.imageSrc=void 0,this.disabled=!1,this.href="",this.text=void 0}render(){return f`
      <a
        rel="noreferrer"
        target="_blank"
        href=${this.href}
        class=${this.disabled?"disabled":""}
        data-type=${this.type}
        data-size=${this.size}
      >
        ${this.imageTemplate()}
        <wui-text variant=${ce[this.size]} color="inherit">${this.text}</wui-text>
      </a>
    `}imageTemplate(){return this.imageSrc?f`<wui-image src=${this.imageSrc} size="inherit"></wui-image>`:f`<wui-icon
      name=${le[this.type]}
      weight="fill"
      color="inherit"
      size="inherit"
      class="image-icon"
    ></wui-icon>`}};u.styles=[W,K,se];y([c()],u.prototype,"type",void 0);y([c()],u.prototype,"size",void 0);y([c()],u.prototype,"imageSrc",void 0);y([c({type:Boolean})],u.prototype,"disabled",void 0);y([c()],u.prototype,"href",void 0);y([c()],u.prototype,"text",void 0);u=y([w("wui-semantic-chip")],u);var de=function(e,t,i,n){var r=arguments.length,o=r<3?t:n===null?n=Object.getOwnPropertyDescriptor(t,i):n,a;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")o=Reflect.decorate(e,t,i,n);else for(var s=e.length-1;s>=0;s--)(a=e[s])&&(o=(r<3?a(o):r>3?a(t,i,o):a(t,i))||o);return r>3&&o&&Object.defineProperty(t,i,o),o};let H=class extends A{render(){return l`
      <wui-flex flexDirection="column" alignItems="center" gap="5" padding="5">
        <wui-text variant="md-regular" color="primary">Follow the instructions on</wui-text>
        <wui-semantic-chip
          icon="externalLink"
          variant="fill"
          text=${O.SECURE_SITE_DASHBOARD}
          href=${O.SECURE_SITE_DASHBOARD}
          imageSrc=${O.SECURE_SITE_FAVICON}
          data-testid="w3m-secure-website-button"
        >
        </wui-semantic-chip>
        <wui-text variant="sm-regular" color="secondary">
          You will have to reconnect for security reasons
        </wui-text>
      </wui-flex>
    `}};H=de([w("w3m-upgrade-wallet-view")],H);var T=function(e,t,i,n){var r=arguments.length,o=r<3?t:n===null?n=Object.getOwnPropertyDescriptor(t,i):n,a;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")o=Reflect.decorate(e,t,i,n);else for(var s=e.length-1;s>=0;s--)(a=e[s])&&(o=(r<3?a(o):r>3?a(t,i,o):a(t,i))||o);return r>3&&o&&Object.defineProperty(t,i,o),o};let v=class extends A{constructor(){super(...arguments),this.loading=!1,this.switched=!1,this.text="",this.network=h.state.activeCaipNetwork}render(){return l`
      <wui-flex flexDirection="column" gap="2" .padding=${["6","4","3","4"]}>
        ${this.togglePreferredAccountTypeTemplate()} ${this.toggleSmartAccountVersionTemplate()}
      </wui-flex>
    `}toggleSmartAccountVersionTemplate(){return l`
      <w3m-tooltip-trigger text="Changing the smart account version will reload the page">
        <wui-list-item
          icon=${this.isV6()?"arrowTop":"arrowBottom"}
          ?rounded=${!0}
          ?chevron=${!0}
          data-testid="account-toggle-smart-account-version"
          @click=${this.toggleSmartAccountVersion.bind(this)}
        >
          <wui-text variant="lg-regular" color="primary"
            >Force Smart Account Version ${this.isV6()?"7":"6"}</wui-text
          >
        </wui-list-item>
      </w3m-tooltip-trigger>
    `}isV6(){return(Y.get("dapp_smart_account_version")||"v6")==="v6"}toggleSmartAccountVersion(){var t;Y.set("dapp_smart_account_version",this.isV6()?"v7":"v6"),typeof window<"u"&&((t=window==null?void 0:window.location)==null||t.reload())}togglePreferredAccountTypeTemplate(){var o;const t=(o=this.network)==null?void 0:o.chainNamespace,i=h.checkIfSmartAccountEnabled(),n=R.getConnectorId(t);return!R.getAuthConnector()||n!==D.CONNECTOR_ID.AUTH||!i?null:(this.switched||(this.text=C(t)===m.ACCOUNT_TYPES.SMART_ACCOUNT?"Switch to your EOA":"Switch to your Smart Account"),l`
      <wui-list-item
        icon="swapHorizontal"
        ?rounded=${!0}
        ?chevron=${!0}
        ?loading=${this.loading}
        @click=${this.changePreferredAccountType.bind(this)}
        data-testid="account-toggle-preferred-account-type"
      >
        <wui-text variant="lg-regular" color="primary">${this.text}</wui-text>
      </wui-list-item>
    `)}async changePreferredAccountType(){var o;const t=(o=this.network)==null?void 0:o.chainNamespace,i=h.checkIfSmartAccountEnabled(),n=C(t)===m.ACCOUNT_TYPES.SMART_ACCOUNT||!i?m.ACCOUNT_TYPES.EOA:m.ACCOUNT_TYPES.SMART_ACCOUNT;R.getAuthConnector()&&(this.loading=!0,await X.setPreferredAccountType(n,t),this.text=n===m.ACCOUNT_TYPES.SMART_ACCOUNT?"Switch to your EOA":"Switch to your Smart Account",this.switched=!0,Z.resetSend(),this.loading=!1,this.requestUpdate())}};T([d()],v.prototype,"loading",void 0);T([d()],v.prototype,"switched",void 0);T([d()],v.prototype,"text",void 0);T([d()],v.prototype,"network",void 0);v=T([w("w3m-smart-account-settings-view")],v);const ue=N`
  :host {
    width: 100%;
  }

  button {
    width: 100%;
    display: flex;
    justify-content: space-between;
    align-items: center;
    background-color: ${({tokens:e})=>e.theme.foregroundPrimary};
    border-radius: ${({borderRadius:e})=>e[4]};
    padding: ${({spacing:e})=>e[4]};
  }

  .name {
    max-width: 75%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  @media (hover: hover) and (pointer: fine) {
    button:hover:enabled {
      cursor: pointer;
      background-color: ${({tokens:e})=>e.theme.foregroundSecondary};
      border-radius: ${({borderRadius:e})=>e[6]};
    }
  }

  button:disabled {
    opacity: 0.5;
    cursor: default;
  }

  button:focus-visible:enabled {
    box-shadow: 0 0 0 4px ${({tokens:e})=>e.core.foregroundAccent040};
    background-color: ${({tokens:e})=>e.theme.foregroundSecondary};
  }
`;var _=function(e,t,i,n){var r=arguments.length,o=r<3?t:n===null?n=Object.getOwnPropertyDescriptor(t,i):n,a;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")o=Reflect.decorate(e,t,i,n);else for(var s=e.length-1;s>=0;s--)(a=e[s])&&(o=(r<3?a(o):r>3?a(t,i,o):a(t,i))||o);return r>3&&o&&Object.defineProperty(t,i,o),o};let b=class extends j{constructor(){super(...arguments),this.name="",this.registered=!1,this.loading=!1,this.disabled=!1}render(){return f`
      <button ?disabled=${this.disabled}>
        <wui-text class="name" color="primary" variant="md-regular">${this.name}</wui-text>
        ${this.templateRightContent()}
      </button>
    `}templateRightContent(){return this.loading?f`<wui-loading-spinner size="lg" color="primary"></wui-loading-spinner>`:this.registered?f`<wui-tag variant="info" size="sm">Registered</wui-tag>`:f`<wui-tag variant="success" size="sm">Available</wui-tag>`}};b.styles=[W,K,ue];_([c()],b.prototype,"name",void 0);_([c({type:Boolean})],b.prototype,"registered",void 0);_([c({type:Boolean})],b.prototype,"loading",void 0);_([c({type:Boolean})],b.prototype,"disabled",void 0);b=_([w("wui-account-name-suggestion-item")],b);const pe=N`
  :host {
    position: relative;
    width: 100%;
    display: inline-block;
  }

  :host([disabled]) {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .base-name {
    position: absolute;
    right: ${({spacing:e})=>e[4]};
    top: 50%;
    transform: translateY(-50%);
    text-align: right;
    padding: ${({spacing:e})=>e[1]};
    background-color: ${({tokens:e})=>e.theme.foregroundSecondary};
    border-radius: ${({borderRadius:e})=>e[1]};
  }
`;var S=function(e,t,i,n){var r=arguments.length,o=r<3?t:n===null?n=Object.getOwnPropertyDescriptor(t,i):n,a;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")o=Reflect.decorate(e,t,i,n);else for(var s=e.length-1;s>=0;s--)(a=e[s])&&(o=(r<3?a(o):r>3?a(t,i,o):a(t,i))||o);return r>3&&o&&Object.defineProperty(t,i,o),o};let g=class extends j{constructor(){super(...arguments),this.disabled=!1,this.loading=!1}render(){return f`
      <wui-input-text
        value=${Q(this.value)}
        ?disabled=${this.disabled}
        .value=${this.value||""}
        data-testid="wui-ens-input"
        icon="search"
        inputRightPadding="5xl"
        .onKeyDown=${this.onKeyDown}
      ></wui-input-text>
    `}};g.styles=[W,pe];S([c()],g.prototype,"errorMessage",void 0);S([c({type:Boolean})],g.prototype,"disabled",void 0);S([c()],g.prototype,"value",void 0);S([c({type:Boolean})],g.prototype,"loading",void 0);S([c({attribute:!1})],g.prototype,"onKeyDown",void 0);g=S([w("wui-ens-input")],g);const he=N`
  wui-flex {
    width: 100%;
  }

  .suggestion {
    background-color: ${({tokens:e})=>e.theme.foregroundPrimary};
    border-radius: ${({borderRadius:e})=>e[4]};
  }

  .suggestion:hover:not(:disabled) {
    cursor: pointer;
    border: none;
    width: 100%;
    display: flex;
    justify-content: space-between;
    align-items: center;
    background-color: ${({tokens:e})=>e.theme.foregroundSecondary};
    border-radius: ${({borderRadius:e})=>e[6]};
    padding: ${({spacing:e})=>e[4]};
  }

  .suggestion:disabled {
    opacity: 0.5;
    cursor: default;
  }

  .suggestion:focus-visible:not(:disabled) {
    box-shadow: 0 0 0 4px ${({tokens:e})=>e.core.foregroundAccent040};
    background-color: ${({tokens:e})=>e.theme.foregroundSecondary};
  }

  .suggested-name {
    max-width: 75%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  form {
    width: 100%;
    position: relative;
  }

  .input-submit-button,
  .input-loading-spinner {
    position: absolute;
    top: 22px;
    transform: translateY(-50%);
    right: 10px;
  }
`;var x=function(e,t,i,n){var r=arguments.length,o=r<3?t:n===null?n=Object.getOwnPropertyDescriptor(t,i):n,a;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")o=Reflect.decorate(e,t,i,n);else for(var s=e.length-1;s>=0;s--)(a=e[s])&&(o=(r<3?a(o):r>3?a(t,i,o):a(t,i))||o);return r>3&&o&&Object.defineProperty(t,i,o),o};let p=class extends A{constructor(){var t;super(),this.formRef=J(),this.usubscribe=[],this.name="",this.error="",this.loading=$.state.loading,this.suggestions=$.state.suggestions,this.profileName=(t=h.getAccountData())==null?void 0:t.profileName,this.onDebouncedNameInputChange=U.debounce(i=>{i.length<4?this.error="Name must be at least 4 characters long":I.isValidReownName(i)?(this.error="",$.getSuggestions(i)):this.error="The value is not a valid username"}),this.usubscribe.push($.subscribe(i=>{this.suggestions=i.suggestions,this.loading=i.loading}),h.subscribeChainProp("accountState",i=>{this.profileName=i==null?void 0:i.profileName,i!=null&&i.profileName&&(this.error="You already own a name")}))}firstUpdated(){var t;(t=this.formRef.value)==null||t.addEventListener("keydown",this.onEnterKey.bind(this))}disconnectedCallback(){var t;super.disconnectedCallback(),this.usubscribe.forEach(i=>i()),(t=this.formRef.value)==null||t.removeEventListener("keydown",this.onEnterKey.bind(this))}render(){return l`
      <wui-flex
        flexDirection="column"
        alignItems="center"
        gap="4"
        .padding=${["1","3","4","3"]}
      >
        <form ${ee(this.formRef)} @submit=${this.onSubmitName.bind(this)}>
          <wui-ens-input
            @inputChange=${this.onNameInputChange.bind(this)}
            .errorMessage=${this.error}
            .value=${this.name}
            .onKeyDown=${this.onKeyDown.bind(this)}
          >
          </wui-ens-input>
          ${this.submitButtonTemplate()}
          <input type="submit" hidden />
        </form>
        ${this.templateSuggestions()}
      </wui-flex>
    `}submitButtonTemplate(){const t=this.suggestions.find(n=>{var r,o;return((o=(r=n.name)==null?void 0:r.split("."))==null?void 0:o[0])===this.name&&n.registered});if(this.loading)return l`<wui-loading-spinner
        class="input-loading-spinner"
        color="secondary"
      ></wui-loading-spinner>`;const i=`${this.name}${D.WC_NAME_SUFFIX}`;return l`
      <wui-icon-link
        ?disabled=${!!t}
        class="input-submit-button"
        size="sm"
        icon="chevronRight"
        iconColor=${t?"default":"accent-primary"}
        @click=${()=>this.onSubmitName(i)}
      >
      </wui-icon-link>
    `}onNameInputChange(t){const i=I.validateReownName(t.detail||"");this.name=i,this.onDebouncedNameInputChange(i)}onKeyDown(t){t.key.length===1&&!I.isValidReownName(t.key)&&t.preventDefault()}templateSuggestions(){return!this.name||this.name.length<4||this.error?null:l`<wui-flex flexDirection="column" gap="1" alignItems="center">
      ${this.suggestions.map(t=>l`<wui-account-name-suggestion-item
            name=${t.name}
            ?registered=${t.registered}
            ?loading=${this.loading}
            ?disabled=${t.registered||this.loading}
            data-testid="account-name-suggestion"
            @click=${()=>this.onSubmitName(t.name)}
          ></wui-account-name-suggestion-item>`)}
    </wui-flex>`}isAllowedToSubmit(t){var r;const i=(r=t.split("."))==null?void 0:r[0],n=this.suggestions.find(o=>{var a,s;return((s=(a=o.name)==null?void 0:a.split("."))==null?void 0:s[0])===i&&o.registered});return!this.loading&&!this.error&&!this.profileName&&i&&$.validateName(i)&&!n}async onSubmitName(t){try{if(!this.isAllowedToSubmit(t))return;P.sendEvent({type:"track",event:"REGISTER_NAME_INITIATED",properties:{isSmartAccount:C(h.state.activeChain)===m.ACCOUNT_TYPES.SMART_ACCOUNT,ensName:t}}),await $.registerName(t),P.sendEvent({type:"track",event:"REGISTER_NAME_SUCCESS",properties:{isSmartAccount:C(h.state.activeChain)===m.ACCOUNT_TYPES.SMART_ACCOUNT,ensName:t}})}catch(i){te.showError(i.message),P.sendEvent({type:"track",event:"REGISTER_NAME_ERROR",properties:{isSmartAccount:C(h.state.activeChain)===m.ACCOUNT_TYPES.SMART_ACCOUNT,ensName:t,error:U.parseError(i)}})}}onEnterKey(t){if(t.key==="Enter"&&this.name&&this.isAllowedToSubmit(this.name)){const i=`${this.name}${D.WC_NAME_SUFFIX}`;this.onSubmitName(i)}}};p.styles=he;x([ie()],p.prototype,"errorMessage",void 0);x([d()],p.prototype,"name",void 0);x([d()],p.prototype,"error",void 0);x([d()],p.prototype,"loading",void 0);x([d()],p.prototype,"suggestions",void 0);x([d()],p.prototype,"profileName",void 0);p=x([w("w3m-register-account-name-view")],p);const me=F`
  .continue-button-container {
    width: 100%;
  }
`;var fe=function(e,t,i,n){var r=arguments.length,o=r<3?t:n===null?n=Object.getOwnPropertyDescriptor(t,i):n,a;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")o=Reflect.decorate(e,t,i,n);else for(var s=e.length-1;s>=0;s--)(a=e[s])&&(o=(r<3?a(o):r>3?a(t,i,o):a(t,i))||o);return r>3&&o&&Object.defineProperty(t,i,o),o};let z=class extends A{render(){return l`
      <wui-flex
        flexDirection="column"
        alignItems="center"
        gap="6"
        .padding=${["0","0","4","0"]}
      >
        ${this.onboardingTemplate()} ${this.buttonsTemplate()}
        <wui-link
          @click=${()=>{U.openHref(oe.URLS.FAQ,"_blank")}}
        >
          Learn more
          <wui-icon color="inherit" slot="iconRight" name="externalLink"></wui-icon>
        </wui-link>
      </wui-flex>
    `}onboardingTemplate(){return l` <wui-flex
      flexDirection="column"
      gap="6"
      alignItems="center"
      .padding=${["0","6","0","6"]}
    >
      <wui-flex gap="3" alignItems="center" justifyContent="center">
        <wui-icon-box size="xl" color="success" icon="checkmark"></wui-icon-box>
      </wui-flex>
      <wui-flex flexDirection="column" alignItems="center" gap="3">
        <wui-text align="center" variant="md-medium" color="primary">
          Account name chosen successfully
        </wui-text>
        <wui-text align="center" variant="md-regular" color="primary">
          You can now fund your account and trade crypto
        </wui-text>
      </wui-flex>
    </wui-flex>`}buttonsTemplate(){return l`<wui-flex
      .padding=${["0","4","0","4"]}
      gap="3"
      class="continue-button-container"
    >
      <wui-button fullWidth size="lg" borderRadius="xs" @click=${this.redirectToAccount.bind(this)}
        >Let's Go!
      </wui-button>
    </wui-flex>`}redirectToAccount(){ne.replace("Account")}};z.styles=me;z=fe([w("w3m-register-account-name-success-view")],z);export{E as W3mApproveTransactionView,z as W3mRegisterAccountNameSuccess,p as W3mRegisterAccountNameView,v as W3mSmartAccountSettingsView,H as W3mUpgradeWalletView};
