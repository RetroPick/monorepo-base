import{c as g,ae as y,G as c,a as x,h as T,au as H,o as O,m as w,C as V,a_ as l,j as u,av as L,R as d,N as M,U as P,at as Y,S as v,s as ee,q as te,D as G,r as J,e as Q,n as E,i as X,b as k,F as ie,b6 as q,b7 as K,E as ne}from"./index-6EqSDnc4.js";import"./index-BFp24nj-.js";import"./index-BerD8_rG.js";import{S as Z}from"./SwapController-D1J6viSh.js";import"./charts-BWy2aCgE.js";const re=g`
  :host {
    width: 100%;
    height: 100px;
    border-radius: ${({borderRadius:e})=>e[5]};
    border: 1px solid ${({tokens:e})=>e.theme.foregroundPrimary};
    background-color: ${({tokens:e})=>e.theme.foregroundPrimary};
    transition: background-color ${({durations:e})=>e.lg}
      ${({easings:e})=>e["ease-out-power-1"]};
    will-change: background-color;
    position: relative;
  }

  :host(:hover) {
    background-color: ${({tokens:e})=>e.theme.foregroundSecondary};
  }

  wui-flex {
    width: 100%;
    height: fit-content;
  }

  wui-button {
    display: ruby;
    color: ${({tokens:e})=>e.theme.textPrimary};
    margin: 0 ${({spacing:e})=>e[2]};
  }

  .instruction {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    z-index: 2;
  }

  .paste {
    display: inline-flex;
  }

  textarea {
    background: transparent;
    width: 100%;
    font-family: ${({fontFamily:e})=>e.regular};
    font-style: normal;
    font-size: ${({textSize:e})=>e.large};
    font-weight: ${({fontWeight:e})=>e.regular};
    line-height: ${({typography:e})=>e["lg-regular"].lineHeight};
    letter-spacing: ${({typography:e})=>e["lg-regular"].letterSpacing};
    color: ${({tokens:e})=>e.theme.textPrimary};
    caret-color: ${({tokens:e})=>e.core.backgroundAccentPrimary};
    box-sizing: border-box;
    -webkit-appearance: none;
    -moz-appearance: textfield;
    padding: 0px;
    border: none;
    outline: none;
    appearance: none;
    resize: none;
    overflow: hidden;
  }
`;var I=function(e,t,i,r){var o=arguments.length,n=o<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,i):r,s;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")n=Reflect.decorate(e,t,i,r);else for(var a=e.length-1;a>=0;a--)(s=e[a])&&(n=(o<3?s(n):o>3?s(t,i,n):s(t,i))||n);return o>3&&n&&Object.defineProperty(t,i,n),n};let $=class extends T{constructor(){super(...arguments),this.inputElementRef=H(),this.instructionElementRef=H(),this.readOnly=!1,this.instructionHidden=!!this.value,this.pasting=!1,this.onDebouncedSearch=O.debounce(async t=>{if(!t.length){this.setReceiverAddress("");return}const i=w.state.activeChain;if(O.isAddress(t,i)){this.setReceiverAddress(t);return}try{const o=await V.getEnsAddress(t);if(o){l.setReceiverProfileName(t),l.setReceiverAddress(o);const n=await V.getEnsAvatar(t);l.setReceiverProfileImageUrl(n||void 0)}}catch{this.setReceiverAddress(t)}finally{l.setLoading(!1)}})}firstUpdated(){this.value&&(this.instructionHidden=!0),this.checkHidden()}render(){return this.readOnly?u` <wui-flex
        flexDirection="column"
        justifyContent="center"
        gap="01"
        .padding=${["8","4","5","4"]}
      >
        <textarea
          spellcheck="false"
          ?disabled=${!0}
          autocomplete="off"
          .value=${this.value??""}
        >
           ${this.value??""}</textarea
        >
      </wui-flex>`:u` <wui-flex
      @click=${this.onBoxClick.bind(this)}
      flexDirection="column"
      justifyContent="center"
      gap="01"
      .padding=${["8","4","5","4"]}
    >
      <wui-text
        ${L(this.instructionElementRef)}
        class="instruction"
        color="secondary"
        variant="md-medium"
      >
        Type or
        <wui-button
          class="paste"
          size="md"
          variant="neutral-secondary"
          iconLeft="copy"
          @click=${this.onPasteClick.bind(this)}
        >
          <wui-icon size="sm" color="inherit" slot="iconLeft" name="copy"></wui-icon>
          Paste
        </wui-button>
        address
      </wui-text>
      <textarea
        spellcheck="false"
        ?disabled=${!this.instructionHidden}
        ${L(this.inputElementRef)}
        @input=${this.onInputChange.bind(this)}
        @blur=${this.onBlur.bind(this)}
        .value=${this.value??""}
        autocomplete="off"
      >
