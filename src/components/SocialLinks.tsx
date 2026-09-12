const LINKS = [
  {
    href: "https://www.facebook.com/share/g/1CXGfwgHJY/",
    label: "Facebook",
    gradient: "from-[#1877F2] to-[#0C5DC7]",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
        <path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06C2 17.08 5.66 21.23 10.44 22v-7.03H7.9v-2.91h2.54V9.85c0-2.51 1.49-3.9 3.77-3.9 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56v1.88h2.78l-.44 2.91h-2.34V22C18.34 21.23 22 17.08 22 12.06Z" />
      </svg>
    ),
  },
  {
    href: "https://www.instagram.com/cpkef_/",
    label: "Instagram",
    gradient: "from-[#F58529] via-[#DD2A7B] to-[#8134AF]",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
        <path d="M12 2.16c3.2 0 3.58.01 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.47 1.38.9.42.42.67.82.9 1.38.16.42.36 1.05.41 2.23.06 1.27.07 1.64.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.23-.22.56-.47.96-.9 1.38-.42.42-.82.67-1.38.9-.42.16-1.05.36-2.23.41-1.27.06-1.64.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.8-.25-2.23-.41-.56-.22-.96-.47-1.38-.9-.42-.42-.67-.82-.9-1.38-.16-.42-.36-1.05-.41-2.23-.06-1.27-.07-1.64-.07-4.85s.01-3.58.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.47-.96.9-1.38.42-.42.82-.67 1.38-.9.42-.16 1.05-.36 2.23-.41 1.27-.06 1.64-.07 4.85-.07Zm0 4.68a5.16 5.16 0 1 0 0 10.32 5.16 5.16 0 0 0 0-10.32Zm0 8.52a3.36 3.36 0 1 1 0-6.72 3.36 3.36 0 0 1 0 6.72Zm5.36-8.72a1.2 1.2 0 1 1-2.4 0 1.2 1.2 0 0 1 2.4 0Z" />
      </svg>
    ),
  },
];

export default function SocialLinks() {
  return (
    <div className="flex items-center gap-3">
      {LINKS.map((link) => (
        <a
          key={link.label}
          href={link.href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={link.label}
          className={`flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br text-white shadow-md transition hover:scale-105 hover:shadow-lg ${link.gradient}`}
        >
          {link.icon}
        </a>
      ))}
    </div>
  );
}
