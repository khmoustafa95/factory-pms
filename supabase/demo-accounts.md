# حسابات تجريبية (محلي فقط)

كلمة المرور لجميع الحسابات:

```
demo123456
```

أعد تحميل البيانات بعد التعديل:

```bash
# محلي
npm run supabase:reset

# Staging البعيد (بعد supabase link)
npx supabase db reset --linked
```

| البريد | الدور | الصلاحية | المصنع |
| --- | --- | --- | --- |
| `director@demo.local` | مدير الشركة | تحكم | — |
| `director.viewer@demo.local` | مدير الشركة | إحصائيات فقط | — |
| `fm.damascus@demo.local` | مدير مصنع | تحكم | دمشق (DMS) |
| `fm.damascus.viewer@demo.local` | مدير مصنع | إحصائيات فقط | دمشق (DMS) |
| `fm.aleppo@demo.local` | مدير مصنع | تحكم | حلب (ALP) |

الـ seed يحقن الحسابات + مصنعين نشطين فقط (بدون مشاريع/مراحل/مهام).
