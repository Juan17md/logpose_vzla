const splashScreens = [
  { w: 2064, h: 2752, dw: 1032, dh: 1376, dpr: 2, o: "portrait" },
  { w: 2752, h: 2064, dw: 1032, dh: 1376, dpr: 2, o: "landscape" },
  { w: 2048, h: 2732, dw: 1024, dh: 1366, dpr: 2, o: "portrait" },
  { w: 2732, h: 2048, dw: 1024, dh: 1366, dpr: 2, o: "landscape" },
  { w: 1668, h: 2420, dw: 834, dh: 1210, dpr: 2, o: "portrait" },
  { w: 2420, h: 1668, dw: 834, dh: 1210, dpr: 2, o: "landscape" },
  { w: 1668, h: 2388, dw: 834, dh: 1194, dpr: 2, o: "portrait" },
  { w: 2388, h: 1668, dw: 834, dh: 1194, dpr: 2, o: "landscape" },
  { w: 1668, h: 2224, dw: 834, dh: 1112, dpr: 2, o: "portrait" },
  { w: 2224, h: 1668, dw: 834, dh: 1112, dpr: 2, o: "landscape" },
  { w: 1536, h: 2048, dw: 768, dh: 1024, dpr: 2, o: "portrait" },
  { w: 2048, h: 1536, dw: 768, dh: 1024, dpr: 2, o: "landscape" },
  { w: 1640, h: 2360, dw: 820, dh: 1180, dpr: 2, o: "portrait" },
  { w: 2360, h: 1640, dw: 820, dh: 1180, dpr: 2, o: "landscape" },
  { w: 1620, h: 2160, dw: 810, dh: 1080, dpr: 2, o: "portrait" },
  { w: 2160, h: 1620, dw: 810, dh: 1080, dpr: 2, o: "landscape" },
  { w: 1488, h: 2266, dw: 744, dh: 1133, dpr: 2, o: "portrait" },
  { w: 2266, h: 1488, dw: 744, dh: 1133, dpr: 2, o: "landscape" },
  { w: 1320, h: 2868, dw: 440, dh: 956, dpr: 3, o: "portrait" },
  { w: 2868, h: 1320, dw: 440, dh: 956, dpr: 3, o: "landscape" },
  { w: 1206, h: 2622, dw: 402, dh: 874, dpr: 3, o: "portrait" },
  { w: 2622, h: 1206, dw: 402, dh: 874, dpr: 3, o: "landscape" },
  { w: 1260, h: 2736, dw: 420, dh: 912, dpr: 3, o: "portrait" },
  { w: 2736, h: 1260, dw: 420, dh: 912, dpr: 3, o: "landscape" },
  { w: 1290, h: 2796, dw: 430, dh: 932, dpr: 3, o: "portrait" },
  { w: 2796, h: 1290, dw: 430, dh: 932, dpr: 3, o: "landscape" },
  { w: 1179, h: 2556, dw: 393, dh: 852, dpr: 3, o: "portrait" },
  { w: 2556, h: 1179, dw: 393, dh: 852, dpr: 3, o: "landscape" },
  { w: 1170, h: 2532, dw: 390, dh: 844, dpr: 3, o: "portrait" },
  { w: 2532, h: 1170, dw: 390, dh: 844, dpr: 3, o: "landscape" },
  { w: 1284, h: 2778, dw: 428, dh: 926, dpr: 3, o: "portrait" },
  { w: 2778, h: 1284, dw: 428, dh: 926, dpr: 3, o: "landscape" },
  { w: 1080, h: 2340, dw: 360, dh: 780, dpr: 3, o: "portrait" },
  { w: 2340, h: 1080, dw: 360, dh: 780, dpr: 3, o: "landscape" },
  { w: 1242, h: 2688, dw: 414, dh: 896, dpr: 3, o: "portrait" },
  { w: 2688, h: 1242, dw: 414, dh: 896, dpr: 3, o: "landscape" },
  { w: 1125, h: 2436, dw: 375, dh: 812, dpr: 3, o: "portrait" },
  { w: 2436, h: 1125, dw: 375, dh: 812, dpr: 3, o: "landscape" },
  { w: 828, h: 1792, dw: 414, dh: 896, dpr: 2, o: "portrait" },
  { w: 1792, h: 828, dw: 414, dh: 896, dpr: 2, o: "landscape" },
  { w: 1242, h: 2208, dw: 414, dh: 736, dpr: 3, o: "portrait" },
  { w: 2208, h: 1242, dw: 414, dh: 736, dpr: 3, o: "landscape" },
  { w: 750, h: 1334, dw: 375, dh: 667, dpr: 2, o: "portrait" },
  { w: 1334, h: 750, dw: 375, dh: 667, dpr: 2, o: "landscape" },
  { w: 640, h: 1136, dw: 320, dh: 568, dpr: 2, o: "portrait" },
  { w: 1136, h: 640, dw: 320, dh: 568, dpr: 2, o: "landscape" },
];

export default function IOSSplash() {
  return (
    <>
      {splashScreens.map((s) => (
        <link
          key={`${s.w}-${s.h}`}
          rel="apple-touch-startup-image"
          href={`/apple-splash-${s.w}-${s.h}.png`}
          media={`(device-width: ${s.dw}px) and (device-height: ${s.dh}px) and (-webkit-device-pixel-ratio: ${s.dpr}) and (orientation: ${s.o})`}
        />
      ))}
    </>
  );
}
