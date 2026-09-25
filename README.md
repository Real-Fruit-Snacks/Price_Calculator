# Dog Sitting At Danni's House

**Home dog boarding — pricing calculator and instant estimates**

A single-page static website for a home-based dog boarding service. Visitors can read the rates, get an instant estimate for a stay, print it, and save the stay to their calendar.

Repository: https://github.com/Real-Fruit-Snacks/Price_Calculator (hosted with GitHub Pages)

## Pricing

All rates are defined once, at the top of `script.js`, and every figure shown on the page is filled from those constants.

| Constant | Value | Meaning |
|----------|-------|---------|
| `NIGHTLY_RATE` | $55 | per 24-hour day, per pet |
| `HOURLY_RATE` | $5 | per extra hour beyond a full day, rounded up to the next hour |
| `ADDITIONAL_PET_FACTOR` | 0.80 | each additional pet pays 80% (20% off) |
| `HOLIDAY_FEE_RATE` | 0.05 | 5% added to the stay total when the "Holiday Stay" switch is on |
| `DEPOSIT_AMOUNT` | $50 | deposit due at booking |
| `DEPOSIT_MIN_DAYS` | 3 | stays of this many days or more require the deposit |

How a stay is priced:

1. The stay length is measured in local wall-clock time, so a 9am-to-9am night is always 24 hours, even across a daylight-saving change.
2. Each full 24-hour period is one day. Leftover time is billed by the hour, rounded up. Once the extra hours would cost as much as a day, they count as another day instead (so 12 hours is one day, never $60).
3. The first pet pays the full rate; each additional pet pays 80% of both the daily rate and the extra hours.
4. If the holiday switch is on, 5% of the stay total is added.
5. Stays of 3 or more days show the $50 deposit and the balance due at pick-up.

To change a price, edit the constant in `script.js`. The pricing cards, FAQ, estimate, and printed receipt all update from it.

## Features

- Instant estimate with a full breakdown: days, extra hours, per-pet lines, multi-pet discount, holiday fee, deposit
- Printable estimate (print-optimized layout, letter size)
- "Save to Calendar" export as a standard `.ics` file
- Light and dark themes, remembered between visits
- Works on phones, with a collapsible menu and touch-friendly controls
- Keyboard and screen-reader accessible: dialogs trap focus and close with Escape, errors and results are announced, all controls are labelled
- Respects the "reduce motion" system setting
- Custom 404 page that matches the site

## Files

```
index.html            the whole site (styles are inline in <head>)
script.js             calculator, dialogs, theme, print and calendar export
404.html              self-contained not-found page
favicon.svg           site icon
apple-touch-icon.png  iPhone home-screen icon
.nojekyll             tells GitHub Pages to serve the files as-is
```

There is no build step and no dependencies. The only external resource is the Inter font from Google Fonts.

## Running locally

Open `index.html` directly in a browser, or serve the folder:

```bash
python3 -m http.server 8080
# then open http://localhost:8080
```

## Deployment

The site is served by GitHub Pages straight from the repository root (Settings → Pages shows which branch). Push to that branch and the live site updates within a minute or two.

To use a custom domain, add a `CNAME` file containing the domain to the repository root and point the domain's DNS at GitHub Pages.

## Service policies shown on the site

- $50 deposit due at booking for stays of 3 or more days; it counts toward the total
- Payment: cash preferred, Venmo accepted; balance due at pick-up
- Estimates are valid for 30 days; final pricing is confirmed at booking
- Stays that include a holiday carry a 5% holiday fee

## License

MIT — see [LICENSE](LICENSE).
