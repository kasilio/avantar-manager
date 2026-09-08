"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { centsToMoneyDisplay, maskMoneyInput } from "@/lib/masks";

/**
 * Input de dinheiro (R$) com máscara ao digitar. Renderiza um campo visível
 * (formatado) + um input hidden com o nome real do form, pra Server Actions
 * lerem via `formData.get(name)` como string decimal ("1234.56").
 */
export function MoneyInput({
  name,
  id,
  defaultValue,
  required,
  placeholder = "0,00",
}: {
  name: string;
  id?: string;
  defaultValue?: number | null;
  required?: boolean;
  placeholder?: string;
}) {
  const [display, setDisplay] = useState(
    defaultValue ? centsToMoneyDisplay(Math.round(defaultValue * 100)) : "",
  );
  const [value, setValue] = useState(defaultValue ?? 0);

  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
        R$
      </span>
      <Input
        id={id}
        inputMode="decimal"
        placeholder={placeholder}
        required={required}
        value={display}
        onChange={(e) => {
          const { display: d, value: v } = maskMoneyInput(e.target.value);
          setDisplay(d);
          setValue(v);
        }}
        className="pl-9"
      />
      <input type="hidden" name={name} value={value} />
    </div>
  );
}
