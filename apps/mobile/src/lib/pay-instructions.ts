import { LANDLORD_NAME, PAYBILL_PLACEHOLDER, TENANT_ACCOUNT } from '@kodibox/demo';

/**
 * The landlord's own payment instructions (demo placeholders, never real numbers). Rent is paid
 * outside Kodibox: tenants pay the landlord directly and quote their unit code as the reference.
 */
export const PAY_INSTRUCTIONS = {
  payee: LANDLORD_NAME,
  paybill: PAYBILL_PLACEHOLDER,
  till: '000222',
  bankName: 'Demo Bank',
  bankAccount: '0000 1111 2222',
  accountRef: TENANT_ACCOUNT,
} as const;

export const PAY_STEPS = [
  'M-Pesa',
  'Lipa na M-Pesa',
  'Pay Bill',
  'Business no.',
  'Account no.',
  'Amount',
] as const;
