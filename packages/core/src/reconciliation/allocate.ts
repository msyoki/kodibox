import { appError, err, ok, type AppError, type Result } from '../result';
import type { AllocationResult, OpenInvoice } from './types';

/**
 * Oldest-due-first allocation. Invoices with non-positive balance are ignored. Allocations plus
 * credit always sum exactly to `amount`; credit is never negative. Deterministic (ties by
 * invoiceId). Errors on amount <= 0.
 */
export const allocate = (
  amount: bigint,
  openInvoices: readonly Pick<OpenInvoice, 'invoiceId' | 'balance' | 'dueDate'>[],
): Result<AllocationResult, AppError> => {
  if (amount <= 0n) return err(appError('invalid_amount', 'Payment amount must be positive.'));
  if (new Set(openInvoices.map((i) => i.invoiceId)).size !== openInvoices.length) {
    return err(appError('duplicate_invoice', 'Duplicate invoice ids in open invoices.'));
  }
  const sorted = openInvoices
    .filter((i) => i.balance > 0n)
    .slice()
    .sort((a, b) =>
      a.dueDate === b.dueDate
        ? a.invoiceId < b.invoiceId
          ? -1
          : a.invoiceId > b.invoiceId
            ? 1
            : 0
        : a.dueDate < b.dueDate
          ? -1
          : 1,
    );
  let remaining = amount;
  const allocations = [];
  for (const inv of sorted) {
    if (remaining === 0n) break;
    const take = remaining < inv.balance ? remaining : inv.balance;
    allocations.push({ invoiceId: inv.invoiceId, amount: take });
    remaining -= take;
  }
  return ok({ allocations, credit: remaining });
};
