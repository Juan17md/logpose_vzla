import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export const size = {
  width: 32,
  height: 32,
};
export const contentType = 'image/png';

export default function Favicon() {
  return new ImageResponse(
    (
      <div
        style={{
          background: '#0f172a',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <svg width="70%" height="70%" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="50" cy="50" r="35" stroke="#FBBF24" strokeWidth="6" />
          <path d="M50 25L58 50L50 75L42 50L50 25Z" fill="white" />
          <circle cx="50" cy="50" r="6" fill="#EF4444" />
        </svg>
      </div>
    ),
    {
      ...size,
    }
  );
}
