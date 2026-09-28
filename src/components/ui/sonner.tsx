import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      position="top-center"
      visibleToasts={4}
      closeButton
      className="toaster group"
      toastOptions={{
        duration: 7000,
        classNames: {
          toast: "group toast !border-0 !bg-transparent !text-white !shadow-none [text-shadow:0_1px_3px_rgba(0,0,0,0.6)]",
          title: "text-sm font-semibold",
          description: "text-xs !text-white",
          actionButton: "bg-primary text-primary-foreground",
          cancelButton: "bg-muted text-muted-foreground",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
