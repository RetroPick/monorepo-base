BUSINESS PLAN
Banking Onboarding Submission

RetroPick Protocol
[Company Name] FZ-LLC  |  RAK DAO, Ras Al Khaimah, UAE

Submitted to: Wio Bank PJSC
Date: [Insert Date]  |  Version 1.0  |  Classification: Confidential

1. Executive Summary
RetroPick is a non-custodial decentralised finance (DeFi) protocol built on the Solana blockchain. The protocol enables users to participate in pooled, oracle-resolved event contracts — structured financial instruments whose outcomes are determined entirely by deterministic on-chain price data published by Pyth Network, a professional-grade oracle service.
[Company Name] FZ-LLC ("the Company") is the legal operating entity incorporated in the RAK Digital Assets Oasis (RAK DAO) free zone, Ras Al Khaimah, United Arab Emirates. The Company operates the RetroPick frontend application, maintains the on-chain smart contract infrastructure, and collects protocol fee income denominated in USDC.
The Company is applying to Wio Bank for a corporate current account to be used exclusively for operating expenses — including infrastructure costs, personnel payments, legal and professional fees, and receipts from licensed OTC providers converting protocol fee income from USDC to AED.
	Critical classification: The Company is NOT a Virtual Asset Service Provider (VASP). The Company does not hold, custody, or control user virtual assets at any point. All user assets are held in program-owned Solana smart contract vaults. The Company's bank account will never receive or transmit end-user funds.

2. Company Information
Legal name	[Company Name] FZ-LLC
Jurisdiction	RAK Digital Assets Oasis (RAK DAO), Ras Al Khaimah, UAE
Trade license number	[RAK DAO License Number]
License type	Digital and Virtual Asset Services
Incorporation date	[Date]
Registered address	[RAK DAO Office Address, Ras Al Khaimah, UAE]
Ultimate beneficial owner(s)	[Founder Full Name(s)], [Nationality], [Passport No.]
Director(s)	[Founder Full Name(s)]
MLRO / Compliance contact	[Name], [Email], [Phone]
Website	https://retropick.io (pre-launch; available on request)

3. Business Model and Protocol Description
3.1 What RetroPick does
RetroPick operates a Solana-based smart contract protocol called market_engine. The protocol allows users to deposit USDC into pooled prediction rounds — short-duration contracts structured around verifiable financial price data. At the end of each round, the protocol reads a price update from Pyth Network's on-chain oracle and automatically distributes the pool to winning participants according to pre-defined, transparent rules embedded in the smart contract.
This is functionally analogous to a binary options instrument resolved by a price oracle. The key distinction from traditional financial intermediaries is that the Company does not act as counterparty, market maker, or custodian at any stage.
3.2 Non-custodial architecture — why the Company is not a VASP
The fundamental technical and legal distinction of RetroPick's design is that all user assets are held in Program Derived Address (PDA) vaults — on-chain accounts whose controlling authority is the smart contract program itself, not the Company's private keys or operational wallets.
The Company cannot unilaterally move user funds. Settlement, refunds, and fee collection are all executed deterministically by on-chain smart contract logic in response to oracle data. The only on-chain action the Company performs is calling the withdraw_fees instruction to collect its protocol fee share from the fee vault — an amount that has already been separated from user funds by the smart contract at settlement time.
The Company DOES	The Company does NOT
Operate the frontend web application	Hold or control user USDC or other assets
Maintain the on-chain smart contract	Execute trades on behalf of users
Collect protocol fee income (USDC)	Operate a centralised exchange or order book
Convert USDC to AED via licensed UAE OTC	Issue, redeem, or administer stablecoins
Pay operational expenses in AED via bank	Transfer user funds between counterparties
Screen wallets for sanctions compliance	Perform Know Your Customer on end users

3.3 Products and market categories
At launch, the protocol supports three oracle-resolved market primitives — Direction (price up or down within a time window), Threshold (price above or below a fixed level at close), and RangeClose (price falls within a defined range bin at close). These primitives are applied to major financial instrument price feeds: BTC/USD, ETH/USD, SOL/USD, XAU/USD (gold), WTI crude oil, and major FX pairs.
All settlement data is sourced exclusively from Pyth Network price feeds — on-chain oracle data published by professional market participants and used by institutional DeFi protocols globally. There is no human-judged settlement, no operator discretion in outcome determination, and no subjective interpretation of results.
The Company explicitly does not offer markets on sports events, political outcomes, entertainment outcomes, or any non-financial subject matter. All markets are financial-instrument-derived and machine-resolvable.

