import Image from 'next/image';
import Link from 'next/link';
import { Github } from 'lucide-react';

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
          <Github className="w-3.5 h-3.5 opacity-70 group-hover/github:opacity-100 transition-opacity" />
          GitHub
        </a>
      </nav>
    </header>
  );
}
