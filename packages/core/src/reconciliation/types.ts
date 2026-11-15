export type Currency = 'KES';

export type PaymentSource = 'import' | 'claim' | 'manual';

/** What kind of rail produced the evidence. Drives dedupe scope and date tolerance. */
export type SourceKind = 'mpesa' | 'bank' | 'cash' | 'manual';

/** unverified: tenant claim awaiting a statement line or manager approval. */
export type PaymentRecordStatus = 'unverified' | 'verified' | 'reversed' | 'rejected';

/** Plain phone hasher shape. Parsers require the branded KeyedPhoneHasher instead. */
export type PhoneHasher = (e164: string) => string;

/**
 * Server-side HMAC of an E.164 number with a versioned key (output like "v1:<hex>"). Never an
 * unkeyed hash: phone numbers are low-entropy and trivially brute-forced.
 */
export type KeyedPhoneHasher = PhoneHasher & { readonly __keyedPhoneHasher: true };

/**
 * Factory contract (pure interface; the HMAC implementation lives in packages/integrations).
 * `secret` comes from validated env; `version` is embedded in the output so keys can rotate.
 */
export type KeyedPhoneHasherFactory = (key: {
  readonly version: string;
  readonly secret: Uint8Array;
}) => KeyedPhoneHasher;

/**
 * Verbatim source line. Contains payer phone numbers and names (personal data): encrypt before
 * persisting, never log, never return to clients. Kept out of PaymentRecord and reconcile output.
 */
export type RawLine = string & { readonly __rawLine: true };

export type PaymentRecord = {
  readonly id: string;
  readonly source: PaymentSource;
  readonly sourceKind: SourceKind;
  readonly sourceAccountId: string;
  /** Claims only: the lease the claimant says this payment is for. Required to verify a claim. */
  readonly claimLeaseId?: string;
  /** Normalised upper-case reference, e.g. M-Pesa receipt "QFT4AB12CD". */
  readonly externalRef?: string;
  /** Minor units (KES cents). */
  readonly amount: bigint;
  readonly currency: Currency;
  /** ISO UTC timestamp. */
  readonly paidAt: string;
  readonly payerName?: string;
  readonly payerPhoneHash?: string;
  /** Normalised account reference, e.g. "B-12". */
  readonly accountRef?: string;
  readonly status: PaymentRecordStatus;
};

/** One parsed evidence line, before ids/source account are attached. */
export type ParsedLine = {
  /** 1-based line number in the input (for error display). */
  readonly row: number;
  readonly sourceKind: SourceKind;
  readonly externalRef?: string;
  readonly amount: bigint;
  readonly currency: Currency;
  readonly paidAt: string;
  readonly payerName?: string;
  readonly payerPhoneHash?: string;
  readonly accountRef?: string;
  readonly payee?: string;
  /** e.g. 'formula_like' (leading = + - @ in a text cell). Neutralise on export. */
  readonly flags?: readonly string[];
  readonly rawLine: RawLine;
};

export type RowError = { readonly row: number; readonly code: string; readonly message: string };

export type ParseOutput = {
  readonly lines: readonly ParsedLine[];
  /** Rows that could not be parsed. Never thrown. */
  readonly rowErrors: readonly RowError[];
  /** Rows intentionally ignored (withdrawals, non-completed, zero paid-in). */
  readonly skipped: number;
  /** SMS only: true when expectedPayees was given and the payee is not among them. */
  readonly payeeMismatch?: boolean;
};

export type ParseOptions = {
  readonly hashPhone: KeyedPhoneHasher;
  /** Injected clock. paidAt outside [now-2y, now+1d] is a row error. */
  readonly now: Date;
  /** Max integer digits in an amount. Default 12. */
  readonly maxIntegerDigits?: number;
};

export type SmsParseOptions = {
  readonly now: Date;
  /** Payee names (e.g. the org's paybill/till name) used to set payeeMismatch. */
  readonly expectedPayees?: readonly string[];
};

export type OpenInvoice = {
  readonly tenantId: string;
  readonly leaseId: string;
  readonly unitCode: string;
  readonly invoiceId: string;
  /** Outstanding balance, minor units. */
  readonly balance: bigint;
  /** Calendar date YYYY-MM-DD. */
  readonly dueDate: string;
};

/** A lease the engine may match a payment to. */
export type MatchCandidate = {
  readonly tenantId: string;
  readonly leaseId: string;
  readonly unitCode: string;
  readonly monthlyRent: bigint;
  /**
   * Payment source accounts (paybill/till/bank) this lease may be paid into. A record is only
   * matched to candidates listing its sourceAccountId. Claims carry a sourceAccountId chosen by the
   * caller from the claimant's own lease sources.
   */
  readonly paymentSourceIds: readonly string[];
  /** Hashes of phone numbers known to pay for this lease. */
  readonly knownPayerPhoneHashes: readonly string[];
  readonly openInvoices: readonly OpenInvoice[];
};

export type MatchTarget = {
  readonly tenantId: string;
  readonly leaseId: string;
  readonly unitCode: string;
};

export type MatchOptions = {
  /** Confidence at or above which the caller may auto-allocate. Default 0.9. */
  readonly autoThreshold?: number;
  /** Days either side of an invoice due date for amount heuristics. Default 15. */
  readonly dateWindowDays?: number;
  /** Top two scores closer than this are ambiguous. Default 0.1. */
  readonly ambiguityMargin?: number;
};

export type ScoredCandidate = {
  readonly target: MatchTarget;
  readonly confidence: number;
  readonly reasons: readonly string[];
};

export type MatchResult = {
  /** Best target, or null when nothing matched or the result is ambiguous. */
  readonly target: MatchTarget | null;
  readonly confidence: number;
  readonly reasons: readonly string[];
  /** target !== null and confidence >= autoThreshold. */
  readonly auto: boolean;
  readonly ambiguous: boolean;
  /** Top scored candidates (max 3) for the one-tap confirm UI. */
  readonly alternatives: readonly ScoredCandidate[];
};

export type Allocation = { readonly invoiceId: string; readonly amount: bigint };

export type AllocationResult = {
  readonly allocations: readonly Allocation[];
  /** Overpayment, becomes tenant credit. Always >= 0. */
  readonly credit: bigint;
};
