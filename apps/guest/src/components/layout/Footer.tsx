import { useState } from 'react';
import type { FormEvent } from 'react';
import { MapPin, Phone, Mail, Loader2, Check } from 'lucide-react';
import { brand, nav, footer } from '../../lib/content';
import { scrollToSection } from '../../hooks/useSmoothScroll';
import api from '../../lib/api';
import Logo from '../ui/Logo';
import Button from '../ui/Button';

type SubStatus = 'idle' | 'submitting' | 'done' | 'error';

/** Newsletter signup — posts to the public POST /crm/subscribe endpoint. */
function NewsletterForm() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<SubStatus>('idle');
  const [msg, setMsg] = useState('');

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) {
      setStatus('error');
      setMsg('Please enter a valid email.');
      return;
    }
    setStatus('submitting');
    try {
      await api.post('/crm/subscribe', { email: email.trim(), source: 'guest-footer' });
      setStatus('done');
      setMsg('Thank you — you’re on the list.');
      setEmail('');
    } catch {
      setStatus('error');
      setMsg('Couldn’t subscribe just now. Please try again.');
    }
  };

  if (status === 'done') {
    return (
      <p className="mt-6 flex items-center gap-2 font-sans text-sm text-palm-700">
        <Check size={16} strokeWidth={1.8} aria-hidden /> {msg}
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mt-6" noValidate>
      <label htmlFor="newsletter-email" className="eyebrow mb-2 block">
        Newsletter
      </label>
      <div className="flex items-center gap-2">
        <input
          id="newsletter-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@email.com"
          autoComplete="email"
          className="field flex-1"
          aria-label="Email address"
        />
        <Button type="submit" variant="primary" disabled={status === 'submitting'}>
          {status === 'submitting' ? <Loader2 size={16} className="animate-spin" /> : 'Join'}
        </Button>
      </div>
      {status === 'error' && <p className="mt-2 font-sans text-xs text-red-600">{msg}</p>}
    </form>
  );
}

export default function Footer() {
  return (
    <footer className="relative border-t border-ink/10 bg-base/60 text-ink/80 backdrop-blur-md">
      <div className="container-x py-16 md:py-20">
        <div className="grid gap-12 md:grid-cols-4">
          {/* Brand */}
          <div className="md:col-span-1">
            <Logo className="h-11" light={false} />
            <p className="mt-4 max-w-xs font-sans text-sm text-muted">{footer.closingText}</p>
            <NewsletterForm />
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
