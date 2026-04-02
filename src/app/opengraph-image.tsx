import { ImageResponse } from 'next/og';

export const alt = 'VIYAC';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(145deg, #0a0a0a 0%, #18181b 45%, #0c0c0c 100%)',
          color: '#fafafa',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 200,
            height: 200,
            borderRadius: 40,
            background: 'linear-gradient(135deg, #00f2ff 0%, #7b2eff 100%)',
            color: '#0a0a0a',
            fontSize: 120,
            fontWeight: 800,
            marginBottom: 48,
          }}
        >
          V
        </div>
        <div
          style={{
            fontSize: 72,
            fontWeight: 800,
            letterSpacing: '-0.04em',
            marginBottom: 16,
          }}
        >
          VIYAC
        </div>
        <div style={{ fontSize: 28, color: '#a1a1aa' }}>Hybrid Soul</div>
      </div>
    ),
    { ...size },
  );
}
