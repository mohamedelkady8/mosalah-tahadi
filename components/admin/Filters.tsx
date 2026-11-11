'use client';

import Form from 'next/form';

/** GET filter bar: selects apply immediately, the search box applies on Enter. */
export function FilterForm({ action, children }: { action: string; children: React.ReactNode }) {
  return (
    <Form
      action={action}
      className="ad-filters"
      role="search"
      onChange={(e) => {
        if (e.target instanceof HTMLSelectElement) e.currentTarget.requestSubmit();
      }}
    >
      {children}
    </Form>
  );
}
