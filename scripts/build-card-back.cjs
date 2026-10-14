// Usage (from the project root): node scripts/build-card-back.cjs .
// Builds public/card-back.png from the front artwork: same damask, corner ornaments, gold band
// and number frame; the R.G emblem and QR frame are replaced with patches of the card's own
// texture (feathered), then the back-side content is drawn. The member number is added at runtime.
const path = require('path');
const fs = require('fs');
const root = process.argv[2];
const { createCanvas, loadImage, GlobalFonts } = require(path.join(root, 'node_modules/@napi-rs/canvas'));

(async () => {
  const front = await loadImage(fs.readFileSync(path.join(root, 'public/card-template.png')));
  const emblem = await loadImage(fs.readFileSync(path.join(root, 'public/brand/rg-emblem-gold.png')));
  const W = front.width, H = front.height;
  const c = createCanvas(W, H);
  const x = c.getContext('2d');
  x.drawImage(front, 0, 0);

  // Copy a source rect onto a destination rect with feathered edges so seams disappear.
  const feather = 46;
  function patch(sx, sy, w, h, dx, dy) {
    const tmp = createCanvas(w, h);
    const t = tmp.getContext('2d');
    t.drawImage(front, sx, sy, w, h, 0, 0, w, h);
    t.globalCompositeOperation = 'destination-in';
    const gx = t.createLinearGradient(0, 0, w, 0);
    gx.addColorStop(0, 'rgba(0,0,0,0)'); gx.addColorStop(feather / w, 'rgba(0,0,0,1)');
    gx.addColorStop(1 - feather / w, 'rgba(0,0,0,1)'); gx.addColorStop(1, 'rgba(0,0,0,0)');
    t.fillStyle = gx; t.fillRect(0, 0, w, h);
    const gy = t.createLinearGradient(0, 0, 0, h);
    gy.addColorStop(0, 'rgba(0,0,0,0)'); gy.addColorStop(feather / h, 'rgba(0,0,0,1)');
    gy.addColorStop(1 - feather / h, 'rgba(0,0,0,1)'); gy.addColorStop(1, 'rgba(0,0,0,0)');
    t.fillStyle = gy; t.fillRect(0, 0, w, h);
    x.drawImage(tmp, dx, dy);
  }

  // 1) Central emblem (approx. x 450–1060, y 235–660): damask from the card's left field, several passes.
  for (let pass = 0; pass < 2; pass += 1) {
    patch(70, 210, 400, 480, 410, 205);
    patch(70, 210, 400, 480, 740, 205);
    patch(110, 230, 360, 440, 560, 225);
    patch(90, 300, 300, 260, 960, 330);
  }

  // 2) QR frame (approx. x 1165–1500, y 455–835). Upper part: clean damask from the left field.
  //    Band part: the plain band segment left of the centre ornament (x < 650).
  for (let pass = 0; pass < 2; pass += 1) {
    patch(60, 420, 300, 380, 1110, 420);
    patch(80, 420, 300, 380, 1270, 420);
    patch(60, 420, 260, 380, 1330, 420);
  }
  // Band strip (y ≈ 772–844): feathered only horizontally so the gold lines stay crisp
  // while brightness blends into the neighbouring band.
  function band(sx, dx, w) {
    const tmp = createCanvas(w, 72);
    const t = tmp.getContext('2d');
    t.drawImage(front, sx, 772, w, 72, 0, 0, w, 72);
    t.globalCompositeOperation = 'destination-in';
    const g = t.createLinearGradient(0, 0, w, 0);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(40 / w, 'rgba(0,0,0,1)');
    g.addColorStop(1 - 40 / w, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    t.fillStyle = g; t.fillRect(0, 0, w, 72);
    x.drawImage(tmp, dx, 772);
  }
  band(260, 1090, 380);
  band(280, 1280, 300);

  // Restore the untouched right edge (thin frame line + band end) from the original artwork.
  {
    const w = 63, tmp = createCanvas(w, 460), t = tmp.getContext('2d');
    t.drawImage(front, 1510, 400, w, 460, 0, 0, w, 460);
    t.globalCompositeOperation = 'destination-in';
    const g = t.createLinearGradient(0, 0, w, 0);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.45, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,1)');
    t.fillStyle = g; t.fillRect(0, 0, w, 460);
    x.drawImage(tmp, 1510, 400);
  }

  // 3) Back-side content.
  const gold = x.createLinearGradient(0, 0, W, 0);
  gold.addColorStop(0, '#a9792f'); gold.addColorStop(0.5, '#f3dba4'); gold.addColorStop(1, '#a9792f');

  const ew = 300, eh = (emblem.height / emblem.width) * ew;
  x.save();
  x.shadowColor = 'rgba(0,0,0,.55)'; x.shadowBlur = 18; x.shadowOffsetY = 6;
  x.drawImage(emblem, (W - ew) / 2, 170, ew, eh);
  x.restore();

  x.textAlign = 'center';
  x.textBaseline = 'middle';
  x.fillStyle = gold;
  x.font = '700 30px Georgia, "Times New Roman", serif';
  x.letterSpacing = '14px';
  x.fillText('ROYAL  MEMBERSHIP', W / 2, 432);
  x.letterSpacing = '0px';

  // Fine divider with a diamond.
  x.fillStyle = gold;
  x.fillRect(W / 2 - 240, 478, 210, 2);
  x.fillRect(W / 2 + 30, 478, 210, 2);
  x.save(); x.translate(W / 2, 479); x.rotate(Math.PI / 4); x.fillRect(-7, -7, 14, 14); x.restore();

  x.fillStyle = 'rgba(243, 219, 164, .82)';
  x.direction = 'rtl';
  x.font = '600 30px "Segoe UI", Tahoma, Arial, sans-serif';
  x.fillText('بطاقة عضوية شخصية — لا يجوز التنازل عنها', W / 2, 532);
  x.font = '400 24px "Segoe UI", Tahoma, Arial, sans-serif';
  x.fillStyle = 'rgba(243, 219, 164, .6)';
  x.fillText('تُعرض عند الطلب للاستفادة من خصومات أعضاء', W / 2, 578);
  // Keep the brand on its own centred line so the LTR word never breaks awkwardly.
  x.direction = 'ltr';
  x.font = '600 26px "Segoe UI", Tahoma, Arial, sans-serif';
  x.fillStyle = 'rgba(243, 219, 164, .72)';
  x.fillText('RG-Card', W / 2, 616);

  fs.writeFileSync(path.join(root, 'public/card-back.png'), await c.encode('png'));
  console.log('card-back.png', W, H);
})();
