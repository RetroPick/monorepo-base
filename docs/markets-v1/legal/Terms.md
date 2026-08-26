# Terms of Use

**Last Updated: April 29, 2026**

---

## 1. Introduction

These Terms of Use set out the terms and conditions under which you, whether personally or on behalf of an entity ("you" or "your"), are permitted to use, interact with, or otherwise access the interfaces and features provided by RetroPick FZ-LLC, a Free Zone Limited Liability Company registered under RAK DAO, Ras Al Khaimah, United Arab Emirates (the "Company," "we," "us," or "our").

These Terms of Use, together with any documents and additional terms or policies appended hereto or that expressly incorporate these Terms by reference, as well as our Privacy Policy (collectively, the "Terms"), constitute a binding agreement between you and us.

These Terms apply to:

(i) all content, informational functionality, and information features (the "Content Features") available on retropick.xyz and any other site to which these Terms are posted (each, an "Interface"); and

(ii) the RetroPick smart contract protocol, being an oracle-resolved prediction market system (the "Protocol"), that may be accessed by users connecting their self-hosted wallets via an Interface, together with any related keeper infrastructure, oracle adapters, and yield routing functionality (collectively, the "Technology Features," and together with the Content Features, the "Features").

**PLEASE REVIEW THESE TERMS CAREFULLY. BY ACCESSING, INTERACTING WITH, OR USING ANY INTERFACE OR FEATURE, INCLUDING BY CONNECTING YOUR WALLET OR DEPOSITING FUNDS INTO ANY MARKET, YOU CONFIRM THAT YOU HAVE READ, UNDERSTOOD, AND AGREE TO BE BOUND BY THESE TERMS. IF YOU DO NOT AGREE, YOU ARE NOT AUTHORISED TO ACCESS OR USE ANY INTERFACE OR FEATURE.**

**USE OF THE PROTOCOL OR TECHNOLOGY FEATURES IS NOT PERMITTED BY PERSONS OR ENTITIES WHO RESIDE IN, ARE LOCATED IN, ARE INCORPORATED IN, OR HAVE THEIR PRINCIPAL PLACE OF BUSINESS IN ANY RESTRICTED JURISDICTION AS DEFINED BELOW. IF YOU ARE A RESTRICTED PERSON, DO NOT ATTEMPT TO USE THE PROTOCOL OR ANY TECHNOLOGY FEATURE. USE OF A VPN OR ANY SIMILAR TOOL TO CIRCUMVENT THESE RESTRICTIONS IS STRICTLY PROHIBITED.**

---

## 2. The Protocol and Features

### 2.1 Description of the Protocol

The Protocol enables you to participate in oracle-resolved structured outcome markets by depositing cryptocurrency on the outcomes of future measurable events ("Outcome Markets"). You may participate in Outcome Markets by depositing supported tokens into the outcome you believe will occur during a defined epoch.

All Outcome Markets settle deterministically from verified on-chain data. Settlement is performed exclusively by one or more of the following data sources:

- **Chainlink price feeds** — covering asset pairs including BTC/USD, ETH/USD, XAU/USD, and others
- **Chainlink rate feeds** — covering ETH staking APR, realized volatility, and related instruments
- **Chainlink SmartData feeds** — covering tokenised asset NAV and Proof of Reserve ratios
- **Chainlink macro feeds** — covering US government economic data releases including BEA GDP and PCE
- **Chainlink equity feeds** — covering tokenised equity instruments
- **TrustedReporter oracle data** — covering OHLC (open-high-low-close) intraday data used for Corridor and Cascade market types

The Company or the Protocol administrator designates the applicable oracle data source for each Outcome Market at the time of market creation. Once an outcome has been determined from the designated oracle source, the result is final and binding. No human judge, dispute window, or operator override exists in the settlement path. You can independently verify any settlement by inspecting the resolver functions published in the Protocol's open-source repository.

### 2.2 Market Types

The Protocol currently supports the following market types, each settling from a defined oracle source:

- **Direction** — settles on the direction of price movement relative to a lock-time checkpoint
- **Threshold** — settles on whether a data point lands at or above a defined level at resolve time
- **Range Close** — settles on which price bucket a data point falls into at close
- **Velocity** — settles on the magnitude of price movement regardless of direction
- **Ladder** — settles on which weighted price tier a data point falls into at close
- **Convergence** — settles on whether the spread between two assets narrows or widens
- **Composite** — settles on the combined result of multiple conditions across multiple feeds using And, Or, or Majority logic
- **Corridor** — settles on whether a price remained within a defined band throughout the entire epoch
- **Cascade** — settles on how many sequential price levels were broken during the epoch

