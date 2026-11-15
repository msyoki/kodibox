/** Synthetic fixtures: fake names, +254700... numbers. No real payer data. */

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
  'QFT4AB12CM,2026-13-45 99:00:00,2026-03-13 08:59:50,Pay Bill Online Payment,Completed,"5,000.00",,"1,022,500.00",True,Pay Bill Online,254700000008 - BAD DATE,,B-17',
  'QFT4AB12CN,2026-03-13 16:00:00,2026-03-13 15:59:50,Pay Bill Charge,Completed,,35.00,"1,022,465.00",True,Charges,,,',
  'QFT4AB12CP,2026-03-14 07:05:30,2026-03-14 07:05:20,Pay Bill Online Payment,Completed,"0.00",,"1,022,465.00",True,Pay Bill Online,254700000009 - ZERO PAYER,,B-18',
  'QFT4AB12CQ,2026-03-14 18:30:00,2026-03-14 18:29:40,Pay Bill Online Payment,Completed,"1,250.50",,"1,023,715.50",True,Pay Bill Online,2547****0010 - MASKED PAYER,,B-19',
];

const META = [
  'Organization Name:,RIVERSIDE COURT (DEMO),,,,,,,,,,,',
  'Short Code:,000000,,,,,,,,,,,',
  'Statement Period:,01-03-2026 - 14-03-2026,,,,,,,,,,,',
  ',,,,,,,,,,,,',
];

const CRLF = String.fromCharCode(13, 10);

/** Statement with BOM, CRLF, metadata lines, quoted fields, a duplicate row and bad rows. */
export const MPESA_STATEMENT_CSV =
  String.fromCharCode(0xfeff) + [...META, HEADER, ...ROWS].join(CRLF) + CRLF;

export const BANK_CSV = [
  'Posting Date,Narrative,Reference,Debit,Credit,Balance',
  '11/03/2026,SAMPLE TRANSFER JOHN DOE,FT26070ABC12,,"12,000.00","512,000.00"',
  '12/03/2026,PESALINK JANE ROE B-14,PL26071XYZ34,,"15,500.00","527,500.00"',
  '12/03/2026,BANK CHARGES,,"150.00",,"527,350.00"',
  '13/03/2026,CASH DEPOSIT,,,"8,000.00","535,350.00"',
  '31/02/2026,BAD DATE ROW,FT26072BAD99,,"1,000.00","536,350.00"',
  '14/03/2026,UNPARSEABLE AMOUNT,FT26073AMT00,,"abc","536,350.00"',
].join('\n');

export const BANK_MAPPING = {
  date: 'Posting Date',
  credit: 'Credit',
  debit: 'Debit',
  reference: 'Reference',
  description: 'Narrative',
  dateFormat: 'DD/MM/YYYY',
} as const;

export const SMS_VARIANTS = {
  paybill:
    'QFT4AB12CD Confirmed. Ksh12,000.00 sent to RIVERSIDE COURT for account B-12 on 11/3/26 at 9:14 AM. New M-PESA balance is Ksh25,000.00. Transaction cost, Ksh0.00.',
  paybillSpaced:
    'QFT4AB12CE Confirmed. Ksh 15,500 sent to RIVERSIDE COURT for account b 14 on 11/3/2026 at 10:02 AM.  New M-PESA balance is Ksh9,000.00.',
  paybillLowercase:
    'qft4ab12cf confirmed. ksh8,000.00 sent to riverside court for account b12 on 11/3/26 at 1:30 PM. new m-pesa balance is ksh1,000.00.',
  till: 'QFT4AB12CG Confirmed. Ksh12,000.00 paid to RIVERSIDE COURT SHOP. on 12/3/26 at 12:05 PM.New M-PESA balance is Ksh3,000.00.',
  tillMidnight:
    'QFT4AB12CH Confirmed. Ksh 1,250.50 paid to SAMPLE TILL LTD on 14/3/26 at 12:10 AM. New M-PESA balance is Ksh10.00.',
} as const;

export const NOT_AN_SMS = 'Hello, your airtime of Ksh 50 has been topped up.';
