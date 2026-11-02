/** "0712345512" or "+254712345512" becomes "0712 ••• 512". */
export function maskPhone(value: string): string {
  const digits = value.replace(/\D/g, '');
  const local = digits.startsWith('254') ? `0${digits.slice(3)}` : digits;
  if (local.length < 7) return '••••';
  return `${local.slice(0, 4)} ••• ${local.slice(-3)}`;
}

/** "12344821" becomes "••••4821". */
export function maskId(value: string): string {
  return `••••${value.slice(-4)}`;
}
