"use client";

import { CheckIcon, ChevronsUpDown } from "lucide-react";
import * as React from "react";
import * as RPNInput from "react-phone-number-input";
import flags from "react-phone-number-input/flags";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

type PhoneInputProps = Omit<
  React.ComponentProps<"input">,
  "onChange" | "value" | "ref"
> &
  Omit<RPNInput.Props<typeof RPNInput.default>, "onChange" | "value"> & {
    value?: string;
    onChange?: (value: string) => void;
  };

const PhoneInput = React.forwardRef<
  React.ElementRef<typeof RPNInput.default>,
  PhoneInputProps
>(({ className, onChange, value, ...props }, ref) => {
  return (
    <RPNInput.default
      ref={ref}
      className={cn("flex w-full", className)}
      countrySelectComponent={CountrySelect}
      flagComponent={FlagComponent}
      inputComponent={PhoneNumberInput}
      smartCaret={false}
      value={value || undefined}
      onChange={(nextValue) => onChange?.(nextValue ?? "")}
      {...props}
    />
  );
});
PhoneInput.displayName = "PhoneInput";

const PhoneNumberInput = React.forwardRef<
  HTMLInputElement,
  React.ComponentProps<"input">
>(({ className, ...props }, ref) => (
  <Input ref={ref} className={cn("rounded-l-none", className)} {...props} />
));
PhoneNumberInput.displayName = "PhoneNumberInput";

type CountryEntry = {
  label: string;
  value: RPNInput.Country | undefined;
};

type CountrySelectProps = {
  disabled?: boolean;
  value: RPNInput.Country | undefined;
  options: CountryEntry[];
  onChange: (country: RPNInput.Country) => void;
};

function CountrySelect({
  disabled,
  value: selectedCountry,
  options,
  onChange,
}: CountrySelectProps) {
  const [open, setOpen] = React.useState(false);
  const countryOptions = options.filter(
    (option): option is { label: string; value: RPNInput.Country } =>
      Boolean(option.value),
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="h-11 rounded-r-none border-r-0 px-3 focus:z-10"
          disabled={disabled}
          aria-label="Select phone country"
        >
          <FlagComponent
            country={selectedCountry}
            countryName={selectedCountry ?? "Country"}
          />
          <ChevronsUpDown
            className={cn("size-4 opacity-60", disabled && "hidden")}
            aria-hidden
          />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[320px] p-0">
        <Command>
          <CommandInput placeholder="Search country..." />
          <CommandList>
            <ScrollArea className="h-72">
              <CommandEmpty>No country found.</CommandEmpty>
              <CommandGroup>
                {countryOptions.map(({ value, label }) => (
                  <CountrySelectOption
                    key={value}
                    country={value}
                    countryName={label}
                    selectedCountry={selectedCountry}
                    onChange={onChange}
                    onSelectComplete={() => setOpen(false)}
                  />
                ))}
              </CommandGroup>
            </ScrollArea>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

type CountrySelectOptionProps = RPNInput.FlagProps & {
  selectedCountry: RPNInput.Country | undefined;
  onChange: (country: RPNInput.Country) => void;
  onSelectComplete: () => void;
};

function CountrySelectOption({
  country,
  countryName,
  selectedCountry,
  onChange,
  onSelectComplete,
}: CountrySelectOptionProps) {
  function handleSelect() {
    onChange(country);
    onSelectComplete();
  }

  return (
    <CommandItem
      className="gap-2"
      value={`${countryName} ${country}`}
      onSelect={handleSelect}
    >
      <FlagComponent country={country} countryName={countryName} />
      <span className="min-w-0 flex-1 truncate">{countryName}</span>
      <span className="text-on-surface-variant">
        +{RPNInput.getCountryCallingCode(country)}
      </span>
      <CheckIcon
        className={cn(
          "ml-auto size-4",
          country === selectedCountry ? "opacity-100" : "opacity-0",
        )}
        aria-hidden
      />
    </CommandItem>
  );
}

function FlagComponent({
  country,
  countryName,
}: {
  country?: RPNInput.Country;
  countryName: string;
}) {
  const Flag = country ? flags[country] : null;

  return (
    <span className="flex h-4 w-6 shrink-0 overflow-hidden rounded-sm bg-surface-container">
      {Flag ? <Flag title={countryName} /> : null}
    </span>
  );
}

export { PhoneInput };
