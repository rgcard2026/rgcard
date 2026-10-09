import { Box } from '@mui/material';
import { CARD_TEMPLATE, type CardRenderLayout, formatCardExpiry, membershipLabel } from '@/lib/card-layout';

type MemberCardProps = {
  cardNumber: string;
  qrSrc?: string;
  isVip?: boolean;
  membershipClass?: string | null;
  validUntil?: string | Date | null;
  layout?: CardRenderLayout;
  className?: string;
};

export default function MemberCard({ cardNumber, qrSrc = '/api/member-card/qr', isVip = false, membershipClass, validUntil, layout, className }: MemberCardProps) {
  const tpl = layout || CARD_TEMPLATE;
  const templateUrl = tpl.templateUrl || '/card-template.png';
  const idText = `ID NO.${cardNumber}`;
  const classText = membershipLabel(membershipClass, isVip);
  const expiryText = formatCardExpiry(validUntil);
  const idCenterX = tpl.id.x + tpl.id.width / 2;
  const idCenterY = tpl.id.y + tpl.id.height / 2;
  const classCenterY = tpl.membershipClass.y + tpl.membershipClass.height / 2;
  const expiryCenterY = tpl.expiry.y + tpl.expiry.height / 2;

  return (
    <Box className={`rg-member-card ${className || ''}`.trim()}>
      <svg className="rg-member-card-svg" viewBox={`0 0 ${tpl.width} ${tpl.height}`} role="img" aria-label={`RG-Card ${cardNumber}`} preserveAspectRatio="xMidYMid meet">
        <defs>
          <clipPath id="rgQrClip">
            <rect x={tpl.qr.x} y={tpl.qr.y} width={tpl.qr.size} height={tpl.qr.size} rx="0" ry="0" />
          </clipPath>
        </defs>
        <image href={templateUrl} x="0" y="0" width={tpl.width} height={tpl.height} preserveAspectRatio="none" />
        <image href={qrSrc} x={tpl.qr.x} y={tpl.qr.y} width={tpl.qr.size} height={tpl.qr.size} preserveAspectRatio="none" clipPath="url(#rgQrClip)" />
        <text x={idCenterX} y={idCenterY} textAnchor="middle" dominantBaseline="middle" direction="ltr" unicodeBidi="bidi-override" fontFamily="Arial, Helvetica, sans-serif" fontSize={tpl.id.fontSize} fontWeight="900" letterSpacing="2.4" fill="#f2c15f" stroke="rgba(0,0,0,.35)" strokeWidth="1" paintOrder="stroke fill">{idText}</text>
        {classText && <text x={tpl.membershipClass.x} y={classCenterY} dominantBaseline="middle" direction="ltr" unicodeBidi="bidi-override" fontFamily="Arial, Helvetica, sans-serif" fontSize={tpl.membershipClass.fontSize} fontWeight="900" fill="#f2c15f" stroke="rgba(0,0,0,.45)" strokeWidth="1" paintOrder="stroke fill">{classText}</text>}
        {expiryText && <text x={tpl.expiry.x} y={expiryCenterY} dominantBaseline="middle" direction="ltr" unicodeBidi="bidi-override" fontFamily="Arial, Helvetica, sans-serif" fontSize={tpl.expiry.fontSize} fontWeight="900" letterSpacing="1.2" fill="#f2c15f" stroke="rgba(0,0,0,.40)" strokeWidth="1" paintOrder="stroke fill">{expiryText}</text>}
      </svg>
    </Box>
  );
}