4. Revenue Model and Fund Flows
4.1 How the Company earns revenue
The protocol charges a settlement fee — expressed in basis points of the total round pool — applied at the moment of resolution. This fee is automatically separated by the smart contract into an on-chain fee vault, distinct from user funds. The Company then executes the withdraw_fees smart contract instruction, moving the fee balance to the Company's designated Gnosis Safe multisig wallet (a non-custodial, multi-signature on-chain treasury).
At no stage do user deposit funds pass through the Company's Gnosis Safe or any bank account. The multisig wallet holds only protocol fee income already earned and separated by the smart contract.
4.2 USDC-to-AED conversion flow
The Company converts USDC protocol fee income to AED for operational use through UAE-licensed OTC providers (Rain Financial or BitOasis — both VARA-regulated). Each conversion produces a reference transaction tied to the on-chain withdrawal hash, creating a complete and auditable money trail from smart contract fee vault to bank account.
Step	Action	Description	Account / Entity
1	User deposits	USDC deposited into protocol active vault (Solana PDA)	Smart contract PDA
2	Settlement	Smart contract distributes winnings; separates fee	Smart contract PDA
3	Fee withdrawal	Company calls withdraw_fees; USDC moves to Gnosis Safe	Company Gnosis Safe
4	OTC conversion	USDC sold for AED via licensed UAE OTC provider	Rain / BitOasis
5	AED receipt	AED credited to Company Wio Bank account with OTC reference	Wio Bank account
6	Expenses paid	AED used for infra, salaries, legal, office costs	Wio Bank account

4.3 Expected transaction profile — Wio Bank account
The Wio Bank account will be used solely for the following transaction types:
•	Inbound: AED receipts from Rain Financial or BitOasis following USDC-to-AED OTC conversions. Each inbound payment will include an OTC reference number traceable to the specific Solana transaction hash.
•	Outbound: Salary transfers to UAE-based team members (if applicable). Payments to UAE-registered service providers (legal, accounting, RAK DAO authority fees, cloud infrastructure subscription invoices denominated in AED). RAK DAO annual license renewal fee.
•	No cash transactions. No third-party customer payments inbound or outbound. No international wire transfers to high-risk jurisdictions.

Parameter	Month 1–3 (ramp)	Month 4–12 (growth)
Estimated monthly inbound (AED)	AED 10,000–30,000	AED 50,000–200,000
Inbound transaction count	2–5 OTC conversions	5–15 OTC conversions
Estimated monthly outbound (AED)	AED 8,000–25,000	AED 40,000–150,000
Outbound transaction count	3–8 payments	8–20 payments
Cash transactions	None	None
Currencies	AED primary; USD minor	AED primary; USD minor

5. Compliance and AML/CFT Framework
5.1 Regulatory basis
The Company has adopted a formal AML/CFT/CPF Policy in compliance with Federal Decree-Law No. 10 of 2025 and Cabinet Resolution No. 134 of 2025. A complete copy of the policy is available on request. Key elements are summarised below.
5.2 Jurisdiction controls and geofencing
The RetroPick frontend application implements mandatory access controls at the IP detection layer and wallet screening layer. Users from the following jurisdictions are blocked from accessing the application:
•	FATF High-Risk (blacklisted) jurisdictions: Iran, Myanmar, North Korea (DPRK)
•	OFAC comprehensively sanctioned countries: Cuba, Syria, Crimea, Donetsk, Luhansk, Venezuela (SDN-listed entities)
•	Jurisdictions where the product is legally prohibited: Singapore, Thailand, Taiwan, France, United States (retail, pending CFTC registration)

5.3 Wallet screening
Every wallet address connecting to the RetroPick frontend is screened in real time via TRM Labs blockchain analytics API against: the OFAC SDN list, the UN Consolidated Sanctions List, the UAE Targeted Financial Sanctions list, and TRM Labs' proprietary database of high-risk addresses (darknet markets, ransomware, mixers, known scam wallets). Any wallet scoring above the defined risk threshold is blocked from depositing. Screening logs are retained for a minimum of five years.
5.4 Governance
The Company has appointed [Founder Name] as Money Laundering Reporting Officer (MLRO). The Company is registered on the UAE Financial Intelligence Unit's goAML portal as a reporting entity. Suspicious transaction reports are filed through goAML in accordance with the AML Law. The Company maintains full AML training records for all personnel.
5.5 Source of company funds
The Company's initial capital of AED [amount] was provided by the founder(s) from personal savings. Evidence of source of funds is available on request (personal bank statements, prior employment records). The Company has not received external investment at this stage and has no debt obligations.