The Company reserves the right to add, modify, suspend, or remove market types at any time.

### 2.3 Keeper Automation

The Protocol uses an automated keeper service to execute time-sensitive lifecycle calls including epoch locking, resolution, and rolling-round execution. The keeper operates as an automated worker, not as a discretionary agent. The keeper cannot alter outcomes, withdraw user funds, or override oracle data. Keeper failures result in halted epochs with documented recovery procedures; they do not result in loss of deposited funds.

### 2.4 Yield Routing

Where yield routing is enabled on a specific market template, idle pool capital may be routed to Aave v3 during the open epoch window. Yield earned during this period is added to the settlement pool at resolve time and distributed to winners. Yield routing is configured per market template and may be disabled at any time. The Company maintains per-template accounting so that different markets cannot access or drain each other's principal.

### 2.5 Protocol Fees

The Protocol charges a settlement fee in basis points on each resolved epoch, deducted from the pool at settlement time. The applicable fee rate is disclosed in each market template's parameters before you deposit. Where yield routing is enabled, a yield fee is also applied to the gross yield earned during the epoch. Fee rates are set by the Company and may be updated from time to time.

### 2.6 No Custody

The Company does not take custody of your cryptoassets at any time. Your funds are held in the Protocol's smart contract storage. The Company cannot access, freeze, reverse, or redirect your deposited funds except through the explicit administrative functions described in the Protocol's open-source code, which are limited to pause, recovery, and fee withdrawal.

### 2.7 No Advisory Role

The information provided through the Interfaces and Features is for informational purposes only. Nothing in the Interfaces, Features, or any associated communications constitutes financial, investment, legal, tax, or professional advice. The Company is not acting as an investment adviser, broker, dealer, or financial intermediary of any kind. You should seek independent professional advice before making any financial decision.

---

## 3. Eligibility and Representations

### 3.1 Age and Capacity

The Interfaces and Features are intended only for individuals who are 18 years of age or older. If you are accessing the Protocol on behalf of an entity, you represent that you have the legal authority to bind that entity to these Terms.

### 3.2 Restricted Jurisdictions

You acknowledge and agree that you are not permitted to access or use the Technology Features or the Protocol if you reside in, are located in, or are a citizen or resident of any of the following jurisdictions ("Restricted Jurisdictions"):

- Any country or territory subject to comprehensive sanctions administered or enforced by the United States Office of Foreign Assets Control (OFAC), including Iran, Syria, Cuba, North Korea, and the Crimea, Donetsk, and Luhansk regions of Ukraine
- The United States of America and its territories
- The United Kingdom
- The People's Republic of China, including Hong Kong and Macau
- Singapore
- France and all other EU Member States: Austria, Belgium, Bulgaria, Croatia, Cyprus, Czech Republic, Denmark, Estonia, Finland, Germany, Greece, Hungary, Ireland, Italy, Latvia, Lithuania, Luxembourg, Malta, Netherlands, Poland, Portugal, Romania, Slovakia, Slovenia, Spain, Sweden
- EEA states: Iceland, Liechtenstein, Norway
- South Korea
- Thailand
- Taiwan
- Any jurisdiction where participation in prediction markets or the use of the Protocol is prohibited by applicable law

The Company may update this list at any time. It is your responsibility to determine whether your jurisdiction is a Restricted Jurisdiction. Persons from Restricted Jurisdictions may only access the Content Features and may not access the Technology Features or interact with the Protocol.

### 3.3 Sanctions

You represent and warrant that you are not, and for the duration of your use of the Features will not be: (i) subject to economic or trade sanctions administered by any governmental authority; (ii) included on OFAC's List of Specially Designated Nationals and Blocked Persons; (iii) included on any sanctions list maintained by the EU or UK; or (iv) acting on behalf of any person or entity falling into the foregoing categories.

### 3.4 No VPN Circumvention

You do not and will not use VPN software or any other privacy or anonymisation tool to circumvent or attempt to circumvent any restrictions applicable to the Interfaces or Features. Violations of this provision may result in immediate termination of access and may be reported to relevant authorities.

### 3.5 Sophistication

You represent that you possess sufficient knowledge, experience, and sophistication to understand the risks of blockchain technology, cryptoassets, smart contracts, and structured outcome markets before interacting with the Protocol. You have sought independent professional advice where appropriate.

