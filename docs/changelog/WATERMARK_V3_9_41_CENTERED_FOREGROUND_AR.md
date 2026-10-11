# RG-Card v3.9.41 — Exact Center Foreground Watermark

## التعديل
- الـ Watermark تظهر مرة واحدة فقط لكل مستخدم.
- تم نقلها إلى `document.body` عبر React Portal حتى لا تتأثر بأي Layout أو Responsive Container.
- تستخدم طبقة `fixed` بعرض وارتفاع الـ viewport (`100dvw` / `100dvh`) مع `place-items: center` لضمان التمركز الحقيقي على الكمبيوتر والموبايل.
- تم رفع `z-index` لتكون فوق كل النصوص والمحتوى مع `pointer-events: none` حتى لا تعطل الضغط على الأزرار.
- تم زيادة الوزن والـ text stroke لتظهر أوضح وأثقل.
- حجم الخط يتكيف تلقائيًا مع طول رقم الكارت حتى يظل ظاهرًا بوضوح.