${this.value??""}</textarea
      >
    </wui-flex>`}async focusInput(){var t;this.instructionElementRef.value&&(this.instructionHidden=!0,await this.toggleInstructionFocus(!1),this.instructionElementRef.value.style.pointerEvents="none",(t=this.inputElementRef.value)==null||t.focus(),this.inputElementRef.value&&(this.inputElementRef.value.selectionStart=this.inputElementRef.value.selectionEnd=this.inputElementRef.value.value.length))}async focusInstruction(){var t;this.instructionElementRef.value&&(this.instructionHidden=!1,await this.toggleInstructionFocus(!0),this.instructionElementRef.value.style.pointerEvents="auto",(t=this.inputElementRef.value)==null||t.blur())}async toggleInstructionFocus(t){this.instructionElementRef.value&&await this.instructionElementRef.value.animate([{opacity:t?0:1},{opacity:t?1:0}],{duration:100,easing:"ease",fill:"forwards"}).finished}onBoxClick(){!this.value&&!this.instructionHidden&&this.focusInput()}onBlur(){!this.value&&this.instructionHidden&&!this.pasting&&this.focusInstruction()}checkHidden(){this.instructionHidden&&this.focusInput()}async onPasteClick(){this.pasting=!0;const t=await navigator.clipboard.readText();l.setReceiverAddress(t),this.focusInput()}onInputChange(t){var r;const i=t.target;this.pasting=!1,this.value=(r=t.target)==null?void 0:r.value,i.value&&!this.instructionHidden&&this.focusInput(),l.setLoading(!0),this.onDebouncedSearch(i.value)}setReceiverAddress(t){l.setReceiverAddress(t),l.setReceiverProfileName(void 0),l.setReceiverProfileImageUrl(void 0),l.setLoading(!1)}};$.styles=re;I([y()],$.prototype,"value",void 0);I([y({type:Boolean})],$.prototype,"readOnly",void 0);I([c()],$.prototype,"instructionHidden",void 0);I([c()],$.prototype,"pasting",void 0);$=I([x("w3m-input-address")],$);const oe=g`
  :host {
    width: 100%;
    height: 100px;
    border-radius: ${({borderRadius:e})=>e[5]};
    border: 1px solid ${({tokens:e})=>e.theme.foregroundPrimary};
    background-color: ${({tokens:e})=>e.theme.foregroundPrimary};
    transition: background-color ${({durations:e})=>e.lg}
      ${({easings:e})=>e["ease-out-power-1"]};
    will-change: background-color;
    transition: all ${({easings:e})=>e["ease-out-power-1"]}
      ${({durations:e})=>e.lg};
  }

  :host(:hover) {
    background-color: ${({tokens:e})=>e.theme.foregroundSecondary};
  }

  wui-flex {
    width: 100%;
    height: fit-content;
  }

  wui-button {
    width: 100%;
    display: flex;
    justify-content: flex-end;
  }

  wui-input-amount {
    mask-image: linear-gradient(
      270deg,
      transparent 0px,
      transparent 8px,
      black 24px,
      black 25px,
      black 32px,
      black 100%
    );
  }

  .totalValue {
    width: 100%;
  }
