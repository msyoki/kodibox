# 0003. Kodibox never holds client funds

- Status: Accepted
- Date: 2026-11-02

## Context
Rent collection can be built two ways: (a) collect rent into a platform account and disburse to landlords, or (b) let tenants pay directly into the landlord's own paybill, till or bank account while the platform observes and reconciles. Option (a) likely makes Kodibox a payment service provider under the National Payment System Act 2011 (CBK authorisation, trust account, capital requirements, AML/CFT obligations), concentrates fraud risk, and creates settlement liability. Landlords also distrust platforms that hold their money.

## Decision
- Payments go **straight to the landlord's own** paybill/till/bank account. Kodibox only reads (C2B confirmations, STK Push callbacks, bank callbacks/statements) and reconciles.
- STK Push is initiated against the landlord's shortcode using credentials the landlord authorises; funds never touch a Kodibox account.
- Kodibox subscription fees are billed separately from our own account, never netted from rent.
- Ledger "cash" accounts are memo records of what the landlord's account received.
- Deposit refunds and landlord remittances are paid by the landlord (or the agent from the agent's own accounts, under their own arrangements) and merely recorded in Kodibox.
- Any feature routing money through a Kodibox account (wallets, pooled collection, payouts, float) requires a new ADR and prior legal review before work starts.

## Consequences
- Lower regulatory burden and risk; clearer trust story for landlords.
- Onboarding needs landlords to hold a paybill/till/bank account and supply Daraja credentials (stored encrypted); setup friction is higher than a pooled model.
- We cannot guarantee settlement or offer instant payouts, advances or float products.
- Reconciliation quality is the core product value, so webhook reliability and the unmatched queue are critical.
- Agencies that collect for multiple landlords into their own account do so under their own responsibilities; Kodibox provides sub-ledgers and statements, not custody.
