import clsx from "clsx";
import { useId } from "react";
import styles from "./SegmentedControl.module.css";

interface Option<T extends string> {
  value: T;
  label: string;
}

interface SegmentedControlProps<T extends string> {
  label: string;
  value: T;
  options: Option<T>[];
  onChange: (value: T) => void;
  size?: "sm" | "md";
}

/** Radio-group semantics with a button-bar look. Arrow keys move between options. */
export function SegmentedControl<T extends string>({
  label,
  value,
  options,
  onChange,
  size = "md",
}: SegmentedControlProps<T>) {
  const name = useId();
  return (
    <fieldset className={clsx(styles.group, styles[size])}>
      <legend className="visually-hidden">{label}</legend>
      {options.map((option) => (
        <label
          key={option.value}
          className={clsx(styles.option, option.value === value && styles.active)}
        >
          <input
            type="radio"
            name={name}
            value={option.value}
            checked={option.value === value}
            onChange={() => onChange(option.value)}
          />
          <span>{option.label}</span>
        </label>
      ))}
    </fieldset>
  );
}
