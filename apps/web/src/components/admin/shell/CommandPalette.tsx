import {
  forwardRef,
  KeyboardEvent as ReactKeyboardEvent,
  ReactNode,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, LayoutGroup, motion, useIsPresent } from 'framer-motion';
import {
  ArrowDownIcon,
  ArrowUpIcon,
  BellRingingIcon,
  BroomIcon,
  CallBellIcon,
  CommandIcon,
  DoorOpenIcon,
  KeyReturnIcon,
  MagnifyingGlassIcon,
  SignOutIcon,
} from '@phosphor-icons/react';
import type { Icon } from '@phosphor-icons/react';
import clsx from 'clsx';
import { useAuth } from '@/contexts/AuthContext';
import { EmptyState, snappy } from '@/components/admin/ui';
import { ADMIN_NAV } from './nav';
import { TypewriterHint } from './TypewriterHint';
import { isApplePlatform, useMediaQuery, useScrollLock } from './hooks';

type GroupName = 'Pages' | 'Actions';

interface Command {
  id: string;
  group: GroupName;
  label: string;
  hint?: string;
  icon: Icon;
  keywords: string;
  run: () => void;
}

/** Shared by the trigger pill and the dialog surface, so one morphs into the other. */
const SURFACE_ID = 'admin-cmdk-surface';
const GROUPS: GroupName[] = ['Pages', 'Actions'];
const MAC = isApplePlatform();

function matches(command: Command, query: string): boolean {
  const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return true;
  const haystack = `${command.label} ${command.keywords} ${command.hint ?? ''}`.toLowerCase();
  return tokens.every((token) => haystack.includes(token));
}

/**
 * ⌘K / Ctrl+K palette. On md+ the trigger is a pill whose surface morphs into
 * the dialog (shared layoutId); on small screens it's an icon button and the
 * dialog springs in on its own. The dialog portals into #admin-overlay-root so
 * the top bar's backdrop-filter never becomes its containing block.
 */
export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  const morph = useMediaQuery('(min-width: 768px)');
  const triggerRef = useRef<HTMLButtonElement>(null);
  const openRef = useRef(open);
  openRef.current = open;
  const navigate = useNavigate();
  const { logout } = useAuth();

  useScrollLock(open);

  // The overlay root is a later sibling in AdminLayout; it's in the DOM by the time effects run.
  useEffect(() => {
    setPortalTarget(document.getElementById('admin-overlay-root') ?? document.body);
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    triggerRef.current?.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key ?? '').toLowerCase() !== 'k' || !(e.metaKey || e.ctrlKey) || e.altKey || e.shiftKey) return;
      e.preventDefault();
      if (openRef.current) close();
      else setOpen(true);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [close]);

  const commands = useMemo<Command[]>(() => {
    const go = (href: string) => () => navigate(href);
    const pages: Command[] = ADMIN_NAV.flatMap((group) =>
      group.items.map((item) => ({
        id: `page:${item.href}`,
        group: 'Pages' as const,
        label: item.label,
        hint: group.label,
        icon: item.icon,
        // Generic verbs so the typed hints ("Jump to bookings") match literally.
        keywords: `${item.keywords ?? ''} jump go to open page`,
        run: go(item.href),
      })),
    );
    const actions: Command[] = [
      { id: 'act:front-desk', group: 'Actions', label: 'Open the front desk', hint: 'Front desk', icon: CallBellIcon, keywords: 'staff portal reception', run: go('/staff') },
      { id: 'act:checkin', group: 'Actions', label: 'Check guests in or out', hint: 'Front desk', icon: DoorOpenIcon, keywords: 'arrivals departures check-in check-out', run: go('/staff/checkin') },
      { id: 'act:services', group: 'Actions', label: 'Service queue', hint: 'Front desk', icon: BellRingingIcon, keywords: 'requests tickets room service maintenance', run: go('/staff/services') },
      { id: 'act:housekeeping', group: 'Actions', label: 'Housekeeping board', hint: 'Front desk', icon: BroomIcon, keywords: 'cleaning turnover inspection tasks', run: go('/staff/housekeeping') },
      { id: 'act:sign-out', group: 'Actions', label: 'Sign out', icon: SignOutIcon, keywords: 'log out logout leave', run: logout },
    ];
    return [...pages, ...actions];
  }, [navigate, logout]);

  const triggerProps = {
    'aria-label': 'Search or jump to a page',
    'aria-haspopup': 'dialog' as const,
    'aria-expanded': open,
    'aria-keyshortcuts': 'Meta+K Control+K',
  };

  return (
    <>
      {morph ? (
        <PaletteTrigger ref={triggerRef} open={open} onOpen={() => setOpen(true)} {...triggerProps} />
      ) : (
        <button ref={triggerRef} type="button" className="btn-icon" onClick={() => setOpen(true)} {...triggerProps}>
          <MagnifyingGlassIcon size={20} weight="regular" />
        </button>
      )}
      {portalTarget &&
        createPortal(
          <AnimatePresence>
            {open && <PaletteDialog key="cmdk" commands={commands} morph={morph} onClose={close} />}
          </AnimatePresence>,
          portalTarget,
        )}
    </>
  );
}

