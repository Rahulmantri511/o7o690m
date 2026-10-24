import clsx from "clsx";
import type { ReactNode } from "react";
import styles from "./Card.module.css";

interface CardProps {
  eyebrow?: string;
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  footer?: ReactNode;
  className?: string;
  bodyClassName?: string;
  children: ReactNode;
  id?: string;
}

export function Card({
  eyebrow,
  title,
  description,
  actions,
  footer,
  className,
  bodyClassName,
  children,
  id,
}: CardProps) {
  const hasHeader = eyebrow || title || description || actions;
  return (
    <section className={clsx(styles.card, className)} id={id} aria-labelledby={id && `${id}-title`}>
      {hasHeader && (
        <header className={styles.header}>
          <div className={styles.heading}>
            {eyebrow && <p className={styles.eyebrow}>{eyebrow}</p>}
            {title && (
              <h2 className={styles.title} id={id && `${id}-title`}>
                {title}
              </h2>
            )}
            {description && <p className={styles.description}>{description}</p>}
          </div>
          {actions && <div className={styles.actions}>{actions}</div>}
        </header>
      )}
      <div className={clsx(styles.body, bodyClassName)}>{children}</div>
      {footer && <footer className={styles.footer}>{footer}</footer>}
    </section>
  );
}
