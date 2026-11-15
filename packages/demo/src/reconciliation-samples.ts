/** Synthetic sample evidence for demoing statement import and tenant claims. Fake names and +254700... numbers only. */

const CRLF = String.fromCharCode(13, 10);

const HEADER =
  'Receipt No.,Completion Time,Initiation Time,Details,Transaction Status,Paid In,Withdrawn,Balance,Balance Confirmed,Reason Type,Other Party Info,Linked Transaction ID,A/C No.';

const ROWS = [
  'QFT4AB12CD,2026-03-11 09:14:02,2026-03-11 09:13:50,Pay Bill Online Payment,Completed,"12,000.00",,"1,012,000.00",True,Pay Bill Online,254700000001 - JOHN DOE,,B-12',
  'QFT4AB12CE,2026-03-11 10:02:11,2026-03-11 10:02:00,Pay Bill Online Payment,Completed,"15,500.00",,"1,027,500.00",True,Pay Bill Online,254700000002 - JANE ROE,,b 14',
  'QFT4AB12CF,2026-03-11 11:30:45,2026-03-11 11:30:30,Pay Bill Online Payment,Completed,"8,000.00",,"1,035,500.00",True,Pay Bill Online,254700000003 - SAMPLE PAYER,,',
  'QFT4AB12CG,2026-03-11 12:00:00,2026-03-11 11:59:50,Pay Bill Online Payment,Failed,"9,000.00",,"1,035,500.00",True,Pay Bill Online,254700000004 - FAILED PAYER,,B-15',
  'QFT4AB12CH,2026-03-12 08:00:00,2026-03-12 07:59:00,Business Payment to LANDLORD,Completed,,"50,000.00","985,500.00",True,Business Payment,254700000099 - LANDLORD ONE,,',
  'QFT4AB12CD,2026-03-11 09:14:02,2026-03-11 09:13:50,Pay Bill Online Payment,Completed,"12,000.00",,"1,012,000.00",True,Pay Bill Online,254700000001 - JOHN DOE,,B-12',
  'QFT4AB12CJ,2026-03-12 14:20:10,2026-03-12 14:20:00,Pay Bill Online Payment,Completed,"20,000.00",,"1,005,500.00",True,Pay Bill Online,"254700000005 - DOE, JANE",,RENT B12',
  'QFT4AB12CK,12-03-2026 15:45:00,12-03-2026 15:44:50,Pay Bill Online Payment,Completed,"12,000.00",,"1,017,500.00",True,Pay Bill Online,254700000006 - TEST TENANT,,C-03',
  'QFT4AB12CL,2026-03-13 09:00:00,2026-03-13 08:59:50,Pay Bill Online Payment,Completed,"12,00x.00",,"1,017,500.00",True,Pay Bill Online,254700000007 - BAD AMOUNT,,B-16',
  'QFT4AB12CN,2026-03-13 16:00:00,2026-03-13 15:59:50,Pay Bill Charge,Completed,,35.00,"1,022,465.00",True,Charges,,,',
  'QFT4AB12CQ,2026-03-14 18:30:00,2026-03-14 18:29:40,Pay Bill Online Payment,Completed,"1,250.50",,"1,023,715.50",True,Pay Bill Online,2547****0010 - MASKED PAYER,,B-19',
];

const META = [
  'Organization Name:,RIVERSIDE COURT (DEMO),,,,,,,,,,,',
  'Short Code:,000000,,,,,,,,,,,',
  'Statement Period:,01-03-2026 - 14-03-2026,,,,,,,,,,,',
];

/** M-Pesa business-portal statement: metadata lines, a duplicate row, a failed row, a withdrawal, bad rows. */
export const SAMPLE_MPESA_STATEMENT_CSV = [...META, HEADER, ...ROWS].join(CRLF) + CRLF;

export type SampleClaim = {
  readonly tenantName: string;
  readonly unitCode: string;
  /** Pasted M-Pesa confirmation SMS. */
  readonly sms: string;
};

/** Tenant-submitted claims. The first matches a line in the sample statement (verifies it). */
export const SAMPLE_CLAIMS: readonly SampleClaim[] = [
  {
    tenantName: 'John Doe (sample)',
    unitCode: 'B-12',
    sms: 'QFT4AB12CD Confirmed. Ksh12,000.00 sent to RIVERSIDE COURT for account B-12 on 11/3/26 at 9:14 AM. New M-PESA balance is Ksh25,000.00.',
  },
  {
    tenantName: 'Test Tenant (sample)',
    unitCode: 'C-03',
    sms: 'QFT4AB12CK Confirmed. Ksh 12,000 sent to RIVERSIDE COURT for account c 03 on 12/3/26 at 3:45 PM. New M-PESA balance is Ksh500.00.',
  },
  {
    tenantName: 'Unknown (sample)',
    unitCode: 'B-20',
    sms: 'QFT4AB12ZZ Confirmed. Ksh9,500.00 sent to RIVERSIDE COURT for account B-20 on 14/3/26 at 8:00 AM. New M-PESA balance is Ksh100.00.',
  },
];
