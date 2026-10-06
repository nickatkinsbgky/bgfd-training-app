# BGFD Training Performance App

**Public repo:** https://github.com/nickatkinsbgky/bgfd-training-app

**App link (after Pages is turned on):** https://nickatkinsbgky.github.io/bgfd-training-app/

## Turn on the clickable link (about 30 seconds)

1. Open **Settings → Pages**
2. Under **Build and deployment → Source**, choose **Deploy from a branch**
3. Branch: **main** / folder: **/ (root)** → Save
4. Wait a minute, then open:
   https://nickatkinsbgky.github.io/bgfd-training-app/

## Finish uploading these files

Drop these onto **Add file → Upload files** if they are not already in the repo:

- `seed-personnel.js`
- `seed-assignments.js`
- `app-part1.js`
- `app-part2.js`

They live next to this project as the split app files. The page will not run until those four files are in the repo.

Anyone with the Pages URL can open the app. Data they enter stays in *their* browser unless they use Export / Import JSON.

This site is public. The seed files include department names and sample training times.

## EMS Recertification Tracker

Open https://nickatkinsbgky.github.io/bgfd-training-app/ems-recert.html

Labeled EMS Recertification Tracker on the homepage. Hours count only in the expiration year and the calendar year before it. Required: Airway 4, Cardiovascular 5, Trauma 3, Medical 6, Operations 2, PAHT 1, SVAT 1, CPR/AED 1. Edits stay in the browser until Export JSON.

Department averages is on the EMS tracker. Pick a recertification cycle year. The average percent of categories met includes only personnel whose expiration year is that cycle. A category is met when hours in the expiration year and the year before it reach the requirement.
Expiration dates renew by two years on the expiration date. Atkins, Nick at 2027-12-31 becomes 2029-12-31 on that date, then 2031-12-31 on the next expiration, and so on.
