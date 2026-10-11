export const DEFAULT_WHATSAPP_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '201000033494';
export const DEFAULT_WHATSAPP_MESSAGE = 'مرحبًا، أحتاج مساعدة بخصوص حساب RG-Card\nCard / ID: {{id}}';

function buildWhatsAppMessage(template?: string, identifier?: string) {
  const cleanId = (identifier || '').trim();
  const base = template?.trim() || DEFAULT_WHATSAPP_MESSAGE;
  return base
    .replace(/{{\s*id\s*}}/gi, cleanId)
    .replace(/{{\s*cardNumber\s*}}/gi, cleanId)
    .replace(/{{\s*name\s*}}/gi, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function whatsappUrl(identifier?: string, supportNumber?: string, template?: string) {
  const number = supportNumber || DEFAULT_WHATSAPP_NUMBER;
  return `https://wa.me/${number}?text=${encodeURIComponent(buildWhatsAppMessage(template, identifier))}`;
}