### 3.6 Compliance with Applicable Law

Your access to and use of the Features is not prohibited by and does not violate any law, regulation, or directive applicable to you. You will comply with all applicable laws and will not use the Features if doing so is prohibited in your jurisdiction.

---

## 4. Financial Risks and Acknowledgements

### 4.1 Risk of Loss

Participating in Outcome Markets on the Protocol involves financial risk. You may lose the entirety of the funds you deposit into any market. Outcome Markets are highly experimental, risky, and subject to volatility in underlying oracle data. All transactions on the Protocol are irreversible and final once confirmed on the blockchain. There are no refunds except where a market is cancelled or voided under the Protocol's defined rules, which are set out in the smart contract code.

### 4.2 Oracle Risk

Settlement depends on the accuracy, continuity, and availability of third-party oracle data sources. The Company does not control Chainlink feeds, the TrustedReporter infrastructure operated by third parties, or the data published by government agencies, exchanges, or other underlying sources. The Company cannot guarantee that oracle data will be accurate, timely, or available at all times. Stale, missing, or manipulated oracle data may result in epoch halts, voids, or unexpected settlement outcomes.

### 4.3 Smart Contract Risk

The Protocol is implemented in smart contracts deployed on Base L2. Smart contracts may contain vulnerabilities, bugs, or behave unexpectedly in edge cases not covered by testing or audits. While the Protocol has undergone a security audit, no audit provides absolute security guarantees. You interact with the smart contracts at your own risk.

### 4.4 Network Risk

The Protocol is deployed on Base L2, an OP Stack rollup operated by Coinbase. You acknowledge the risks inherent in L2 infrastructure including sequencer downtime, L1 data availability failures, and potential rollback scenarios. The Company is not responsible for the availability or security of Base L2 or any underlying blockchain network.

### 4.5 Keeper and Timing Risk

The Protocol's rolling-round keeper must execute within defined timing windows. If the keeper misses a window due to network congestion, sequencer issues, or other operational failures, the relevant epoch may halt. Halted epochs follow documented recovery procedures. You acknowledge that timing-sensitive operations on blockchain networks are subject to factors outside the Company's control.

### 4.6 Yield Routing Risk

Where yield routing to Aave v3 is enabled, your deposited funds are subject to the additional risks of the Aave protocol, including smart contract risk, liquidity risk, and Aave governance decisions. Yield routing is best-effort and may be disabled or fail; in such cases funds remain in the Protocol's contract storage.

### 4.7 No Guarantee of Market Availability

The Company may suspend, cancel, or remove any Outcome Market at any time where the Company determines that the market cannot be settled definitively using the designated oracle source, or where the market violates these Terms or applicable law.

---

## 5. Prohibited Conduct

You agree that you will not:

- Violate any applicable law or regulation through your use of the Interfaces or Features
- Use the Interfaces or Features if you are a Restricted Person
- Use a VPN or other tool to circumvent access restrictions
- Provide false, inaccurate, or misleading information in connection with your use of the Features
- Engage in wash trading, front-running, spoofing, price manipulation, or any other abusive or fraudulent market practice
- Attempt to exploit, manipulate, or attack the smart contracts, keeper infrastructure, oracle adapters, or any other component of the Protocol
- Introduce malware, viruses, or other harmful code to any Interface or Feature
- Reverse engineer, decompile, or disassemble any part of the Interfaces or Features except to the extent expressly permitted by applicable law
- Harvest or scrape data from the Interfaces or Features without authorisation
- Interfere with or disrupt the operation of the Interfaces or Features
- Use the Interfaces or Features for or on behalf of any Restricted Person
- Engage in any activity that could expose the Company to legal liability or reputational harm

The Company reserves the right to terminate your access to any Interface or Feature if you engage in any prohibited conduct, with or without notice.

---

## 6. User-Created Markets

Where the Protocol enables users to create Outcome Markets, creators select a market type from the approved registry, select an oracle feed from the approved list, and configure epoch parameters within limits set by the Company. Creators cannot set or override resolution rules. The smart contract enforces all resolution logic. Creators cannot influence the oracle data used to settle any market.

Creator fee shares, where applicable, are paid in accordance with the fee economics published on the Interfaces. Fee shares are calculated as a percentage of the Protocol's settlement fee on volume generated by the creator's market. The Company does not guarantee any particular level of participation or fee income for market creators.

---

## 7. Modifications

