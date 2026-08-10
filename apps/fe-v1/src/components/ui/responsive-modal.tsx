"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Drawer as DrawerPrimitive } from "vaul";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

/**
 * `ResponsiveModal` switches transparently between a `vaul` bottom drawer on
 * touch / phone widths and a centered Radix Dialog on tablet / desktop widths.
 *
 * Use it like a Radix Dialog:
 *
 * ```tsx
 * <ResponsiveModal open={open} onOpenChange={setOpen}>
 *   <ResponsiveModalContent>
 *     <ResponsiveModalHeader>
 *       <ResponsiveModalTitle>Confirm trade</ResponsiveModalTitle>
 *     </ResponsiveModalHeader>
 *     ...body...
 *   </ResponsiveModalContent>
 * </ResponsiveModal>
 * ```
 *
 * Drawer variant adds bottom safe-area padding and a grab handle automatically.
 */

interface ResponsiveModalContextValue {
  isMobile: boolean;
}

const ResponsiveModalContext = React.createContext<ResponsiveModalContextValue>({
  isMobile: false,
});

interface ResponsiveModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

export function ResponsiveModal({ open, onOpenChange, children }: ResponsiveModalProps) {
  const isMobile = useIsMobile() ?? false;

  const value = React.useMemo(() => ({ isMobile }), [isMobile]);

  if (isMobile) {
    return (
      <ResponsiveModalContext.Provider value={value}>
        <DrawerPrimitive.Root open={open} onOpenChange={onOpenChange} shouldScaleBackground>
          {children}
        </DrawerPrimitive.Root>
      </ResponsiveModalContext.Provider>
    );
  }

  return (
    <ResponsiveModalContext.Provider value={value}>
      <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
        {children}
      </DialogPrimitive.Root>
    </ResponsiveModalContext.Provider>
  );
}

interface ResponsiveModalContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  /** Sheet uses `max-h-[90dvh]` by default; pass through to override. */
  contentClassName?: string;
}

export const ResponsiveModalContent = React.forwardRef<HTMLDivElement, ResponsiveModalContentProps>(
  ({ className, children, ...props }, ref) => {
    const { isMobile } = React.useContext(ResponsiveModalContext);

    if (isMobile) {
      return (
        <DrawerPrimitive.Portal>
          <DrawerPrimitive.Overlay className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-sm" />
          <DrawerPrimitive.Content
            ref={ref}
            className={cn(
              "fixed inset-x-0 bottom-0 z-[121] mt-24 flex max-h-[92dvh] flex-col rounded-t-2xl border border-border/60 bg-card text-card-foreground shadow-2xl outline-none",
              "pb-[max(env(safe-area-inset-bottom),0.75rem)]",
              className,
            )}
            {...props}
          >
            <div aria-hidden className="mx-auto mt-2.5 h-1.5 w-10 rounded-full bg-muted-foreground/30" />
            <div className="flex-1 overflow-y-auto">{children}</div>
          </DrawerPrimitive.Content>
        </DrawerPrimitive.Portal>
      );
    }

    return (
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          ref={ref}
          className={cn(
            "fixed left-1/2 top-1/2 z-[121] w-[min(28rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-card text-card-foreground shadow-2xl outline-none",
            "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
            className,
          )}
          {...props}
        >
          {children}
          <DialogPrimitive.Close
            className="absolute right-3 top-3 inline-flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
            aria-label="Close"
          >
            <X className="size-4" aria-hidden />
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    );
  },
);
ResponsiveModalContent.displayName = "ResponsiveModalContent";

export const ResponsiveModalHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col gap-1.5 p-5 pb-3 text-left", className)} {...props} />
);
ResponsiveModalHeader.displayName = "ResponsiveModalHeader";

export const ResponsiveModalFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col-reverse gap-2 px-5 pb-5 pt-3 sm:flex-row sm:justify-end sm:gap-2",
      className,
    )}
    {...props}
  />
);
ResponsiveModalFooter.displayName = "ResponsiveModalFooter";

export const ResponsiveModalTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => {
  const { isMobile } = React.useContext(ResponsiveModalContext);
  const titleClass = cn(
    "text-lg font-semibold leading-tight tracking-tight text-foreground",
    className,
  );
  if (isMobile) {
    return <DrawerPrimitive.Title ref={ref} className={titleClass} {...props} />;
  }
  return <DialogPrimitive.Title ref={ref} className={titleClass} {...props} />;
});
ResponsiveModalTitle.displayName = "ResponsiveModalTitle";

export const ResponsiveModalDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => {
  const { isMobile } = React.useContext(ResponsiveModalContext);
  const descriptionClass = cn("text-sm text-muted-foreground", className);
  if (isMobile) {
    return <DrawerPrimitive.Description ref={ref} className={descriptionClass} {...props} />;
  }
  return <DialogPrimitive.Description ref={ref} className={descriptionClass} {...props} />;
});
ResponsiveModalDescription.displayName = "ResponsiveModalDescription";

export function useResponsiveModalIsMobile() {
  return React.useContext(ResponsiveModalContext).isMobile;
}