interface PaletteTriggerProps {
  open: boolean;
  onOpen: () => void;
  'aria-label': string;
  'aria-haspopup': 'dialog';
  'aria-expanded': boolean;
  'aria-keyshortcuts': string;
}

const PaletteTrigger = forwardRef<HTMLButtonElement, PaletteTriggerProps>(function PaletteTrigger(
  { open, onOpen, ...aria },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      onClick={onOpen}
      {...aria}
      className={clsx(
        'group relative flex h-10 w-[260px] min-w-[260px] shrink-0 items-center rounded-full text-left text-[13px] text-zinc-500 xl:w-[300px]',
        'transition-transform duration-200 active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-lagoon-500/40',
      )}
    >
      {!open && (
        <motion.span
          layoutId={SURFACE_ID}
          transition={snappy}
          aria-hidden
          style={{ borderRadius: 20 }}
          className="absolute inset-0 border border-zinc-200/80 bg-white shadow-[inset_0_1px_0_rgb(255_255_255/0.9),0_1px_2px_rgb(24_24_27/0.04)] transition-colors duration-200 group-hover:border-zinc-300"
        />
      )}
      <span
        className={clsx(
          'relative flex w-full items-center gap-2.5 pl-3.5 pr-1.5 transition-opacity',
          open ? 'opacity-0 duration-75' : 'opacity-100 delay-150 duration-200',
        )}
      >
        <MagnifyingGlassIcon size={16} weight="regular" className="shrink-0 text-zinc-400" />
        <TypewriterHint className="flex-1" />
        <Kbd size="md">
          {MAC ? (
            <>
              <CommandIcon size={11} weight="regular" aria-hidden />K
            </>
          ) : (
            'Ctrl K'
          )}
        </Kbd>
      </span>
    </button>
  );
});

function Kbd({ children, size = 'sm' }: { children: ReactNode; size?: 'sm' | 'md' }) {
  return (
    <kbd
      className={clsx(
        'inline-flex shrink-0 items-center justify-center gap-0.5 border border-zinc-200 bg-zinc-50 font-medium text-zinc-500',
        size === 'md' ? 'h-7 min-w-7 rounded-full px-2.5 text-[11px]' : 'h-5 min-w-5 rounded-md px-1.5 text-[10px]',
      )}
    >
      {children}
    </kbd>
  );
}

interface PaletteDialogProps {
  commands: Command[];
  morph: boolean;
  onClose: () => void;
}

