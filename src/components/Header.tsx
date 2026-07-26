import Image from 'next/image';
import Link from 'next/link';

export default function Header() {
  return (
    <header className="fixed top-0 left-0 w-full z-50 flex items-center justify-between h-20 px-6 md:px-12 bg-gradient-to-b from-black/90 via-black/50 to-transparent pointer-events-auto">
      <Link href="/" className="flex items-center gap-3 group">
        <div className="relative w-8 h-8 rounded-full overflow-hidden border border-white/20 group-hover:border-white/60 transition-colors">
          <Image 
            src="/globe.svg" 
            alt="Logo" 
            fill 
            className="object-cover p-1 opacity-80 group-hover:opacity-100 transition-opacity invert" 
          />
        </div>
        <span className="font-mono text-xs uppercase tracking-[0.2em] text-white/70 group-hover:text-white transition-colors">
          Universe
        </span>
      </Link>
      
      <nav className="hidden md:flex items-center gap-8">
        {/* We can add future navigation links here */}
        <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-white/30">
          Cinematic Experience
        </span>
      </nav>
    </header>
  );
}