`;var D=function(e,t,i,r){var o=arguments.length,n=o<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,i):r,s;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")n=Reflect.decorate(e,t,i,r);else for(var a=e.length-1;a>=0;a--)(s=e[a])&&(n=(o<3?s(n):o>3?s(t,i,n):s(t,i))||n);return o>3&&n&&Object.defineProperty(t,i,n),n};let A=class extends T{constructor(){super(...arguments),this.readOnly=!1,this.isInsufficientBalance=!1}render(){const t=this.readOnly||!this.token;return u` <wui-flex
      flexDirection="column"
      gap="01"
      .padding=${["5","3","4","3"]}
    >
      <wui-flex alignItems="center">
        <wui-input-amount
          @inputChange=${this.onInputChange.bind(this)}
          ?disabled=${t}
          .value=${this.sendTokenAmount?String(this.sendTokenAmount):""}
          ?error=${!!this.isInsufficientBalance}
        ></wui-input-amount>
        ${this.buttonTemplate()}
      </wui-flex>
      ${this.bottomTemplate()}
    </wui-flex>`}buttonTemplate(){return this.token?u`<wui-token-button
        text=${this.token.symbol}
        imageSrc=${this.token.iconUrl}
        @click=${this.handleSelectButtonClick.bind(this)}
      >
      </wui-token-button>`:u`<wui-button
      size="md"
      variant="neutral-secondary"
      @click=${this.handleSelectButtonClick.bind(this)}
      >Select token</wui-button
    >`}handleSelectButtonClick(){this.readOnly||d.push("WalletSendSelectToken")}sendValueTemplate(){if(!this.readOnly&&this.token&&this.sendTokenAmount){const i=this.token.price*this.sendTokenAmount;return u`<wui-text class="totalValue" variant="sm-regular" color="secondary"
        >${i?`$${M.formatNumberToLocalString(i,2)}`:"Incorrect value"}</wui-text
      >`}return null}maxAmountTemplate(){return this.token?u` <wui-text variant="sm-regular" color="secondary">
        ${P.roundNumber(Number(this.token.quantity.numeric),6,5)}
      </wui-text>`:null}actionTemplate(){return this.token?u`<wui-link @click=${this.onMaxClick.bind(this)}>Max</wui-link>`:null}bottomTemplate(){return this.readOnly?null:u`<wui-flex alignItems="center" justifyContent="space-between">
      ${this.sendValueTemplate()}
      <wui-flex alignItems="center" gap="01" justifyContent="flex-end">
        ${this.maxAmountTemplate()} ${this.actionTemplate()}
      </wui-flex>
    </wui-flex>`}onInputChange(t){l.setTokenAmount(t.detail)}onMaxClick(){if(this.token){const t=M.bigNumber(this.token.quantity.numeric);l.setTokenAmount(Number(t.toFixed(20)))}}};A.styles=oe;D([y({type:Object})],A.prototype,"token",void 0);D([y({type:Boolean})],A.prototype,"readOnly",void 0);D([y({type:Number})],A.prototype,"sendTokenAmount",void 0);D([y({type:Boolean})],A.prototype,"isInsufficientBalance",void 0);A=D([x("w3m-input-token")],A);const se=g`
  :host {
    display: block;
  }

  wui-flex {
    position: relative;
  }

  wui-icon-box {
    width: 32px;
    height: 32px;
    border-radius: ${({borderRadius:e})=>e[10]} !important;
    border: 4px solid ${({tokens:e})=>e.theme.backgroundPrimary};
    background: ${({tokens:e})=>e.theme.foregroundPrimary};
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: 3;
  }

  wui-button {
    --local-border-radius: ${({borderRadius:e})=>e[4]} !important;
  }

  .inputContainer {
    height: fit-content;
  }
