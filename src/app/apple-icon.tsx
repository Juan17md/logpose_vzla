import { ImageResponse } from 'next/og';

// Route segment config
export const runtime = 'edge';

// Image metadata
export const size = {
  width: 180,
  height: 180,
};
export const contentType = 'image/png';

// Image generation
export default function Icon() {
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
