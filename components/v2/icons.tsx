import type { ReactNode, SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & {
  size?: number;
};

function IconBase({ size = 20, children, ...props }: IconProps & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

export function IconFolderOpen(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M3 7.5V18a1.5 1.5 0 0 0 1.5 1.5h15A1.5 1.5 0 0 0 21 18V9.5A1.5 1.5 0 0 0 19.5 8H12L9.7 5.7A1.5 1.5 0 0 0 8.6 5.3H4.5A1.5 1.5 0 0 0 3 6.8v.7Z" />
      <path d="M3 11h18" />
    </IconBase>
  );
}

export function IconMap(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M9 4.5 3.75 6.5v13L9 17.5l6 2 5.25-2v-13L15 6.5 9 4.5Z" />
      <path d="M9 4.5v13" />
      <path d="M15 6.5v13" />
    </IconBase>
  );
}

export function IconDescription(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M7 3.75h7.5L19.5 9v11.25A1.5 1.5 0 0 1 18 21.75H7A1.5 1.5 0 0 1 5.5 20.25V5.25A1.5 1.5 0 0 1 7 3.75Z" />
      <path d="M14.5 3.75V9h5" />
      <path d="M9 13h6" />
      <path d="M9 16.5h4.5" />
    </IconBase>
  );
}

export function IconSettings(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3.5v2.2M12 18.3v2.2M4.9 6.4l1.6 1.6M17.5 16l1.6 1.6M3.5 12h2.2M18.3 12h2.2M4.9 17.6l1.6-1.6M17.5 8l1.6-1.6" />
    </IconBase>
  );
}

export function IconAttachFile(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M15.5 7.5v8.2a3.5 3.5 0 1 1-7 0V6.8a2.3 2.3 0 1 1 4.6 0v8.4a1.1 1.1 0 1 1-2.2 0V7.5" />
    </IconBase>
  );
}

export function IconSmartToy(props: IconProps) {
  return (
    <IconBase {...props}>
      <rect x="5" y="8" width="14" height="11" rx="2" />
      <path d="M12 4.5v3.5" />
      <circle cx="12" cy="3.5" r="1" />
      <path d="M9 13h.01M15 13h.01" />
      <path d="M9 16.5h6" />
      <path d="M5 12H3.5M20.5 12H19" />
    </IconBase>
  );
}

export function IconVerified(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M12 3.5 14.2 5l2.6.4.9 2.5 2.1 1.7-1.1 2.4.4 2.6-2.3 1.3L15.8 19l-2.5.9L12 21.5l-1.3-1.6-2.5-.9-1-.2.4-2.6-1.1-2.4 2.1-1.7.9-2.5 2.6-.4L12 3.5Z" />
      <path d="m9.5 12 1.7 1.7 3.5-3.6" />
    </IconBase>
  );
}

export function IconHistoryEdu(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M4.5 19.5h10" />
      <path d="M6 19.5 16.5 5.8a1.6 1.6 0 0 1 2.3-.2l.6.6a1.6 1.6 0 0 1-.2 2.3L8.7 19.5" />
      <path d="m14.5 7.5 2.8 2.8" />
    </IconBase>
  );
}

export function IconMonitoring(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M4 19h16" />
      <path d="M7 16V11" />
      <path d="M12 16V7" />
      <path d="M17 16v-4" />
    </IconBase>
  );
}

export function IconGroups(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="9" cy="9" r="2.5" />
      <circle cx="16" cy="10" r="2" />
      <path d="M4.5 18c.6-2.4 2.4-3.5 4.5-3.5s3.9 1.1 4.5 3.5" />
      <path d="M13.5 18c.3-1.5 1.3-2.5 2.7-2.5 1.6 0 2.7 1 3.1 2.5" />
    </IconBase>
  );
}
