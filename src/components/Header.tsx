import Image from 'next/image';
import Link from 'next/link';

export default function Header() {
  return (
    <header className="fixed top-0 left-0 w-full z-50 flex items-center justify-between h-20 px-6 md:px-12 bg-gradient-to-b from-black/90 via-black/50 to-transparent pointer-events-auto">
      <Link href="/" className="flex items-center gap-3 group">
        <div className="relative h-14 w-48 md:w-64">
          <Image 
            src="/logo.png" 
            alt="Project Infinity Logo" 
            fill 
            className="object-contain object-left opacity-80 group-hover:opacity-100 transition-opacity" 
          />
        </div>
      </Link>
      
      <nav className="flex items-center gap-8">
        <a 
          href="https://github.com/sam-eer31/universe-to-solar-system" 
          target="_blank" 
          rel="noopener noreferrer"
          className="group/github font-mono text-[10px] uppercase tracking-[0.15em] text-white/70 hover:text-white transition-all duration-300 flex items-center gap-2 border border-white/20 hover:border-white/50 bg-black/20 hover:bg-white/10 px-4 py-2 rounded-full backdrop-blur-md"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-70 group-hover/github:opacity-100 transition-opacity">
            <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"></path>
            <path d="M9 18c-4.51 2-5-2-7-2"></path>
          </svg>
          GitHub
        </a>
      </nav>
    </header>
  );
}