### 7.1 To These Terms

The Company reserves the right to modify these Terms at any time. Modified Terms will be posted on the Interfaces with an updated effective date. Your continued use of any Interface or Feature after the effective date of any modification constitutes your agreement to the modified Terms.

### 7.2 To the Interfaces and Features

The Company reserves the right to modify, suspend, restrict, or discontinue any Interface or Feature at any time, with or without notice, for any reason. The Company will not be liable for any losses arising from any modification, suspension, or discontinuation of the Interfaces or Features.

---

## 8. Intellectual Property

The Company or its licensors own all intellectual property rights in the Interfaces and Features, including all content, trademarks, and technology, except as otherwise indicated. Subject to these Terms, the Company grants you a personal, limited, non-exclusive, non-transferable, revocable licence to access and use the Interfaces and Features solely for their intended purposes.

The Protocol's smart contract code is made available under the licence specified in the relevant open-source repository. Nothing in these Terms restricts rights granted under that licence.

By providing feedback, suggestions, or other communications to the Company, you grant the Company a perpetual, irrevocable, royalty-free licence to use, reproduce, and incorporate such feedback in any way.

---

## 9. Third-Party Services

The Interfaces and Features may integrate with or link to third-party services including Chainlink oracle networks, Aave v3, Base L2, wallet providers, and others. The Company is not responsible for the accuracy, availability, security, or practices of any third-party service. Your use of any third-party service is subject to that service's own terms and conditions.

---

## 10. Indemnification

You agree to defend, indemnify, and hold harmless the Company and its officers, directors, employees, contractors, and agents from and against all claims, damages, losses, liabilities, costs, and expenses (including reasonable legal fees) arising out of or relating to: (i) your use of the Interfaces or Features; (ii) your breach of these Terms or violation of applicable law; (iii) your deposit into or interaction with any Outcome Market; (iv) your infringement of any third party's rights; or (v) any dispute between you and any third party in connection with the Features.

---

## 11. Disclaimers and Limitation of Liability

### 11.1 As Is

THE INTERFACES AND FEATURES ARE PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS, IMPLIED, OR STATUTORY. TO THE FULLEST EXTENT PERMITTED BY APPLICABLE LAW, THE COMPANY EXPRESSLY DISCLAIMS ALL WARRANTIES INCLUDING ANY IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, NON-INFRINGEMENT, ACCURACY, AND UNINTERRUPTED OR ERROR-FREE OPERATION.

### 11.2 Limitation

TO THE FULLEST EXTENT PERMITTED BY APPLICABLE LAW, THE COMPANY WILL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, EXEMPLARY, OR PUNITIVE DAMAGES, INCLUDING LOSS OF FUNDS, LOSS OF PROFITS, LOSS OF DATA, OR LOSS OF OPPORTUNITY, ARISING OUT OF OR IN CONNECTION WITH YOUR USE OF THE INTERFACES OR FEATURES, EVEN IF THE COMPANY HAS BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGES. THE COMPANY'S AGGREGATE LIABILITY TO YOU FOR ALL CLAIMS ARISING UNDER THESE TERMS WILL NOT EXCEED USD 100.

---

## 12. Governing Law and Dispute Resolution

### 12.1 Governing Law

These Terms are governed by the laws of the United Arab Emirates and, to the extent applicable, the regulations of RAK DAO Free Zone, without regard to conflict of law principles.

### 12.2 Dispute Resolution

Before commencing any legal proceeding, the parties agree to attempt to resolve any dispute by good-faith negotiation. The aggrieved party must send written notice specifying the nature of the dispute. The parties will have 45 days from the date of notice to attempt resolution through negotiation or mediation.

### 12.3 Arbitration

Any dispute that cannot be resolved through negotiation or mediation will be submitted to binding arbitration in Ras Al Khaimah, UAE, before a single arbitrator. The arbitrator's decision will be final and binding. Class arbitrations and collective proceedings are not permitted. You waive any right to participate in a class action in connection with these Terms.

---

## 13. General

These Terms constitute the entire agreement between you and the Company regarding your use of the Interfaces and Features. If any provision of these Terms is found to be unenforceable, the remaining provisions will continue in full force. The Company's failure to enforce any provision is not a waiver of that provision.

---

## 14. Contact

Questions, complaints, or claims concerning the Features may be directed to:

**RetroPick FZ-LLC**
RAK DAO Free Zone, Ras Al Khaimah, UAE
Email: jayanegara.asyam@gmail.com