import type { ReactNode, SVGProps } from 'react';

const shapes = {
  edit: (
    <>
      <path d="m16 3 5 5M4 20l4-1L21 6a2.1 2.1 0 0 0-3-3L5 16l-1 4Z" />
      <path d="M13 20h8" />
    </>
  ),
  camera: (
    <>
      <path d="M8 5 6 8H3v12h18V8h-3l-2-3H8Z" />
      <circle cx="12" cy="14" r="3.5" />
    </>
  ),
  upload: (
    <>
      <path d="M12 16V3m-5 5 5-5 5 5M4 16v5h16v-5" />
    </>
  ),
  save: (
    <>
      <path d="M5 3h12l4 4v14H3V3h2Zm2 0v6h10V3M7 21v-8h10v8" />
    </>
  ),
  close: <path d="m6 6 12 12M18 6 6 18" />,
  logout: (
    <>
      <path d="M9 4H4v16h5m5-12 4 4-4 4m-7-4h15" />
    </>
  ),
  login: (
    <>
      <path d="M14 4h6v16h-6M3 12h13M11 7l5 5-5 5" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="7" r="4" />
      <path d="M4 21v-2a8 8 0 0 1 16 0v2" />
    </>
  ),
  userPlus: (
    <>
      <circle cx="9" cy="7" r="4" />
      <path d="M2 21v-2a7 7 0 0 1 14 0v2M19 8v6m-3-3h6" />
    </>
  ),
  shield: (
    <>
      <path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Z" />
      <path d="m8 12 3 3 5-6" />
    </>
  ),
  graduation: (
    <>
      <path d="m2 9 10-5 10 5-10 5L2 9Zm4 2v6c4 3 8 3 12 0v-6m4-2v8" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  book: (
    <>
      <path d="M12 5v16M3 4c4-1 7 0 9 2 2-2 5-3 9-2v15c-4-1-7 0-9 2-2-2-5-3-9-2V4Z" />
    </>
  ),
  arrowRight: <path d="M4 12h16m-6-6 6 6-6 6" />,
  trash: (
    <>
      <path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7" />
    </>
  ),
  reset: (
    <>
      <path d="M3 10a9 9 0 1 1 2 8M3 4v6h6" />
    </>
  ),
} satisfies Record<string, ReactNode>;
export type IconName = keyof typeof shapes;

/** Decorative icons inherit the action label and color. */
export function Icon({
  name,
  size = 18,
  ...props
}: Omit<SVGProps<SVGSVGElement>, 'name' | 'children'> & { name: IconName; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {shapes[name]}
    </svg>
  );
}
