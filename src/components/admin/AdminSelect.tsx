"use client";

import {
  Children,
  isValidElement,
  type ComponentPropsWithoutRef,
  type ReactElement,
  type ReactNode,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";
import { ResponsivePopover } from "./ResponsivePopover";

interface SelectOption {
  disabled: boolean;
  group?: string;
  label: string;
  value: string;
}

type AdminSelectProps = ComponentPropsWithoutRef<"select"> & { icon?: ReactNode };

function readOptions(children: ReactNode, group?: string): SelectOption[] {
  return Children.toArray(children).flatMap((child) => {
    if (!isValidElement(child)) return [];
    const element = child as ReactElement<{ children?: ReactNode; disabled?: boolean; label?: string; value?: string | number }>;
    if (element.type === "optgroup") {
      return readOptions(element.props.children, element.props.label);
    }
    if (element.type !== "option") return [];
    const label = Children.toArray(element.props.children).join("");
    return [{
      disabled: Boolean(element.props.disabled),
      group,
      label,
      value: String(element.props.value ?? label),
    }];
  });
}

function AdminMultiSelect({
  children,
  className,
  onChange,
  value,
  defaultValue,
  disabled,
  icon,
  ...props
}: AdminSelectProps) {
  const selectRef = useRef<HTMLSelectElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listboxId = useId();
  const options = useMemo(() => readOptions(children), [children]);
  const initialValues = Array.isArray(value)
    ? value.map(String)
    : Array.isArray(defaultValue)
      ? defaultValue.map(String)
      : [];
  const [internalValues, setInternalValues] = useState(initialValues);
  const [open, setOpen] = useState(false);
  const selectedValues = Array.isArray(value) ? value.map(String) : internalValues;
  const selectedLabels = options
    .filter((option) => selectedValues.includes(option.value))
    .map((option) => option.label);

  function toggle(nextValue: string) {
    const nextValues = selectedValues.includes(nextValue)
      ? selectedValues.filter((item) => item !== nextValue)
      : [...selectedValues, nextValue];
    const nativeSelect = selectRef.current;
    if (!nativeSelect) return;
    for (const option of Array.from(nativeSelect.options)) {
      option.selected = nextValues.includes(option.value);
    }
    setInternalValues(nextValues);
    nativeSelect.dispatchEvent(new Event("change", { bubbles: true }));
  }

  return (
    <div className="relative min-w-0">
      <select
        {...props}
        ref={selectRef}
        multiple
        disabled={disabled}
        value={value}
        defaultValue={value === undefined ? defaultValue : undefined}
        onChange={(event) => {
          setInternalValues(Array.from(event.target.selectedOptions).map((option) => option.value));
          onChange?.(event);
        }}
        tabIndex={-1}
        aria-hidden="true"
        className="pointer-events-none absolute h-px w-px overflow-hidden opacity-0"
      >
        {children}
      </select>
      <button
        ref={triggerRef}
        type="button"
        data-admin-select-trigger="true"
        disabled={disabled}
        aria-expanded={open}
        aria-controls={listboxId}
        aria-haspopup="listbox"
        aria-label={props["aria-label"]}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            setOpen(true);
          }
        }}
        className={cn(
          "admin-select ld-focus-ring group flex min-h-12 w-full min-w-0 items-center rounded-[18px] py-2 pl-3 pr-1.5 text-left text-[13px] font-medium outline-none transition sm:pl-4 sm:text-sm",
          "hover:border-white/20 hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
      >
        <span
          className={cn("min-w-0 flex-1 truncate", selectedLabels.length > 0 ? "text-white/90" : "text-white/45")}
          title={selectedLabels.join(", ") || undefined}
        >
          {selectedLabels.length > 0 ? selectedLabels.join(", ") : "Choose options"}
        </span>
        <span
          aria-hidden="true"
          data-admin-select-affordance="true"
          className="ml-1.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[11px] border border-white/10 bg-white/[0.08] text-white/70 sm:ml-2 sm:h-9 sm:w-9 sm:rounded-[13px]"
        >
          {icon ?? <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />}
        </span>
      </button>
      <ResponsivePopover
        anchorRef={triggerRef}
        ariaLabel={props["aria-label"] || "Choose options"}
        desktopWidth={340}
        onClose={() => setOpen(false)}
        open={open}
        className="p-2"
      >
        <div id={listboxId} role="listbox" aria-multiselectable="true" className="ld-premium-scrollbar max-h-[min(58dvh,340px)] overflow-y-auto p-1">
          {options.map((option) => {
            const selected = selectedValues.includes(option.value);
            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={selected}
                data-popover-autofocus={selected || undefined}
                disabled={option.disabled}
                onClick={() => toggle(option.value)}
                className={cn(
                  "ld-focus-ring flex min-h-11 w-full items-center gap-3 rounded-[14px] px-3 py-2.5 text-left text-sm transition",
                  selected ? "bg-[color:var(--ld-color-primary)]/20 text-white" : "text-white/78 hover:bg-white/[0.08] hover:text-white",
                  option.disabled && "cursor-not-allowed opacity-40",
                )}
              >
                <span className="min-w-0 flex-1 leading-5">{option.label}</span>
                <span className={cn("grid h-5 w-5 shrink-0 place-items-center rounded-md border", selected ? "border-[color:var(--ld-color-accent)] bg-[color:var(--ld-color-accent)]/16" : "border-white/18")}>
                  {selected ? <Check className="h-3.5 w-3.5 text-[color:var(--ld-color-accent)]" /> : null}
                </span>
              </button>
            );
          })}
        </div>
        <div className="mt-1 flex items-center justify-between border-t border-white/10 px-2 pt-2">
          <span className="text-xs font-medium text-white/48">{selectedValues.length} selected</span>
          <button type="button" onClick={() => setOpen(false)} className="admin-button-primary h-9 rounded-full px-4 text-xs font-semibold">Done</button>
        </div>
      </ResponsivePopover>
    </div>
  );
}

