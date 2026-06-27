# Covert: 3-Minute Video Script
## Zama Season 3 Builder Track

**Target length:** 3:00 (180 seconds)
**Format:** Screen recording with voiceover. Show the actual UI in action.
**Tone:** Confident, direct. No filler. Every sentence earns its time.

---

## SECTION 1 - The Problem (0:00 - 0:30)

**[Screen: blank dark background or just the home page, wallet not connected]**

> "Every company that pays people has an unspoken rule: compensation is private.
>
> When salaries are public, things break. Resentment, politics, poaching. This is why HR keeps payroll locked behind systems that nobody outside finance can see.
>
> But here is the problem: blockchain is fully transparent. Every transaction, every wallet, every amount, visible to anyone.
>
> If you run payroll on-chain today, any employee can pull up Etherscan and reconstruct the entire salary structure of your organization. This is why no serious company pays on-chain."

---

## SECTION 2 - Why FHE (0:30 - 1:00)

**[Screen: stay on home page or switch to a simple architecture slide]**

> "You might think: encrypt the salaries. But standard encryption breaks the moment a contract needs to compute on the data. To add up salaries, the contract has to decrypt first. And once it decrypts on Ethereum, every node sees it.
>
> ZK proofs can prove facts without revealing them, but they cannot do the general arithmetic that payroll requires.
>
> Fully Homomorphic Encryption is different. FHE lets a smart contract add, compare, and process encrypted values without ever decrypting them. The math computes on ciphertext. The result is ciphertext. Nobody holds a key during the computation.
>
> This is what Zama's FHEVM gives us. And it is the only way Covert is possible."

---

## SECTION 3 - Demo: Employer (1:00 - 1:40)

**[Screen: connect employer wallet, auto-route to /employer]**

> "Connect the employer wallet. The app reads the role from the contract and routes automatically."

**[Screen: fill in the payroll form with 3 employees and salary amounts]**

> "The employer adds employees and enters salary amounts. When they click Upload, fhevmjs encrypts each salary amount in the browser using TFHE before the transaction is even signed."

**[Screen: MetaMask opens for the upload transaction]**

> "One transaction. The contract receives ciphertext handles. No salary figure ever touches the blockchain in plaintext."

**[Screen: click Trigger Distribution]**

> "Trigger distribution. Encrypted cUSDT, Zama's confidential USDT token, is sent to each wallet. The transfer amounts are encrypted. The blockchain shows that a transfer happened. It does not show how much."

---

## SECTION 4 - Demo: Employee (1:40 - 2:15)

**[Screen: switch to employee wallet, auto-route to /employee, show blurred payslip card]**

> "Switch to an employee wallet. Salary shows as a blurred encrypted placeholder. The number is on-chain but nobody can read it without permission."

**[Screen: click Decrypt My Salary, MetaMask opens EIP-712 signature prompt]**

> "Click Decrypt. The browser generates an ephemeral keypair. MetaMask opens for an EIP-712 signature, no gas, just a signature proving identity."

**[Screen: salary amount reveals with animation]**

> "The contract re-encrypts the salary specifically for the employee's public key and sends it back. The browser decrypts locally. The number is visible here, in this session, in this browser tab. It never crossed the network in plaintext."

**[Screen: scroll to peer bonus panel, send a bonus to another address]**

> "Employees also hold an encrypted peer bonus budget. They can send bonuses to colleagues. The amount is encrypted before leaving the browser. The recipient sees their budget go up. Nobody else sees anything."

---

## SECTION 5 - Demo: Auditor (2:15 - 2:40)

**[Screen: switch to auditor wallet, auto-route to /auditor, show encrypted stat cards]**

> "Now the auditor. A board member or DAO treasurer who needs to verify the organization actually paid what it claims. They connect, they see employee count and cycle count, but the financial totals are encrypted."

**[Screen: click Decrypt Aggregate View, MetaMask signature, totals reveal]**

> "One signature. Total disbursed and total bonuses allocated reveal. These are real sums computed inside the encrypted domain. The contract added up encrypted values and returned an encrypted aggregate. The auditor decrypts the total. They never see individual salaries. The contract enforces this at the bytecode level."

---

## SECTION 6 - Close (2:40 - 3:00)

**[Screen: back to home page or repo]**

> "Covert is confidential on-chain compensation. Salaries encrypted in the browser. Computed on-chain without decryption. Paid as encrypted tokens. Verified by auditors without exposing individuals.
>
> No trusted server. No ZK circuit. No hardware assumption. Just FHE.
>
> Built on Zama FHEVM for the Season 3 Builder Track.
>
> GitHub: github.com/MarvyNwaokobia/Covert"

---

## Recording Notes

- **Wallet setup before recording:** Have employer, 3 employee, and auditor wallets pre-funded on Sepolia. Run the seed script beforehand so there is already one payroll cycle on-chain when recording starts.
- **Keep mouse movements deliberate.** Pause on each UI state for 1-2 seconds before narrating. Do not narrate while clicking; narrate after the result loads.
- **EIP-712 signature prompt:** When MetaMask opens, scroll down so the typed data fields are visible. This is the payoff moment: the judge can see the structured message being signed.
- **The payslip reveal animation** is the visual centerpiece. Let it complete before moving on.
- **Auditor section:** After the totals reveal, pan back to show the stat cards. Consider hovering over the privacy guarantee section briefly to reinforce what the auditor *cannot* see.
- **No intro slide needed.** Start directly on the running app. Put the project name in the video title/description, not as a 10-second title card.

---

## Backup: If Contract Is Not Deployed

If the contract is not on Sepolia when you record:

1. Use the UI walkthrough only: show the payroll form filling in, explain that clicking Submit would encrypt and send
2. Show the payslip card in its encrypted state and walk through the EIP-712 flow verbally
3. Record the signature prompt from a local hardhat node if needed
4. Emphasize the architecture diagram from SUBMISSION.md

The FHE story stands on its own even without a live mainnet transaction.