6. Founders and Management
The Company is founded and operated by:
Name	Nationality	Role	Background
[Founder Name]	[Nationality]	CEO / MLRO	[Brief background: e.g., 8 years software engineering, previously at X, Y]
[Co-Founder Name, if applicable]	[Nationality]	[Role]	[Background]

Copies of passports, UAE residency visas, Emirates IDs, and personal proof of address for all UBOs are submitted alongside this document.

7. Target Users and Geographic Markets
RetroPick targets retail cryptocurrency users globally, specifically those already active in DeFi ecosystems on Solana. Users interact with the protocol pseudonymously via Solana-compatible wallets (e.g., Phantom, Backpack). The Company does not collect personally identifiable information from protocol users; interaction is permissionless at the smart contract level.
The Company's frontend application enforces the geofencing controls described in Section 5.2. Permitted user geographies at launch include: Southeast Asia (excluding Singapore and Thailand), Latin America, United Kingdom and EU member states, Middle East and Gulf region (excluding OFAC-sanctioned entities), and sub-Saharan Africa.
The Company's banking counterparties are exclusively: UAE-licensed OTC conversion providers (Rain Financial / BitOasis), UAE-registered professional service vendors (legal, accounting, RAK DAO authority), and cloud infrastructure providers invoiced in AED or USD via standard payment methods.

8. Technology Infrastructure
The core smart contract (program ID: [Solana mainnet program address]) is deployed to Solana mainnet. Program upgrade authority is held by the Company's BVI IP holdco entity ([BVI Company Name]) and protected by a multi-signature governance process. The Company operates automated worker bots that execute deterministic on-chain lifecycle instructions (open, lock, resolve epochs) on a scheduled basis.
The frontend is hosted on [cloud provider — e.g., Vercel / AWS]. Infrastructure is operated by the technical team under service agreement with the RAK DAO entity. No user funds are held in any cloud infrastructure. All value settlement occurs on-chain.
The Company has commissioned or plans to commission a professional smart contract security audit prior to mainnet launch. The audit report will be published publicly.

9. Banking Requirements Summary
The Company requests the following from Wio Bank:
Requirement	Detail
Account type	Business current account (AED primary)
Additional currencies	USD sub-account (for OTC conversion receipts where denominated in USD)
Inbound transaction types	AED and USD wire transfers from Rain Financial and BitOasis (licensed UAE OTC)
Outbound transaction types	AED salary transfers; UAE vendor payments; RAK DAO fees; professional services
Online banking	Full digital access via Wio Business app
Debit card	Company debit card for operational expenses
Minimum balance	Zero minimum balance preferred (Essential or Grow plan)
Expected monthly volume	AED 10,000–200,000 inbound (scaling with protocol revenue)

10. Declaration
I, the undersigned, being an authorised representative of [Company Name] FZ-LLC, hereby confirm that:
•	All information provided in this document is accurate, complete, and not misleading.
•	The Company operates in full compliance with applicable UAE law including Federal Decree-Law No. 10 of 2025 and its Executive Regulations.
•	The Company's bank account will be used solely for the purposes described in this document.
•	The Company will promptly notify Wio Bank of any material change to its business model, ownership structure, or regulatory status.
•	The Company consents to Wio Bank conducting due diligence verification of this information.

Authorised signatory:

Name: [Founder Name]
Title: [CEO / Director]
Date: [Date]	Company stamp (if applicable):

[Company Name] FZ-LLC
RAK DAO, Ras Al Khaimah, UAE

	Documents submitted with this business plan:
1. Trade License (RAK DAO FZ-LLC)
2. Certificate of Incorporation
3. Memorandum of Association (signed)
4. Share Certificate(s)
5. Passport copies — all UBOs and directors
6. UAE residency visa and Emirates ID (if applicable)
7. Personal proof of address — all UBOs
8. Source of funds declaration and supporting evidence
9. Corporate structure chart
10. AML/CFT Policy document (v1.0)

END OF DOCUMENT
