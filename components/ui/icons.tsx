import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Svg({ size = 24, children, ...rest }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {children}
    </svg>
  );
}

/* Grade icons, same paths as the original cards */
export const GRADE_ICON_PATHS: Record<string, string> = {
  cap: 'M2 9 L12 4 L22 9 L12 14 Z M6 11 V16 C6 17.5 9 19 12 19 C15 19 18 17.5 18 16 V11 M22 9 V15',
  book: 'M2 5 C5 4 9 4 12 6 C15 4 19 4 22 5 V19 C19 18 15 18 12 20 C9 18 5 18 2 19 Z M12 6 V20',
  sprout: 'M12 21 V11 M12 11 C12 7 9 5 5 5 C5 9 8 11 12 11 Z M12 13 C12 9 15 7 19 7 C19 11 16 13 12 13 Z',
  star: 'M12 3 L14.6 8.6 L20.6 9.3 L16.1 13.4 L17.3 19.4 L12 16.4 L6.7 19.4 L7.9 13.4 L3.4 9.3 L9.4 8.6 Z',
  pen: 'M4 20 L4.8 15.6 L15.6 4.8 C16.4 4 17.6 4 18.4 4.8 L19.2 5.6 C20 6.4 20 7.6 19.2 8.4 L8.4 19.2 Z M13.6 6.8 L17.2 10.4',
  trophy: 'M8 4 H16 V9 C16 11.2 14.2 13 12 13 C9.8 13 8 11.2 8 9 Z M8 6 H4.5 C4.5 8.5 6 10 8.3 10.3 M16 6 H19.5 C19.5 8.5 18 10 15.7 10.3 M12 13 V17 M8.5 20 H15.5 M9.5 17 H14.5 V20 H9.5 Z',
};

export const GRADE_ICON_LABELS: Record<string, string> = {
  cap: 'قبعة تخرج',
  book: 'كتاب',
  sprout: 'نبتة',
  star: 'نجمة',
  pen: 'قلم',
  trophy: 'كأس',
};

export function GradeIcon({ icon, color = '#6E1F2E' }: { icon: string; color?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d={GRADE_ICON_PATHS[icon] ?? GRADE_ICON_PATHS.cap} />
    </svg>
  );
}

/* Game type icons */
const TYPE_PATHS: Record<string, React.ReactNode> = {
  mcq: (
    <>
      <path d="M10 6 H20 M10 12 H20 M10 18 H20" />
      <circle cx="5" cy="6" r="1.6" />
      <circle cx="5" cy="12" r="1.6" fill="currentColor" />
      <circle cx="5" cy="18" r="1.6" />
    </>
  ),
  true_false: (
    <>
      <path d="M3 12.5 L6.5 16 L11 9" />
      <path d="M14.5 9 L20.5 15 M20.5 9 L14.5 15" />
    </>
  ),
  matching: (
    <>
      <circle cx="5" cy="6" r="2" />
      <circle cx="5" cy="18" r="2" />
      <circle cx="19" cy="6" r="2" />
      <circle cx="19" cy="18" r="2" />
      <path d="M7 6.8 L17 17.2 M7 17.2 L17 6.8" />
    </>
  ),
  memory: (
    <>
      <rect x="3" y="5" width="9" height="13" rx="2" />
      <path d="M14.5 6.2 L19.6 7.6 C20.6 7.9 21.2 9 20.9 10 L18.6 18.4 C18.3 19.4 17.3 20 16.3 19.7 L13 18.8" />
      <path d="M7.5 9.5 V13.5 M5.5 11.5 H9.5" />
    </>
  ),
  scramble: (
    <>
      <path d="M16 3 H21 V8" />
      <path d="M4 20 L21 3" />
      <path d="M21 16 V21 H16" />
      <path d="M15 15 L21 21" />
      <path d="M4 4 L9 9" />
    </>
  ),
  fill_blank: (
    <>
      <path d="M3 7 H21" />
      <path d="M3 12 H8" />
      <rect x="10" y="10" width="8" height="4" rx="1" strokeDasharray="2 2" />
      <path d="M20 12 H21" />
      <path d="M3 17 H15" />
    </>
  ),
  classify: (
    <>
      <path d="M3 10 H8 V20 H3 Z M9.5 10 H14.5 V20 H9.5 Z M16 10 H21 V20 H16 Z" />
      <path d="M12 3 V7 M10 5 L12 7 L14 5" />
    </>
  ),
  word_search: (
    <>
      <path d="M3 4 H5 M8 4 H10 M3 8 H5 M3 12 H5 M8 8 H10" />
      <circle cx="14.5" cy="14.5" r="4.5" />
      <path d="M18 18 L21.5 21.5" />
    </>
  ),
};

