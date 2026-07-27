# نشر بيئة Staging (حلول مجانية)

دليل خطوة بخطوة لنشر **Projects System Management** على بيئة تجريبية (staging) باستخدام أدوات مجانية.

## نظرة عامة

| الطبقة                          | الخدمة المجانية                                                                    | الدور                                        |
| ------------------------------- | ---------------------------------------------------------------------------------- | -------------------------------------------- |
| الواجهة (SPA)                   | [Cloudflare Pages](https://pages.cloudflare.com/) أو [Vercel](https://vercel.com/) | استضافة ملفات `dist/` الثابتة                |
| قاعدة البيانات + Auth + Storage | [Supabase](https://supabase.com/) (Free plan)                                      | Backend كامل للمشروع                         |
| Edge Functions                  | Supabase Functions                                                                 | دالة `manage-account` لإدارة الحسابات        |
| التحكم بالإصدارات               | GitHub (مجاني)                                                                     | ربط الاستضافة بالمستودع + نشر تلقائي اختياري |

```
المطوّر → Git push → Cloudflare/Vercel (بناء + نشر SPA)
                              ↓
                    متغيرات VITE_SUPABASE_*
                              ↓
              مشروع Supabase Staging (DB + Auth + RLS + Functions)
```

> **مهم:** مشروع Staging منفصل تماماً عن التطوير المحلي (`supabase start`) وعن Production. لا تستخدم نفس مفاتيح Supabase لأكثر من بيئة.

---

## المتطلبات

1. [Node.js](https://nodejs.org/) LTS (مثلاً 20+)
2. [Supabase CLI](https://supabase.com/docs/guides/cli) — `npm i -g supabase` أو `npx supabase`
3. حساب [Supabase](https://supabase.com/dashboard) (مجاني)
4. حساب [GitHub](https://github.com/) + المستودع على GitHub
5. حساب [Cloudflare](https://dash.cloudflare.com/) أو [Vercel](https://vercel.com/) (مجاني)

تحقق محلياً:

```bash
node -v
npm -v
npx supabase --version
```

---

## المرحلة 1 — إنشاء مشروع Supabase لـ Staging

1. ادخل إلى [Supabase Dashboard](https://supabase.com/dashboard) → **New project**.
2. اختر Organization → اسم المشروع مثلاً `factory-pms-staging`.
3. اختر **Region** قريب من المستخدمين (مثلاً `eu-central-1`).
4. عيّن كلمة مرور قاعدة البيانات واحفظها في مدير كلمات مرور.
5. انتظر حتى يكتمل إنشاء المشروع.

### حدود الخطة المجانية (Supabase)

- مشروعان مجانيان كحد أقصى لكل حساب
- ~500 MB قاعدة بيانات، ~1 GB تخزين ملفات
- Edge Functions و Auth ضمن حدود الاستخدام اليومي المعقولة لبيئة تجريبية

---

## المرحلة 2 — ربط المشروع المحلي بـ Supabase Staging

من جذر المستودع:

```bash
npx supabase login
npx supabase link --project-ref <PROJECT_REF>
```

- `<PROJECT_REF>` موجود في: Dashboard → **Project Settings** → **General** → **Reference ID**.

### كيف يميّز CLI بين المحلي والبعيد؟

| الأمر                                          | الهدف                                           |
| ---------------------------------------------- | ----------------------------------------------- |
| `npm run supabase:reset` / `supabase db reset` | **محلي** — Docker على جهازك (`127.0.0.1:54322`) |
| `npx supabase db push` (بدون `--local`)        | **بعيد** — المشروع المربوط عبر `supabase link`  |
| `npx supabase db push --local`                 | **محلي** صراحةً                                 |

بعد `supabase link` يحفظ CLI معلومات الربط في `supabase/.temp/` (غير مُتتبَّع في Git):

- `project-ref` — معرّف المشروع البعيد (مثلاً `dksswlbpbomljeoxqfbz`)
- `linked-project.json` — اسم المشروع والمؤسسة
- `pooler-url` — عنوان الاتصال بقاعدة البيانات البعيدة

لذلك عندما شغّلت `db push` بعد `link`، حاول الاتصال بـ `aws-1-eu-west-2.pooler.supabase.com` — أي **المشروع البعيد** `factory-pms-staging`، وليس المحلي.

للتحقق:

```bash
npx supabase projects list    # المشاريع في حسابك
type supabase\.temp\project-ref   # Windows — المشروع المربوط حالياً
```

---

## المرحلة 3 — تطبيق هجرات قاعدة البيانات (Migrations)

الهجرات موجودة في `supabase/migrations/`. لتطبيقها على مشروع Staging البعيد:

```powershell
# PowerShell: استخدم علامات اقتباس مفردة '...' إذا كانت كلمة المرور تحتوي $
# (الاقتباس المزدوج "..." يفسّر $database وغيرها كمتغيّرات ويُفسد كلمة المرور)
$env:SUPABASE_DB_PASSWORD='<database-password>'
npx supabase db push

# أو مرّرها مباشرة:
npx supabase db push -p '<database-password>'
```

كلمة مرور قاعدة البيانات: Dashboard → **Project Settings** → **Database** → **Database password** (أو Reset إن نسيتها).

> **لماذا `SUPABASE_DB_PASSWORD`؟** بدونها يحاول CLI إنشاء دور مؤقت `cli_login_postgres` عبر الـ pooler، وهذا يفشل أحياناً على Windows/شبكات معيّنة (`connection was forcibly closed`).

### إذا ظهر `tls error` / `i/o timeout` (مهلة شبكة)

غالباً السبب **VPN أو جدار ناري** يقطع اتصال PostgreSQL (منفذ 5432) بعد بدء TLS.

1. **أوقف VPN بالكامل** (ProtonVPN، Radmin VPN، إلخ) ثم أعد المحاولة.
2. تأكد أن **Wi‑Fi** هو الاتصال النشط وليس tun/tap افتراضي.
3. جرّب شبكة أخرى (مثلاً hotspot من الجوال) للتأكد.
4. إن استمر الفشل محلياً، نفّذ `db push` من **GitHub Actions** (شبكة سحابية غالباً بدون حظر VPN).

```powershell
# بعد إيقاف VPN
npx supabase db push -p '<database-password>'
```

**بديل — تجاوز الـ pooler:**

```bash
# PowerShell: احذف ملف pooler ثم أعد الربط
Remove-Item supabase\.temp\pooler-url -ErrorAction SilentlyContinue
npx supabase link --project-ref <PROJECT_REF> --skip-pooler
npx supabase db push
```

**بديل — رابط اتصال مباشر:**

```bash
npx supabase db push --db-url "postgresql://postgres.<PROJECT_REF>:<PASSWORD>@aws-1-eu-west-2.pooler.supabase.com:5432/postgres"
```

انسخ **Session mode** connection string من Dashboard → **Database** → **Connection string**.

راجع التغييرات قبل التأكيد. بعد النجاح، تحقق من الجداول في **Table Editor** داخل لوحة Supabase.

### (اختياري) بيانات تجريبية

ملف `supabase/seed.sql` يُحمَّل تلقائياً عند `npm run supabase:reset` **محلياً فقط**.

لـ Staging، يمكنك:

1. فتح **SQL Editor** في لوحة Supabase.
2. لصق محتوى `supabase/seed.sql` وتشغيله.

> استخدم بيانات تجريبية فقط على Staging. لا تنشر كلمات مرور حقيقية في مستودع عام.

حسابات العرض المحلية موثّقة في [`supabase/demo-accounts.md`](../supabase/demo-accounts.md) — يمكن إنشاء مستخدمين مشابهين يدوياً أو عبر الـ seed.

---

## المرحلة 4 — نشر Edge Function

المشروع يستخدم دالة `manage-account` لإنشاء الحسابات وإعادة تعيين كلمات المرور:

```bash
npx supabase functions deploy manage-account
```

Supabase يحقن تلقائياً `SUPABASE_URL` و `SUPABASE_ANON_KEY` و `SUPABASE_SERVICE_ROLE_KEY` داخل الدالة — **لا تضع مفتاح service-role في كود الواجهة**.

تحقق: Dashboard → **Edge Functions** → `manage-account` → **Invoke** أو جرّب من التطبيق بعد النشر.

---

## المرحلة 5 — إعداد Auth و CORS

في Supabase Dashboard → **Authentication** → **URL Configuration**:

| الحقل             | القيمة                                                              |
| ----------------- | ------------------------------------------------------------------- |
| **Site URL**      | رابط Staging النهائي، مثلاً `https://factory-pms-staging.pages.dev` |
| **Redirect URLs** | نفس الرابط + `http://localhost:5173` للتطوير المحلي ضد Staging      |

أضف أيضاً في **Authentication** → **Providers** → **Email** تأكيد البريد حسب حاجتك (للتجربة يمكن تعطيل التأكيد الإلزامي).

---

## المرحلة 6 — متغيرات البيئة للواجهة

1. انسخ القالب:

```bash
cp .env.staging .env.staging.local
```

2. من Dashboard → **Project Settings** → **API**، املأ `.env.staging.local`:

```env
VITE_APP_ENV=staging
VITE_SUPABASE_URL=https://<PROJECT_REF>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<anon-public-key>
```

- استخدم **anon / publishable** key فقط في الواجهة.
- ملف `.env.staging.local` **مُستثنى من Git** — لا ترفعه للمستودع.

### اختبار محلي ضد Staging

```bash
npm install
npm run dev:staging
```

افتح `http://localhost:5173` وتأكد من تسجيل الدخول والاتصال بقاعدة Staging.

### بناء إنتاج Staging

```bash
npm run verify
npm run build:staging
```

المخرجات في مجلد `dist/`. معاينة محلية:

```bash
npm run preview:staging
```

---

## المرحلة 7 — نشر الواجهة (مجاناً)

اختر **أحد** الخيارين التاليين.

### الخيار أ — Cloudflare Pages (موصى به)

**لماذا؟** Supabase يستضيف الـ backend فقط (قاعدة البيانات، Auth، الدوال). تطبيق React يحتاج مكاناً يعرض ملفات `dist/` على الإنترنت حتى يفتحه الفريق من رابط عام — Cloudflare Pages يفعل ذلك مجاناً.

**أين تجد Pages في لوحة Cloudflare الجديدة؟**

الاسم القديم **Workers & Pages** انتقل تحت **Compute**:

1. من الشريط الجانبي: **Build** → **Compute**
2. أو افتح مباشرة: [dash.cloudflare.com → Workers & Pages](https://dash.cloudflare.com/?to=/:account/workers-and-pages)
3. أو من الصفحة الرئيسية: بطاقة **Ship something new** → **Connect GitHub** / **Connect Git**

ثم:

**ملاحظة:** واجهة Cloudflare الجديدة قد تعرض **Build command** + **Deploy command** (`npx wrangler deploy`) — هذا مسار **Workers** وليس Pages الكلاسيكي. المشروع يحتوي على `wrangler.jsonc` في الجذر لنشر مجلد `dist/` كموقع ثابت.

1. **Create** → **Pages** → **Connect to Git** — أو من **Compute** → **Workers** → Connect Git (نفس الفكرة في الواجهة الجديدة).
2. اختر مستودع `factory-pms`.
3. إعدادات البناء:

| الإعداد                | القيمة                                              |
| ---------------------- | --------------------------------------------------- |
| Framework preset       | None / Vite                                         |
| Build command          | `npm run build:staging`                             |
| Deploy command         | `npx wrangler deploy`                               |
| Build output directory | `dist` (إن وُجد الحقل؛ وإلا `wrangler.jsonc` يحدده) |
| Root directory         | `/`                                                 |

4. **Environment variables** (Production + Preview):

```
VITE_APP_ENV=staging
VITE_SUPABASE_URL=https://<PROJECT_REF>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<anon-key>
```

5. **SPA routing** (توجيه مسارات React) — يتولاه `wrangler.jsonc` عبر `not_found_handling: "single-page-application"`.

   **لا تضف** ملف `public/_redirects` مع Workers — يسبب خطأ `Infinite loop detected` عند النشر.

   إن استخدمت **Vercel** بدلاً من Cloudflare، أضف `vercel.json` في الجذر (انظر بديل Vercel أدناه).

Vite ينسخ محتوى `public/` إلى `dist/` تلقائياً، فيعمل التوجيه لمسارات React Router.

6. **Deploy**. الرابط الافتراضي: `https://<project-name>.pages.dev`.

### الخيار ب — Vercel

1. [vercel.com/new](https://vercel.com/new) → استيراد مستودع GitHub.
2. إعدادات مشابهة:
   - Build: `npm run build:staging`
   - Output: `dist`
   - Environment variables: نفس متغيرات `VITE_*` أعلاه
3. أضف في جذر المشروع `vercel.json` لدعم React Router:

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

4. انشر واستخدم الرابط `https://<project>.vercel.app`.

---

## المرحلة 8 — ربط الرابط بـ Supabase Auth

بعد الحصول على رابط Staging النهائي:

1. عد إلى Supabase → **Authentication** → **URL Configuration**.
2. حدّث **Site URL** و **Redirect URLs** بالرابط الفعلي.
3. أعد محاولة تسجيل الدخول من الرابط المنشور.

---

## المرحلة 9 — التحقق بعد النشر

| الفحص          | الطريقة                                                         |
| -------------- | --------------------------------------------------------------- |
| اتصال Supabase | الصفحة الرئيسية لا تعرض "Supabase: not configured"              |
| تسجيل الدخول   | حساب مدير شركة أو مدير مصنع                                     |
| RLS            | مستخدم بدور محدود لا يرى بيانات خارج نطاقه                      |
| إدارة الحسابات | إنشاء مستخدم جديد / إعادة تعيين كلمة مرور (يتطلب Edge Function) |
| المرفقات       | رفع ملف في اقتراح مشروع (إن وُجد bucket)                        |

قبل كل نشر:

```bash
npm run verify
```

---

## النشر التلقائي (اختياري — GitHub Actions مجاني)

مثال: نشر تلقائي عند الدفع إلى فرع `staging`.

أنشئ `.github/workflows/deploy-staging.yml`:

```yaml
name: Deploy Staging

on:
  push:
    branches: [staging]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run verify
      - run: npm run build:staging
        env:
          VITE_APP_ENV: staging
          VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
          VITE_SUPABASE_PUBLISHABLE_KEY: ${{ secrets.VITE_SUPABASE_PUBLISHABLE_KEY }}
      # ارفع dist/ عبر Cloudflare/Vercel action حسب منصتك
```

أضف الأسرار في GitHub → **Settings** → **Secrets and variables** → **Actions**.

> غالباً يكفي ربط Git مباشرة بـ Cloudflare Pages أو Vercel دون GitHub Actions — المنصة تبني وتنشر تلقائياً عند كل push.

---

## سير العمل المعتاد للتحديثات

```bash
# 1. تطوير محلي
npm run start:local          # أو dev:local

# 2. بعد تغييرات DB
npx supabase db push         # على مشروع Staging المربوط

# 3. بعد تغيير Edge Function
npx supabase functions deploy manage-account

# 4. دمج الكود ودفع الفرع
git push origin staging      # يُعيد بناء ونشر الواجهة تلقائياً إن رُبطت الاستضافة
```

---

## استكشاف الأخطاء

| المشكلة                                                          | الحل المحتمل                                                                                                   |
| ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| "Supabase: not configured"                                       | تأكد من متغيرات `VITE_*` في لوحة الاستضافة وأعد البناء                                                         |
| 404 عند تحديث الصفحة أو فتح رابط مباشر                           | تأكد من `not_found_handling: "single-page-application"` في `wrangler.jsonc`؛ لا تستخدم `_redirects` مع Workers |
| `Infinite loop detected` في `_redirects` عند النشر               | احذف `public/_redirects` — wrangler يتولى SPA routing                                                          |
| فشل تسجيل الدخول بعد النشر                                       | راجع Site URL و Redirect URLs في Supabase Auth                                                                 |
| `manage-account` 401/500                                         | تأكد من نشر الدالة وأن المستخدم له صلاحية في `profiles`                                                        |
| `db push` — `forcibly closed` / `failed to connect as temp role` | مرّر `SUPABASE_DB_PASSWORD` أو `-p` باقتباس مفرد `'...'`                                                       |
| `db push` — `tls error` / `i/o timeout`                          | أوقف VPN (ProtonVPN/Radmin)؛ جرّب شبكة أخرى أو GitHub Actions                                                  |
| `db push` — `password authentication failed`                     | على PowerShell لا تستخدم `"..."` إذا كانت كلمة المرور فيها `$` — استخدم `'...'`                                |
| `db push` يرفض التغيير                                           | راجع تعارض الهجرات؛ لا تعدّل هجرات قديمة — أنشئ migration جديدة                                                |
| CORS من الواجهة                                                  | عادة Supabase يتعامل معها؛ تحقق من أن `VITE_SUPABASE_URL` صحيح                                                 |

---

## أمان — تذكير سريع

- **لا** ترفع `.env.staging.local` أو مفتاح `service_role` إلى Git.
- الواجهة تستخدم **publishable key** فقط؛ الحماية عبر **RLS** في PostgreSQL.
- Staging منفصل عن Production: مشروع Supabase مختلف + متغيرات بيئة مختلفة + (يفضّل) فرع Git `staging`.

---

## مراجع داخل المشروع

- [`README.md`](../README.md) — إعداد عام وسكربتات npm
- [`AGENTS.md`](../AGENTS.md) — أوضاع Vite والبيئة
- [`.env.staging`](../.env.staging) — قالب متغيرات Staging
- [`supabase/demo-accounts.md`](../supabase/demo-accounts.md) — حسابات تجريبية (محلي)
