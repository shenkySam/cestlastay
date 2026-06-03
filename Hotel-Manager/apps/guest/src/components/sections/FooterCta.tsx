import { footer } from '../../lib/content';
import Button from '../ui/Button';
import Reveal from '../ui/Reveal';

export default function FooterCta() {
  return (
    <section className="relative flex min-h-[68vh] items-center">
      {/* lift the closing line off the scene */}
      <div aria-hidden className="scrim-text pointer-events-none absolute inset-0" />

      <div className="container-x relative w-full py-28 text-center">
        <Reveal className="mx-auto max-w-2xl">
          <p className="eyebrow mb-5 text-sunset-300">{footer.closingEyebrow}</p>
          <h2 className="font-serif text-[clamp(2.4rem,6vw,4.6rem)] font-medium leading-[1.05] text-white">
            {footer.closingTitle}
          </h2>
          <p className="mx-auto mt-6 max-w-md font-sans text-lg leading-relaxed text-white/80">
            {footer.closingText}
          </p>
          <div className="mt-10 flex justify-center">
            <Button href="#reserve" variant="primary" size="lg">
              Reserve Your Stay
            </Button>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