`;var m=function(e,t,i,r){var o=arguments.length,n=o<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,i):r,s;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")n=Reflect.decorate(e,t,i,r);else for(var a=e.length-1;a>=0;a--)(s=e[a])&&(n=(o<3?s(n):o>3?s(t,i,n):s(t,i))||n);return o>3&&n&&Object.defineProperty(t,i,n),n};const f={INSUFFICIENT_FUNDS:"Insufficient Funds",INCORRECT_VALUE:"Incorrect Value",INVALID_ADDRESS:"Invalid Address",ADD_ADDRESS:"Add Address",ADD_AMOUNT:"Add Amount",SELECT_TOKEN:"Select Token",PREVIEW_SEND:"Preview Send"};let h=class extends T{constructor(){var i,r;super(),this.unsubscribe=[],this.isTryingToChooseDifferentWallet=!1,this.token=l.state.token,this.sendTokenAmount=l.state.sendTokenAmount,this.receiverAddress=l.state.receiverAddress,this.receiverProfileName=l.state.receiverProfileName,this.loading=l.state.loading,this.params=(i=d.state.data)==null?void 0:i.send,this.caipAddress=(r=w.getAccountData())==null?void 0:r.caipAddress,this.message=f.PREVIEW_SEND,this.disconnecting=!1,this.token&&!this.params&&(this.fetchBalances(),this.fetchNetworkPrice());const t=w.subscribeKey("activeCaipAddress",o=>{!o&&this.isTryingToChooseDifferentWallet&&(this.isTryingToChooseDifferentWallet=!1,Y.open({view:"Connect",data:{redirectView:"WalletSend"}}).catch(()=>null),t())});this.unsubscribe.push(w.subscribeAccountStateProp("caipAddress",o=>{this.caipAddress=o}),l.subscribe(o=>{this.token=o.token,this.sendTokenAmount=o.sendTokenAmount,this.receiverAddress=o.receiverAddress,this.receiverProfileName=o.receiverProfileName,this.loading=o.loading}))}disconnectedCallback(){this.unsubscribe.forEach(t=>t())}async firstUpdated(){await this.handleSendParameters()}render(){this.getMessage();const t=!!this.params;return u` <wui-flex flexDirection="column" .padding=${["0","4","4","4"]}>
      <wui-flex class="inputContainer" gap="2" flexDirection="column">
        <w3m-input-token
          .token=${this.token}
          .sendTokenAmount=${this.sendTokenAmount}
          ?readOnly=${t}
          ?isInsufficientBalance=${this.message===f.INSUFFICIENT_FUNDS}
        ></w3m-input-token>
        <wui-icon-box size="md" variant="secondary" icon="arrowBottom"></wui-icon-box>
        <w3m-input-address
          ?readOnly=${t}
          .value=${this.receiverProfileName?this.receiverProfileName:this.receiverAddress}
        ></w3m-input-address>
      </wui-flex>
      ${this.buttonTemplate()}
    </wui-flex>`}async fetchBalances(){await l.fetchTokenBalance(),l.fetchNetworkBalance()}async fetchNetworkPrice(){await Z.getNetworkTokenPrice()}onButtonClick(){d.push("WalletSendPreview",{send:this.params})}onFundWalletClick(){d.push("FundWallet",{redirectView:"WalletSend"})}async onConnectDifferentWalletClick(){try{this.isTryingToChooseDifferentWallet=!0,this.disconnecting=!0,await V.disconnect()}finally{this.disconnecting=!1}}getMessage(){var t;this.message=f.PREVIEW_SEND,this.receiverAddress&&!O.isAddress(this.receiverAddress,w.state.activeChain)&&(this.message=f.INVALID_ADDRESS),this.receiverAddress||(this.message=f.ADD_ADDRESS),this.sendTokenAmount&&this.token&&this.sendTokenAmount>Number(this.token.quantity.numeric)&&(this.message=f.INSUFFICIENT_FUNDS),this.sendTokenAmount||(this.message=f.ADD_AMOUNT),this.sendTokenAmount&&((t=this.token)!=null&&t.price)&&(this.sendTokenAmount*this.token.price||(this.message=f.INCORRECT_VALUE)),this.token||(this.message=f.SELECT_TOKEN)}buttonTemplate(){const t=!this.message.startsWith(f.PREVIEW_SEND),i=this.message===f.INSUFFICIENT_FUNDS,r=!!this.params;return i&&!r?u`
        <wui-flex .margin=${["4","0","0","0"]} flexDirection="column" gap="4">
          <wui-button
            @click=${this.onFundWalletClick.bind(this)}
            size="lg"
            variant="accent-secondary"
            fullWidth
          >
            Fund Wallet
          </wui-button>

          <wui-separator data-testid="wui-separator" text="or"></wui-separator>

          <wui-button
            @click=${this.onConnectDifferentWalletClick.bind(this)}
            size="lg"
            variant="neutral-secondary"
            fullWidth
            ?loading=${this.disconnecting}
          >
            Connect a different wallet
          </wui-button>
        </wui-flex>
      `:u`<wui-flex .margin=${["4","0","0","0"]}>
      <wui-button
        @click=${this.onButtonClick.bind(this)}
        ?disabled=${t}
        size="lg"
        variant="accent-primary"
        ?loading=${this.loading}
        fullWidth
      >
        ${this.message}
      </wui-button>
    </wui-flex>`}async handleSendParameters(){if(this.loading=!0,!this.params){this.loading=!1;return}const t=Number(this.params.amount);if(isNaN(t)){v.showError("Invalid amount"),this.loading=!1;return}const{namespace:i,chainId:r,assetAddress:o}=this.params;if(!ee.SEND_PARAMS_SUPPORTED_CHAINS.includes(i)){v.showError(`Chain "${i}" is not supported for send parameters`),this.loading=!1;return}const n=w.getCaipNetworkById(r,i);if(!n){v.showError(`Network with id "${r}" not found`),this.loading=!1;return}try{const{balance:s,name:a,symbol:U,decimals:z}=await te.fetchERC20Balance({caipAddress:this.caipAddress,assetAddress:o,caipNetwork:n});if(!a||!U||!z||!s){v.showError("Token not found");return}l.setToken({name:a,symbol:U,chainId:n.id.toString(),address:`${n.chainNamespace}:${n.id}:${o}`,value:0,price:0,quantity:{decimals:z.toString(),numeric:s.toString()},iconUrl:G.getTokenImage(U)??""}),l.setTokenAmount(t),l.setReceiverAddress(this.params.to)}catch(s){console.error("Failed to load token information:",s),v.showError("Failed to load token information")}finally{this.loading=!1}}};h.styles=se;m([c()],h.prototype,"token",void 0);m([c()],h.prototype,"sendTokenAmount",void 0);m([c()],h.prototype,"receiverAddress",void 0);m([c()],h.prototype,"receiverProfileName",void 0);m([c()],h.prototype,"loading",void 0);m([c()],h.prototype,"params",void 0);m([c()],h.prototype,"caipAddress",void 0);m([c()],h.prototype,"message",void 0);m([c()],h.prototype,"disconnecting",void 0);h=m([x("w3m-wallet-send-view")],h);const ae=g`
  .contentContainer {
    height: 440px;
    overflow: scroll;
    scrollbar-width: none;
  }

  .contentContainer::-webkit-scrollbar {
    display: none;
  }

  wui-icon-box {
    width: 40px;
    height: 40px;
    border-radius: ${({borderRadius:e})=>e[3]};
  }
