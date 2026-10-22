/* MIRAS site content, published from the admin (admin/index.html → Publish).
   Holds only what differs from the defaults built into index.html. null = use the defaults.
   It may also carry `schedule: [{ id, at, note, overrides }]`: each entry is merged over the content once `at` has passed.
   The full shape is in admin/SITE-CONTRACT.md. */
window.MIRAS_CONTENT = null;
