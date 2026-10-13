# RG-Card v3.9.55 — Build Hotfix

تمت إزالة رمز `\` غير المقصود من بداية 3 ملفات React:
- `src/components/UiControls.tsx`
- `src/components/PublicShell.tsx`
- `src/components/MemberExperienceClient.tsx`

هذا كان سبب فشل Next.js build برسالة `Expected unicode escape`. لا توجد أي تغييرات وظيفية في الواجهة أو البيانات.