export function AdminSelect({
  children,
  className,
  icon,
  onChange,
  value,
  defaultValue,
  disabled,
  multiple,
  ...props
}: AdminSelectProps) {
  const selectRef = useRef<HTMLSelectElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listboxId = useId();
  const options = useMemo(() => readOptions(children), [children]);
  const initialValue = String(value ?? defaultValue ?? options[0]?.value ?? "");
  const [internalValue, setInternalValue] = useState(initialValue);
  const [open, setOpen] = useState(false);
  const selectedValue = value === undefined ? internalValue : String(value);
  const selected = options.find((option) => option.value === selectedValue) ?? options[0];

  useEffect(() => {
    const form = selectRef.current?.form;
    if (!form) return;
    const handleReset = () => requestAnimationFrame(() => {
      setInternalValue(selectRef.current?.value ?? initialValue);
    });
    form.addEventListener("reset", handleReset);
    return () => form.removeEventListener("reset", handleReset);
  }, [initialValue]);

  if (multiple) {
    return <AdminMultiSelect {...props} className={className} disabled={disabled} icon={icon} multiple onChange={onChange} value={value} defaultValue={defaultValue}>{children}</AdminMultiSelect>;
  }

  function choose(nextValue: string) {
    const nativeSelect = selectRef.current;
    if (!nativeSelect) return;
    nativeSelect.value = nextValue;
    setInternalValue(nextValue);
    nativeSelect.dispatchEvent(new Event("change", { bubbles: true }));
    setOpen(false);
    requestAnimationFrame(() => triggerRef.current?.focus({ preventScroll: true }));
  }

  return (
    <div className="relative min-w-0">
      <select
        {...props}
        ref={selectRef}
        value={value}
        defaultValue={value === undefined ? defaultValue : undefined}
        disabled={disabled}
        onChange={(event) => {
          setInternalValue(event.target.value);
          onChange?.(event);
        }}
        tabIndex={-1}
        aria-hidden="true"
        className="pointer-events-none absolute h-px w-px overflow-hidden opacity-0"
      >
        {children}
      </select>
      <button
        ref={triggerRef}
        type="button"
        data-admin-select-trigger="true"
        disabled={disabled}
        aria-expanded={open}
        aria-controls={listboxId}
        aria-haspopup="listbox"
        aria-label={props["aria-label"]}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            setOpen(true);
          }
        }}
        className={cn(
          "admin-select ld-focus-ring group flex h-12 w-full min-w-0 items-center rounded-[18px] pl-3 pr-1.5 text-left text-[13px] font-medium tracking-[-0.01em] outline-none transition duration-200 sm:pl-4 sm:text-sm",
          "hover:border-white/20 hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
      >
        <span className="min-w-0 flex-1 truncate text-white/90" title={selected?.label || undefined}>{selected?.label || "Choose an option"}</span>
        <span
          aria-hidden="true"
          data-admin-select-affordance="true"
          className="ml-1.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[11px] border border-white/10 bg-white/[0.08] text-white/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition group-hover:border-white/20 group-hover:bg-white/[0.12] sm:ml-2 sm:h-9 sm:w-9 sm:rounded-[13px]"
        >
          {icon ?? <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />}
        </span>
      </button>
      <ResponsivePopover
        anchorRef={triggerRef}
        ariaLabel={props["aria-label"] || "Choose an option"}
        desktopWidth={320}
        onClose={() => setOpen(false)}
        open={open}
        className="p-2"
      >
        <div id={listboxId} role="listbox" className="ld-premium-scrollbar max-h-[min(60dvh,360px)] overflow-y-auto p-1">
          {options.map((option, index) => {
            const previousGroup = index > 0 ? options[index - 1]?.group : undefined;
            return (
              <div key={`${option.value}-${index}`}>
                {option.group && option.group !== previousGroup ? (
                  <p className="px-3 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-[0.17em] text-white/45">{option.group}</p>
                ) : null}
                <button
                  type="button"
                  role="option"
                  aria-selected={option.value === selectedValue}
                  data-popover-autofocus={option.value === selectedValue || undefined}
                  disabled={option.disabled}
                  onClick={() => choose(option.value)}
                  className={cn(
                    "ld-focus-ring flex min-h-11 w-full items-center gap-3 rounded-[14px] px-3 py-2.5 text-left text-sm transition",
                    option.value === selectedValue
                      ? "bg-[color:var(--ld-color-primary)]/20 text-white"
                      : "text-white/78 hover:bg-white/[0.08] hover:text-white",
                    option.disabled && "cursor-not-allowed opacity-40",
                  )}
                >
                  <span className="min-w-0 flex-1 leading-5">{option.label}</span>
                  {option.value === selectedValue ? <Check className="h-4 w-4 shrink-0 text-[color:var(--ld-color-accent)]" /> : null}
                </button>
              </div>
            );
          })}
        </div>
      </ResponsivePopover>
    </div>
  );
}
