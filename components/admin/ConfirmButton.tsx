"use client";

/**
 * Submit button for destructive form actions - asks for confirmation before
 * letting the enclosing <form action={serverAction}> submit.
 */
export default function ConfirmButton({
  children,
  confirmText = "Are you sure? This cannot be undone.",
  className = "adm-btn danger small",
}: {
  children: React.ReactNode;
  confirmText?: string;
  className?: string;
}) {
  return (
    <button
      type="submit"
      className={className}
      onClick={(e) => {
        if (!window.confirm(confirmText)) e.preventDefault();
      }}
    >
      {children}
    </button>
  );
}
