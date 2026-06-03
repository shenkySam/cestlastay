import { MapPin, Phone, Mail } from 'lucide-react';
import { brand, nav, footer } from '../../lib/content';
import { scrollToSection } from '../../hooks/useSmoothScroll';
import Logo from '../ui/Logo';

export default function Footer() {
  return (
    <footer className="relative border-t border-white/10 bg-[#06121a]/40 text-white/80 backdrop-blur-md">
      <div className="container-x py-16 md:py-20">
        <div className="grid gap-12 md:grid-cols-4">
          {/* Brand */}
          <div className="md:col-span-1">
            <Logo className="h-11" />
            <p className="mt-4 max-w-xs font-sans text-sm text-white/55">{footer.closingText}</p>
          </div>

          {/* Explore — in-page anchors only */}
          <nav className="md:col-span-1">
            <p className="eyebrow mb-4 text-sunset-300">Explore</p>
            <ul className="space-y-2.5">
              {nav.map((l) => (
                <li key={l.href}>
                  <a
                    href={l.href}
                    onClick={(e) => {
                      e.preventDefault();
                      scrollToSection(l.href);
                    }}
                    className="font-sans text-sm text-white/70 transition-colors duration-300 hover:text-white"
                  >
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          {/* Contact */}
          <div className="md:col-span-1">
            <p className="eyebrow mb-4 text-sunset-300">Contact</p>
            <ul className="space-y-3 font-sans text-sm text-white/70">
              <li className="flex items-start gap-3">
                <MapPin size={16} strokeWidth={1.5} className="mt-0.5 shrink-0 text-white/40" />
                <span>{footer.contact.address}</span>
              </li>
              <li className="flex items-center gap-3">
                <Phone size={16} strokeWidth={1.5} className="shrink-0 text-white/40" />
                <span>{footer.contact.phone}</span>
              </li>
              <li className="flex items-center gap-3">
                <Mail size={16} strokeWidth={1.5} className="shrink-0 text-white/40" />
                <span>{footer.contact.email}</span>
              </li>
            </ul>
          </div>

          {/* Hours */}
          <div className="md:col-span-1">
            <p className="eyebrow mb-4 text-sunset-300">Visit</p>
            <ul className="space-y-2.5 font-sans text-sm">
              {footer.hours.map((h) => (
                <li key={h.label} className="flex justify-between gap-4 border-b border-white/10 pb-2">
                  <span className="text-white/55">{h.label}</span>
                  <span className="text-white/85">{h.value}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-14 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-7 sm:flex-row">
          <p className="font-sans text-xs text-white/45">
            © {new Date().getFullYear()} {brand.name}. {brand.location}.
          </p>
          <p className="font-sans text-xs tracking-wide text-white/45">{footer.social.join('  ·  ')}</p>
        </div>
      </div>
    </footer>
  );
}
