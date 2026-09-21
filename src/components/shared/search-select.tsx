"use client";

import { Combobox } from "@base-ui/react/combobox";
import { CheckIcon, ChevronDownIcon } from "lucide-react";
import { cn } from "cn";

export type SearchSelectOption = { value: string; label: string };

// Select comum (@/components/ui/select) lista tudo de uma vez — não dá pra
// digitar pra filtrar. Esse é o mesmo campo, mas com Combobox do Base UI:
// filtra a lista conforme digita, sem precisar abrir o menu inteiro.
export function SearchSelect({
  id,
  name,
  items,
  defaultValue,
  placeholder,
  className,
}: {
  id?: string;
  name: string;
  items: SearchSelectOption[];
  defaultValue?: string;
  placeholder?: string;
  className?: string;
}) {
  const selecionado = items.find((item) => item.value === defaultValue) ?? null;

  return (
    <Combobox.Root items={items} name={name} defaultValue={selecionado}>
      <Combobox.InputGroup
        className={cn(
          "relative flex h-8 items-center rounded-lg border border-input bg-transparent focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 dark:bg-input/30 dark:hover:bg-input/50",
          className,
        )}
      >
        <Combobox.Input
          id={id}
          placeholder={placeholder}
          className="h-full w-full rounded-lg bg-transparent py-2 pr-8 pl-2.5 text-sm outline-none placeholder:text-muted-foreground"
        />
        <Combobox.Trigger
          className="absolute right-1 flex size-6 items-center justify-center text-muted-foreground"
          aria-label="Abrir lista"
        >
          <ChevronDownIcon className="pointer-events-none size-4" />
        </Combobox.Trigger>
      </Combobox.InputGroup>

      <Combobox.Portal>
        <Combobox.Positioner sideOffset={4} className="isolate z-50 outline-none">
          <Combobox.Popup className="max-h-(--available-height) w-(--anchor-width) min-w-36 origin-(--transform-origin) overflow-x-hidden overflow-y-auto rounded-lg bg-popover text-popover-foreground shadow-md ring-1 ring-foreground/10 duration-100 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95">
            <Combobox.Empty className="px-2.5 py-4 text-center text-sm text-muted-foreground">
              Nenhum resultado encontrado.
            </Combobox.Empty>
            <Combobox.List className="p-1">
              {(item: SearchSelectOption) => (
                <Combobox.Item
                  key={item.value}
                  value={item}
                  className="relative flex w-full cursor-default items-center gap-1.5 rounded-md py-1.5 pr-8 pl-2 text-sm outline-hidden select-none data-highlighted:bg-accent data-highlighted:text-accent-foreground"
                >
                  {item.label}
                  <Combobox.ItemIndicator className="pointer-events-none absolute right-2 flex size-4 items-center justify-center">
                    <CheckIcon className="size-4" />
                  </Combobox.ItemIndicator>
                </Combobox.Item>
              )}
            </Combobox.List>
          </Combobox.Popup>
        </Combobox.Positioner>
      </Combobox.Portal>
    </Combobox.Root>
  );
}
