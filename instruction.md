# Tuition Class Management System - Project Instructions

Me system eka mahan hadala thiyenne Students, Teachers saha Admin kiyana roles thunatama weda karanna puluwan widiyata. API ekak nathuwa browser eke data save wenna **Dexie.js** use karala thiyenne.

---

## 1. File Structure
Mulu system ekama lesiyen maintain karanna me widiyata files hadaganna:
* `index.html` - Main UI structure
* `app.js` - Database initialization & Business logic
* `styles.css` - Custom styles (Tailwind ekka use karanna)

---

## 2. Tech Stack & Dependencies
Meya weda karanna internet connection ekak oni Tailwind saha Dexie libraries load karaganna. `index.html` eke `<head>` ekata me tika ekathu karanna:

```html
<script src="[https://cdn.tailwindcss.com](https://cdn.tailwindcss.com)"></script>
<script src="[https://unpkg.com/dexie/dist/dexie.js](https://unpkg.com/dexie/dist/dexie.js)"></script>