`;var _=function(e,t,i,r){var o=arguments.length,n=o<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,i):r,s;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")n=Reflect.decorate(e,t,i,r);else for(var a=e.length-1;a>=0;a--)(s=e[a])&&(n=(o<3?s(n):o>3?s(t,i,n):s(t,i))||n);return o>3&&n&&Object.defineProperty(t,i,n),n};let C=class extends T{constructor(){super(),this.unsubscribe=[],this.tokenBalances=l.state.tokenBalances,this.search="",this.onDebouncedSearch=O.debounce(t=>{this.search=t}),this.fetchBalancesAndNetworkPrice(),this.unsubscribe.push(l.subscribe(t=>{this.tokenBalances=t.tokenBalances}))}disconnectedCallback(){this.unsubscribe.forEach(t=>t())}render(){return u`
      <wui-flex flexDirection="column">
        ${this.templateSearchInput()} <wui-separator></wui-separator> ${this.templateTokens()}
      </wui-flex>
    `}async fetchBalancesAndNetworkPrice(){var t;(!this.tokenBalances||((t=this.tokenBalances)==null?void 0:t.length)===0)&&(await this.fetchBalances(),await this.fetchNetworkPrice())}async fetchBalances(){await l.fetchTokenBalance(),l.fetchNetworkBalance()}async fetchNetworkPrice(){await Z.getNetworkTokenPrice()}templateSearchInput(){return u`
      <wui-flex gap="2" padding="3">
        <wui-input-text
          @inputChange=${this.onInputChange.bind(this)}
          class="network-search-input"
          size="sm"
          placeholder="Search token"
          icon="search"
        ></wui-input-text>
      </wui-flex>
    `}templateTokens(){var t,i;return this.tokens=(t=this.tokenBalances)==null?void 0:t.filter(r=>{var o;return r.chainId===((o=w.state.activeCaipNetwork)==null?void 0:o.caipNetworkId)}),this.search?this.filteredTokens=(i=this.tokenBalances)==null?void 0:i.filter(r=>r.name.toLowerCase().includes(this.search.toLowerCase())):this.filteredTokens=this.tokens,u`
      <wui-flex
        class="contentContainer"
        flexDirection="column"
        .padding=${["0","3","0","3"]}
      >
        <wui-flex justifyContent="flex-start" .padding=${["4","3","3","3"]}>
          <wui-text variant="md-medium" color="secondary">Your tokens</wui-text>
        </wui-flex>
        <wui-flex flexDirection="column" gap="2">
          ${this.filteredTokens&&this.filteredTokens.length>0?this.filteredTokens.map(r=>u`<wui-list-token
                    @click=${this.handleTokenClick.bind(this,r)}
                    ?clickable=${!0}
                    tokenName=${r.name}
                    tokenImageUrl=${r.iconUrl}
                    tokenAmount=${r.quantity.numeric}
                    tokenValue=${r.value}
                    tokenCurrency=${r.symbol}
                  ></wui-list-token>`):u`<wui-flex
                .padding=${["20","0","0","0"]}
                alignItems="center"
                flexDirection="column"
                gap="4"
              >
                <wui-icon-box icon="coinPlaceholder" color="default" size="lg"></wui-icon-box>
                <wui-flex
                  class="textContent"
                  gap="2"
                  flexDirection="column"
                  justifyContent="center"
                  flexDirection="column"
                >
                  <wui-text variant="lg-medium" align="center" color="primary">
                    No tokens found
                  </wui-text>
                  <wui-text variant="lg-regular" align="center" color="secondary">
                    Your tokens will appear here
                  </wui-text>
                </wui-flex>
                <wui-link @click=${this.onBuyClick.bind(this)}>Buy</wui-link>
              </wui-flex>`}
        </wui-flex>
      </wui-flex>
    `}onBuyClick(){d.push("OnRampProviders")}onInputChange(t){this.onDebouncedSearch(t.detail)}handleTokenClick(t){l.setToken(t),l.setTokenAmount(void 0),d.goBack()}};C.styles=ae;_([c()],C.prototype,"tokenBalances",void 0);_([c()],C.prototype,"tokens",void 0);_([c()],C.prototype,"filteredTokens",void 0);_([c()],C.prototype,"search",void 0);C=_([x("w3m-wallet-send-select-token-view")],C);const le=g`
  :host {
    height: 32px;
    display: flex;
    align-items: center;
    gap: ${({spacing:e})=>e[1]};
    border-radius: ${({borderRadius:e})=>e[32]};
    background-color: ${({tokens:e})=>e.theme.foregroundPrimary};
    padding: ${({spacing:e})=>e[1]};
    padding-left: ${({spacing:e})=>e[2]};
  }

  wui-avatar,
  wui-image {
    width: 24px;
    height: 24px;
    border-radius: ${({borderRadius:e})=>e[16]};
  }

  wui-icon {
    border-radius: ${({borderRadius:e})=>e[16]};
  }
