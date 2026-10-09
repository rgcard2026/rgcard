# RG-Card v3.9.57 — Client Audit UX/UI Update

## User portal
- A complete 180-degree membership-card flip remains available on desktop, tablet, and mobile.
- The small non-essential copy/status above the card is removed.
- All internal navigation uses the same subtle route transition.
- Internal logo navigation now uses an RG-Card branded loader. WhatsApp is reserved for actual WhatsApp contact links only.
- Buttons and cards have hover/press feedback, while logos are never image-scaled above their natural rendering behavior.
- Mobile touch targets use a 44px minimum size.
- The New Arrivals / Coming Soon label is larger and uses the selected language.
- Light and dark contrast has been adjusted, including the All Offers filter in light mode.
- Watermark content gets additional safe spacing away from card edges.

## Admin dashboard
- Arabic/English sidebar placement follows the selected direction without a double RTL flip.
- The active navigation item is consistent on mobile and desktop.
- Breadcrumb/page context is shown below the top bar.
- Dashboard has a route loading skeleton.
- Directories, drawers, toggles, buttons, tables, pagination, and long labels use responsive safe sizing.
- Long log paths/IPs are clipped safely instead of breaking layout on small screens.
- Security alerts are grouped by date and can be marked as reviewed. Reviews are saved as audit events.
- User/admin password forms now validate strength and confirmation before save/create.
- Delete actions for users, places, and admins use a shared confirmation dialog.

## Notes
- This patch does not change production data or existing export/PDF functions.
- Test both Arabic and English after deployment with a hard refresh.
