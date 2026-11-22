export const DOSSIER_PAGE_SLUG = 'investigacao-lgpd-marco-civil-wmf-wikipedia';
export const DOSSIER_PAGE_TITLE = 'LGPD & Marco Civil Investigation — WMF and Wikipedia';
export const DOSSIER_PAGE_CATEGORY = 'reference';
export const DOSSIER_PAGE_TAGS = ['lgpd', 'marco-civil', 'wmf', 'wikipedia', 'dossier'];
export const DOSSIER_PAGE_SUMMARY =
  'Regulatory compliance dossier examining Wikimedia Foundation and Portuguese Wikipedia under Brazil’s LGPD and Marco Civil da Internet';
export const DOSSIER_PAGE_CONTENT = `:::infobox general
title: LGPD & Marco Civil Investigation — WMF and Wikipedia
subtitle: Regulatory Audit and Legal Compliance
layout: right
Topic: LGPD (Law 13.709/2018) & Marco Civil (Law 12.965/2014)
Analyzed Entity: Wikimedia Foundation (WMF) and Portuguese Wikipedia
Referenced Authorities: ANPD, STF, and the Brazilian Judiciary
Original Source: [Full Dossier in PDF](https://wazzimagiygg.com/Investiga%C3%A7%C3%A3o%20LGPD%20e%20Marco%20Civ%C3%ADl%20WMF%20e%20Wikip%C3%A9dia.pdf)
:::

> **Original PDF document:** [LGPD & Marco Civil Investigation — WMF and Wikipedia (PDF)](https://wazzimagiygg.com/Investiga%C3%A7%C3%A3o%20LGPD%20e%20Marco%20Civ%C3%ADl%20WMF%20e%20Wikip%C3%A9dia.pdf)

## Audit Overview

The analyzed sources indicate that although the Wikimedia Foundation (WMF) and Portuguese Wikipedia operate as non-profit initiatives and apply commercial data-collection minimization principles, the platform exhibits material and regulatory non-compliance across core provisions of Brazil's General Data Protection Law (LGPD — Law No. 13.709/2018) and the Brazilian Internet Bill of Rights (Marco Civil da Internet — Law No. 12.965/2014). The main irregularities and risks identified in the sources fall into the following fronts:

### 1. Exposure of IP Addresses and Historical Liability (LGPD, Arts. 6 and 46)

- **Fact and Irregularity**: For decades, the MediaWiki system publicly exposed the IP addresses (IPv4 and IPv6) of users who edited without logging in, permanently linking them to every edit performed.
- **Regulatory Risk**: An IP address is classified as personal data under Brazilian legislation and regulatory authorities. Although the global masking project (IP Masking / Temporary Accounts) is mitigating exposure for recent edits, the accumulated historical backlog remains public and indexed, enabling malicious re-identification and cross-referencing of Brazilian citizens and minor editors without any technical barrier.

### 2. Discrepancy in Access Log Retention (Marco Civil da Internet, Art. 15)

- **Fact and Irregularity**: Article 15 of the Marco Civil da Internet mandates the confidential retention of application access logs for 6 months (180 days) by professionally organized providers. WMF enforces a global corporate purge policy that destroys internal technical and IP logs after 90 days (3 months).
- **Regulatory Risk**: Early deletion at 90 days breaches Brazilian law and frustrates court-ordered disclosures in criminal investigations and civil inquiries proceeding within the ordinary statutory window.

### 3. Absence of a Data Protection Officer (DPO) in Brazil (LGPD, Art. 41)

- **Fact and Irregularity**: In violation of Article 41 of the LGPD, WMF centralizes its privacy functions within its legal office in California, without publicly designating a Data Protection Officer (DPO) residing in Brazil or maintaining a dedicated Portuguese-language channel under Brazilian jurisdiction.
- **Regulatory Risk**: The absence of a local DPO obstructs streamlined handling of data subject requests from Brazilian residents and formal communication with the ANPD (National Data Protection Authority).

### 4. Conflict Over the Right to Erasure / Vanishing (LGPD, Art. 18)

- **Fact and Irregularity**: The LGPD grants data subjects the potestative right to request deletion or anonymization of their personal data. On Wikipedia, the community policy of Vanishing merely renames the user account to a generic identifier while keeping edit histories, metadata, and talk-page discussions intact under the justification of the Creative Commons (CC-BY-SA) license and encyclopedic preservation.
- **Regulatory Risk**: Permanent removal (Oversight) is conditioned on strict internal community criteria, subordinating rights guaranteed by federal statute to the platform's internal governance rules.

### 5. Lack of Legal Representation in Brazil (Marco Civil, Art. 11 and CPC, Art. 75)

- **Fact and Irregularity**: WMF has no Brazilian tax registration (CNPJ), branch, or legally appointed representative in Brazil. The local association Wiki Movimento Brasil is autonomous and holds no power of legal or judicial representation for the US-based foundation.
- **Regulatory Risk**: The lack of formal local representation forces claimants and courts to issue international Letters Rogatory via the Ministry of Justice to serve WMF in the United States, creating delays incompatible with urgent injunctions and emergency relief in the Brazilian judiciary.

### 6. Anonymous Moderation and Lack of Accountability

- **Fact and Irregularity**: Non-public data inspection tools (such as CheckUser) and content moderation/blocking decisions are delegated to anonymous or pseudonymous volunteers who operate without an employment contract or direct legal supervision from WMF.
- **Regulatory Risk**: Editorial decisions affecting the privacy, reputation, and honor of Brazilian citizens in biographical articles and discussions are administered in an environment lacking direct legal liability and external accountability.

### 7. International Data Transfers and Protection of Minors (LGPD, Arts. 14 and 33)

- **Fact and Irregularity**: WMF transfers data of Brazilian users to servers in the United States without publishing the contractual instruments or safeguards required by Article 33 of the LGPD and ANPD Resolution CD/ANPD No. 19/2024.
- **Regulatory Risk**: The lack of age verification and the historical public exposure of IP addresses belonging to minor editors contradict the comprehensive, reinforced protection mandated by Article 14 of the LGPD and Brazil's Child and Adolescent Statute (ECA).

Within the broader compliance and audit evaluation of the Wikimedia Foundation (WMF) and Portuguese Wikipedia, the reports indicate that while the platform applies access-minimization practices and avoids commercial profiling, it accumulates severe breaches and operational risks under the General Data Protection Law (LGPD — Law No. 13.709/2018). The primary LGPD violations and weaknesses stand out across the following areas:

### 1. Exposure of the Historical Backlog of IP Addresses (LGPD, Arts. 6 and 46)

- **Breach of Minimization and Security Duties**: Under Brazilian law, an IP address qualifies as personal data because it enables direct or indirect identification of the data subject.
- **Established Fact**: While Wikimedia has initiated the global rollout of IP Masking (Temporary Accounts) for recent edits, the historical backlog of unauthenticated edits remains public and indexed in page revision histories (\`action=history\`).
- **Recorded Risk**: This ongoing exposure allows third parties to run automated data scraping and cross-reference historical records with external leaks to identify private citizens and minors, constituting a continuing failure in security and prevention duties.

### 2. Absence of a Data Protection Officer (DPO) in Brazil (LGPD, Art. 41)

- **Non-Compliance with Structural Mandate**: Article 41 of the LGPD and ANPD regulations require data controllers to formally appoint a DPO and publicly disclose clear, objective, accessible contact details for national data subjects.
- **Established Fact**: WMF centralizes privacy operations in its California legal office and provides only the generic institutional address \`privacy@wikimedia.org\`, without formally appointing a DPO or providing a dedicated Portuguese-language channel under ANPD jurisdiction.
- **Recorded Risk**: This represents the most overt and readily verifiable formal infringement, exposing the organization to administrative sanctions and formal warnings by the ANPD.

### 3. Restriction on the Right to Erasure and History Immutability (LGPD, Art. 18)

- **Conflict with Data Subject Rights**: The LGPD guarantees data subjects the potestative right to demand deletion, anonymization, or blocking of personal data.
- **Established Fact**: In Wikipedia's community practice, the Vanishing policy merely renames the account to a generic string while leaving contribution histories, access metadata, and discussion pages intact.
- **Recorded Risk**: Permanent suppression of edits (Oversight) depends on prior approval under strict internal community criteria, placing open-license terms (Creative Commons CC-BY-SA) and encyclopedic immutability above the statutory right to erasure established by federal law.

### 4. Opacity in International Data Transfers (LGPD, Art. 33 and ANPD Resolution No. 19/2024)

- **Lack of Disclosed Safeguard Mechanisms**: Headquartered with central servers in the United States, WMF continuously transfers Brazilian user data abroad.
- **Established Fact**: Both the LGPD and ANPD Resolution CD/ANPD No. 19/2024 require international transfers to rely on specific legal mechanisms (such as standard contractual clauses) and mandate transparent Portuguese-language disclosures naming involved agents, destination countries, and security measures. WMF states only in general terms that data is processed in the US without demonstrating or publishing the contractual guarantees required by the ANPD.

### 5. Vulnerability in Protecting Minors' Data (LGPD, Art. 14)

- **Lack of Reinforced Protection**: Article 14 of the LGPD requires differentiated processing in the best interests of children and adolescents with comprehensive protection.
- **Established Fact**: Because there are no age-verification checks during registration or article editing, IP addresses of minor editors who contributed while logged out remain visible in public revision histories without prior, specific parental or guardian consent.

## Context Within Broader Irregularities (Marco Civil & Governance)

LGPD non-compliance compounds additional regulatory friction points highlighted in the sources:

- **Discrepancy in Log Retention Periods (Marco Civil, Art. 15)**: WMF purges technical access logs after 90 days, failing to meet the mandatory 6-month (180-day) confidential retention period under the Marco Civil da Internet.
- **Jurisdictional Evasion and Lack of Legal Representation (Marco Civil, Art. 11 and CPC, Art. 75)**: The foundation has no CNPJ, branch, or legal representative in Brazil, treating the local association (Wiki Movimento Brasil) as an autonomous entity. Brazilian citizens and courts must therefore rely on Letters Rogatory to the United States for formal service of process, delaying emergency injunctions.
- **Anonymous Moderation and Lack of Accountability**: Administrative actions involving sensitive data access (CheckUser) and moderation of biographies of living persons are carried out by anonymous or pseudonymous volunteers without direct legal oversight or formal accountability mechanisms before local authorities.

## Violation of Article 41 of the LGPD

Analysis of the sources demonstrates that the violation of Article 41 of the LGPD represents the clearest and most straightforward formal regulatory infringement against the Wikimedia Foundation (WMF) in Brazil. Below are the key findings regarding the absence of a Data Protection Officer (DPO) in the country:

### 1. Requirements of LGPD Article 41 and ANPD Rules

- **Statutory Mandate**: Article 41 of the LGPD requires data controllers to appoint a DPO and publicly disclose their identity and contact details in a clear, objective, and accessible manner.
- **Regulatory Requirement (ANPD Resolution CD/ANPD No. 18/2024)**: ANPD regulations require formal designation of the DPO and expressly prohibit channels serving data subjects and the supervisory authority from relying solely on automated systems.

### 2. Concrete Situation of the Wikimedia Foundation

- **Centralization in the US**: WMF centralizes privacy operations within the legal team at its San Francisco, California headquarters, providing only a generic email address (\`privacy@wikimedia.org\`).
- **Asymmetric International Treatment**: The Foundation formally appointed a privacy representative for the European Economic Area (EEA) and the United Kingdom (the law firm Bird & Bird), yet designated and published no equivalent DPO or local representative for Brazil.
- **Independence of the Local Chapter**: The Brazilian association Wiki Movimento Brasil (WMB) lists a DPO strictly for its own autonomous local operations, holding no legal or contractual authority to act as DPO for WMF's global operations.

### 3. Inapplicability of Immunity or Exemption Arguments

- **Extraterritoriality Principle (LGPD, Art. 3)**: WMF's foreign headquarters do not exempt it from Article 41, because the organization processes personal data and provides services to individuals located within Brazilian territory.
- **No Exemption for Non-Profit Entities**: Neither the LGPD nor ANPD Resolution CD/ANPD No. 18/2024 grants a DPO exemption to philanthropic or non-profit organizations.
- **Incompatibility with Small-Agent Status**: The DPO exemption under ANPD Resolution CD/ANPD No. 2/2022 is strictly limited to Small-Scale Processing Agents. Wikipedia's massive traffic (hundreds of millions of monthly visits) and global footprint preclude WMF from qualifying under that category.

### 4. Regulatory Risks and Impact on Data Subjects

- **Obstacle to Exercising Rights (LGPD, Art. 18)**: Without a resident DPO and a dedicated Portuguese-language channel, Brazilian citizens face procedural and linguistic barriers when requesting confirmation, correction, anonymization, or deletion of personal data.
- **Exposure to ANPD Sanctions (LGPD, Art. 52)**: The lack of a DPO constitutes an objective, indisputable statutory breach. In administrative sanctioning proceedings initiated by the ANPD, WMF faces formal warnings with compliance deadlines, daily fines, or restrictions on data-processing activities in Brazil.

## Lack of a DPO with a Dedicated Portuguese-Language Channel

The absence of a formally designated Data Protection Officer (DPO) in Brazil and a dedicated Portuguese-language support channel constitutes one of the most clear-cut, readily verifiable documentary infringements by the Wikimedia Foundation (WMF) under Brazilian law.

### 1. Requirements of LGPD Article 41 and ANPD Resolution CD/ANPD No. 18/2024

- **The Legal Mandate**: Article 41 of the LGPD stipulates that the controller must appoint a DPO and publicly disclose their identity and contact details in a clear, objective, and accessible manner.
- **Ban on Purely Automated Handling**: ANPD Resolution CD/ANPD No. 18/2024 (Art. 11) expressly prohibits contact with data subjects and with the National Data Protection Authority (ANPD) from being conducted exclusively via automated tools or opaque channels.

### 2. Concrete Situation of the Wikimedia Foundation (WMF)

- **Generic International Channel**: WMF centralizes privacy operations in its California legal office and provides only the generic address \`privacy@wikimedia.org\`. No name, title, or contact for a DPO residing in or subject to Brazilian jurisdiction is published.
- **International Compliance Asymmetry**: WMF formally appointed a privacy representative for the European Union and the United Kingdom (Bird & Bird for GDPR compliance), yet established no corresponding arrangement for Brazil.
- **Independence of the Local Chapter (Wiki Movimento Brasil)**: Although Wiki Movimento Brasil (WMB) references a DPO in its internal governance documents, that role applies strictly to the association's own local activities. WMB holds no legal representation or responsibility for WMF's global infrastructure or data processing.

### 3. Incompatibility of Institutional Defenses and Justifications

- **Extraterritoriality Principle (LGPD, Art. 3)**: Being headquartered in the US does not exempt WMF, as it processes data of individuals located in Brazil and offers services aimed at the Brazilian public.
- **No Non-Profit Exemption**: Neither the text of the LGPD nor ANPD regulations exempt philanthropic or non-profit organizations from appointing a DPO.
- **Inapplicability of Small-Scale Exemption**: ANPD Resolution CD/ANPD No. 2/2022 limits exemptions to Small-Scale Processing Agents. The global scale and massive traffic of Portuguese Wikipedia (hundreds of millions of monthly visits) rule out any such classification.

### 4. Regulatory Risks and Consequences

- **Barrier to Exercising Rights (LGPD, Art. 18)**: Lacking a DPO with a Portuguese-language channel creates procedural and linguistic hurdles for Brazilian data subjects seeking confirmation of processing, data correction, or anonymization and deletion of personal data.
- **High Vulnerability to ANPD Sanctions (LGPD, Art. 52)**: Because this is a direct, undisputed factual breach, the ANPD has objective grounds to issue formal warnings with remediation deadlines or impose daily fines and administrative restrictions following proactive inspections or complaints.

## Risk of ANPD Enforcement

The analyzed sources classify the risk of inspection and sanction by the ANPD (National Data Protection Authority) stemming from the lack of a DPO in Brazil as high, representing the most direct and easily provable legal and regulatory vulnerability facing the Wikimedia Foundation (WMF) in the country.

### 1. Direct and Easily Provable Formal Infringement

- **Breach of LGPD Article 41**: Statute expressly requires controllers to designate a DPO and publicly disclose their identity and contact details clearly and objectively.
- **Violation of ANPD Resolution CD/ANPD No. 18/2024**: Regulations prohibit communication with data subjects and the ANPD from relying exclusively on automated systems or generic inboxes. WMF publicly provides only its centralized California inbox (\`privacy@wikimedia.org\`), with no officer or agent formally designated for Brazil.
- **International Compliance Asymmetry**: Sources note that WMF formally appointed a GDPR privacy representative for the EEA and UK (Bird & Bird), yet created no equivalent arrangement under Brazilian jurisdiction.

### 2. Absence of Valid Legal Defenses or Exemptions

- **Extraterritoriality Principle (LGPD, Art. 3)**: US headquarters do not shield the foundation, because it processes data and offers services to individuals in Brazilian territory.
- **Inapplicability of the Small-Agent Exemption**: ANPD Resolution CD/ANPD No. 2/2022 restricts DPO exemptions to small businesses and startups. Given hundreds of millions of monthly visits to Portuguese Wikipedia, WMF's global scale forecloses this exception.
- **No Non-Profit Exemption**: The LGPD and ANPD regulations provide no exemption from the DPO requirement for philanthropic or non-profit organizations.
- **Independence of the Local Chapter**: Wiki Movimento Brasil (WMB) maintains a DPO strictly for its autonomous local activities, without authority over or coverage of global data processing conducted by WMF.

### 3. Statutory Administrative Sanctions and Precedents

- **Exposure to Sanctioning Proceedings (LGPD, Art. 52)**: Faced with data-subject complaints or proactive ANPD audits, WMF's technical defense margin is assessed as very narrow.
- **Formal Warning with Remediation Deadline**: The primary regulatory measure anticipated is a formal warning (Art. 52, II), establishing a fixed deadline for WMF to appoint and publish its DPO in Brazil.
- **Risk of Cumulative Sanctions**: If non-compliance persists, the ANPD is empowered to impose simple or daily fines as well as restrictions or suspensions of data-processing activities.
- **Existing Precedents**: The ANPD has already initiated administrative proceedings and issued formal warnings against controllers for failing to appoint a DPO or obstructing contact channels.

### 4. Impact on Overall Compliance Posture

The absence of a DPO in Brazil undermines the channel for exercising data-subject rights (Art. 18) and exacerbates WMF's exposure across other regulatory friction points, including the historical IP exposure backlog, missing safeguards for international data transfers (Art. 33), and the absence of formal legal representation in the country.

## Violation of Articles 6 and 46

Within the regulatory compliance audit of the Wikimedia Foundation (WMF) and Portuguese Wikipedia, the public exposure of the historical backlog of IP addresses is classified as a critical violation of the principles and duties established by the LGPD (Law No. 13.709/2018), specifically Article 6 (items III and VII) and Article 46.

### 1. Breached Statutory Provisions (LGPD Arts. 6 and 46)

- **Article 6, Item III (Necessity and Minimization Principle)**: Requires personal data processing to be limited to the minimum necessary to achieve its stated purposes, covering only pertinent, proportionate, and non-excessive data.
- **Article 6, Item VII (Security Principle)**: Requires technical and administrative measures capable of protecting personal data from unauthorized access and accidental or unlawful destruction, loss, alteration, communication, or dissemination.
- **Article 46 (Duty of Security and Prevention)**: Obligates processing agents to adopt effective information-security measures to safeguard personal data under their custody.

### 2. Audited Facts and the Nature of IP Addresses

- **IP Address as Personal Data**: Under Brazilian law and regulatory standards (LGPD and Marco Civil), IPv4 and IPv6 addresses are classified as personal data because they enable direct or indirect identification of an individual.
- **Decades of Exposure**: For years, MediaWiki publicly displayed the IP address of any user who edited the encyclopedia without signing into an account, permanently linking that IP to timestamps and edit diffs in page revision histories (\`action=history\`) and abuse logs.

### 3. Insufficiency of IP Masking Regarding Historical Backlog

- **Recent Institutional Measure**: WMF developed and began globally rolling out IP Masking (Temporary Accounts), hiding public IP addresses on new edits and restricting visibility to authorized patrollers for 90 days.
- **Audit Finding**: While masking resolves or mitigates exposure for recent and future edits, it operates purely prospectively. The historical backlog accumulated over decades remains completely public and indexed. A forward-looking technical fix does not cure the infringement stemming from the exposed historical archive.

### 4. Security Risks and Data-Subject Vulnerabilities

- **Data Scraping and Cross-Referencing**: Maintaining this public archive enables third parties to run automated scraping scripts and correlate historical IPs with external data breaches or ISP records, allowing the re-identification and physical geolocation of private citizens who edited in the past.
- **Exposure of Minors**: The lack of age verification and open edit histories resulted in permanent public recording of IP addresses belonging to minor editors who contributed without accounts, breaching the reinforced protection mandated by Article 14 of the LGPD and the Child and Adolescent Statute (ECA).

### 5. Audit Risk Classification

- **Critical Risk Rating (AUD-01 / Q01)**: The audit assigns a CRITICAL risk rating to the historical IP exposure backlog, identifying it as the single most severe security vulnerability in the platform's data layer.
- **Continuing Infringement**: Keeping this historical archive publicly exposed constitutes an ongoing breach of information-security (Art. 46) and data-minimization (Art. 6, III) duties, establishing a solid basis for administrative sanctions by the ANPD.

## Public Edit Histories Without Login

Within the regulatory compliance audit, the maintenance of public histories for edits made without logging in is identified as the root cause of Wikipedia's IP Backlog. Based on the analyzed sources, the core technical, legal, and operational facets break down as follows:

### 1. Unauthenticated Editing and the IP as Personal Data

- **Automatic Public Recording**: For decades, MediaWiki's architecture allowed users to edit encyclopedic articles without registering or logging in, while automatically recording and publicly displaying the editor's full IP address (IPv4 or IPv6) in revision histories (\`action=history\`) and public abuse logs.
- **Legal Classification**: Under Brazilian law (LGPD, Marco Civil, and STJ/ANPD jurisprudence), an IP address is personal data because it directly or indirectly identifies the natural person operating the device.

### 2. Severity of the Accumulated Historical Backlog

- **Continuous Indexed Exposure**: The primary vulnerability flagged by audit reports lies not merely in present edits, but in the vast historical archive accumulated over decades, which remains publicly accessible and indexed by search engines.
- **Risk of Re-identification via Data Scraping**: Any third party can scrape Wikipedia's revision histories and match exposed IPs against external breach databases or ISP disclosures, unmasking the civil identity and physical location of past contributors.

### 3. Prospective Limitations of IP Masking (Temporary Accounts)

- **Recent Technical Deployment**: To address privacy frameworks such as the LGPD and GDPR, the Wikimedia Foundation introduced IP Masking (Temporary Accounts). Under this model, an unauthenticated editor's IP is no longer shown publicly, replaced by a system-generated temporary username while the IP is stored internally for 90 days for abuse prevention.
- **Inadequacy Regarding Past Data**: The audit stresses that this technical measure applies only prospectively to current and future edits, leaving the legacy historical backlog completely untouched and publicly exposed.

### 4. Associated Statutory Infringements and Risks (LGPD and ECA)

- **Breach of Security and Minimization Duties (LGPD, Arts. 6 and 46)**: Keeping this IP archive public violates data minimization and the duty to implement effective information-security safeguards.
- **Heightened Exposure of Minors (LGPD, Art. 14 and ECA)**: Because no age verification existed for editing, minors who contributed while logged out had their IP addresses permanently logged, violating the prioritized protection owed to children and adolescents.
- **Barriers to the Right of Erasure (LGPD, Art. 18)**: Requests to delete or anonymize legacy IP records collide with encyclopedic immutability and the Creative Commons (CC-BY-SA) license. Permanent suppression (Oversight) remains subject to restrictive community procedures, elevating open-license terms above statutory data-subject rights.

## Risk of Re-identification via Data Scraping

In the regulatory audit of the Wikimedia Foundation (WMF) and Portuguese Wikipedia, the risk of re-identification through automated data scraping is highlighted as the most severe technical and legal vulnerability arising from the exposed archive of legacy IP addresses.

### 1. The Data Scraping Mechanism

- **Permanent Indexing**: For more than two decades, MediaWiki recorded and publicly displayed the full IPv4 or IPv6 address of every contributor editing without logging in.
- **Automated Accessibility**: Those records remain permanently stored in page revision histories (\`action=history\`) and public abuse logs (\`Especial:Registo_de_abusos\`), where automated scripts and crawlers (scrapers) can extract them without technical barriers or access controls.

### 2. How Cross-Referencing Enables Re-identification

- **Correlation with External Databases**: The risk goes beyond viewing a standalone IP address; it lies in bulk correlation against external datasets.
- **Breaches and Network Records**: Third parties or malicious actors can use data-mining techniques to match Wikipedia's exposed historical IPs against:
  1. External credential and ISP data-breach dumps;
  2. Server logs and geolocation lookup services;
  3. Identifiers across public forums and social media platforms.
- **Unmasking Civil Identity**: This correlation enables attackers to re-identify the natural person behind an anonymous edit, revealing the full name, physical location, and activity patterns of Brazilian citizens who contributed in the past.

### 3. Limitations of IP Masking Against Historical Scraping

- **Prospective Protection Only**: IP Masking (Temporary Accounts) conceals IP addresses only for current and future edits.
- **Persistence of Historical Liability**: Because IP Masking is non-retroactive, decades of unauthenticated edits remain public, searchable, and indexed by search engines, keeping historical contributors exposed to re-identification.

### 4. Aggravated Risks: Exposure of Minors and LGPD Violations

- **Continuing Breach of LGPD Arts. 6 (III, VII) and 46**: Maintaining this exposed archive breaches information-security and minimization duties over personal data in the platform's custody.
- **Heightened Risk to Minors (LGPD, Art. 14)**: Because no historical age controls were enforced for editing, minors who edited while logged out have their IP addresses permanently exposed to data-scraping tools, undermining the heightened legal protection required under Brazilian law.
- **Risk Classification**: Given the ease of automated extraction and the potential for moral harm and physical safety risks, the audit rates this legacy backlog as CRITICAL (AUD-01).

## Partial Mitigation Through the IP Masking Project

Within the regulatory compliance audit of the Wikimedia Foundation (WMF) and Portuguese Wikipedia, the IP Masking project (also known as Temporary Accounts) represents a meaningful technical step forward, yet is categorized as only a partial mitigation of the structural IP Backlog exposure issue.

### 1. How IP Masking (Temporary Accounts) Works

- **Protection for Recent and Future Edits**: Once Temporary Accounts are enabled on Portuguese Wikipedia, unauthenticated editors no longer have their IP addresses displayed publicly in edit histories; instead, they receive an automatically generated temporary username.
- **Restricted Access and 90-Day Purge**: Under this new architecture, the editor's IP is hidden from the general public, remains visible only to authorized volunteers (such as patrollers and CheckUsers), and is purged from internal servers after 90 days.

### 2. Why the Mitigation Is Considered Only Partial

The audit notes that although IP Masking lowers operational risk in ongoing workflows (reducing current-operation risk from High to MEDIUM), it fails to remediate historical vulnerabilities:

- **Strictly Prospective Scope**: The feature applies solely going forward from activation on each wiki, without retroactive effect on previously stored edits.
- **Persistence of the Indexed Historical Archive**: More than two decades of unauthenticated edits remain fully public, searchable, and indexed across page revision histories (\`action=history\`) and abuse logs.
- **Non-Extinguishment of Prior Violations**: Adopting a forward-looking technical remedy does not extinguish or cure the already-consolidated legal breach caused by continuous prolonged exposure of historical personal data.

### 3. Residual Risks and LGPD Impact

1. **Ongoing Vulnerability to Data Scraping**: Public availability of the legacy archive continues to allow automated scraping and correlation of historical IPs with external breaches to re-identify and locate past editors and minors.
2. **Retention of CRITICAL Risk Rating (AUD-01)**: Because the unprotected legacy archive persists, the audit matrix maintains a CRITICAL risk classification for historical records due to ongoing non-compliance with minimization, security, and prevention principles (LGPD, Arts. 6, III & VII, and Art. 46).
3. **Scrutiny of the 90-Day Internal Window**: Even for edits covered by IP Masking, storing IP addresses internally for 90 days requires clear justification under legitimate interest (LGPD, Art. 7, IX) and passing the legitimate-expectations balancing test (Art. 10), keeping the practice under ANPD scrutiny.

## Violation of Article 18 of the LGPD

In the compliance posture of the Wikimedia Foundation (WMF) and Portuguese Wikipedia, the handling of data-subject rights creates a direct conflict with Article 18 of the LGPD (Law No. 13.709/2018), particularly concerning the potestative right to deletion, anonymization, and suppression of personal data. The audited sources find that encyclopedic architecture and internal platform policies severely restrict the exercise of these rights, generating HIGH-risk regulatory friction.

### 1. Mandate of LGPD Article 18 and Data Subject Primacy

Article 18 of the LGPD (notably items III, IV, and VI) guarantees Brazilian citizens the right to demand that the controller anonymize, block, or delete personal data that is unnecessary, excessive, or processed based on consent. This is a subjective, potestative statutory right that cannot be subordinated to corporate terms of use or internal self-regulation.

### 2. The Illusion of Vanishing (Right to Disappear)

Under Wikipedia's community policies, the formal procedure offered to users wishing to end participation is Vanishing (account renaming). However, the audit highlights that this mechanism is legally insufficient under the LGPD:

- **Partial Anonymization Only**: Vanishing merely renames the user's account to a generic identifier.
- **Retention of Histories and Metadata**: All user contributions, timestamps, and entries on community discussion pages remain public and intact — spaces where old signatures, civil names, personal remarks, and identifying details frequently survive.

### 3. Strict Oversight Restrictions and the "Right to Remember" Doctrine

Permanent, unrestricted removal of edits from public histories (Oversight or suppression) is not offered as a general data-subject right:

- **Strict Community Thresholds**: Total suppression of data is limited to exceptional cases defined internally by the community (such as severe doxxing, grave defamation, or sensitive data involving minors).
- **Conflict Between Free Licensing and LGPD**: WMF opposes systematic removal of edit histories by invoking encyclopedic integrity, the irrevocable Creative Commons Attribution-ShareAlike (CC-BY-SA) public license, and its institutional "Right to Remember" doctrine.
- **Inverted Hierarchy**: In practice, internal community rules and open-license terms are placed above fundamental statutory guarantees enacted by Brazilian federal law.

### 4. Procedural Opacity and Barriers to Exercising Rights

Beyond substantive refusal to erase historical records, exercising Article 18 rights faces procedural obstacles:

- **No Dedicated Local Channel**: WMF routes requests to the generic inbox \`privacy@wikimedia.org\`, without publishing dedicated Portuguese-language procedures or statutory response deadlines (such as the 15-day timeframe).
- **Lack of ANPD Recourse Notice**: The platform does not inform data subjects of their right to petition the National Data Protection Authority (ANPD) if requests are denied.

### 5. Inapplicability of the Journalistic/Academic Exception to Metadata (Art. 4, II)

WMF frequently contends that encyclopedic content qualifies for the statutory exemption covering exclusively journalistic or academic purposes (LGPD, Art. 4, II). However, the audit stresses that this exemption is not a blanket immunity:

- **Metadata and Discussions Are Not Articles**: Processing editors' personal data (IP logs, community talk pages, access metadata, and block logs) is neither journalistic nor encyclopedic in nature and remains fully subject to LGPD deletion and control obligations.

## Incompatibility with the Creative Commons License

In examining restrictions on data erasure on Wikipedia, the sources uncover a central doctrinal and normative clash between the Creative Commons (CC-BY-SA) free license and Article 18 of the LGPD (Law No. 13.709/2018):

### 1. Nature of the Conflict: Irrevocable License vs. Statutory Right

- **Creative Commons License Position (CC-BY-SA)**: Wikipedia operates under the Creative Commons Attribution-ShareAlike license — an irrevocable public licensing contract in which preserving authorship attribution, revision histories, and contribution transparency is treated as essential to the integrity of the commons.
- **LGPD Mandate (Art. 18, III, IV, and VI)**: Brazilian law grants data subjects the subjective, potestative right to demand anonymization, blocking, or deletion of personal data processed under consent or deemed unnecessary/excessive.

### 2. The Vanishing Illusion and Inadequate Community Anonymization

- **The Vanishing Practice**: Wikipedia's community policy for users wishing to "disappear" (\`Wikipedia:Vanishing\`) is limited to renaming the user account to a generic numeric code.
- **Audit Finding**: Sources emphasize that Vanishing provides only partial, legally ineffective anonymization under the LGPD. Every edit made by the user, timestamp metadata, and community talk-page postings remain public and intact, frequently preserving civil names, personal signatures, subjective remarks, and identifying details.

### 3. Hierarchical Supremacy of Public-Order Statutes

- **Private Clauses Cannot Override Federal Law**: The audit report notes that WMF's insistence on an indivisible encyclopedic history — anchored in its institutional "Right to Remember" doctrine — attempts to elevate private licensing terms above mandatory public-order obligations established by federal statute.
- **Subordinating Statutory Rights to Community Filters**: Permanent deletion of records (Oversight / Suppression) is treated not as a user right, but as an exceptional concession conditioned on volunteer moderator approval (for severe doxxing or child privacy). Consequently, Brazilian citizens' statutory rights are overridden by internal self-governance rules.

### 4. Distinguishing Editorial Content from Personal Metadata

- **Journalistic/Academic Exception Does Not Cover Metadata**: While the CC-BY-SA license applies to encyclopedic articles (partially shielded by the academic/informational purpose clause in LGPD Art. 4, II), navigation metadata, historical IP logs, user talk pages, and block records are not encyclopedic articles.
- **Full Application of the LGPD**: Because these records do not constitute the encyclopedic entry itself, they remain fully governed by LGPD erasure duties, and the platform cannot invoke a free-content license to refuse suppression.

## Vanishing Practice Only Renames Accounts

Within the broader restrictions on data erasure on Wikipedia, the community practice of Vanishing (the procedure for the "right to disappear" under \`Wikipedia:Vanishing\`) amounts to purely partial anonymization that fails to satisfy the LGPD:

### 1. How Vanishing Works: Superficial Account Renaming

- **Operational Mechanism**: When a user requests account closure under the Vanishing policy, the system merely alters the username to a numeric code or generic string.
- **Preservation of Content and Metadata**: All user contributions, timestamps, and talk-page archives remain publicly visible and unchanged.
- **Persistence of Personal Identifiers**: Within those discussion pages and community revision logs, former civil-name signatures, contact details, personal narratives, and direct references frequently remain, enabling direct re-identification of the individual.

### 2. Incompatibility with LGPD Article 18

- **Breach of Data Subject Rights**: Article 18 (items III, IV, and VI) entitles data subjects to require anonymization, blocking, or deletion of unnecessary, excessive, or consent-based personal data.
- **Incomplete Anonymization**: Because Vanishing leaves public contribution histories and discussions containing personal data exposed, the audit concludes that the procedure obstructs the effective exercise of statutory erasure rights under federal law.

### 3. Subordinating Law to Community Rules and Open Licensing

- **CC-BY-SA vs. LGPD Conflict**: WMF argues that revision-history integrity and transparency are inseparable from the irrevocable Creative Commons Attribution-ShareAlike (CC-BY-SA) license and its "Right to Remember" doctrine.
- **Severe Restrictions on Oversight**: Complete permanent deletion of revisions (Oversight / Suppression) is withheld as a general right and restricted to rare community-defined exceptions.
- **Private Terms Overriding Federal Statute**: Conditioning real deletion on volunteer moderator filters elevates internal platform rules and licensing clauses above mandatory public-order provisions of the LGPD.

### 4. Audit Risk Classification

- **HIGH Risk Rating (AUD-04 / Q04)**: The audit matrix classifies the inability to achieve genuine data erasure and the subordination of the LGPD to community self-regulation as a HIGH-severity regulatory conflict exposing WMF to ANPD sanctions and compliance orders.

## Violation of Article 14 of the LGPD

Within the regulatory compliance evaluation of the Wikimedia Foundation (WMF) and Portuguese Wikipedia, data governance concerning children and adolescents stands out as one of the most sensitive areas, resulting in direct violations of Article 14 of the LGPD (Law No. 13.709/2018) alongside Brazil's Child and Adolescent Statute (ECA — Law No. 8.069/1990):

### 1. The Reinforced Protection Mandate (LGPD, Art. 14)

- **Differentiated Processing**: Article 14 of the LGPD mandates that personal data of children and adolescents be processed in their best interests under comprehensive, reinforced protection.
- **Parental Consent Requirement**: The statute requires specific, prominent consent from at least one parent or legal guardian whenever children's personal data is processed.

### 2. Absence of Age Verification and Registration Barriers

- **Lack of Controls**: WMF implements no age-verification mechanisms or barriers during account creation or open article editing.
- **Undifferentiated Processing**: The platform handles data flows from minor editors identically to adults, without applying special safeguards or notices aimed at legal guardians.

### 3. Exposure of the Historical IP Backlog

- **Continuous Public Recording**: Minors who edited Wikipedia over decades without logging in had their full IPv4/IPv6 addresses logged and publicly displayed in page revision histories (\`action=history\`).
- **Lack of Authorization**: Recording and ongoing publication of IP addresses (recognized as personal data) occurred without prior consultation or authorization from parents or legal guardians.

### 4. Risk of Re-identification and Data Scraping

- **Vulnerability of Minor Data Subjects**: Keeping these legacy IPs public and indexed exposes minors to automated data-scraping tools.
- **Data Cross-Referencing**: Malicious actors can correlate historical IPs with external breach dumps or ISP records, unmasking the civil identity and physical location of young contributors.

### 5. Audit Risk Classification

- **CRITICAL Risk Rating (Q10 / AUD-01)**: In the consolidated audit matrix, governance of minors' data and historical IP exposure receive a CRITICAL risk classification.
- **Failure in Prevention and Security Duties**: Leaving this archive exposed violates the prevention, minimization, and security principles in Articles 6 (III, VII) and 46 of the LGPD, exposing WMF to severe ANPD administrative sanctions.

## Lack of Strict Age Verification

Concerning the processing of children's and adolescents' data, the sources establish that the absence of strict age verification on Wikipedia and at the Wikimedia Foundation (WMF) directly violates Article 14 of the LGPD and the Child and Adolescent Statute (ECA — Law No. 8.069/1990). Article 14 requires minors' personal data to be processed in their best interests under comprehensive, reinforced safeguards, including specific, prominent consent from at least one parent or legal guardian for children. Audit findings emphasize:

### 1. Lack of Age Gates and Undifferentiated Processing

- **Absence of Controls in Sign-up and Editing**: WMF enforces no age-check mechanisms during registration or open article editing.
- **No Special Safeguards**: Although the foundation claims it minimizes data collection at registration by not asking for age, it processes minor editors' operational data identically to adults, without seeking parental consent or displaying guardian-oriented notices.

### 2. Aggravating Impact of the Historical Minor IP Backlog

- **Continuous Personal Data Exposure**: Minor editors who contributed without logging in across decades had their complete IPv4 and IPv6 addresses permanently recorded in public revision histories (\`action=history\`).
- **Collection Without Parental Consent**: This public logging of personal data occurred without prior parental or guardian consent.
- **Exposure to Data Scraping**: Public availability of the historical backlog exposes young contributors to automated scraping and cross-referencing against external leaks to identify them and pinpoint their physical location.

### 3. Audit Risk Classification

- **CRITICAL Risk Rating (Q10 / AUD-01)**: Minor data governance and historical IP exposure receive a CRITICAL rating in the regulatory matrix.
- **Breach of LGPD Principles**: Lack of age safeguards and retention of the public IP backlog directly breach the necessity (Art. 6, III), security (Art. 6, VII), and prevention (Art. 46) mandates of the LGPD, providing clear grounds for enforcement action by the ANPD and the Public Prosecutor's Office.

## Public Exposure of Minor Editors' IP Addresses

Within minors' data governance, the public exposure of IP addresses belonging to minor editors is identified as one of the gravest vulnerabilities across Wikipedia and the Wikimedia Foundation (WMF), rated at CRITICAL risk:

### 1. Reinforced Protection Mandate (LGPD, Art. 14 and ECA)

- Article 14 of the LGPD, read together with the Child and Adolescent Statute (ECA), mandates processing in the best interests of children and adolescents under comprehensive, heightened safeguards.
- Processing children's data requires specific, prominent consent granted by at least one parent or legal guardian.

### 2. Absence of Age Verification and Undifferentiated Treatment

- WMF imposes no age gates or checks when creating accounts or editing articles without login.
- By neither requesting age declarations nor obtaining parental authorization, the platform processes minors' data identically to adults without specialized safeguards.

### 3. Exposure of the Historical Minor IP Backlog

- For more than two decades (prior to Temporary Accounts / IP Masking), MediaWiki logged and published the full IPv4/IPv6 addresses of unauthenticated editors across revision histories (\`action=history\`) and abuse logs (\`Especial:Registo_de_abusos\`).
- Because numerous minors contributed without accounts or login, their IP addresses — personal data under Brazilian law — were permanently recorded and publicly exposed without parental notice or consent.

### 4. Risk of Data Scraping and Re-identification

- **Non-Retroactivity of IP Masking**: While IP Masking hides IP addresses on current and future edits, it operates prospectively and neither removes nor shields the accumulated historical archive, which remains public and indexed.
- **Civil Identity Re-identification**: Third parties can deploy automated scraping tools to cross-reference exposed minor IPs against external data leaks or provider logs, uncovering the civil identity and physical location of young contributors.

### 5. Compliance Audit Classification

- **Continuing Statutory Breach**: Maintaining this public archive violates minimization (Art. 6, III), security (Art. 6, VII), risk prevention (Art. 46), and heightened protection of minors (Art. 14).
- **CRITICAL Risk (Q10 / AUD-01)**: Rated at CRITICAL severity in the regulatory audit matrix, representing a strong trigger for ANPD and Public Prosecutor enforcement.

## ANPD Resolution No. 19/2024 and Article 33

Under the Wikimedia Foundation's (WMF) global governance model, the continuous flow of Brazilian user data to servers abroad presents a significant regulatory vulnerability under Article 33 of the LGPD (Law No. 13.709/2018) and ANPD Resolution CD/ANPD No. 19/2024:

### 1. Legal Framework: LGPD Art. 33 and ANPD Resolution No. 19/2024

- **Article 33 Rule (LGPD)**: Brazilian law permits international transfers of personal data only when backed by an authorized statutory mechanism — such as an ANPD adequacy decision, standard contractual clauses (SCCs), binding corporate rules (BCRs), or specific, prominent data-subject consent.
- **Transparency Duty (Art. 17 of ANPD Resolution No. 19/2024)**: The regulation requires controllers to provide Brazilian data subjects with clear, accessible Portuguese-language disclosures detailing:
  1. The format, duration, and specific purpose of the transfer;
  2. The destination country;
  3. Identification and contact details of the controller;
  4. Responsibilities of involved agents and security measures adopted;
  5. Mechanisms to exercise data-subject rights and access to full contractual clauses or safeguards upon request.

### 2. Concrete Situation of the Wikimedia Foundation (WMF)

- **Acknowledged Transfers**: WMF's Privacy Policy openly confirms that its headquarters and primary data centers are located in the United States, where Wikipedia user data is stored and processed.
- **Absence of Specified Legal Mechanism**: Although the destination country (US) is disclosed, audit findings show WMF's public documentation neither specifies nor substantiates which Article 33 mechanism legally authorizes the transfer.
- **Lack of ANPD-Compliant Portuguese Disclosures**: WMF provides no dedicated Portuguese statement meeting Article 17 of Resolution No. 19/2024 and does not publish standard contractual clauses or equivalent contractual safeguards.
- **International Compliance Asymmetry**: For the EEA and UK, WMF designated a formal privacy representative (Bird & Bird) under the GDPR, yet established no corresponding contractual arrangement or representation targeting the ANPD or Brazilian law.

### 3. Audit Risk Classification

- **MEDIUM / HIGH Risk Rating**: In the consolidated audit matrix, omitting the statutory international transfer mechanism and failing Resolution No. 19/2024 transparency mandates are rated MEDIUM to HIGH severity.
- **Nature of Non-Compliance**: While this omission does not automatically prove substantive illegality of the data flow itself, it constitutes a formal transparency breach exposing WMF to ANPD information demands and potential enforcement proceedings.

## Lack of Disclosure of Contractual Clauses

Within international data-transfer governance, failing to publish contractual clauses and specific legal transfer mechanisms represents a notable formal and transparency vulnerability for the Wikimedia Foundation (WMF) under Brazilian law:

### 1. Requirements Under LGPD Art. 33 and ANPD Resolution No. 19/2024

- **Transfer Mechanisms (LGPD, Art. 33)**: International personal data transfers must rest on a recognized mechanism such as ANPD adequacy, standard contractual clauses, binding corporate rules, or specific consent.
- **Specific Transparency Duty (Resolution No. 19/2024, Art. 17)**: Controllers must publicly inform Brazilian data subjects in clear Portuguese regarding transfer format, duration, purpose, destination country, controller identity, processing chain, security safeguards, rights mechanisms, and full contractual terms upon request.

### 2. Concrete Situation of the Wikimedia Foundation (WMF)

- **Generic Destination Notice**: WMF's global Privacy Policy states that its primary servers reside in the United States and process user data (including IP addresses and technical logs) there.
- **Omission of Contractual Instruments**: The audit notes that WMF merely states that transfers occur without publishing or proving which Article 33 contractual instrument or legal ground validates the transfer.
- **No Published Standard Clauses**: Public documentation includes neither ANPD-approved standard contractual clauses nor equivalent safeguards tailored to Brazilian data subjects.

### 3. International Compliance Asymmetry

- Sources underscore that WMF demonstrated contractual adaptability elsewhere by appointing Bird & Bird as its EU/UK GDPR representative.
- No equivalent contractual framework or disclosure exists for Brazil, highlighting uneven regulatory compliance across jurisdictions.

### 4. Regulatory Audit Risk Assessment

- **MEDIUM to HIGH Risk Rating**: Omitting transfer mechanisms and contractual texts does not alone prove unlawful data transmission, yet directly breaches transparency obligations under ANPD Resolution No. 19/2024.
- **Inspection Exposure**: In any proactive audit or complaint before the ANPD, this documentary gap narrows the foundation's defense, requiring formal proof of the legal basis for every transfer originating from Brazil.

## Centralized Processing in the US

Centralized data processing in the United States by the Wikimedia Foundation (WMF) forms a primary point of friction in international data transfers regulated by Article 33 of the LGPD (Law No. 13.709/2018) and ANPD Resolution CD/ANPD No. 19/2024:

### 1. Extraterritoriality and Classification of the Data Flow

- **US-Based Infrastructure**: WMF openly states in its Privacy Policy that its headquarters and central data centers are in the United States (San Francisco, California), where browsing records, IP logs, metadata, and account records are stored and processed.
- **Applicability of the LGPD (Art. 3)**: Hosting servers abroad does not displace Brazilian statute. Because WMF processes data of individuals in Brazil and offers Portuguese-language encyclopedic services aimed at the Brazilian public, its operations fall under extraterritorial jurisdiction, making transmissions to the US an International Data Transfer under Brazilian law.

### 2. Omission of the Required Legal Mechanism (LGPD, Art. 33)

- **Statutory Authorization Requirement**: Article 33 mandates valid transfer grounds such as adequacy, standard contractual clauses (SCCs), binding corporate rules (BCRs), or explicit consent.
- **Proof Gap**: While confirming the destination country (US), public WMF documentation does not identify or substantiate which Article 33 instrument legally supports this continuous flow.

### 3. Failure to Meet ANPD Resolution No. 19/2024 Mandates

- **Specific Transparency Obligations**: Article 17 of Resolution No. 19/2024 requires clear Portuguese disclosures covering transfer format, duration, purpose, processor chain, destination country, and availability of contractual clauses.
- **Lack of Localized Documentation**: WMF publishes only global corporate statements without issuing the specific transparency notices and contractual safeguards demanded by the ANPD.

### 4. Asymmetry in International Compliance

- **Jurisdictional Disparity**: WMF appointed a formal privacy representative (Bird & Bird) for the EEA and UK to comply with the GDPR.
- **Lack of Brazilian Structure**: Conversely, it maintains no equivalent contractual arrangement or designated representative before the ANPD or Brazilian courts.

### 5. Audit Risk Classification

- **Risk Assessment (Medium to High)**: Omitting contractual mechanisms and transparency statements constitutes a formal transparency breach under ANPD Resolution No. 19/2024.
- **Institutional Vulnerability**: During any proactive ANPD inspection or proceeding, the lack of published standard contractual clauses narrows WMF's legal defense.

## Violation of Article 15 of the Marco Civil

In auditing the Wikimedia Foundation (WMF) under Brazilian law, violation of Article 15 of the Marco Civil da Internet (Law No. 12.965/2014) is flagged as a critical breach within the broader failure to maintain mandatory access logs:

### 1. Statutory Mandate of Marco Civil Article 15

- **Mandatory Retention Duty**: Article 15 requires incorporated internet application providers operating in an organized, professional manner to retain application access logs under strict confidentiality in a controlled environment for a mandatory period of 6 months (180 days).
- **Purpose of Retention**: Six-month log retention ensures traceability and evidentiary preservation for judicial proceedings, enabling identification of perpetrators in civil and criminal internet offenses.

### 2. WMF Practice and Early Data Destruction

- **Automated 90-Day Purge**: Under internal Wikimedia Data Retention Guidelines and technical logs maintained by the CheckUser extension, WMF enforces an automated purge deleting IP and User-Agent records after 90 days (3 months).
- **Temporal Mismatch**: The platform retains technical logs for exactly half the minimum period mandated by Brazilian statute, erasing evidence while criminal inquiries and civil lawsuits remain well inside the ordinary statutory timeframe.

### 3. Practical Impact on Investigations and Courts

- **Frustration of Court Orders**: Early purging at 90 days defeats court-ordered disclosures in criminal probes and civil defamation/privacy lawsuits progressing at normal judicial timelines in Brazil.
- **Impaired Offender Identification**: By the time law enforcement or injured citizens obtain a judicial disclosure order, the underlying technical records have already been erased from WMF servers.

### 4. Weakness of WMF's Institutional Justifications

- **Global Data-Minimization Argument**: WMF justifies its 90-day ceiling as a privacy measure shielding users from mass state surveillance.
- **Inapplicability of the "Non-Profit" Defense**: Attempting to sidestep Article 15 based on non-profit status is unsupported by the audit. The Marco Civil requires only that operations be conducted "in an organized and professional manner" — criteria clearly met by an organization with a substantial global budget, professional staff, and active fundraising in Brazil in local currency (BRL).

### 5. Audit Risk Classification

- **HIGH Risk Rating (AUD-02 / Q02)**: The audit matrix assigns HIGH risk to this infringement, emphasizing that internal corporate retention policies cannot override mandatory public-order obligations established by federal statute.

## Legal 6-Month Retention Requirement

Within WMF's non-compliance with access-log preservation duties, the statutory 6-month retention mandate forms a core point of conflict with Brazilian law:

1. **Marco Civil Article 15 Mandate**: Article 15 of Law No. 12.965/2014 imposes an imperative statutory obligation on organized, professional internet application providers to preserve application access logs confidentially in a controlled environment for 6 months (180 days) to ensure evidentiary traceability in civil and criminal proceedings.
2. **WMF's Practice — Early 90-Day Purge**: Contrary to this 6-month rule, Wikimedia Data Retention Guidelines mandate automated deletion of IP and User-Agent logs after 90 days (3 months) — half the statutory minimum.
3. **Frustration of Judicial Orders**: Premature deletion undermines court-ordered telematic disclosure warrants; by the time police inquiries or civil damages claims secure court orders, WMF has already purged the logs.
4. **Non-Waivability via Internal Rules or Non-Profit Status**: Non-profit status does not excuse compliance with Article 15, which turns on organized, professional operation — fully satisfied by WMF's multimillion-dollar operations and active BRL fundraising in Brazil. Corporate policies cannot supersede mandatory federal public-order statutes.
5. **Audit Risk Classification**: Rated HIGH risk (AUD-02 / Q02) due to direct disruption of court orders and ongoing Brazilian investigations.

## Violation of Article 11 of the Marco Civil and CPC

In auditing the Wikimedia Foundation (WMF) and Portuguese Wikipedia, the lack of formally constituted legal representation in Brazil is identified as one of the platform's most serious structural vulnerabilities, creating direct conflict with Article 11 of the Marco Civil da Internet (Law No. 12.965/2014) and Article 75 of the Brazilian Code of Civil Procedure (CPC — Law No. 13.105/2015):

### 1. Statutory Mandate (Marco Civil Art. 11 and CPC Art. 75)

- **Extraterritoriality and Submission to Brazilian Law (MCI, Art. 11, § 2)**: The Marco Civil mandates compliance with Brazilian law for any data collection, storage, retention, or processing where at least one act takes place in Brazil, expressly reaching foreign legal entities offering services to the Brazilian public.
- **Standing to Be Sued (CPC, Art. 75, Item X)**: The Code of Civil Procedure requires foreign corporations to be represented in Brazilian courts by the manager, representative, or agent of a branch, agency, or office established in the country.
- **Supreme Federal Court Jurisprudence (STF Theme 987)**: STF rulings on the Marco Civil reinforce that providers operating and serving users in Brazil must maintain a registered seat or legal representative in the country authorized to answer administrative authorities, accept service of process, and comply with court orders.

### 2. WMF's Concrete Posture and Local Chapter Independence

- **No Registration or Local Branch**: Headquartered in San Francisco, California, WMF holds no Brazilian CNPJ tax ID, branch, office, or appointed agent authorized to accept service of process in Brazil.
- **Status of Wiki Movimento Brasil (WMB)**: Although the local non-profit Wiki Movimento Brasil holds its own CNPJ, its bylaws and institutional documents explicitly state that WMB is an independent affiliate/user group without legal, judicial, or data-controller authority for global WMF.
- **International Representation Asymmetry**: While WMF appointed formal privacy representatives in the EEA and UK (Bird & Bird), no comparable arrangement exists under Brazilian jurisdiction.

### 3. Practical Impact: Letters Rogatory and Procedural Delay

- **Reliance on Letters Rogatory**: Without a local agent for service of process, Brazilian courts and injured citizens must serve WMF in the US via international Letters Rogatory transmitted through the Ministry of Justice (DRCI).
- **Incompatibility with Emergency Relief**: Executing Letters Rogatory typically takes months or years, frustrating urgent preliminary injunctions aimed at immediate removal of defamatory content, privacy breaches, slander, or exposed personal and minor data.

### 4. Jurisdictional Evasion and Territorial Nexus

- **Local Fundraising in BRL**: Sources note that WMF actively solicits donations in Brazil through annual fundraising banners denominated in Brazilian Reais (BRL) using local payment processors, alongside massive domestic traffic.
- **Cost Asymmetry**: By deriving operational presence and financial contributions in Brazil while keeping its legal department and servers exclusively in the US, WMF shifts the burden and procedural delays onto Brazilian citizens and courts.

### 5. Audit Risk Classification

- **HIGH Risk Rating (AUD-03 / Q05)**: Lack of local legal representation and jurisdictional evasion receive a HIGH risk classification in the consolidated audit matrix, exposing WMF to formal compliance challenges from the ANPD and domestic courts.

## Wiki Movimento Brasil Is Not a Legal Representative

In the legal audit of the Wikimedia Foundation (WMF) in Brazil, its relationship with Wiki Movimento Brasil (WMB) is central to evaluating the absence of local legal representation:

### 1. Legal Autonomy and Independence of WMB

- **Independent Civil Association**: Wiki Movimento Brasil is an independent Brazilian non-profit association with its own CNPJ, acting as a local affiliate/user group.
- **Lack of Representative Authority**: WMB's bylaws and institutional documentation explicitly confirm that it is not a branch, agency, subsidiary, or legal representative of global WMF.
- **Limited Scope of Governance and DPO**: Any internal governance policies or DPO designation at WMB cover solely the local association's own activities and do not extend to WMF's global servers, infrastructure, or data processing.

### 2. Illusion of Local Presence and Institutional Vacuum

- **Direct Foreign Operation**: WMF operates Wikipedia directly from San Francisco without maintaining a Brazilian CNPJ, physical office, or appointed legal agent.
- **Inability to Serve WMF via WMB**: Because WMB lacks judicial representation or controller powers for WMF, it cannot accept legal service or subpoenas on WMF's behalf.

### 3. Practical Impacts and Regulatory Consequences

- **Delays via Letters Rogatory**: Courts and claimants must resort to international Letters Rogatory via the Ministry of Justice (DRCI) to serve WMF in the United States.
- **Failure of Urgent Injunctions**: Months- or years-long diplomatic service renders urgent preliminary injunctions ineffective against defamation, privacy violations, or minor-data exposure.
- **Conflict with Brazilian Law (CPC, Marco Civil, STF)**: Absence of a local agent collides with CPC Art. 75(X), Marco Civil Art. 11(§ 2), and STF Theme 987 (item 10), which require active providers in Brazil to maintain a local legal representative empowered to respond to authorities and court orders.

## Article 19 of the Marco Civil and the LGPD

Within the regulatory audit of the Wikimedia Foundation (WMF) and Portuguese Wikipedia, the interplay between Article 19 of the Marco Civil da Internet (MCI) and the LGPD exposes a severe problem of Unaccountable Community Moderation:

### 1. The Article 19 Regime and Legal Shielding

- **Judicial Order Requirement**: Marco Civil Article 19 stipulates that application providers incur civil liability for third-party content only if they fail to comply with a specific court order for removal.
- **STF Jurisprudence (Themes 987 and 533)**: While the Supreme Federal Court recognized Wikipedia's low editorial intervention and collaborative curation model in requiring court orders for honor-related torts, WMF and the community use that rule as an extrajudicial shield.
- **Use as Extrajudicial Immunity**: Direct extrajudicial notices and complaints from citizens harmed by defamation or exposed personal data are routinely dismissed, forcing individuals to sue a foreign foundation headquartered in the US.

### 2. Anonymous Moderation and Lack of Accountability (LGPD, Art. 20)

- **Pseudonymous Governance**: On Portuguese Wikipedia, editorial and administrative control over biographies, page deletions, user blocks, and access to non-public data rests with volunteers (administrators, bureaucrats, CheckUsers) acting under pseudonyms with no employment or contractual link to WMF.
- **Conflict with LGPD and Constitutional Guarantees**: Community rulings directly impact personality rights, honor, and privacy (CF/88 Art. 5, X and LGPD Art. 20), yet offer no mechanism for independent review or direct legal accountability over anonymous moderators.
- **Subordinating Federal Law to Internal Rules**: Data-subject erasure requests are systematically denied on grounds of "encyclopedic notability," bureaucratic policies, or the Creative Commons (CC-BY-SA) license, placing community bylaws above Brazilian public-order statutes.

### 3. Limits of the Journalistic/Academic Exception (LGPD, Art. 4, II)

- **No Responsible Editorial Board**: WMF often invokes the LGPD's journalistic/academic exemption (Art. 4, II). The audit stresses that this exemption is not an absolute safe harbor because Wikipedia operates via anonymous crowdsourcing without a formal editorial board or professional fact-checking.
- **Coverage of Metadata and Discussions**: Even where encyclopedic entries serve informational ends, contributor metadata, block logs, IP histories, and community user talk pages are neither journalistic nor academic and remain fully subject to the LGPD.

### 4. Responsibility Vacuum and "Corporate Shielding"

- **Asymmetric Decentralization**: WMF claims it neither interferes in content nor supervises volunteers, while volunteer editors assert they lack legal personality to answer for platform infrastructure.
- **Regulatory Grey Zone**: This architecture creates a regulatory vacuum in which harmed citizens can hold neither the foreign foundation (lacking Brazilian representation) nor local anonymous moderators administratively accountable.

## Editorial Decisions by Anonymous Volunteers

In the compliance audit of the Wikimedia Foundation (WMF) and Portuguese Wikipedia, editorial decision-making by anonymous volunteers is identified as the core driver of Unaccountable Community Moderation:

### 1. Pseudonymous Governance and Absence of Formal Ties

- **Pseudonymous Action**: Control over article retention, deletions, account blocks, and administrative tools on Portuguese Wikipedia is exercised by anonymous or pseudonymous volunteers (administrators, bureaucrats, CheckUsers).
- **No Contractual Relationship**: These moderators have no employment contract, agency agreement, or direct legal subordination to WMF.
- **Accountability Vacuum**: Because WMF disclaims supervision over the editorial community while volunteers lack legal standing, high-impact decisions affecting third parties occur without direct civil liability or legal accountability in Brazil.

### 2. Impact on Personality Rights and Conflict with the LGPD

- **Breach of LGPD Art. 20 and Constitutional Protections**: Community rulings directly affect citizens' honor, image, privacy, and data protection (CF/88 Art. 5, X; LGPD Art. 20) without due-process guarantees or timely legal review.
- **Subjective Internal Gatekeeping**: Requests by private citizens for removal or de-indexing (e.g., biographies of non-notable individuals or concluded legal proceedings) are frequently rejected under subjective "notability" rules or CC-BY-SA licensing claims, elevating internal policies over federal public-order law.

### 3. Limits of the Journalistic/Academic Exception (LGPD, Art. 4, II)

- **Absence of Editorial Oversight**: Relying on anonymous crowdsourcing without an accountable editorial board undermines blanket claims to the LGPD Art. 4, II journalistic/academic exemption.
- **Application to Metadata and Talk Pages**: Contributor metadata, block records, IP logs, and community discussions are non-encyclopedic and remain fully governed by LGPD data-protection rules.

### 4. Audit Risk Classification

- **MEDIUM to HIGH Risk Rating (AUD-05 / Q07)**: The audit matrix flags this unaccountable anonymous governance structure as a major compliance failure, describing Portuguese Wikipedia's community operations as a zone of regulatory anomie within Brazil.

## Absence of External Legal Oversight

Within the regulatory audit of the Wikimedia Foundation (WMF) and Portuguese Wikipedia, the lack of external legal oversight over editorial decisions is highlighted as a structural pillar of Unaccountable Community Moderation:

### 1. Asymmetric Decentralization and Lack of Direct Supervision

- **Institutional Division of Roles**: WMF publicly states that it manages technical infrastructure and servers alone, refraining from controlling, supervising, or reviewing editorial decisions made by volunteers.
- **Pseudonymous Governance**: Decisions over living-person biographies, page deletions, user blocks, and sensitive-data access are executed by anonymous/pseudonymous volunteers.
- **No Contractual Subordination**: Because moderators lack contractual ties to WMF and the foundation refuses editorial oversight, consequential actions affecting third parties escape direct corporate or legal control.

### 2. Accountability Vacuum and LGPD Infringement

- **Conflict with LGPD Art. 20 and Constitution**: Community actions impact honor, privacy, and data protection without due-process safeguards or review by an accountable legal authority.
- **Subordinating Statute to Community Policy**: Requests for removal, deletion, or correction of personal data are routinely denied using subjective "encyclopedic notability" standards or CC-BY-SA terms, placing internal rules above federal public-order law.

### 3. Failure of the Journalistic/Academic Exemption (LGPD, Art. 4, II)

- **No Professional Editorial Staff**: Anonymous crowdsourcing without a responsible editorial board or legal oversight weakens broad reliance on Article 4, II exemptions.
- **Non-Journalistic Metadata**: Editor metadata, block logs, IP archives, and talk-page discussions fall squarely under LGPD compliance scrutiny.

### 4. Audit Risk Classification

- **MEDIUM to HIGH Risk Rating (AUD-05 / Q07)**: Decentralized community governance devoid of external legal oversight is rated MEDIUM to HIGH risk, creating a regulatory gap where injured citizens cannot directly hold either the foreign foundation or anonymous moderators accountable.

## Resistance to Extrajudicial Requests

Within the compliance evaluation of the Wikimedia Foundation (WMF) and Portuguese Wikipedia, systematic resistance to extrajudicial takedown or data-removal requests is identified as a primary symptom of Unaccountable Community Moderation:

### 1. Marco Civil Article 19 as a Legal Shield

- **Court-Order Condition**: Article 19 conditions provider civil liability for third-party content on non-compliance with a specific judicial order.
- **Rejection of Extrajudicial Notices**: WMF and community moderators leverage this standard to systematically reject direct extrajudicial notices from citizens harmed by defamation, falsehoods, or exposed personal data, demanding either foreign litigation or submission to internal community queues.

### 2. Lack of Fast, Transparent Administrative Channels

- **Ineffective Reassessment**: While court-order rules aim to curb private censorship, the platform fails to offer fast, transparent, legally competent administrative channels to remedy clear violations of personality and data-protection rights.
- **Routing to Volunteer Queues**: Data-subject petitions are routed to volunteer response teams (VRT/OTRS) or public community talk pages, where non-lawyers adjudicate legal rights.

### 3. Elevating Self-Regulation and Free Licensing Above the LGPD

- **Subjective Editorial Criteria**: De-indexing, correction, or erasure petitions (including non-public biographies or expunged cases) are frequently denied under subjective "notability" doctrines, the "Right to Remember," or the Creative Commons (CC-BY-SA) license.
- **Conflict with Federal Statute**: This posture subordinates the statutory potestative rights of deletion and anonymization under LGPD Article 18 to private licensing contracts and internal community bylaws.

### 4. Cost Asymmetry and Accountability Vacuum

- **Pseudonymous Governance**: With anonymous volunteers lacking contractual ties and WMF disclaiming editorial control, no domestic entity takes administrative responsibility for adverse rulings.
- **Burden on Citizens**: Combining anonymous moderation, rejection of extrajudicial notices, and the absence of Brazilian legal representation forces harmed citizens either to finance international litigation (via Letters Rogatory) or endure ongoing exposure of their personal data.

## Sources and References

Below are the primary legal statutes, Brazilian regulatory instruments, official Wikimedia Foundation governance/privacy policies, and Portuguese Wikipedia guidelines cited in the original audit dossier:

### 1. Brazilian Legislation and Regulation (Planalto, Chamber of Deputies, and ANPD)

- **General Data Protection Law (LGPD — Law No. 13.709/2018)**: Official text on the Legislation Portal and Chamber of Deputies.
- **Marco Civil da Internet (Law No. 12.965/2014)**: Official text on the Legislation Portal.
- **Brazilian Code of Civil Procedure (CPC — Law No. 13.105/2015)**: Official text on the Legislation Portal.
- **Brazilian Penal Code (Decree-Law No. 2.848/1940)**: Official text on the Legislation Portal.
- **Child and Adolescent Statute (ECA — Law No. 8.069/1990)**: Official text on the Legislation Portal.
- **Decree No. 8.771/2016 (Marco Civil Implementing Regulation)**: Official text on the Legislation Portal.
- **ANPD Resolution CD/ANPD No. 19/2024 (International Data Transfers)**: Official text on the ANPD Portal.
- **National Data Protection Authority (ANPD) Official Portal**: Access via ANPD Portal.

### 2. Wikimedia Foundation Institutional Documents (Governance & Privacy)

- **Wikimedia Foundation Privacy Policy**: Official WMF Privacy Policy.
- **Wikimedia Data Retention Guidelines**: Official Retention Policy.
- **Wikimedia Foundation Terms of Use**: Official Terms of Use.
- **IP Masking / Temporary Accounts Project**: MediaWiki technical documentation on Temporary Accounts.
- **Wikimedia Transparency Reports**: Official Transparency Report Portal.
- **WMF Legal and Safety Information**: Official Legal & Safety Notices.
- **Access to Nonpublic Personal Data Policy**: Wikimedia Foundation Nonpublic Data Policy.
- **WMF Legal Department & Official Contact**: Wikimedia Foundation Contact Page.

### 3. Portuguese Wikipedia Community & Technical Policies (pt.wikipedia.org)

- **Biographies of Living Persons (WP:BLP)**: \`Wikipédia:Biografias de pessoas vivas\`.
- **Right to Vanish / Account Renaming (WP:Vanishing)**: \`Wikipédia:Direito a desaparecer\`.
- **Revision Suppression (WP:Oversight)**: \`Wikipédia:Supressão\`.
- **Account Checking Policy (WP:CheckUser)**: Official CheckUser policy on Meta-Wiki.
- **Volunteer Response Team (WP:VRT / formerly OTRS)**: \`Wikipédia:Equipe de Resposta Voluntária\`.

### 4. Local Chapter, Licensing, and Supreme Federal Court (STF) Jurisprudence

- **Wiki Movimento Brasil (WMB)**: Bylaws and documentation on Meta-Wiki, Statement on Representation on Wikipedia, and Official WMB Portal.
- **Creative Commons Attribution-ShareAlike 4.0 (CC BY-SA 4.0)**: Official Creative Commons Legal Code.
- **STF — General Repercussion Theme 987**: Supreme Federal Court Theme 987.
- **STF — General Repercussion Theme 533**: Supreme Federal Court Theme 533.
- **STF Ruling on Marco Civil da Internet**: Official STF Thesis Summary (PDF).`;
