# RSS Operations & Policy Guide — maintenance notes

A single-page tool built from `RSS_Operations_Policy_Guide_v5.docx`. Same
architecture as the Japan Rail tool and BDM escalation reference: plain
HTML/CSS/JS, no build step, deployable to GitHub Pages and embeddable in
SharePoint via iframe.

## Files

| File | What it is | Do you touch it? |
|---|---|---|
| `index.html` | Page structure + all styling | Rarely — only for layout/design changes |
| `app.js` | Sidebar rendering, search logic | Rarely — only for behavior changes |
| `data.js` | The actual guide content (24 sections, generated from the .docx) | Only when policy content changes |
| `media.js` | **Screenshot registry** — you'll use this a lot | Yes, whenever you add a screenshot |
| `images/` | Where the screenshot files themselves live | Yes, drop files here |

## Adding screenshots (the main thing you'll do)

Every policy on the site has a "block id" — a stable short name like
`verify-whether-a-credit-card-actually-ran-in-cybersource` or
`before-changing-a-reservation`. You can see any block's id in the URL bar
after you click into it (it appears after the `#`).

To add one or more screenshots to a policy:

1. Save the image(s) into `images/`. Name them so you can tell them apart,
   e.g. `cybersource-step1.png`, `cybersource-step2.png`.
2. Open `media.js` and add an entry keyed by the block id, with an array
   of images **in the order you want them to appear**:

```js
const RSS_MEDIA = {
  "verify-whether-a-credit-card-actually-ran-in-cybersource": [
    { file: "images/cybersource-step1.png", caption: "Step 1: Log into CyberSource" },
    { file: "images/cybersource-step2.png", caption: "Step 2: Search the transaction ID" },
    { file: "images/cybersource-step3.png", caption: "Step 3: Confirm the status shown" }
  ]
};
```

That's it — no HTML editing required. A policy with no entry in `media.js`
just shows no screenshots, which is fine (most won't have any). If a
filename in `media.js` doesn't match a real file in `images/`, the site
shows a small "screenshot not found" placeholder instead of breaking, so
a typo is safe and visible rather than silent.

## How the search works

Search is full-text — it checks every word of every policy, not just
titles, so a keyword, remark code (e.g. "ADKX"), acronym (e.g. "LMTR",
"SSUP", "CAD"), or system name will surface the right policy even if it's
buried mid-paragraph. Clicking a result scrolls straight to that policy
and briefly highlights it.

## Updating policy content

The content in `data.js` was generated from the Word doc. If policy
content changes going forward, the cleanest path is: give me the updated
section(s) (transcript, redline, or just the new text) and I'll rebuild
`data.js` from the source doc so formatting, callout boxes, and tables
stay consistent — rather than hand-editing the generated JSON.

## Navigation structure

The 24 guide sections are grouped into 8 categories in the left sidebar
for faster scanning:

1. Start Here
2. Plex & Booking Servicing
3. Advisor Communication & Zendesk
4. Payments, Fraud & Finance
5. Online Bookings & QA
6. Cancellations, Refunds & Follow-up
7. Product Servicing
8. Escalation & Quick Reference

Three sections from the source doc are intentionally left out of the live
tool since they're internal document-management content rather than
day-to-day RSS reference: the Table of Contents (replaced by the sidebar),
the Validation Register, and the Source Set & Traceability appendix. The
Routing Directory (Appendix B) is included under "Escalation & Quick
Reference."

## Deployment

Same pattern as your other tools: push this folder to a GitHub Pages repo,
then embed the published URL in SharePoint via iframe. No server, no
build step — it's ready to publish as-is.

## What changed in this merge (for your records)

This build reconciles two branches of work that had drifted apart — the
version deployed at your OneDrive path, and a parallel copy being iterated
on in chat. Nothing you already had was removed:

**Kept from your deployed version, unchanged:**
- Clickable "Go to" cross-reference links in tables (`.goto-link`)
- Row-level anchors on reference tables (Glossary, Quick Policy Library)
- The "Expand all / Collapse all" sidebar toggle
- The 🔗 copy-link button style on every heading

**Added in this merge:**
- **Needs-review panel** (sidebar, top) — auto-lists any policy still
  carrying `VALIDATION REQUIRED` / `PARTIALLY VALIDATED` language from the
  source transcripts, with a live count badge. It's visible by design (not
  hidden) so it doubles as your working checklist — items drop off the
  list automatically the moment you replace the flagged content, no
  separate list to maintain.
- **Cross-guide switcher** ("Customer Service Guide →" under the brand
  block) — currently points to a placeholder path; update the `href` in
  `index.html` once the Customer Service guide has a real URL.
- **Auto-linked emails, URLs, and Smartsheet links** — anywhere one
  appears in the content (paragraphs, steps, table cells), it's now a
  real clickable link with a small copy-to-clipboard icon next to it.
  This runs automatically over whatever's in `data.js`, so it keeps
  working on anything you add later — no extra step.
- **16.4 Air Changes & Cancellations** — replaced the "validation
  required" placeholder with the full policy (unticketed vs. ticketed
  air, the Flights Team handoff, and cancellation/refund eligibility).
