"use client";
import { useRef, useEffect, useState, type ReactNode } from "react";
import { X, Minus, Plus, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
export function Modal({
  open,
  onClose,
  title,
  children,
  drawer = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  drawer?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open) {
      const prev = document.activeElement as HTMLElement;
      d.showModal();
      const before = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        d.close();
        document.body.style.overflow = before;
        prev?.focus();
      };
    }
  }, [open]);
  return (
    <dialog
      className={drawer ? "dialog drawer" : "dialog"}
      ref={ref}
      onCancel={onClose}
      aria-label={title}
    >
      <div className="dialog-heading">
        <h2>{title}</h2>
        <button
          className="icon-button"
          onClick={onClose}
          aria-label="Close dialog"
        >
          <X />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function Quantity({
  value,
  onChange,
  max = 20,
}: {
  value: number;
  onChange: (n: number) => void;
  max?: number;
}) {
  return (
    <div className="quantity">
      <button
        type="button"
        aria-label="Decrease quantity"
        disabled={value <= 1}
        onClick={() => onChange(value - 1)}
      >
        <Minus size={14} />
      </button>
      <span aria-live="polite">{value}</span>
      <button
        type="button"
        aria-label="Increase quantity"
        disabled={value >= max}
        onClick={() => onChange(value + 1)}
      >
        <Plus size={14} />
      </button>
    </div>
  );
}
export function Cta({
  href,
  children,
  outline = false,
}: {
  href: string;
  children: ReactNode;
  outline?: boolean;
}) {
  return (
    <Link className={`button ${outline ? "outline" : ""}`} href={href}>
      {children}
      <ArrowUpRight size={18} />
    </Link>
  );
}
export function ErrorMessage({ message }: { message: string }) {
  return message ? (
    <p className="error-message" role="alert">
      {message}
    </p>
  ) : null;
}
export function Photo({
  src,
  alt,
  className = "",
  eager = false,
  sizes = "(max-width: 800px) 100vw, 50vw",
}: {
  src: string;
  alt: string;
  className?: string;
  eager?: boolean;
  sizes?: string;
}) {
  const [broken, setBroken] = useState("");
  const actual = !src || broken === src ? "/images/fallback.svg" : src;
  return (
    <Image
      src={actual}
      alt={alt}
      className={className}
      width={1000}
      height={1250}
      sizes={sizes}
      loading={eager ? "eager" : "lazy"}
      fetchPriority={eager ? "high" : "auto"}
      onError={() => setBroken(src)}
    />
  );
}