export function GameTypeIcon({ type, size = 24, ...rest }: IconProps & { type: string }) {
  return (
    <Svg size={size} strokeWidth={1.9} {...rest}>
      {TYPE_PATHS[type] ?? TYPE_PATHS.mcq}
    </Svg>
  );
}

/* UI icons */
export const ChevronStart = (p: IconProps) => (
  <Svg {...p} strokeWidth={2.4}>
    <path d="M9 6 L15 12 L9 18" />
  </Svg>
);
export const ChevronEnd = (p: IconProps) => (
  <Svg {...p} strokeWidth={2.4}>
    <path d="M15 6 L9 12 L15 18" />
  </Svg>
);
export const ChevronDown = (p: IconProps) => (
  <Svg {...p} strokeWidth={2.4}>
    <path d="M6 9 L12 15 L18 9" />
  </Svg>
);
export const CheckIcon = (p: IconProps) => (
  <Svg {...p} strokeWidth={2.6}>
    <path d="M4.5 12.5 L9.5 17.5 L19.5 6.5" />
  </Svg>
);
export const XIcon = (p: IconProps) => (
  <Svg {...p} strokeWidth={2.6}>
    <path d="M6 6 L18 18 M18 6 L6 18" />
  </Svg>
);
export const ClockIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7 V12 L15.5 14" />
  </Svg>
);
export const TrophyIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d={GRADE_ICON_PATHS.trophy} />
  </Svg>
);
export const UserIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21 C4 16.6 7.6 14 12 14 C16.4 14 20 16.6 20 21" />
  </Svg>
);
export const LogoutIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M14 4 H6 C5 4 4 5 4 6 V18 C4 19 5 20 6 20 H14" />
    <path d="M10 12 H21 M17 8 L21 12 L17 16" />
  </Svg>
);
export const PlusIcon = (p: IconProps) => (
  <Svg {...p} strokeWidth={2.4}>
    <path d="M12 5 V19 M5 12 H19" />
  </Svg>
);
export const EditIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d={GRADE_ICON_PATHS.pen} />
  </Svg>
);
export const TrashIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 7 H20 M9 7 V4.5 H15 V7 M6.5 7 L7.5 20 H16.5 L17.5 7 M10 11 V16 M14 11 V16" />
  </Svg>
);
export const CopyIcon = (p: IconProps) => (
  <Svg {...p}>
    <rect x="8" y="8" width="12" height="12" rx="2" />
    <path d="M16 8 V6 C16 5 15 4 14 4 H6 C5 4 4 5 4 6 V14 C4 15 5 16 6 16 H8" />
  </Svg>
);
export const EyeIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M2 12 C4.5 7 8 5 12 5 C16 5 19.5 7 22 12 C19.5 17 16 19 12 19 C8 19 4.5 17 2 12 Z" />
    <circle cx="12" cy="12" r="3" />
  </Svg>
);
export const UploadIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 16 V4 M7 9 L12 4 L17 9 M4 16 V19 C4 19.6 4.4 20 5 20 H19 C19.6 20 20 19.6 20 19 V16" />
  </Svg>
);
export const ArrowUpIcon = (p: IconProps) => (
  <Svg {...p} strokeWidth={2.4}>
    <path d="M12 19 V5 M6 11 L12 5 L18 11" />
  </Svg>
);
export const ArrowDownIcon = (p: IconProps) => (
  <Svg {...p} strokeWidth={2.4}>
    <path d="M12 5 V19 M6 13 L12 19 L18 13" />
  </Svg>
);
export const RefreshIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M20 11 C19.5 7 16 4 12 4 C8.5 4 5.6 6.2 4.5 9.3 M4 4 V9.5 H9.5" />
    <path d="M4 13 C4.5 17 8 20 12 20 C15.5 20 18.4 17.8 19.5 14.7 M20 20 V14.5 H14.5" />
  </Svg>
);
export const HomeIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 11 L12 4 L21 11 M5.5 9.5 V20 H10 V14.5 H14 V20 H18.5 V9.5" />
  </Svg>
);
export const ChartIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 20 V4 M4 20 H20" />
    <path d="M8 16 V12 M12 16 V8 M16 16 V11" strokeWidth={2.6} />
  </Svg>
);
export const UsersIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="9" cy="8" r="3.5" />
    <path d="M2.5 20 C2.5 16.4 5.4 14 9 14 C12.6 14 15.5 16.4 15.5 20" />
    <path d="M15.5 4.8 C17.3 5.3 18.5 6.9 18.5 8.6 C18.5 10.3 17.4 11.8 15.8 12.3 M18 14.4 C20.2 15.2 21.5 17.3 21.5 20" />
  </Svg>
);
export const QuoteIcon = ({ size = 24, ...p }: IconProps) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true" {...p}>
    <path d="M4 17 C4 13 5.5 9.5 9.5 7 L10.6 8.6 C8.4 10.1 7.6 11.7 7.5 13 L10 13 L10 19 L4 19 Z M13.5 17 C13.5 13 15 9.5 19 7 L20.1 8.6 C17.9 10.1 17.1 11.7 17 13 L19.5 13 L19.5 19 L13.5 19 Z" />
  </svg>
);
export const LayersIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 3 L22 8 L12 13 L2 8 Z" />
    <path d="M2 12.5 L12 17.5 L22 12.5 M2 16.5 L12 21.5 L22 16.5" />
  </Svg>
);
export const GamepadIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M7 8 H17 C19.8 8 22 10.2 22 13 C22 15.8 20.4 18 18 18 C16.4 18 15.5 17 14.6 16 H9.4 C8.5 17 7.6 18 6 18 C3.6 18 2 15.8 2 13 C2 10.2 4.2 8 7 8 Z" />
    <path d="M7 11 V15 M5 13 H9" />
    <circle cx="16" cy="12" r="0.9" fill="currentColor" />
    <circle cx="18" cy="14.5" r="0.9" fill="currentColor" />
  </Svg>
);
export const ShuffleIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M16 3 H21 V8 M4 20 L21 3 M21 16 V21 H16 M15 15 L21 21 M4 4 L9 9" />
  </Svg>
);
export const LockIcon = (p: IconProps) => (
  <Svg {...p}>
    <rect x="5" y="11" width="14" height="10" rx="2" />
    <path d="M8 11 V7.5 C8 5.3 9.8 3.5 12 3.5 C14.2 3.5 16 5.3 16 7.5 V11" />
  </Svg>
);
export const FlameIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 21 C8 21 5.5 18.4 5.5 15 C5.5 11 9 9.5 9 5.5 C11.5 7 12.5 9 12.5 10.5 C13.5 9.8 14.2 8.7 14.3 7.4 C16.8 9 18.5 11.8 18.5 15 C18.5 18.4 16 21 12 21 Z" />
  </Svg>
);
export const StarIcon = ({ filled, size = 24, ...p }: IconProps & { filled?: boolean }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" {...p}>
    <path
      d={GRADE_ICON_PATHS.star}
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinejoin="round"
    />
  </svg>
);
export const ImageIcon = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <circle cx="8.5" cy="9.5" r="1.8" />
    <path d="M21 16 L15.5 10.5 L6 20" />
  </Svg>
);
export const GripIcon = ({ size = 24, ...p }: IconProps) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true" {...p}>
    <circle cx="9" cy="6" r="1.6" />
    <circle cx="15" cy="6" r="1.6" />
    <circle cx="9" cy="12" r="1.6" />
    <circle cx="15" cy="12" r="1.6" />
    <circle cx="9" cy="18" r="1.6" />
    <circle cx="15" cy="18" r="1.6" />
  </svg>
);
export const SearchIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="M16 16 L20.5 20.5" />
  </Svg>
);
export const KeyIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="8" cy="15" r="4.5" />
    <path d="M11.2 11.8 L20 3 M16.5 6.5 L19 9 M14 9 L16 11" />
  </Svg>
);
export const BoltIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M13 2 L4 14 H11 L10 22 L20 9 H13 Z" />
  </Svg>
);