function PaletteDialog({ commands, morph, onClose }: PaletteDialogProps) {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const isPresent = useIsPresent();
  const baseId = useId();
  const listId = `${baseId}-list`;
  const optionId = (index: number) => `${baseId}-opt-${index}`;

  // Results in display order (grouped), so arrow keys walk the list top to bottom.
  const results = useMemo(
    () => GROUPS.flatMap((group) => commands.filter((c) => c.group === group && matches(c, query))),
    [commands, query],
  );
  const sections = useMemo(
    () =>
      GROUPS.map((group) => ({
        group,
        items: results.map((command, index) => ({ command, index })).filter(({ command }) => command.group === group),
      })).filter((section) => section.items.length > 0),
    [results],
  );
  const activeIndex = Math.min(active, Math.max(results.length - 1, 0));

  useEffect(() => {
    inputRef.current?.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    listRef.current
      ?.querySelector<HTMLElement>(`[data-index="${activeIndex}"]`)
      ?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  const run = (command: Command) => {
    onClose();
    command.run();
  };

  const onKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.nativeEvent.isComposing) return;
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (results.length) setActive((activeIndex + 1) % results.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (results.length) setActive((activeIndex - 1 + results.length) % results.length);
        break;
      case 'Enter': {
        e.preventDefault();
        const command = results[activeIndex];
        if (command) run(command);
        break;
      }
      case 'Escape':
        e.preventDefault();
        e.stopPropagation();
        onClose();
        break;
      case 'Tab':
        // Options are reached with the arrows; keep focus in the field.
        e.preventDefault();
        inputRef.current?.focus();
        break;
    }
  };

  return (
    <>
      <motion.div
        aria-hidden
        className={clsx('fixed inset-0 z-50 bg-zinc-950/30 backdrop-blur-[2px]', !isPresent && 'pointer-events-none')}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        tabIndex={-1}
        onKeyDown={onKeyDown}
        className={clsx(
          'fixed inset-x-0 top-[12vh] z-50 mx-auto w-[min(640px,calc(100vw-2rem))] focus:outline-none',
          !isPresent && 'pointer-events-none',
        )}
      >
        <motion.div
          aria-hidden
          layoutId={morph ? SURFACE_ID : undefined}
          transition={snappy}
          initial={morph ? false : { opacity: 0, scale: 0.96, y: -8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={morph ? { opacity: 0 } : { opacity: 0, scale: 0.98, y: -4 }}
          style={{ borderRadius: 28 }}
          className="absolute inset-0 border border-zinc-200/70 bg-white shadow-[inset_0_1px_0_rgb(255_255_255/0.8),0_32px_64px_-24px_rgb(24_24_27/0.35)]"
        />

        <motion.div
          className="relative flex flex-col"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, transition: { delay: morph ? 0.08 : 0, duration: 0.2 } }}
          exit={{ opacity: 0, transition: { duration: 0.1 } }}
        >
          <div className="flex items-center gap-3 border-b border-zinc-100 px-5">
            <MagnifyingGlassIcon size={18} weight="regular" className="shrink-0 text-zinc-400" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setActive(0);
              }}
              placeholder="Search pages and actions"
              aria-label="Search pages and actions"
              role="combobox"
              aria-expanded="true"
              aria-controls={listId}
              aria-autocomplete="list"
              aria-activedescendant={results.length ? optionId(activeIndex) : undefined}
              autoComplete="off"
              spellCheck={false}
              className="h-14 min-w-0 flex-1 border-0 bg-transparent p-0 text-[15px] text-zinc-950 outline-none placeholder:text-zinc-400 focus:outline-none focus:ring-0"
            />
            <Kbd>esc</Kbd>
          </div>

          <LayoutGroup id={baseId}>
            <motion.div
              ref={listRef}
              id={listId}
              role="listbox"
              aria-label="Results"
              layoutScroll
              className="h-[min(360px,50dvh)] overflow-y-auto overscroll-contain p-2"
            >
              {results.length === 0 ? (
                <EmptyState
                  compact
                  icon={MagnifyingGlassIcon}
                  title="No matches"
                  description="Try a page name like bookings or rooms"
                  className="h-full"
                />
              ) : (
                sections.map(({ group, items }) => {
                  const headingId = `${baseId}-${group}`;
                  return (
                    <div key={group} role="group" aria-labelledby={headingId} className="pb-1">
                      <div id={headingId} role="presentation" className="eyebrow px-3 pb-1.5 pt-2.5">
                        {group}
                      </div>
                      {items.map(({ command, index }) => {
                        const selected = index === activeIndex;
                        const IconCmp = command.icon;
                        return (
                          <div
                            key={command.id}
                            id={optionId(index)}
                            role="option"
                            aria-selected={selected}
                            data-index={index}
                            onMouseMove={() => {
                              if (!selected) setActive(index);
                            }}
                            onClick={() => run(command)}
                            className={clsx(
                              'relative flex cursor-pointer select-none items-center gap-3 rounded-2xl px-2.5 py-2 text-sm transition-colors duration-150',
                              selected ? 'text-zinc-950' : 'text-zinc-600',
                            )}
                          >
                            {selected && (
                              <motion.span
                                layoutId="active"
                                transition={snappy}
                                className="absolute inset-0 rounded-2xl bg-zinc-100/80 ring-1 ring-inset ring-zinc-200/60"
                              />
                            )}
                            <span
                              className={clsx(
                                'relative flex size-8 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset transition-colors duration-150',
                                selected ? 'bg-white text-lagoon-700 ring-zinc-200/80' : 'bg-zinc-50 text-zinc-500 ring-zinc-200/60',
                              )}
                            >
                              <IconCmp size={16} weight="regular" />
                            </span>
                            <span className="relative min-w-0 flex-1 truncate font-medium">{command.label}</span>
                            {command.hint && (
                              <span className="relative shrink-0 text-xs text-zinc-400">{command.hint}</span>
                            )}
                            <KeyReturnIcon
                              size={14}
                              weight="regular"
                              aria-hidden
                              className={clsx('relative shrink-0 text-zinc-400 transition-opacity', selected ? 'opacity-100' : 'opacity-0')}
                            />
                          </div>
                        );
                      })}
                    </div>
                  );
                })
              )}
            </motion.div>
          </LayoutGroup>

          <div className="hidden items-center gap-4 border-t border-zinc-100 px-5 py-3 text-xs text-zinc-500 sm:flex">
            <span className="inline-flex items-center gap-1.5">
              <Kbd>
                <ArrowUpIcon size={11} weight="regular" aria-hidden />
              </Kbd>
              <Kbd>
                <ArrowDownIcon size={11} weight="regular" aria-hidden />
              </Kbd>
              navigate
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Kbd>
                <KeyReturnIcon size={11} weight="regular" aria-hidden />
              </Kbd>
              open
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Kbd>esc</Kbd>
              close
            </span>
            <span className="ml-auto">
              <span className="font-mono tabular-nums text-zinc-700">{results.length}</span>{' '}
              {results.length === 1 ? 'result' : 'results'}
            </span>
          </div>
        </motion.div>
      </div>
    </>
  );
}
