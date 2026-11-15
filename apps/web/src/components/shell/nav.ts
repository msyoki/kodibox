export interface NavItem {
  label: string;
  href: string;
  /** Which BadgeCounts key drives the badge, if any. */
  badge?: 'openTickets' | 'payments';
}

/** Order and labels follow docs/design/SCREEN_SPEC.md. */
export const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Properties & units', href: '/properties' },
  { label: 'Tenants & leases', href: '/tenants' },
  { label: 'Tickets', href: '/tickets', badge: 'openTickets' },
  { label: 'Invoices', href: '/invoices' },
  { label: 'Payments', href: '/payments', badge: 'payments' },
  { label: 'Utilities', href: '/utilities' },
  { label: 'Expenses & repairs', href: '/maintenance' },
  { label: 'Notices & move-outs', href: '/move-outs' },
  { label: 'Messages', href: '/messages' },
  { label: 'Landlords', href: '/landlords' },
  { label: 'Reports & tax', href: '/reports' },
  { label: 'Settings', href: '/settings' },
];
