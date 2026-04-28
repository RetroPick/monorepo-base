ANTI-MONEY LAUNDERING
Counter-Terrorism Financing and
Proliferation Financing Policy

RetroPick Protocol
[Company Name] FZ-LLC  ·  RAK DAO, Ras Al Khaimah, UAE

Version 1.0  ·  Effective Date: [Insert Date]
Classification: Confidential  ·  Review Due: [Date + 12 months]

Governing law: Federal Decree-Law No. 10 of 2025
Cabinet Resolution No. 134 of 2025  ·  FATF 40 Recommendations (2023)

1.  Company Description and the Non-Custodial Distinction
1.1  What RetroPick is
[Company Name] FZ-LLC ("the Company") operates RetroPick, a non-custodial decentralised finance (DeFi) protocol deployed on the Solana blockchain. The protocol runs an on-chain smart contract program ("market_engine") that facilitates pooled, oracle-resolved event contracts. Outcomes are determined entirely by deterministic price data published by Pyth Network, a professional-grade on-chain oracle.
Users deposit USDC into program-owned smart contract vaults during an open window. At settlement, the smart contract reads a Pyth price update, distributes the pool to winning participants according to pre-defined transparent rules, and automatically separates a protocol fee into a designated fee vault — all without any human operator discretion.
1.2  Critical classification — the Company is NOT a VASP
	IMPORTANT: The Company does not fall within the definition of a Virtual Asset Service Provider (VASP) under UAE Federal Decree-Law No. 10 of 2025.

The Company does NOT: hold, custody, or control user virtual assets at any point; execute trades or transfers on behalf of users; operate a centralised exchange; issue, redeem, or administer stablecoins or tokens.

All user assets are held in Program Derived Address (PDA) vaults whose authority is the on-chain smart contract itself — not the Company. The Company cannot unilaterally move user funds.

The Company's sole on-chain action is executing the withdraw_fees instruction to collect protocol fee income (USDC) accrued in the on-chain fee vault — funds already separated from user pools by the smart contract at settlement time.
The Company's bank accounts receive only: (a) AED from UAE-licensed OTC providers converting protocol fee income, and (b) investor or service-contract payments. No user funds ever pass through Company bank accounts.
2.  Legal Framework and Regulatory Basis
This Policy is adopted and maintained in full compliance with the following legislative and regulatory instruments:
•	Federal Decree-Law No. 10 of 2025 on Combating Money Laundering, Terrorism Financing and the Financing of Proliferation (the "AML Law") — effective 14 October 2025
•	Cabinet Resolution No. 134 of 2025 — Executive Regulations of the AML Law — effective December 2025
•	UAE National AML/CFT/CPF Strategy 2024–2027
•	FATF 40 Recommendations (2023 update) and associated guidance on virtual assets and VASPs
•	Cabinet Decision No. 74 of 2020 — Terrorism Lists Regulation and UN Security Council Resolutions
•	RAK DAO free zone regulations and licence conditions
•	CBUAE AML/CFT Guidance for Licensed Financial Institutions on Risks Related to Virtual Assets and VASPs (February 2023)

This Policy is reviewed annually at minimum and updated within 30 days of any material regulatory change. Version history is maintained at Appendix D.
3.  Governance — Roles and Responsibilities
Role	Holder	Responsibilities
Money Laundering Reporting Officer (MLRO)	[Founder Name], [Title]	Sole AML decision-maker at launch. Receives and assesses all internal suspicion reports. Files STRs/SARs via UAE FIU goAML portal. Approves Policy updates. Maintains all compliance records. Reports quarterly to Senior Management.
Senior Management	Board / Founder(s)	Approves this Policy. Allocates adequate compliance resources. Receives quarterly MLRO report. Sets and documents the Company's risk appetite.
All Staff and Contractors	Any person with system access	Complete AML awareness training within 30 days of engagement. Report any suspicion to MLRO immediately. Must NOT tip off any subject of investigation or STR filing. Maintain confidentiality of all compliance-related information.

