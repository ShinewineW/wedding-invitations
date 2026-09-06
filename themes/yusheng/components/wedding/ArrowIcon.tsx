type ArrowDirection =
  | 'up-right'
  | 'down-right'
  | 'up'
  | 'down'
  | 'left'
  | 'right';

const paths: Record<ArrowDirection, string> = {
  'up-right': 'M5 19 19 5M5 5h14v14',
  'down-right': 'M5 5 19 19M5 19h14V5',
  up: 'M12 20V4m-7 7 7-7 7 7',
  down: 'M12 4v16m-7-7 7 7 7-7',
  left: 'M20 12H4m7-7-7 7 7 7',
  right: 'M4 12h16m-7-7 7 7-7 7',
};

export default function ArrowIcon({
  direction = 'up-right',
}: {
  direction?: ArrowDirection;
}) {
  return (
    <svg
      className="arrow-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={paths[direction]} />
    </svg>
  );
}
