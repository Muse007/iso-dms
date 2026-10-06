import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

export interface Step {
    key: string;
    title: string;
    description?: string;
    icon?: React.ReactNode;
}

interface Props {
    steps: Step[];
    current: number;        // 0-based index
    onJump?: (i: number) => void;
    visited?: Set<number>;  // steps the user has already completed at least once
}

export function Stepper({ steps, current, onJump, visited }: Props) {
    return (
        <ol className="flex w-full items-start gap-0">
            {steps.map((step, i) => {
                const isDone   = i < current || visited?.has(i);
                const isActive = i === current;
                const clickable = !!onJump && (isDone || isActive);

                return (
                    <li
                        key={step.key}
                        className={cn(
                            'flex flex-1 items-start gap-3',
                            i < steps.length - 1 && 'pr-3',
                        )}
                    >
                        <div className="flex flex-1 items-start gap-3">
                            <button
                                type="button"
                                disabled={!clickable}
                                onClick={() => clickable && onJump?.(i)}
                                className={cn(
                                    'flex size-9 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold transition',
                                    isActive && 'border-[#b91c1c] bg-[#b91c1c] text-white shadow-[0_0_0_4px_rgba(220,38,38,0.15)]',
                                    isDone && !isActive && 'border-emerald-500 bg-emerald-500 text-white',
                                    !isActive && !isDone && 'border-muted bg-muted text-muted-foreground',
                                    clickable && 'cursor-pointer hover:opacity-90',
                                )}
                            >
                                {isDone && !isActive ? <Check className="size-4" /> : step.icon ?? i + 1}
                            </button>

                            <div className="min-w-0 flex-1 pt-1">
                                <div
                                    className={cn(
                                        'text-xs font-semibold uppercase tracking-wider',
                                        isActive
                                            ? 'text-[#b91c1c] dark:text-[#fca5a5]'
                                            : isDone
                                            ? 'text-foreground'
                                            : 'text-muted-foreground',
                                    )}
                                >
                                    Step {i + 1}
                                </div>
                                <div
                                    className={cn(
                                        'text-sm font-semibold leading-snug',
                                        !isActive && !isDone && 'text-muted-foreground',
                                    )}
                                >
                                    {step.title}
                                </div>
                                {step.description && (
                                    <div className="hidden text-[11px] text-muted-foreground sm:block">
                                        {step.description}
                                    </div>
                                )}
                            </div>

                            {i < steps.length - 1 && (
                                <div className="mt-4 hidden h-[2px] flex-1 self-start bg-border md:block">
                                    <div
                                        className="h-full bg-emerald-500 transition-all"
                                        style={{ width: isDone ? '100%' : '0%' }}
                                    />
                                </div>
                            )}
                        </div>
                    </li>
                );
            })}
        </ol>
    );
}