As the Company grows beyond 10 full-time employees, a dedicated Compliance Officer (distinct from the MLRO) will be appointed. The Company will register on the UAE FIU goAML portal as a Reporting Entity and on the EOCN Notification Alert System (NAS) at amlctf.gov.ae for real-time sanctions update alerts.
4.  Business Risk Assessment
4.1  Inherent risk profile
The Company has conducted an institutional risk assessment across all material ML/TF/PF risk dimensions relevant to its business model. The non-custodial architecture materially reduces the Company's inherent risk profile compared to centralised VASPs.
Risk dimension	Inherent risk	Mitigating controls	Residual risk	Trend
Pseudonymous on-chain users	Medium–High	Wallet screening (TRM Labs), geofencing, on-chain transparency	Medium	Stable
Cross-border USDC flows	Medium	Non-custodial model; only fee income received by Company	Low	Stable
Sanctioned jurisdiction access	High	IP geofencing + wallet address screening at connection time	Low–Medium	Improving
Smart contract exploitation / theft	Medium	Code audit; deterministic oracle resolution; no admin override of user funds	Low	Stable
Company bank account misuse	Low	Fiat account used only for operating expenses; no user funds received	Very Low	Stable
Proliferation financing (PF) exposure	Medium	OFAC/UN screening covers DPRK and Iran as highest-PF-risk jurisdictions	Low	Stable

	Overall business risk rating: MEDIUM. This rating is reviewed annually. It will be upgraded to HIGH if the Company introduces custodial services, a secondary market, or expands to higher-risk jurisdictions without additional controls.
5.  Geofencing and Jurisdiction Controls
5.1  Blocked jurisdictions — hard block
The Company's frontend application implements access controls enforced at two independent layers: IP geolocation detection and on-chain wallet address screening (Section 6). Users from the following jurisdictions are denied access:
FATF Blacklisted / Comprehensively Sanctioned:
◦	Iran — FATF High-Risk and OFAC comprehensively sanctioned
◦	Myanmar — FATF High-Risk
◦	North Korea (DPRK) — FATF High-Risk, highest PF risk, OFAC comprehensively sanctioned
◦	Cuba, Syria, Crimea/Donetsk/Luhansk regions — OFAC comprehensively sanctioned
Jurisdictions where product is legally prohibited:
◦	Singapore — Gambling Control Act 2022
◦	Thailand — gambling law prohibition on crypto betting
◦	Taiwan — election betting / prediction market prohibition
◦	France — ANJ gambling prohibition (November 2024 enforcement)
◦	United States retail users — pending CFTC Designated Contract Market (DCM) registration

5.2  Enhanced monitoring — FATF Grey-list jurisdictions
Wallet connections originating from FATF Increased Monitoring ("grey-list") jurisdictions are flagged for MLRO review rather than hard-blocked. The FATF grey list is reviewed quarterly at fatf-gafi.org and the Company's geofencing configuration is updated accordingly within 5 business days of any FATF list change.
5.3  Implementation
Geofencing is enforced at the frontend application layer and documented in the Terms of Service published at [URL]. The blocked jurisdiction list is reviewed and updated:
•	Immediately upon any new OFAC/UN sanctions designation
•	Within 5 business days of FATF list updates
•	Within 30 days of any new national regulatory prohibition reaching the Company's knowledge

	Both layers — IP detection AND wallet screening — must pass before a user may interact with the application. Passing IP screening alone is insufficient; wallet addresses are screened independently on every connection.
