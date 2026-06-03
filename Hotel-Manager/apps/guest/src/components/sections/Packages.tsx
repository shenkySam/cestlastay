import clsx from 'clsx';
import { Check } from 'lucide-react';
import { packages, formatPrice } from '../../lib/content';
import Img from '../ui/Img';
import Button from '../ui/Button';
import Divider from '../ui/Divider';
import Reveal from '../ui/Reveal';

export default function Packages() {
  return (
    <section id="packages" className="pb-24 pt-24 md:pb-28 md:pt-28">
      <div className="container-x">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="eyebrow mb-4">{packages.eyebrow}</p>
          <h2 className="font-serif text-[clamp(2rem,4.4vw,3.4rem)] font-medium leading-[1.08] text-ink">
            {packages.title}
          </h2>
          <p className="mt-5 font-sans leading-relaxed text-muted">{packages.intro}</p>
        </Reveal>

        {/* Three transform layers so entrance (GSAP) + idle float (CSS) +
            hover lift never fight over the same `transform`. */}
        <Reveal className="mt-16 grid items-stretch gap-7 md:grid-cols-3" stagger={0.14}>
          {packages.items.map((p, i) => (
            <div key={p.id} className={clsx('h-full', p.featured && 'md:-mt-6')}>
              <div className="h-full animate-floaty" style={{ animationDelay: `${i * 0.8}s` }}>
                <article
                  className={clsx(
                    'group card relative flex h-full flex-col overflow-hidden transition-all duration-500 ease-breath hover:-translate-y-2 hover:shadow-lift',
                    p.featured && 'ring-1 ring-ocean-500/40',
                  )}
                >
                  <div className="relative">
                    <Img
                      src={p.image}
                      alt={p.name}
                      className="aspect-[16/11] w-full"
                      imgClassName="transition-transform duration-[1.6s] ease-breath group-hover:scale-[1.05]"
                    />
                    <span
                      className={clsx(
                        'absolute right-4 top-4 rounded-token px-3 py-1 font-sans text-[0.7rem] uppercase tracking-[0.16em] backdrop-blur-sm',
                        p.featured ? 'bg-ocean-600 text-white' : 'border border-white/15 bg-[#06121a]/55 text-white',
                      )}
                    >
                      {p.badge}
                    </span>
                  </div>

                  <div className="flex flex-1 flex-col p-7">
                    <h3 className="font-serif text-2xl text-ink">{p.name}</h3>
                    <p className="mt-2 font-sans text-sm leading-relaxed text-muted">{p.description}</p>

                    <ul className="mt-5 space-y-2.5">
                      {p.includes.map((inc) => (
                        <li key={inc} className="flex items-start gap-2.5 font-sans text-sm text-ink/75">
                          <Check size={16} strokeWidth={1.6} className="mt-0.5 shrink-0 text-palm-600" />
                          {inc}
                        </li>
                      ))}
                    </ul>

                    <div className="mt-auto pt-6">
                      <Divider className="mb-5" />
                      <div className="flex items-end justify-between gap-3">
                        <div>
                          <span className="font-sans text-xs uppercase tracking-[0.14em] text-muted">
                            from
                          </span>
                          <div>
                            <span className="font-serif text-2xl text-ink">{formatPrice(p.priceFrom)}</span>
                            <span className="font-sans text-sm text-muted"> / {p.nights} nights</span>
                          </div>
                        </div>
                        <Button href="#reserve" variant={p.featured ? 'accent' : 'primary'}>
                          Book Package
                        </Button>
                      </div>
                    </div>
                  </div>
                </article>
              </div>
            </div>
          ))}
        </Reveal>
      </div>
    </section>
  );
}