`;var B=function(e,t,i,r){var o=arguments.length,n=o<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,i):r,s;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")n=Reflect.decorate(e,t,i,r);else for(var a=e.length-1;a>=0;a--)(s=e[a])&&(n=(o<3?s(n):o>3?s(t,i,n):s(t,i))||n);return o>3&&n&&Object.defineProperty(t,i,n),n};let S=class extends X{constructor(){super(...arguments),this.text=""}render(){return k`<wui-text variant="lg-regular" color="primary">${this.text}</wui-text>
      ${this.imageTemplate()}`}imageTemplate(){return this.address?k`<wui-avatar address=${this.address} .imageSrc=${this.imageSrc}></wui-avatar>`:this.imageSrc?k`<wui-image src=${this.imageSrc}></wui-image>`:k`<wui-icon size="lg" color="inverse" name="networkPlaceholder"></wui-icon>`}};S.styles=[J,Q,le];B([E({type:String})],S.prototype,"text",void 0);B([E({type:String})],S.prototype,"address",void 0);B([E({type:String})],S.prototype,"imageSrc",void 0);S=B([x("wui-preview-item")],S);const ce=g`
  :host {
    display: flex;
    padding: ${({spacing:e})=>e[4]} ${({spacing:e})=>e[3]};
    width: 100%;
    background-color: ${({tokens:e})=>e.theme.foregroundPrimary};
    border-radius: ${({borderRadius:e})=>e[4]};
  }

  wui-image {
    width: 20px;
    height: 20px;
    border-radius: ${({borderRadius:e})=>e[16]};
  }

  wui-icon {
    width: 20px;
    height: 20px;
  }
`;var W=function(e,t,i,r){var o=arguments.length,n=o<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,i):r,s;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")n=Reflect.decorate(e,t,i,r);else for(var a=e.length-1;a>=0;a--)(s=e[a])&&(n=(o<3?s(n):o>3?s(t,i,n):s(t,i))||n);return o>3&&n&&Object.defineProperty(t,i,n),n};let R=class extends X{constructor(){super(...arguments),this.imageSrc=void 0,this.textTitle="",this.textValue=void 0}render(){return k`
      <wui-flex justifyContent="space-between" alignItems="center">
        <wui-text variant="lg-regular" color="primary"> ${this.textTitle} </wui-text>
        ${this.templateContent()}
      </wui-flex>
    `}templateContent(){return this.imageSrc?k`<wui-image src=${this.imageSrc} alt=${this.textTitle}></wui-image>`:this.textValue?k` <wui-text variant="md-regular" color="secondary"> ${this.textValue} </wui-text>`:k`<wui-icon size="inherit" color="default" name="networkPlaceholder"></wui-icon>`}};R.styles=[J,Q,ce];W([E()],R.prototype,"imageSrc",void 0);W([E()],R.prototype,"textTitle",void 0);W([E()],R.prototype,"textValue",void 0);R=W([x("wui-list-content")],R);const ue=g`
  :host {
    display: flex;
    width: auto;
    flex-direction: column;
    gap: ${({spacing:e})=>e[1]};
    border-radius: ${({borderRadius:e})=>e[5]};
    background: ${({tokens:e})=>e.theme.foregroundPrimary};
    padding: ${({spacing:e})=>e[3]} ${({spacing:e})=>e[2]}
      ${({spacing:e})=>e[2]} ${({spacing:e})=>e[2]};
  }

  wui-list-content {
    width: -webkit-fill-available !important;
  }

  wui-text {
    padding: 0 ${({spacing:e})=>e[2]};
  }

  wui-flex {
    margin-top: ${({spacing:e})=>e[2]};
  }

  .network {
    cursor: pointer;
    transition: background-color ${({durations:e})=>e.lg}
      ${({easings:e})=>e["ease-out-power-1"]};
    will-change: background-color;
  }

  .network:focus-visible {
    border: 1px solid ${({tokens:e})=>e.core.textAccentPrimary};
    background-color: ${({tokens:e})=>e.core.glass010};
    -webkit-box-shadow: 0px 0px 0px 4px ${({tokens:e})=>e.core.foregroundAccent010};
    -moz-box-shadow: 0px 0px 0px 4px ${({tokens:e})=>e.core.foregroundAccent010};
    box-shadow: 0px 0px 0px 4px ${({tokens:e})=>e.core.foregroundAccent010};
  }

  .network:hover {
    background-color: ${({tokens:e})=>e.core.glass010};
  }

  .network:active {
    background-color: ${({tokens:e})=>e.core.glass010};
  }
