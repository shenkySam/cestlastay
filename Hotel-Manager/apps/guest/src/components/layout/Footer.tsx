import { MapPin, Phone, Mail } from 'lucide-react';
import { brand, nav, footer } from '../../lib/content';
import { scrollToSection } from '../../hooks/useSmoothScroll';
import Logo from '../ui/Logo';

export default function Footer() {
  return (
    <footer className="relative border-t border-ink/10 bg-base/60 text-ink/80 backdrop-blur-md">
      <div className="container-x py-16 md:py-20">
        <div className="grid gap-12 md:grid-cols-4">
          {/* Brand */}
          <div className="md:col-span-1">
            <Logo className="h-11" light={false} />
            <p className="mt-4 max-w-xs font-sans text-sm text-muted">{footer.closingText}</p>
          </div>

          {/* Explore — in-page anchors only */}
          <nav className="md:col-span-1">
            <p className="eyebrow mb-4">Explore</p>
            <ul className="space-y-2.5">
              {nav.map((l) => (
                <li key={l.href}>
                  <a
                    href={l.href}
                    onClick={(e) => {
                      e.preventDefault();
                      scrollToSection(l.href);
                    }}
                    className="font-sans text-sm text-muted transition-colors duration-300 hover:text-ink"
                  >
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          {/* Contact */}
          <div className="md:col-span-1">
            <p className="eyebrow mb-4">Contact</p>
            <ul className="space-y-3 font-sans text-sm text-muted">
              <li className="flex items-start gap-3">
                <MapPin size={16} strokeWidth={1.5} className="mt-0.5 shrink-0 text-sunset-500" />
                <span>{footer.contact.address}</span>
              </li>
              <li className="flex items-center gap-3">
                <Phone size={16} strokeWidth={1.5} className="shrink-0 text-sunset-500" />
                <span>{footer.contact.phone}</span>
              </li>
              <li className="flex items-center gap-3">
                <Mail size={16} strokeWidth={1.5} className="shrink-0 text-sunset-500" />
                <span>{footer.contact.email}</span>
              </li>
            </ul>
          </div>

          {/* Hours */}
          <div className="md:col-span-1">
            <p className="eyebrow mb-4">Visit</p>
            <ul className="space-y-2.5 font-sans text-sm">
              {footer.hours.map((h) => (
                <li key={h.label} className="flex justify-between gap-4 border-b border-ink/10 pb-2">
                  <span className="text-muted">{h.label}</span>
                  <span className="text-ink">{h.value}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-14 flex flex-col items-center justify-between gap-4 border-t border-ink/10 pt-7 sm:flex-row">
          <p className="font-sans text-xs text-muted">
            © {new Date().getFullYear()} {brand.name}. {brand.location}.
          </p>
          <p className="font-sans text-xs tracking-wide text-muted">{footer.social.join('  ·  ')}</p>
        </div>
      </div>
    </footer>
  );
}
