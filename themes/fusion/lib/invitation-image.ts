import { wedding } from './wedding';

export const invitationImageName = `${wedding.groom}与${wedding.bride}的婚礼邀请-${wedding.date.replaceAll('.', '-')}.png`;

/** Draw a standalone keepsake at a fixed print size, independent of the screen. */
export async function createInvitationImage(): Promise<File> {
  await Promise.all([
    document.fonts.load('60px "LXGW WenKai GB"'),
    document.fonts.load('48px "Letter Serif"'),
    document.fonts.load('160px "Wedding Numerals"'),
  ]);
  const canvas = document.createElement('canvas');
  canvas.width = 1080;
  canvas.height = 1620;
  const context = canvas.getContext('2d')!;
  const red = '#902e2c';
  const ink = '#000000';
  context.fillStyle = '#f6f0e4';
  context.fillRect(0, 0, 1080, 1620);
  context.strokeStyle = red;
  context.lineWidth = 2;
  context.lineCap = 'round';
  // One thread frames the invitation, mirrored about x = 540.
  context.beginPath();
  context.moveTo(490, 236);
  context.bezierCurveTo(430, 200, 284, 200, 188, 200);
  context.bezierCurveTo(102, 200, 76, 242, 76, 330);
  context.lineTo(76, 1424);
  context.bezierCurveTo(76, 1522, 112, 1556, 224, 1556);
  context.lineTo(856, 1556);
  context.bezierCurveTo(968, 1556, 1004, 1522, 1004, 1424);
  context.lineTo(1004, 330);
  context.bezierCurveTo(1004, 242, 978, 200, 892, 200);
  context.bezierCurveTo(796, 200, 650, 200, 590, 236);
  context.stroke();

  context.lineWidth = 3.5;
  context.beginPath();
  context.arc(490, 307, 71, 0, Math.PI * 2);
  context.stroke();
  // Small gaps give the rings a clear over-and-under join.
  context.beginPath();
  context.arc(590, 307, 71, -2.3, 2.3);
  context.stroke();
  context.beginPath();
  context.arc(590, 307, 71, 2.48, Math.PI * 2 - 2.48);
  context.stroke();
  context.textAlign = 'center';
  context.textBaseline = 'alphabetic';
  const text = (
    value: string,
    y: number,
    font: string,
    color = ink,
    x = 540,
  ) => {
    context.fillStyle = color;
    context.font = font;
    context.fillText(value, x, y);
  };
  const rule = (y: number) => {
    context.strokeStyle = '#d8cbb7';
    context.lineWidth = 1.5;
    context.beginPath();
    context.moveTo(150, y);
    context.lineTo(930, y);
    context.stroke();
  };
  const number = (
    base: string,
    emphasis: string,
    y: number,
    font: string,
    x = 540,
  ) => {
    context.font = font;
    const baseWidth = context.measureText(base).width;
    const totalWidth = baseWidth + context.measureText(emphasis).width;
    context.textAlign = 'left';
    text(base, y, font, ink, x - totalWidth / 2);
    text(emphasis, y, font, red, x - totalWidth / 2 + baseWidth);
    context.textAlign = 'center';
  };

  text('一线 · 同心', 135, '36px "Letter Serif"', red);
  text('囍', 436, '40px "LXGW WenKai GB"', red);
  text(`${wedding.groom}  &  ${wedding.bride}`, 520, '64px "LXGW WenKai GB"');
  text('诚挚敬邀', 585, '32px "Letter Serif"', red);
  text('有你在，才是圆满。', 655, '32px "LXGW WenKai GB"');
  rule(719);
  const [year, month, day] = wedding.date.split('.');
  text(year, 792, '32px "Wedding Numerals"');
  number(`${month}.`, day, 981, '190px "Wedding Numerals"');
  text(`${wedding.day} · ${wedding.lunar}`, 1035, '30px "Letter Serif"');
  number(
    wedding.welcome.slice(0, 3),
    wedding.welcome.slice(3),
    1162,
    '86px "Wedding Numerals"',
  );
  text('到场相聚', 1220, '30px "Letter Serif"');
  rule(1280);
  text(wedding.venue, 1369, '44px "Letter Serif"');
  text(`${wedding.room}晚宴`, 1438, '42px "LXGW WenKai GB"', red);
  text('一线相牵，同心相伴。', 1520, '27px "LXGW WenKai GB"');

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (image) =>
        image ? resolve(image) : reject(new Error('Image export failed')),
      'image/png',
    );
  });
  return new File([blob], invitationImageName, { type: 'image/png' });
}