`;var j=function(e,t,i,r){var o=arguments.length,n=o<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,i):r,s;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")n=Reflect.decorate(e,t,i,r);else for(var a=e.length-1;a>=0;a--)(s=e[a])&&(n=(o<3?s(n):o>3?s(t,i,n):s(t,i))||n);return o>3&&n&&Object.defineProperty(t,i,n),n};let N=class extends T{constructor(){var t;super(...arguments),this.params=(t=d.state.data)==null?void 0:t.send}render(){return u` <wui-text variant="sm-regular" color="secondary">Details</wui-text>
      <wui-flex flexDirection="column" gap="1">
        <wui-list-content
          textTitle="Address"
          textValue=${P.getTruncateString({string:this.receiverAddress??"",charsStart:4,charsEnd:4,truncate:"middle"})}
        >
        </wui-list-content>
        ${this.networkTemplate()}
      </wui-flex>`}networkTemplate(){var t;return(t=this.caipNetwork)!=null&&t.name?u` <wui-list-content
        @click=${()=>this.onNetworkClick(this.caipNetwork)}
        class="network"
        textTitle="Network"
        imageSrc=${ie(G.getNetworkImage(this.caipNetwork))}
      ></wui-list-content>`:null}onNetworkClick(t){t&&!this.params&&d.push("Networks",{network:t})}};N.styles=ue;j([y()],N.prototype,"receiverAddress",void 0);j([y({type:Object})],N.prototype,"caipNetwork",void 0);j([c()],N.prototype,"params",void 0);N=j([x("w3m-wallet-send-details")],N);const de=g`
  wui-avatar,
  wui-image {
    display: ruby;
    width: 32px;
    height: 32px;
    border-radius: ${({borderRadius:e})=>e[20]};
  }

  .sendButton {
    width: 70%;
    --local-width: 100% !important;
    --local-border-radius: ${({borderRadius:e})=>e[4]} !important;
  }

  .cancelButton {
    width: 30%;
    --local-width: 100% !important;
    --local-border-radius: ${({borderRadius:e})=>e[4]} !important;
  }
