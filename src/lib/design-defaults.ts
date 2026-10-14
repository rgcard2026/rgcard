// Design Studio defaults, shared by the server settings loader and the studio UI.
// They match the "Onyx & Champagne" design system in src/styles/ui.css, so
// "reset to defaults" in the studio restores the reference look.
// Colors are the light-mode palette; dark mode keeps its own canvas and only
// inherits the brand (primary / secondary / accent / button text) colors.
export const DESIGN_DEFAULTS = {
  designPrimaryColor: '#D8B26A',
  designSecondaryColor: '#A97F3A',
  designAccentColor: '#D8B26A',
  designBackgroundColor: '#F5F3EE',
  designSurfaceColor: '#FFFFFF',
  designTextColor: '#16140F',
  designMutedTextColor: '#77736A',
  designButtonTextColor: '#1A1408',
  designInputBackgroundColor: '#FAF9F6',
  designSuccessColor: '#138A57',
  designDangerColor: '#C93A3A',
  designFontFamily: 'IBM Plex Sans Arabic',
  designHeadingFontFamily: 'Alexandria',
  designButtonFontFamily: 'IBM Plex Sans Arabic',
  designFontWeight: 400,
  designHeadingWeight: 600,
  designButtonWeight: 600,
  designFontStyle: 'normal',
  designHeadingStyle: 'normal',
  designButtonStyle: 'normal',
  designBodyFontSize: 16,
  designH1FontSize: 54,
  designH2FontSize: 30,
  designH3FontSize: 18,
  designCardTitleFontSize: 16,
  designButtonFontSize: 15,
  designInputFontSize: 15,
  designNavFontSize: 15,
  designCaptionFontSize: 12,
  designLineHeightPercent: 165,
  designLetterSpacing: 0,
  designButtonRadius: 14,
  designCardRadius: 24,
  designInputRadius: 14,
  designButtonShadow: 14,
  designButtonPaddingX: 22,
  designPlaceLogoScale: 100,
  designCardOpacity: 100,
  designCardWidth: 0,
  designCardHeight: 0,
  designBoxOpacity: 100,
  designBoxWidth: 0,
  designBoxHeight: 0,
  designFieldOpacity: 100,
  designFieldWidth: 0,
  designFieldHeight: 0,
  designButtonOpacity: 100,
  designButtonWidth: 0,
  designButtonHeight: 0,
  designBackgroundImageUrl: '',
  designBackgroundImageEnabled: false,
  designBackgroundSize: 'cover',
  designBackgroundOverlay: 12,
  designLoginBannerTitle: 'RG-Card',
  designLoginBannerSubtitleAr: 'برنامج الخصومات والعروض',
  designLoginBannerSubtitleEn: 'Discounts & offers membership',
  designLoginBannerLogo: '♛',
  designLoginBannerShowLogo: true,
  designLoginBannerStartColor: '#1A1710',
  designLoginBannerEndColor: '#050506',
  designLoginBannerTextColor: '#F3EFE6',
  designLoginBannerHeight: 304,
  designLoginBannerRadius: 32,
  designLoginBannerOpacity: 100,
  designLoginBannerContentAlign: 'center',
  designLoginBannerImageUrl: '',
  designLoginBannerImageEnabled: false,
  // Post-login popup message (shown once per login on the member area).
  designPopupEnabled: false,
  designPopupTitle: '',
  designPopupText: '',
  designPopupImageUrl: '',
  designPopupLinkUrl: '',
  designPopupAudience: 'all', // 'all' | 'selected'
  designPopupUserIds: '', // comma-separated card numbers when audience = 'selected'
  // Editable card-back membership text (rendered onto card-back-base.png).
  designCardBackLine1: 'بطاقة عضوية شخصية — لا يجوز التنازل عنها',
  designCardBackLine2: 'تُعرض عند الطلب للاستفادة من خصومات أعضاء',
  designCardBackBrand: 'RG-Card',
  designCardBackUrl: '', // generated /uploads/design-card-back/... when customized
  // New Arrival / Coming Soon ticker on the offers page.
  designArrivalEnabled: true,
  designArrivalBannerMaxWidth: 100, // % of container width
  designArrivalBannerRadius: 24, // px
  designArrivalPaddingY: 14, // px vertical breathing room inside the banner
  designArrivalTileWidth: 136, // px
  designArrivalTileHeight: 84, // px
  designArrivalTileRadius: 14, // px
  designArrivalTileGap: 12, // px between tiles
  designArrivalCustomColors: false,
  designArrivalBannerBg: '#FFFFFF',
  designArrivalBannerBorder: '#E7E1D4',
  designArrivalTitleColor: '#A97F3A',
  designArrivalSubtitleColor: '#77736A',
  designArrivalTileBg: '#FBF9F4',
  designArrivalTileBorder: '#E7E1D4',
  designArrivalNameColor: '#8A6A2F'
};

export type DesignSettings = typeof DESIGN_DEFAULTS;
