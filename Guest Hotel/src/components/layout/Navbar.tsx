import { useEffect, useState } from 'react';
import { Menu, X } from 'lucide-react';
import clsx from 'clsx';
import { nav } from '../../lib/content';
import { guestPortalUrl } from '../../lib/portal';
import Button from '../ui/Button';
import Logo from '../ui/Logo';
import { scrollToSection } from '../../hooks/useSmoothScroll';

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const go = (href: string) => {
    setOpen(false);
    scrollToSection(href);
  };

  return (
    <header
      className={clsx(
        'fixed inset-x-0 top-0 z-50 transition-all duration-500 ease-breath',
        scrolled ? 'bg-[#06121a]/75 shadow-soft backdrop-blur-xl' : 'bg-transparent',
      )}
    >
      <span
        aria-hidden
        className={clsx(
          'pointer-events-none absolute inset-x-0 bottom-0 h-px bg-ink/10 transition-opacity duration-500',
          scrolled ? 'opacity-100' : 'opacity-0',
        )}
      />

      <nav className="container-x flex h-20 items-center justify-between">
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            go('#top');
          }}
          aria-label="C'est La Stay — home"
        >
          <Logo className="h-9 md:h-10" />
        </a>

        <div className="hidden items-center gap-9 md:flex">
          {nav.slice(0, -1).map((l) => (
            <a
              key={l.href}
              href={l.href}
              onClick={(e) => {
                e.preventDefault();
                go(l.href);
              }}
              className={clsx(
                'font-sans text-sm font-medium tracking-wide transition-colors duration-300 ease-breath',
                scrolled ? 'text-ink/70 hover:text-ink' : 'text-white/85 hover:text-white',
              )}
            >
              {l.label}
            </a>
          ))}
          <a
            href={guestPortalUrl}
            className={clsx(
              'font-sans text-sm font-medium tracking-wide transition-colors duration-300 ease-breath',
              scrolled ? 'text-ink/70 hover:text-ink' : 'text-white/85 hover:text-white',
            )}
          >
            Login
          </a>
          <Button href="#reserve" variant={scrolled ? 'primary' : 'outline-light'}>
            Reserve
          </Button>
        </div>

        <button
          type="button"
          className={clsx('md:hidden', scrolled ? 'text-ink' : 'text-white')}
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
          aria-expanded={open}
        >
          {open ? <X size={26} strokeWidth={1.5} /> : <Menu size={26} strokeWidth={1.5} />}
        </button>
      </nav>

      <div
        className={clsx(
          'overflow-hidden bg-[#06121a]/95 backdrop-blur-xl transition-[max-height] duration-500 ease-breath md:hidden',
          open ? 'max-h-96' : 'max-h-0',
        )}
      >
        <div className="container-x flex flex-col py-3">
          {nav.map((l) => (
            <a
              key={l.href}
              href={l.href}
              onClick={(e) => {
                e.preventDefault();
                go(l.href);
              }}
              className="border-b border-ink/5 py-3 font-sans text-ink/80"
            >
              {l.label}
            </a>
          ))}
          <a
            href={guestPortalUrl}
            onClick={() => setOpen(false)}
            className="border-b border-ink/5 py-3 font-sans text-ink/80"
          >
            Login
          </a>
          <Button href="#reserve" variant="primary" className="mt-4 w-full" onClick={() => setOpen(false)}>
            Reserve Your Stay
          </Button>
        </div>
      </div>
    </header>
  );
}
