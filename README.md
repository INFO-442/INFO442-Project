# Wingman

## Quality

### Accessibility

- Customer feedback forms use native form controls, `fieldset` and `legend` to group questions, and accessible names and pressed states for the star-rating buttons.
- The sentiment chart supports keyboard interaction: its bars are focusable, have labels with sentiment counts and percentages, and respond to Enter and Space. Rating-chart points are keyboard-focusable and expose descriptive labels and tooltips.
- Text fields and chart interactions include visible focus styling. Decorative success icons are hidden from assistive technology, and the question-removal dialog has dialog semantics and an accessible label.

### Security

- Owner authentication and session tracking use Supabase Auth. The public restaurant lookup uses a database function that returns only the restaurant ID, name, and slug; the migration also removes the broad public-read policy on the `restaurants` table. Supabase RLS policies restrict data access per user, so owners can only read and modify their own records.
- AI summarization treats customer feedback as untrusted input, utilizes boundary markers, constrains the response to a JSON schema, and instructs the model not to follow instructions in reviews or output URLs, code, or contact details.
- Mitigated SQL Injection by using Supabase's package instead of running SQL code.

### Responsivity

- Dashboard charts switch from a two-column grid to a vertical layout at widths below 800px using media queries, while stats reduce to two columns and the subheader wraps.
- Settings and questions layouts collapse to one column at tablet-sized media queries. Feedback filters and settings controls wrap on narrower screens, and the full-response dialog scales to the viewport width.
- Customer response text areas fill their available width, and page layouts use grids, flexbox and spacing to fit smaller screens.
- Uses `rem`, `vh`, `vw`, `%`, and other variable sizes to keep pages responsive.
