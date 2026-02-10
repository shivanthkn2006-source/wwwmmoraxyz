import { useTheme } from "next-themes";
import { Toaster as Sonner, toast as sonnerToast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

// Silent toast function - suppresses all popups for clean UI
const toast = Object.assign(
  () => { /* silently ignored */ },
  {
    success: () => { /* silently ignored */ },
    error: () => { /* silently ignored */ },
    info: () => { /* silently ignored */ },
    warning: () => { /* silently ignored */ },
    loading: () => { /* silently ignored */ },
    promise: () => Promise.resolve() as any,
    dismiss: () => { /* silently ignored */ },
    custom: () => { /* silently ignored */ },
    message: () => { /* silently ignored */ },
  }
);

// Toaster is rendered but toasts are invisible (hidden via CSS)
const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group hidden"
      toastOptions={{
        classNames: {
          toast: "hidden",
          description: "hidden",
          actionButton: "hidden",
          cancelButton: "hidden",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