6.  Wallet Screening and Blockchain Analytics
6.1  Provider and integration
Primary provider: TRM Labs (API integrated into the RetroPick frontend application and the Company's internal monitoring dashboard). Secondary / backup: Chainalysis. The Company maintains active subscriptions to both services and will switch to the secondary provider within 24 hours in the event of primary service disruption.
6.2  Screening triggers and scope
The following screening events are triggered automatically:
•	Every wallet address that connects to the RetroPick frontend is screened at connection time
•	Screening checks: OFAC SDN list, UN Consolidated Sanctions List, UAE Targeted Financial Sanctions List, EU Consolidated Sanctions List, UK HM Treasury Sanctions List, TRM Labs proprietary risk database (darknet markets, mixers, ransomware wallets, known scam addresses, DPRK-associated wallets)
•	Any wallet scoring above the defined risk threshold (TRM risk score ≥ 80/100) is blocked from depositing
•	The Company's own treasury wallet (Gnosis Safe multisig) is screened on each USDC receipt from the fee_vault withdrawal
•	Screening logs are retained for 5 years minimum per UAE AML Law
6.3  Re-screening
All previously approved wallets with open positions (deposited but not yet claimed) are re-screened weekly against updated sanctions lists. Any new positive match triggers: (a) position freeze, (b) MLRO notification within 4 hours, (c) MLRO assessment within 24 hours, and (d) CNMR/PNMR filing via goAML if the match is confirmed.
6.4  What screening does NOT require
	Full KYC identity verification (name, date of birth, ID document) of individual wallet holders is NOT required.
The Company does not collect personally identifiable information from protocol users. Interaction with the smart contract is permissionless.
This is consistent with non-custodial DeFi protocol standards and the current UAE regulatory position on permissionless smart contracts.
Compliance is achieved at the wallet address level (blockchain analytics) rather than the identity level.
7.  Transaction Monitoring — On-Chain and Fiat
7.1  On-chain monitoring
The MLRO, assisted by automated dashboard alerts, monitors on-chain activity via Solana RPC and the market_engine event log (EpochResolved, PositionDeposited, Claimed events). Weekly monitoring reports cover:
•	Total protocol volume by epoch and market type
•	Wallet concentration — any single wallet comprising more than 30% of any epoch pool
•	Unusual claim patterns — claim immediately followed by transfer to a newly created wallet
•	Wallet risk score distribution across active depositors
•	Any wallets that have interacted with known mixers within the prior 30 days
7.2  Red flags triggering MLRO escalation
The following patterns trigger immediate escalation to the MLRO for assessment within 24 hours:
•	Single wallet deposits comprising > 30% of any epoch pool
•	Rapid successive deposits from multiple wallets funded from the same source address (structuring / smurfing pattern)
•	Deposit immediately followed by claim and withdrawal to a new address (rapid layering pattern)
•	Wallets funded by a mixer transaction within the past 30 days
•	Any wallet connecting from a hard-blocked jurisdiction (VPN detected via IP/behaviour correlation)
•	Any wallet newly appearing on a sanctions list post-deposit
•	Unusual spike in protocol volume with no corresponding market event explanation
7.3  Fiat account monitoring
The MLRO reviews all inbound and outbound fiat transactions on Company bank accounts (Wio Bank). The following trigger enhanced review:
•	Any single inbound wire from a counterparty other than Rain or BitOasis (both are UAE-licensed and pre-approved)
•	Any outbound wire to a jurisdiction not pre-approved in the Company's vendor list
•	Any transaction above AED 35,000 not pre-explained in the monthly operating expense plan
8.  Suspicious Transaction Reporting (STR) Procedure
8.1  Internal reporting
Any employee, contractor, or automated system that identifies a red flag must file an Internal Suspicion Report (ISR) with the MLRO within 24 hours using the standard form at Appendix A. The MLRO acknowledges receipt within 4 business hours.
8.2  MLRO assessment and STR filing
1.	MLRO assesses the ISR and determines whether reasonable grounds for suspicion exist — within 48 hours of receipt.
2.	If grounds exist, the MLRO files an STR via the UAE FIU goAML portal (www.uaefiu.gov.ae). For urgent matters (active sanctions match or imminent fund movement), the MLRO contacts the UAE FIU within 4 hours.
3.	All STR decisions (to file or not to file) are documented with reasoning and retained at Appendix B.
4.	After filing, the MLRO monitors the goAML Message Board for FIU response and provides further information as requested.
8.3  Tipping-off prohibition
	TIPPING-OFF PROHIBITION — UAE AML Law Article [X]:
No person may disclose to the subject of an ISR or STR, or to any third party, that a suspicion report has been filed or that an investigation is underway. Violation is a criminal offence under UAE law. Any employee or contractor who tips off a subject will be immediately suspended pending investigation.

8.4  Record retention
All ISRs, STRs, supporting evidence, MLRO assessments, and FIU correspondence are retained for a minimum of 5 years, stored in encrypted cloud storage (restricted to MLRO and designated senior management access).
9.  Sanctions Compliance — Targeted Financial Sanctions (TFS)
9.1  Screening lists
The Company screens against the following lists, updated in real-time via TRM Labs API and supplemented by weekly manual verification:
•	OFAC Specially Designated Nationals (SDN) and Blocked Persons List
•	UN Security Council Consolidated Sanctions List
•	UAE Targeted Financial Sanctions List (Cabinet Decision No. 74 of 2020)
•	EU Consolidated Sanctions List
•	UK HM Treasury Financial Sanctions List
9.2  Proliferation financing (PF)
Consistent with Federal Decree-Law No. 10 of 2025 and FATF Recommendation 7, the Company applies enhanced vigilance for proliferation financing risk. DPRK (North Korea) and Iran are identified as the highest PF-risk jurisdictions and are hard-blocked (Section 5) in addition to being screened at wallet level.
9.3  Match handling — CNMR and PNMR
Report type	Action required
Confirmed Name Match (CNMR)	Immediate asset freeze. MLRO files CNMR via goAML within 24 hours. Notify UAE Executive Office (amlctf.gov.ae). Do NOT tip off subject.
Possible Name Match (PNMR)	MLRO investigates within 48 hours. File PNMR via goAML while investigation is ongoing. Upgrade to CNMR or close with documented reasoning.
OFAC / EU / UK match (non-UAE list)	Consult supervisory authority for guidance. Consider filing STR to UAE FIU. Do NOT use CNMR/PNMR reports for non-UAE-list matches.

9.4  EOCN NAS alert subscription
The Company subscribes to the EOCN Notification Alert System (NAS) at amlctf.gov.ae. The MLRO reviews all NAS alerts immediately upon receipt, including outside business hours. NAS alerts are treated as highest priority — screening must run against any new designations within 2 hours of the alert, including weekends and public holidays.
10.  Record Keeping
The following records are maintained for a minimum of 5 years per UAE AML Law, stored in encrypted, access-controlled cloud storage:
Record category	Content
Wallet screening	All screening results: wallet address, timestamp, risk score, list matched, outcome (pass/block)
Geofencing events	All block events: IP address, timestamp, jurisdiction, reason
On-chain fee withdrawals	Transaction hash, USDC amount, receiving wallet, date
USDC-AED conversion records	OTC trade confirmations, bank statements, linking Solana tx hash to AED receipt
ISRs and STRs	All internal reports, MLRO assessments, filed STRs, FIU correspondence
CNMR / PNMR filings	All match reports and supporting evidence
AML training records	Name, date, module, completion confirmation for all staff
Policy versions	All versions with effective dates and sign-off records

Records are stored in [cloud provider — e.g., Google Workspace / AWS S3] with encryption at rest, multi-factor authentication, and access logging. External access is not permitted without MLRO written authorisation.
11.  AML/CFT/CPF Training
11.1  Training requirements
Training type	Who	Frequency and content
Onboarding AML training	All staff and contractors with system access	Within 30 days of engagement. UAE AML Law basics, red flag indicators, internal reporting procedure, tipping-off prohibition.
Annual refresher	All staff	Every 12 months. Updated for regulatory changes. Minimum 2 hours. Pass score required.
MLRO continuing professional development	MLRO	Minimum 8 hours per year. ACAMS materials, UAE FIU guidance publications, FATF updates.
Regulatory update briefing	MLRO + Senior Management	Within 30 days of any material UAE AML law or FATF guidance change.

Training records (name, date, module, pass confirmation) are maintained in [HR system] and are available to Wio Bank, RAK DAO authority, and UAE regulators upon request.
12.  Sanctions Compliance — Targeted Financial Sanctions
This section supplements Section 9 with operational implementation detail aligned to the 2025 TFS Guidance published by the UAE Executive Office of AML/CFT.
•	The Company screens against both the UAE Local Terrorist List and the UNSC Consolidated List on every wallet connection and weekly for all active wallets.
•	The Company does NOT use CNMR/PNMR reports for matches found only on OFAC, EU, or HMT lists — those trigger STR consideration and supervisory authority consultation.
•	All staff are instructed: a TFS match must never be disclosed to the subject. Attempted bypass of a freeze must be reported to MLRO immediately.
•	The Company's Terms of Service explicitly prohibit use of the protocol by sanctioned persons and disclaim liability for protocol access by sanctioned parties that circumvent geofencing controls.
13.  Record Keeping — Conversion Audit Trail
Every USDC-to-AED conversion must produce a four-point audit trail linking the on-chain protocol event to the AED bank receipt. This is maintained in a Conversion Log (Appendix C):
Point	Record	Description
A	Solana withdraw_fees tx hash	Links fee collection from fee_vault to the underlying epoch settlements
B	USDC transfer tx hash	Gnosis Safe to OTC provider deposit address — shows origin of funds
C	OTC trade confirmation	PDF/email: USDC received, AED amount, exchange rate, reference number
D	Wio Bank inbound wire confirmation	Sending party (Rain/BitOasis), AED amount, OTC reference in payment description

The OTC provider reference number (Point C) must be included in the payment description field of the Wio Bank wire (Point D) so that all four points are traceable in a single search. The MLRO reconciles the Conversion Log against on-chain data and bank statements monthly.
14.  Policy Review and Sign-Off
Item	Detail
Review frequency	Annual (minimum) or within 30 days of material regulatory change
Next scheduled review	[Date + 12 months from effective date]
Trigger for immediate review	New FATF guidance; UAE AML Law amendment; significant change to business model; regulatory inquiry or audit finding
Approved by	[Founder Name]  ·  [Title]  ·  [Date]
MLRO sign-off	[MLRO Name]  ·  [Date]
Version	1.0 — Initial adoption

Authorised signatory

Name: [Founder Name]
Title: [CEO / Director]
Date: _______________	MLRO sign-off

Name: [MLRO Name]
Title: Money Laundering Reporting Officer
Date: _______________

APPENDICES
Appendix A — Internal Suspicion Report (ISR) Form
To be submitted to the MLRO by any employee or automated system within 24 hours of identifying a red flag.
Field	Information to complete
Date and time of detection	
Reported by (name and role)	
Description of suspicious activity or pattern	
Wallet address(es) involved	
On-chain transaction hash(es)	
TRM Labs risk score (if applicable)	
Amount(s) involved (USDC)	
Any action already taken	
MLRO receipt acknowledgement	
MLRO assessment outcome	File STR  /  No file — reason:

Appendix B — STR Decision Log
The MLRO maintains a running log of all ISR outcomes in this register. Never stored with personal data of the subject. Retain 5 years.
ISR ref	Date received	MLRO decision	Date decided	Reasoning / goAML ref
001		Filed STR / No file		
002				

Appendix C — Monthly Conversion Audit Log
Maintained by MLRO. Reconciled monthly against on-chain data and Wio Bank statements.
Date	USDC amount	AED received	Rate	Solana withdraw tx	OTC ref	Wio Bank ref
						
						

Appendix D — Policy Version History
Version	Effective date	Approved by	Summary of changes
1.0	[Date]	[Founder Name]	Initial adoption

END OF POLICY DOCUMENT
