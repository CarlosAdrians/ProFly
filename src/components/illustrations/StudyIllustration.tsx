import { useId } from 'react';

export type StudyScene =
  'morning' | 'afternoon' | 'night' | 'history' | 'document' | 'missing' | 'maintenance';

/** Original vector artwork: layered stationery, the campus arch and the institutional emblem. */
export function StudyIllustration({ scene, className }: { scene: StudyScene; className?: string }) {
  const id = useId().replaceAll(':', '');
  const night = scene === 'night';
  const ink = night ? '#d3e5ff' : '#274d80';
  const accent =
    scene === 'morning'
      ? '#efb75e'
      : scene === 'afternoon'
        ? '#64bfa7'
        : night
          ? '#9c94e3'
          : '#6b9fe3';
  return (
    <svg
      viewBox="0 0 240 170"
      fill="none"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <clipPath id={id}>
          <rect x="47" y="29" width="150" height="115" rx="10" />
        </clipPath>
      </defs>
      <ellipse cx="121" cy="151" rx="91" ry="9" fill="#234579" opacity=".09" />
      <path
        d="M31 80c-12-43 24-72 57-60 37 14 49-21 87-10 47 13 48 67 26 97-25 35-159 30-170-27Z"
        fill={night ? '#283c68' : '#edf3fc'}
      />
      {scene === 'missing' || scene === 'maintenance' ? (
        <>
          <path d="M43 130V59h153v71" fill="#fff" stroke="#afc5e1" strokeWidth="2" />
          <path d="M82 130V60c0-34 79-34 79 0v70" fill="#dbeaf5" stroke="#8dabc8" strokeWidth="2" />
          <path
            d="M88 62h67M87 85h69M88 108h66M109 35v95m23-94v94"
            stroke="#95b6cf"
            strokeWidth="2"
          />
          <path d="M30 131h180v8H30z" fill="#c4d4e6" />
          <path d="M20 143h202" stroke="#8eaccf" strokeWidth="2" strokeLinecap="round" />
          <rect x="71" y="90" width="104" height="51" rx="7" fill="#234b8d" />
          <image href="/images/unifacisa-symbol.png" x="78" y="97" width="28" height="32" />
          {scene === 'missing' ? (
            <text
              x="116"
              y="124"
              fill="white"
              fontFamily="system-ui,sans-serif"
              fontSize="28"
              fontWeight="700"
            >
              404
            </text>
          ) : (
            <>
              <path
                d="m130 106 15 15m-6-23a10 10 0 0 0-12 12l-15 15 6 6 15-15a10 10 0 0 0 12-12l-6 6-6-6 6-6Z"
                stroke="white"
                strokeWidth="3"
                strokeLinejoin="round"
              />
              <path
                d="M184 66v63m17-63v63m-22-45h28m-28 22h28"
                stroke="#e3ac56"
                strokeWidth="4"
                strokeLinecap="round"
              />
            </>
          )}
          <path
            d="M36 129V98m0 9c-14-17-16 0 0 10m0-12c13-18 17 0 0 12"
            stroke="#589e8a"
            strokeWidth="4"
            strokeLinecap="round"
          />
        </>
      ) : (
        <>
          <g transform={scene === 'document' ? 'rotate(5 120 85)' : 'rotate(-5 120 85)'}>
            <rect x="43" y="39" width="153" height="111" rx="10" fill="#b6cbe4" />
            <rect x="46" y="34" width="153" height="111" rx="10" fill="#dbe5f1" stroke="#abc2dc" />
            <rect
              x="47"
              y="29"
              width="150"
              height="111"
              rx="10"
              fill={night ? '#213862' : '#fff'}
              stroke={night ? '#50638a' : '#aac2df'}
              strokeWidth="2"
            />
            <g clipPath={`url(#${id})`}>
              <path d="M47 29h150v24H47z" fill={accent} opacity={night ? '.5' : '.35'} />
              <path
                d="M64 76h111M64 94h111M64 112h76"
                stroke={night ? '#60749a' : '#dce6f2'}
                strokeWidth="3"
                strokeLinecap="round"
              />
              <path d="M79 53v87" stroke={night ? '#65799d' : '#e1e8f3'} strokeWidth="2" />
            </g>
            {[66, 90, 114, 138, 162, 184].map((x) => (
              <path
                key={x}
                d={`M${x} 35V24`}
                stroke={night ? '#a7badd' : '#7898c0'}
                strokeWidth="4"
                strokeLinecap="round"
              />
            ))}
            <image href="/images/unifacisa-symbol.png" x="151" y="98" width="24" height="28" />
          </g>
          {scene === 'document' ? (
            <>
              <path
                d="M35 81h46l9 13h83v48a8 8 0 0 1-8 8H43a8 8 0 0 1-8-8V81Z"
                fill="#cadcf4"
                stroke="#7c9fc8"
                strokeWidth="2"
              />
              <path
                d="m113 106 23 8v14c0 15-23 24-23 24s-23-9-23-24v-14l23-8Z"
                fill="#fff"
                stroke="#4675ac"
                strokeWidth="2"
              />
              <path
                d="m103 126 7 7 13-16"
                stroke="#3e947c"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </>
          ) : scene === 'history' ? (
            <>
              <circle cx="72" cy="109" r="34" fill="#d2dfef" />
              <circle cx="72" cy="103" r="34" fill="#fff" stroke="#718fb7" strokeWidth="2" />
              <path
                d="M72 81v23l15 9M72 74v4m0 51v4m-30-30h4m51 0h4"
                stroke={ink}
                strokeWidth="3"
                strokeLinecap="round"
              />
              <path d="m180 32 4 8 9 1-7 6 2 9-8-5-8 5 2-9-7-6 9-1 4-8Z" fill="#e9b96d" />
            </>
          ) : (
            <>
              {night ? (
                <>
                  <path
                    d="M76 57c-22 0-30 35-6 45 15 6 29-3 33-15-21 8-36-13-27-30Z"
                    fill="#f5df9c"
                  />
                  <path
                    d="m168 66 2 6 6 2-6 2-2 6-2-6-6-2 6-2 2-6Zm-57-3 2 5 5 2-5 2-2 5-2-5-5-2 5-2 2-5Z"
                    fill="#c8c5fc"
                  />
                </>
              ) : (
                <>
                  <circle
                    cx="76"
                    cy="81"
                    r="23"
                    fill={scene === 'morning' ? '#f9d38d' : '#f4cb78'}
                  />
                  <path
                    d="M76 48v-6m0 78v-6m-33-33h-6m78 0h-6M53 58l-5-5m56 56-5-5m0-46 5-5m-56 56 5-5"
                    stroke={accent}
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                  {scene === 'morning' && (
                    <path
                      d="M37 98h82M45 108h66"
                      stroke="#6c9fbd"
                      strokeWidth="4"
                      strokeLinecap="round"
                    />
                  )}
                </>
              )}
              <path
                d="m180 63 10 3-16 63-10-3 16-63Z"
                fill={accent}
                stroke={ink}
                strokeWidth="1.5"
              />
              <path d="m164 126 10 3-9 9-1-12Z" fill="#dfc29c" />
            </>
          )}
        </>
      )}
    </svg>
  );
}