`;var b=function(e,t,i,r){var o=arguments.length,n=o<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,i):r,s;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")n=Reflect.decorate(e,t,i,r);else for(var a=e.length-1;a>=0;a--)(s=e[a])&&(n=(o<3?s(n):o>3?s(t,i,n):s(t,i))||n);return o>3&&n&&Object.defineProperty(t,i,n),n};let p=class extends T{constructor(){var t;super(),this.unsubscribe=[],this.token=l.state.token,this.sendTokenAmount=l.state.sendTokenAmount,this.receiverAddress=l.state.receiverAddress,this.receiverProfileName=l.state.receiverProfileName,this.receiverProfileImageUrl=l.state.receiverProfileImageUrl,this.caipNetwork=w.state.activeCaipNetwork,this.loading=l.state.loading,this.params=(t=d.state.data)==null?void 0:t.send,this.unsubscribe.push(l.subscribe(i=>{this.token=i.token,this.sendTokenAmount=i.sendTokenAmount,this.receiverAddress=i.receiverAddress,this.receiverProfileName=i.receiverProfileName,this.receiverProfileImageUrl=i.receiverProfileImageUrl,this.loading=i.loading}),w.subscribeKey("activeCaipNetwork",i=>this.caipNetwork=i))}disconnectedCallback(){this.unsubscribe.forEach(t=>t())}render(){var t,i;return u` <wui-flex flexDirection="column" .padding=${["0","4","4","4"]}>
      <wui-flex gap="2" flexDirection="column" .padding=${["0","2","0","2"]}>
        <wui-flex alignItems="center" justifyContent="space-between">
          <wui-flex flexDirection="column" gap="01">
            <wui-text variant="sm-regular" color="secondary">Send</wui-text>
            ${this.sendValueTemplate()}
          </wui-flex>
          <wui-preview-item
            text="${this.sendTokenAmount?P.roundNumber(this.sendTokenAmount,6,5):"unknown"} ${(t=this.token)==null?void 0:t.symbol}"
            .imageSrc=${(i=this.token)==null?void 0:i.iconUrl}
          ></wui-preview-item>
        </wui-flex>
        <wui-flex>
          <wui-icon color="default" size="md" name="arrowBottom"></wui-icon>
        </wui-flex>
        <wui-flex alignItems="center" justifyContent="space-between">
          <wui-text variant="sm-regular" color="secondary">To</wui-text>
          <wui-preview-item
            text="${this.receiverProfileName?P.getTruncateString({string:this.receiverProfileName,charsStart:20,charsEnd:0,truncate:"end"}):P.getTruncateString({string:this.receiverAddress?this.receiverAddress:"",charsStart:4,charsEnd:4,truncate:"middle"})}"
            address=${this.receiverAddress??""}
            .imageSrc=${this.receiverProfileImageUrl??void 0}
            .isAddress=${!0}
          ></wui-preview-item>
        </wui-flex>
      </wui-flex>
      <wui-flex flexDirection="column" .padding=${["6","0","0","0"]}>
        <w3m-wallet-send-details
          .caipNetwork=${this.caipNetwork}
          .receiverAddress=${this.receiverAddress}
        ></w3m-wallet-send-details>
        <wui-flex justifyContent="center" gap="1" .padding=${["3","0","0","0"]}>
          <wui-icon size="sm" color="default" name="warningCircle"></wui-icon>
          <wui-text variant="sm-regular" color="secondary">Review transaction carefully</wui-text>
        </wui-flex>
        <wui-flex justifyContent="center" gap="3" .padding=${["4","0","0","0"]}>
          <wui-button
            class="cancelButton"
            @click=${this.onCancelClick.bind(this)}
            size="lg"
            variant="neutral-secondary"
          >
            Cancel
          </wui-button>
          <wui-button
            class="sendButton"
            @click=${this.onSendClick.bind(this)}
            size="lg"
            variant="accent-primary"
            .loading=${this.loading}
          >
            Send
          </wui-button>
        </wui-flex>
      </wui-flex></wui-flex
    >`}sendValueTemplate(){if(!this.params&&this.token&&this.sendTokenAmount){const i=this.token.price*this.sendTokenAmount;return u`<wui-text variant="md-regular" color="primary"
        >$${i.toFixed(2)}</wui-text
      >`}return null}async onSendClick(){if(!this.sendTokenAmount||!this.receiverAddress){v.showError("Please enter a valid amount and receiver address");return}try{await l.sendToken(),this.params?d.reset("WalletSendConfirmed"):(v.showSuccess("Transaction started"),d.replace("Account"))}catch(t){let i="Failed to send transaction";const r=t instanceof q&&t.originalName===K.PROVIDER_RPC_ERROR_NAME.USER_REJECTED_REQUEST,o=t instanceof q&&t.originalName===K.PROVIDER_RPC_ERROR_NAME.SEND_TRANSACTION_ERROR;(r||o)&&(i=t.message),ne.sendEvent({type:"track",event:r?"SEND_REJECTED":"SEND_ERROR",properties:l.getSdkEventProperties(t)}),v.showError(i)}}onCancelClick(){d.goBack()}};p.styles=de;b([c()],p.prototype,"token",void 0);b([c()],p.prototype,"sendTokenAmount",void 0);b([c()],p.prototype,"receiverAddress",void 0);b([c()],p.prototype,"receiverProfileName",void 0);b([c()],p.prototype,"receiverProfileImageUrl",void 0);b([c()],p.prototype,"caipNetwork",void 0);b([c()],p.prototype,"loading",void 0);b([c()],p.prototype,"params",void 0);p=b([x("w3m-wallet-send-preview-view")],p);const he=g`
  .icon-box {
    width: 64px;
    height: 64px;
    border-radius: 16px;
    background-color: ${({spacing:e})=>e[16]};
    border: 8px solid ${({tokens:e})=>e.theme.borderPrimary};
    border-radius: ${({borderRadius:e})=>e.round};
  }
`;var fe=function(e,t,i,r){var o=arguments.length,n=o<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,i):r,s;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")n=Reflect.decorate(e,t,i,r);else for(var a=e.length-1;a>=0;a--)(s=e[a])&&(n=(o<3?s(n):o>3?s(t,i,n):s(t,i))||n);return o>3&&n&&Object.defineProperty(t,i,n),n};let F=class extends T{constructor(){super(),this.unsubscribe=[],this.unsubscribe.push()}render(){return u`
      <wui-flex
        flexDirection="column"
        alignItems="center"
        gap="4"
        .padding="${["1","3","4","3"]}"
      >
        <wui-flex justifyContent="center" alignItems="center" class="icon-box">
          <wui-icon size="xxl" color="success" name="checkmark"></wui-icon>
        </wui-flex>

        <wui-text variant="h6-medium" color="primary">You successfully sent asset</wui-text>

        <wui-button
          fullWidth
          @click=${this.onCloseClick.bind(this)}
          size="lg"
          variant="neutral-secondary"
        >
          Close
        </wui-button>
      </wui-flex>
    `}onCloseClick(){Y.close()}};F.styles=he;F=fe([x("w3m-send-confirmed-view")],F);export{F as W3mSendConfirmedView,C as W3mSendSelectTokenView,p as W3mWalletSendPreviewView,h as W3mWalletSendView};
