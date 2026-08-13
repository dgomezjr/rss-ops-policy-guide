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
